'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Construction, ChevronDown, Check } from 'lucide-react';
import { useCallback, useState, useRef, useEffect } from 'react';

interface Props {
    workTypes: string[];
    paramName?: string;
    stopPropagation?: boolean;
    defaultValues?: string[];
}

export default function WorkTypeFilter({ 
    workTypes, 
    paramName = 'workType', 
    stopPropagation = false,
    defaultValues = ['Road', 'Structure']
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get current selection from URL
    const hasParam = searchParams.has(paramName);
    const paramValue = searchParams.get(paramName);
    
    let selectedTypes: string[] = [];
    if (!hasParam) {
        selectedTypes = defaultValues;
    } else if (paramValue === 'all') {
        selectedTypes = workTypes;
    } else if (paramValue) {
        selectedTypes = paramValue.split(',').filter(Boolean);
    } else {
        selectedTypes = [];
    }

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateUrl = useCallback((types: string[]) => {
        const params = new URLSearchParams(searchParams.toString());
        if (types.length === workTypes.length) {
            params.set(paramName, 'all');
        } else if (types.length === 0) {
            params.set(paramName, 'none');
        } else {
            params.set(paramName, types.join(','));
        }
        router.push(pathname + '?' + params.toString());
    }, [router, pathname, searchParams, paramName, workTypes]);

    const handleToggle = (type: string) => {
        let nextSelected: string[];
        if (selectedTypes.includes(type)) {
            nextSelected = selectedTypes.filter(t => t !== type);
        } else {
            nextSelected = [...selectedTypes, type];
        }
        updateUrl(nextSelected);
    };

    const handleSelectAll = () => {
        updateUrl(workTypes);
    };

    const handleClearAll = () => {
        updateUrl([]);
    };

    const handleResetToDefault = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(paramName); // Deleting the parameter triggers default values
        router.push(pathname + '?' + params.toString());
    };

    // Label to show on the button
    let buttonLabel = '';
    if (selectedTypes.length === workTypes.length && workTypes.length > 0) {
        buttonLabel = 'All';
    } else if (selectedTypes.length === 0) {
        buttonLabel = 'None Selected';
    } else if (selectedTypes.length <= 2) {
        buttonLabel = selectedTypes.join(', ');
    } else {
        buttonLabel = `${selectedTypes.length} Selected`;
    }

    return (
        <div 
            ref={dropdownRef}
            className="relative inline-block text-left"
            onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        >
            <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    <Construction className={`w-3.5 h-3.5 ${selectedTypes.length > 0 ? 'text-blue-500' : 'text-slate-400'}`} />
                    <span>Work Type</span>
                </span>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center justify-between gap-2 text-xs font-bold rounded-lg px-3 py-1.5 border transition-all cursor-pointer min-w-[120px] ${
                        isOpen || (hasParam && paramValue !== 'all')
                            ? 'bg-blue-50/50 border-blue-200 text-blue-700 ring-2 ring-blue-500/10'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'
                    }`}
                >
                    <span className="truncate max-w-[150px]">{buttonLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                </button>
            </div>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-lg z-50 focus:outline-none overflow-hidden">
                    <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            type="button"
                            onClick={handleResetToDefault}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                        >
                            Default
                        </button>
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                        {workTypes.map((type) => {
                            const isChecked = selectedTypes.includes(type);
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleToggle(type)}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition-colors text-left ${
                                        isChecked 
                                            ? 'bg-blue-50/40 text-blue-900 font-semibold' 
                                            : 'text-slate-700 hover:bg-slate-50 font-medium'
                                    }`}
                                >
                                    <span className="truncate">{type}</span>
                                    {isChecked && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
