export function parseDateStr(dateStr: string): Date | null {
    if (!dateStr) return null;
    const clean = String(dateStr).trim();
    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        const iso = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        const d = new Date(iso);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
}

export function formatDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
}

export function formatDateForInput(dateString: string | Date | null | undefined): string {
    if (!dateString) return '';
    try {
        const dateObj = dateString instanceof Date ? dateString : new Date(dateString);
        if (isNaN(dateObj.getTime())) return '';
        return formatDate(dateObj);
    } catch {
        return '';
    }
}

export function formatShortDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB');
}
