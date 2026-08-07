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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to Excel"
        >
            {isExporting ? <Loader2 className="w-4 h-4 text-slate-500 animate-spin" /> : <Download className="w-4 h-4 text-slate-500" />}
            <span>{isExporting ? 'Exporting...' : 'Export to Excel'}</span>
        </button>
    );
}
