import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import Link from 'next/link';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    const note = await Note.findById(id).lean();

    if (!note) {
        notFound();
    }

    const priorityColors: Record<string, string> = {
        Low: 'bg-gray-100 text-gray-700',
        Normal: 'bg-blue-100 text-blue-700',
        High: 'bg-orange-100 text-orange-700',
        Urgent: 'bg-red-100 text-red-700',
    };

    const statusColors: Record<string, string> = {
        Open: 'bg-green-100 text-green-700',
        'In Progress': 'bg-yellow-100 text-yellow-700',
        Resolved: 'bg-blue-100 text-blue-700',
        Closed: 'bg-gray-100 text-gray-700',
    };

    const sections = [
        {
            title: 'Note Information',
            fields: [
                { label: 'Title', value: note.title },
                { label: 'Category', value: (note as any).category },
                { label: 'Related Work', value: note.workName },
                { label: 'Priority', value: note.priority, badge: priorityColors[note.priority || 'Normal'] },
                { label: 'Status', value: note.status, badge: statusColors[note.status || 'Open'] },
                { label: 'Created', value: note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-GB') : '-' },
            ]
        },
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/notes" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Note Details</h1>
                </div>
                <Link
                    href={`/notes/${id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Note
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{note.title}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 italic">Note details and associated information.</p>
                </div>
                <div className="px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        {sections.map((section) => (
                            <div key={section.title} className="py-4 sm:py-5">
                                <dt className="text-sm font-semibold text-blue-600 px-4 sm:px-6 mb-4 uppercase tracking-wider">
                                    {section.title}
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 px-4 sm:px-6">
                                        {section.fields.map((field) => (
                                            <div key={field.label} className="sm:col-span-1">
                                                <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {(field as any).badge ? (
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(field as any).badge}`}>
                                                            {field.value?.toString() || '-'}
                                                        </span>
                                                    ) : (
                                                        field.value?.toString() || '-'
                                                    )}
                                                </dd>
                                            </div>
                                        ))}
                                    </div>
                                </dd>
                            </div>
                        ))}

                        {/* Content Section */}
                        <div className="py-4 sm:py-5">
                            <dt className="text-sm font-semibold text-blue-600 px-4 sm:px-6 mb-4 uppercase tracking-wider">
                                Content
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 px-4 sm:px-6">
                                <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md border border-gray-200 min-h-[100px]">
                                    {note.content || 'No content added.'}
                                </div>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
}
