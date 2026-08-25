export function parseDateStr(dateStr: string | Date | null | undefined): Date | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date) {
        return isNaN(dateStr.getTime()) ? null : dateStr;
    }
    const clean = String(dateStr).trim();
    if (!clean) return null;

    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
        // YYYY-MM-DD format
        if (parts[0].length === 4) {
            const d = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
            return isNaN(d.getTime()) ? null : d;
        }
        // DD/MM/YYYY format
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        const iso = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        const d = new Date(iso);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
}

export function formatDate(d: Date | string | number | null | undefined): string {
    if (!d) return '-';
    let dateObj: Date | null = null;
    if (d instanceof Date) {
        dateObj = d;
    } else {
        dateObj = parseDateStr(d as any);
        if (!dateObj) {
            const temp = new Date(d);
            if (!isNaN(temp.getTime())) {
                dateObj = temp;
            }
        }
    }
    if (!dateObj || isNaN(dateObj.getTime())) {
        return typeof d === 'string' ? d : '-';
    }
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${dateObj.getFullYear()}`;
}

export function formatDateForInput(dateString: string | Date | null | undefined): string {
    if (!dateString) return '';
    try {
        const dateObj = dateString instanceof Date ? dateString : (parseDateStr(dateString) || new Date(dateString));
        if (!dateObj || isNaN(dateObj.getTime())) return typeof dateString === 'string' ? dateString : '';
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${dateObj.getFullYear()}`;
    } catch {
        return typeof dateString === 'string' ? dateString : '';
    }
}

export function formatShortDate(date: any): string {
    if (!date) return '-';
    return formatDate(date);
}
