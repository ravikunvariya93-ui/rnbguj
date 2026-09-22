import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import TechnicalSanction from '@/models/TechnicalSanction';
import Package from '@/models/Package';
import DTP from '@/models/DTP';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Bill from '@/models/Bill';
import { notFound } from 'next/navigation';
import ApprovedWorkDetailClient from './ApprovedWorkDetailClient';

export const dynamic = 'force-dynamic';

type LeanId = { toString(): string };
interface TSLeanDoc {
    _id?: LeanId;
    workName?: string;
    [key: string]: unknown;
}
interface PkgWorkEntry {
    workName?: string;
    [key: string]: unknown;
}
interface PkgLeanDoc {
    _id: LeanId;
    works?: PkgWorkEntry[];
    [key: string]: unknown;
}
interface WorkLeanDoc {
    _id: LeanId;
    workName?: string;
    [key: string]: unknown;
}
interface TenderLeanDoc {
    _id: LeanId;
    cancelled?: boolean;
    [key: string]: unknown;
}
interface RefLeanDoc {
    _id: LeanId;
    [key: string]: unknown;
}
interface WorkOrderBrief {
    agreementYear?: string;
    agreementNo?: string;
    [key: string]: unknown;
}

function serialize<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    return JSON.parse(
        JSON.stringify(obj, (_key, value) => {
            if (value && typeof value === 'object') {
                if (value._bsontype || (value.constructor && (value.constructor.name === 'ObjectId' || value.constructor.name === 'ObjectID'))) {
                    return value.toString();
                }
                if (value.type === 'Buffer' || (value.buffer && (value.buffer instanceof ArrayBuffer || ArrayBuffer.isView(value.buffer)))) {
                    return typeof value.toString === 'function' ? value.toString() : String(value);
                }
            }
            return value;
        })
    );
}

export default async function ApprovedWorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;

    const work = await ApprovedWork.findById(id).lean() as unknown as WorkLeanDoc | null;
    if (!work) notFound();

    const normalize = (s: string | null | undefined) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const workNameNorm = normalize(work.workName);

    // TS — name-match
    const allTS = await TechnicalSanction.find({})
        .select('_id workName tsNumber tsDate tsAmount tsAuthority dateSendingTS remarks')
        .lean() as unknown as TSLeanDoc[];
    const ts = allTS.find((t: TSLeanDoc) => normalize(t.workName) === workNameNorm) || null;

    // Package — contains this work name
    const allPackages = await Package.find({}).lean() as unknown as PkgLeanDoc[];
    const pkg = allPackages.find((p: PkgLeanDoc) =>
        p.works?.some((w: PkgWorkEntry) => normalize(w.workName) === workNameNorm)
    ) || null;

    // DTP — linked to Package._id
    const dtp = pkg ? await DTP.findOne({ tsId: pkg._id }).lean() as unknown as RefLeanDoc | null : null;

    // Tender — linked to Package._id (latest non-cancelled)
    const tender = pkg
        ? await Tender.findOne({ packageId: pkg._id, cancelled: { $ne: true } })
            .sort({ trialNo: -1 }).lean() as unknown as TenderLeanDoc | null
        : null;

    // Approval + LOA
    const [approval, loa] = tender
        ? await Promise.all([
            Approval.findOne({ tenderId: tender._id }).lean() as unknown as RefLeanDoc | null,
            LOA.findOne({ tenderId: tender._id }).lean() as unknown as RefLeanDoc | null,
        ])
        : [null, null];

    // WorkOrder
    const workOrder = loa ? await WorkOrder.findOne({ loaId: loa._id }).lean() as unknown as RefLeanDoc | null : null;

    // Bills
    const bills = workOrder
        ? await Bill.find({ workOrderId: workOrder._id })
            .sort({ billDate: 1, runningBillNumber: 1 }).lean() as unknown as RefLeanDoc[]
        : [];

    // Fetch all work orders to determine the maximum agreement number per year
    const allWorkOrders = await WorkOrder.find({ notRequired: { $ne: true } }, 'agreementYear agreementNo').lean() as unknown as WorkOrderBrief[];
    const maxAgreementNos: Record<string, number> = {};
    for (const wo of allWorkOrders) {
        if (wo.agreementYear && wo.agreementNo) {
            const num = parseInt(wo.agreementNo, 10);
            if (!isNaN(num)) {
                maxAgreementNos[wo.agreementYear] = Math.max(maxAgreementNos[wo.agreementYear] || 0, num);
            }
        }
    }

    return (
        <ApprovedWorkDetailClient
            workId={id}
            work={serialize(work)}
            ts={ts ? serialize(ts) : null}
            pkg={pkg ? serialize(pkg) : null}
            dtp={dtp ? serialize(dtp) : null}
            tender={tender ? serialize(tender) : null}
            approval={approval ? serialize(approval) : null}
            loa={loa ? serialize(loa) : null}
            workOrder={workOrder ? serialize(workOrder) : null}
            bills={serialize(bills)}
            maxAgreementNos={maxAgreementNos}
        />
    );
}
