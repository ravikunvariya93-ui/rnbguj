'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
    TrendingUp, Plus, Search, FileText, Download, Eye, 
    Edit2, Trash2, X, Upload, Loader2, Calendar, Package as PackageIcon,
    AlertCircle, CheckCircle2, FileCheck, Check
} from 'lucide-react';

interface Proposal {
    _id: string;
    packageId: any;
    workOrderId?: any;
    proposalNo: string;
    proposalDate?: string;
    pdfUrl?: string;
    fileName?: string;
    fileSize?: number;
    remarks?: string;
    status?: string;
    excessAmount?: number;
    savingAmount?: number;
    approvalNo?: string;
    approvalDate?: string;
    approvalAuthority?: string;
    createdAt: string;
}

interface Props {
    initialProposals: Proposal[];
    packages: any[];
}

export default function ExcessProposalsClient({ initialProposals, packages }: Props) {
    const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        packageId: '',
        proposalNo: '',
        proposalDate: new Date().toISOString().split('T')[0],
        pdfUrl: '',
        fileName: '',
        fileSize: 0,
        remarks: '',
        status: 'Submitted',
    });

    const filteredProposals = useMemo(() => {
        return proposals.filter((p) => {
            const matchesSearch = 
                !search ||
                p.proposalNo?.toLowerCase().includes(search.toLowerCase()) ||
                p.packageId?.packageName?.toLowerCase().includes(search.toLowerCase()) ||
                p.packageId?.subDivision?.toLowerCase().includes(search.toLowerCase()) ||
                p.remarks?.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = 
                statusFilter === 'ALL' || 
                (p.status || 'Submitted') === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [proposals, search, statusFilter]);

    const handleOpenAddModal = () => {
        setEditingProposal(null);
        setForm({
            packageId: packages[0]?._id || '',
            proposalNo: '',
            proposalDate: new Date().toISOString().split('T')[0],
            pdfUrl: '',
            fileName: '',
            fileSize: 0,
            remarks: '',
            status: 'Submitted',
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (p: Proposal) => {
        setEditingProposal(p);
        setForm({
            packageId: p.packageId?._id || p.packageId || '',
            proposalNo: p.proposalNo || '',
            proposalDate: p.proposalDate ? new Date(p.proposalDate).toISOString().split('T')[0] : '',
            pdfUrl: p.pdfUrl || '',
            fileName: p.fileName || '',
            fileSize: p.fileSize || 0,
            remarks: p.remarks || '',
            status: p.status || 'Submitted',
        });
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'excess-proposals');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to upload PDF');
            }

            setForm((prev) => ({
                ...prev,
                pdfUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
            }));
        } catch (err: any) {
            alert(err.message || 'Error uploading file');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.packageId) {
            alert('Please select a Package.');
            return;
        }

        setSaving(true);
        try {
            const url = editingProposal 
                ? `/api/excess-proposals/${editingProposal._id}` 
                : '/api/excess-proposals';
            const method = editingProposal ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save proposal');
            }

            if (editingProposal) {
                setProposals((prev) => prev.map((p) => (p._id === editingProposal._id ? data.data : p)));
            } else {
                setProposals((prev) => [data.data, ...prev]);
            }

            setIsModalOpen(false);
        } catch (err: any) {
            alert(err.message || 'Error saving proposal');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, proposalNo: string) => {
        if (!confirm(`Are you sure you want to delete Excess Proposal "${proposalNo}"?`)) return;

        setDeletingId(id);
        try {
            const res = await fetch(`/api/excess-proposals/${id}`, {
                method: 'DELETE',
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete proposal');
            }

            setProposals((prev) => prev.filter((p) => p._id !== id));
        } catch (err: any) {
            alert(err.message || 'Error deleting proposal');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Top Banner / Header */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                            <TrendingUp className="w-5 h-5" />
                        </span>
                        <h1 className="text-xl font-bold text-slate-800">Excess Proposals</h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Send and manage proposals to get approval for excess items across all packages.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Add Excess Proposal
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by Proposal No., Package..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9.5 pr-4 py-2 text-xs bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-500">Status:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-white border border-emerald-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="ALL">All Status</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Approved">Approved</option>
                        <option value="Draft">Draft</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Proposals Table */}
            <div className="bg-white border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-emerald-200 text-xs">
                        <thead className="bg-emerald-100/90 text-emerald-950">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Sr.</th>
                                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Proposal No.</th>
                                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Proposal Date</th>
                                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Package Name</th>
                                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Sub Division</th>
                                <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Proposal PDF</th>
                                <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredProposals.length > 0 ? (
                                filteredProposals.map((p, idx) => {
                                    const pkgId = p.packageId?._id || p.packageId;
                                    const pkgName = p.packageId?.packageName || 'Unknown Package';
                                    const subDiv = p.packageId?.subDivision || '-';

                                    return (
                                        <tr key={p._id} className="hover:bg-emerald-50/40 transition-colors">
                                            <td className="px-4 py-3 text-slate-500 font-mono font-bold text-center w-12">
                                                {idx + 1}
                                            </td>
                                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                                {p.proposalNo || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {p.proposalDate ? new Date(p.proposalDate).toLocaleDateString('en-GB') : '-'}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-800 max-w-xs">
                                                {pkgId ? (
                                                    <Link 
                                                        href={`/packages/${pkgId}`} 
                                                        className="text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1.5"
                                                    >
                                                        <PackageIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                                        <span className="line-clamp-2">{pkgName}</span>
                                                    </Link>
                                                ) : (
                                                    <span>{pkgName}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {subDiv}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                                    p.status === 'Approved'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : p.status === 'Rejected'
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {p.status || 'Submitted'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {p.pdfUrl ? (
                                                    <a
                                                        href={p.pdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                                        title="View attached PDF"
                                                    >
                                                        <FileText className="w-3.5 h-3.5 text-rose-600" />
                                                        <span>View PDF</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">No PDF</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenEditModal(p)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer transition-colors"
                                                        title="Edit Proposal"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p._id, p.proposalNo)}
                                                        disabled={deletingId === p._id}
                                                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors disabled:opacity-50"
                                                        title="Delete Proposal"
                                                    >
                                                        {deletingId === p._id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-10">
                                        <AlertCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                        <p className="text-slate-500 font-semibold text-xs">
                                            {search ? 'No matching excess proposals found.' : 'No excess proposals logged yet.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-emerald-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                                    <TrendingUp className="w-4 h-4" />
                                </span>
                                <h3 className="text-sm font-bold text-slate-800">
                                    {editingProposal ? 'Edit Excess Proposal' : 'Add Excess Proposal'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
                            {/* Package Selection */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Select Package <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={form.packageId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, packageId: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">-- Choose Package --</option>
                                    {packages.map((pkg: any) => (
                                        <option key={pkg._id} value={pkg._id}>
                                            {pkg.packageName} ({pkg.subDivision || 'Sub-Div'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Proposal No. & Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Proposal No.
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. EP/2026/01 (optional)"
                                        value={form.proposalNo}
                                        onChange={(e) => setForm((prev) => ({ ...prev, proposalNo: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Proposal Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.proposalDate}
                                        onChange={(e) => setForm((prev) => ({ ...prev, proposalDate: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Proposal Status */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Status</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="Submitted">Submitted</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>

                            {/* PDF Attachment Upload */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Proposal PDF</label>
                                <div className="border border-dashed border-emerald-300 rounded-xl p-4 bg-emerald-50/40 text-center">
                                    {form.pdfUrl ? (
                                        <div className="flex items-center justify-between bg-white border border-emerald-200 p-2.5 rounded-lg">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText className="w-5 h-5 text-rose-600 flex-shrink-0" />
                                                <span className="font-semibold text-slate-800 truncate">{form.fileName || 'Attached Proposal PDF'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={form.pdfUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                                                    title="Preview PDF"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => setForm((prev) => ({ ...prev, pdfUrl: '', fileName: '', fileSize: 0 }))}
                                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                                    title="Remove PDF"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center justify-center py-2">
                                            {uploading ? (
                                                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mb-1" />
                                            ) : (
                                                <Upload className="w-6 h-6 text-emerald-600 mb-1" />
                                            )}
                                            <span className="font-bold text-emerald-800">
                                                {uploading ? 'Uploading PDF...' : 'Click to Upload Proposal PDF'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 mt-0.5">Accepts .pdf files</span>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Remarks / Notes</label>
                                <textarea
                                    rows={2}
                                    placeholder="Optional notes or details about the excess items..."
                                    value={form.remarks}
                                    onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || uploading}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    {editingProposal ? 'Update Proposal' : 'Save Proposal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
