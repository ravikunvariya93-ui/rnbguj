'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { X, Filter } from 'lucide-react';
import { useCallback } from 'react';

interface FilterOptions {
    subDivisions: string[];
    contractors: string[];
    years: string[];
    roadCategories: string[];
    workTypes: string[];
    natures: string[];
    schemes: string[];
}

interface Props {
    options: FilterOptions;
}

export default function DashboardFilters({ options }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(name, value);
            } else {
                params.delete(name);
            }
            return params.toString();
        },
        [searchParams]
    );

    const handleChange = (name: string, value: string) => {
        router.push(pathname + '?' + createQueryString(name, value));
    };

    const clearFilters = () => {
        router.push(pathname);
    };

    const hasFilters = searchParams.size > 0 && !searchParams.has('search');

    const filterFields = [
        { name: 'subDivision', label: 'Sub Division', options: options.subDivisions },
        { name: 'estimateConsultant', label: 'Consultant', options: options.contractors },
        { name: 'approvalYear', label: 'Year', options: options.years },
        { name: 'roadCategory', label: 'Road Category', options: options.roadCategories },
        { name: 'workType', label: 'Work Type', options: options.workTypes },
        { name: 'natureOfWork', label: 'Nature', options: options.natures },
        { name: 'schemeName', label: 'Scheme', options: options.schemes },
    ];

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Dashaboard Filters</h2>
                </div>
                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
                    >
                        <X className="w-3 h-3" /> Clear All
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filterFields.map((field) => (
                    <div key={field.name}>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 px-1">
                            {field.label}
                        </label>
                        <select
                            value={searchParams.get(field.name) || ''}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            className="block w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all outline-none appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                        >
                            <option value="">All {field.label}s</option>
                            {field.options.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    );
}
