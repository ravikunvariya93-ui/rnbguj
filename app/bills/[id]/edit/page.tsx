import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import BillForm from '@/components/BillForm';
import { notFound } from 'next/navigation';

export default async function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    
    // We lean it for the form initial data
    const bill = await Bill.findById(id).lean();

    if (!bill) {
        notFound();
    }

    // Convert BSON IDs to strings for the client component
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
