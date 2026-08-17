'use client';

import React, { useState } from 'react';
import { Users, X } from 'lucide-react';

interface ViewBiddersModalButtonProps {
    bidders: any[];
    tenderId?: string;
    packageName?: string;
    contractorName?: string;
}

export default function ViewBiddersModalButton({
    bidders = [],
    tenderId = '',
    packageName = '',
    contractorName = '',
}: ViewBiddersModalButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    const bidderCount = bidders ? bidders.length : 0;

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                    bidderCount > 0
                        ? 'text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border-emerald-300'
                        : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
            >
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                Bidders ({bidderCount})
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-left">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-emerald-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-emerald-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
                            <div>
                                <h3 className="text-sm font-bold text-emerald-950">Comparative Statement & Bidders</h3>
                                <p className="text-[11px] text-emerald-700/80 mt-0.5">
                                    {packageName && <span>Package: {packageName} &nbsp;|&nbsp; </span>}
                                    {tenderId && <span>Tender ID: {tenderId}</span>}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-emerald-700 hover:text-emerald-900 p-1.5 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[65vh] overflow-y-auto">
                            {bidderCount > 0 ? (
                                <div className="border border-emerald-200 rounded-xl overflow-hidden shadow-2xs">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-emerald-100/70 text-emerald-950 font-bold border-b border-emerald-200">
                                                <th className="px-3 py-2.5 text-center w-[8%]">Rank</th>
                                                <th className="px-3 py-2.5">Name of Party</th>
                                                <th className="px-3 py-2.5 text-right w-[15%]">Above / Below</th>
                                                <th className="px-3 py-2.5 text-right w-[15%]">Percentage (%)</th>
                                                <th className="px-3 py-2.5 text-right w-[20%]">Total Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-emerald-100">
                                            {bidders.map((b: any, idx: number) => {
                                                const isWinner = b.rank === 'L1' || (contractorName && b.contractorName === contractorName);
                                                return (
                                                    <tr key={idx} className={`transition-colors ${isWinner ? 'bg-emerald-50/70 font-semibold' : (idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/20')} hover:bg-emerald-100/50`}>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                isWinner ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                                {b.rank}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-800 font-medium">
                                                            {b.contractorName}
                                                            {isWinner && <span className="ml-2 text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full">✓ Contract Awarded</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-slate-600">{b.aboveBelow}</td>
                                                        <td className="px-3 py-2 text-right font-mono text-slate-800 font-semibold">{b.percentage}%</td>
                                                        <td className="px-3 py-2 text-right font-mono text-emerald-800 font-bold">
                                                            {b.totalAmount ? `₹${Number(b.totalAmount).toLocaleString('en-IN')}` : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 border border-dashed border-emerald-200 rounded-2xl bg-emerald-50/30 text-emerald-700 text-xs italic">
                                    No bidders recorded for this tender trial yet.
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-emerald-100 bg-emerald-50/50 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
