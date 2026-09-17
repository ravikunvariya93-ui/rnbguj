'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
}

function Pagination({ currentPage, totalPages }: PaginationProps) {
    const searchParams = useSearchParams();

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', pageNumber.toString());
        return `?${params.toString()}`;
    };

    if (totalPages <= 1) return null;

    const linkBase = 'relative inline-flex items-center cursor-pointer transition-colors';
    const pageBtn = (isCurrent: boolean) =>
        `px-3.5 py-2 text-xs font-bold border-r border-emerald-200 ${isCurrent ? 'z-10 bg-emerald-600 text-white' : 'text-emerald-950 hover:bg-emerald-100/60'}`;

    const prevDisabled = currentPage <= 1;
    const nextDisabled = currentPage >= totalPages;
    const disabledCls = 'pointer-events-none opacity-40';

    return (
        <div className="flex items-center justify-between border border-slate-200 bg-white px-4 py-3 sm:px-6 mt-6 rounded-2xl shadow-sm">
            <div className="flex flex-1 justify-between sm:hidden">
                <Link
                    href={createPageURL(currentPage - 1)}
                    prefetch
                    aria-disabled={prevDisabled}
                    className={`relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 ${prevDisabled ? disabledCls : ''}`}
                >
                    Previous
                </Link>
                <Link
                    href={createPageURL(currentPage + 1)}
                    prefetch
                    aria-disabled={nextDisabled}
                    className={`relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 ${nextDisabled ? disabledCls : ''}`}
                >
                    Next
                </Link>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-600 font-medium">
                        Showing page <span className="font-bold text-emerald-700">{currentPage}</span> of{' '}
                        <span className="font-bold text-emerald-700">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs overflow-hidden border border-slate-200 bg-white" aria-label="Pagination">
                        <Link
                            href={createPageURL(currentPage - 1)}
                            prefetch
                            aria-disabled={prevDisabled}
                            aria-label="Previous page"
                            className={`${linkBase} px-3 py-2 text-emerald-600 hover:bg-emerald-50 border-r border-slate-200 ${prevDisabled ? disabledCls : ''}`}
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        
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
                                            className="relative inline-flex items-center px-3.5 py-2 text-xs font-bold text-slate-400 border-r border-slate-200"
                                        >
                                            ...
                                        </span>
                                    );
                                }

                                const isCurrent = page === currentPage;
                                return (
                                    <Link
                                        key={page}
                                        href={createPageURL(page)}
                                        prefetch
                                        aria-current={isCurrent ? 'page' : undefined}
                                        className={`${linkBase} ${pageBtn(isCurrent)}`}
                                    >
                                        {page}
                                    </Link>
                                );
                            });
                        })()}

                        <Link
                            href={createPageURL(currentPage + 1)}
                            prefetch
                            aria-disabled={nextDisabled}
                            aria-label="Next page"
                            className={`${linkBase} px-3 py-2 text-emerald-600 hover:bg-emerald-50 ${nextDisabled ? disabledCls : ''}`}
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </nav>
                </div>
            </div>
        </div>
    );
}

export default memo(Pagination);
