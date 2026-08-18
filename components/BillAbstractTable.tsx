'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LayoutList, Download } from 'lucide-react';
import { downloadPraisaWorkOrderExcel, downloadPraisaExcessWorkOrderExcel } from '@/lib/exportPraisaWorkOrder';

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

    const handleDownloadPraisa = () => {
        downloadPraisaWorkOrderExcel(items, 'WorkOrder.xls');
    };

    const handleDownloadPraisaExcess = () => {
        downloadPraisaExcessWorkOrderExcel(items, 'WorkOrder_Excess.xls');
    };

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
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-xs mb-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-100 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                        <LayoutList className="w-4 h-4" />
                    </span>
                    <h2 className="text-base font-bold text-slate-800">Bill Abstract (Line Items)</h2>
                    {items.length > 0 && (
                        <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                            {items.length} Items
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {items.length > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={handleDownloadPraisa}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                                title="Download PRAISA Work Order Excel (All Items)"
                            >
                                <Download className="w-3.5 h-3.5" />
                                PRAISA Work Order
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadPraisaExcess}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                                title="Download PRAISA Excess Work Order Excel (Excess Items Only)"
                            >
                                <Download className="w-3.5 h-3.5" />
                                PRAISA Excess Work Order
                            </button>
                        </>
                    )}
                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-emerald-300"
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    Collapse Line Items
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    Expand Line Items ({items.length})
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
            
            <div className="overflow-x-auto border border-emerald-300 rounded-xl shadow-2xs">
                <table className="excel-table">
                    <thead>
                        <tr className="bg-emerald-100/90 text-emerald-950">
                            <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950">No.</th>
                            <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950 min-w-[200px]">Description</th>
                            <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-center text-xs font-bold text-emerald-950">Unit</th>
                            <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">Qty (BOQ)</th>
                            <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">Rate (₹)</th>
                            <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950 min-w-[120px]">Upto Date Qty</th>
                            <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950 min-w-[120px]">Part Rate (₹)</th>
                            <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">Upto Date Amt</th>
                            <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">Prev Paid Amt</th>
                            <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">To Be Paid</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-200/60 bg-white">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-sm text-slate-500">
                                    No abstract items recorded for this bill.
                                </td>
                            </tr>
                        ) : !isExpanded ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-3.5 text-center text-xs text-slate-500 bg-emerald-50/40 font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setIsExpanded(true)}
                                        className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                        {items.length} line items collapsed. Click to expand line item breakdown.
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            items.map((item: any, index: number) => (
                                <tr key={index} className="hover:bg-emerald-50/50 transition-colors">
                                    <td className="border border-slate-200 px-3 py-2 text-sm text-slate-700 font-mono font-bold whitespace-nowrap">{item.itemNo}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-600 line-clamp-3 font-medium" title={item.description}>{item.description}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500 text-center whitespace-nowrap">{item.unit}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-sm text-slate-700 font-mono font-medium text-right bg-slate-50/50">{item.boqQuantity != null ? Number(item.boqQuantity).toFixed(3) : '-'}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-sm text-slate-700 font-mono text-right">{item.fullRate?.toFixed(2)}</td>
                                    
                                    <td className="border border-slate-200 px-3 py-2 text-sm text-slate-800 font-mono font-medium text-right bg-emerald-50/30">
                                        {item.quantity?.toFixed(2)}
                                    </td>
                                    <td className="border border-slate-200 px-3 py-2 text-sm text-slate-800 font-mono font-medium text-right bg-emerald-50/30">
                                        {item.partRate?.toFixed(2)}
                                    </td>
                                    
                                    <td className="border border-slate-200 px-3 py-2 text-sm text-slate-800 font-mono text-right bg-slate-50/50">{item.uptoDateAmount?.toFixed(2)}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-sm text-amber-700 font-mono text-right bg-amber-50/30">{item.previousPaidAmount?.toFixed(2)}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-sm font-bold text-emerald-800 font-mono text-right bg-emerald-100/50">
                                        {item.toBePaidAmount?.toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {items.length > 0 && (
                        <tfoot className="bg-emerald-50/90 font-semibold border-t-2 border-emerald-300">
                            {/* Row 1: Total Amount */}
                            <tr className="border-b border-emerald-200">
                                <td colSpan={7} className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Total Amount:</td>
                                <td className="px-3 py-2.5 text-xs text-slate-800 font-mono font-bold text-right">
                                    {totalUptoDate.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-amber-700 font-mono font-bold text-right">
                                    {totalPrevPaid.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-emerald-800 font-mono text-right border-x border-emerald-200 bg-emerald-100 font-extrabold">
                                    ₹{totalToBePaid.toFixed(2)}
                                </td>
                            </tr>
                            {/* Row 2: Tender percentage */}
                            <tr className="border-b border-emerald-200 bg-emerald-50/40">
                                <td colSpan={7} className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">{pct}% {dir}:</td>
                                <td className="px-3 py-2 text-xs text-slate-600 font-mono text-right">
                                    {dir === 'Below' ? '-' : ''}{uptoDateAdj.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-xs text-amber-600 font-mono text-right">
                                    {dir === 'Below' ? '-' : ''}{prevPaidAdj.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-xs text-emerald-700 font-mono text-right border-x border-emerald-200 font-bold">
                                    {dir === 'Below' ? '-₹' : '₹'}{toBePaidAdj.toFixed(2)}
                                </td>
                            </tr>
                            {/* Row 3: Net Amount */}
                            <tr className="border-b border-emerald-200">
                                <td colSpan={7} className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Net Amount:</td>
                                <td className="px-3 py-2.5 text-xs text-slate-800 font-mono font-bold text-right">
                                    {uptoDateNet.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-amber-700 font-mono font-bold text-right">
                                    {prevPaidNet.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-emerald-800 font-mono text-right border-x border-emerald-200 font-extrabold">
                                    ₹{toBePaidNet.toFixed(2)}
                                </td>
                            </tr>
                            {/* Row 4: Add 18% GST */}
                            <tr className="border-b border-emerald-200 bg-emerald-50/40">
                                <td colSpan={7} className="px-3 py-2 text-right text-xs text-slate-600 uppercase tracking-wider">Add 18% GST{isCess ? ' (Cess Applied)' : ''}:</td>
                                <td className="px-3 py-2 text-xs text-slate-600 font-mono text-right">
                                    {uptoDateGst.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-xs text-amber-600 font-mono text-right">
                                    {prevPaidGst.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-xs text-emerald-700 font-mono text-right border-x border-emerald-200 font-bold">
                                    ₹{toBePaidGst.toFixed(2)}
                                </td>
                            </tr>
                            {/* Row 5: Net Payable Amount */}
                            <tr className="bg-emerald-100/70 font-bold border-b border-emerald-200">
                                <td colSpan={7} className="px-3 py-3 text-right text-xs text-emerald-900 uppercase tracking-wider font-extrabold">Net Payable Amount:</td>
                                <td className="px-3 py-3 text-xs text-emerald-900 font-mono text-right font-bold">
                                    {uptoDatePayable.toFixed(2)}
                                </td>
                                <td className="px-3 py-3 text-xs text-amber-900 font-mono text-right font-bold">
                                    {prevPaidPayable.toFixed(2)}
                                </td>
                                <td className="px-3 py-3 text-xs text-emerald-950 font-mono text-right border-x border-emerald-300 bg-emerald-200/60 font-black">
                                    ₹{toBePaidPayable.toFixed(2)}
                                </td>
                            </tr>
                            {/* Row 6: Say Amount */}
                            <tr className="bg-emerald-200/80 font-bold border-b-4 border-emerald-400">
                                <td colSpan={7} className="px-3 py-3 text-right text-xs text-emerald-950 font-black tracking-wider uppercase">Say Amount:</td>
                                <td className="px-3 py-3 text-xs text-emerald-950 font-mono text-right font-extrabold">
                                    {Math.floor(uptoDatePayable).toFixed(2)}
                                </td>
                                <td className="px-3 py-3 text-xs text-amber-950 font-mono text-right font-extrabold">
                                    {Math.floor(prevPaidPayable).toFixed(2)}
                                </td>
                                <td className="px-3 py-3 text-xs text-emerald-950 font-mono text-right border-x border-emerald-400 bg-emerald-300/60 font-black text-sm">
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
