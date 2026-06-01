'use client';

import React from 'react';
import { utils, writeFile } from 'xlsx';
import { Download } from 'lucide-react';

interface ExportTableButtonProps {
    tableId: string;
    filename?: string;
}

export default function ExportTableButton({ tableId, filename = "Export.xlsx" }: ExportTableButtonProps) {
    const handleExport = () => {
        const table = document.getElementById(tableId);
        if (table) {
            // Converts the HTML table directly to an Excel workbook
            // This preserves the exact columns and rows shown in the UI
            const wb = utils.table_to_book(table, { sheet: "Sheet 1" });
            writeFile(wb, filename);
        } else {
            console.error(`ExportTableButton: Table with id '${tableId}' not found.`);
        }
    };

    return (
        <button 
            onClick={handleExport} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
            title="Export to Excel"
        >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export to Excel</span>
        </button>
    );
}
