'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, X } from 'lucide-react';

interface TendersFilterBarProps {
    agencies: any[];
    years: string[];
    subDivisions: string[];
}

export default function TendersFilterBar({ agencies, years, subDivisions }: TendersFilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [noticeYear, setNoticeYear] = useState(searchParams.get('noticeYear') || '');
    const [noticeNo, setNoticeNo] = useState(searchParams.get('noticeNo') || '');
    const [contractorName, setContractorName] = useState(searchParams.get('contractorName') || '');
    const [trialNo, setTrialNo] = useState(searchParams.get('trialNo') || '');
    const [subDivision, setSubDivision] = useState(searchParams.get('subDivision') || '');

    // Synchronize local state with searchParams (handles clear filters, back/forward actions)
    useEffect(() => {
        setNoticeYear(searchParams.get('noticeYear') || '');
        setNoticeNo(searchParams.get('noticeNo') || '');
        setContractorName(searchParams.get('contractorName') || '');
        setTrialNo(searchParams.get('trialNo') || '');
        setSubDivision(searchParams.get('subDivision') || '');
    }, [searchParams]);

    const handleApplyFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        
        // Reset page to 1 when filters change
        params.set('page', '1');

        if (noticeYear) params.set('noticeYear', noticeYear);
        else params.delete('noticeYear');

        if (noticeNo) params.set('noticeNo', noticeNo);
        else params.delete('noticeNo');

        if (contractorName) params.set('contractorName', contractorName);
        else params.delete('contractorName');

        if (trialNo) params.set('trialNo', trialNo);
        else params.delete('trialNo');

        if (subDivision) params.set('subDivision', subDivision);
        else params.delete('subDivision');

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleClearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('noticeYear');
        params.delete('noticeNo');
        params.delete('contractorName');
        params.delete('trialNo');
        params.delete('subDivision');
        params.set('page', '1');

        setNoticeYear('');
        setNoticeNo('');
        setContractorName('');
        setTrialNo('');
        setSubDivision('');

        router.push(`${pathname}?${params.toString()}`);
    };

    const hasActiveFilters = !!(noticeYear || noticeNo || contractorName || trialNo || subDivision);

    return (
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold text-sm">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Filter Tenders</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                {/* Sub Division */}
                <div>
                    <label htmlFor="filterSubDivision" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sub Division</label>
                    <select
                        id="filterSubDivision"
                        value={subDivision}
                        onChange={(e) => setSubDivision(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border focus:border-blue-500 shadow-2xs"
                    >
                        <option value="">All Sub Divisions</option>
                        {subDivisions.map(sd => (
                            <option key={sd} value={sd}>{sd}</option>
                        ))}
                    </select>
                </div>

                {/* Notice Year */}
                <div>
                    <label htmlFor="filterNoticeYear" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notice Year</label>
                    <select
                        id="filterNoticeYear"
                        value={noticeYear}
                        onChange={(e) => setNoticeYear(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border focus:border-blue-500 shadow-2xs"
                    >
                        <option value="">All Years</option>
                        {years.filter(Boolean).sort().map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                {/* Notice No. */}
                <div>
                    <label htmlFor="filterNoticeNo" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notice No.</label>
                    <input
                        type="text"
                        id="filterNoticeNo"
                        value={noticeNo}
                        onChange={(e) => setNoticeNo(e.target.value)}
                        placeholder="e.g. 1"
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border focus:border-blue-500 shadow-2xs"
                    />
                </div>

                {/* Contractor */}
                <div>
                    <label htmlFor="filterContractor" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contractor</label>
                    <select
                        id="filterContractor"
                        value={contractorName}
                        onChange={(e) => setContractorName(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border focus:border-blue-500 shadow-2xs"
                    >
                        <option value="">All Contractors</option>
                        {agencies.map(a => (
                            <option key={a._id} value={a.name}>{a.name}</option>
                        ))}
                    </select>
                </div>

                {/* Trial No. */}
                <div>
                    <label htmlFor="filterTrialNo" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Trial</label>
                    <select
                        id="filterTrialNo"
                        value={trialNo}
                        onChange={(e) => setTrialNo(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border focus:border-blue-500 shadow-2xs"
                    >
                        <option value="">All Trials</option>
                        <option value="1">Trial 1</option>
                        <option value="2">Trial 2</option>
                        <option value="3">Trial 3</option>
                        <option value="4">Trial 4</option>
                        <option value="5">Trial 5</option>
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
                    className="inline-flex items-center px-5 py-2 border border-transparent rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                >
                    Apply Filters
                </button>
            </div>
        </div>
    );
}
