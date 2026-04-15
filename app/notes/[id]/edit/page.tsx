import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import NoteForm from '@/components/NoteForm';
import { notFound } from 'next/navigation';

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;

    let note;
    try {
        note = await Note.findById(id).lean();
    } catch (e) {
        console.error(e);
    }

    if (!note) {
        notFound();
    }

    // Convert _id to string for serialization
    const serializedNote = {
        ...note,
        _id: (note._id as any).toString(),
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Note</h1>
            <NoteForm initialData={serializedNote} isEditing={true} />
        </div>
    );
}
