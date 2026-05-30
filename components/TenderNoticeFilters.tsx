'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X, Calendar, FileText, RotateCcw, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';

interface Props {
    availableYears: string[];
}

export default function TenderNoticeFilters({ availableYears }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Local state for search to keep typing snappy
    const [searchTerm, setSearchTerm] = useState(searchParams.get('tenderSearch') || '');

    const noticeYear = searchParams.get('noticeYear') || '';
    const pendingWO = searchParams.get('pendingWO') === 'true';

    // Update query parameters in URL
    const updateQuery = useCallback(
        (updates: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
            Object.entries(updates).forEach(([name, value]) => {
                if (value) {
                    params.set(name, value);
                } else {
                    params.delete(name);
                }
            });
            // Reset page back to 1 when changing filters
            params.delete('page');
            router.push(`${pathname}?${params.toString()}`);
        },
        [searchParams, pathname, router]
    );

    // Debounce search typing
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            const currentSearch = searchParams.get('tenderSearch') || '';
            if (searchTerm !== currentSearch) {
                updateQuery({ tenderSearch: searchTerm || null });
            }
        }, 400);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm, searchParams, updateQuery]);

    // Handle inputs changes
    const handleYearChange = (year: string) => {
        updateQuery({ noticeYear: year || null });
    };

    const handlePendingWOToggle = () => {
        updateQuery({ pendingWO: !pendingWO ? 'true' : null });
    };

    const clearFilters = () => {
        setSearchTerm('');
        const params = new URLSearchParams();
        params.set('tab', 'tenders'); // Keep the active tab
        router.push(`${pathname}?${params.toString()}`);
    };

    const hasFilters = !!searchTerm || !!noticeYear || pendingWO;

    return (
        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 gap-6 flex flex-col transition-all duration-300">
            {/* Top Bar: Title & Reset */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-1.5 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                        Tender Report Filters
                    </h2>
                </div>
                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 px-3 py-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all text-xs font-bold"
                        title="Clear all filters"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Filters
                    </button>
                )}
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                {/* Search Field */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        <Search className="w-3 h-3 text-slate-400" />
                        Search Tender / Contractor
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            className="block w-full text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-white focus:bg-white hover:border-slate-300 focus:border-blue-500 rounded-xl pl-4 pr-10 py-3 outline-none transition-all shadow-sm focus:ring-2 focus:ring-blue-500/5 placeholder-slate-400"
                            placeholder="Search by package, contractor, notice no..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Year Select Field */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        <Calendar className={`w-3 h-3 ${noticeYear ? 'text-blue-500' : 'text-slate-300'}`} />
                        Tender Notice Year
                    </label>
                    <select
                        value={noticeYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className={`block w-full text-xs font-bold rounded-xl px-4 py-3 cursor-pointer outline-none transition-all border ${
                            noticeYear
                                ? 'bg-blue-50/50 border-blue-200 text-blue-700 ring-2 ring-blue-500/5'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'
                        }`}
                    >
                        <option value="">All Notice Years</option>
                        {availableYears.map((year) => (
                            <option key={year} value={year} className="font-semibold text-slate-900 bg-white">
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Toggle/Checkbox for Without Work Order Date */}
                <div className="flex items-center justify-between md:justify-end pb-1 h-full md:h-auto">
                    <button
                        onClick={handlePendingWOToggle}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all select-none w-full md:w-auto justify-between md:justify-start ${
                            pendingWO
                                ? 'bg-amber-50/60 border-amber-200 text-amber-800 shadow-sm ring-2 ring-amber-500/5'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <ShieldAlert className={`w-4 h-4 ${pendingWO ? 'text-amber-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-black uppercase tracking-wider">
                                Without Work Order Date
                            </span>
                        </div>
                        {pendingWO ? (
                            <ToggleRight className="w-6 h-6 text-amber-600" />
                        ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-400" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
