import DTPForm from '@/components/DTPForm';
import dbConnect from '@/lib/db';
import DTP from '@/models/DTP';
import { notFound } from 'next/navigation';

export default async function EditDTPPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    try {
        const dtp = await DTP.findById(id).lean();
        if (!dtp) return notFound();
        const dtpData = JSON.parse(JSON.stringify(dtp));
        return (
            <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit DTP</h1>
                <DTPForm initialData={dtpData} isEditing={true} />
            </div>
        );
    } catch {
        return notFound();
    }
}
