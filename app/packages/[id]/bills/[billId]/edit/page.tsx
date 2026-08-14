import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import BillForm from '@/components/BillForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

// Ensure models are registered for populate
void WorkOrder;
void LOA;
void Tender;

interface Props {
    params: Promise<{ id: string; billId: string }>;
}

export default async function EditPackageBillPage({ params }: Props) {
    await dbConnect();
    const { id: packageId, billId } = await params;

    const bill = await Bill.findById(billId)
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

    const serializedBill = JSON.parse(JSON.stringify(bill));

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                <Link
                    href={`/packages/${packageId}/bills?billId=${billId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Bill
                </Link>
            </div>

            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900">Edit Bill</h1>
                <p className="mt-1 text-xs text-slate-500">Update the financial or temporal details of this bill record.</p>
            </div>

            <BillForm initialData={serializedBill} isEditing={true} redirectTo={`/packages/${packageId}/bills?billId=${billId}`} />
        </div>
    );
}
