'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LayoutList } from 'lucide-react';

interface ExcessSavingTableProps {
    items: any[];
    title?: string;
    initialExpanded?: boolean;
}

export default function ExcessSavingTable({
    items = [],
    title = 'Excess / Saving Statement',
    initialExpanded = false
}: ExcessSavingTableProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);

    const totalTender = items.reduce((s: number, i: any) => s + ((Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0))), 0);
    const totalBill = items.reduce((s: number, i: any) => s + (Number(i.uptoDateAmount || (Number(i.quantity || 0) * Number(i.partRate || i.fullRate || 0)))), 0);
    
    const totalExcess = items.reduce((s: number, i: any) => {
        const tAmt = (Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0));
        const bAmt = Number(i.uptoDateAmount || (Number(i.quantity || 0) * Number(i.partRate || i.fullRate || 0)));
        const diff = bAmt - tAmt;
        return s + (diff > 0 ? diff : 0);
    }, 0);

    const totalSaving = items.reduce((s: number, i: any) => {
        const tAmt = (Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0));
        const bAmt = Number(i.uptoDateAmount || (Number(i.quantity || 0) * Number(i.partRate || i.fullRate || 0)));
        const diff = bAmt - tAmt;
        return s + (diff < 0 ? Math.abs(diff) : 0);
    }, 0);

    const netDiff = totalExcess - totalSaving;

    return (
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutList className="w-5 h-5 text-slate-700" />
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
                    {items.length > 0 && (
                        <span className="text-xs bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-medium ml-1">
                            {items.length} items
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
                                Collapse Item Details
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                                Expand Item Details ({items.length})
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                        <tr className="border-b border-slate-200">
                            <th rowSpan={2} className="px-3 py-3 text-left border-r border-slate-200">Item No.</th>
                            <th rowSpan={2} className="px-3 py-3 text-left border-r border-slate-200 min-w-[200px]">Description</th>
                            <th rowSpan={2} className="px-3 py-3 text-center border-r border-slate-200">Unit</th>
                            
                            <th colSpan={3} className="px-3 py-2 text-center bg-blue-50/80 text-blue-900 border-r border-slate-200 border-b border-blue-200 font-bold">As per Tender</th>
                            <th colSpan={3} className="px-3 py-2 text-center bg-indigo-50/80 text-indigo-900 border-r border-slate-200 border-b border-indigo-200 font-bold">As per Bill</th>
                            <th colSpan={2} className="px-3 py-2 text-center bg-rose-50/80 text-rose-900 border-r border-slate-200 border-b border-rose-200 font-bold">Excess</th>
                            <th colSpan={2} className="px-3 py-2 text-center bg-emerald-50/80 text-emerald-900 border-b border-emerald-200 font-bold">Saving</th>
                        </tr>
                        <tr className="border-b border-slate-200">
                            <th className="px-3 py-2 text-right bg-blue-50/40 text-blue-800">Qty</th>
                            <th className="px-3 py-2 text-right bg-blue-50/40 text-blue-800">Rate (₹)</th>
                            <th className="px-3 py-2 text-right bg-blue-50/40 text-blue-800 border-r border-slate-200">Amount (₹)</th>
                            
                            <th className="px-3 py-2 text-right bg-indigo-50/40 text-indigo-800">Qty</th>
                            <th className="px-3 py-2 text-right bg-indigo-50/40 text-indigo-800">Rate (Payable) (₹)</th>
                            <th className="px-3 py-2 text-right bg-indigo-50/40 text-indigo-800 border-r border-slate-200">Amount (₹)</th>
                            
                            <th className="px-3 py-2 text-right bg-rose-50/40 text-rose-800">Qty</th>
                            <th className="px-3 py-2 text-right bg-rose-50/40 text-rose-800 border-r border-slate-200">Amount (₹)</th>
                            
                            <th className="px-3 py-2 text-right bg-emerald-50/40 text-emerald-800">Qty</th>
                            <th className="px-3 py-2 text-right bg-emerald-50/40 text-emerald-800">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={13} className="px-6 py-8 text-center text-sm text-gray-500">
                                    No line items available to calculate Excess / Saving Statement.
                                </td>
                            </tr>
                        ) : !isExpanded ? (
                            <tr>
                                <td colSpan={13} className="px-4 py-3.5 text-center text-xs text-slate-500 bg-slate-50/60 font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setIsExpanded(true)}
                                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                        {items.length} line items collapsed. Click to expand item breakdown.
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            items.map((item: any, index: number) => {
                                const tenderQty = Number(item.boqQuantity || 0);
                                const tenderRate = Number(item.fullRate || 0);
                                const tenderAmt = tenderQty * tenderRate;

                                const billQty = Number(item.quantity || 0);
                                const billRate = Number(item.partRate != null ? item.partRate : item.fullRate || 0);
                                const billAmt = Number(item.uptoDateAmount != null ? item.uptoDateAmount : (billQty * billRate));

                                const diffQty = billQty - tenderQty;
                                const diffAmt = billAmt - tenderAmt;

                                const excessQty = diffQty > 0 ? diffQty : 0;
                                const excessAmt = diffAmt > 0 ? diffAmt : 0;

                                const savingQty = diffQty < 0 ? Math.abs(diffQty) : 0;
                                const savingAmt = diffAmt < 0 ? Math.abs(diffAmt) : 0;

                                return (
                                    <tr key={index} className="hover:bg-slate-50 font-mono text-xs">
                                        <td className="px-3 py-2 text-left font-sans text-slate-700 font-medium border-r border-slate-200">{item.itemNo}</td>
                                        <td className="px-3 py-2 text-left font-sans text-slate-600 border-r border-slate-200 max-w-[240px] truncate" title={item.description}>{item.description}</td>
                                        <td className="px-3 py-2 text-center font-sans text-slate-500 border-r border-slate-200">{item.unit}</td>
                                        
                                        {/* Tender */}
                                        <td className="px-3 py-2 text-right text-slate-700">{tenderQty ? tenderQty.toFixed(2) : '0.00'}</td>
                                        <td className="px-3 py-2 text-right text-slate-700">{tenderRate ? tenderRate.toFixed(2) : '0.00'}</td>
                                        <td className="px-3 py-2 text-right text-blue-900 font-semibold border-r border-slate-200">{tenderAmt ? tenderAmt.toFixed(2) : '0.00'}</td>
                                        
                                        {/* Bill */}
                                        <td className="px-3 py-2 text-right text-slate-700">{billQty ? billQty.toFixed(2) : '0.00'}</td>
                                        <td className="px-3 py-2 text-right text-slate-700">{billRate ? billRate.toFixed(2) : '0.00'}</td>
                                        <td className="px-3 py-2 text-right text-indigo-900 font-semibold border-r border-slate-200">{billAmt ? billAmt.toFixed(2) : '0.00'}</td>
                                        
                                        {/* Excess */}
                                        <td className="px-3 py-2 text-right text-rose-700">{excessQty > 0 ? excessQty.toFixed(2) : '-'}</td>
                                        <td className="px-3 py-2 text-right text-rose-900 font-bold border-r border-slate-200">{excessAmt > 0 ? `₹${excessAmt.toFixed(2)}` : '-'}</td>
                                        
                                        {/* Saving */}
                                        <td className="px-3 py-2 text-right text-emerald-700">{savingQty > 0 ? savingQty.toFixed(2) : '-'}</td>
                                        <td className="px-3 py-2 text-right text-emerald-900 font-bold">{savingAmt > 0 ? `₹${savingAmt.toFixed(2)}` : '-'}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {items.length > 0 && (
                        <tfoot className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300">
                            <tr>
                                <td colSpan={3} className="px-3 py-2.5 text-right font-sans text-slate-800 border-r border-slate-200 uppercase tracking-wider">Total:</td>
                                <td colSpan={2} className="px-3 py-2.5"></td>
                                <td className="px-3 py-2.5 text-right font-mono text-blue-900 border-r border-slate-200">₹{totalTender.toFixed(2)}</td>
                                <td colSpan={2} className="px-3 py-2.5"></td>
                                <td className="px-3 py-2.5 text-right font-mono text-indigo-900 border-r border-slate-200">₹{totalBill.toFixed(2)}</td>
                                <td></td>
                                <td className="px-3 py-2.5 text-right font-mono text-rose-900 border-r border-slate-200">₹{totalExcess.toFixed(2)}</td>
                                <td></td>
                                <td className="px-3 py-2.5 text-right font-mono text-emerald-900">₹{totalSaving.toFixed(2)}</td>
                            </tr>
                            <tr className="bg-slate-200 text-slate-900">
                                <td colSpan={9} className="px-3 py-2 text-right font-sans uppercase font-bold tracking-wider border-r border-slate-300">
                                    Net Statement Summary ({netDiff >= 0 ? 'Excess' : 'Saving'}):
                                </td>
                                <td colSpan={4} className={`px-3 py-2 text-right font-mono font-extrabold text-sm ${netDiff >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                    {netDiff >= 0 ? `+₹${netDiff.toFixed(2)} (Excess)` : `-₹${Math.abs(netDiff).toFixed(2)} (Saving)`}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
