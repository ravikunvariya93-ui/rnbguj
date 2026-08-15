'use client';
import { Printer } from 'lucide-react';

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow transition-colors cursor-pointer"
            id="print-btn"
        >
            <Printer className="w-4 h-4" />
            Print / Save PDF
        </button>
    );
}
