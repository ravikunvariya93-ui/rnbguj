'use client';

import React, { useState } from 'react';
import { utils, writeFile } from 'xlsx';
import { Download, Loader2 } from 'lucide-react';

interface ExportTableButtonProps {
    tableId: string;
    filename?: string;
}

export default function ExportTableButton({ tableId, filename = "Export.xlsx" }: ExportTableButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            try {
                const table = document.getElementById(tableId);
                if (table) {
                    const wb = utils.table_to_book(table, { sheet: "Sheet 1" });
                    writeFile(wb, filename);
                } else {
                    console.error(`ExportTableButton: Table with id '${tableId}' not found.`);
                }
            } finally {
                setIsExporting(false);
            }
        }, 100);
    };

    return (
        <button 
            onClick={handleExport} 
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-900 bg-white border border-emerald-300 rounded-xl shadow-2xs hover:bg-emerald-50 hover:border-emerald-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Export to Excel"
        >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" /> : <Download className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{isExporting ? 'Exporting...' : 'Export to Excel'}</span>
        </button>
    );
}
