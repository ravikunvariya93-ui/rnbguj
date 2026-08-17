'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export default function PrintTableButton() {
    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <button 
            onClick={handlePrint} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-900 bg-white border border-emerald-300 rounded-xl shadow-2xs hover:bg-emerald-50 hover:border-emerald-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            title="Print Page"
        >
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
            <span>Print</span>
        </button>
    );
}
