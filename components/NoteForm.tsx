'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import Link from 'next/link';
import SearchableSelect from './SearchableSelect';

interface NoteFormProps {
    initialData?: any;
    isEditing?: boolean;
}

export default function NoteForm({ initialData = {}, isEditing = false }: NoteFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: '',
        workName: '',
        priority: 'Normal',
        status: 'Open',
        ...initialData
    });

    const [approvedWorks, setApprovedWorks] = useState<any[]>([]);

    useEffect(() => {
        const fetchApprovedWorks = async () => {
            try {
                const res = await fetch('/api/approved-works');
                const data = await res.json();
                if (data.success) {
                    setApprovedWorks(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch approved works", error);
            }
        };
        fetchApprovedWorks();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleWorkSelect = (name: string) => {
        setFormData((prev: any) => ({ ...prev, workName: name }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) {
            alert('Please enter a title');
            return;
        }
        setLoading(true);

        try {
            const submissionData = { ...formData };

            const url = isEditing ? `/api/notes/${initialData._id}` : '/api/notes';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) {
                throw new Error('Failed to save note');
            }

            router.push('/notes');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving note');
        } finally {
            setLoading(false);
        }
    };

    // Prepare options for SearchableSelect
    const workOptions = approvedWorks.map(w => ({
        _id: w.workName,
        packageName: w.workName
    }));

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                {/* Title */}
                <div className="sm:col-span-6">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        name="title"
                        id="title"
                        required
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Enter note title..."
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                </div>

                {/* Related Work */}
                <div className="sm:col-span-6">
                    <SearchableSelect
                        label="Related Work (Optional)"
                        options={workOptions}
                        value={formData.workName}
                        onChange={handleWorkSelect}
                        placeholder="Search by work name..."
                    />
                </div>

                {/* Category & Priority & Status */}
                <div className="sm:col-span-2">
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                        name="category"
                        id="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Category --</option>
                        <option value="General">General</option>
                        <option value="Site Visit">Site Visit</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Inspection">Inspection</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Issue">Issue</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                        name="priority"
                        id="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                        name="status"
                        id="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>

                {/* Content */}
                <div className="sm:col-span-6">
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
                    <textarea
                        name="content"
                        id="content"
                        rows={8}
                        value={formData.content}
                        onChange={handleChange}
                        placeholder="Enter note details..."
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                </div>
            </div>

            <div className="pt-5">
                <div className="flex justify-end">
                    <Link href="/notes" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</Link>
                    <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Note'}
                    </button>
                </div>
            </div>
        </form>
    );
}
