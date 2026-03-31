import ApprovalForm from '@/components/ApprovalForm';

export default function NewApprovalPage() {
    return (
        <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Add New Approval</h1>
            <ApprovalForm />
        </div>
    );
}
