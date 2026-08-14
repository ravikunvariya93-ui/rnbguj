'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LayoutList } from 'lucide-react';

interface BillAbstractTableProps {
    items: any[];
    tender?: any;
    labourCessApplicable?: boolean;
    initialExpanded?: boolean;
}

export default function BillAbstractTable({
    items = [],
    tender,
    labourCessApplicable = false,
    initialExpanded = false
}: BillAbstractTableProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);

    const totalUptoDate = items.reduce((s: number, i: any) => s + (i.uptoDateAmount || 0), 0);
    const totalPrevPaid = items.reduce((s: number, i: any) => s + (i.previousPaidAmount || 0), 0);
    const totalToBePaid = items.reduce((s: number, i: any) => s + (i.toBePaidAmount || 0), 0);

    const pct = tender?.aboveBelowPercentage || 0;
    const dir = tender?.aboveBelowInWord || 'Above';
    const isCess = labourCessApplicable;

    const uptoDateAdj = totalUptoDate * (pct / 100);
    const prevPaidAdj = totalPrevPaid * (pct / 100);
    const toBePaidAdj = totalToBePaid * (pct / 100);

    const uptoDateNet = dir === 'Below' ? totalUptoDate - uptoDateAdj : totalUptoDate + uptoDateAdj;
    const prevPaidNet = dir === 'Below' ? totalPrevPaid - prevPaidAdj : totalPrevPaid + prevPaidAdj;
    const toBePaidNet = dir === 'Below' ? totalToBePaid - toBePaidAdj : totalToBePaid + toBePaidAdj;

    const uptoDateGstBase = isCess ? uptoDateNet * 0.99 : uptoDateNet;
    const prevPaidGstBase = isCess ? prevPaidNet * 0.99 : prevPaidNet;
    const toBePaidGstBase = isCess ? toBePaidNet * 0.99 : toBePaidNet;

    const uptoDateGst = uptoDateGstBase * 0.18;
    const prevPaidGst = prevPaidGstBase * 0.18;
    const toBePaidGst = toBePaidGstBase * 0.18;

    const uptoDatePayable = uptoDateNet + uptoDateGst;
    const prevPaidPayable = prevPaidNet + prevPaidGst;
    const toBePaidPayable = toBePaidNet + toBePaidGst;

    return (
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutList className="w-5 h-5 text-slate-700" />
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bill Abstract (Line Items)</h2>
                    {items.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-medium ml-1">
                            {items.length} Items
                        </span>
                    )}
                </div>
                {items.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-300 shadow-xs"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="w-4 h-4 text-slate-500" />
                                Collapse Line Items
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                                Expand Line Items ({items.length})
                            </>
                        )}
                    </button>
                )}
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">No.</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider w-1/4">Description</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Unit</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider bg-slate-100">Qty (BOQ)</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Rate (₹)</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-700 bg-blue-50 tracking-wider border-l border-blue-100 min-w-[140px]">Upto Date Qty</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-700 bg-blue-50 tracking-wider border-r border-blue-100 min-w-[140px]">Part Rate (₹)</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider bg-slate-100">Upto Date Amt</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-amber-700 bg-amber-50 tracking-wider">Prev Paid Amt</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 bg-emerald-50 tracking-wider">To Be Paid</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
                                    No abstract items recorded for this bill.
                                </td>
                            </tr>
                        ) : !isExpanded ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-3.5 text-center text-xs text-slate-500 bg-slate-50/60 font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setIsExpanded(true)}
                                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                        {items.length} line items collapsed. Click to expand line item breakdown.
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            items.map((item: any, index: number) => (
                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-4 text-sm text-slate-700 font-medium whitespace-nowrap">{item.itemNo}</td>
                                    <td className="px-4 py-4 text-xs text-slate-600 line-clamp-3" title={item.description}>{item.description}</td>
                                    <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">{item.unit}</td>
                                    <td className="px-4 py-4 text-sm text-slate-700 font-mono font-medium bg-slate-50/50">{item.boqQuantity != null ? Number(item.boqQuantity).toFixed(3) : '-'}</td>
                                    <td className="px-4 py-4 text-sm text-slate-700 font-mono">{item.fullRate?.toFixed(2)}</td>
                                    
                                    <td className="px-4 py-4 text-sm text-blue-800 font-mono font-medium border-l border-blue-100 bg-blue-50/30">
                                        {item.quantity?.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-blue-800 font-mono font-medium border-r border-blue-100 bg-blue-50/30">
                                        {item.partRate?.toFixed(2)}
                                    </td>
                                    
                                    <td className="px-4 py-4 text-sm text-slate-800 font-mono bg-slate-50">{item.uptoDateAmount?.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-sm text-amber-800 font-mono bg-amber-50/30">{item.previousPaidAmount?.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-sm font-bold text-emerald-700 font-mono bg-emerald-50/50">
                                        {item.toBePaidAmount?.toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {items.length > 0 && (
                        <tfoot className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                            {/* Row 1: Total Amount */}
                            <tr className="border-b border-slate-200">
                                <td colSpan={7} className="px-4 py-3.5 text-right text-sm text-slate-700 uppercase tracking-wider font-semibold">Total Amount:</td>
                                <td className="px-4 py-3.5 text-sm text-slate-800 font-mono">
                                    {totalUptoDate.toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-amber-700 font-mono">
                                    {totalPrevPaid.toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-emerald-700 font-mono text-lg border-x border-emerald-200 bg-emerald-100/50 font-bold">
                                    ₹{totalToBePaid.toFixed(2)}
                                </td>
                            </tr>
                            {/* Row 2: Tender percentage */}
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <td colSpan={7} className="px-4 py-3 text-right text-sm text-slate-600 uppercase tracking-wider font-normal">{pct}% {dir}:</td>
                                <td className="px-4 py-3 text-sm text-slate-600 font-mono font-normal">
                                    {dir === 'Below' ? '-' : ''}{uptoDateAdj.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-amber-600 font-mono font-normal">
                                    {dir === 'Below' ? '-' : ''}{prevPaidAdj.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-emerald-600 font-mono border-x border-slate-200 font-bold">
                                    {dir === 'Below' ? '-₹' : '₹'}{toBePaidAdj.toFixed(2)}
                                </td>
                            </tr>
                            {/* Row 3: Net Amount */}
                            <tr className="border-b border-slate-200">
                                <td colSpan={7} className="px-4 py-3.5 text-right text-sm text-slate-700 uppercase tracking-wider">Net Amount:</td>
                                <td className="px-4 py-3.5 text-sm text-slate-800 font-mono">
                                    {uptoDateNet.toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-amber-700 font-mono">
                                    {prevPaidNet.toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-emerald-700 font-mono border-x border-slate-200 font-bold">
                                    ₹{toBePaidNet.toFixed(2)}
                                </td>
                            </tr>
                            {/* Row 4: Add 18% GST */}
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <td colSpan={7} className="px-4 py-3 text-right text-sm text-slate-600 uppercase tracking-wider font-normal">Add 18% GST{isCess ? ' (Cess Applied)' : ''}:</td>
                                <td className="px-4 py-3 text-sm text-slate-600 font-mono font-normal">
                                    {uptoDateGst.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-amber-600 font-mono font-normal">
                                    {prevPaidGst.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-emerald-600 font-mono border-x border-slate-200 font-bold">
                                    ₹{toBePaidGst.toFixed(2)}
                                </td>
                            </tr>
                            {/* Row 5: Net Payable Amount */}
                            <tr className="bg-emerald-50 font-bold border-b border-slate-200">
                                <td colSpan={7} className="px-4 py-4 text-right text-sm text-emerald-800 uppercase tracking-wider">Net Payable Amount:</td>
                                <td className="px-4 py-4 text-sm text-emerald-800 font-mono text-base font-bold">
                                    {uptoDatePayable.toFixed(2)}
                                </td>
                                <td className="px-4 py-4 text-sm text-amber-800 font-mono text-base font-bold">
                                    {prevPaidPayable.toFixed(2)}
                                </td>
                                <td className="px-4 py-4 text-sm text-emerald-905 font-mono text-lg border-x border-emerald-200 bg-emerald-100/50 font-extrabold">
                                    ₹{toBePaidPayable.toFixed(2)}
                                </td>
                            </tr>
                            {/* Row 6: Say Amount */}
                            <tr className="bg-emerald-100 font-bold border-b-4 border-emerald-300">
                                <td colSpan={7} className="px-4 py-3.5 text-right text-sm text-emerald-900 tracking-wider">Say Amount:</td>
                                <td className="px-4 py-3.5 text-sm text-emerald-900 font-mono">
                                    {Math.floor(uptoDatePayable).toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-amber-900 font-mono">
                                    {Math.floor(prevPaidPayable).toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-emerald-955 font-mono text-lg border-x border-emerald-300 bg-emerald-200/50 font-extrabold">
                                    ₹{Math.floor(toBePaidPayable).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
