'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
    X, Filter, Map, User, Calendar, 
    Route, Construction, Briefcase, LayoutGrid,
    ChevronDown, RotateCcw, ChevronUp
} from 'lucide-react';
import { useCallback, useState } from 'react';

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
    const [isCollapsed, setIsCollapsed] = useState(true);

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
        { name: 'subDivision', label: 'Sub Division', options: options.subDivisions, icon: Map },
        { name: 'estimateConsultant', label: 'Consultant', options: options.contractors, icon: User },
        { name: 'approvalYear', label: 'Year of Approval', options: options.years, icon: Calendar },
        { name: 'roadCategory', label: 'Road Category', options: options.roadCategories, icon: Route },
        { name: 'workType', label: 'Work Type', options: options.workTypes, icon: Construction },
        { name: 'natureOfWork', label: 'Nature of Work', options: options.natures, icon: Briefcase },
        { name: 'schemeName', label: 'Name of Scheme', options: options.schemes, icon: LayoutGrid },
    ];

    return (
        <div className={`bg-white border border-slate-200 rounded-[24px] shadow-sm flex flex-col transition-all ${isCollapsed ? 'px-4 py-3 gap-0' : 'p-6 gap-6'}`}>
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    title={isCollapsed ? "Expand Filters" : "Collapse Filters"}
                >
                    <div className="bg-blue-600 p-1.5 rounded-lg flex items-center justify-center relative">
                        <Filter className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Dashboard Filters</h2>
                        <div className="p-0.5 rounded-full bg-slate-100 text-slate-500">
                            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        </div>
                    </div>
                </button>
                <div className="flex items-center gap-3">
                    {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 px-3 py-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all text-xs font-bold"
                        title="Clear all filters"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset All
                    </button>
                    )}
                </div>
            </div>

            {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                    {filterFields.map((field) => {
                    const Icon = field.icon;
                    const value = searchParams.get(field.name) || '';
                    const isActive = !!value;

                    return (
                        <div key={field.name} className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <Icon className={`w-3 h-3 ${isActive ? 'text-blue-500' : 'text-slate-300'}`} />
                                {field.label}
                            </label>
                            <div className="relative group">
                                <select
                                    value={value}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                    className={`block w-full text-xs font-bold rounded-xl px-4 py-3 appearance-none outline-none transition-all cursor-pointer border ${
                                        isActive 
                                            ? 'bg-blue-50/50 border-blue-200 text-blue-700 ring-2 ring-blue-500/5' 
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <option value="">All {field.label}s</option>
                                    {field.options.map((opt) => (
                                        <option key={opt} value={opt} className="font-medium text-slate-900 bg-white py-2">
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            )}
        </div>
    );
}
