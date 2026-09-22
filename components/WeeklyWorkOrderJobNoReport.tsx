'use client';

import Link from 'next/link';
import { Printer } from 'lucide-react';
import ExportTableButton from './ExportTableButton';
import WeekMultiSelect from './WeekMultiSelect';
import { formatShortDate } from '@/lib/dateUtils';

export interface WeeklyWOWeek {
    value: string;
    label: string;
}

export interface WeeklyWORow {
    _id: string;
    packageName: string;
    packageId: string | null;
    tenderAmount: number | null;
    workOrderDate: string | null;
}

interface Props {
    weeks: WeeklyWOWeek[];
    selectedWeeks: string[];
    weekLabel: string;
    rows: WeeklyWORow[];
}

/** Job No. Amount (lac, ceiling) = ceil((Tender Amount + 18% of Tender Amount) / 100000) */
function jobNoAmountLac(tenderAmount: number | null): number | null {
    if (tenderAmount == null || !Number.isFinite(Number(tenderAmount))) return null;
    const withGst = Number(tenderAmount) * 1.18;
    return Math.ceil(withGst / 100000);
}

function parseMondayISO(iso: string): Date {
    const parts = iso.split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
}

export default function WeeklyWorkOrderJobNoReport({ weeks, selectedWeeks, weekLabel, rows }: Props) {
    // Explicit from–to range(s) for print, e.g. "From Date 14/09/2026 to 20/09/2026"
    const weekRanges = selectedWeeks.map((iso) => {
        const s = parseMondayISO(iso);
        const e = new Date(s);
        e.setDate(e.getDate() + 6);
        return `${formatShortDate(s)} to ${formatShortDate(e)}`;
    });
    const weekRangeText = weekRanges.length > 1 ? weekRanges.join('; ') : `From Date ${weekRanges[0] ?? '-'}`;

    const totalJobNoAmount = rows.reduce((sum, r) => {
        const v = jobNoAmountLac(r.tenderAmount);
        return sum + (v != null ? v : 0);
    }, 0);

    const ascWeeks = [...selectedWeeks].sort();
    const fileTag = ascWeeks.length > 1 ? `${ascWeeks[0]}_to_${ascWeeks[ascWeeks.length - 1]}` : (ascWeeks[0] ?? 'week');

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;
        const tableRows = rows
            .map((row, idx) => {
                const jobNo = jobNoAmountLac(row.tenderAmount);
                return `<tr>
                    <td style="border:1px solid #222;padding:4px 8px;text-align:center;">${idx + 1}</td>
                    <td style="border:1px solid #222;padding:4px 8px;">${escapeHtml(row.packageName)}</td>
                    <td style="border:1px solid #222;padding:4px 8px;text-align:right;">${jobNo != null ? jobNo : '-'}</td>
                    <td style="border:1px solid #222;padding:4px 8px;text-align:center;">${escapeHtml(formatShortDate(row.workOrderDate))}</td>
                </tr>`;
            })
            .join('');
        const totalRow = rows.length > 0
            ? `<tr>
                    <td colspan="2" style="border:1px solid #222;padding:4px 8px;text-align:right;font-weight:bold;background:#f0f0f0;">Total</td>
                    <td style="border:1px solid #222;padding:4px 8px;text-align:right;font-weight:bold;background:#f0f0f0;">${totalJobNoAmount}</td>
                    <td style="border:1px solid #222;padding:4px 8px;background:#f0f0f0;"></td>
                </tr>`
            : '';
        printWindow.document.write(`<html><head><title>Weekly Work Order Report with Job No Amount - ${escapeHtml(weekRangeText)}</title>
            <style>body{font-family:Arial,sans-serif;padding:16px;}h2{text-align:center;margin-bottom:4px;}p{text-align:center;margin-top:0;color:#444;}table{border-collapse:collapse;width:100%;margin-top:12px;}th{border:1px solid #222;padding:4px 8px;background:#f0f0f0;}</style>
            </head><body>
            <h2 style="margin-bottom:0;">Panchayat Road and Building Division, Bhavnagar</h2>
            <h3 style="text-align:center;margin:4px 0;">Weekly Work Order Report with Job No Amount</h3>
            <p>${escapeHtml(weekRangeText)}</p>
            <table><thead><tr><th>Sr. No.</th><th>Package Name</th><th>Job No. Amount in Lac</th><th>Work Order Date</th></tr></thead>
            <tbody>${tableRows ? tableRows + totalRow : '<tr><td colspan="4" style="border:1px solid #222;padding:8px;text-align:center;">No work orders issued in this week.</td></tr>'}</tbody></table>
            <script>window.onload=function(){window.print();};</script>
            </body></html>`);
        printWindow.document.close();
    };

    return (
        <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4" id="weekly-wo-jobno-report">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Weekly Work Order Report with Job No Amount</h2>
                    <p className="text-xs text-slate-500 font-medium">
                        Job No. Amount = Tender Amount + 18% of Tender Amount (ceiling in lac) — week{selectedWeeks.length === 1 ? '' : 's'} of {weekLabel} — {rows.length} record{rows.length === 1 ? '' : 's'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <WeekMultiSelect weeks={weeks} selectedWeeks={selectedWeeks} />
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-all cursor-pointer"
                        title="Print report"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                    </button>
                    <ExportTableButton tableId="weekly-wo-jobno-table" filename={`Weekly_Work_Order_Report_Job_No_Amount_${fileTag}.xlsx`} />
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-300 shadow-sm rounded-lg">
                <table id="weekly-wo-jobno-table" className="w-full text-left border-collapse text-xs font-medium">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-300">
                            <th className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300 text-center w-16">Sr. No.</th>
                            <th className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300">Package Name</th>
                            <th className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300 text-right">Job No. Amount in Lac</th>
                            <th className="px-3 py-2.5 font-bold text-slate-700 text-center w-40">Work Order Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {rows.length > 0 ? (
                            rows.map((row, idx) => {
                                const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
                                const jobNo = jobNoAmountLac(row.tenderAmount);
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
                                        <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-right font-mono font-semibold">{jobNo != null ? jobNo : '-'}</td>
                                        <td className="px-3 py-2 text-slate-600 text-center">{formatShortDate(row.workOrderDate)}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                    No work orders issued in this week.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot>
                            <tr className="bg-slate-100 border-t-2 border-slate-300">
                                <td colSpan={2} className="px-3 py-2.5 text-right font-bold text-slate-800 border-r border-slate-200">
                                    Total
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                                    {totalJobNoAmount}
                                </td>
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
