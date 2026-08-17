'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', pageNumber.toString());
        return `?${params.toString()}`;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between border border-emerald-200 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-green-50/50 px-4 py-3 sm:px-6 mt-6 rounded-2xl shadow-xs">
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => router.push(createPageURL(currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="relative inline-flex items-center rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                    Previous
                </button>
                <button
                    onClick={() => router.push(createPageURL(currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="relative ml-3 inline-flex items-center rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                    Next
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-emerald-950 font-medium">
                        Showing page <span className="font-bold text-emerald-700">{currentPage}</span> of{' '}
                        <span className="font-bold text-emerald-700">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs overflow-hidden border border-emerald-300 bg-white" aria-label="Pagination">
                        <button
                            onClick={() => router.push(createPageURL(currentPage - 1))}
                            disabled={currentPage <= 1}
                            className="relative inline-flex items-center px-3 py-2 text-emerald-600 hover:bg-emerald-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40 cursor-pointer border-r border-emerald-200"
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        
                        {(() => {
                            const getVisiblePages = (current: number, total: number) => {
                                if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
                                if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
                                if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
                                return [1, '...', current - 1, current, current + 1, '...', total];
                            };

                            return getVisiblePages(currentPage, totalPages).map((page, index) => {
                                if (page === '...') {
                                    return (
                                        <span
                                            key={`ellipsis-${index}`}
                                            className="relative inline-flex items-center px-3.5 py-2 text-xs font-bold text-emerald-600/70 border-r border-emerald-200"
                                        >
                                            ...
                                        </span>
                                    );
                                }

                                const isCurrent = page === currentPage;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => router.push(createPageURL(page))}
                                        className={`relative inline-flex items-center px-3.5 py-2 text-xs font-bold border-r border-emerald-200 transition-colors cursor-pointer ${
                                            isCurrent
                                                ? 'z-10 bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-xs'
                                                : 'text-emerald-950 hover:bg-emerald-100/60'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            });
                        })()}

                        <button
                            onClick={() => router.push(createPageURL(currentPage + 1))}
                            disabled={currentPage >= totalPages}
                            className="relative inline-flex items-center px-3 py-2 text-emerald-600 hover:bg-emerald-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40 cursor-pointer"
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
}
