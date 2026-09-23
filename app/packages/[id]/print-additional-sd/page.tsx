import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Agency from '@/models/Agency';
import Bill from '@/models/Bill';
import DepositRefund from '@/models/DepositRefund';
import type { QueryFilter } from 'mongoose';
import type { ITender } from '@/models/Tender';
import type { IWorkOrder } from '@/models/WorkOrder';
import type { IDepositRefund } from '@/models/DepositRefund';
import type { IBill } from '@/models/Bill';
import { notFound } from 'next/navigation';
import AdditionalSDPrintClient from './AdditionalSDPrintClient';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

interface IdLean {
    _id: string;
}

interface TenderLean {
    _id: string;
    contractorId?: string;
    contractorName?: string;
}

interface BillLean {
    billType?: string;
    actualCompletionDate?: string;
}

export default async function PrintAdditionalSDPage({ params }: Props) {
    await dbConnect();
    const { id } = await params;

    // Fetch Package details
    const pkgRaw = await Package.findById(id).lean() as unknown as IdLean | null;
    if (!pkgRaw) notFound();

    // Fetch related Tender (latest non-cancelled)
    const tenderRaw = await Tender.findOne({ packageId: pkgRaw._id, cancelled: { $ne: true } } as unknown as QueryFilter<ITender>)
        .sort({ trialNo: -1 }).lean() as unknown as TenderLean | null;

    const loaRaw = tenderRaw ? await LOA.findOne({ tenderId: tenderRaw._id }).lean() as unknown as IdLean | null : null;
    const workOrderRaw = loaRaw ? await WorkOrder.findOne({ loaId: loaRaw._id } as unknown as QueryFilter<IWorkOrder>).lean() as unknown as IdLean | null : null;
    const agencyRaw = tenderRaw ? (
        tenderRaw.contractorId
            ? await Agency.findById(tenderRaw.contractorId).lean() as unknown as IdLean | null
            : await Agency.findOne({ name: (tenderRaw.contractorName ?? '').trim() }).collation({ locale: 'en', strength: 2 }).lean() as unknown as IdLean | null
    ) : null;

    // Fetch existing DepositRefund record for this package
    const depositRefundRaw = await DepositRefund.findOne({ packageId: pkgRaw._id, refundType: 'Additional SD' } as unknown as QueryFilter<IDepositRefund>).lean() as unknown as (IdLean & { actualCompletionDate?: string }) | null;

    // Fetch Bills to find actualCompletionDate from final bill
    const billsRaw = workOrderRaw
        ? await Bill.find({ workOrderId: workOrderRaw._id } as unknown as QueryFilter<IBill>).sort({ billDate: -1, runningBillNumber: -1 }).lean() as unknown as BillLean[]
        : [];

    const finalBill = billsRaw.find((b: BillLean) => b.billType === 'Final' || b.actualCompletionDate);

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
