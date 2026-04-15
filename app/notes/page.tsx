import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Note, { INote } from '@/models/Note';
import Link from 'next/link';
import { Plus, Filter, Eye, Edit2 } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import GenericDeleteButton from '@/components/GenericDeleteButton';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: { search?: string; page?: string; limit?: string };
}

export default async function NotesListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    if (params.search) {
        query.$or = [
            { title: { $regex: params.search, $options: 'i' } },
            { workName: { $regex: params.search, $options: 'i' } },
        ];
    }

    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '10');
    const skip = (page - 1) * limit;

    const totalItems = await Note.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const notesRaw = await Note.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const notes = notesRaw.map((n: any) => ({
        ...n,
        _id: n._id.toString(),
    }));

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

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-2xl font-semibold text-gray-900">Notes</h1>
                        {params.search && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Filter className="w-3 h-3 mr-1" /> Search Active
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">Manage project notes, observations, and follow-ups.</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link href="/notes/new" className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Add New Note
                    </Link>
                </div>
            </div>

            <div className="mt-6 flex justify-start items-center">
                <Suspense fallback={<div className="h-10 w-full max-w-lg bg-gray-100 animate-pulse rounded-md" />}>
                    <SearchBar placeholder="Search by title or work name..." />
                </Suspense>
                {params.search && (
                    <Link href="/notes" className="ml-4 text-sm text-blue-600 hover:text-blue-900">
                        Clear filters
                    </Link>
                )}
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Title</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Priority</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 cursor-default text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {notes.length === 0 ? (
                                        <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-500">No notes found.</td></tr>
                                    ) : (
                                        notes.map((note: any) => (
                                            <tr key={note._id}>
                                                <td className="whitespace-normal py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 max-w-xs">
                                                    {note.title}
                                                    {note.workName && (
                                                        <p className="text-xs text-gray-500 mt-1 truncate">{note.workName}</p>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{note.category || '-'}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[note.priority] || 'bg-gray-100 text-gray-700'}`}>
                                                        {note.priority || 'Normal'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[note.status] || 'bg-gray-100 text-gray-700'}`}>
                                                        {note.status || 'Open'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(note.createdAt).toLocaleDateString('en-GB')}</td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex items-center justify-end space-x-3">
                                                    <Link href={`/notes/${note._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                                                        <Eye className="w-5 h-5" />
                                                    </Link>
                                                    <Link href={`/notes/${note._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Note">
                                                        <Edit2 className="w-5 h-5" />
                                                    </Link>
                                                    <GenericDeleteButton
                                                        itemId={note._id}
                                                        itemName={note.title}
                                                        apiPath="/api/notes"
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                            <Pagination currentPage={page} totalPages={totalPages} />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
