// All date-only values in this app are Indian calendar dates (Asia/Kolkata).
// They are stored as UTC instants (midnight IST = previous day 18:30Z), so they
// MUST be formatted in Asia/Kolkata explicitly. Using local getters (getDate())
// breaks on servers running in UTC (renders one day behind).
const IST_TIME_ZONE = 'Asia/Kolkata';

/** IST offset in milliseconds (UTC+5:30, no DST). */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface ISTCalendar {
    year: number;
    /** 1-12 */
    month: number;
    day: number;
}

/**
 * Calendar (year/month/day) of an instant in IST.
 * Use for "today", week math, and Mongo range boundaries so the server
 * timezone (often UTC) never shifts Indian calendar dates.
 */
export function getISTCalendar(d: Date | string | number = new Date()): ISTCalendar {
    const t = new Date(d).getTime() + IST_OFFSET_MS;
    const ist = new Date(t);
    return { year: ist.getUTCFullYear(), month: ist.getUTCMonth() + 1, day: ist.getUTCDate() };
}

/** Midnight IST of the given IST calendar date, as a UTC instant (for DB queries). */
export function istMidnightUTC(year: number, month1to12: number, day: number): Date {
    return new Date(Date.UTC(year, month1to12 - 1, day) - IST_OFFSET_MS);
}

/** Today's date in IST formatted as DD/MM/YYYY. */
export function todayISTFormatted(): string {
    const c = getISTCalendar();
    return `${String(c.day).padStart(2, '0')}/${String(c.month).padStart(2, '0')}/${c.year}`;
}

function getISTParts(d: Date): { day: string; month: string; year: string } | null {
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: IST_TIME_ZONE,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).formatToParts(d);
        const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
        const day = get('day');
        const month = get('month');
        const year = get('year');
        if (!day || !month || !year) return null;
        return { day, month, year };
    } catch {
        return null;
    }
}

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
    const ist = getISTParts(dateObj);
    if (!ist) return typeof d === 'string' ? d : '-';
    return `${ist.day}/${ist.month}/${ist.year}`;
}

export function formatDateForInput(dateString: string | Date | null | undefined): string {
    if (!dateString) return '';
    try {
        const dateObj = dateString instanceof Date ? dateString : (parseDateStr(dateString) || new Date(dateString));
        if (!dateObj || isNaN(dateObj.getTime())) return typeof dateString === 'string' ? dateString : '';
        const ist = getISTParts(dateObj);
        if (!ist) return typeof dateString === 'string' ? dateString : '';
        return `${ist.day}/${ist.month}/${ist.year}`;
    } catch {
        return typeof dateString === 'string' ? dateString : '';
    }
}

export function formatShortDate(date: any): string {
    if (!date) return '-';
    return formatDate(date);
}

/** DD-MM-YYYY in IST (for Gujarati/official print formats). */
export function formatDateDMYIST(d: Date | string | number | null | undefined): string {
    if (!d) return '-';
    const dateObj = d instanceof Date ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return typeof d === 'string' ? d : '-';
    const ist = getISTParts(dateObj);
    if (!ist) return typeof d === 'string' ? d : '-';
    return `${ist.day}-${ist.month}-${ist.year}`;
}

/** DD/MM/YYYY, HH:MM (24h) in IST — for timestamps like createdAt/changedAt. */
export function formatDateTimeIST(d: Date | string | number | null | undefined): string {
    if (!d) return '-';
    const dateObj = d instanceof Date ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return typeof d === 'string' ? d : '-';
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: IST_TIME_ZONE,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(dateObj);
        const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
        if (!get('day') || !get('month') || !get('year')) return '-';
        return `${get('day')}/${get('month')}/${get('year')}, ${get('hour')}:${get('minute')}`;
    } catch {
        return typeof d === 'string' ? d : '-';
    }
}

/** Calendar year of an instant in IST (e.g. for letter numbers). */
export function getISTYear(d: Date | string | number | null | undefined): number | string {
    if (d == null || d === '') return '-';
    const dateObj = d instanceof Date ? d : new Date(d as any);
    if (isNaN(dateObj.getTime())) return '-';
    return getISTCalendar(dateObj).year;
}
