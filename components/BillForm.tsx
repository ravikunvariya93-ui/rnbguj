'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import SearchableSelect from './SearchableSelect';

interface IBillItem {
    itemNo: string;
    description: string;
    quantity: number;
    fullRate: number;
    partRate: number;
    unit: string;
    uptoDateAmount: number;
    previousPaidAmount: number;
    toBePaidAmount: number;
}

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

function formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${d.getFullYear()}`;
    } catch {
        return '';
    }
}

export default function BillForm({ initialData = {}, isEditing = false }: BillFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetchingAbstract, setFetchingAbstract] = useState(false);
    const [workOrders, setWorkOrders] = useState<any[]>([]);

    const sanitized = Object.fromEntries(
        Object.entries(initialData).map(([k, v]) => [k, v == null ? '' : v])
    );

    const [formData, setFormData] = useState({
        workOrderId: '',
        billType: 'Running',
        runningBillNumber: '1',
        billDate: '',
        grossAmount: 0,
        netPaidAmount: '',
        passingDate: '',
        remarks: '',
        ...sanitized,
        items: initialData.items || [] as IBillItem[],
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

    const handleWorkOrderSelect = async (id: string) => {
        setFormData((prev: any) => ({ ...prev, workOrderId: id }));
        
        // Fetch abstract if not editing (or if they change work order)
        if (id) {
            setFetchingAbstract(true);
            try {
                const res = await fetch(`/api/bills/abstract?workOrderId=${id}`);
                const data = await res.json();
                if (data.success) {
                    setFormData((prev: any) => ({ ...prev, items: data.data }));
                    calculateTotals(data.data);
                } else {
                    alert('Error fetching abstract: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('Failed to fetch BOQ abstract');
            } finally {
                setFetchingAbstract(false);
            }
        } else {
            setFormData((prev: any) => ({ ...prev, items: [] }));
            calculateTotals([]);
        }
    };

    const handleItemChange = (index: number, field: keyof IBillItem, value: string) => {
        const newItems = [...formData.items];
        let numValue = value === '' ? 0 : parseFloat(value);
        
        // Validation: Part Rate shall not be more than Full Rate
        if (field === 'partRate') {
            if (numValue > newItems[index].fullRate) {
                alert(`Part Rate cannot be more than the Full Rate (₹${newItems[index].fullRate})`);
                numValue = newItems[index].fullRate;
            }
        }
        
        newItems[index] = { ...newItems[index], [field]: numValue };
        
        // Auto-calculations
        const item = newItems[index];
        item.uptoDateAmount = parseFloat((item.quantity * item.partRate).toFixed(2));
        item.toBePaidAmount = parseFloat((item.uptoDateAmount - item.previousPaidAmount).toFixed(2));
        
        setFormData((prev: any) => ({ ...prev, items: newItems }));
        calculateTotals(newItems);
    };

    const calculateTotals = (items: IBillItem[]) => {
        const gross = items.reduce((sum, item) => sum + (item.toBePaidAmount || 0), 0);
        setFormData((prev: any) => ({ ...prev, grossAmount: gross.toFixed(2) }));
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
            submissionData.runningBillNumber = Number(formData.runningBillNumber) as any;

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
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white shadow rounded-lg">
            
            {/* General Information Section */}
            <div className="p-8 pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Bill Details</h3>
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

                    <div className="sm:col-span-2">
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

                    <div className="sm:col-span-2">
                        <label htmlFor="runningBillNumber" className="block text-sm font-medium text-gray-700">Bill Number</label>
                        <select
                            name="runningBillNumber"
                            id="runningBillNumber"
                            value={formData.runningBillNumber}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                            required
                        >
                            {[...Array(50)].map((_, i) => {
                                const num = i + 1;
                                const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
                                return (
                                    <option key={num} value={num}>
                                        {num}{suffix}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="billDate" className="block text-sm font-medium text-gray-700">Bill Date</label>
                        <input 
                            type="text" placeholder="DD/MM/YYYY" name="billDate" id="billDate" 
                            value={formData.billDate} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" required
                        />
                    </div>
                </div>
            </div>

            {/* Abstract Section */}
            <div className="p-8 pt-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Bill Abstract (Line Items)</h3>
                    {fetchingAbstract && (
                        <span className="inline-flex items-center text-sm text-blue-600">
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Fetching BOQ...
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Item No.</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider w-1/4">Description</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Unit</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Full Rate (₹)</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-blue-700 bg-blue-50 tracking-wider border-l border-blue-100 min-w-[140px]">Upto Date Qty</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-blue-700 bg-blue-50 tracking-wider border-r border-blue-100 min-w-[140px]">Part Rate (₹)</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider bg-slate-100">Upto Date Amt</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-amber-700 bg-amber-50 tracking-wider">Prev Paid Amt</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-emerald-700 bg-emerald-50 tracking-wider">To Be Paid</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {formData.items.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500 bg-gray-50/50">
                                        Select a Work Order above to load the BOQ items abstract.
                                    </td>
                                </tr>
                            ) : (
                                formData.items.map((item: IBillItem, index: number) => (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-3 text-sm text-slate-700 font-medium whitespace-nowrap">{item.itemNo}</td>
                                        <td className="px-3 py-3 text-xs text-slate-600 line-clamp-2" title={item.description}>{item.description}</td>
                                        <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{item.unit}</td>
                                        <td className="px-3 py-3 text-sm text-slate-700 font-mono">{item.fullRate.toFixed(2)}</td>
                                        
                                        {/* Editable Fields */}
                                        <td className="px-3 py-2 border-l border-blue-100 bg-blue-50/30">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.quantity || ''}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-3 py-2 border-r border-blue-100 bg-blue-50/30">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.partRate || ''}
                                                onChange={(e) => handleItemChange(index, 'partRate', e.target.value)}
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        
                                        {/* Calculated Fields */}
                                        <td className="px-3 py-3 text-sm text-slate-800 font-mono bg-slate-50">{item.uptoDateAmount.toFixed(2)}</td>
                                        
                                        <td className="px-3 py-2 bg-amber-50/30">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.previousPaidAmount || ''}
                                                onChange={(e) => handleItemChange(index, 'previousPaidAmount', e.target.value)}
                                                className="block w-full sm:text-sm border-amber-200 rounded-md p-1.5 border focus:ring-amber-500 focus:border-amber-500"
                                            />
                                        </td>
                                        
                                        <td className="px-3 py-3 text-sm font-bold text-emerald-700 font-mono bg-emerald-50/50">
                                            {item.toBePaidAmount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {formData.items.length > 0 && (
                            <tfoot className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan={6} className="px-3 py-3 text-right text-sm text-slate-700">Totals:</td>
                                    <td className="px-3 py-3 text-sm text-slate-800 font-mono">
                                        {formData.items.reduce((s: number, i: any) => s + (i.uptoDateAmount || 0), 0).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-3 text-sm text-amber-700 font-mono">
                                        {formData.items.reduce((s: number, i: any) => s + (i.previousPaidAmount || 0), 0).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-3 text-sm text-emerald-700 font-mono text-lg border-x-2 border-emerald-200 bg-emerald-100/50">
                                        ₹{formData.items.reduce((s: number, i: any) => s + (i.toBePaidAmount || 0), 0).toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Footer / Summary Section */}
            <div className="p-8 pt-4">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                        <label htmlFor="grossAmount" className="block text-sm font-medium text-gray-700">Gross Amount (₹)</label>
                        <input 
                            type="number" step="0.01" name="grossAmount" id="grossAmount" 
                            value={formData.grossAmount} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50" 
                            readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">Auto-calculated from abstract</p>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="netPaidAmount" className="block text-sm font-medium text-gray-700">Net Paid Amount (₹)</label>
                        <input 
                            type="number" step="0.01" name="netPaidAmount" id="netPaidAmount" 
                            value={formData.netPaidAmount} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">After deductions (IT, GST, etc.)</p>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="passingDate" className="block text-sm font-medium text-gray-700">Passing Date</label>
                        <input 
                            type="text" placeholder="DD/MM/YYYY" name="passingDate" id="passingDate" 
                            value={formData.passingDate} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                        />
                    </div>

                    <div className="sm:col-span-6">
                        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">Remarks</label>
                        <textarea 
                            name="remarks" id="remarks" rows={2} value={formData.remarks} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                    </div>
                </div>

                <div className="pt-8">
                    <div className="flex justify-end">
                        <Link href="/bills" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
                        <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                            <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Bill & Abstract'}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
