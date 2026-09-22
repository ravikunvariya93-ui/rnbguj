'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';

export interface WeekOption {
    value: string; // Monday ISO date YYYY-MM-DD
    label: string; // e.g. "15 Sep – 21 Sep 2026"
}

interface Props {
    weeks: WeekOption[];
    selectedWeeks: string[];
}

/** Multi-week picker shared by the weekly dashboard reports. Writes `?woWeeks=a,b,c`. */
export default function WeekMultiSelect({ weeks, selectedWeeks }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);

    const apply = (values: string[]) => {
        if (values.length === 0) return; // keep at least one week selected
        const params = new URLSearchParams(searchParams.toString());
        params.set('woWeeks', values.join(','));
        params.delete('woWeek');
        router.push(pathname + '?' + params.toString());
    };

    const toggle = (value: string) => {
        const next = selectedWeeks.includes(value)
            ? selectedWeeks.filter((v) => v !== value)
            : [...selectedWeeks, value];
        apply(next);
    };

    const singleLabel = selectedWeeks.length === 1 ? weeks.find((w) => w.value === selectedWeeks[0])?.label : null;
    const buttonLabel = singleLabel ?? `${selectedWeeks.length} week${selectedWeeks.length === 1 ? '' : 's'}`;

    return (
        <span className="relative inline-flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                <span>Week</span>
            </span>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-1.5 border bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 max-w-[260px]"
                title="Select weeks"
            >
                <span className="truncate">{buttonLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            </button>
            {open && (
                <span className="absolute right-0 top-full mt-1 z-30 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
                    <span className="block max-h-64 overflow-y-auto py-1">
                        {weeks.map((w) => {
                            const checked = selectedWeeks.includes(w.value);
                            return (
                                <label
                                    key={w.value}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggle(w.value)}
                                        className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                                    />
                                    <span className="flex-1 truncate">{w.label}</span>
                                    {checked && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />}
                                </label>
                            );
                        })}
                    </span>
                    <span className="flex items-center justify-between border-t border-slate-100 px-3 py-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {selectedWeeks.length} selected
                        </span>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                        >
                            Done
                        </button>
                    </span>
                </span>
            )}
        </span>
    );
}
