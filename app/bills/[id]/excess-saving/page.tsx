import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import { notFound, redirect } from 'next/navigation';

// Ensure models are registered for populate
void WorkOrder;
void LOA;
void Tender;

export default async function BillExcessSavingRedirectPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    
    const bill = await Bill.findById(id)
        .populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: { path: 'tenderId' }
            }
        })
        .lean() as any;

    if (!bill) {
        notFound();
    }

    const packageId = bill.workOrderId?.loaId?.tenderId?.packageId;
    if (packageId) {
        redirect(`/packages/${packageId}/bills/${id}/print-excess-saving`);
    }

    redirect('/bills');
}
