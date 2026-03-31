import WorkOrderForm from '@/components/WorkOrderForm';

export default function NewWorkOrderPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create New Work Order</h1>
            <WorkOrderForm />
        </div>
    );
}
