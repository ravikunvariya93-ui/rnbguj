import BillForm from '@/components/BillForm';

export default function NewBillPage() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Add New Bill</h1>
                <p className="mt-2 text-sm text-gray-700">Submit a running or final bill for an existing work order.</p>
            </div>

            <BillForm />
        </div>
    );
}
