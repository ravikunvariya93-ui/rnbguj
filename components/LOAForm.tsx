'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import Link from 'next/link';

interface LOAFormProps {
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

export default function LOAForm({ initialData = {}, isEditing = false }: LOAFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [tenders, setTenders] = useState<any[]>([]);
    const tendersRef = useRef<any[]>([]);

    const sanitized = Object.fromEntries(
        Object.entries(initialData).map(([k, v]) => [k, v == null ? '' : v])
    );

    const [formData, setFormData] = useState({
        tenderId: '',
        stampDuty: '',
        defectLiabilityPeriod: '',
        acceptanceLetterWorksheetNo: '',
        acceptanceLetterDate: '',
        ...sanitized,
    });

    useEffect(() => {
        const fetchTenders = async () => {
            try {
                const res = await fetch('/api/tenders');
                const data = await res.json();
                if (data.success) {
                    setTenders(data.data);
                    tendersRef.current = data.data;
                }
            } catch (error) {
                console.error('Failed to fetch tenders', error);
            }
        };
        fetchTenders();
    }, []);

    useEffect(() => {
        if (isEditing) {
            setFormData((prev: any) => ({
                ...prev,
                acceptanceLetterDate: formatDateForInput(initialData.acceptanceLetterDate),
            }));
        }
    }, [initialData, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const submissionData = { ...formData };
            const parseDateOutput = (dateStr: string) => {
                if (!dateStr) return undefined;
                const d = parseDateStr(dateStr);
                return d ? d.toISOString() : undefined;
            };

            if (submissionData.acceptanceLetterDate) submissionData.acceptanceLetterDate = parseDateOutput(submissionData.acceptanceLetterDate) as any;

            const url = isEditing ? `/api/loas/${initialData._id}` : '/api/loas';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) throw new Error('Failed to save LOA');

            router.push('/loas');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving LOA');
        } finally {
            setLoading(false);
        }
    };

    const selectedTender = tenders.find((t: any) => t._id === formData.tenderId);

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                
                <div className="sm:col-span-6">
                    <label htmlFor="tenderId" className="block text-sm font-medium text-gray-700">Select Package *</label>
                    <select
                        id="tenderId"
                        name="tenderId"
                        required
                        value={formData.tenderId || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Package --</option>
                        {tenders.map((tender: any) => (
                            <option key={tender._id} value={tender._id}>
                                {tender.packageName || 'Unknown Package'}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedTender && (
                    <div className="sm:col-span-6 bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
                        <strong>Tender Info:</strong>&nbsp;
                        Contract Price: ₹{selectedTender.contractPrice?.toLocaleString('en-IN') ?? '-'} &nbsp;|&nbsp;
                        {selectedTender.aboveBelowInWord} {selectedTender.aboveBelowPercentage}% &nbsp;|&nbsp;
                        Amount Put To Tender: ₹{(selectedTender.packageId?.dtpAmount
                            || selectedTender.packageId?.works?.reduce((s: number, w: any) => s + (Number(w.amount) || 0), 0)
                            || 0).toLocaleString('en-IN')}
                    </div>
                )}

                <div className="sm:col-span-3">
                    <label htmlFor="acceptanceLetterDate" className="block text-sm font-medium text-gray-700">Acceptance Letter Date</label>
                    <input type="text" placeholder="20/01/2025" name="acceptanceLetterDate" id="acceptanceLetterDate" value={formData.acceptanceLetterDate || ''} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                
                <div className="sm:col-span-3">
                    <label htmlFor="acceptanceLetterWorksheetNo" className="block text-sm font-medium text-gray-700">Acceptance Letter Worksheet No.</label>
                    <input type="text" name="acceptanceLetterWorksheetNo" id="acceptanceLetterWorksheetNo" value={formData.acceptanceLetterWorksheetNo || ''} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="defectLiabilityPeriod" className="block text-sm font-medium text-gray-700">
                        Defect Liability Period
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. 1 Year"
                        name="defectLiabilityPeriod"
                        id="defectLiabilityPeriod"
                        value={formData.defectLiabilityPeriod || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="stampDuty" className="block text-sm font-medium text-gray-700">
                        Required Stamp Duty
                    </label>
                    <input
                        type="number"
                        name="stampDuty"
                        id="stampDuty"
                        value={formData.stampDuty || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-yellow-50"
                    />
                </div>

            </div>

            <div className="pt-5">
                <div className="flex justify-end">
                    <Link href="/loas" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</Link>
                    <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save LOA'}
                    </button>
                </div>
            </div>
        </form>
    );
}
