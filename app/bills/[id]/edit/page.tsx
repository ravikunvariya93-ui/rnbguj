import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import BillForm from '@/components/BillForm';
import { notFound, redirect } from 'next/navigation';

// Ensure models are registered for populate
void WorkOrder;
void LOA;
void Tender;

export default async function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
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
        .lean();

    if (!bill) {
        notFound();
    }

    const workOrder = bill.workOrderId as any;
    const loa = workOrder?.loaId as any;
    const tender = loa?.tenderId as any;

    // Redirect to new package-scoped edit endpoint
    if (tender?.packageId) {
        redirect(`/packages/${tender.packageId}/bills/${id}/edit`);
    }

    // Fallback: render inline if package not found
    const serializedBill = JSON.parse(JSON.stringify(bill));

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Edit Bill</h1>
                <p className="mt-2 text-sm text-gray-700">Update the financial or temporal details of this bill record.</p>
            </div>
            <BillForm initialData={serializedBill} isEditing={true} />
        </div>
    );
}
