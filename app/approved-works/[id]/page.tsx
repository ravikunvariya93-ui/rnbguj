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

function serialize<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export default async function ApprovedWorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;

    const work = await ApprovedWork.findById(id).lean() as any;
    if (!work) notFound();

    const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const workNameNorm = normalize(work.workName);

    // TS — name-match
    const allTS = await TechnicalSanction.find({})
        .select('_id workName tsNumber tsDate tsAmount tsAuthority dateSendingTS remarks')
        .lean() as any[];
    const ts = allTS.find((t: any) => normalize(t.workName) === workNameNorm) || null;

    // Package — contains this work name
    const allPackages = await Package.find({}).lean() as any[];
    const pkg = allPackages.find((p: any) =>
        p.works?.some((w: any) => normalize(w.workName) === workNameNorm)
    ) || null;

    // DTP — linked to Package._id
    const dtp = pkg ? await DTP.findOne({ tsId: pkg._id }).lean() as any : null;

    // Tender — linked to Package._id (latest non-cancelled)
    const tender = pkg
        ? await Tender.findOne({ packageId: pkg._id, cancelled: { $ne: true } })
            .sort({ trialNo: -1 }).lean() as any
        : null;

    // Approval + LOA
    const [approval, loa] = tender
        ? await Promise.all([
            Approval.findOne({ tenderId: tender._id }).lean() as any,
            LOA.findOne({ tenderId: tender._id }).lean() as any,
        ])
        : [null, null];

    // WorkOrder
    const workOrder = loa ? await WorkOrder.findOne({ loaId: loa._id }).lean() as any : null;

    // Bills
    const bills = workOrder
        ? await Bill.find({ workOrderId: workOrder._id })
            .sort({ billType: 1, runningBillNumber: 1 }).lean() as any[]
        : [];

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
        />
    );
}
