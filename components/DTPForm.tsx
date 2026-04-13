'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import Link from 'next/link';

interface DTPFormProps {
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
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '' : formatDate(d);
    } catch { return ''; }
}

import SearchableSelect from './SearchableSelect';

export default function DTPForm({ initialData = {}, isEditing = false }: DTPFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [packages, setPackages] = useState<any[]>([]);

    const sanitized = Object.fromEntries(
        Object.entries(initialData).map(([k, v]) => [k, v == null ? '' : v])
    );

    const [formData, setFormData] = useState({
        tsId: '',
        dtpSendingNo: '',
        dtpSendingDate: '',
        dtpApprovingAuthority: '',
        dtpApprovalNo: '',
        dtpApprovalDate: '',
        ...sanitized,
    });

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const res = await fetch('/api/packages');
                const data = await res.json();
                if (data.success) setPackages(data.data);
            } catch (error) {
                console.error('Failed to fetch packages', error);
            }
        };
        fetchPackages();
    }, []);

    useEffect(() => {
        if (isEditing && initialData) {
            setFormData((prev: any) => ({
                ...prev,
                dtpSendingDate: formatDateForInput(initialData.dtpSendingDate),
                dtpApprovalDate: formatDateForInput(initialData.dtpApprovalDate),
                tsId: initialData.tsId?._id || initialData.tsId || '',
            }));
        }
    }, [initialData, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handlePackageSelect = (id: string) => {
        setFormData((prev: any) => ({ ...prev, tsId: id }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.tsId) {
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
            if (submissionData.dtpSendingDate) submissionData.dtpSendingDate = parseDateOutput(submissionData.dtpSendingDate) as any;
            if (submissionData.dtpApprovalDate) submissionData.dtpApprovalDate = parseDateOutput(submissionData.dtpApprovalDate) as any;

            const url = isEditing ? `/api/dtps/${initialData._id}` : '/api/dtps';
            const method = isEditing ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submissionData) });
            if (!res.ok) throw new Error('Failed to save DTP');
            router.push('/dtp');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving DTP');
        } finally {
            setLoading(false);
        }
    };

    const selectedPackage = packages.find((p: any) => p._id === formData.tsId);

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                {/* TS Link */}
                <div className="sm:col-span-6">
                    <SearchableSelect 
                        label="Select Package"
                        required
                        options={packages}
                        value={formData.tsId}
                        onChange={handlePackageSelect}
                        placeholder="Search by package name..."
                    />
                </div>


                {selectedPackage && (
                    <div className="sm:col-span-6 bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
                        <strong>Package Info:</strong>&nbsp;
                        {selectedPackage.packageName}
                    </div>
                )}

                {/* DTP Approval Details */}
                <div className="sm:col-span-6 border-t border-gray-200 pt-4 mt-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">DTP Approval Details</h3>
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="dtpSendingNo" className="block text-sm font-medium text-gray-700">WS No. of Sending DTP for Approval</label>
                    <input type="text" name="dtpSendingNo" id="dtpSendingNo" value={formData.dtpSendingNo} onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-3">
                    <label htmlFor="dtpSendingDate" className="block text-sm font-medium text-gray-700">Date of Sending DTP for Approval (DD/MM/YYYY)</label>
                    <input type="text" placeholder="20/01/2025" name="dtpSendingDate" id="dtpSendingDate" value={formData.dtpSendingDate} onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-4">
                    <label htmlFor="dtpApprovingAuthority" className="block text-sm font-medium text-gray-700">DTP Approving Authority</label>
                    <select
                        name="dtpApprovingAuthority"
                        id="dtpApprovingAuthority"
                        value={formData.dtpApprovingAuthority}
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
                    {/* Empty space for alignment if needed, or adjust spacing */}
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="dtpApprovalNo" className="block text-sm font-medium text-gray-700">DTP Approval No.</label>
                    <input type="text" name="dtpApprovalNo" id="dtpApprovalNo" value={formData.dtpApprovalNo} onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-3">
                    <label htmlFor="dtpApprovalDate" className="block text-sm font-medium text-gray-700">DTP Approval Date (DD/MM/YYYY)</label>
                    <input type="text" placeholder="20/01/2025" name="dtpApprovalDate" id="dtpApprovalDate" value={formData.dtpApprovalDate} onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

            </div>

            <div className="pt-5">
                <div className="flex justify-end">
                    <Link href="/dtp" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
                    <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                        <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save DTP'}
                    </button>
                </div>
            </div>
        </form>
    );
}
