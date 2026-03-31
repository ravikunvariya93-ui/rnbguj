import ApprovalForm from '@/components/ApprovalForm';
import dbConnect from '@/lib/db';
import Approval from '@/models/Approval';
import { notFound } from 'next/navigation';

export default async function EditApprovalPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    
    let approvalData = null;
    try {
        const approval = await Approval.findById(id).lean();
        if (!approval) return notFound();
        approvalData = JSON.parse(JSON.stringify(approval)); // Serialize ObjectId
    } catch (error) {
        return notFound();
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Approval</h1>
            <ApprovalForm initialData={approvalData} isEditing={true} />
        </div>
    );
}
