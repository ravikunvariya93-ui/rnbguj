import React from 'react';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
import Agency from '@/models/Agency';
import { notFound } from 'next/navigation';
import ExcessSavingPrintClient from './ExcessSavingPrintClient';

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

interface IdLean {
    _id: string;
}

interface PopulatedBillLean {
    _id: string;
    workOrderId?: (IdLean & {
        loaId?: (IdLean & {
            tenderId?: (IdLean & {
                contractorId?: string;
                contractorName?: string;
            }) | null;
        }) | null;
    }) | null;
}

interface TenderLean {
    contractorId?: string;
    contractorName?: string;
}

export default async function PrintExcessSavingPage({ params }: Props) {
    await dbConnect();
    const { id: packageId, billId } = await params;

    const pkgRaw = await Package.findById(packageId).lean() as unknown as IdLean | null;
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
        .lean() as unknown as PopulatedBillLean | null;

    if (!billRaw) notFound();

    const workOrderRaw = billRaw.workOrderId ?? null;
    const loaRaw = workOrderRaw?.loaId ?? null;
    const tenderRaw = (loaRaw?.tenderId ?? null) as TenderLean | null;

    let agencyRaw: IdLean | null = null;
    if (tenderRaw?.contractorName) {
        agencyRaw = tenderRaw.contractorId
            ? await Agency.findById(tenderRaw.contractorId).lean() as unknown as IdLean | null
            : await Agency.findOne({ name: tenderRaw.contractorName.trim() }).collation({ locale: 'en', strength: 2 }).lean() as unknown as IdLean | null;
    }

    const packageData = serialize(pkgRaw);
    const tender = serialize(tenderRaw);
    const loa = serialize(loaRaw);
    const workOrder = serialize(workOrderRaw);
    const agency = serialize(agencyRaw);
    const bill = serialize(billRaw);

    return (
        <ExcessSavingPrintClient
            packageData={packageData}
            tender={tender}
            loa={loa}
            workOrder={workOrder}
            agency={agency}
            bill={bill}
        />
    );
}
