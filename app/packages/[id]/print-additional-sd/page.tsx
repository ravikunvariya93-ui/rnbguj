import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Agency from '@/models/Agency';
import Bill from '@/models/Bill';
import DepositRefund from '@/models/DepositRefund';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AdditionalSDPrintClient from './AdditionalSDPrintClient';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function PrintAdditionalSDPage({ params }: Props) {
    await dbConnect();
    const { id } = await params;

    // Fetch Package details
    const pkgRaw = await Package.findById(id).lean() as any;
    if (!pkgRaw) notFound();

    // Fetch related Tender (latest non-cancelled)
    const tenderRaw = await Tender.findOne({ packageId: pkgRaw._id, cancelled: { $ne: true } })
        .sort({ trialNo: -1 }).lean() as any;

    const loaRaw = tenderRaw ? await LOA.findOne({ tenderId: tenderRaw._id }).lean() as any : null;
    const workOrderRaw = loaRaw ? await WorkOrder.findOne({ loaId: loaRaw._id }).lean() as any : null;
    const agencyRaw = tenderRaw ? await Agency.findOne({ name: tenderRaw.contractorName }).lean() as any : null;

    // Fetch existing DepositRefund record for this package
    const depositRefundRaw = await DepositRefund.findOne({ packageId: pkgRaw._id, refundType: 'Additional SD' }).lean() as any;

    // Fetch Bills to find actualCompletionDate from final bill
    const billsRaw = workOrderRaw
        ? await Bill.find({ workOrderId: workOrderRaw._id }).sort({ billDate: -1, runningBillNumber: -1 }).lean() as any[]
        : [];

    const finalBill = billsRaw.find((b: any) => b.billType === 'Final' || b.actualCompletionDate);

    // Serialize data
    const packageData = JSON.parse(JSON.stringify(pkgRaw));
    const tender = tenderRaw ? JSON.parse(JSON.stringify(tenderRaw)) : null;
    const loa = loaRaw ? JSON.parse(JSON.stringify(loaRaw)) : null;
    const workOrder = workOrderRaw ? JSON.parse(JSON.stringify(workOrderRaw)) : null;
    const agency = agencyRaw ? JSON.parse(JSON.stringify(agencyRaw)) : null;
    const depositRefund = depositRefundRaw ? JSON.parse(JSON.stringify(depositRefundRaw)) : null;
    const actualCompletionDate = finalBill?.actualCompletionDate || depositRefundRaw?.actualCompletionDate || null;

    return (
        <AdditionalSDPrintClient
            packageData={packageData}
            tender={tender}
            loa={loa}
            workOrder={workOrder}
            agency={agency}
            depositRefund={depositRefund}
            defaultActualCompletionDate={actualCompletionDate}
        />
    );
}
