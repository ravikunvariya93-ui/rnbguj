'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarRange, X } from 'lucide-react';

// The date field each status tab filters on. Pending-stage rows are defined
// by a *missing* date, so the range applies to the stage's anchor date.
const FIELD_LABELS: Record<string, string> = {
    '': 'Tender Creation Date',
    pending_proposal: 'Tender Opening Date',
    pending_approval: 'Proposal Date',
    pending_loa: 'Approval Date',
    pending_work_order: 'LOA Date',
};

export default function TenderDateSubFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const filter = searchParams.get('filter') || '';

    const [from, setFrom] = useState(searchParams.get('fromDate') || '');
    const [to, setTo] = useState(searchParams.get('toDate') || '');

    // Keep inputs in sync with URL (tab switches, clear-all, back/forward)
    useEffect(() => {
        setFrom(searchParams.get('fromDate') || '');
        setTo(searchParams.get('toDate') || '');
    }, [searchParams]);

    const apply = () => {
        const p = new URLSearchParams(searchParams.toString());
        p.set('page', '1');
        if (from) p.set('fromDate', from);
        else p.delete('fromDate');
        if (to) p.set('toDate', to);
        else p.delete('toDate');
        router.push(`${pathname}?${p.toString()}`);
    };

    const clear = () => {
        const p = new URLSearchParams(searchParams.toString());
        p.delete('fromDate');
        p.delete('toDate');
        p.set('page', '1');
        setFrom('');
        setTo('');
        router.push(`${pathname}?${p.toString()}`);
    };

    const hasActive = !!(searchParams.get('fromDate') || searchParams.get('toDate'));
    const fieldLabel = FIELD_LABELS[filter] ?? FIELD_LABELS[''];

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                apply();
            }}
            className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-2xs"
        >
            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <CalendarRange className="w-3.5 h-3.5" />
                </span>
                <span>
                    Filter by {fieldLabel}
                </span>
            </div>
            <div>
                <label htmlFor="tenderFromDate" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    From Date
                </label>
                <input
                    type="date"
                    id="tenderFromDate"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => setFrom(e.target.value)}
                    className="block rounded-xl border-slate-200 bg-white text-slate-700 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                />
            </div>
            <div>
                <label htmlFor="tenderToDate" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    To Date
                </label>
                <input
                    type="date"
                    id="tenderToDate"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => setTo(e.target.value)}
                    className="block rounded-xl border-slate-200 bg-white text-slate-700 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border focus:border-emerald-500 shadow-2xs"
                />
            </div>
            <div className="flex items-center gap-2 pb-[1px]">
                <button
                    type="submit"
                    className="inline-flex items-center px-5 py-2 border border-transparent rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                >
                    Apply
                </button>
                {hasActive && (
                    <button
                        type="button"
                        onClick={clear}
                        className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5 mr-1" /> Clear
                    </button>
                )}
            </div>
        </form>
    );
}
