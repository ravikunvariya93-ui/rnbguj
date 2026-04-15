import dbConnect from '@/lib/db';
import BOQ from '@/models/BOQ';
import BOQForm from '@/components/BOQForm';
import { notFound } from 'next/navigation';

export default async function EditBOQPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    
    // Fetch BOQ with populated tenderId
    const boq = await BOQ.findById(id).populate('tenderId').lean();
    
    if (!boq) {
        notFound();
    }

    // Convert _id and other MongoDB objects to strings for the form
    const sanitizedBoq = JSON.parse(JSON.stringify(boq));

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold font-heading text-gray-900 mb-8">Edit Bill of Quantities (BOQ)</h1>
            <BOQForm initialData={sanitizedBoq} isEditing={true} />
        </div>
    );
}
