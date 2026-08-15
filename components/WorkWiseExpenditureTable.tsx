'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LayoutList } from 'lucide-react';

interface WorkWiseExpenditureTableProps {
    works: any[];
    tender?: any;
    labourCessApplicable?: boolean;
    initialExpanded?: boolean;
}

export default function WorkWiseExpenditureTable({
    works = [],
    tender,
    labourCessApplicable = false,
    initialExpanded = false
}: WorkWiseExpenditureTableProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);

    if (!works || works.length === 0) return null;

    const pct = tender?.aboveBelowPercentage || 0;
    const dir = tender?.aboveBelowInWord || 'Above';
    const isCess = labourCessApplicable;

    const totalAmount = works.reduce((s: number, w: any) => s + (w.amount || 0), 0);
    const pctMultiplier = pct / 100;
    const adjAmount = totalAmount * pctMultiplier;
    const netAmount = dir === 'Below' ? totalAmount - adjAmount : totalAmount + adjAmount;
    
    const gstBase = isCess ? netAmount * 0.99 : netAmount;
    const gstAmount = gstBase * 0.18;
    const payableAmount = netAmount + gstAmount;

    return (
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-xs mb-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                    <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                        <LayoutList className="w-4 h-4" />
                    </span>
                    <h2 className="text-base font-bold text-slate-800">Work-wise Expenditure</h2>
                    <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                        {works.length} works
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
                            Collapse Work Breakdown
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Expand Work Breakdown ({works.length})
                        </>
                    )}
                </button>
            </div>
            {isExpanded && (
                <div className="overflow-x-auto border border-emerald-300 rounded-xl shadow-2xs">
                    <table className="excel-table">
                        <thead>
                            <tr className="bg-emerald-100/90 text-emerald-950">
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950 w-24">SR. No.</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950">Name of Work</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950 w-48">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-200/60 bg-white">
                            {works.map((work: any, index: number) => (
                                <tr key={index} className="hover:bg-emerald-50/50 transition-colors">
                                    <td className="border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">{work.srNo}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">{work.nameOfWork}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-xs font-bold font-mono text-slate-800 text-right">₹{work.amount?.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-emerald-50/90 font-semibold border-t-2 border-emerald-300">
                            <tr className="border-b border-emerald-200">
                                <td colSpan={2} className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Total Amount:</td>
                                <td className="px-3 py-2.5 text-xs text-slate-800 font-mono font-bold text-right">₹{totalAmount.toFixed(2)}</td>
                            </tr>
                            <tr className="border-b border-emerald-200 bg-emerald-50/40">
                                <td colSpan={2} className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">{pct}% {dir}:</td>
                                <td className="px-3 py-2 text-xs text-slate-600 font-mono font-bold text-right">
                                    {dir === 'Below' ? '-₹' : '₹'}{adjAmount.toFixed(2)}
                                </td>
                            </tr>
                            <tr className="border-b border-emerald-200">
                                <td colSpan={2} className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Net Amount:</td>
                                <td className="px-3 py-2.5 text-xs text-emerald-800 font-mono font-bold text-right">₹{netAmount.toFixed(2)}</td>
                            </tr>
                            <tr className="border-b border-emerald-200 bg-emerald-50/40">
                                <td colSpan={2} className="px-3 py-2 text-right text-xs text-slate-600 uppercase tracking-wider">
                                    Add 18% GST{isCess ? ' (Cess Applied)' : ''}:
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-600 font-mono font-bold text-right">₹{gstAmount.toFixed(2)}</td>
                            </tr>
                            <tr className="bg-emerald-100/70 font-bold border-b border-emerald-200">
                                <td colSpan={2} className="px-3 py-3 text-right text-xs text-emerald-900 uppercase tracking-wider font-extrabold">Net Payable Amount:</td>
                                <td className="px-3 py-3 text-xs text-emerald-950 font-mono text-right font-black">₹{payableAmount.toFixed(2)}</td>
                            </tr>
                            <tr className="bg-emerald-200/80 font-bold border-b-4 border-emerald-400">
                                <td colSpan={2} className="px-3 py-3 text-right text-xs text-emerald-950 font-black tracking-wider uppercase">Say Amount:</td>
                                <td className="px-3 py-3 text-xs text-emerald-950 font-mono text-right font-black text-sm">₹{Math.floor(payableAmount).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
