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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 cursor-pointer"
            title="Print Page"
        >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print</span>
        </button>
    );
}
