'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, X } from 'lucide-react';

interface CommitteeFilterBarProps {
    subDivisions: string[];
    workTypes: string[];
    budgetHeads: string[];
}

export default function CommitteeFilterBar({ subDivisions, workTypes, budgetHeads }: CommitteeFilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [subDivision, setSubDivision] = useState(searchParams.get('subDivision') || '');
    const [workType, setWorkType] = useState(searchParams.get('workType') || '');
    const [budgetHead, setBudgetHead] = useState(searchParams.get('budgetHead') || '');
    const [committeeType, setCommitteeType] = useState(searchParams.get('committeeType') || '');
    const [hasLoa, setHasLoa] = useState(searchParams.get('hasLoa') || '');
    const [loaFromDate, setLoaFromDate] = useState(searchParams.get('loaFromDate') || searchParams.get('fromDate') || '');
    const [loaToDate, setLoaToDate] = useState(searchParams.get('loaToDate') || searchParams.get('toDate') || '');
    
    const getSortKey = () => {
        const s = searchParams.get('sort');
        const o = searchParams.get('order') || 'asc';
        if (!s) return '';
        return `${s}_${o}`;
    };
    const [sortOption, setSortOption] = useState(getSortKey());

    useEffect(() => {
        setSubDivision(searchParams.get('subDivision') || '');
        setWorkType(searchParams.get('workType') || '');
        setBudgetHead(searchParams.get('budgetHead') || '');
        setCommitteeType(searchParams.get('committeeType') || '');
        setHasLoa(searchParams.get('hasLoa') || '');
        setLoaFromDate(searchParams.get('loaFromDate') || searchParams.get('fromDate') || '');
        setLoaToDate(searchParams.get('loaToDate') || searchParams.get('toDate') || '');
        setSortOption(getSortKey());
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

        if (committeeType) params.set('committeeType', committeeType);
        else params.delete('committeeType');

        if (hasLoa) params.set('hasLoa', hasLoa);
        else params.delete('hasLoa');

        if (loaFromDate) params.set('loaFromDate', loaFromDate);
        else {
            params.delete('loaFromDate');
            params.delete('fromDate');
        }

        if (loaToDate) params.set('loaToDate', loaToDate);
        else {
            params.delete('loaToDate');
            params.delete('toDate');
        }

        if (sortOption) {
            const [field, order] = sortOption.split('_');
            params.set('sort', field);
            params.set('order', order || 'asc');
        } else {
            params.delete('sort');
            params.delete('order');
        }

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleClearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('subDivision');
        params.delete('workType');
        params.delete('budgetHead');
        params.delete('committeeType');
        params.delete('hasLoa');
        params.delete('loaFromDate');
        params.delete('loaToDate');
        params.delete('fromDate');
        params.delete('toDate');
        params.delete('sort');
        params.delete('order');
        params.set('page', '1');

        setSubDivision('');
        setWorkType('');
        setBudgetHead('');
        setCommitteeType('');
        setHasLoa('');
        setLoaFromDate('');
        setLoaToDate('');
        setSortOption('');

        router.push(`${pathname}?${params.toString()}`);
    };

    const hasActiveFilters = !!(subDivision || workType || budgetHead || committeeType || hasLoa || loaFromDate || loaToDate || sortOption);

    return (
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold text-sm">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span>Filter Committee Records</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 items-end">
                {/* Sub Division */}
                <div>
                    <label htmlFor="filterSubDivision" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sub Division</label>
                    <select
                        id="filterSubDivision"
                        value={subDivision}
                        onChange={(e) => setSubDivision(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
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
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
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
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    >
                        <option value="">All Budget Heads</option>
                        {budgetHeads.map(bh => (
                            <option key={bh} value={bh}>{bh}</option>
                        ))}
                    </select>
                </div>

                {/* Committee Type */}
                <div>
                    <label htmlFor="filterCommitteeType" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Committee Type</label>
                    <select
                        id="filterCommitteeType"
                        value={committeeType}
                        onChange={(e) => setCommitteeType(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    >
                        <option value="">All Types</option>
                        <option value="Bandhkam Committee">Bandhkam Committee</option>
                        <option value="Karobari">Karobari</option>
                        <option value="Not Required">Not Required</option>
                        <option value="Not Determined">Not Determined</option>
                    </select>
                </div>

                {/* LOA Status */}
                <div>
                    <label htmlFor="filterHasLoa" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">LOA Status</label>
                    <select
                        id="filterHasLoa"
                        value={hasLoa}
                        onChange={(e) => setHasLoa(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    >
                        <option value="">All LOA Status</option>
                        <option value="yes">LOA Given</option>
                        <option value="no">LOA Not Given</option>
                    </select>
                </div>

                {/* LOA From Date */}
                <div>
                    <label htmlFor="filterLoaFromDate" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">LOA From Date</label>
                    <input
                        type="date"
                        id="filterLoaFromDate"
                        value={loaFromDate}
                        onChange={(e) => setLoaFromDate(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    />
                </div>

                {/* LOA To Date */}
                <div>
                    <label htmlFor="filterLoaToDate" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">LOA To Date</label>
                    <input
                        type="date"
                        id="filterLoaToDate"
                        value={loaToDate}
                        onChange={(e) => setLoaToDate(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    />
                </div>

                {/* Sort By */}
                <div>
                    <label htmlFor="filterSortBy" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sort By</label>
                    <select
                        id="filterSortBy"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                    >
                        <option value="">Default (Newest First)</option>
                        <option value="packageName_asc">Package Name (A → Z)</option>
                        <option value="packageName_desc">Package Name (Z → A)</option>
                        <option value="subDivision_asc">Sub Division (A → Z)</option>
                        <option value="subDivision_desc">Sub Division (Z → A)</option>
                        <option value="workType_asc">Work Type (A → Z)</option>
                        <option value="workType_desc">Work Type (Z → A)</option>
                        <option value="budgetHead_asc">Budget Head (A → Z)</option>
                        <option value="budgetHead_desc">Budget Head (Z → A)</option>
                        <option value="committee_asc">Committee (A → Z)</option>
                        <option value="committee_desc">Committee (Z → A)</option>
                        <option value="committeeDate_desc">Committee Date (Latest First)</option>
                        <option value="committeeDate_asc">Committee Date (Oldest First)</option>
                        <option value="loaDate_desc">LOA Date (Latest First)</option>
                        <option value="loaDate_asc">LOA Date (Oldest First)</option>
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
