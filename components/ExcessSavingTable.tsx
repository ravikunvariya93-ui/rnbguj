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
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-xs mb-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                    <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                        <LayoutList className="w-4 h-4" />
                    </span>
                    <h2 className="text-base font-bold text-slate-800">{title}</h2>
                    {items.length > 0 && (
                        <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                            {items.length} items
                        </span>
                    )}
                </div>
                {items.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-emerald-300"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                Collapse Item Details
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                Expand Item Details ({items.length})
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="overflow-x-auto border border-emerald-300 rounded-xl shadow-2xs">
                <table className="excel-table">
                    <thead>
                        <tr className="bg-emerald-100/90 text-emerald-950">
                            <th rowSpan={2} className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950">Item No.</th>
                            <th rowSpan={2} className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950 min-w-[200px]">Description</th>
                            <th rowSpan={2} className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-center text-xs font-bold text-emerald-950">Unit</th>
                            
                            <th colSpan={3} className="border border-emerald-300 px-3 py-1.5 text-center bg-blue-100/90 text-blue-950 font-bold">As per Tender</th>
                            <th colSpan={3} className="border border-emerald-300 px-3 py-1.5 text-center bg-indigo-100/90 text-indigo-950 font-bold">As per Bill</th>
                            <th colSpan={2} className="border border-emerald-300 px-3 py-1.5 text-center bg-rose-100/90 text-rose-950 font-bold">Excess</th>
                            <th colSpan={2} className="border border-emerald-300 px-3 py-1.5 text-center bg-emerald-200/90 text-emerald-950 font-bold">Saving</th>
                        </tr>
                        <tr className="bg-emerald-100/70 text-emerald-950">
                            <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-blue-50 text-blue-900">Qty</th>
                            <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-blue-50 text-blue-900">Rate (₹)</th>
                            <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-blue-50 text-blue-900">Amount (₹)</th>
                            
                            <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-indigo-50 text-indigo-900">Qty</th>
                            <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-indigo-50 text-indigo-900">Rate (₹)</th>
                            <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-indigo-50 text-indigo-900">Amount (₹)</th>
                            
                            <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-rose-50 text-rose-900">Qty</th>
                            <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-rose-50 text-rose-900">Amount (₹)</th>
                            
                            <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-emerald-100 text-emerald-950">Qty</th>
                            <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-emerald-100 text-emerald-950">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-200/60 bg-white">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={13} className="px-6 py-8 text-center text-sm text-slate-500">
                                    No line items available to calculate Excess / Saving Statement.
                                </td>
                            </tr>
                        ) : !isExpanded ? (
                            <tr>
                                <td colSpan={13} className="px-4 py-3.5 text-center text-xs text-slate-500 bg-emerald-50/40 font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setIsExpanded(true)}
                                        className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
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
                                    <tr key={index} className="hover:bg-emerald-50/50 font-mono text-xs">
                                        <td className="border border-slate-200 px-3 py-2 text-left font-sans text-slate-700 font-bold">{item.itemNo}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-left font-sans text-slate-600 max-w-[240px] truncate font-medium" title={item.description}>{item.description}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-center font-sans text-slate-500">{item.unit}</td>
                                        
                                        {/* Tender */}
                                        <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{tenderQty ? tenderQty.toFixed(2) : '0.00'}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{tenderRate ? tenderRate.toFixed(2) : '0.00'}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-right text-blue-900 font-semibold bg-blue-50/30">{tenderAmt ? tenderAmt.toFixed(2) : '0.00'}</td>
                                        
                                        {/* Bill */}
                                        <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{billQty ? billQty.toFixed(2) : '0.00'}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{billRate ? billRate.toFixed(2) : '0.00'}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-right text-indigo-900 font-semibold bg-indigo-50/30">{billAmt ? billAmt.toFixed(2) : '0.00'}</td>
                                        
                                        {/* Excess */}
                                        <td className="border border-slate-200 px-3 py-2 text-right text-rose-700">{excessQty > 0 ? excessQty.toFixed(2) : '-'}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-right text-rose-900 font-bold bg-rose-50/30">{excessAmt > 0 ? `₹${excessAmt.toFixed(2)}` : '-'}</td>
                                        
                                        {/* Saving */}
                                        <td className="border border-slate-200 px-3 py-2 text-right text-emerald-700">{savingQty > 0 ? savingQty.toFixed(2) : '-'}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-right text-emerald-900 font-bold bg-emerald-50/50">{savingAmt > 0 ? `₹${savingAmt.toFixed(2)}` : '-'}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {items.length > 0 && (
                        <tfoot className="bg-emerald-50/90 font-bold text-xs border-t-2 border-emerald-300">
                            <tr>
                                <td colSpan={3} className="px-3 py-2.5 text-right font-sans text-slate-800 uppercase tracking-wider">Total:</td>
                                <td colSpan={2} className="px-3 py-2.5"></td>
                                <td className="px-3 py-2.5 text-right font-mono text-blue-950">₹{totalTender.toFixed(2)}</td>
                                <td colSpan={2} className="px-3 py-2.5"></td>
                                <td className="px-3 py-2.5 text-right font-mono text-indigo-950">₹{totalBill.toFixed(2)}</td>
                                <td></td>
                                <td className="px-3 py-2.5 text-right font-mono text-rose-950">₹{totalExcess.toFixed(2)}</td>
                                <td></td>
                                <td className="px-3 py-2.5 text-right font-mono text-emerald-950">₹{totalSaving.toFixed(2)}</td>
                            </tr>
                            <tr className="bg-emerald-100/90 text-emerald-950">
                                <td colSpan={9} className="px-3 py-2.5 text-right font-sans uppercase font-black tracking-wider">
                                    Net Statement Summary ({netDiff >= 0 ? 'Excess' : 'Saving'}):
                                </td>
                                <td colSpan={4} className={`px-3 py-2.5 text-right font-mono font-black text-sm ${netDiff >= 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
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
