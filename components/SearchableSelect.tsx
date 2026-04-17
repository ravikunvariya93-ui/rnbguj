'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface Option {
    _id: string;
    packageName?: string;
    contractorName?: string;
    tenderId?: string;
    name?: string; // Generic name field
    [key: string]: any; // Allow other fields
}

interface Props {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    label?: string;
    displayField?: string;
    helperField?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = '-- Select --',
    required = false,
    label,
    displayField,
    helperField,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const getDisplayValue = useCallback((opt: Option) => {
        if (displayField) return opt[displayField];
        return opt.packageName || opt.name || opt.tenderId || '';
    }, [displayField]);

    const getHelperValue = useCallback((opt: Option) => {
        if (helperField) return opt[helperField];
        return opt.contractorName || '';
    }, [helperField]);

    // Sync search term with initial value if selected
    useEffect(() => {
        if (value) {
            const selected = options.find((opt) => opt._id === value);
            if (selected) {
                setSearchTerm(getDisplayValue(selected));
            }
        } else {
            setSearchTerm('');
        }
    }, [value, options, getDisplayValue]);

    const filteredOptions = options.filter((opt) => {
        const search = searchTerm.toLowerCase();
        const display = (getDisplayValue(opt) || '').toLowerCase();
        const helper = (getHelperValue(opt) || '').toLowerCase();
        const tid = (opt.tenderId || '').toLowerCase();
        
        return display.includes(search) || helper.includes(search) || tid.includes(search);
    });

    const handleSelect = (id: string) => {
        onChange(id);
        const selected = options.find((opt) => opt._id === id);
        if (selected) {
            setSearchTerm(getDisplayValue(selected));
        }
        setIsOpen(false);
    };

    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
            // Revert search term to selected value on close
            const selected = options.find((opt) => opt._id === value);
            if (selected) {
                setSearchTerm(getDisplayValue(selected));
            } else if (!value) {
                setSearchTerm('');
            }
        }
    }, [options, value, getDisplayValue]);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    const handleClear = () => {
        onChange('');
        setSearchTerm('');
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative mt-1">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && '*'}
                </label>
            )}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
                    placeholder={placeholder}
                    value={searchTerm}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    required={required && !value}
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center space-x-1">
                    {value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 hover:text-gray-700 text-gray-400"
                            title="Clear selection"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1 hover:text-gray-700 text-gray-400"
                    >
                        <ChevronDown 
                            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                            aria-hidden="true" 
                        />
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm transition-all animate-in fade-in zoom-in duration-200 origin-top">
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-500 italic">No matching results.</div>
                    ) : (
                        filteredOptions.map((opt) => (
                            <button
                                key={opt._id}
                                type="button"
                                onClick={() => handleSelect(opt._id)}
                                className={`group relative cursor-default select-none py-2 pl-3 pr-9 w-full text-left hover:bg-blue-600 hover:text-white transition-colors ${
                                    value === opt._id ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-gray-900'
                                }`}
                            >
                                <div className="flex flex-col">
                                    <span className="block truncate">{getDisplayValue(opt)}</span>
                                    {getHelperValue(opt) && (
                                        <span className={`block truncate text-xs ${value === opt._id ? 'text-blue-700 font-normal' : 'text-gray-500 group-hover:text-blue-100'}`}>
                                            {helperField || 'Contractor'}: {getHelperValue(opt)}
                                        </span>
                                    )}
                                </div>
                                {value === opt._id && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 group-hover:text-white">
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
