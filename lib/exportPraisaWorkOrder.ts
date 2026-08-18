import { utils, writeFile } from 'xlsx';

export interface PraisaExportItem {
    itemNo?: string | number;
    description?: string;
    boqQuantity?: number | string;
    quantity?: number | string;
    fullRate?: number | string;
    rate?: number | string;
    amount?: number | string;
    [key: string]: any;
}

function formatItemDesc(item: PraisaExportItem, prefix?: string): string {
    const itemNoStr = item.itemNo != null ? String(item.itemNo).trim() : '';
    const descStr = item.description != null ? String(item.description).trim() : '';

    let formattedNo = '';
    if (itemNoStr) {
        const baseNo = itemNoStr.startsWith('(') && itemNoStr.endsWith(')') 
            ? itemNoStr 
            : `(${itemNoStr})`;
        formattedNo = prefix ? `${prefix} ${baseNo}` : baseNo;
    } else if (prefix) {
        formattedNo = prefix;
    }

    if (formattedNo && descStr) {
        if (descStr.startsWith(formattedNo)) {
            return descStr;
        } else {
            return `${formattedNo} ${descStr}`;
        }
    } else if (formattedNo) {
        return formattedNo;
    } else {
        return descStr;
    }
}

export function downloadPraisaWorkOrderExcel(items: PraisaExportItem[], filename = 'WorkOrder.xls') {
    if (!items || items.length === 0) return;

    const data = items.map((item) => {
        const itemDesc = formatItemDesc(item);
        const boqQty = item.boqQuantity != null && item.boqQuantity !== '' ? Number(item.boqQuantity) : 0;
        const rate = item.fullRate != null && item.fullRate !== '' 
            ? Number(item.fullRate) 
            : (item.rate != null && item.rate !== '' ? Number(item.rate) : 0);
        
        let total = 0;
        if (item.amount != null && item.amount !== '' && !isNaN(Number(item.amount))) {
            total = Number(Number(item.amount).toFixed(2));
        } else {
            total = Number((boqQty * rate).toFixed(2));
        }

        return {
            'ItemDesc': itemDesc,
            'Qty': isNaN(boqQty) ? 0 : boqQty,
            'UnitPrice': isNaN(rate) ? 0 : rate,
            'Total': isNaN(total) ? 0 : total,
        };
    });

    const ws = utils.json_to_sheet(data);
    
    // Set standard column widths for clean presentation in Excel
    ws['!cols'] = [
        { wch: 60 }, // ItemDesc
        { wch: 12 }, // Qty
        { wch: 15 }, // UnitPrice
        { wch: 18 }, // Total
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Sheet1');
    utils.book_append_sheet(wb, utils.aoa_to_sheet([]), 'Sheet2');
    utils.book_append_sheet(wb, utils.aoa_to_sheet([]), 'Sheet3');
    
    const finalFilename = filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
    const bookType = finalFilename.endsWith('.xlsx') ? 'xlsx' : 'biff8';
    
    writeFile(wb, finalFilename, { bookType });
}

export function downloadPraisaExcessWorkOrderExcel(items: PraisaExportItem[], filename = 'WorkOrder_Excess.xls') {
    if (!items || items.length === 0) return;

    // Filter for excess items: executed / bill quantity exceeds BOQ quantity
    const excessItems = items.filter((item) => {
        const boqQty = item.boqQuantity != null && item.boqQuantity !== '' ? Number(item.boqQuantity) : 0;
        const billQty = item.quantity != null && item.quantity !== '' ? Number(item.quantity) : 0;
        const diffQty = billQty - boqQty;
        return diffQty > 0;
    });

    if (excessItems.length === 0) {
        if (typeof window !== 'undefined') {
            alert('No excess items found in this bill.');
        }
        return;
    }

    const data = excessItems.map((item) => {
        const itemDesc = formatItemDesc(item, 'Excess');
        const boqQty = item.boqQuantity != null && item.boqQuantity !== '' ? Number(item.boqQuantity) : 0;
        const billQty = item.quantity != null && item.quantity !== '' ? Number(item.quantity) : 0;
        const excessQty = Number((billQty - boqQty).toFixed(3));
        
        const rate = item.fullRate != null && item.fullRate !== '' 
            ? Number(item.fullRate) 
            : (item.rate != null && item.rate !== '' ? Number(item.rate) : 0);
        
        const total = Number((excessQty * rate).toFixed(2));

        return {
            'ItemDesc': itemDesc,
            'Qty': isNaN(excessQty) ? 0 : excessQty,
            'UnitPrice': isNaN(rate) ? 0 : rate,
            'Total': isNaN(total) ? 0 : total,
        };
    });

    const ws = utils.json_to_sheet(data);
    
    // Set standard column widths for clean presentation in Excel
    ws['!cols'] = [
        { wch: 60 }, // ItemDesc
        { wch: 12 }, // Qty
        { wch: 15 }, // UnitPrice
        { wch: 18 }, // Total
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Sheet1');
    utils.book_append_sheet(wb, utils.aoa_to_sheet([]), 'Sheet2');
    utils.book_append_sheet(wb, utils.aoa_to_sheet([]), 'Sheet3');
    
    const finalFilename = filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
    const bookType = finalFilename.endsWith('.xlsx') ? 'xlsx' : 'biff8';
    
    writeFile(wb, finalFilename, { bookType });
}
