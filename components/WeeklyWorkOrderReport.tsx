'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Printer } from 'lucide-react';
import ExportTableButton from './ExportTableButton';
import { formatShortDate } from '@/lib/dateUtils';

export interface WeeklyWOWeek {
    value: string; // Monday ISO date YYYY-MM-DD
    label: string; // e.g. "15 Sep – 21 Sep 2026"
}

export interface WeeklyWORow {
    _id: string;
    packageName: string;
    packageId: string | null;
    contractorName: string;
    tenderAmount: number | null;
    workOrderDate: string | null;
}

interface Props {
    weeks: WeeklyWOWeek[];
    selectedWeek: string;
    weekLabel: string;
    rows: WeeklyWORow[];
}

function parseMondayISO(iso: string): Date {
    const parts = iso.split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
}

export default function WeeklyWorkOrderReport({ weeks, selectedWeek, weekLabel, rows }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Explicit from–to range for print, e.g. "From Date 14/09/2026 to 20/09/2026"
    const rangeStart = parseMondayISO(selectedWeek);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 6);
    const weekRangeText = `From Date ${formatShortDate(rangeStart)} to ${formatShortDate(rangeEnd)}`;

    const totalTenderAmount = rows.reduce((sum, r) => sum + (r.tenderAmount != null ? Number(r.tenderAmount) : 0), 0);

    const handleWeekChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('woWeek', value);
        router.push(pathname + '?' + params.toString());
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;
        const tableRows = rows
            .map(
                (row, idx) => `<tr>
                    <td style="border:1px solid #222;padding:4px 8px;text-align:center;">${idx + 1}</td>
                    <td style="border:1px solid #222;padding:4px 8px;">${escapeHtml(row.packageName)}</td>
                    <td style="border:1px solid #222;padding:4px 8px;">${escapeHtml(row.contractorName)}</td>
                    <td style="border:1px solid #222;padding:4px 8px;text-align:right;">${row.tenderAmount != null ? '₹' + Number(row.tenderAmount).toLocaleString('en-IN') : '-'}</td>
                    <td style="border:1px solid #222;padding:4px 8px;text-align:center;">${escapeHtml(formatShortDate(row.workOrderDate))}</td>
                </tr>`
            )
            .join('');
        const totalRow = rows.length > 0
            ? `<tr>
                    <td colspan="3" style="border:1px solid #222;padding:4px 8px;text-align:right;font-weight:bold;background:#f0f0f0;">Total</td>
                    <td style="border:1px solid #222;padding:4px 8px;text-align:right;font-weight:bold;background:#f0f0f0;">₹${totalTenderAmount.toLocaleString('en-IN')}</td>
                    <td style="border:1px solid #222;padding:4px 8px;background:#f0f0f0;"></td>
                </tr>`
            : '';
        printWindow.document.write(`<html><head><title>Weekly Work Order Report - ${escapeHtml(weekRangeText)}</title>
            <style>body{font-family:Arial,sans-serif;padding:16px;}h2{text-align:center;margin-bottom:4px;}p{text-align:center;margin-top:0;color:#444;}table{border-collapse:collapse;width:100%;margin-top:12px;}th{border:1px solid #222;padding:4px 8px;background:#f0f0f0;}</style>
            </head><body>
            <h2 style="margin-bottom:0;">Panchayat Road and Building Division, Bhavnagar</h2>
            <h3 style="text-align:center;margin:4px 0;">Weekly Work Order Report</h3>
            <p>${escapeHtml(weekRangeText)}</p>
            <table><thead><tr><th>Sr. No.</th><th>Package Name</th><th>Contractor Name</th><th>Tender Amount</th><th>Work Order Date</th></tr></thead>
            <tbody>${tableRows ? tableRows + totalRow : '<tr><td colspan="5" style="border:1px solid #222;padding:8px;text-align:center;">No work orders issued in this week.</td></tr>'}</tbody></table>
            <script>window.onload=function(){window.print();};</script>
            </body></html>`);
        printWindow.document.close();
    };

    return (
        <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4" id="weekly-wo-report">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Weekly Work Order Report</h2>
                    <p className="text-xs text-slate-500 font-medium">
                        Work orders issued in the selected week ({weekLabel}) — {rows.length} record{rows.length === 1 ? '' : 's'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Week</span>
                    </span>
                    <select
                        value={selectedWeek}
                        onChange={(e) => handleWeekChange(e.target.value)}
                        className="text-xs font-bold rounded-lg px-3 py-1.5 border bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 max-w-[260px]"
                        title="Select week"
                    >
                        {weeks.map((w) => (
                            <option key={w.value} value={w.value}>
                                {w.label}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-all cursor-pointer"
                        title="Print weekly report"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                    </button>
                    <ExportTableButton tableId="weekly-wo-table" filename={`Weekly_Work_Order_Report_${selectedWeek}.xlsx`} />
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-300 shadow-sm rounded-lg">
                <table id="weekly-wo-table" className="w-full text-left border-collapse text-xs font-medium">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-300">
                            <th className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300 text-center w-16">Sr. No.</th>
                            <th className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300">Package Name</th>
                            <th className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300">Contractor Name</th>
                            <th className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300 text-right">Tender Amount</th>
                            <th className="px-3 py-2.5 font-bold text-slate-700 text-center w-40">Work Order Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {rows.length > 0 ? (
                            rows.map((row, idx) => {
                                const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
                                return (
                                    <tr key={row._id} className={`${rowBg} hover:bg-emerald-50/80 transition-colors`}>
                                        <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">{idx + 1}</td>
                                        <td className="px-3 py-2 text-slate-800 border-r border-slate-200 font-semibold">
                                            {row.packageId ? (
                                                <Link href={`/packages/${row.packageId}`} className="text-emerald-600 hover:underline">
                                                    {row.packageName}
                                                </Link>
                                            ) : (
                                                row.packageName
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-800 border-r border-slate-200">{row.contractorName}</td>
                                        <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-right font-mono font-semibold">{row.tenderAmount != null ? `₹${Number(row.tenderAmount).toLocaleString('en-IN')}` : '-'}</td>
                                        <td className="px-3 py-2 text-slate-600 text-center">{formatShortDate(row.workOrderDate)}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                    No work orders issued in this week.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot>
                            <tr className="bg-slate-100 border-t-2 border-slate-300">
                                <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-slate-800 border-r border-slate-200">
                                    Total
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                                    ₹{totalTenderAmount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-3 py-2.5"></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

function escapeHtml(s: string | null | undefined): string {
    return String(s ?? '-')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
