'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface PackageFormProps {
    initialData?: any;
    isEditing?: boolean;
}

import SearchableSelect from './SearchableSelect';

export default function PackageForm({ initialData = {}, isEditing = false }: PackageFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Basic info
    const [packageName, setPackageName] = useState(initialData.packageName || '');
    const [subDivision, setSubDivision] = useState(initialData.subDivision || '');
    const [dtpConsultant, setDtpConsultant] = useState(initialData.dtpConsultant || '');

    // Selected works list
    const [selectedWorks, setSelectedWorks] = useState<{ workId: string, workName: string, amount: number }[]>(initialData.works || []);

    // Available works from DB (Technical Sanctions)
    const [availableWorks, setAvailableWorks] = useState<{ _id: string, workName: string, tsAmount: number }[]>([]);

    // Temporary selection state for the dropdown
    const [currentSelectionId, setCurrentSelectionId] = useState('');

    // Auto-calculate DTP Amount logic removed
    useEffect(() => {
        const fetchAvailableWorks = async () => {
            try {
                const res = await fetch('/api/technical-sanctions');
                const data = await res.json();
                if (data.success) {
                    setAvailableWorks(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch available works", error);
            }
        };
        fetchAvailableWorks();
    }, []);

    const handleAddWork = () => {
        if (!currentSelectionId) return;

        const workToAdd = availableWorks.find(w => w._id === currentSelectionId);
        if (workToAdd) {
            // Check if already added
            if (selectedWorks.some(sw => sw.workId === workToAdd._id)) {
                alert("Work already added to this package.");
                return;
            }

            setSelectedWorks(prev => [...prev, {
                workId: workToAdd._id,
                workName: workToAdd.workName,
                amount: (workToAdd.tsAmount || 0) * 100000
            }]);
            setCurrentSelectionId(''); // Reset selection
        }
    };

    const handleRemoveWork = (id: string) => {
        setSelectedWorks(prev => prev.filter(w => w.workId !== id));
    };

    const handleWorkSelect = (id: string) => {
        setCurrentSelectionId(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedWorks.length === 0) {
            alert("Please add at least one work to the package.");
            return;
        }

        setLoading(true);

        try {
            const submissionData = {
                packageName,
                subDivision,
                dtpConsultant,
                works: selectedWorks
            };

            const url = isEditing ? `/api/packages/${initialData._id}` : '/api/packages';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) {
                throw new Error('Failed to save package');
            }

            router.push('/packages');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving package');
        } finally {
            setLoading(false);
        }
    };

    // Prepare options for SearchableSelect
    const workOptions = availableWorks.map(w => ({
        _id: w._id,
        packageName: w.workName
    }));

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                <div className="sm:col-span-6">
                    <label htmlFor="packageName" className="block text-sm font-medium text-gray-700"> Package Name * </label>
                    <input
                        type="text"
                        id="packageName"
                        required
                        value={packageName}
                        onChange={(e) => setPackageName(e.target.value)}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                </div>

                <div className="sm:col-span-6">
                    <label htmlFor="subDivision" className="block text-sm font-medium text-gray-700"> Sub Division </label>
                    <select
                        id="subDivision"
                        value={subDivision}
                        onChange={(e) => setSubDivision(e.target.value)}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Sub Division --</option>
                        <option value="Bhavnagar">Bhavnagar</option>
                        <option value="Mahuva">Mahuva</option>
                        <option value="Palitana">Palitana</option>
                        <option value="Talaja">Talaja</option>
                        <option value="Shihor">Shihor</option>
                        <option value="Vallabhipur">Vallabhipur</option>
                    </select>
                </div>

                <div className="sm:col-span-6">
                    <label htmlFor="dtpConsultant" className="block text-sm font-medium text-gray-700">DTP Consultant</label>
                    <select
                        name="dtpConsultant"
                        id="dtpConsultant"
                        value={dtpConsultant}
                        onChange={(e) => setDtpConsultant(e.target.value)}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Consultant --</option>
                        <option value="Umiya Engineers and Project Management Consultancy">Umiya Engineers and Project Management Consultancy</option>
                        <option value="Trisha Engineers Consultancy">Trisha Engineers Consultancy</option>
                        <option value="Pramukham Engineers Consultancy">Pramukham Engineers Consultancy</option>
                        <option value="Kalyan Computers">Kalyan Computers</option>
                        <option value="Karansinh Janaksinh Rana">Karansinh Janaksinh Rana</option>
                    </select>
                </div>

                <div className="sm:col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Approved Works in Package</h3>

                    {/* Selection Area */}
                    <div className="flex items-end gap-4 mb-4">
                        <div className="flex-grow">
                            <SearchableSelect 
                                label="Select a Work to Add"
                                options={workOptions}
                                value={currentSelectionId}
                                onChange={handleWorkSelect}
                                placeholder="Search by work name..."
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleAddWork}
                            disabled={!currentSelectionId}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 h-[42px]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add
                        </button>
                    </div>


                    {/* Works List */}
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        {selectedWorks.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No works added yet.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {selectedWorks.map((work, index) => (
                                    <li key={work.workId} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{work.workName}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveWork(work.workId)}
                                            className="text-red-600 hover:text-red-900 p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

            </div>

            <div className="pt-5">
                <div className="flex justify-end">
                    <Link href="/packages" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</Link>
                    <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Package'}
                    </button>
                </div>
            </div>
        </form >
    );
}
