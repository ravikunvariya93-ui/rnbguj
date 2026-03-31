import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import WorkOrderForm from '@/components/WorkOrderForm';
import { notFound } from 'next/navigation';

export default async function EditWorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    const workOrder = await WorkOrder.findById(id).lean();

    if (!workOrder) {
        notFound();
    }

    // Convert ObjectIds to strings for passing as props
    const serializedData = JSON.parse(JSON.stringify(workOrder));

    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Work Order</h1>
            <WorkOrderForm initialData={serializedData} isEditing={true} />
        </div>
    );
}
