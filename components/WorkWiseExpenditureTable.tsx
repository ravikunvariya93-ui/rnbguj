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
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden mb-8">
            <div className={`px-6 py-5 bg-slate-50 flex items-center justify-between ${isExpanded ? 'border-b border-gray-200' : ''}`}>
                <div className="flex items-center gap-2">
                    <LayoutList className="w-5 h-5 text-slate-700" />
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Work-wise Expenditure</h2>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-medium ml-1">
                        {works.length} works
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-300 shadow-xs"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                            Collapse Work Breakdown
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                            Expand Work Breakdown ({works.length})
                        </>
                    )}
                </button>
            </div>
            {isExpanded && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider w-24">SR. No.</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Name of Work</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider w-48">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {works.map((work: any, index: number) => (
                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3.5 text-sm text-slate-700 font-medium whitespace-nowrap">{work.srNo}</td>
                                    <td className="px-4 py-3.5 text-sm text-slate-600">{work.nameOfWork}</td>
                                    <td className="px-4 py-3.5 text-sm text-slate-800 font-mono">₹{work.amount?.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                            <tr className="border-b border-slate-200">
                                <td colSpan={2} className="px-4 py-2.5 text-right text-sm text-slate-700 uppercase tracking-wider font-semibold">Total Amount:</td>
                                <td className="px-4 py-2.5 text-sm text-slate-800 font-mono font-bold">₹{totalAmount.toFixed(2)}</td>
                            </tr>
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <td colSpan={2} className="px-4 py-2 text-right text-sm text-slate-600 uppercase tracking-wider font-normal">{pct}% {dir}:</td>
                                <td className="px-4 py-2 text-sm text-slate-600 font-mono font-normal">
                                    {dir === 'Below' ? '-₹' : '₹'}{adjAmount.toFixed(2)}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td colSpan={2} className="px-4 py-2.5 text-right text-sm text-slate-700 uppercase tracking-wider font-semibold">Net Amount:</td>
                                <td className="px-4 py-2.5 text-sm text-emerald-700 font-mono font-bold">₹{netAmount.toFixed(2)}</td>
                            </tr>
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <td colSpan={2} className="px-4 py-2 text-right text-sm text-slate-600 uppercase tracking-wider font-normal">
                                    Add 18% GST{isCess ? ' (Cess Applied)' : ''}:
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-600 font-mono font-normal">₹{gstAmount.toFixed(2)}</td>
                            </tr>
                            <tr className="bg-emerald-50 font-bold border-b border-slate-200">
                                <td colSpan={2} className="px-4 py-3 text-right text-sm text-emerald-800 uppercase tracking-wider">Net Payable Amount:</td>
                                <td className="px-4 py-3 text-sm text-emerald-900 font-mono text-lg font-extrabold">₹{payableAmount.toFixed(2)}</td>
                            </tr>
                            <tr className="bg-emerald-100 font-bold border-b-4 border-emerald-300">
                                <td colSpan={2} className="px-4 py-3 text-right text-sm text-emerald-900 tracking-wider">Say Amount:</td>
                                <td className="px-4 py-3 text-sm text-emerald-950 font-mono text-lg font-extrabold">₹{Math.floor(payableAmount).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
