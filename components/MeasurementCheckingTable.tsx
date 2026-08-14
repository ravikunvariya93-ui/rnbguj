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
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden mb-8">
            <div className={`px-6 py-5 bg-slate-50 flex items-center justify-between ${isExpanded ? 'border-b border-gray-200' : ''}`}>
                <div className="flex items-center gap-2">
                    <LayoutList className="w-5 h-5 text-slate-700" />
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Measurement Checking</h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-1">
                        {records.length} records
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
                            Collapse Measurement Breakdown
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                            Expand Measurement Breakdown ({records.length})
                        </>
                    )}
                </button>
            </div>
            
            {isExpanded && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Date</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Item No.</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">MB Page No.</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700 tracking-wider">QTY.</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700 tracking-wider">Rate (₹)</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700 tracking-wider bg-slate-100">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {records.map((mc: any, index: number) => (
                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">
                                        {mc.date ? new Date(mc.date).toLocaleDateString('en-GB') : '-'}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-700 font-medium whitespace-nowrap">
                                        {mc.itemNo}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap">
                                        {mc.mbPageNo}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-700 text-right font-mono">
                                        {mc.quantity?.toFixed(3)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-750 text-right font-mono">
                                        {mc.rate?.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 text-sm font-bold text-slate-800 text-right font-mono bg-slate-50">
                                        {mc.amount?.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {billItems.length > 0 && (
                            <tfoot className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                                <tr className="border-b border-slate-200">
                                    <td colSpan={5} className="px-4 py-2 text-right text-xs text-slate-500 uppercase tracking-wider font-medium">Required Measurement Amount (10% of Total Amount):</td>
                                    <td className="px-4 py-2 text-xs font-mono font-bold text-right text-slate-700">₹{requiredMCAmount.toFixed(2)}</td>
                                </tr>
                                <tr className={`border-b border-slate-200 ${isMet ? "bg-emerald-50" : "bg-rose-50"}`}>
                                    <td colSpan={5} className={`px-4 py-3 text-right text-sm uppercase font-bold ${isMet ? "text-emerald-800" : "text-rose-800"}`}>Total Measurement Amount:</td>
                                    <td className={`px-4 py-3 text-sm font-mono font-extrabold text-right ${isMet ? "text-emerald-900" : "text-rose-900"}`}>₹{totalMCAmount.toFixed(2)}</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td colSpan={5} className="px-4 py-2 text-right text-xs text-slate-500 uppercase tracking-wider font-medium">Difference (+ / -):</td>
                                    <td className={`px-4 py-2 text-xs font-mono font-bold text-right ${diff >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
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
