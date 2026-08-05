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
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                    bidderCount > 0
                        ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'
                        : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
            >
                <Users className="w-3 h-3" />
                Bidders ({bidderCount})
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs text-left">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Comparative Statement & Bidders</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {packageName && <span>Package: {packageName} &nbsp;|&nbsp; </span>}
                                    {tenderId && <span>Tender ID: {tenderId}</span>}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[65vh] overflow-y-auto">
                            {bidderCount > 0 ? (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                                <th className="px-3 py-2 text-center w-[8%]">Rank</th>
                                                <th className="px-3 py-2">Name of Party</th>
                                                <th className="px-3 py-2 text-right w-[15%]">Above / Below</th>
                                                <th className="px-3 py-2 text-right w-[15%]">Percentage (%)</th>
                                                <th className="px-3 py-2 text-right w-[20%]">Total Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bidders.map((b: any, idx: number) => {
                                                const isWinner = b.rank === 'L1' || (contractorName && b.contractorName === contractorName);
                                                return (
                                                    <tr key={idx} className={`transition-colors ${isWinner ? 'bg-emerald-50/50' : 'hover:bg-slate-50/60'}`}>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                isWinner ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                                {b.rank}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-800 font-medium">
                                                            {b.contractorName}
                                                            {isWinner && <span className="ml-2 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">✓ Contract Awarded</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-slate-500">{b.aboveBelow}</td>
                                                        <td className="px-3 py-2 text-right font-mono text-slate-700 font-semibold">{b.percentage}%</td>
                                                        <td className="px-3 py-2 text-right font-mono text-emerald-700 font-semibold">
                                                            {b.totalAmount ? `₹${Number(b.totalAmount).toLocaleString('en-IN')}` : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-500 text-xs italic">
                                    No bidders recorded for this tender trial yet.
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
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
