'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, X } from 'lucide-react';

interface PackagesFilterBarProps {
    subDivisions: string[];
    workTypes: string[];
    budgetHeads: string[];
    consultants: string[];
}

export default function PackagesFilterBar({ subDivisions, workTypes, budgetHeads, consultants }: PackagesFilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [subDivision, setSubDivision] = useState(searchParams.get('subDivision') || '');
    const [workType, setWorkType] = useState(searchParams.get('workType') || '');
    const [budgetHead, setBudgetHead] = useState(searchParams.get('budgetHead') || '');
    const [dtpConsultant, setDtpConsultant] = useState(searchParams.get('dtpConsultant') || '');
    const [hasWorks, setHasWorks] = useState(searchParams.get('hasWorks') || '');

    useEffect(() => {
        setSubDivision(searchParams.get('subDivision') || '');
        setWorkType(searchParams.get('workType') || '');
        setBudgetHead(searchParams.get('budgetHead') || '');
        setDtpConsultant(searchParams.get('dtpConsultant') || '');
        setHasWorks(searchParams.get('hasWorks') || '');
    }, [searchParams]);

    const handleApplyFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');

        if (subDivision) params.set('subDivision', subDivision);
        else params.delete('subDivision');

        if (workType) params.set('workType', workType);
        else params.delete('workType');

        if (budgetHead) params.set('budgetHead', budgetHead);
        else params.delete('budgetHead');

        if (dtpConsultant) params.set('dtpConsultant', dtpConsultant);
        else params.delete('dtpConsultant');

        if (hasWorks) params.set('hasWorks', hasWorks);
        else params.delete('hasWorks');

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleClearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('subDivision');
        params.delete('workType');
        params.delete('budgetHead');
        params.delete('dtpConsultant');
        params.delete('hasWorks');
        params.set('page', '1');

        setSubDivision('');
        setWorkType('');
        setBudgetHead('');
        setDtpConsultant('');
        setHasWorks('');

        router.push(`${pathname}?${params.toString()}`);
    };

    const hasActiveFilters = !!(subDivision || workType || budgetHead || dtpConsultant || hasWorks);

    return (
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold text-sm">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span>Filter Packages</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                {/* Sub Division */}
                <div>
                    <label htmlFor="filterSubDivision" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sub Division</label>
                    <select
                        id="filterSubDivision"
                        value={subDivision}
                        onChange={(e) => setSubDivision(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    >
                        <option value="">All Sub Divisions</option>
                        {subDivisions.map(sd => (
                            <option key={sd} value={sd}>{sd}</option>
                        ))}
                    </select>
                </div>

                {/* Work Type */}
                <div>
                    <label htmlFor="filterWorkType" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Work Type</label>
                    <select
                        id="filterWorkType"
                        value={workType}
                        onChange={(e) => setWorkType(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    >
                        <option value="">All Work Types</option>
                        {workTypes.map(wt => (
                            <option key={wt} value={wt}>{wt}</option>
                        ))}
                    </select>
                </div>

                {/* Budget Head */}
                <div>
                    <label htmlFor="filterBudgetHead" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Budget Head</label>
                    <select
                        id="filterBudgetHead"
                        value={budgetHead}
                        onChange={(e) => setBudgetHead(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    >
                        <option value="">All Budget Heads</option>
                        {budgetHeads.map(bh => (
                            <option key={bh} value={bh}>{bh}</option>
                        ))}
                    </select>
                </div>

                {/* DTP Consultant */}
                <div>
                    <label htmlFor="filterDtpConsultant" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">DTP Consultant</label>
                    <select
                        id="filterDtpConsultant"
                        value={dtpConsultant}
                        onChange={(e) => setDtpConsultant(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    >
                        <option value="">All Consultants</option>
                        {consultants.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Approved Works Status */}
                <div>
                    <label htmlFor="filterHasWorks" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Approved Works</label>
                    <select
                        id="filterHasWorks"
                        value={hasWorks}
                        onChange={(e) => setHasWorks(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    >
                        <option value="">All Packages</option>
                        <option value="yes">With Approved Works</option>
                        <option value="no">Without Approved Works</option>
                    </select>
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleClearFilters}
                        className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5 mr-1" /> Clear
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleApplyFilters}
                    className="inline-flex items-center px-5 py-2 border border-transparent rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                >
                    Apply Filters
                </button>
            </div>
        </div>
    );
}
