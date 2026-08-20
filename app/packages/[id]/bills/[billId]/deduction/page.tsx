import React from 'react';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
import Agency from '@/models/Agency';
import { notFound } from 'next/navigation';
import DeductionPrintClient from './DeductionPrintClient';

// Ensure models are registered
void WorkOrder;
void LOA;
void Tender;
void Package;
void Agency;

export const dynamic = 'force-dynamic';

function serialize<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    return JSON.parse(JSON.stringify(obj));
}

interface Props {
    params: Promise<{ id: string; billId: string }>;
}

export default async function DeductionPage({ params }: Props) {
    await dbConnect();
    const { id: packageId, billId } = await params;

    const pkgRaw = await Package.findById(packageId).lean() as any;
    if (!pkgRaw) notFound();

    const billRaw = await Bill.findById(billId)
        .populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: {
                    path: 'tenderId',
                    populate: { path: 'packageId' }
                }
            }
        })
        .lean() as any;

    if (!billRaw) notFound();

    const workOrderRaw = billRaw.workOrderId as any;
    const loaRaw = workOrderRaw?.loaId as any;
    const tenderRaw = loaRaw?.tenderId as any;

    let agencyRaw = null;
    if (tenderRaw?.contractorName) {
        agencyRaw = await Agency.findOne({ name: tenderRaw.contractorName }).lean() as any;
    }

    // Also fetch all previous bills for this workOrder to accurately show "Since Previous Bill"
    const allBillsRaw = await Bill.find({ workOrderId: workOrderRaw?._id }).sort({ runningBillNumber: 1 }).lean() as any[];

    const packageData = serialize(pkgRaw);
    const tender = serialize(tenderRaw);
    const loa = serialize(loaRaw);
    const workOrder = serialize(workOrderRaw);
    const agency = serialize(agencyRaw);
    const bill = serialize(billRaw);
    const allBills = serialize(allBillsRaw);

    return (
        <DeductionPrintClient
            packageData={packageData}
            tender={tender}
            loa={loa}
            workOrder={workOrder}
            agency={agency}
            bill={bill}
            allBills={allBills}
        />
    );
}
