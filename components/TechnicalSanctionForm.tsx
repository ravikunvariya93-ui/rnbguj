'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface TechnicalSanctionFormProps {
    initialData?: any;
    isEditing?: boolean;
}

import SearchableSelect from './SearchableSelect';

export default function TechnicalSanctionForm({ initialData = {}, isEditing = false }: TechnicalSanctionFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        workName: '',
        dateSendingTS: '',
        tsAuthority: '',
        tsAmount: '',
        tsNumber: '',
        tsDate: '',
        amountPutToTender: '',
        tsConsultant: '',
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

    useEffect(() => {
        // Format dates if editing
        const updateDates = () => {
            const newData: any = {};
            
            if (initialData.tsDate) {
                const dateObj = new Date(initialData.tsDate);
                if (!isNaN(dateObj.getTime())) {
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    newData.tsDate = `${day}/${month}/${year}`;
                }
            }
            
            if (initialData.dateSendingTS) {
                const dateObj = new Date(initialData.dateSendingTS);
                if (!isNaN(dateObj.getTime())) {
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    newData.dateSendingTS = `${day}/${month}/${year}`;
                }
            }

            if (Object.keys(newData).length > 0) {
                setFormData((prev: any) => ({ ...prev, ...newData }));
            }
        };

        updateDates();
    }, [initialData.tsDate, initialData.dateSendingTS]);

    // Auto-calculate Amount Not Put To Tender removed as per request
    // The user will enter Amount Not Put To Tender manually.

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleWorkSelect = (name: string) => {
        setFormData((prev: any) => ({ ...prev, workName: name }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.workName) {
            alert('Please select a Work');
            return;
        }
        setLoading(true);

        try {
            const submissionData = { ...formData };

            // Date Parsing helper
            const parseDate = (dateStr: string) => {
                const cleanDate = String(dateStr).trim();
                const parts = cleanDate.split(/[\/\-\.]/);
                if (parts.length === 3) {
                    let year = parts[2];
                    if (year.length === 2) year = '20' + year;
                    const isoDate = `${year}-${parts[1]}-${parts[0]}`;
                    const dateObj = new Date(isoDate);
                    return !isNaN(dateObj.getTime()) ? dateObj.toISOString() : null;
                }
                return null;
            };

            if (submissionData.tsDate) {
                const iso = parseDate(submissionData.tsDate);
                if (iso) {
                    submissionData.tsDate = iso;
                } else if (String(submissionData.tsDate).trim().length > 0) {
                    alert(`Invalid T.S. Date format: "${submissionData.tsDate}". Please use DD/MM/YYYY`);
                    setLoading(false);
                    return;
                }
            }

            if (submissionData.dateSendingTS) {
                const iso = parseDate(submissionData.dateSendingTS as string);
                if (iso) {
                    submissionData.dateSendingTS = iso;
                } else if (String(submissionData.dateSendingTS).trim().length > 0) {
                    alert(`Invalid Date of Sending TS format: "${submissionData.dateSendingTS}". Please use DD/MM/YYYY`);
                    setLoading(false);
                    return;
                }
            }

            const url = isEditing ? `/api/technical-sanctions/${initialData._id}` : '/api/technical-sanctions';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) {
                throw new Error('Failed to save sanction');
            }

            router.push('/technical-sanctions');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving sanction');
        } finally {
            setLoading(false);
        }
    };

    // Prepare options for SearchableSelect
    // Using workName as the ID since that's what the model stores
    const workOptions = approvedWorks.map(w => ({
        _id: w.workName, 
        packageName: w.workName
    }));

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                    <SearchableSelect 
                        label="Name of Work"
                        required
                        options={workOptions}
                        value={formData.workName}
                        onChange={handleWorkSelect}
                        placeholder="Search by work name..."
                    />
                </div>


                {/* Tracking Details */}
                <div className="sm:col-span-6">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Tracking for Approval</h4>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                            <label htmlFor="dateSendingTS" className="block text-sm font-medium text-gray-700">Date of Sending TS for Approval (DD/MM/YYYY)</label>
                            <input type="text" placeholder="20/01/2025" name="dateSendingTS" id="dateSendingTS" value={formData.dateSendingTS} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                        </div>
                        <div className="sm:col-span-3">
                            <label htmlFor="tsConsultant" className="block text-sm font-medium text-gray-700">TS Consultant</label>
                            <select
                                name="tsConsultant"
                                id="tsConsultant"
                                value={formData.tsConsultant}
                                onChange={handleChange}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                            >
                                <option value="">-- Select Consultant --</option>
                                <option value="Umiya">Umiya</option>
                                <option value="Trisha">Trisha</option>
                                <option value="Pramukh">Pramukh</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* T.S. Details */}
                <div className="sm:col-span-2">
                    <label htmlFor="tsAuthority" className="block text-sm font-medium text-gray-700">TS Authority</label>
                    <select
                        name="tsAuthority"
                        id="tsAuthority"
                        value={formData.tsAuthority}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Authority --</option>
                        <option value="Executive Engineer (EE)">Executive Engineer (EE)</option>
                        <option value="Superintending Engineer (SE)">Superintending Engineer (SE)</option>
                        <option value="Chief Engineer (CE)">Chief Engineer (CE)</option>
                    </select>
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="tsNumber" className="block text-sm font-medium text-gray-700">T.S. Number</label>
                    <input type="text" name="tsNumber" id="tsNumber" value={formData.tsNumber} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="tsDate" className="block text-sm font-medium text-gray-700">T.S. Date (DD/MM/YYYY)</label>
                    <input type="text" placeholder="20/01/2025" name="tsDate" id="tsDate" value={formData.tsDate} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                {/* Cost Details */}
                <div className="sm:col-span-6">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Cost Details (Rupees)</h4>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                            <label htmlFor="tsAmount" className="block text-sm font-medium text-gray-700">TS Amount</label>
                            <input type="number" step="0.01" name="tsAmount" id="tsAmount" value={formData.tsAmount} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                        </div>
                        <div className="sm:col-span-3">
                            <label htmlFor="amountPutToTender" className="block text-sm font-medium text-gray-700">Amount put to Tender</label>
                            <input type="number" step="0.01" name="amountPutToTender" id="amountPutToTender" value={formData.amountPutToTender} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                        </div>
                    </div>
                </div>



            </div>

            <div className="pt-5">
                <div className="flex justify-end">
                    <Link href="/technical-sanctions" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</Link>
                    <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Sanction'}
                    </button>
                </div>
            </div>
        </form>
    );
}
