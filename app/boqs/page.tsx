'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Plus, Search, Trash2, ExternalLink, ChevronDown, ChevronRight,
    ClipboardList, IndianRupee, Layers, Calendar, X, Eye
} from 'lucide-react';
import SortableHeader from '@/components/SortableHeader';

function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: string; sub?: string; color: string;
}) {
    const colorMap: Record<string, string> = {
        blue: 'from-blue-500 to-blue-600 shadow-blue-200',
        emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
        violet: 'from-violet-500 to-violet-600 shadow-violet-200',
        amber: 'from-amber-500 to-amber-600 shadow-amber-200',
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 group">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-2xl font-black text-slate-800 truncate">{value}</p>
                    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
        </div>
    );
}

function SkeletonRow() {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded-lg w-1/3" />
                    <div className="h-3 bg-slate-50 rounded-lg w-2/3" />
                </div>
                <div className="h-6 bg-slate-100 rounded-lg w-24" />
            </div>
        </div>
    );
}

function BOQExpandableRow({ boq, onDelete, index }: { boq: any; onDelete: (id: string) => void; index: number }) {
    const [expanded, setExpanded] = useState(false);

    const tenderId = boq.tenderId?.tenderId || 'N/A';
    const packageName = boq.tenderId?.packageName || 'N/A';
    const itemCount = boq.items?.length || 0;
    const totalAmount = boq.totalAmount || 0;
    const updatedAt = new Date(boq.updatedAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    return (
        <div
            className={`bg-white border transition-all duration-300 overflow-hidden ${
                expanded
                    ? 'border-[#107c41] shadow-lg shadow-green-100/50 ring-1 ring-green-100 border-l-4 border-l-[#107c41]'
                    : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Summary Row */}
            <div
                className="flex items-center gap-4 p-4 sm:p-5 cursor-pointer select-none group"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Expand/Collapse icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                    expanded ? 'bg-green-100 text-[#107c41] rotate-0' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                }`}>
                    {expanded
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                    }
                </div>

                {/* Tender info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">{tenderId}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-[#107c41] border border-green-100">
                            {itemCount} items
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-lg">{packageName}</p>
                </div>

                {/* Amount */}
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-[#107c41] font-mono">
                        ₹{totalAmount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{updatedAt}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Link
                        href={`/boqs/${boq._id}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-green-700 hover:bg-green-50 transition-colors"
                        title="View Details"
                    >
                        <Eye className="w-4 h-4" />
                    </Link>
                    <button
                        onClick={() => onDelete(boq._id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete BOQ"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Expanded Items Table */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="border-t border-slate-100 mx-4 sm:mx-5" />
                <div className="p-4 sm:p-5 pt-3 sm:pt-4">
                    {/* Mobile amount (visible on small screens) */}
                    <div className="sm:hidden mb-3 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Total Amount</span>
                        <span className="text-sm font-black text-[#107c41] font-mono">₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="overflow-x-auto border border-gray-300 font-sans shadow-xs rounded-lg">
                        <table className="min-w-full border-collapse border border-gray-300 text-xs">
                            <thead>
                                <tr className="bg-[#107c41] text-white font-bold">
                                    <th className="border border-gray-300 px-3 py-2 text-center w-12 bg-[#107c41]">Item No.</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left bg-[#107c41]">Description of Item</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right w-24 bg-[#107c41]">Quantity</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left w-16 bg-[#107c41]">Unit</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right w-24 bg-[#107c41]">Rate</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right w-32 bg-[#107c41]">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {boq.items?.map((item: any, idx: number) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white hover:bg-green-50/30' : 'bg-slate-50/50 hover:bg-green-50/30'}>
                                        <td className="border border-gray-300 px-3 py-1.5 text-center font-mono text-gray-700">{item.itemNo}</td>
                                        <td className="border border-gray-300 px-3 py-1.5 text-gray-600 leading-normal whitespace-pre-wrap">{item.description}</td>
                                        <td className="border border-gray-300 px-3 py-1.5 text-right font-mono text-gray-800">{item.quantity?.toLocaleString('en-IN')}</td>
                                        <td className="border border-gray-300 px-3 py-1.5 text-gray-600">{item.unit}</td>
                                        <td className="border border-gray-300 px-3 py-1.5 text-right font-mono text-gray-800">₹{item.rate?.toLocaleString('en-IN')}</td>
                                        <td className="border border-gray-300 px-3 py-1.5 text-right text-green-700 font-semibold font-mono">₹{item.amount?.toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-green-50/30 font-bold">
                                <tr>
                                    <td colSpan={5} className="border border-gray-300 px-3 py-2 text-right text-gray-700 font-bold uppercase">
                                        Grand Total (Excl. GST)
                                    </td>
                                    <td className="border border-gray-300 px-3 py-2 text-right text-sm text-[#107c41] font-bold font-mono">
                                        ₹{totalAmount.toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BOQListPageContent() {
    const [boqs, setBoqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const searchParams = useSearchParams();
    const sortField = searchParams.get('sort');
    const sortOrder = searchParams.get('order');

    useEffect(() => {
        fetchBoqs();
    }, []);

    const fetchBoqs = async () => {
        try {
            const res = await fetch('/api/boqs');
            const data = await res.json();
            if (data.success) {
                setBoqs(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch BOQs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this BOQ?')) return;
        try {
            const res = await fetch(`/api/boqs/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setBoqs(boqs.filter(b => b._id !== id));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const filteredBoqs = useMemo(() => boqs.filter(b => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const tenderIdStr = (b.tenderId?.tenderId || '').toLowerCase();
        const packageNameStr = (b.tenderId?.packageName || '').toLowerCase();
        // Also search within items
        const itemsMatch = b.items?.some((item: any) =>
            (item.description || '').toLowerCase().includes(term) ||
            (item.itemNo || '').toLowerCase().includes(term)
        );
        return tenderIdStr.includes(term) || packageNameStr.includes(term) || itemsMatch;
    }), [boqs, searchTerm]);

    const sortedBoqs = useMemo(() => {
        const sorted = [...filteredBoqs];
        if (!sortField) return sorted;

        sorted.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';
            if (sortField === 'tender') {
                valA = a.tenderId?.tenderId || '';
                valB = b.tenderId?.tenderId || '';
            } else if (sortField === 'itemscount') {
                valA = a.items?.length || 0;
                valB = b.items?.length || 0;
            } else if (sortField === 'totalAmount') {
                valA = a.totalAmount || 0;
                valB = b.totalAmount || 0;
            } else if (sortField === 'lastupdated') {
                valA = new Date(a.updatedAt || 0).getTime();
                valB = new Date(b.updatedAt || 0).getTime();
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortOrder === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredBoqs, sortField, sortOrder]);

    // Stats
    const totalBoqs = boqs.length;
    const totalItems = boqs.reduce((sum, b) => sum + (b.items?.length || 0), 0);
    const totalAmount = boqs.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const latestUpdate = boqs.length > 0
        ? new Date(Math.max(...boqs.map(b => new Date(b.updatedAt).getTime()))).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bill of Quantities</h1>
                    <p className="text-sm text-slate-400 mt-1">Manage detailed schedules of items, rates and specifications.</p>
                </div>
                <Link
                    href="/boqs/new"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Plus className="w-4 h-4 mr-2" /> New BOQ
                </Link>
            </div>



            {/* Search */}
            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                    id="boq-search"
                    type="text"
                    placeholder="Search by tender ID, package name, or item description..."
                    className="block w-full pl-11 pr-10 py-3 text-sm border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Results count */}
            {!loading && (
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {sortedBoqs.length} {sortedBoqs.length === 1 ? 'record' : 'records'}
                        {searchTerm && ` matching "${searchTerm}"`}
                    </p>
                </div>
            )}

            {/* BOQ List */}
            <div className="flex flex-col gap-3">
                {loading ? (
                    <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </>
                ) : sortedBoqs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                        <div className="inline-flex flex-col items-center">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                <Search className="w-7 h-7 text-slate-300" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 mb-1">No BOQ records found</h3>
                            <p className="text-xs text-slate-400 max-w-sm">
                                {searchTerm
                                    ? `No results matching "${searchTerm}". Try a different search term.`
                                    : 'Get started by creating your first Bill of Quantities.'
                                }
                            </p>
                            {!searchTerm && (
                                <Link
                                    href="/boqs/new"
                                    className="mt-4 inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create BOQ
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    sortedBoqs.map((boq, index) => (
                        <BOQExpandableRow
                            key={boq._id}
                            boq={boq}
                            onDelete={handleDelete}
                            index={index}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default function BOQListPage() {
    return (
        <Suspense fallback={
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bill of Quantities</h1>
                    <p className="text-sm text-slate-400 mt-1">Manage detailed schedules of items, rates and specifications.</p>
                </div>

                <div className="flex flex-col gap-3">
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </div>
            </div>
        }>
            <BOQListPageContent />
        </Suspense>
    );
}
