'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Layers, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const options = [
    { value: 'natureOfWork', label: 'Nature of Work' },
    { value: 'subDivision', label: 'Sub Division' },
    { value: 'estimateConsultant', label: 'Consultant' },
    { value: 'approvalYear', label: 'Approval Year' },
    { value: 'roadCategory', label: 'Road Category' },
    { value: 'workType', label: 'Work Type' },
    { value: 'schemeName', label: 'Scheme Name' },
];

export default function ReportGrouping() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const value = searchParams.get('groupBy') || 'natureOfWork';
    const selectedOption = options.find(opt => opt.value === value) || options[0];

    const handleChange = (newVal: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('groupBy', newVal);
        router.push(pathname + '?' + params.toString());
        setIsOpen(false);
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex items-center gap-4 bg-white border border-slate-200 pl-4 pr-2 py-2 rounded-2xl shadow-sm w-full sm:w-[420px] justify-between relative" ref={dropdownRef}>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 flex-shrink-0">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                Group Results By
            </label>
            
            {/* Custom Modern Dropdown Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex-1 flex items-center justify-between text-xs font-bold bg-slate-50/80 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all shadow-sm group"
            >
                <span className="truncate">{selectedOption.label}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-full sm:w-[220px] bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 px-1">
                        {options.map((opt) => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => handleChange(opt.value)}
                                    className={`flex justify-between items-center w-full min-w-0 text-left px-3 py-2.5 text-xs font-bold rounded-lg transition-colors
                                        ${isSelected 
                                            ? 'bg-blue-50/80 text-blue-700' 
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <span className="truncate mr-2">{opt.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
