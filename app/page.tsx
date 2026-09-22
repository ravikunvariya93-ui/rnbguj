import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Package from '@/models/Package';
import ApprovedWork from '@/models/ApprovedWork';
import TechnicalSanction from '@/models/TechnicalSanction';
import DTP from '@/models/DTP';
import DataTable from '@/components/DataTable';
import Badge, { toneForTenderStatus } from '@/components/ui/Badge';
import ExportTableButton from '@/components/ExportTableButton';
import WorkTypeFilter from '@/components/WorkTypeFilter';
import SearchBar from '@/components/SearchBar';
import MasterReportTable from '@/components/MasterReportTable';
import WeeklyWorkOrderReport from '@/components/WeeklyWorkOrderReport';
import WeeklyWorkOrderJobNoReport from '@/components/WeeklyWorkOrderJobNoReport';
import { formatShortDate, getISTCalendar, istMidnightUTC } from '@/lib/dateUtils';
import type { Column } from '@/lib/types';
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
        page?: string;
        limit?: string;
        workType?: string;
        search?: string;
        loadSummary?: string;
        loadMaster?: string;
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
interface TenderDoc {
    _id: LeanId;
    packageId?: LeanId | string | null;
    estimatedAmount?: number;
    contractPrice?: number;
    proposalDate?: unknown;
    tenderApprovalDate?: unknown;
    [key: string]: unknown;
}
interface ApprovalDoc {
    tenderId?: LeanId | string | null;
    proposalDate?: unknown;
    tenderApprovalDate?: unknown;
    notRequired?: boolean;
    [key: string]: unknown;
}
interface LoaDoc {
    _id: LeanId;
    tenderId?: LeanId | string | null;
    acceptanceLetterDate?: unknown;
    [key: string]: unknown;
}
interface WorkOrderDoc {
    _id?: LeanId;
    loaId?: LeanId | string | null;
    workOrderDate?: unknown;
    [key: string]: unknown;
}
interface MasterWorkDoc {
    _id: LeanId;
    workName?: string;
    jobNumberApprovalDate?: string | Date | null;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
    [key: string]: unknown;
}
interface MasterRow {
    _id: string;
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
interface SearchTenderDoc {
    _id: LeanId;
    packageId?: LeanId | string | null;
    estimatedAmount?: number;
    contractPrice?: number;
    proposalDate?: unknown;
    tenderApprovalDate?: unknown;
    acceptanceLetterDate?: unknown;
    workOrderDate?: unknown;
    [key: string]: unknown;
}
interface SearchApprovedWorkDoc {
    _id: LeanId;
    workName?: string;
    [key: string]: unknown;
}
type MongoFilter = Record<string, unknown>;

export default async function Home({ searchParams }: Props) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const params = await searchParams;

