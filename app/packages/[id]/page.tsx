import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import TechnicalSanction from '@/models/TechnicalSanction';
import ApprovedWork from '@/models/ApprovedWork';
import DTP from '@/models/DTP';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Bill from '@/models/Bill';
import BOQ from '@/models/BOQ';
import ExcessProposal from '@/models/ExcessProposal';
import { notFound } from 'next/navigation';
import PackageDetailClient from './PackageDetailClient';

export const dynamic = 'force-dynamic';

function serialize<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    const sanitized = JSON.parse(
        JSON.stringify(obj, (_key, value) => {
            if (value && typeof value === 'object') {
                if (value._bsontype || (value.constructor && (value.constructor.name === 'ObjectId' || value.constructor.name === 'ObjectID'))) {
                    return value.toString();
                }
                if (value.type === 'Buffer' || value.buffer) {
                    return typeof value.toString === 'function' ? value.toString() : String(value);
                }
            }
            return value;
        })
    );

    const clean = (val: any): any => {
        if (!val || typeof val !== 'object') return val;
        if (Array.isArray(val)) return val.map(clean);
        const res: any = {};
        for (const k of Object.keys(val)) {
            const v = val[k];
            if (v && typeof v === 'object' && v.buffer && typeof v.buffer === 'object') {
                res[k] = String(v);
            } else {
                res[k] = clean(v);
            }
        }
        return res;
    };

    return clean(sanitized);
}

export default async function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;

    const pkg = await Package.findById(id).populate('works.workId').lean() as any;
    if (!pkg) notFound();

    // Fetch all ApprovedWorks to match details by name on client side
    const approvedWorks = await ApprovedWork.find({}).lean() as any[];

    // DTP — linked to Package._id
    const dtp = await DTP.findOne({ tsId: pkg._id }).lean() as any;

    // Fetch all tenders for the package (all trials/attempts) sorted by trialNo descending
    const tenders = await Tender.find({ packageId: pkg._id }).sort({ trialNo: -1 }).lean() as any[];

    // Tender — linked to Package._id (latest non-cancelled)
    const tender = tenders.find(t => !t.cancelled) || null;

    // Approval + LOA + BOQ
    const [approval, loa, boq] = tender
        ? await Promise.all([
            Approval.findOne({ tenderId: tender._id }).lean() as any,
            LOA.findOne({ tenderId: tender._id }).lean() as any,
            BOQ.findOne({ tenderId: tender._id }).lean() as any,
        ])
        : [null, null, null];

    // WorkOrder
    const workOrder = loa ? await WorkOrder.findOne({ loaId: loa._id }).lean() as any : null;

    // Bills
    const bills = workOrder
        ? await Bill.find({ workOrderId: workOrder._id })
            .sort({ billDate: 1, runningBillNumber: 1 }).lean() as any[]
        : [];

    // Excess Proposals
    const excessProposals = await ExcessProposal.find({ packageId: pkg._id })
        .sort({ proposalDate: -1, createdAt: -1 })
        .lean() as any[];

    // Fetch all work orders to determine the maximum agreement number per year
    const allWorkOrders = await WorkOrder.find({ notRequired: { $ne: true } }, 'agreementYear agreementNo').lean() as any[];
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
        <PackageDetailClient
            packageId={id}
            pkg={serialize(pkg)}
            approvedWorks={serialize(approvedWorks)}
            dtp={dtp ? serialize(dtp) : null}
            tender={tender ? serialize(tender) : null}
            tenders={serialize(tenders)}
            boq={boq ? serialize(boq) : null}
            approval={approval ? serialize(approval) : null}
            loa={loa ? serialize(loa) : null}
            workOrder={workOrder ? serialize(workOrder) : null}
            bills={serialize(bills)}
            excessProposals={serialize(excessProposals)}
            maxAgreementNos={maxAgreementNos}
        />
    );
}
