export function parseDateStr(dateStr: string | Date | null | undefined): Date | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date) {
        return isNaN(dateStr.getTime()) ? null : dateStr;
    }
    const clean = String(dateStr).trim();
    if (!clean) return null;

    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
        // YYYY-MM-DD format — construct in local time to avoid UTC-midnight off-by-one
        if (parts[0].length === 4) {
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            const dd = Number(parts[2]);
            if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(dd)) return null;
            const d = new Date(y, m - 1, dd);
            return isNaN(d.getTime()) ? null : d;
        }
        // DD/MM/YYYY format
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        const y = Number(year);
        const m = Number(parts[1]);
        const dd = Number(parts[0]);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(dd)) return null;
        const d = new Date(y, m - 1, dd);
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
