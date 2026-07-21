'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, X } from 'lucide-react';

interface AgreementsFilterBarProps {
    agencies: any[];
    years: string[];
}

export default function AgreementsFilterBar({ agencies, years }: AgreementsFilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [agreementYear, setAgreementYear] = useState(searchParams.get('agreementYear') || '');
    const [contractorName, setContractorName] = useState(searchParams.get('contractorName') || '');
    const [priceRange, setPriceRange] = useState(searchParams.get('priceRange') || '');
    const [fromDate, setFromDate] = useState(searchParams.get('fromDate') || '');
    const [toDate, setToDate] = useState(searchParams.get('toDate') || '');

    useEffect(() => {
        setAgreementYear(searchParams.get('agreementYear') || '');
        setContractorName(searchParams.get('contractorName') || '');
        setPriceRange(searchParams.get('priceRange') || '');
        setFromDate(searchParams.get('fromDate') || '');
        setToDate(searchParams.get('toDate') || '');
    }, [searchParams]);

    const handleApplyFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');

        if (agreementYear) params.set('agreementYear', agreementYear);
        else params.delete('agreementYear');

        if (contractorName) params.set('contractorName', contractorName);
        else params.delete('contractorName');

        if (priceRange) params.set('priceRange', priceRange);
        else params.delete('priceRange');

        if (fromDate) params.set('fromDate', fromDate);
        else params.delete('fromDate');

        if (toDate) params.set('toDate', toDate);
        else params.delete('toDate');

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleClearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('agreementYear');
        params.delete('contractorName');
        params.delete('priceRange');
        params.delete('fromDate');
        params.delete('toDate');
        params.set('page', '1');

        setAgreementYear('');
        setContractorName('');
        setPriceRange('');
        setFromDate('');
        setToDate('');

        router.push(`${pathname}?${params.toString()}`);
    };

    const hasActiveFilters = !!(agreementYear || contractorName || priceRange || fromDate || toDate);

    return (
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold text-sm">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Filter Agreements</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                {/* Agreement Year */}
                <div>
                    <label htmlFor="filterAgreementYear" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Agreement Year</label>
                    <select
                        id="filterAgreementYear"
                        value={agreementYear}
                        onChange={(e) => setAgreementYear(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border focus:border-blue-500 shadow-2xs"
                    >
                        <option value="">All Years</option>
                        {years.filter(Boolean).sort().map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
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

                {/* Contract Price Range */}
                <div>
                    <label htmlFor="filterPriceRange" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contract Price</label>
                    <select
                        id="filterPriceRange"
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border focus:border-blue-500 shadow-2xs"
                    >
                        <option value="">All Prices</option>
                        <option value="gte_25l">≥ 25 Lakhs</option>
                        <option value="lt_25l">&lt; 25 Lakhs</option>
                    </select>
                </div>

                {/* From Date */}
                <div>
                    <label htmlFor="filterFromDate" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">From Date</label>
                    <input
                        type="date"
                        id="filterFromDate"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border focus:border-blue-500 shadow-2xs"
                    />
                </div>

                {/* To Date */}
                <div>
                    <label htmlFor="filterToDate" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">To Date</label>
                    <input
                        type="date"
                        id="filterToDate"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-white text-slate-700 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border focus:border-blue-500 shadow-2xs"
                    />
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
