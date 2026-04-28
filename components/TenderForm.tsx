'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save } from 'lucide-react';
import Link from 'next/link';

interface TenderFormProps {
    initialData?: any;
    isEditing?: boolean;
}

import SearchableSelect from './SearchableSelect';

export default function TenderForm({ initialData = {}, isEditing = false }: TenderFormProps) {
    return (
        <Suspense fallback={<div>Loading form...</div>}>
            <TenderFormInner initialData={initialData} isEditing={isEditing} />
        </Suspense>
    );
}

function TenderFormInner({ initialData = {}, isEditing = false }: TenderFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [packages, setPackages] = useState<any[]>([]);
    const [existingTenderPkgIds, setExistingTenderPkgIds] = useState<string[]>([]);
    const [dtps, setDtps] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [tenderAmount, setTenderAmount] = useState<number | ''>('');

    const [formData, setFormData] = useState({
        packageId: initialData.packageId || searchParams.get('packageId') || '',
        packageName: initialData.packageName || '',
        tenderId: initialData.tenderId || '',
        tenderNoticeYear: initialData.tenderNoticeYear || '',
        noticeNo: initialData.noticeNo || '',
        srNo: initialData.srNo || '',
        trialNo: initialData.trialNo || 1,
        tenderCreationDate: initialData.tenderCreationDate || '',
        lastDateOfSubmission: initialData.lastDateOfSubmission || '',
        tenderOpeningDate: initialData.tenderOpeningDate || '',
        tenderValidityDate: initialData.tenderValidityDate || '',
        reInvite: initialData.reInvite || searchParams.get('reInvite') === 'true' || false,
        contractorName: initialData.contractorName || '',
        contractPrice: initialData.contractPrice || '',
        aboveBelowPercentage: initialData.aboveBelowPercentage || '',
        aboveBelowInWord: initialData.aboveBelowInWord || 'Above',
        remarks: initialData.remarks || '',
        ...initialData
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pkgRes, dtpRes, agencyRes, tenderRes] = await Promise.all([
                    fetch('/api/packages'),
                    fetch('/api/dtps'),
                    fetch('/api/agencies'),
                    fetch('/api/tenders')
                ]);
                const pkgData = await pkgRes.json();
                const dtpData = await dtpRes.json();
                const agencyData = await agencyRes.json();
                const tenderData = await tenderRes.json();
                if (pkgData.success) {
                    setPackages(pkgData.data);
                }
                if (dtpData.success) {
                    setDtps(dtpData.data);
                }
                if (agencyData.success) {
                    setAgencies(agencyData.data);
                }
                if (tenderData.success) {
                    const ids = tenderData.data.map((t: any) => t.packageId?._id || t.packageId);
                    setExistingTenderPkgIds(ids);
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };
        fetchData();
    }, []);

    // Helper to format dates for input fields (DD/MM/YYYY)
    const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        try {
            const dateObj = new Date(dateString);
            if (isNaN(dateObj.getTime())) return '';
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return '';
        }
    };

    // Initialize dates if editing (converting string/date to YYYY-MM-DD)
    useEffect(() => {
        if (isEditing && initialData) {
            setFormData((prev: any) => ({
                ...prev,
                tenderCreationDate: formatDateForInput(initialData.tenderCreationDate),
                lastDateOfSubmission: formatDateForInput(initialData.lastDateOfSubmission),
                tenderOpeningDate: formatDateForInput(initialData.tenderOpeningDate),
                tenderValidityDate: formatDateForInput(initialData.tenderValidityDate)
            }));
        }
    }, [initialData, isEditing]);

    // Auto calculate tenderValidityDate: Last Date of Submission + 120 Days
    useEffect(() => {
        if (!formData.lastDateOfSubmission) return;
        try {
            const cleanDate = String(formData.lastDateOfSubmission).trim();
            const parts = cleanDate.split(/[\/\-\.]/);
            if (parts.length === 3) {
                let year = parts[2];
                if (year.length === 2) year = '20' + year;
                const isoDate = `${year}-${parts[1]}-${parts[0]}`;
                const dateObj = new Date(isoDate);

                if (!isNaN(dateObj.getTime())) {
                    dateObj.setDate(dateObj.getDate() + 120);

                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const yyyy = dateObj.getFullYear();

                    setFormData((prev: any) => ({ ...prev, tenderValidityDate: `${day}/${month}/${yyyy}` }));
                }
            }
        } catch (e) {
            // ignore
        }
    }, [formData.lastDateOfSubmission]);

    // Set tender amount when package or dtps load
    useEffect(() => {
        if (formData.packageId && dtps.length > 0) {
            const relatedDtp = dtps.find(d => d.tsId?._id === formData.packageId || d.tsId === formData.packageId);
            setTenderAmount(relatedDtp?.tenderAmount || '');
        } else if (!formData.packageId) {
            setTenderAmount('');
        }
    }, [formData.packageId, dtps]);

    // Calculate contract price automatically
    useEffect(() => {
        if (tenderAmount === '') return;
        const base = Number(tenderAmount);
        if (isNaN(base)) return;

        if (formData.aboveBelowInWord === 'At Par') {
            setFormData((prev: any) => ({ ...prev, contractPrice: base.toFixed(2), aboveBelowPercentage: 0 }));
            return;
        }

        const pct = Number(formData.aboveBelowPercentage);
        if (!isNaN(pct)) {
            if (formData.aboveBelowInWord === 'Above') {
                setFormData((prev: any) => ({ ...prev, contractPrice: (base + (base * pct / 100)).toFixed(2) }));
            } else if (formData.aboveBelowInWord === 'Below') {
                setFormData((prev: any) => ({ ...prev, contractPrice: (base - (base * pct / 100)).toFixed(2) }));
            }
        }
    }, [tenderAmount, formData.aboveBelowPercentage, formData.aboveBelowInWord]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev: any) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const fetchLatestTrial = async (packageId: string) => {
        if (!packageId || isEditing) return;
        try {
            const res = await fetch(`/api/tenders/latest-trial/${packageId as any}`);
            const data = await res.json();
            if (data.success) {
                setFormData((prev: any) => ({ ...prev, trialNo: data.latestTrialNo + 1 }));
            }
        } catch (error) {
            console.error("Failed to fetch latest trial", error);
        }
    };

    const handlePackageSelect = (id: string) => {
        const selectedPkg = packages.find(p => p._id === id);
        if (selectedPkg) {
            setFormData((prev: any) => ({
                ...prev,
                packageId: id,
                packageName: selectedPkg.packageName,
            }));
            fetchLatestTrial(id);
        } else if (!id) {
            setFormData((prev: any) => ({ ...prev, packageId: '', packageName: '' }));
        }
    };

    const handleAgencySelect = (id: string) => {
        const selectedAgency = agencies.find(a => a._id === id);
        if (selectedAgency) {
            setFormData((prev: any) => ({
                ...prev,
                contractorName: selectedAgency.name,
            }));
        } else {
            setFormData((prev: any) => ({
                ...prev,
                contractorName: '',
            }));
        }
    };

    // Auto-fetch trial for pre-selected package
    useEffect(() => {
        if (formData.packageId && !isEditing && packages.length > 0) {
            const pkg = packages.find(p => p._id === formData.packageId);
            if (pkg && !formData.packageName) {
                setFormData((prev: any) => ({ ...prev, packageName: pkg.packageName }));
            }
            fetchLatestTrial(formData.packageId);
        }
    }, [formData.packageId, packages, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.packageId) {
            alert('Please select a Package');
            return;
        }
        setLoading(true);

        try {
            const submissionData = { ...formData };

            // Date Parsing Logic for Tender Dates (DD/MM/YYYY -> ISO)
            const parseDate = (dateStr: string) => {
                if (!dateStr) return undefined;
                const cleanDate = String(dateStr).trim();
                const parts = cleanDate.split(/[\/\-\.]/);
                if (parts.length === 3) {
                    let year = parts[2];
                    if (year.length === 2) year = '20' + year;
                    const isoDate = `${year}-${parts[1]}-${parts[0]}`;
                    const dateObj = new Date(isoDate);
                    return !isNaN(dateObj.getTime()) ? dateObj.toISOString() : undefined;
                }
                return undefined;
            };

            if (submissionData.tenderCreationDate) submissionData.tenderCreationDate = parseDate(submissionData.tenderCreationDate) as any;
            if (submissionData.lastDateOfSubmission) submissionData.lastDateOfSubmission = parseDate(submissionData.lastDateOfSubmission) as any;
            if (submissionData.tenderOpeningDate) submissionData.tenderOpeningDate = parseDate(submissionData.tenderOpeningDate) as any;
            if (submissionData.tenderValidityDate) submissionData.tenderValidityDate = parseDate(submissionData.tenderValidityDate) as any;

            const url = isEditing ? `/api/tenders/${initialData._id}` : '/api/tenders';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) throw new Error('Failed to save tender');

            router.push('/tenders');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving tender');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                <div className="sm:col-span-6">
                    <SearchableSelect 
                        label="Select Package"
                        required
                        options={packages.filter(p => {
                            if (isEditing && (p._id === initialData.packageId?._id || p._id === initialData.packageId)) return true;
                            return !existingTenderPkgIds.includes(p._id);
                        })}
                        value={formData.packageId}
                        onChange={handlePackageSelect}
                        placeholder="Search by package name..."
                    />
                </div>


                <div className="sm:col-span-3">
                    <label htmlFor="tenderId" className="block text-sm font-medium text-gray-700">Tender ID *</label>
                    <input type="text" name="tenderId" id="tenderId" required value={formData.tenderId} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="tenderNoticeYear" className="block text-sm font-medium text-gray-700">Tender Notice Year</label>
                    <input type="text" placeholder="e.g. 2024-25" name="tenderNoticeYear" id="tenderNoticeYear" value={formData.tenderNoticeYear || ''} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="noticeNo" className="block text-sm font-medium text-gray-700">Notice No.</label>
                    <input type="text" name="noticeNo" id="noticeNo" value={formData.noticeNo || ''} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="srNo" className="block text-sm font-medium text-gray-700">Sr No.</label>
                    <input type="text" name="srNo" id="srNo" value={formData.srNo || ''} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="trialNo" className="block text-sm font-medium text-gray-700">Trial No.</label>
                    <input type="number" name="trialNo" id="trialNo" value={formData.trialNo} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="tenderCreationDate" className="block text-sm font-medium text-gray-700">Creation Date (DD/MM/YYYY)</label>
                    <input type="text" placeholder="20/01/2025" name="tenderCreationDate" id="tenderCreationDate" value={formData.tenderCreationDate} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="lastDateOfSubmission" className="block text-sm font-medium text-gray-700">Last Submission Date (DD/MM/YYYY)</label>
                    <input type="text" placeholder="20/01/2025" name="lastDateOfSubmission" id="lastDateOfSubmission" value={formData.lastDateOfSubmission} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="tenderOpeningDate" className="block text-sm font-medium text-gray-700">Opening Date (DD/MM/YYYY)</label>
                    <input type="text" placeholder="20/01/2025" name="tenderOpeningDate" id="tenderOpeningDate" value={formData.tenderOpeningDate} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="tenderValidityDate" className="block text-sm font-medium text-gray-700">Tender Validity Date</label>
                    <input type="text" name="tenderValidityDate" id="tenderValidityDate" value={formData.tenderValidityDate || ''} readOnly className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50" />
                </div>




                <div className="sm:col-span-6 border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Details</h3>
                </div>

                <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">Tender Amount</label>
                    <input type="text" readOnly value={tenderAmount} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50" />
                </div>
                <div className="sm:col-span-3 flex items-end">
                    <div className="text-xs text-gray-500 pb-2">
                        Fetched automatically from linked DTP module
                    </div>
                </div>

                <div className="sm:col-span-full">
                    <SearchableSelect
                        label="Contractor Name"
                        placeholder="Search for agency/contractor..."
                        options={agencies}
                        value={agencies.find(a => a.name === formData.contractorName)?._id || ''}
                        onChange={handleAgencySelect}
                        displayField="name"
                        helperField="address"
                    />
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="contractPrice" className="block text-sm font-medium text-gray-700">Contract Price</label>
                    <input type="number" name="contractPrice" id="contractPrice" value={formData.contractPrice} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="aboveBelowPercentage" className="block text-sm font-medium text-gray-700">Above/Below (%)</label>
                    <input type="number" step="0.01" name="aboveBelowPercentage" id="aboveBelowPercentage" value={formData.aboveBelowPercentage} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="aboveBelowInWord" className="block text-sm font-medium text-gray-700">Above/Below (Word)</label>
                    <select
                        id="aboveBelowInWord"
                        name="aboveBelowInWord"
                        value={formData.aboveBelowInWord}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="Above">Above</option>
                        <option value="Below">Below</option>
                        <option value="At Par">At Par</option>
                    </select>
                </div>

                <div className="sm:col-span-6">
                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">Remarks</label>
                    <textarea name="remarks" id="remarks" rows={3} value={formData.remarks || ''} onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" placeholder="Enter any additional remarks..." />
                </div>

            </div>

            <div className="pt-5">
                <div className="flex justify-end">
                    <Link href="/tenders" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</Link>
                    <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Tender'}
                    </button>
                </div>
            </div>
        </form>
    );
}
