'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LayoutList } from 'lucide-react';

interface MeasurementCheckingTableProps {
    records: any[];
    billItems: any[];
    initialExpanded?: boolean;
}

export default function MeasurementCheckingTable({
    records = [],
    billItems = [],
    initialExpanded = false
}: MeasurementCheckingTableProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);

    if (!records || records.length === 0) return null;

    const totalMCAmount = records.reduce((s: number, mc: any) => s + (mc.amount || 0), 0);
    const totalBillAmount = billItems.reduce((s: number, i: any) => s + (i.uptoDateAmount || 0), 0);
    const requiredMCAmount = totalBillAmount * 0.10;
    const isMet = totalMCAmount >= requiredMCAmount;
    const diff = totalMCAmount - requiredMCAmount;

    return (
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-xs mb-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                    <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                        <LayoutList className="w-4 h-4" />
                    </span>
                    <h2 className="text-base font-bold text-slate-800">Measurement Checking (10% Checking)</h2>
                    <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                        {records.length} records
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-emerald-300"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Collapse Measurement Breakdown
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Expand Measurement Breakdown ({records.length})
                        </>
                    )}
                </button>
            </div>
            
            {isExpanded && (
                <div className="overflow-x-auto border border-emerald-300 rounded-xl shadow-2xs">
                    <table className="excel-table">
                        <thead>
                            <tr className="bg-emerald-100/90 text-emerald-950">
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950">Date</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950">Item No.</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950">MB Page No.</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">QTY.</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">Rate (₹)</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-200/60 bg-white">
                            {records.map((mc: any, index: number) => (
                                <tr key={index} className="hover:bg-emerald-50/50 transition-colors">
                                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
                                        {mc.date ? new Date(mc.date).toLocaleDateString('en-GB') : '-'}
                                    </td>
                                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-700 font-mono font-bold whitespace-nowrap">
                                        {mc.itemNo}
                                    </td>
                                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                                        {mc.mbPageNo}
                                    </td>
                                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-700 text-right font-mono">
                                        {mc.quantity?.toFixed(3)}
                                    </td>
                                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-700 text-right font-mono">
                                        {mc.rate?.toFixed(2)}
                                    </td>
                                    <td className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 text-right font-mono bg-slate-50">
                                        {mc.amount?.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {billItems.length > 0 && (
                            <tfoot className="bg-emerald-50/90 font-semibold border-t-2 border-emerald-300">
                                <tr className="border-b border-emerald-200">
                                    <td colSpan={5} className="px-3 py-2 text-right text-xs text-slate-700 font-bold uppercase tracking-wider">Required Measurement Amount (10% of Total Amount):</td>
                                    <td className="px-3 py-2 text-xs font-mono font-bold text-right text-slate-800">₹{requiredMCAmount.toFixed(2)}</td>
                                </tr>
                                <tr className={`border-b border-emerald-200 ${isMet ? "bg-emerald-100/80" : "bg-rose-100/80"}`}>
                                    <td colSpan={5} className={`px-3 py-2.5 text-right text-xs uppercase font-extrabold ${isMet ? "text-emerald-950" : "text-rose-950"}`}>Total Measurement Amount:</td>
                                    <td className={`px-3 py-2.5 text-xs font-mono font-black text-right ${isMet ? "text-emerald-950" : "text-rose-950"}`}>₹{totalMCAmount.toFixed(2)}</td>
                                </tr>
                                <tr className="bg-emerald-50/40">
                                    <td colSpan={5} className="px-3 py-2 text-right text-xs text-slate-700 font-bold uppercase tracking-wider">Difference (+ / -):</td>
                                    <td className={`px-3 py-2 text-xs font-mono font-bold text-right ${diff >= 0 ? "text-emerald-800" : "text-rose-700"}`}>
                                        {diff >= 0 ? '+' : ''}₹{diff.toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}
        </div>
    );
}
