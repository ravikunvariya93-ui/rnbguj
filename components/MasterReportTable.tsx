'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { utils, writeFile } from 'xlsx';
import clsx from 'clsx';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Copy,
    Download,
    GripVertical,
    Maximize2,
    Minimize2,
    Pin,
    PinOff,
    RotateCcw,
    Save,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';

interface ColumnConfig {
    key: string;
    label: string;
    category: string;
    defaultVisible: boolean;
    align?: 'left' | 'center' | 'right';
    minWidth?: string;
    isDate?: boolean;
    isBoolean?: boolean;
}

const CATEGORIES: Record<string, string> = {
    aw: 'Approved Work (AW)',
    ts: 'Technical Sanction (TS)',
    pkg: 'Package Info',
    dtp: 'DTP Details',
    tender: 'Tender Info',
    approval: 'Tender Approval',
    loa: 'LOA Details',
    wo: 'Work Order (WO)'
};

const ALL_COLUMNS: ColumnConfig[] = [
    // Approved Work
    { key: 'workName', label: 'Name of Work', category: 'aw', defaultVisible: true, minWidth: '350px' },
    { key: 'circle', label: 'Circle', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'district', label: 'District', category: 'aw', defaultVisible: false, minWidth: '100px' },
    { key: 'subDivision', label: 'Sub Division', category: 'aw', defaultVisible: true, minWidth: '150px' },
    { key: 'taluka', label: 'Taluka', category: 'aw', defaultVisible: false, minWidth: '100px' },
    { key: 'constituencyName', label: 'Constituency Name', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'budgetType', label: 'Budget Type', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'wmsItemCode', label: 'WMS Item Code', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'approvalYear', label: 'Approval Year', category: 'aw', defaultVisible: true, align: 'center', minWidth: '100px' },
    { key: 'jobNumberApprovalDate', label: 'Job Approval Date', category: 'aw', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'jobNumberAmount', label: 'Amount (Lakh)', category: 'aw', defaultVisible: true, align: 'right', minWidth: '120px' },
    { key: 'proposedLength', label: 'Proposed Length (km)', category: 'aw', defaultVisible: false, align: 'right', minWidth: '150px' },
    { key: 'contractProvision', label: 'Contract Provision', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'rpmsCode', label: 'RPMS Code', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'type', label: 'Type', category: 'aw', defaultVisible: false, minWidth: '100px' },
    { key: 'budgetHead', label: 'Budget Head', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'projectType', label: 'Project Type', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'mlaName', label: 'MLA Name', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'roadCategory', label: 'Road Category', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'workType', label: 'Work Type', category: 'aw', defaultVisible: true, minWidth: '100px' },
    { key: 'parliamentaryConstituency', label: 'Parliamentary Constituency', category: 'aw', defaultVisible: false, minWidth: '180px' },
    { key: 'mpName', label: 'MP Name', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'natureOfWork', label: 'Nature of Work', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'schemeName', label: 'Scheme Name', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'buildingType', label: 'Building Type', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'length', label: 'Length (km)', category: 'aw', defaultVisible: false, align: 'right', minWidth: '100px' },
    { key: 'chainage', label: 'Chainage', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'estimateConsultant', label: 'Estimate Consultant', category: 'aw', defaultVisible: false, minWidth: '180px' },
    { key: 'remarks', label: 'Remarks', category: 'aw', defaultVisible: false, minWidth: '200px' },
    { key: 'createdAt', label: 'Created At', category: 'aw', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'updatedAt', label: 'Updated At', category: 'aw', defaultVisible: false, isDate: true, minWidth: '150px' },

    // TS
    { key: 'ts_dateSendingTS', label: 'TS Sending Date', category: 'ts', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'ts_tsAuthority', label: 'TS Authority', category: 'ts', defaultVisible: false, minWidth: '150px' },
    { key: 'ts_tsAmount', label: 'TS Amount (Lakh)', category: 'ts', defaultVisible: false, align: 'right', minWidth: '120px' },
    { key: 'ts_tsNumber', label: 'TS Number', category: 'ts', defaultVisible: true, minWidth: '120px' },
    { key: 'ts_tsDate', label: 'TS Date', category: 'ts', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'ts_remarks', label: 'TS Remarks', category: 'ts', defaultVisible: false, minWidth: '200px' },

    // Package
    { key: 'pkg_packageName', label: 'Package Name', category: 'pkg', defaultVisible: true, minWidth: '200px' },

    // DTP
    { key: 'dtp_dtpSendingNo', label: 'DTP Sending No', category: 'dtp', defaultVisible: false, minWidth: '150px' },
    { key: 'dtp_dtpSendingDate', label: 'DTP Sending Date', category: 'dtp', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'dtp_dtpApprovingAuthority', label: 'DTP Approving Authority', category: 'dtp', defaultVisible: false, minWidth: '180px' },
    { key: 'dtp_dtpApprovalNo', label: 'DTP Approval No', category: 'dtp', defaultVisible: false, minWidth: '150px' },
    { key: 'dtp_dtpApprovalDate', label: 'DTP Approval Date', category: 'dtp', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'dtp_tenderAmount', label: 'DTP Tender Amount (Lakh)', category: 'dtp', defaultVisible: false, align: 'right', minWidth: '150px' },
    { key: 'dtp_remarks', label: 'DTP Remarks', category: 'dtp', defaultVisible: false, minWidth: '200px' },

    // Tender
    { key: 'tender_tenderId', label: 'Tender ID', category: 'tender', defaultVisible: false, minWidth: '120px' },
    { key: 'tender_tenderNoticeYear', label: 'Tender Notice Year', category: 'tender', defaultVisible: false, minWidth: '120px' },
    { key: 'tender_noticeNo', label: 'Tender Notice No', category: 'tender', defaultVisible: true, minWidth: '120px' },
    { key: 'tender_srNo', label: 'Tender Sr No', category: 'tender', defaultVisible: false, align: 'center', minWidth: '100px' },
    { key: 'tender_trialNo', label: 'Tender Trial No', category: 'tender', defaultVisible: false, align: 'center', minWidth: '100px' },
    { key: 'tender_tenderCreationDate', label: 'Tender Creation Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_lastDateOfSubmission', label: 'Last Submission Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_tenderOpeningDate', label: 'Tender Opening Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_tenderValidityDate', label: 'Tender Validity Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_estimatedAmount', label: 'Tender Estimated Amount (Lakh)', category: 'tender', defaultVisible: false, align: 'right', minWidth: '180px' },
    { key: 'tender_reInvite', label: 'Tender Re-invite?', category: 'tender', defaultVisible: false, isBoolean: true, minWidth: '120px' },
    { key: 'tender_cancelled', label: 'Tender Cancelled?', category: 'tender', defaultVisible: false, isBoolean: true, minWidth: '120px' },
    { key: 'tender_cancellationReason', label: 'Cancellation Reason', category: 'tender', defaultVisible: false, minWidth: '180px' },
    { key: 'tender_contractorName', label: 'Contractor Name', category: 'tender', defaultVisible: true, minWidth: '180px' },
    { key: 'tender_contractPrice', label: 'Contract Price (Lakh)', category: 'tender', defaultVisible: true, align: 'right', minWidth: '150px' },
    { key: 'tender_aboveBelowPercentage', label: 'Above/Below %', category: 'tender', defaultVisible: false, align: 'right', minWidth: '120px' },
    { key: 'tender_aboveBelowInWord', label: 'Above/Below (At Par)', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_proposalDate', label: 'Tender Proposal Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_tenderApprovalOffice', label: 'Tender Approval Office', category: 'tender', defaultVisible: false, minWidth: '180px' },
    { key: 'tender_tenderApprovalNo', label: 'Tender Approval No', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_tenderApprovalDate', label: 'Tender Approval Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_workDurationMonths', label: 'Tender Duration (Months)', category: 'tender', defaultVisible: false, align: 'center', minWidth: '150px' },
    { key: 'tender_acceptanceLetterWorksheetNo', label: 'Acceptance WS No', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_acceptanceLetterDate', label: 'Acceptance Letter Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_agreementYear', label: 'Tender Agreement Year', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_agreementNo', label: 'Tender Agreement No', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_agreementDate', label: 'Tender Agreement Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_securityDepositType', label: 'Tender SD Type', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_securityDepositBankName', label: 'Tender SD Bank', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_securityDepositNumber', label: 'Tender SD Number', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_securityDepositAmount', label: 'Tender SD Amount', category: 'tender', defaultVisible: false, align: 'right', minWidth: '150px' },
    { key: 'tender_securityDepositDate', label: 'Tender SD Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_additionalSecurityDepositType', label: 'Tender Addl SD Type', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_additionalSecurityDepositBankName', label: 'Tender Addl SD Bank', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_additionalSecurityDepositNumber', label: 'Tender Addl SD Number', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_additionalSecurityDepositAmount', label: 'Tender Addl SD Amount', category: 'tender', defaultVisible: false, align: 'right', minWidth: '150px' },
    { key: 'tender_additionalSecurityDepositDate', label: 'Tender Addl SD Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_workOrderWorksheetNo', label: 'Tender WO Worksheet No', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_workOrderDate', label: 'Tender WO Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_remarks', label: 'Tender Remarks', category: 'tender', defaultVisible: false, minWidth: '200px' },

    // Approval
    { key: 'approval_notRequired', label: 'Approval Not Required?', category: 'approval', defaultVisible: false, isBoolean: true, minWidth: '150px' },
    { key: 'approval_proposalDate', label: 'Approval Proposal Date', category: 'approval', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'approval_tenderApprovalOffice', label: 'Approval Office', category: 'approval', defaultVisible: false, minWidth: '180px' },
    { key: 'approval_tenderApprovalNo', label: 'Approval No', category: 'approval', defaultVisible: false, minWidth: '150px' },
    { key: 'approval_tenderApprovalDate', label: 'Approval Date', category: 'approval', defaultVisible: false, isDate: true, minWidth: '150px' },

    // LOA
    { key: 'loa_stampDuty', label: 'LOA Stamp Duty', category: 'loa', defaultVisible: false, align: 'right', minWidth: '120px' },
    { key: 'loa_defectLiabilityPeriod', label: 'LOA DLP', category: 'loa', defaultVisible: false, minWidth: '120px' },
    { key: 'loa_workDurationMonths', label: 'LOA Duration (Months)', category: 'loa', defaultVisible: false, align: 'center', minWidth: '150px' },
    { key: 'loa_acceptanceLetterWorksheetNo', label: 'LOA Acceptance WS No', category: 'loa', defaultVisible: false, minWidth: '150px' },
    { key: 'loa_acceptanceLetterDate', label: 'LOA Acceptance Letter Date', category: 'loa', defaultVisible: false, isDate: true, minWidth: '150px' },

    // Work Order
    { key: 'wo_agreementYear', label: 'Agreement Year', category: 'wo', defaultVisible: false, minWidth: '120px' },
    { key: 'wo_agreementNo', label: 'Agreement No', category: 'wo', defaultVisible: false, minWidth: '120px' },
    { key: 'wo_agreementDate', label: 'Agreement Date', category: 'wo', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'wo_securityDepositType', label: 'SD Type', category: 'wo', defaultVisible: false, minWidth: '120px' },
    { key: 'wo_securityDepositBankName', label: 'SD Bank', category: 'wo', defaultVisible: false, minWidth: '150px' },
    { key: 'wo_securityDepositNumber', label: 'SD Number', category: 'wo', defaultVisible: false, minWidth: '150px' },
    { key: 'wo_securityDepositAmount', label: 'SD Amount', category: 'wo', defaultVisible: false, align: 'right', minWidth: '120px' },
    { key: 'wo_securityDepositDate', label: 'SD Date', category: 'wo', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'wo_additionalSecurityDepositType', label: 'Addl SD Type', category: 'wo', defaultVisible: false, minWidth: '120px' },
    { key: 'wo_additionalSecurityDepositBankName', label: 'Addl SD Bank', category: 'wo', defaultVisible: false, minWidth: '150px' },
    { key: 'wo_additionalSecurityDepositNumber', label: 'Addl SD Number', category: 'wo', defaultVisible: false, minWidth: '150px' },
    { key: 'wo_additionalSecurityDepositAmount', label: 'Addl SD Amount', category: 'wo', defaultVisible: false, align: 'right', minWidth: '120px' },
    { key: 'wo_additionalSecurityDepositDate', label: 'Addl SD Date', category: 'wo', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'wo_workOrderWorksheetNo', label: 'WO Worksheet No', category: 'wo', defaultVisible: false, minWidth: '150px' },
    { key: 'wo_workOrderDate', label: 'Work Order Date', category: 'wo', defaultVisible: true, isDate: true, minWidth: '150px' },
    { key: 'wo_timeLimitStartsFrom', label: 'WO Time Limit Start', category: 'wo', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'wo_stipulatedCompletionDate', label: 'WO Completion Date', category: 'wo', defaultVisible: false, isDate: true, minWidth: '150px' }
];

type Density = 'compact' | 'comfortable' | 'spacious';
type PinSide = 'left' | 'right';

interface SortRule {
    key: string;
    dir: 'asc' | 'desc';
}

interface GridConfig {
    order: string[];
    hidden: string[];
    widths: Record<string, number>;
    pinned: Record<string, PinSide>;
    sort: SortRule[];
    density: Density;
    rowsPerPage: number;
    stickyHeader: boolean;
    zebra: boolean;
    wrap: boolean;
    filterRow: boolean;
}

interface SavedView {
    id: string;
    name: string;
    config: GridConfig;
}

interface MasterReportRow {
    _id?: string;
    workName?: string;
    tender_contractorName?: string;
    pkg_packageName?: string;
    [key: string]: string | number | boolean | null | undefined;
}

interface MasterReportTableProps {
    data: MasterReportRow[];
}

const COLUMN_KEYS = ALL_COLUMNS.map((c) => c.key);
const COLUMN_MAP = new Map(ALL_COLUMNS.map((c) => [c.key, c]));
const STORAGE_KEY = 'rnbguj.masterReport.grid.v1';
const VIEWS_KEY = 'rnbguj.masterReport.views.v1';
const SELECT_COL_WIDTH = 44;
const SERIAL_COL_WIDTH = 56;
const MIN_COL_WIDTH = 64;
const MAX_COL_WIDTH = 900;
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, -1];

const DENSITY_STYLE: Record<Density, { cell: string; head: string; text: string; filterTop: number }> = {
    compact: { cell: 'px-3 py-1.5', head: 'px-3 py-2', text: 'text-[11px]', filterTop: 34 },
    comfortable: { cell: 'px-3 py-2.5', head: 'px-3 py-3', text: 'text-xs', filterTop: 42 },
    spacious: { cell: 'px-4 py-3.5', head: 'px-4 py-4', text: 'text-sm', filterTop: 50 }
};

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';

function defaultWidth(col: ColumnConfig): number {
    const parsed = col.minWidth ? parseInt(col.minWidth, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : 160;
}

const DEFAULT_WIDTHS: Record<string, number> = Object.fromEntries(
    ALL_COLUMNS.map((c) => [c.key, defaultWidth(c)])
);

function makeDefaultConfig(): GridConfig {
    return {
        order: [...COLUMN_KEYS],
        hidden: ALL_COLUMNS.filter((c) => !c.defaultVisible).map((c) => c.key),
        widths: { ...DEFAULT_WIDTHS },
        pinned: {},
        sort: [],
        density: 'comfortable',
        rowsPerPage: 25,
        stickyHeader: true,
        zebra: true,
        wrap: true,
        filterRow: false
    };
}

function normalizeConfig(raw: unknown): GridConfig {
    const base = makeDefaultConfig();
    if (!raw || typeof raw !== 'object') return base;
    const obj = raw as Partial<GridConfig>;

    const seen = new Set<string>();
    const order: string[] = [];
    if (Array.isArray(obj.order)) {
        for (const key of obj.order) {
            if (typeof key === 'string' && COLUMN_MAP.has(key) && !seen.has(key)) {
                order.push(key);
                seen.add(key);
            }
        }
    }
    for (const key of COLUMN_KEYS) {
        if (!seen.has(key)) {
            order.push(key);
            seen.add(key);
        }
    }

    const hidden = Array.isArray(obj.hidden)
        ? obj.hidden.filter((k): k is string => typeof k === 'string' && COLUMN_MAP.has(k))
        : base.hidden;

    const widths: Record<string, number> = { ...DEFAULT_WIDTHS };
    if (obj.widths && typeof obj.widths === 'object') {
        for (const [key, value] of Object.entries(obj.widths)) {
            if (COLUMN_MAP.has(key) && typeof value === 'number' && Number.isFinite(value)) {
                widths[key] = Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, value));
            }
        }
    }

    const pinned: Record<string, PinSide> = {};
    if (obj.pinned && typeof obj.pinned === 'object') {
        for (const [key, value] of Object.entries(obj.pinned)) {
            if (COLUMN_MAP.has(key) && (value === 'left' || value === 'right')) pinned[key] = value;
        }
    }

    const sort: SortRule[] = Array.isArray(obj.sort)
        ? obj.sort.filter((s): s is SortRule => Boolean(s) && typeof s.key === 'string' && COLUMN_MAP.has(s.key) && (s.dir === 'asc' || s.dir === 'desc'))
        : [];

    const density: Density = obj.density === 'compact' || obj.density === 'spacious' ? obj.density : 'comfortable';
    const rowsPerPage = typeof obj.rowsPerPage === 'number' && ROWS_PER_PAGE_OPTIONS.includes(obj.rowsPerPage) ? obj.rowsPerPage : base.rowsPerPage;

    return {
        order,
        hidden,
        widths,
        pinned,
        sort,
        density,
        rowsPerPage,
        stickyHeader: obj.stickyHeader !== false,
        zebra: obj.zebra !== false,
        wrap: obj.wrap !== false,
        filterRow: obj.filterRow === true
    };
}

function formatValue(col: ColumnConfig, val: unknown): string {
    if (val === null || val === undefined || val === '') return '-';
    if (col.isDate) {
        const date = new Date(val as string | number | Date);
        return isNaN(date.getTime()) ? String(val) : date.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    }
    if (col.isBoolean) return val ? 'Yes' : 'No';
    return String(val);
}

function sortValue(col: ColumnConfig, raw: unknown): number | string {
    if (raw === null || raw === undefined || raw === '') return '';
    if (col.isDate) {
        const t = new Date(raw as string | number | Date).getTime();
        return Number.isFinite(t) ? t : '';
    }
    if (col.isBoolean) return raw ? 1 : 0;
    const s = String(raw);
    if (/^[\s\d.,+-]+$/.test(s)) {
        const n = Number(s.replace(/,/g, ''));
        if (Number.isFinite(n)) return n;
    }
    return s.toLowerCase();
}

function compareValues(a: number | string, b: number | string): number {
    if (a === b) return 0;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    const as = String(a);
    const bs = String(b);
    return as < bs ? -1 : as > bs ? 1 : 0;
}

function IconButton({
    label,
    onClick,
    active,
    disabled,
    title,
    className,
    children
}: {
    label: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    active?: boolean;
    disabled?: boolean;
    title?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            title={title ?? label}
            disabled={disabled}
            onClick={onClick}
            className={clsx(
                'inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors',
                active ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                disabled && 'cursor-not-allowed opacity-40',
                FOCUS_RING,
                'motion-reduce:transition-none',
                className
            )}
        >
            {children}
        </button>
    );
}

export default function MasterReportTable({ data }: MasterReportTableProps) {
    const [config, setConfig] = useState<GridConfig>(makeDefaultConfig);
    const [hydrated, setHydrated] = useState(false);
    const [showManager, setShowManager] = useState(false);
    const [columnSearch, setColumnSearch] = useState('');
    const [rowSearch, setRowSearch] = useState('');
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(() => new Set());
    const [dragKey, setDragKey] = useState<string | null>(null);
    const [dragOverKey, setDragOverKey] = useState<string | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [savedViews, setSavedViews] = useState<SavedView[]>([]);
    const [viewName, setViewName] = useState('');
    const [status, setStatus] = useState('');
    const selectAllRef = useRef<HTMLInputElement>(null);
    const resizeRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

    const announce = useCallback((message: string) => setStatus(message), []);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored) setConfig(normalizeConfig(JSON.parse(stored)));
            const storedViews = window.localStorage.getItem(VIEWS_KEY);
            if (storedViews) {
                const parsed = JSON.parse(storedViews);
                if (Array.isArray(parsed)) {
                    setSavedViews(
                        parsed
                            .filter((v): v is SavedView => Boolean(v) && typeof v.id === 'string' && typeof v.name === 'string')
                            .map((v) => ({ id: v.id, name: v.name, config: normalizeConfig(v.config) }))
                    );
                }
            }
        } catch {
            /* corrupt storage is non-fatal — fall back to defaults */
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch {
            /* storage unavailable */
        }
    }, [config, hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(VIEWS_KEY, JSON.stringify(savedViews));
        } catch {
            /* storage unavailable */
        }
    }, [savedViews, hydrated]);

    useEffect(() => {
        setCurrentPage(1);
    }, [rowSearch, columnFilters, config.rowsPerPage, config.sort]);

    useEffect(() => {
        const checkbox = selectAllRef.current;
        if (!checkbox) return;
        const pageIds = data.map((row) => row._id).filter((id): id is string => Boolean(id));
        const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
        checkbox.indeterminate = selectedOnPage > 0 && selectedOnPage < pageIds.length;
        checkbox.checked = pageIds.length > 0 && selectedOnPage === pageIds.length;
    }, [selected, data]);

    const columnsInOrder = useMemo(
        () => config.order.map((key) => COLUMN_MAP.get(key)).filter((c): c is ColumnConfig => Boolean(c)),
        [config.order]
    );
    const visibleColumns = useMemo(
        () => columnsInOrder.filter((c) => !config.hidden.includes(c.key)),
        [columnsInOrder, config.hidden]
    );
    const orderedVisible = useMemo(() => {
        const left = visibleColumns.filter((c) => config.pinned[c.key] === 'left');
        const right = visibleColumns.filter((c) => config.pinned[c.key] === 'right');
        const middle = visibleColumns.filter((c) => !config.pinned[c.key]);
        return [...left, ...middle, ...right];
    }, [visibleColumns, config.pinned]);

    const colWidth = useCallback(
        (key: string) => config.widths[key] ?? DEFAULT_WIDTHS[key] ?? 160,
        [config.widths]
    );

    const leftOffsets = useMemo(() => {
        const offsets: Record<string, number> = {};
        let acc = SELECT_COL_WIDTH + SERIAL_COL_WIDTH;
        for (const col of orderedVisible) {
            if (config.pinned[col.key] === 'left') {
                offsets[col.key] = acc;
                acc += colWidth(col.key);
            }
        }
        return offsets;
    }, [orderedVisible, config.pinned, colWidth]);

    const rightOffsets = useMemo(() => {
        const offsets: Record<string, number> = {};
        let acc = 0;
        for (let i = orderedVisible.length - 1; i >= 0; i -= 1) {
            const col = orderedVisible[i];
            if (config.pinned[col.key] === 'right') {
                offsets[col.key] = acc;
                acc += colWidth(col.key);
            }
        }
        return offsets;
    }, [orderedVisible, config.pinned, colWidth]);

    const filteredRows = useMemo(() => {
        let rows = data;
        const query = rowSearch.trim().toLowerCase();
        if (query) {
            rows = rows.filter((row) => visibleColumns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(query)));
        }
        const activeFilters = Object.entries(columnFilters).filter(([, value]) => value.trim());
        if (activeFilters.length > 0) {
            rows = rows.filter((row) =>
                activeFilters.every(([key, value]) => String(row[key] ?? '').toLowerCase().includes(value.trim().toLowerCase()))
            );
        }
        return rows;
    }, [data, rowSearch, columnFilters, visibleColumns]);

    const sortedRows = useMemo(() => {
        if (config.sort.length === 0) return filteredRows;
        const rules = config.sort
            .map((rule) => ({ rule, col: COLUMN_MAP.get(rule.key) }))
            .filter((entry): entry is { rule: SortRule; col: ColumnConfig } => Boolean(entry.col));
        return [...filteredRows].sort((a, b) => {
            for (const { rule, col } of rules) {
                const result = compareValues(sortValue(col, a[rule.key]), sortValue(col, b[rule.key]));
                if (result !== 0) return rule.dir === 'asc' ? result : -result;
            }
            return 0;
        });
    }, [filteredRows, config.sort]);

    const totalPages = config.rowsPerPage === -1 ? 1 : Math.max(1, Math.ceil(sortedRows.length / config.rowsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedRows = useMemo(() => {
        if (config.rowsPerPage === -1) return sortedRows;
        const start = (safePage - 1) * config.rowsPerPage;
        return sortedRows.slice(start, start + config.rowsPerPage);
    }, [sortedRows, safePage, config.rowsPerPage]);

    const patchConfig = useCallback((patch: Partial<GridConfig>) => {
        setConfig((prev) => ({ ...prev, ...patch }));
    }, []);

    const toggleColumn = useCallback(
        (key: string) => {
            setConfig((prev) => {
                const hidden = prev.hidden.includes(key)
                    ? prev.hidden.filter((k) => k !== key)
                    : [...prev.hidden, key];
                return { ...prev, hidden };
            });
        },
        []
    );

    const setColumnVisible = useCallback((key: string, visible: boolean) => {
        setConfig((prev) => {
            const isHidden = prev.hidden.includes(key);
            if (visible && isHidden) return { ...prev, hidden: prev.hidden.filter((k) => k !== key) };
            if (!visible && !isHidden) return { ...prev, hidden: [...prev.hidden, key] };
            return prev;
        });
    }, []);

    const setAllVisible = useCallback((visible: boolean) => {
        setConfig((prev) => ({ ...prev, hidden: visible ? [] : [...COLUMN_KEYS] }));
        announce(visible ? 'All columns shown' : 'All columns hidden');
    }, [announce]);

    const cyclePin = useCallback((key: string) => {
        setConfig((prev) => {
            const pinned = { ...prev.pinned };
            const current = pinned[key];
            if (!current) pinned[key] = 'left';
            else if (current === 'left') pinned[key] = 'right';
            else delete pinned[key];
            return { ...prev, pinned };
        });
    }, []);

    const setPin = useCallback((key: string, side: PinSide | null) => {
        setConfig((prev) => {
            const pinned = { ...prev.pinned };
            if (side) pinned[key] = side;
            else delete pinned[key];
            return { ...prev, pinned };
        });
        announce(side ? `Pinned ${COLUMN_MAP.get(key)?.label} ${side}` : `Unpinned ${COLUMN_MAP.get(key)?.label}`);
    }, [announce]);

    const moveColumn = useCallback(
        (fromKey: string, toKey: string) => {
            if (fromKey === toKey) return;
            setConfig((prev) => {
                const order = [...prev.order];
                const from = order.indexOf(fromKey);
                const to = order.indexOf(toKey);
                if (from < 0 || to < 0) return prev;
                order.splice(from, 1);
                order.splice(to, 0, fromKey);
                return { ...prev, order };
            });
        },
        []
    );

    const nudgeColumn = useCallback(
        (key: string, direction: -1 | 1) => {
            setConfig((prev) => {
                const order = [...prev.order];
                const from = order.indexOf(key);
                const to = from + direction;
                if (from < 0 || to < 0 || to >= order.length) return prev;
                [order[from], order[to]] = [order[to], order[from]];
                return { ...prev, order };
            });
            announce(`Moved ${COLUMN_MAP.get(key)?.label}`);
        },
        [announce]
    );

    const toggleSort = useCallback((key: string, additive: boolean) => {
        setConfig((prev) => {
            const existing = prev.sort.find((rule) => rule.key === key);
            if (!additive) {
                const sort: SortRule[] = !existing
                    ? [{ key, dir: 'asc' }]
                    : existing.dir === 'asc'
                        ? [{ key, dir: 'desc' }]
                        : [];
                return { ...prev, sort };
            }
            const sort = [...prev.sort];
            const index = sort.findIndex((rule) => rule.key === key);
            if (index < 0) sort.push({ key, dir: 'asc' });
            else if (sort[index].dir === 'asc') sort[index] = { key, dir: 'desc' };
            else sort.splice(index, 1);
            return { ...prev, sort };
        });
    }, []);

    const startResize = useCallback(
        (event: React.MouseEvent, key: string) => {
            event.preventDefault();
            event.stopPropagation();
            resizeRef.current = { key, startX: event.clientX, startWidth: colWidth(key) };
            const onMove = (moveEvent: MouseEvent) => {
                const state = resizeRef.current;
                if (!state) return;
                const next = Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, state.startWidth + (moveEvent.clientX - state.startX)));
                setConfig((prev) => ({ ...prev, widths: { ...prev.widths, [state.key]: next } }));
            };
            const onUp = () => {
                resizeRef.current = null;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        },
        [colWidth]
    );

    const resizeByKeyboard = useCallback(
        (key: string, delta: number) => {
            setConfig((prev) => ({
                ...prev,
                widths: {
                    ...prev.widths,
                    [key]: Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, (prev.widths[key] ?? DEFAULT_WIDTHS[key] ?? 160) + delta))
                }
            }));
        },
        []
    );

    const resetWidth = useCallback(
        (key: string) => {
            setConfig((prev) => {
                const widths = { ...prev.widths };
                delete widths[key];
                return { ...prev, widths };
            });
        },
        []
    );

    const resetAll = useCallback(() => {
        setConfig(makeDefaultConfig());
        setColumnFilters({});
        setRowSearch('');
        announce('Layout reset to defaults');
    }, [announce]);

    const resetOrder = useCallback(() => {
        patchConfig({ order: [...COLUMN_KEYS] });
        announce('Column order reset');
    }, [announce, patchConfig]);

    const resetWidths = useCallback(() => {
        patchConfig({ widths: { ...DEFAULT_WIDTHS } });
        announce('Column widths reset');
    }, [announce, patchConfig]);

    const saveView = useCallback(() => {
        const name = viewName.trim();
        if (!name) return;
        const view: SavedView = { id: `${Date.now()}`, name, config };
        setSavedViews((prev) => [...prev.filter((v) => v.name !== name), view]);
        setViewName('');
        announce(`Saved view "${name}"`);
    }, [announce, config, viewName]);

    const applyView = useCallback(
        (id: string) => {
            if (!id) return;
            const view = savedViews.find((v) => v.id === id);
            if (!view) return;
            setConfig(normalizeConfig(view.config));
            announce(`Applied view "${view.name}"`);
        },
        [announce, savedViews]
    );

    const deleteView = useCallback(
        (id: string) => {
            if (!id) return;
            setSavedViews((prev) => prev.filter((v) => v.id !== id));
            announce('Deleted view');
        },
        [announce]
    );

    const rowsForExport = useCallback(
        (columns: ColumnConfig[], rows: MasterReportRow[]) =>
            rows.map((row, index) => {
                const record: Record<string, string | number> = { 'Sr. No.': index + 1 };
                columns.forEach((col) => {
                    record[col.label] = formatValue(col, row[col.key]);
                });
                return record;
            }),
        []
    );

    const exportExcel = useCallback(
        (columns: ColumnConfig[], rows: MasterReportRow[], label: string) => {
            const sheet = utils.json_to_sheet(rowsForExport(columns, rows));
            const workbook = utils.book_new();
            utils.book_append_sheet(workbook, sheet, 'Master Report');
            const stamp = new Date().toISOString().slice(0, 10);
            writeFile(workbook, `Approved_Works_Master_Report_${label}_${stamp}.xlsx`);
            announce(`Exported ${rows.length} rows (${label})`);
        },
        [announce, rowsForExport]
    );

    const copySelected = useCallback(async () => {
        const columns = orderedVisible;
        const rows = sortedRows.filter((row) => row._id && selected.has(row._id));
        const header = ['Sr. No.', ...columns.map((c) => c.label)].join('\t');
        const body = rows
            .map((row, index) =>
                [String(index + 1), ...columns.map((col) => formatValue(col, row[col.key]).replace(/[\t\n]+/g, ' '))].join('\t')
            )
            .join('\n');
        try {
            await navigator.clipboard.writeText(`${header}\n${body}`);
            announce(`Copied ${rows.length} rows`);
        } catch {
            announce('Clipboard unavailable');
        }
    }, [announce, orderedVisible, selected, sortedRows]);

    const toggleRow = useCallback((id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleAllRows = useCallback(() => {
        const ids = sortedRows.map((row) => row._id).filter((id): id is string => Boolean(id));
        setSelected((prev) => {
            const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
            const next = new Set(prev);
            if (allSelected) ids.forEach((id) => next.delete(id));
            else ids.forEach((id) => next.add(id));
            return next;
        });
    }, [sortedRows]);

    useEffect(() => {
        if (!fullscreen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFullscreen(false);
        };
        document.addEventListener('keydown', onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [fullscreen]);

    const densityStyle = DENSITY_STYLE[config.density];
    const managerColumns = useMemo(() => {
        const query = columnSearch.trim().toLowerCase();
        if (!query) return columnsInOrder;
        return columnsInOrder.filter((col) => col.label.toLowerCase().includes(query));
    }, [columnSearch, columnsInOrder]);

    const selectedCount = selected.size;
    const rowBg = useCallback(
        (index: number) => (config.zebra ? (index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60') : 'bg-white'),
        [config.zebra]
    );

    const headerStickyClass = config.stickyHeader ? 'sticky top-0' : '';

    const renderHeaderCell = (col: ColumnConfig) => {
        const sorted = config.sort.find((rule) => rule.key === col.key);
        const sortIndex = config.sort.findIndex((rule) => rule.key === col.key);
        const side = config.pinned[col.key];
        const style: React.CSSProperties = { width: colWidth(col.key), minWidth: colWidth(col.key) };
        let sticky = headerStickyClass;
        let zIndex = 20;
        if (side === 'left') {
            style.left = leftOffsets[col.key];
            sticky = 'sticky';
            zIndex = 30;
        }
        if (side === 'right') {
            style.right = rightOffsets[col.key];
            sticky = 'sticky';
            zIndex = 30;
        }
        if (config.stickyHeader && side) {
            style.top = 0;
        }
        return (
            <th
                key={col.key}
                scope="col"
                aria-label={col.label}
                aria-sort={sorted ? (sorted.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                draggable
                onDragStart={(event) => {
                    setDragKey(col.key);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', col.key);
                }}
                onDragOver={(event) => {
                    event.preventDefault();
                    if (dragKey && dragKey !== col.key) setDragOverKey(col.key);
                }}
                onDragLeave={() => setDragOverKey((key) => (key === col.key ? null : key))}
                onDrop={(event) => {
                    event.preventDefault();
                    const from = dragKey ?? event.dataTransfer.getData('text/plain');
                    if (from && from !== col.key) moveColumn(from, col.key);
                    setDragKey(null);
                    setDragOverKey(null);
                }}
                onDragEnd={() => {
                    setDragKey(null);
                    setDragOverKey(null);
                }}
                className={clsx(
                    'group relative select-none border-b border-r border-slate-200 bg-slate-50 font-bold text-slate-700',
                    densityStyle.head,
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                    sticky,
                    dragOverKey === col.key && 'outline outline-2 outline-sky-400',
                    dragKey === col.key && 'opacity-50'
                )}
                style={{ ...style, zIndex }}
            >
                <div className="flex items-center gap-1">
                    <span
                        aria-hidden="true"
                        className="cursor-grab text-slate-300 group-hover:text-slate-500"
                        title="Drag to reorder"
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    <button
                        type="button"
                        onClick={(event) => toggleSort(col.key, event.shiftKey)}
                        onKeyDown={(event) => {
                            if (event.altKey && event.key === 'ArrowLeft') {
                                event.preventDefault();
                                nudgeColumn(col.key, -1);
                            }
                            if (event.altKey && event.key === 'ArrowRight') {
                                event.preventDefault();
                                nudgeColumn(col.key, 1);
                            }
                            if (event.altKey && event.key === 'ArrowUp') {
                                event.preventDefault();
                                resizeByKeyboard(col.key, 24);
                            }
                            if (event.altKey && event.key === 'ArrowDown') {
                                event.preventDefault();
                                resizeByKeyboard(col.key, -24);
                            }
                        }}
                        className={clsx(
                            'flex flex-1 items-center gap-1 rounded px-1 py-0.5 text-left hover:text-sky-700',
                            FOCUS_RING,
                            col.align === 'center' && 'justify-center',
                            col.align === 'right' && 'justify-end'
                        )}
                        title={`${col.label} — click to sort, Shift+click to add, Alt+Left/Right to reorder, Alt+Up/Down to resize`}
                    >
                        <span className="flex-1 truncate">{col.label}</span>
                        {sorted ? (
                            <span className="flex items-center gap-0.5 text-sky-600">
                                {sorted.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                                {config.sort.length > 1 && (
                                    <span className="rounded bg-sky-100 px-1 text-[9px] font-bold text-sky-700">{sortIndex + 1}</span>
                                )}
                            </span>
                        ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            cyclePin(col.key);
                        }}
                        aria-label={`Pin ${col.label}`}
                        title={side ? `Pinned ${side} — click to change` : 'Pin column'}
                        className={clsx(
                            'rounded p-0.5',
                            FOCUS_RING,
                            side ? 'text-sky-600' : 'text-slate-300 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                        )}
                    >
                        {side ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                    </button>
                </div>
                <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${col.label}`}
                    aria-valuenow={Math.round(colWidth(col.key))}
                    aria-valuemin={MIN_COL_WIDTH}
                    aria-valuemax={MAX_COL_WIDTH}
                    tabIndex={-1}
                    onMouseDown={(event) => startResize(event, col.key)}
                    onDoubleClick={() => resetWidth(col.key)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-sky-400"
                />
            </th>
        );
    };

    return (
        <div
            className={clsx(
                'space-y-4',
                fullscreen && 'fixed inset-0 z-50 overflow-auto bg-white p-4'
            )}
        >
            <div role="status" aria-live="polite" className="sr-only">
                {status}
            </div>

            <div className="flex flex-col gap-3 border border-slate-200 bg-white p-4 shadow-sm rounded-xl">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search all columns..."
                            value={rowSearch}
                            onChange={(event) => setRowSearch(event.target.value)}
                            className={clsx(
                                'w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white',
                                FOCUS_RING
                            )}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowManager((prev) => !prev)}
                            aria-expanded={showManager}
                            className={clsx(
                                'inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors',
                                showManager ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                                FOCUS_RING
                            )}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Columns
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                {visibleColumns.length}/{ALL_COLUMNS.length}
                            </span>
                        </button>

                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Row density">
                            {(['compact', 'comfortable', 'spacious'] as Density[]).map((density) => (
                                <button
                                    key={density}
                                    type="button"
                                    aria-pressed={config.density === density}
                                    onClick={() => patchConfig({ density })}
                                    className={clsx(
                                        'h-9 rounded-md px-2.5 text-[11px] font-bold capitalize transition-colors',
                                        config.density === density ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                                        FOCUS_RING
                                    )}
                                >
                                    {density}
                                </button>
                            ))}
                        </div>

                        <IconButton
                            label="Sticky header"
                            active={config.stickyHeader}
                            onClick={() => patchConfig({ stickyHeader: !config.stickyHeader })}
                        >
                            <ChevronUp className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                            label="Zebra striping"
                            active={config.zebra}
                            onClick={() => patchConfig({ zebra: !config.zebra })}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                            label="Wrap text"
                            active={config.wrap}
                            onClick={() => patchConfig({ wrap: !config.wrap })}
                        >
                            <span className="text-[11px] font-black">W</span>
                        </IconButton>
                        <IconButton
                            label="Per-column filters"
                            active={config.filterRow}
                            onClick={() => patchConfig({ filterRow: !config.filterRow })}
                        >
                            <Search className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                            label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                            active={fullscreen}
                            onClick={() => setFullscreen((prev) => !prev)}
                        >
                            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </IconButton>
                        <IconButton label="Reset layout" onClick={resetAll}>
                            <RotateCcw className="h-4 w-4" />
                        </IconButton>

                        <IconButton
                            label="Export visible columns to Excel"
                            disabled={filteredRows.length === 0}
                            onClick={() => exportExcel(orderedVisible, sortedRows, 'visible')}
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Export</span>
                        </IconButton>
                        <IconButton
                            label="Export all columns to Excel"
                            disabled={filteredRows.length === 0}
                            onClick={() => exportExcel(columnsInOrder, sortedRows, 'all')}
                        >
                            <span className="text-[11px] font-bold">All</span>
                        </IconButton>
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                            Saved view
                            <select
                                value=""
                                onChange={(event) => applyView(event.target.value)}
                                className={clsx('rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700', FOCUS_RING)}
                            >
                                <option value="">Apply a saved view...</option>
                                {savedViews.map((view) => (
                                    <option key={view.id} value={view.id}>
                                        {view.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <input
                            type="text"
                            placeholder="New view name"
                            value={viewName}
                            onChange={(event) => setViewName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') saveView();
                            }}
                            className={clsx('w-36 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white', FOCUS_RING)}
                        />
                        <button
                            type="button"
                            onClick={saveView}
                            disabled={!viewName.trim()}
                            className={clsx(
                                'inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50',
                                FOCUS_RING,
                                !viewName.trim() && 'cursor-not-allowed opacity-40'
                            )}
                        >
                            <Save className="h-3.5 w-3.5" />
                            Save view
                        </button>
                        {savedViews.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    const last = savedViews[savedViews.length - 1];
                                    if (last) deleteView(last.id);
                                }}
                                className={clsx('inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 px-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50', FOCUS_RING)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete last view
                            </button>
                        )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500">
                        {filteredRows.length} of {data.length} works
                        {config.sort.length > 0 && (
                            <span className="ml-2 text-sky-700">
                                sorted by {config.sort.map((rule) => COLUMN_MAP.get(rule.key)?.label).filter(Boolean).join(', ')}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {showManager && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Columns</h3>
                            <p className="text-xs font-medium text-slate-500">Drag a row to reorder. Use the arrows for keyboard reordering.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setAllVisible(true)} className={clsx('rounded bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200', FOCUS_RING)}>
                                Show all
                            </button>
                            <button type="button" onClick={() => setAllVisible(false)} className={clsx('rounded bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200', FOCUS_RING)}>
                                Hide all
                            </button>
                            <button type="button" onClick={resetOrder} className={clsx('rounded bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100', FOCUS_RING)}>
                                Reset order
                            </button>
                            <button type="button" onClick={resetWidths} className={clsx('rounded bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100', FOCUS_RING)}>
                                Reset widths
                            </button>
                        </div>
                    </div>

                    <div className="relative mt-3 max-w-xs">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter columns by name..."
                            value={columnSearch}
                            onChange={(event) => setColumnSearch(event.target.value)}
                            className={clsx('w-full rounded border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white', FOCUS_RING)}
                        />
                    </div>

                    <ul className="mt-3 space-y-1.5" role="list">
                        {managerColumns.map((col, index) => {
                            const hidden = config.hidden.includes(col.key);
                            const side = config.pinned[col.key];
                            const canMoveUp = index > 0;
                            const canMoveDown = index < managerColumns.length - 1;
                            return (
                                <li
                                    key={col.key}
                                    draggable
                                    onDragStart={(event) => {
                                        setDragKey(col.key);
                                        event.dataTransfer.effectAllowed = 'move';
                                        event.dataTransfer.setData('text/plain', col.key);
                                    }}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        if (dragKey && dragKey !== col.key) setDragOverKey(col.key);
                                    }}
                                    onDragLeave={() => setDragOverKey((key) => (key === col.key ? null : key))}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        const from = dragKey ?? event.dataTransfer.getData('text/plain');
                                        if (from && from !== col.key) moveColumn(from, col.key);
                                        setDragKey(null);
                                        setDragOverKey(null);
                                    }}
                                    onDragEnd={() => {
                                        setDragKey(null);
                                        setDragOverKey(null);
                                    }}
                                    className={clsx(
                                        'flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5',
                                        dragOverKey === col.key ? 'border-sky-400 bg-sky-50/50' : 'border-slate-100 hover:border-slate-200',
                                        dragKey === col.key && 'opacity-50'
                                    )}
                                >
                                    <span aria-hidden="true" className="cursor-grab text-slate-300">
                                        <GripVertical className="h-4 w-4" />
                                    </span>
                                    <label className="flex flex-1 items-center gap-2 text-xs font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={!hidden}
                                            onChange={(event) => setColumnVisible(col.key, event.target.checked)}
                                            className={clsx('h-3.5 w-3.5 rounded border-gray-300 text-emerald-600', FOCUS_RING)}
                                        />
                                        <span className="truncate">{col.label}</span>
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                                            {CATEGORIES[col.category]?.replace(/\s*\(.*\)$/, '')}
                                        </span>
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setPin(col.key, side === 'left' ? null : 'left')}
                                            aria-pressed={side === 'left'}
                                            aria-label={`Pin ${col.label} to the left`}
                                            className={clsx('rounded p-1', FOCUS_RING, side === 'left' ? 'text-sky-600' : 'text-slate-400 hover:text-slate-700')}
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPin(col.key, side === 'right' ? null : 'right')}
                                            aria-pressed={side === 'right'}
                                            aria-label={`Pin ${col.label} to the right`}
                                            className={clsx('rounded p-1', FOCUS_RING, side === 'right' ? 'text-sky-600' : 'text-slate-400 hover:text-slate-700')}
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => nudgeColumn(col.key, -1)}
                                            disabled={!canMoveUp}
                                            aria-label={`Move ${col.label} earlier`}
                                            className={clsx('rounded p-1 text-slate-400 hover:text-slate-700', FOCUS_RING, !canMoveUp && 'cursor-not-allowed opacity-30')}
                                        >
                                            <ArrowUp className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => nudgeColumn(col.key, 1)}
                                            disabled={!canMoveDown}
                                            aria-label={`Move ${col.label} later`}
                                            className={clsx('rounded p-1 text-slate-400 hover:text-slate-700', FOCUS_RING, !canMoveDown && 'cursor-not-allowed opacity-30')}
                                        >
                                            <ArrowDown className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => resetWidth(col.key)}
                                            aria-label={`Reset width of ${col.label}`}
                                            className={clsx('rounded p-1 text-slate-400 hover:text-slate-700', FOCUS_RING)}
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                        {managerColumns.length === 0 && (
                            <li className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-xs font-semibold text-slate-500">
                                No columns match “{columnSearch}”.
                            </li>
                        )}
                    </ul>
                </div>
            )}

            {selectedCount > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2">
                    <span className="text-xs font-bold text-sky-800">{selectedCount} selected</span>
                    <button
                        type="button"
                        onClick={copySelected}
                        className={clsx('inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 text-[11px] font-bold text-sky-700 hover:bg-sky-100', FOCUS_RING)}
                    >
                        <Copy className="h-3.5 w-3.5" />
                        Copy as TSV
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            exportExcel(
                                orderedVisible,
                                sortedRows.filter((row) => row._id && selected.has(row._id)),
                                'selected'
                            )
                        }
                        className={clsx('inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 text-[11px] font-bold text-sky-700 hover:bg-sky-100', FOCUS_RING)}
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export selected
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        className={clsx('inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-3 text-[11px] font-bold text-slate-600 hover:bg-white', FOCUS_RING)}
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear selection
                    </button>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-auto" style={{ maxHeight: fullscreen ? 'calc(100vh - 240px)' : '70vh' }}>
                    <table
                        className={clsx('border-separate border-spacing-0 text-left font-medium', densityStyle.text)}
                        style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}
                    >
                        <caption className="sr-only">Approved works master report. {filteredRows.length} rows.</caption>
                        <colgroup>
                            <col style={{ width: SELECT_COL_WIDTH }} />
                            <col style={{ width: SERIAL_COL_WIDTH }} />
                            {orderedVisible.map((col) => (
                                <col key={col.key} style={{ width: colWidth(col.key) }} />
                            ))}
                        </colgroup>
                        <thead>
                            <tr>
                                <th
                                    scope="col"
                                    className={clsx('sticky left-0 border-b border-r border-slate-200 bg-slate-50 p-0 text-center', config.stickyHeader && 'top-0')}
                                    style={{ width: SELECT_COL_WIDTH, zIndex: 30 }}
                                >
                                    <span className="flex h-full items-center justify-center py-2">
                                        <input
                                            ref={selectAllRef}
                                            type="checkbox"
                                            onChange={toggleAllRows}
                                            aria-label="Select all rows"
                                            className={clsx('h-3.5 w-3.5 rounded border-gray-300 text-emerald-600', FOCUS_RING)}
                                        />
                                    </span>
                                </th>
                                <th
                                    scope="col"
                                    className={clsx('sticky border-b border-r border-slate-200 bg-slate-50 font-bold text-slate-700', densityStyle.head, config.stickyHeader && 'top-0')}
                                    style={{ left: SELECT_COL_WIDTH, width: SERIAL_COL_WIDTH, zIndex: 30 }}
                                >
                                    Sr. No.
                                </th>
                                {orderedVisible.map(renderHeaderCell)}
                            </tr>
                            {config.filterRow && (
                                <tr>
                                    <th scope="col" className="sticky left-0 border-b border-r border-slate-200 bg-white" style={{ width: SELECT_COL_WIDTH, zIndex: 30, top: config.stickyHeader ? densityStyle.filterTop : undefined }} />
                                    <th scope="col" className="sticky border-b border-r border-slate-200 bg-white" style={{ left: SELECT_COL_WIDTH, width: SERIAL_COL_WIDTH, zIndex: 30, top: config.stickyHeader ? densityStyle.filterTop : undefined }} />
                                    {orderedVisible.map((col) => {
                                        const side = config.pinned[col.key];
                                        const style: React.CSSProperties = { width: colWidth(col.key), top: config.stickyHeader ? densityStyle.filterTop : undefined };
                                        if (side === 'left') style.left = leftOffsets[col.key];
                                        if (side === 'right') style.right = rightOffsets[col.key];
                                        return (
                                            <th
                                                key={col.key}
                                                scope="col"
                                                className={clsx(
                                                    'border-b border-r border-slate-200 bg-white p-1',
                                                    (config.stickyHeader || side) && 'sticky',
                                                    side && 'z-30'
                                                )}
                                                style={style}
                                            >
                                                <input
                                                    type="text"
                                                    value={columnFilters[col.key] ?? ''}
                                                    onChange={(event) =>
                                                        setColumnFilters((prev) => ({ ...prev, [col.key]: event.target.value }))
                                                    }
                                                    placeholder="Filter"
                                                    aria-label={`Filter ${col.label}`}
                                                    className={clsx('w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white', FOCUS_RING)}
                                                />
                                            </th>
                                        );
                                    })}
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {paginatedRows.length > 0 ? (
                                paginatedRows.map((row, index) => {
                                    const serial = (safePage - 1) * (config.rowsPerPage === -1 ? 0 : config.rowsPerPage) + index + 1;
                                    const isSelected = Boolean(row._id && selected.has(row._id));
                                    const background = rowBg(index);
                                    return (
                                        <tr key={row._id ?? index} className={clsx(background, isSelected && 'bg-sky-50', 'hover:bg-sky-50/60')}>
                                            <td className={clsx('sticky left-0 border-b border-r border-slate-100 text-center', densityStyle.cell, background, isSelected && 'bg-sky-50')} style={{ zIndex: 10 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={!row._id}
                                                    onChange={() => row._id && toggleRow(row._id)}
                                                    aria-label={`Select ${row.workName ?? 'row'}`}
                                                    className={clsx('h-3.5 w-3.5 rounded border-gray-300 text-emerald-600', FOCUS_RING)}
                                                />
                                            </td>
                                            <td className={clsx('sticky border-b border-r border-slate-100 text-center font-semibold text-slate-500', densityStyle.cell, background, isSelected && 'bg-sky-50')} style={{ left: SELECT_COL_WIDTH, zIndex: 10 }}>
                                                {serial}
                                            </td>
                                            {orderedVisible.map((col) => {
                                                const side = config.pinned[col.key];
                                                const value = formatValue(col, row[col.key]);
                                                const style: React.CSSProperties = { width: colWidth(col.key) };
                                                if (side === 'left') style.left = leftOffsets[col.key];
                                                if (side === 'right') style.right = rightOffsets[col.key];
                                                if (side) style.zIndex = 10;
                                                return (
                                                    <td
                                                        key={col.key}
                                                        title={config.wrap ? undefined : value}
                                                        className={clsx(
                                                            'border-b border-r border-slate-100 text-slate-800',
                                                            densityStyle.cell,
                                                            background,
                                                            side && 'sticky',
                                                            isSelected && 'bg-sky-50',
                                                            col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                                                            config.wrap ? 'break-words' : 'truncate'
                                                        )}
                                                        style={style}
                                                    >
                                                        {col.key === 'workName' ? (
                                                            <span className="font-bold leading-tight text-slate-900">{value}</span>
                                                        ) : (
                                                            <span className="leading-normal text-slate-700">{value}</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={orderedVisible.length + 2} className="px-4 py-16 text-center">
                                        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                                            <Search className="h-6 w-6 text-slate-300" />
                                            <p className="text-sm font-bold text-slate-600">No works match the current filters</p>
                                            <p className="text-xs font-medium text-slate-500">
                                                Adjust the search, clear a column filter, or reset the layout to see all approved works.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRowSearch('');
                                                    setColumnFilters({});
                                                }}
                                                className={clsx('mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700', FOCUS_RING)}
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                Clear all filters
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {sortedRows.length > 0 && (
                    <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-[11px] font-bold text-slate-500">
                            Showing {config.rowsPerPage === -1 ? 1 : (safePage - 1) * config.rowsPerPage + 1} to{' '}
                            {config.rowsPerPage === -1 ? sortedRows.length : Math.min(safePage * config.rowsPerPage, sortedRows.length)} of{' '}
                            {sortedRows.length} records
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                Rows per page
                                <select
                                    value={config.rowsPerPage}
                                    onChange={(event) => patchConfig({ rowsPerPage: Number(event.target.value) })}
                                    className={clsx('rounded border border-slate-200 bg-white px-2 py-1 font-bold text-slate-700', FOCUS_RING)}
                                >
                                    {ROWS_PER_PAGE_OPTIONS.map((option) => (
                                        <option key={option} value={option}>
                                            {option === -1 ? 'All' : option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {config.rowsPerPage !== -1 && totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={safePage === 1}
                                        onClick={() => setCurrentPage(1)}
                                        className={clsx('rounded border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50', FOCUS_RING, safePage === 1 && 'cursor-not-allowed opacity-40')}
                                    >
                                        First
                                    </button>
                                    <button
                                        type="button"
                                        disabled={safePage === 1}
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        className={clsx('rounded border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50', FOCUS_RING, safePage === 1 && 'cursor-not-allowed opacity-40')}
                                    >
                                        Prev
                                    </button>
                                    <span className="px-2 text-xs font-bold text-slate-600">
                                        Page {safePage} of {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={safePage === totalPages}
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        className={clsx('rounded border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50', FOCUS_RING, safePage === totalPages && 'cursor-not-allowed opacity-40')}
                                    >
                                        Next
                                    </button>
                                    <button
                                        type="button"
                                        disabled={safePage === totalPages}
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={clsx('rounded border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50', FOCUS_RING, safePage === totalPages && 'cursor-not-allowed opacity-40')}
                                    >
                                        Last
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {config.sort.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">Sort order:</span>
                    {config.sort.map((rule, index) => (
                        <span key={rule.key} className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700">
                            {index + 1}. {COLUMN_MAP.get(rule.key)?.label}
                            <button
                                type="button"
                                onClick={() => toggleSort(rule.key, true)}
                                aria-label={`Remove sort on ${COLUMN_MAP.get(rule.key)?.label}`}
                                className={clsx('rounded-full p-0.5 hover:bg-sky-100', FOCUS_RING)}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={() => patchConfig({ sort: [] })}
                        className={clsx('rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50', FOCUS_RING)}
                    >
                        Clear sort
                    </button>
                </div>
            )}

            <div className="sr-only" aria-live="polite">
                {selectedCount > 0 ? `${selectedCount} rows selected` : ''}
            </div>
        </div>
    );
}
