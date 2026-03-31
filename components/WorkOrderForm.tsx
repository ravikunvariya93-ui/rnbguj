'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import Link from 'next/link';

interface WorkOrderFormProps {
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

import SearchableSelect from './SearchableSelect';

export default function WorkOrderForm({ initialData = {}, isEditing = false }: WorkOrderFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loas, setLoas] = useState<any[]>([]);

    const sanitized = Object.fromEntries(
        Object.entries(initialData).map(([k, v]) => [k, v == null ? '' : v])
    );

    const [formData, setFormData] = useState({
        loaId: '',
        agreementYear: '',
        agreementNo: '',
        agreementDate: '',
        securityDepositType: '',
        securityDepositBankName: '',
        securityDepositNumber: '',
        securityDepositAmount: '',
        securityDepositDate: '',
        additionalSecurityDepositType: '',
        additionalSecurityDepositBankName: '',
        additionalSecurityDepositNumber: '',
        additionalSecurityDepositAmount: '',
        additionalSecurityDepositDate: '',
        workOrderWorksheetNo: '',
        workOrderDate: '',
        timeLimitStartsFrom: '',
        workDurationMonths: '',
        stipulatedCompletionDate: '',
        ...sanitized,
    });

    useEffect(() => {
        const fetchLoas = async () => {
            try {
                const res = await fetch('/api/loas');
                const data = await res.json();
                if (data.success) {
                    setLoas(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch LOAs', error);
            }
        };
        fetchLoas();
    }, []);

    useEffect(() => {
        if (isEditing && initialData) {
            setFormData((prev: any) => ({
                ...prev,
                agreementDate: formatDateForInput(initialData.agreementDate),
                securityDepositDate: formatDateForInput(initialData.securityDepositDate),
                additionalSecurityDepositDate: formatDateForInput(initialData.additionalSecurityDepositDate),
                workOrderDate: formatDateForInput(initialData.workOrderDate),
                timeLimitStartsFrom: formatDateForInput(initialData.timeLimitStartsFrom),
                stipulatedCompletionDate: formatDateForInput(initialData.stipulatedCompletionDate),
                loaId: initialData.loaId?._id || initialData.loaId || '',
            }));
        }
    }, [initialData, isEditing]);

    useEffect(() => {
        if (!formData.loaId) return;

        if (formData.workOrderDate) {
            setFormData((prev: any) => {
                if (prev.timeLimitStartsFrom === formData.workOrderDate) return prev;
                return { ...prev, timeLimitStartsFrom: formData.workOrderDate };
            });
        } else {
            const selectedLoa = loas.find((loa: any) => loa._id === formData.loaId);
            if (selectedLoa && selectedLoa.acceptanceLetterDate) {
                const accDate = new Date(selectedLoa.acceptanceLetterDate);
                accDate.setMonth(accDate.getMonth() + 3);
                const calcDateStr = formatDate(accDate);
                setFormData((prev: any) => {
                    if (prev.timeLimitStartsFrom === calcDateStr) return prev;
                    return { ...prev, timeLimitStartsFrom: calcDateStr };
                });
            }
        }
    }, [formData.workOrderDate, formData.loaId, loas]);

    useEffect(() => {
        if (!formData.timeLimitStartsFrom || !formData.workDurationMonths) return;
        const tlsfDate = parseDateStr(String(formData.timeLimitStartsFrom));
        if (!tlsfDate) return;
        
        const workMonths = Number(formData.workDurationMonths) || 0;
        const stipulatedDate = new Date(tlsfDate);
        stipulatedDate.setMonth(stipulatedDate.getMonth() + workMonths);
        stipulatedDate.setDate(stipulatedDate.getDate() - 1);

        setFormData((prev: any) => ({
            ...prev,
            stipulatedCompletionDate: formatDate(stipulatedDate),
        }));
    }, [formData.timeLimitStartsFrom, formData.workDurationMonths]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleLoaSelect = (id: string) => {
        setFormData((prev: any) => ({ ...prev, loaId: id }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.loaId) {
            alert('Please select a Package');
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

            if (submissionData.agreementDate) submissionData.agreementDate = parseDateOutput(submissionData.agreementDate) as any;
            if (submissionData.securityDepositDate) submissionData.securityDepositDate = parseDateOutput(submissionData.securityDepositDate) as any;
            if (submissionData.additionalSecurityDepositDate) submissionData.additionalSecurityDepositDate = parseDateOutput(submissionData.additionalSecurityDepositDate) as any;
            if (submissionData.workOrderDate) submissionData.workOrderDate = parseDateOutput(submissionData.workOrderDate) as any;
            if (submissionData.timeLimitStartsFrom) submissionData.timeLimitStartsFrom = parseDateOutput(submissionData.timeLimitStartsFrom) as any;
            if (submissionData.stipulatedCompletionDate) submissionData.stipulatedCompletionDate = parseDateOutput(submissionData.stipulatedCompletionDate) as any;

            const url = isEditing ? `/api/work-orders/${initialData._id}` : '/api/work-orders';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) throw new Error('Failed to save Work Order');

            router.push('/work-orders');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving Work Order');
        } finally {
            setLoading(false);
        }
    };

    // Prepare selectable options for the combobox
    const loaOptions = loas.map((loa: any) => ({
        _id: loa._id,
        packageName: loa.tenderId?.packageName || 'Unknown Package',
        contractorName: loa.tenderId?.contractorName || 'N/A'
    }));

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                
                <div className="sm:col-span-6">
                    <SearchableSelect 
                        label="Select Package"
                        required
                        options={loaOptions}
                        value={formData.loaId}
                        onChange={handleLoaSelect}
                        placeholder="Search by package name..."
                    />
                </div>


                <div className="sm:col-span-6 border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Agreement Details</h3>
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="agreementYear" className="block text-sm font-medium text-gray-700">Agreement Year</label>
                    <input type="text" name="agreementYear" id="agreementYear" value={formData.agreementYear} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="agreementNo" className="block text-sm font-medium text-gray-700">Agreement No.</label>
                    <input type="text" name="agreementNo" id="agreementNo" value={formData.agreementNo} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="agreementDate" className="block text-sm font-medium text-gray-700">Agreement Date</label>
                    <input type="text" placeholder="20/01/2025" name="agreementDate" id="agreementDate" value={formData.agreementDate} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-6 border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Security Deposit Details</h3>
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="securityDepositAmount" className="block text-sm font-medium text-gray-700">Required SD Amount</label>
                    <input type="number" name="securityDepositAmount" id="securityDepositAmount" value={formData.securityDepositAmount || ''} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="securityDepositDate" className="block text-sm font-medium text-gray-700">Date upto which SD Required</label>
                    <input type="text" placeholder="20/01/2025" name="securityDepositDate" id="securityDepositDate" value={formData.securityDepositDate || ''} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2"></div>

                <div className="sm:col-span-2">
                    <label htmlFor="securityDepositType" className="block text-sm font-medium text-gray-700">SD Type</label>
                    <select name="securityDepositType" id="securityDepositType" value={formData.securityDepositType} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border">
                        <option value="">-- Select --</option>
                        <option value="FDR">FDR</option>
                        <option value="Bank Guarantee">Bank Guarantee</option>
                    </select>
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="securityDepositBankName" className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <input type="text" name="securityDepositBankName" id="securityDepositBankName" value={formData.securityDepositBankName} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="securityDepositNumber" className="block text-sm font-medium text-gray-700">SD Number</label>
                    <input type="text" name="securityDepositNumber" id="securityDepositNumber" value={formData.securityDepositNumber} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-6 border-b border-gray-100 my-2"></div>

                <div className="sm:col-span-2">
                    <label htmlFor="additionalSecurityDepositAmount" className="block text-sm font-medium text-gray-700">Required Addl. SD Amount</label>
                    <input type="number" name="additionalSecurityDepositAmount" id="additionalSecurityDepositAmount" value={formData.additionalSecurityDepositAmount || ''} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="additionalSecurityDepositDate" className="block text-sm font-medium text-gray-700">Date upto which Addl. SD Req</label>
                    <input type="text" placeholder="20/01/2025" name="additionalSecurityDepositDate" id="additionalSecurityDepositDate" value={formData.additionalSecurityDepositDate || ''} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2"></div>

                <div className="sm:col-span-2">
                    <label htmlFor="additionalSecurityDepositType" className="block text-sm font-medium text-gray-700">Addl. SD Type</label>
                    <select name="additionalSecurityDepositType" id="additionalSecurityDepositType" value={formData.additionalSecurityDepositType} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border">
                        <option value="">-- Select --</option>
                        <option value="FDR">FDR</option>
                        <option value="Bank Guarantee">Bank Guarantee</option>
                    </select>
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="additionalSecurityDepositBankName" className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <input type="text" name="additionalSecurityDepositBankName" id="additionalSecurityDepositBankName" value={formData.additionalSecurityDepositBankName} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="additionalSecurityDepositNumber" className="block text-sm font-medium text-gray-700">Addl. SD Number</label>
                    <input type="text" name="additionalSecurityDepositNumber" id="additionalSecurityDepositNumber" value={formData.additionalSecurityDepositNumber} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-6 border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Work Order Details</h3>
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="workOrderWorksheetNo" className="block text-sm font-medium text-gray-700">Work Order Worksheet No.</label>
                    <input type="text" name="workOrderWorksheetNo" id="workOrderWorksheetNo" value={formData.workOrderWorksheetNo} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="workOrderDate" className="block text-sm font-medium text-gray-700">Work Order Date</label>
                    <input type="text" placeholder="20/01/2025" name="workOrderDate" id="workOrderDate" value={formData.workOrderDate} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="workDurationMonths" className="block text-sm font-medium text-gray-700">Duration of Work (Months)</label>
                    <input type="number" name="workDurationMonths" id="workDurationMonths" value={formData.workDurationMonths} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="timeLimitStartsFrom" className="block text-sm font-medium text-gray-700">Time Limit Starts From</label>
                    <input type="text" placeholder="" name="timeLimitStartsFrom" id="timeLimitStartsFrom" value={formData.timeLimitStartsFrom} readOnly className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-100 cursor-not-allowed" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="stipulatedCompletionDate" className="block text-sm font-medium text-gray-700">Stipulated Completion Date</label>
                    <input type="text" placeholder="" name="stipulatedCompletionDate" id="stipulatedCompletionDate" value={formData.stipulatedCompletionDate} readOnly className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-100 cursor-not-allowed" />
                </div>

            </div>

            <div className="pt-5">
                <div className="flex justify-end">
                    <Link href="/work-orders" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</Link>
                    <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Work Order'}
                    </button>
                </div>
            </div>
        </form>
    );
}