    const getQueryString = (overrides: Record<string, string | null>) => {
        const newParams = new URLSearchParams();
        if (params.page) newParams.set('page', params.page);
        if (params.limit) newParams.set('limit', params.limit);
        if (params.workType) newParams.set('workType', params.workType);
        if (params.search) newParams.set('search', params.search);
        if (params.loadSummary === 'true') newParams.set('loadSummary', 'true');
        if (params.loadMaster === 'true') newParams.set('loadMaster', 'true');
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
    const loadMaster = params.loadMaster === 'true';
    const searchQuery = params.search?.trim();

    // Determine what we need to query
    const needPackages = Boolean(searchQuery || loadSummary);
    const needApprovedWorks = Boolean(loadSummary);
    const needTS = loadSummary;
    const needDTPs = loadSummary;

    // Fetch only needed collections — one round of parallel queries, including
    // the distinct() call (was a separate sequential await before).
    const [
        distinctWorkTypes,
        allApprovedWorks,
        allPackages,
        allTS,
        allDTPs,
        masterWorks,
        masterTS,
        masterPackages,
        masterDTPs,
        masterTenders,
        masterApprovals,
        masterLOAs,
        masterWorkOrders
    ] = await Promise.all([
        ApprovedWork.distinct('workType').then((r: unknown) => r as string[]),
        needApprovedWorks ? ApprovedWork.find(approvedWorkQuery as unknown as Parameters<typeof ApprovedWork.find>[0]).select('_id workName approvalYear workType').lean() : Promise.resolve([]),
        needPackages ? Package.find({}).select('_id packageName works.workName').lean() : Promise.resolve([]),
        needTS ? TechnicalSanction.find({}).select('workName').lean() : Promise.resolve([]),
        needDTPs ? DTP.find({}).select('tsId dtpApprovalDate tenderAmount').lean() : Promise.resolve([]),
        loadMaster ? ApprovedWork.find(approvedWorkQuery as unknown as Parameters<typeof ApprovedWork.find>[0]).lean() : Promise.resolve([]),
        loadMaster ? TechnicalSanction.find({}).lean() : Promise.resolve([]),
        loadMaster ? Package.find({}).lean() : Promise.resolve([]),
        loadMaster ? DTP.find({}).lean() : Promise.resolve([]),
        loadMaster ? Tender.find({}).lean() : Promise.resolve([]),
        loadMaster ? Approval.find({}).lean() : Promise.resolve([]),
        loadMaster ? LOA.find({}).lean() : Promise.resolve([]),
        loadMaster ? WorkOrder.find({}).lean() : Promise.resolve([])
    ]);

    const workTypes = Array.from(new Set([...PREDEFINED_WORK_TYPES, ...distinctWorkTypes])).filter(Boolean).sort();

    // Normalize strings for fuzzy matching
    const normalizeString = (str: string | null | undefined) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const toISO = (v: unknown): string | null => (v ? new Date(v as string | number | Date).toISOString() : null);

    let serializedMasterWorks: MasterRow[] = [];
    if (loadMaster) {
        const tsMap = new Map<string, Record<string, unknown>>();
        (masterTS as unknown as Record<string, unknown>[]).forEach((ts: Record<string, unknown>) => {
            if (ts.workName) {
                const key = normalizeString(ts.workName as string);
                tsMap.set(key, ts);
            }
        });

        const workToPkgMap = new Map<string, Record<string, unknown>>();
        (masterPackages as unknown as Record<string, unknown>[]).forEach((pkg: Record<string, unknown>) => {
            const works = pkg.works as PkgWorkEntry[] | undefined;
            if (works) {
                works.forEach((w: PkgWorkEntry) => {
                    if (w.workName) {
                        workToPkgMap.set(normalizeString(w.workName), pkg);
                    }
                });
            }
        });

        const dtpMap = new Map<string, Record<string, unknown>>();
        (masterDTPs as unknown as Record<string, unknown>[]).forEach((dtp: Record<string, unknown>) => {
            if (dtp.tsId) {
                dtpMap.set(String(dtp.tsId), dtp);
            }
        });

        const tenderMap = new Map<string, Record<string, unknown>>();
        (masterTenders as unknown as Record<string, unknown>[]).forEach((tender: Record<string, unknown>) => {
            if (tender.packageId) {
                tenderMap.set(String(tender.packageId), tender);
            }
        });

        const approvalMap = new Map<string, Record<string, unknown>>();
        (masterApprovals as unknown as Record<string, unknown>[]).forEach((app: Record<string, unknown>) => {
            if (app.tenderId) {
                approvalMap.set(String(app.tenderId), app);
            }
        });

        const loaMap = new Map<string, Record<string, unknown>>();
        (masterLOAs as unknown as Record<string, unknown>[]).forEach((loa: Record<string, unknown>) => {
            if (loa.tenderId) {
                loaMap.set(String(loa.tenderId), loa);
            }
        });

        const woMap = new Map<string, Record<string, unknown>>();
        (masterWorkOrders as unknown as Record<string, unknown>[]).forEach((wo: Record<string, unknown>) => {
            if (wo.loaId) {
                woMap.set(String(wo.loaId), wo);
            }
        });

        serializedMasterWorks = (masterWorks as unknown as (MasterWorkDoc & Record<string, unknown>)[]).map((w: MasterWorkDoc & Record<string, unknown>) => {
            const normalizedName = normalizeString(w.workName);
            const ts = tsMap.get(normalizedName) || {};
            const pkg = workToPkgMap.get(normalizedName) || {};
            const pkgIdStr = pkg._id ? String(pkg._id) : null;
            const dtp = pkgIdStr ? dtpMap.get(pkgIdStr) || {} : {};
            const tender = pkgIdStr ? tenderMap.get(pkgIdStr) || {} : {};
            const tenderIdStr = tender._id ? String(tender._id) : null;
            const approval = tenderIdStr ? approvalMap.get(tenderIdStr) || {} : {};
            const loa = tenderIdStr ? loaMap.get(tenderIdStr) || {} : {};
            const loaIdStr = loa._id ? String(loa._id) : null;
            const wo = loaIdStr ? woMap.get(loaIdStr) || {} : {};

            const item: MasterRow = {
                ...w,
                _id: w._id.toString(),
                jobNumberApprovalDate: w.jobNumberApprovalDate ? new Date(w.jobNumberApprovalDate as string | number | Date).toISOString() : null,
                createdAt: w.createdAt ? new Date(w.createdAt as string | number | Date).toISOString() : null,
                updatedAt: w.updatedAt ? new Date(w.updatedAt as string | number | Date).toISOString() : null,
            };

            // TS properties
            item.ts_dateSendingTS = toISO(ts.dateSendingTS);
            item.ts_tsAuthority = ts.tsAuthority || null;
            item.ts_tsAmount = ts.tsAmount || null;
            item.ts_tsNumber = ts.tsNumber || null;
            item.ts_tsDate = toISO(ts.tsDate);
            item.ts_remarks = ts.remarks || null;

            // Package properties
            item.pkg_packageName = pkg.packageName || null;

            // DTP properties
            item.dtp_dtpSendingNo = dtp.dtpSendingNo || null;
            item.dtp_dtpSendingDate = toISO(dtp.dtpSendingDate);
            item.dtp_dtpApprovingAuthority = dtp.dtpApprovingAuthority || null;
            item.dtp_dtpApprovalNo = dtp.dtpApprovalNo || null;
            item.dtp_dtpApprovalDate = toISO(dtp.dtpApprovalDate);
            item.dtp_tenderAmount = dtp.tenderAmount || null;
            item.dtp_remarks = dtp.remarks || null;

            // Tender properties
            item.tender_tenderId = tender.tenderId || null;
            item.tender_tenderNoticeYear = tender.tenderNoticeYear || null;
            item.tender_noticeNo = tender.noticeNo || null;
            item.tender_srNo = tender.srNo || null;
            item.tender_trialNo = tender.trialNo || null;
            item.tender_tenderCreationDate = toISO(tender.tenderCreationDate);
            item.tender_lastDateOfSubmission = toISO(tender.lastDateOfSubmission);
            item.tender_tenderOpeningDate = toISO(tender.tenderOpeningDate);
            item.tender_tenderValidityDate = toISO(tender.tenderValidityDate);
            item.tender_estimatedAmount = tender.estimatedAmount || dtp.tenderAmount || null;
            item.tender_reInvite = tender.reInvite !== undefined ? tender.reInvite : null;
            item.tender_cancelled = tender.cancelled !== undefined ? tender.cancelled : null;
            item.tender_cancellationReason = tender.cancellationReason || null;
            item.tender_contractorName = tender.contractorName || null;
            item.tender_contractPrice = tender.contractPrice || null;
            item.tender_aboveBelowPercentage = tender.aboveBelowPercentage || null;
            item.tender_aboveBelowInWord = tender.aboveBelowInWord || null;
            item.tender_proposalDate = toISO(tender.proposalDate);
            item.tender_tenderApprovalOffice = tender.tenderApprovalOffice || null;
            item.tender_tenderApprovalNo = tender.tenderApprovalNo || null;
            item.tender_tenderApprovalDate = toISO(tender.tenderApprovalDate);
            item.tender_workDurationMonths = tender.workDurationMonths || null;
            item.tender_acceptanceLetterWorksheetNo = tender.acceptanceLetterWorksheetNo || null;
            item.tender_acceptanceLetterDate = toISO(tender.acceptanceLetterDate);
            item.tender_agreementYear = tender.agreementYear || null;
            item.tender_agreementNo = tender.agreementNo || null;
            item.tender_agreementDate = toISO(tender.agreementDate);
            item.tender_securityDepositType = tender.securityDepositType || null;
            item.tender_securityDepositBankName = tender.securityDepositBankName || null;
            item.tender_securityDepositNumber = tender.securityDepositNumber || null;
            item.tender_securityDepositAmount = tender.securityDepositAmount || null;
            item.tender_securityDepositDate = toISO(tender.securityDepositDate);
            item.tender_additionalSecurityDepositType = tender.additionalSecurityDepositType || null;
            item.tender_additionalSecurityDepositBankName = tender.additionalSecurityDepositBankName || null;
            item.tender_additionalSecurityDepositNumber = tender.additionalSecurityDepositNumber || null;
            item.tender_additionalSecurityDepositAmount = tender.additionalSecurityDepositAmount || null;
            item.tender_additionalSecurityDepositDate = toISO(tender.additionalSecurityDepositDate);
            item.tender_workOrderWorksheetNo = tender.workOrderWorksheetNo || null;
            item.tender_workOrderDate = toISO(tender.workOrderDate);
            item.tender_remarks = tender.remarks || null;

            // Approval properties
            const isApprovalNotRequired = approval.notRequired === true || (
                (tender.estimatedAmount !== undefined && tender.estimatedAmount !== null)
                    ? Number(tender.estimatedAmount) < 5000000
                    : (tender.contractPrice !== undefined && Number(tender.contractPrice) < 5000000)
            );
            item.approval_notRequired = isApprovalNotRequired;
            item.approval_proposalDate = toISO(approval.proposalDate);
            item.approval_tenderApprovalOffice = approval.tenderApprovalOffice || null;
            item.approval_tenderApprovalNo = approval.tenderApprovalNo || null;
            item.approval_tenderApprovalDate = toISO(approval.tenderApprovalDate);

            // LOA properties
            item.loa_stampDuty = loa.stampDuty || null;
            item.loa_defectLiabilityPeriod = loa.defectLiabilityPeriod || null;
            item.loa_workDurationMonths = loa.workDurationMonths || null;
            item.loa_acceptanceLetterWorksheetNo = loa.acceptanceLetterWorksheetNo || null;
            item.loa_acceptanceLetterDate = toISO(loa.acceptanceLetterDate);

            // Work Order properties
            item.wo_agreementYear = wo.agreementYear || null;
            item.wo_agreementNo = wo.agreementNo || null;
            item.wo_agreementDate = toISO(wo.agreementDate);
            item.wo_securityDepositType = wo.securityDepositType || null;
            item.wo_securityDepositBankName = wo.securityDepositBankName || null;
            item.wo_securityDepositNumber = wo.securityDepositNumber || null;
            item.wo_securityDepositAmount = wo.securityDepositAmount || null;
            item.wo_securityDepositDate = toISO(wo.securityDepositDate);
            item.wo_additionalSecurityDepositType = wo.additionalSecurityDepositType || null;
            item.wo_additionalSecurityDepositBankName = wo.additionalSecurityDepositBankName || null;
            item.wo_additionalSecurityDepositNumber = wo.additionalSecurityDepositNumber || null;
            item.wo_additionalSecurityDepositAmount = wo.additionalSecurityDepositAmount || null;
            item.wo_additionalSecurityDepositDate = toISO(wo.additionalSecurityDepositDate);
            item.wo_workOrderWorksheetNo = wo.workOrderWorksheetNo || null;
            item.wo_workOrderDate = toISO(wo.workOrderDate);
            item.wo_timeLimitStartsFrom = toISO(wo.timeLimitStartsFrom);
            item.wo_stipulatedCompletionDate = toISO(wo.stipulatedCompletionDate);

            return item;
        });
    }

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

    const searchApprovedWorksColumns: Column[] = [
        { 
            key: 'srNo', 
            label: 'Sr. No.', 
            render: (row, idx) => idx + 1, 
            align: 'center' 
        },
        { 
            key: 'workName', 
            label: 'Name of Work', 
            minWidth: '300px',
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-800 break-words leading-tight">{row.workName}</span>
                </div>
            )
        },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            minWidth: '180px',
            render: (row) => row.packageId ? (
                <Link href={`/packages/${row.packageId}`} className="text-emerald-600 hover:underline font-semibold break-words">
                    {row.packageName}
                </Link>
            ) : (
                <span className="text-slate-400 italic">Unpackaged</span>
            )
        },
        { key: 'jobNumberAmount', label: 'Amount (Lakh)', align: 'center', render: (row) => row.jobNumberAmount || '-' },
        { key: 'approvalYear', label: 'Approval Year', align: 'center' },
        { key: 'workType', label: 'Work Type' },
        { key: 'estimateConsultant', label: 'Estimate Consultant', minWidth: '150px' }
    ];

    // 4. Search Results Report (If search query exists)
    let searchResultsData: MasterRow[] = [];
    let searchApprovedWorksData: MasterRow[] = [];
    if (searchQuery) {
        // Find packages whose packageName matches OR which contain a work matching the search query
        const searchPackages = (allPackages as unknown as PkgDoc[]).filter((pkg: PkgDoc) => {
            const pkgNameMatch = pkg.packageName?.toLowerCase().includes(searchQuery.toLowerCase());
            const workNameMatch = pkg.works?.some((w: PkgWorkEntry) => w.workName?.toLowerCase().includes(searchQuery.toLowerCase()));
            return pkgNameMatch || workNameMatch;
        });
        const searchPackageIds = (searchPackages as unknown as PkgDoc[]).map((pkg: PkgDoc) => pkg._id);

        // Tender branch + approved-works branch run concurrently (were sequential).
        const [searchTendersRaw, matchedApprovedWorksRaw] = await Promise.all([
            Tender.find({
                $or: [
                    { packageName: { $regex: searchQuery, $options: 'i' } },
                    { packageId: { $in: searchPackageIds } }
                ]
            } as unknown as Parameters<typeof Tender.find>[0])
            .select('_id tenderNoticeYear noticeNo srNo packageName packageId contractorName proposalDate tenderApprovalDate acceptanceLetterDate workOrderDate cancelled cancellationReason')
            .sort({ tenderNoticeYear: -1, noticeNo: 1, srNo: 1 })
            .lean(),
            ApprovedWork.find({
                $or: [
                    { workName: { $regex: searchQuery, $options: 'i' } }
                ]
            })
            .select('_id workName circle district subDivision taluka approvalYear jobNumberAmount workType estimateConsultant remarks')
            .limit(100)
            .lean(),
        ]);

        const searchTenderIds = (searchTendersRaw as unknown as SearchTenderDoc[]).map((t: SearchTenderDoc) => t._id);

        // Fetch related records for matched search tenders
        const [searchApprovals, searchLOAs] = await Promise.all([
            Approval.find({ tenderId: { $in: searchTenderIds } } as unknown as Parameters<typeof Approval.find>[0]).select('tenderId notRequired proposalDate tenderApprovalDate').lean() as unknown as ApprovalDoc[],
            LOA.find({ tenderId: { $in: searchTenderIds } }).select('_id tenderId acceptanceLetterDate').lean() as unknown as LoaDoc[]
        ]);

        const searchLoaIds = searchLOAs.map((l: LoaDoc) => l._id);
        const searchWorkOrders = await WorkOrder.find({ loaId: { $in: searchLoaIds } } as unknown as Parameters<typeof WorkOrder.find>[0]).select('loaId workOrderDate').lean() as unknown as WorkOrderDoc[];

        const searchApprovalMap = new Map(searchApprovals.map((a: ApprovalDoc) => [String(a.tenderId), a]));
        const searchLoaMap = new Map(searchLOAs.map((l: LoaDoc) => [String(l.tenderId), l]));
        const searchWorkOrderMap = new Map(searchWorkOrders.map((wo: WorkOrderDoc) => [String(wo.loaId), wo]));
        const searchPackageMap = new Map((allPackages as unknown as PkgDoc[]).map((p: PkgDoc) => [p._id.toString(), p]));

        searchResultsData = (searchTendersRaw as unknown as (SearchTenderDoc & Record<string, unknown>)[]).map((tender: SearchTenderDoc & Record<string, unknown>) => {
            const tIdStr = tender._id.toString();
            const approval = searchApprovalMap.get(tIdStr);
            const loa = searchLoaMap.get(tIdStr);
            const workOrder = loa ? searchWorkOrderMap.get(loa._id.toString()) : null;

            const isApprovalNotRequired = approval?.notRequired === true || (
                (tender.estimatedAmount !== undefined && tender.estimatedAmount !== null)
                    ? Number(tender.estimatedAmount) < 5000000
                    : (tender.contractPrice !== undefined && Number(tender.contractPrice) < 5000000)
            );
            const proposalDate = isApprovalNotRequired ? 'Not Required' : (tender.proposalDate || approval?.proposalDate || null);
            const tenderApprovalDate = isApprovalNotRequired ? 'Not Required' : (tender.tenderApprovalDate || approval?.tenderApprovalDate || null);
            const acceptanceLetterDate = tender.acceptanceLetterDate || loa?.acceptanceLetterDate || null;
            const workOrderDate = tender.workOrderDate || workOrder?.workOrderDate || null;

            const pkg = tender.packageId ? searchPackageMap.get(String(tender.packageId)) : null;
            const approvedWorks = pkg && pkg.works && pkg.works.length > 0 
                ? pkg.works.map((w: PkgWorkEntry) => w.workName).filter(Boolean)
                : [];

            // Compute lifecycle status
            let status = 'Tendered';
            if (tender.cancelled) {
                status = 'Cancelled';
            } else if (workOrderDate) {
                status = 'Work Order Issued';
            } else if (acceptanceLetterDate) {
                status = 'LOA Issued';
            } else if (isApprovalNotRequired) {
                status = 'Approved (No Sanction Req.)';
            } else if (tenderApprovalDate) {
                status = 'Tender Approved';
            } else if (proposalDate) {
                status = 'Proposal Submitted';
            }

            return {
                _id: tIdStr,
                tenderNoticeYear: tender.tenderNoticeYear || '-',
                noticeNo: tender.noticeNo || '-',
                srNo: tender.srNo || '-',
                packageName: tender.packageName || 'Unspecified Package',
                approvedWorks,
                packageId: tender.packageId ? String(tender.packageId) : null,
                contractorName: tender.contractorName || '-',
                proposalDate,
                tenderApprovalDate,
                acceptanceLetterDate,
                workOrderDate,
                cancelled: tender.cancelled || false,
                cancellationReason: tender.cancellationReason || '',
                status,
            };
        });

        // Search Approved Works directly (already fetched above in parallel)
        const workNameToPkgInfo = new Map<string, { _id: string, packageName: string }>();
        (allPackages as unknown as PkgDoc[]).forEach((pkg: PkgDoc) => {
            if (pkg.works) {
                pkg.works.forEach((pw: PkgWorkEntry) => {
                    if (pw.workName) {
                        workNameToPkgInfo.set(normalizeString(pw.workName), {
                            _id: pkg._id.toString(),
                            packageName: pkg.packageName as string
                        });
                    }
                });
            }
        });

        searchApprovedWorksData = (matchedApprovedWorksRaw as unknown as (SearchApprovedWorkDoc & Record<string, unknown>)[]).map((w: SearchApprovedWorkDoc & Record<string, unknown>) => {
            const pkgInfo = workNameToPkgInfo.get(normalizeString(w.workName));
            return {
                ...w,
                _id: w._id.toString(),
                packageName: pkgInfo ? pkgInfo.packageName : null,
                packageId: pkgInfo ? pkgInfo._id : null
            };
        });
    }

    const searchColumns: Column[] = [
        { key: 'tenderNoticeYear', label: 'Notice Year' },
        { key: 'noticeNo', label: 'Notice No.' },
        { key: 'srNo', label: 'Sr No.', align: 'center' },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            minWidth: '200px', 
            render: (row) => (
                <div className="flex flex-col gap-1">
                    {row.packageId ? (
                        <Link href={`/packages/${row.packageId}`} className="text-emerald-600 hover:underline font-semibold break-words">
                            {row.packageName}
                        </Link>
                    ) : (
                        <span className="break-words font-medium text-slate-700">{row.packageName}</span>
                    )}
                </div>
            ) 
        },
        { 
            key: 'approvedWorks', 
            label: 'Approved Works', 
            minWidth: '250px',
            render: (row) => row.approvedWorks.length > 0 ? (
                <div className="space-y-1">
                    {row.approvedWorks.map((work: string, idx: number) => (
                        <div key={idx} className="text-xs leading-tight">
                            {idx + 1}. {work}
                        </div>
                    ))}
                </div>
            ) : <span className="text-slate-400 italic">No works found</span>
        },
        { key: 'contractorName', label: 'Contractor Name', minWidth: '150px' },
        { 
            key: 'proposalDate', 
            label: 'Proposal Date', 
            render: (row) => row.proposalDate === 'Not Required' ? (
                <span className="text-slate-500 italic font-semibold">Not Required</span>
            ) : <span className="text-slate-600">{formatShortDate(row.proposalDate)}</span> 
        },
        { 
            key: 'tenderApprovalDate', 
            label: 'Approval Date', 
            render: (row) => row.tenderApprovalDate === 'Not Required' ? (
                <span className="text-slate-500 italic font-semibold">Not Required</span>
            ) : <span className="text-slate-600">{formatShortDate(row.tenderApprovalDate)}</span> 
        },
        { 
            key: 'acceptanceLetterDate', 
            label: 'Acceptance Date', 
            render: (row) => <span className="text-slate-600">{formatShortDate(row.acceptanceLetterDate)}</span> 
        },
        { 
            key: 'workOrderDate', 
            label: 'Work Order Date', 
            render: (row) => <span className="text-slate-600">{formatShortDate(row.workOrderDate)}</span> 
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <Badge tone={toneForTenderStatus(row.status)}>{row.status}</Badge>,
        }
    ];

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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
                        <p className="text-sm font-medium text-slate-500">Panchayat Road and Building Division, Bhavnagar</p>
                    </div>
                    <div className="w-full md:w-96">
                        <Suspense fallback={<div className="h-10 bg-slate-200 animate-pulse rounded-md" />}>
                            <SearchBar placeholder="Search work or package name..." />
                        </Suspense>
                    </div>
                </div>

                {/* Search Results Section */}
                {searchQuery && (
                    <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-6">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Search Results</h2>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">Matching results for &quot;{searchQuery}&quot;</p>
                        </div>

                        {/* Matching Tenders & Packages Table */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Matching Tenders & Packages</h3>
                            <DataTable 
                                columns={searchColumns} 
                                data={searchResultsData} 
                                emptyMessage="No matching tenders or packages found."
                                exportFilename="Tenders_Search_Results.xlsx"
                            />
                        </div>

                        {/* Matching Approved Works Table */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Matching Approved Works</h3>
                            <DataTable 
                                columns={searchApprovedWorksColumns} 
                                data={searchApprovedWorksData} 
                                emptyMessage="No matching approved works found."
                                exportFilename="Approved_Works_Search_Results.xlsx"
                            />
                        </div>
                    </div>
                )}

                {/* 0. Weekly Work Order Report */}
                <WeeklyWorkOrderReport
                    weeks={weeklyWeeks}
                    selectedWeeks={cappedMondayKeys}
                    weekLabel={selectedWeekLabel}
                    rows={weeklyWorkOrderRows}
                />

                {/* 0b. Weekly Work Order Report with Job No Amount */}
                <WeeklyWorkOrderJobNoReport
                    weeks={weeklyWeeks}
                    selectedWeeks={cappedMondayKeys}
                    weekLabel={selectedWeekLabel}
                    rows={weeklyWorkOrderRows}
                />

                {/* 1. Summary Report */}
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



                {/* 4. Master Report (Approved Works) */}
                <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Master Report (Approved Works)</h2>
                                {loadMaster && (
                                    <Link 
                                        href={getQueryString({ loadMaster: null })}
                                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
                                    >
                                        Hide Report
                                    </Link>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">All columns of Approved Works — Filtered: {filterLabelText}</p>
                        </div>
                        {loadMaster && (
                            <div className="flex items-center gap-3">
                                <Suspense fallback={null}>
                                    <WorkTypeFilter workTypes={workTypes} />
                                </Suspense>
                            </div>
                        )}
                    </div>

                    {loadMaster ? (
                        <MasterReportTable data={serializedMasterWorks as unknown as React.ComponentProps<typeof MasterReportTable>['data']} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-3">
                            <p className="text-xs font-semibold text-slate-500">Master Report data is not loaded.</p>
                            <Link 
                                href={getQueryString({ loadMaster: 'true' })} 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                Load Master Report
                            </Link>
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
}
