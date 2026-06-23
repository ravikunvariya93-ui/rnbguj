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
import { notFound } from 'next/navigation';
import PackageDetailClient from './PackageDetailClient';

export const dynamic = 'force-dynamic';

function serialize<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
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

    // Tender — linked to Package._id (latest non-cancelled)
    const tender = await Tender.findOne({ packageId: pkg._id, cancelled: { $ne: true } })
        .sort({ trialNo: -1 }).lean() as any;

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
            .sort({ billType: 1, runningBillNumber: 1 }).lean() as any[]
        : [];

    // Fetch all work orders to determine the maximum agreement number per year
    const allWorkOrders = await WorkOrder.find({}, 'agreementYear agreementNo').lean() as any[];
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
            boq={boq ? serialize(boq) : null}
            approval={approval ? serialize(approval) : null}
            loa={loa ? serialize(loa) : null}
            workOrder={workOrder ? serialize(workOrder) : null}
            bills={serialize(bills)}
            maxAgreementNos={maxAgreementNos}
        />
    );
}
