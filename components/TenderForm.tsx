'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Plus, X, Loader2 } from 'lucide-react';
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
    const [isReTenderModalOpen, setIsReTenderModalOpen] = useState(false);
    const [reTenderReason, setReTenderReason] = useState('');
    const [packages, setPackages] = useState<any[]>([]);
    const [existingTenderPkgIds, setExistingTenderPkgIds] = useState<string[]>([]);
    const [dtps, setDtps] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [tenderAmount, setTenderAmount] = useState<number | ''>('');

    const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
    const [newContractor, setNewContractor] = useState({
        name: '',
        proprietorName: '',
        address: '',
        mobileNo: '',
        agencyType: '',
    });
    const [contractorError, setContractorError] = useState('');
    const [contractorSaving, setContractorSaving] = useState(false);

    const [formData, setFormData] = useState({
        ...initialData,
        packageId: initialData.packageId || searchParams.get('packageId') || '',
        packageName: initialData.packageName || '',
        tenderId: initialData.tenderId || '',
        tenderNoticeYear: initialData.tenderNoticeYear || (isEditing ? '' : '2026-27'),
        noticeNo: initialData.noticeNo || '',
        srNo: initialData.srNo || '',
        trialNo: initialData.trialNo || 1,
        tenderCreationDate: initialData.tenderCreationDate || '',
        lastDateOfSubmission: initialData.lastDateOfSubmission || '',
        tenderOpeningDate: initialData.tenderOpeningDate || '',
        tenderValidityDate: initialData.tenderValidityDate || '',
        reInvite: initialData.reInvite || searchParams.get('reInvite') === 'true' || false,
        cancelled: initialData.cancelled || false,
        cancellationReason: initialData.cancellationReason || '',
        contractorName: initialData.contractorName || '',
        contractPrice: initialData.contractPrice || '',
        aboveBelowPercentage: initialData.aboveBelowPercentage || '',
        aboveBelowInWord: initialData.aboveBelowInWord === 'Equals' ? 'At Par' : (initialData.aboveBelowInWord || 'Below'),
        remarks: initialData.remarks || '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pkgRes, dtpRes, agencyRes, tenderRes] = await Promise.all([
                    fetch('/api/packages?limit=1000'),
                    fetch('/api/dtps'),
                    fetch('/api/agencies'),
                    fetch('/api/tenders?limit=1000')
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


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

    const handleCreateContractor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContractor.name.trim()) {
            setContractorError('Contractor/Agency Name is required.');
            return;
        }
        setContractorSaving(true);
        setContractorError('');
        try {
            const res = await fetch('/api/agencies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newContractor),
            });
            const data = await res.json();
            if (data.success) {
                const createdAgency = data.data;
                setAgencies((prev) => [...prev, createdAgency].sort((a, b) => a.name.localeCompare(b.name)));
                setFormData((prev: any) => ({
                    ...prev,
                    contractorName: createdAgency.name,
                }));
                setNewContractor({
                    name: '',
                    proprietorName: '',
                    address: '',
                    mobileNo: '',
                    agencyType: '',
                });
                setIsContractorModalOpen(false);
            } else {
                setContractorError(data.error || 'Failed to create contractor.');
            }
        } catch (err: any) {
            console.error(err);
            setContractorError('An unexpected error occurred while saving the contractor.');
        } finally {
            setContractorSaving(false);
        }
    };

    // Sync searchParams into form state on mount/client-hydration
    useEffect(() => {
        const pkgId = searchParams.get('packageId');
        const reInvite = searchParams.get('reInvite') === 'true';
        if (pkgId) {
            setFormData((prev: any) => {
                if (!prev.packageId) {
                    return {
                        ...prev,
                        packageId: pkgId,
                        reInvite: prev.reInvite || reInvite
                    };
                }
                return prev;
            });
        }
    }, [searchParams]);

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

    const handleExecuteReTender = async (reason: string) => {
        if (!initialData?._id) return;
        setLoading(true);
        try {
            // 1. Cancel the current tender
            const cancelRes = await fetch(`/api/tenders/${initialData._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    cancelled: true, 
                    cancellationReason: reason 
                }),
            });
            if (!cancelRes.ok) throw new Error("Failed to cancel current tender.");

            // 2. Create the new tender trial
            const newTenderData = {
                packageId: formData.packageId,
                packageName: formData.packageName,
                tenderNoticeYear: formData.tenderNoticeYear || '2026-27',
                trialNo: (Number(formData.trialNo) || 1) + 1,
                reInvite: true,
                cancelled: false,
                cancellationReason: '',
                contractorName: '',
                contractPrice: '',
                aboveBelowPercentage: '',
                aboveBelowInWord: 'Below',
                remarks: `Re-tender (Trial #${(Number(formData.trialNo) || 1) + 1}) after cancellation: ${reason}`
            };

            const createRes = await fetch('/api/tenders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTenderData),
            });
            if (!createRes.ok) throw new Error("Failed to create new tender trial.");
            const createData = await createRes.json();

            alert('Re-tender trial created successfully!');
            setIsReTenderModalOpen(false);
            router.push(`/tenders/${createData.data._id}/edit`);
            router.refresh();
        } catch (err: any) {
            alert(err.message || 'Error occurred during re-tender.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.packageId) {
            alert('Please select a Package');
            return;
        }
        setLoading(true);

        try {
            const submissionData = { ...formData };
            if (tenderAmount !== '') {
                submissionData.estimatedAmount = Number(tenderAmount);
            }

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

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.error || 'Failed to save tender');
            }

            router.push('/tenders');
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Error saving tender');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300">
                <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 border border-slate-100">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm font-semibold text-slate-700">Processing & Saving Tender...</p>
                </div>
            </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                <div className="sm:col-span-6">
                    <SearchableSelect 
                        label="Select Package"
                        required
                        options={packages.filter(p => {
                            const currentPkgId = typeof formData.packageId === 'object' && formData.packageId !== null
                                ? formData.packageId._id
                                : formData.packageId;
                            if (p._id === currentPkgId) return true;
                            if (isEditing && (p._id === initialData.packageId?._id || p._id === initialData.packageId)) return true;
                            return !existingTenderPkgIds.includes(p._id);
                        })}
                        value={formData.packageId}
                        onChange={handlePackageSelect}
                        placeholder="Search by package name..."
                    />
                </div>


                <div className="sm:col-span-3">
                    <label htmlFor="tenderId" className="block text-sm font-medium text-gray-700">Tender ID</label>
                    <input type="text" name="tenderId" id="tenderId" value={formData.tenderId} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="tenderNoticeYear" className="block text-sm font-medium text-gray-700">Tender Notice Year</label>
                    <select
                        name="tenderNoticeYear"
                        id="tenderNoticeYear"
                        value={formData.tenderNoticeYear || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-white focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">-- Select Year --</option>
                        <option value="2023-24">2023-24</option>
                        <option value="2024-25">2024-25</option>
                        <option value="2025-26">2025-26</option>
                        <option value="2026-27">2026-27</option>
                        <option value="2027-28">2027-28</option>
                        <option value="2028-29">2028-29</option>
                        <option value="2029-30">2029-30</option>
                    </select>
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

                <div className="sm:col-span-3 flex items-center pt-6">
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="cancelled"
                            id="cancelled"
                            checked={formData.cancelled}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Tender Cancelled</span>
                    </label>
                </div>

                {formData.cancelled && (
                    <div className="sm:col-span-3">
                        <label htmlFor="cancellationReason" className="block text-sm font-medium text-gray-700">Reason for Cancellation</label>
                        <select
                            id="cancellationReason"
                            name="cancellationReason"
                            value={formData.cancellationReason}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-white focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- Select Reason --</option>
                            <option value="High Rate">High Rate</option>
                            <option value="Single Bidder">Single Bidder</option>
                            <option value="Technical Ground">Technical Ground</option>
                            <option value="Administrative Ground">Administrative Ground</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                )}




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
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Contractor Name</label>
                        <button
                            type="button"
                            onClick={() => setIsContractorModalOpen(true)}
                            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add New Contractor
                        </button>
                    </div>
                    <SearchableSelect
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
                <div className="flex justify-end gap-2">
                    {isEditing && (
                        <button type="button" onClick={() => { setIsReTenderModalOpen(true); setReTenderReason(''); }} className="mr-auto bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 cursor-pointer animate-none">
                            Re-Tender (Next Trial)
                        </button>
                    )}
                    <Link href="/tenders" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</Link>
                    <button type="submit" disabled={loading} className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {loading ? 'Saving...' : 'Save Tender'}
                    </button>
                </div>
            </div>
        </form>

        {/* Contractor Modal */}
        {isContractorModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-300">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
                        <h3 className="text-lg font-bold text-gray-900">Add New Contractor</h3>
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsContractorModalOpen(false);
                                setContractorError('');
                            }} 
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleCreateContractor} className="flex-1 overflow-y-auto p-6 space-y-4">
                        
                        {contractorError && (
                            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                                {contractorError}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Contractor / Agency Name *</label>
                            <input 
                                type="text" 
                                required 
                                value={newContractor.name}
                                onChange={(e) => setNewContractor(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. ABC Construction"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Proprietor Name</label>
                            <input 
                                type="text" 
                                value={newContractor.proprietorName}
                                onChange={(e) => setNewContractor(prev => ({ ...prev, proprietorName: e.target.value }))}
                                placeholder="e.g. John Doe"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                            <textarea 
                                rows={2}
                                value={newContractor.address}
                                onChange={(e) => setNewContractor(prev => ({ ...prev, address: e.target.value }))}
                                placeholder="Enter full address..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile No.</label>
                                <input 
                                    type="tel" 
                                    value={newContractor.mobileNo}
                                    onChange={(e) => setNewContractor(prev => ({ ...prev, mobileNo: e.target.value }))}
                                    placeholder="e.g. 9876543210"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Agency Type</label>
                                <select
                                    value={newContractor.agencyType}
                                    onChange={(e) => setNewContractor(prev => ({ ...prev, agencyType: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                                >
                                    <option value="">-- Select --</option>
                                    <option value="Proprietorship">Proprietorship</option>
                                    <option value="Partnership">Partnership</option>
                                    <option value="Private Limited">Private Limited</option>
                                    <option value="Public Limited">Public Limited</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Footer / Buttons inside form */}
                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                            <button 
                                type="button" 
                                onClick={() => {
                                    setIsContractorModalOpen(false);
                                    setContractorError('');
                                }} 
                                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={contractorSaving} 
                                className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 inline-flex items-center"
                            >
                                {contractorSaving ? 'Saving...' : 'Save Contractor'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* RE-TENDER CANCELLATION MODAL */}
        {isReTenderModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
                        <h3 className="text-lg font-bold text-gray-900">Confirm Re-Tender</h3>
                        <button 
                            type="button" 
                            onClick={() => setIsReTenderModalOpen(false)} 
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-500">
                            This will cancel the current Tender trial (Trial #{formData.trialNo}) and create a new Tender trial (Trial #{(Number(formData.trialNo) || 1) + 1}).
                        </p>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Cancelling Current Tender *</label>
                            <select 
                                value={reTenderReason} 
                                onChange={(e) => setReTenderReason(e.target.value)} 
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-white focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- Select Reason --</option>
                                <option value="High Rate">High Rate</option>
                                <option value="Single Bidder">Single Bidder</option>
                                <option value="Technical Ground">Technical Ground</option>
                                <option value="Administrative Ground">Administrative Ground</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setIsReTenderModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                            <button 
                                type="button" 
                                disabled={!reTenderReason || loading} 
                                onClick={() => handleExecuteReTender(reTenderReason)} 
                                className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
                            >
                                Confirm & Create Re-Tender
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
