'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Props {
    placeholder?: string;
}

export default function SearchBar({ placeholder = 'Search...' }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // Local state for the input to keep it responsive
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

    // Debounced URL update
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (searchTerm) {
                params.set('search', searchTerm);
            } else {
                params.delete('search');
            }
            
            // Only push if the search term actually changed in the URL
            const currentSearch = searchParams.get('search') || '';
            if (searchTerm !== currentSearch) {
                router.push(`${pathname}?${params.toString()}`);
            }
        }, 500); // 500ms debounce to prevent excessive server requests

        return () => clearTimeout(timeoutId);
    }, [searchTerm, pathname, router, searchParams]);

    // Handle clear button
    const handleClear = useCallback(() => {
        setSearchTerm('');
    }, []);

    return (
        <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
                <button
                    onClick={handleClear}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700 text-gray-400 transition-colors"
                    title="Clear Search"
                >
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
