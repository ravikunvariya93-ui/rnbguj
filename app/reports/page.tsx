import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import Package from '@/models/Package';
import TechnicalSanction from '@/models/TechnicalSanction';
import DTP from '@/models/DTP';
import WorkOrder from '@/models/WorkOrder';
import ExportTableButton from '@/components/ExportTableButton';
import WorkTypeFilter from '@/components/WorkTypeFilter';
import WeeklyWorkOrderJobNoReport from '@/components/WeeklyWorkOrderJobNoReport';
import { getISTCalendar, istMidnightUTC } from '@/lib/dateUtils';
import Link from 'next/link';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// ── Weekly Work Order Report helpers (Monday–Sunday weeks) ────────────────
function startOfWeekMonday(d: Date): Date {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = copy.getDay(); // 0=Sun … 6=Sat
    const diff = (day + 6) % 7; // days since Monday
    copy.setDate(copy.getDate() - diff);
    return copy;
}

function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function parseISODate(s: string): Date | null {
    const parts = s.split('-');
    if (parts.length !== 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const dd = Number(parts[2]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(dd)) return null;
    const d = new Date(y, m - 1, dd);
    return isNaN(d.getTime()) ? null : d;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatWeekLabel(monday: Date): string {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const s = `${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()]}`;
    const e = `${sunday.getDate()} ${MONTHS_SHORT[sunday.getMonth()]} ${sunday.getFullYear()}`;
    return monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()
        ? `${monday.getDate()} – ${e}`
        : `${s} ${monday.getFullYear()} – ${e}`;
}

interface Props {
    searchParams: Promise<{
        workType?: string;
        loadSummary?: string;
        woWeek?: string;
        woWeeks?: string;
    }>;
}

type LeanId = { toString(): string };
interface WorkNameDoc {
    _id: LeanId;
    workName?: string;
    approvalYear?: string;
    [key: string]: unknown;
}
interface TsNameDoc {
    workName?: string;
    [key: string]: unknown;
}
interface PkgWorkEntry {
    workName?: string;
    amount?: number | string;
    [key: string]: unknown;
}
interface PkgDoc {
    _id: LeanId;
    packageName?: string;
    works?: PkgWorkEntry[];
    [key: string]: unknown;
}
interface DtpDoc {
    tsId?: LeanId | string | null;
    dtpApprovalDate?: unknown;
    tenderAmount?: number;
    [key: string]: unknown;
}
interface SummaryRow {
    year: string;
    total: number;
    tsPrepared: number;
    tsPending: number;
    dtpPrepared: number;
    dtpPending: number;
}
interface WeeklyPkg {
    _id?: LeanId;
    packageName?: string;
    works?: PkgWorkEntry[];
    [key: string]: unknown;
}
interface WeeklyTender {
    packageId?: (WeeklyPkg & { _id?: LeanId }) | string | null;
    packageName?: string;
    contractorName?: string;
    estimatedAmount?: number;
    [key: string]: unknown;
}
interface WeeklyLoa {
    tenderId?: WeeklyTender | null;
    [key: string]: unknown;
}
interface WeeklyWorkOrder {
    _id: LeanId;
    loaId?: WeeklyLoa | string | null;
    workOrderDate?: string | Date | null;
    [key: string]: unknown;
}
type MongoFilter = Record<string, unknown>;

export default async function ReportsPage({ searchParams }: Props) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const params = await searchParams;

    const getQueryString = (overrides: Record<string, string | null>) => {
        const newParams = new URLSearchParams();
        if (params.workType) newParams.set('workType', params.workType);
        if (params.loadSummary === 'true') newParams.set('loadSummary', 'true');
        if (params.woWeek) newParams.set('woWeek', params.woWeek);
        if (params.woWeeks) newParams.set('woWeeks', params.woWeeks);
        Object.entries(overrides).forEach(([key, val]) => {
            if (val === null) {
                newParams.delete(key);
            } else {
                newParams.set(key, val);
            }
        });
        const str = newParams.toString();
        return str ? `?${str}` : '?';
    };

    // Parse work types selection
    const rawWorkType = params.workType;
    let activeWorkTypes: string[] = ['Road', 'Structure']; // Default initial selection
    let shouldFilter = true;

    if (rawWorkType !== undefined) {
        if (rawWorkType === 'all') {
            shouldFilter = false;
            activeWorkTypes = [];
        } else if (rawWorkType === 'none' || rawWorkType === '') {
            shouldFilter = true;
            activeWorkTypes = [];
        } else {
            shouldFilter = true;
            activeWorkTypes = rawWorkType.split(',').filter(Boolean);
        }
    }

    const PREDEFINED_WORK_TYPES = ['Road', 'Building', 'Structure', 'Service'];

    const approvedWorkQuery: MongoFilter = {};
    if (shouldFilter) {
        approvedWorkQuery.workType = { $in: activeWorkTypes };
    }
    if (isAuditor && auditorSubDivision) {
        approvedWorkQuery.subDivision = { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') };
    }

    const filterLabelText = !shouldFilter ? 'All' : activeWorkTypes.length === 0 ? 'None' : activeWorkTypes.join(', ');

    const loadSummary = params.loadSummary === 'true';

    const [
        distinctWorkTypes,
        allApprovedWorks,
        allPackages,
        allTS,
        allDTPs
    ] = await Promise.all([
        ApprovedWork.distinct('workType').then((r: unknown) => r as string[]),
        loadSummary ? ApprovedWork.find(approvedWorkQuery as unknown as Parameters<typeof ApprovedWork.find>[0]).select('_id workName approvalYear workType').lean() : Promise.resolve([]),
        loadSummary ? Package.find({}).select('_id packageName works.workName').lean() : Promise.resolve([]),
        loadSummary ? TechnicalSanction.find({}).select('workName').lean() : Promise.resolve([]),
        loadSummary ? DTP.find({}).select('tsId dtpApprovalDate tenderAmount').lean() : Promise.resolve([])
    ]);

    const workTypes = Array.from(new Set([...PREDEFINED_WORK_TYPES, ...distinctWorkTypes])).filter(Boolean).sort();

    // Normalize strings for fuzzy matching
    const normalizeString = (str: string | null | undefined) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    // ── Weekly Work Order Report (always loaded — single-week query) ──────
    // All week math is done on the IST calendar: "today" is the IST date, and
    // the Mongo range covers Monday 00:00 IST → Sunday 23:59:59.999 IST, so a
    // UTC server never drops Monday work orders (stored as Sun 18:30Z).
    const WEEK_COUNT = 26;
    const istToday = getISTCalendar();
    const thisMonday = startOfWeekMonday(new Date(istToday.year, istToday.month - 1, istToday.day));
    const weeklyWeeks = Array.from({ length: WEEK_COUNT }, (_, i) => {
        const monday = new Date(thisMonday);
        monday.setDate(monday.getDate() - i * 7);
        return { value: toISODate(monday), label: formatWeekLabel(monday) };
    });
    const requestedMonday = params.woWeek ? parseISODate(params.woWeek) : null;
    // Multi-week selection: `?woWeeks=YYYY-MM-DD,YYYY-MM-DD` (legacy single `?woWeek=` still works).
    const selectedMondayKeys: string[] = [];
    const rawWeekTokens = [
        ...(params.woWeeks ? params.woWeeks.split(',') : []),
        ...(params.woWeek ? [params.woWeek] : []),
    ];
    for (const tok of rawWeekTokens) {
        const d = parseISODate(tok.trim());
        if (!d) continue;
        const key = toISODate(startOfWeekMonday(d));
        if (!selectedMondayKeys.includes(key)) selectedMondayKeys.push(key);
    }
    if (requestedMonday && !selectedMondayKeys.includes(toISODate(startOfWeekMonday(requestedMonday)))) {
        selectedMondayKeys.push(toISODate(startOfWeekMonday(requestedMonday)));
    }
    selectedMondayKeys.sort().reverse(); // recent week first
    if (selectedMondayKeys.length === 0) selectedMondayKeys.push(toISODate(thisMonday));
    const cappedMondayKeys = selectedMondayKeys.slice(0, WEEK_COUNT);
    for (const key of cappedMondayKeys) {
        if (!weeklyWeeks.some((w) => w.value === key)) {
            const d = parseISODate(key);
            if (d) weeklyWeeks.unshift({ value: key, label: formatWeekLabel(startOfWeekMonday(d)) });
        }
    }
    const mondayDateFromKey = (key: string): Date => {
        const [y, m, dd] = key.split('-').map(Number);
        return new Date(y, (m || 1) - 1, dd || 1);
    };
    const selectedWeekLabel = cappedMondayKeys.map((k) => formatWeekLabel(mondayDateFromKey(k))).join('; ');
    const earliestKey = cappedMondayKeys[cappedMondayKeys.length - 1];
    const latestKey = cappedMondayKeys[0];
    const [ey, em, ed] = earliestKey.split('-').map(Number);
    const [ly, lm, ld] = latestKey.split('-').map(Number);
    const weekStart = istMidnightUTC(ey, em, ed);
    const weekEnd = new Date(istMidnightUTC(ly, lm, ld + 7).getTime() - 1);
    const selectedWeekSet = new Set(cappedMondayKeys);
    // IST-Monday key of a stored instant (server TZ must not shift the Indian calendar date).
    const mondayKeyOfInstant = (v: unknown): string | null => {
        if (!v) return null;
        const d = new Date(v as string | number | Date);
        if (isNaN(d.getTime())) return null;
        const c = getISTCalendar(d);
        return toISODate(startOfWeekMonday(new Date(c.year, c.month - 1, c.day)));
    };

    const weeklyWorkOrdersRaw = await WorkOrder.find({
        workOrderDate: { $gte: weekStart, $lte: weekEnd },
    })
        .populate({
            path: 'loaId',
            populate: {
                path: 'tenderId',
                populate: { path: 'packageId' },
            },
        })
        .sort({ workOrderDate: 1 })
        .lean();

    const weeklyWorkOrderRows = await (async () => {
        const raw = weeklyWorkOrdersRaw as unknown as WeeklyWorkOrder[];
        const getIds = (wo: WeeklyWorkOrder): string | null => {
            const loa = (wo.loaId ?? null) as WeeklyLoa | null;
            const tender = (loa?.tenderId ?? null) as WeeklyTender | null;
            const pkg = (tender?.packageId ?? null) as (WeeklyPkg & { _id?: LeanId }) | string | null;
            const pkgIdObj = typeof pkg === 'object' && pkg !== null ? (pkg as { _id?: LeanId })._id : null;
            return (pkgIdObj ? String(pkgIdObj) : null)
                || (typeof pkg === 'object' && pkg !== null && (pkg as WeeklyPkg)._id ? String((pkg as WeeklyPkg)._id) : null)
                || (typeof pkg === 'string' ? pkg : null);
        };
        const pkgIdStrs = raw
            .map(getIds)
            .filter((v): v is string => Boolean(v));
        const dtpMap = new Map<string, number>();
        if (pkgIdStrs.length > 0) {
            try {
                const dtps = await DTP.find({ tsId: { $in: pkgIdStrs } } as unknown as Parameters<typeof DTP.find>[0]).select('tsId tenderAmount').lean() as unknown as DtpDoc[];
                dtps.forEach((d: DtpDoc) => {
                    if (d.tsId && d.tenderAmount != null) dtpMap.set(String(d.tsId), Number(d.tenderAmount));
                });
            } catch { /* non-fatal — fall back to tender/package amounts */ }
        }
        return raw.map((wo: WeeklyWorkOrder) => {
            const loa = (wo.loaId ?? null) as WeeklyLoa | null;
            const tender = (loa?.tenderId ?? null) as WeeklyTender | null;
            const pkg = (tender?.packageId ?? null) as (WeeklyPkg & { _id?: LeanId }) | string | null;
            const pkgObj = (typeof pkg === 'object' && pkg !== null ? pkg : null) as WeeklyPkg | null;
            const pkgIdStr = getIds(wo);
            const worksSum = pkgObj?.works && pkgObj.works.length > 0
                ? pkgObj.works.reduce((acc: number, w: PkgWorkEntry) => acc + (Number(w.amount) || 0), 0)
                : null;
            const fromMap = pkgIdStr ? dtpMap.get(pkgIdStr) : undefined;
            const tenderAmount = fromMap ?? tender?.estimatedAmount ?? (worksSum ? Number(worksSum) : null);
            return {
                _id: wo._id.toString(),
                packageName: tender?.packageName || pkgObj?.packageName || '-',
                packageId: pkgIdStr,
                contractorName: tender?.contractorName || '-',
                tenderAmount: tenderAmount != null ? Number(tenderAmount) : null,
                workOrderDate: wo.workOrderDate ? new Date(wo.workOrderDate as string | number | Date).toISOString() : null,
            };
        }).filter((row) => {
            // Union range query may cover gap weeks — keep only selected weeks.
            const key = mondayKeyOfInstant(row.workOrderDate);
            return key != null && selectedWeekSet.has(key);
        });
    })();

    let summaryData: SummaryRow[] = [];
    if (loadSummary) {
        const tsCountMap: Record<string, number> = {};
        (allTS as unknown as TsNameDoc[]).forEach((ts: TsNameDoc) => {
            const name = normalizeString(ts.workName);
            tsCountMap[name] = (tsCountMap[name] || 0) + 1;
        });

        const pendingTSIds = new Set<string>();
        (allApprovedWorks as unknown as WorkNameDoc[]).forEach((w: WorkNameDoc) => {
            const safeName = normalizeString(w.workName);
            if (tsCountMap[safeName] > 0) {
                tsCountMap[safeName]--;
            } else {
                pendingTSIds.add(w._id.toString());
            }
        });

        const workNameToPkg = new Map<string, PkgDoc>();
        (allPackages as unknown as PkgDoc[]).forEach((pkg: PkgDoc) => {
            if (pkg.works) {
                pkg.works.forEach((pw: PkgWorkEntry) => {
                    if (pw.workName) {
                        workNameToPkg.set(normalizeString(pw.workName), pkg);
                    }
                });
            }
        });

        const pkgIdToDTP = new Map<string, DtpDoc>();
        (allDTPs as unknown as DtpDoc[]).forEach((d: DtpDoc) => {
            if (d.tsId) {
                pkgIdToDTP.set(String(d.tsId), d);
            }
        });

        const summaryMap: Record<string, SummaryRow> = {};

        (allApprovedWorks as unknown as WorkNameDoc[]).forEach((work: WorkNameDoc) => {
            const year = (work.approvalYear as string) || 'Unspecified';
            if (!summaryMap[year]) {
                summaryMap[year] = { year, total: 0, tsPrepared: 0, tsPending: 0, dtpPrepared: 0, dtpPending: 0 };
            }

            summaryMap[year].total++;

            const isTSPending = pendingTSIds.has(work._id.toString());
            if (isTSPending) {
                summaryMap[year].tsPending++;
            } else {
                summaryMap[year].tsPrepared++;
                const safeName = normalizeString(work.workName);
                const pkg = workNameToPkg.get(safeName);
                const dtp = pkg ? pkgIdToDTP.get(pkg._id.toString()) : null;
                const hasApprovedDTP = Boolean(dtp && (dtp.dtpApprovalDate || (dtp.tenderAmount !== undefined && dtp.tenderAmount !== null)));

                if (hasApprovedDTP) {
                    summaryMap[year].dtpPrepared++;
                } else {
                    summaryMap[year].dtpPending++;
                }
            }
        });

        summaryData = Object.values(summaryMap).sort((a, b) => b.year.localeCompare(a.year));

        const summaryTotals = summaryData.reduce((acc, row) => ({
            year: 'Total',
            total: acc.total + row.total,
            tsPrepared: acc.tsPrepared + row.tsPrepared,
            tsPending: acc.tsPending + row.tsPending,
            dtpPrepared: acc.dtpPrepared + row.dtpPrepared,
            dtpPending: acc.dtpPending + row.dtpPending
        }), { year: 'Total', total: 0, tsPrepared: 0, tsPending: 0, dtpPrepared: 0, dtpPending: 0 });

        if (summaryData.length > 0) {
            summaryData.push(summaryTotals);
        }
    }

    const getApprovedWorksLink = (extraParams: Record<string, string>) => {
        const linkParams = new URLSearchParams();

        if (rawWorkType) {
            linkParams.set('workType', rawWorkType);
        } else {
            linkParams.set('workType', 'Road,Structure');
        }

        Object.entries(extraParams).forEach(([key, val]) => {
            if (val) linkParams.set(key, val);
        });

        return `/approved-works?${linkParams.toString()}`;
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-8 space-y-12">
            <div className="max-w-[100%] mx-auto space-y-12">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reports</h1>
                    <p className="text-sm font-medium text-slate-500">Panchayat Road and Building Division, Bhavnagar</p>
                </div>

                {/* Weekly Work Order Report */}
                <WeeklyWorkOrderJobNoReport
                    weeks={weeklyWeeks}
                    selectedWeeks={cappedMondayKeys}
                    weekLabel={selectedWeekLabel}
                    rows={weeklyWorkOrderRows}
                />

                {/* Summary Report */}
                <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Summary Report</h2>
                                {loadSummary && (
                                    <Link
                                        href={getQueryString({ loadSummary: null })}
                                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
                                    >
                                        Hide Report
                                    </Link>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Overview of works and packages status by Approval Year — Filtered: {filterLabelText}</p>
                        </div>
                        {loadSummary && (
                            <div className="flex items-center gap-3">
                                <Suspense fallback={null}>
                                    <WorkTypeFilter workTypes={workTypes} />
                                </Suspense>
                                <ExportTableButton tableId="summary-table" filename="Summary_Report.xlsx" />
                            </div>
                        )}
                    </div>

                    {loadSummary ? (
                        <div className="overflow-x-auto border border-slate-300 shadow-sm rounded-lg">
                            <table id="summary-table" className="w-full text-left border-collapse text-xs font-medium">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-300">
                                        <th rowSpan={2} className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300">Approval Year</th>
                                        <th rowSpan={2} className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300 text-center">Total Approved Works</th>
                                        <th colSpan={2} className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300 text-center">TS</th>
                                        <th colSpan={2} className="px-3 py-2.5 font-bold text-slate-700 text-center">DTP</th>
                                    </tr>
                                    <tr className="bg-slate-100 border-b border-slate-300">
                                        <th className="px-3 py-2.5 font-medium text-slate-700 border-r border-slate-300 text-center">Prepared</th>
                                        <th className="px-3 py-2.5 font-medium text-slate-700 border-r border-slate-300 text-center">Pending</th>
                                        <th className="px-3 py-2.5 font-medium text-slate-700 border-r border-slate-300 text-center">Prepared</th>
                                        <th className="px-3 py-2.5 font-medium text-slate-700 text-center">Pending</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {summaryData.length > 0 ? summaryData.map((row: SummaryRow, index: number) => {
                                        const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
                                        return (
                                            <tr key={row.year} className={`${rowBg} hover:bg-emerald-50/80 transition-colors`}>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200"><span className="font-bold">{row.year}</span></td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    <Link href={getApprovedWorksLink(row.year !== 'Total' ? { approvalYear: row.year } : {})} className={row.year !== 'Total' ? "text-emerald-600 hover:underline font-medium" : "text-emerald-600 hover:underline font-bold"}>
                                                        {row.total}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    <Link href={getApprovedWorksLink(row.year !== 'Total' ? { approvalYear: row.year, filter: 'preparedTS' } : { filter: 'preparedTS' })} className={row.year !== 'Total' ? "text-emerald-600 hover:underline font-medium" : "text-emerald-600 hover:underline font-bold"}>
                                                        {row.tsPrepared}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    <Link href={getApprovedWorksLink(row.year !== 'Total' ? { approvalYear: row.year, filter: 'pending' } : { filter: 'pending' })} className={row.year !== 'Total' ? "text-amber-600 hover:underline font-medium" : "text-amber-700 hover:underline font-bold"}>
                                                        {row.tsPending}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    <Link href={getApprovedWorksLink(row.year !== 'Total' ? { approvalYear: row.year, filter: 'preparedDTP' } : { filter: 'preparedDTP' })} className={row.year !== 'Total' ? "text-emerald-600 hover:underline font-medium" : "text-emerald-600 hover:underline font-bold"}>
                                                        {row.dtpPrepared}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 text-center">
                                                    <Link href={getApprovedWorksLink(row.year !== 'Total' ? { approvalYear: row.year, filter: 'pendingDTP' } : { filter: 'pendingDTP' })} className={row.year !== 'Total' ? "text-amber-600 hover:underline font-medium" : "text-amber-700 hover:underline font-bold"}>
                                                        {row.dtpPending}
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No summary data available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-3">
                            <p className="text-xs font-semibold text-slate-500">Summary Report data is not loaded.</p>
                            <Link
                                href={getQueryString({ loadSummary: 'true' })}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                Load Summary Report
                            </Link>
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
}
