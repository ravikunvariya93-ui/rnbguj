'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import Link from 'next/link';
import SearchableSelect from './SearchableSelect';

interface BillFormProps {
    initialData?: any;
    isEditing?: boolean;
}

function parseDateStr(dateStr: string): Date | null {
    if (!dateStr) return null;
    const clean = String(dateStr).trim();
    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        const iso = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        const d = new Date(iso);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
}

function formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    try {
        const dateObj = new Date(dateString);
        if (isNaN(dateObj.getTime())) return '';
        return formatDate(dateObj);
    } catch {
        return '';
    }
}

export default function BillForm({ initialData = {}, isEditing = false }: BillFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [workOrders, setWorkOrders] = useState<any[]>([]);

    const sanitized = Object.fromEntries(
        Object.entries(initialData).map(([k, v]) => [k, v == null ? '' : v])
    );

    const [formData, setFormData] = useState({
        workOrderId: '',
        billType: 'Running',
        runningBillNumber: '1',
        billDate: '',
        grossAmount: '',
        netPaidAmount: '',
        passingDate: '',
        remarks: '',
        ...sanitized,
    });

    useEffect(() => {
        const fetchWorkOrders = async () => {
            try {
                const res = await fetch('/api/work-orders');
                const data = await res.json();
                if (data.success) {
                    setWorkOrders(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch Work Orders', error);
            }
        };
        fetchWorkOrders();
    }, []);

    useEffect(() => {
        if (isEditing && initialData) {
            setFormData((prev: any) => ({
                ...prev,
                billDate: formatDateForInput(initialData.billDate),
                passingDate: formatDateForInput(initialData.passingDate),
                workOrderId: initialData.workOrderId?._id || initialData.workOrderId || '',
            }));
        }
    }, [initialData, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleWorkOrderSelect = (id: string) => {
        setFormData((prev: any) => ({ ...prev, workOrderId: id }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.workOrderId) {
            alert('Please select a Work Order');
            return;
        }
        setLoading(true);

        try {
            const submissionData = { ...formData };
            const parseDateOutput = (dateStr: string) => {
                if (!dateStr) return undefined;
                const d = parseDateStr(dateStr);
                return d ? d.toISOString() : undefined;
            };

            submissionData.billDate = parseDateOutput(formData.billDate) as any;
            submissionData.passingDate = parseDateOutput(formData.passingDate) as any;
            submissionData.grossAmount = Number(formData.grossAmount) as any;
            submissionData.netPaidAmount = Number(formData.netPaidAmount) as any;
            
            if (submissionData.billType === 'Final') {
                delete submissionData.runningBillNumber;
            } else {
                submissionData.runningBillNumber = Number(formData.runningBillNumber) as any;
            }

            const url = isEditing ? `/api/bills/${initialData._id}` : '/api/bills';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save Bill');
            }

            router.push('/bills');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert((error as any).message || 'Error saving Bill');
        } finally {
            setLoading(false);
        }
    };

    const workOrderOptions = workOrders.map((wo: any) => ({
        _id: wo._id,
        packageName: wo.loaId?.tenderId?.packageName || 'Unknown Package',
        contractorName: wo.loaId?.tenderId?.contractorName || 'N/A'
    }));

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                
                <div className="sm:col-span-6">
                    <SearchableSelect 
                        label="Select Work Order / Package"
                        required
                        options={workOrderOptions}
                        value={formData.workOrderId}
                        onChange={handleWorkOrderSelect}
                        placeholder="Search by package name..."
                    />
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="billType" className="block text-sm font-medium text-gray-700">Bill Type</label>
                    <select
                        name="billType"
                        id="billType"
                        value={formData.billType}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        required
                    >
                        <option value="Running">Running Bill</option>
                        <option value="Final">Final Bill</option>
                    </select>
                </div>

                {formData.billType === 'Running' && (
                    <div className="sm:col-span-3">
                        <label htmlFor="runningBillNumber" className="block text-sm font-medium text-gray-700">Running Bill Number</label>
                        <select
                            name="runningBillNumber"
                            id="runningBillNumber"
                            value={formData.runningBillNumber}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                            required
                        >
                            {[...Array(15)].map((_, i) => (
                                <option key={i+1} value={i+1}>{i+1}{i+1 === 1 ? 'st' : i+1 === 2 ? 'nd' : i+1 === 3 ? 'rd' : 'th'} Running Bill</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="sm:col-span-3">
                    <label htmlFor="billDate" className="block text-sm font-medium text-gray-700">Bill Date</label>
                    <input 
                        type="text" 
                        placeholder="DD/MM/YYYY" 
                        name="billDate" 
                        id="billDate" 
                        value={formData.billDate} 
                        onChange={handleChange} 
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                        required
                    />
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="passingDate" className="block text-sm font-medium text-gray-700">Passing Date</label>
                    <input 
                        type="text" 
                        placeholder="DD/MM/YYYY" 
                        name="passingDate" 
                        id="passingDate" 
                        value={formData.passingDate} 
                        onChange={handleChange} 
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                    />
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="grossAmount" className="block text-sm font-medium text-gray-700">Gross Amount (₹)</label>
                    <input 
                        type="number" 
                        name="grossAmount" 
                        id="grossAmount" 
                        value={formData.grossAmount} 
                        onChange={handleChange} 
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                        required
                    />
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="netPaidAmount" className="block text-sm font-medium text-gray-700">Net Paid Amount (₹)</label>
                    <input 
                        type="number" 
                        name="netPaidAmount" 
                        id="netPaidAmount" 
                        value={formData.netPaidAmount} 
                        onChange={handleChange} 
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                        required
                    />
                </div>

                <div className="sm:col-span-6">
                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">Remarks</label>
                    <textarea 
                        name="remarks" 
                        id="remarks" 
                        rows={3}
                        value={formData.remarks} 
                        onChange={handleChange} 
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                </div>

            </div>

            <div className="pt-5">
                <div className="flex justify-end">
                    <Link href="/bills" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</Link>
                    <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Bill'}
                    </button>
                </div>
            </div>
        </form>
    );
}
