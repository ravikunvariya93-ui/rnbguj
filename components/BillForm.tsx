'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Save, RefreshCw, Plus, Loader2, ChevronDown, ChevronUp, 
    Receipt, Layers, TrendingUp, Download 
} from 'lucide-react';
import Link from 'next/link';
import SearchableSelect from './SearchableSelect';
import { downloadPraisaWorkOrderExcel, downloadPraisaExcessWorkOrderExcel } from '@/lib/exportPraisaWorkOrder';
import {
    calculateBillTotals,
    calculateSecurityDeposit,
    getDeductionsForNetPayable as getSharedDeductions,
} from '@/lib/billing/calculations';
import { parseDateStr as parseSharedDateStr, formatDateForInput as formatSharedDateForInput, todayISTFormatted } from '@/lib/dateUtils';

interface BillWorkRow {
    srNo?: string;
    workName?: string;
    nameOfWork?: string;
    amount?: number | string;
}

interface BillTenderRef {
    aboveBelowPercentage?: number | string;
    aboveBelowInWord?: string;
    contractPrice?: number | string;
    estimatedAmount?: number | string;
    packageId?: {
        workType?: string;
        budgetHead?: string;
        works?: BillWorkRow[];
    };
    packageName?: string;
    contractorName?: string;
}

interface BillWorkOrderRef {
    _id?: string;
    securityDepositAmount?: number | string;
    stipulatedCompletionDate?: string;
    loaId?: {
        tenderId?: BillTenderRef;
    };
}

interface BillSourceDoc {
    _id?: string;
    works?: BillWorkRow[];
    workOrderId?: string | { _id?: string };
    items?: IBillItem[];
    billDate?: string;
    passingDate?: string;
    actualCompletionDate?: string;
    lastRecordEntryDate?: string;
    praisaBillNo?: string;
    praisaBillDate?: string;
    voucherNo?: string;
    voucherDate?: string;
    labourCessApplicable?: boolean;
    mbNumber?: string;
    runningBillNumber?: string | number;
    securityDeposit?: number | string;
    timeLimitDeposit?: number | string;
    asphaltDeposit?: number | string;
    billType?: string;
    grossAmount?: number | string;
    totalDeduction?: number | string;
    netPaidAmount?: number | string;
    netPayableAmount?: number | string;
}

type IBillItem = {
    itemNo: string;
    description: string;
    boqQuantity?: number;
    quantity: number;
    fullRate: number;
    partRate: number;
    unit: string;
    uptoDateAmount: number;
    previousPaidAmount: number;
    toBePaidAmount: number;
    itemType?: 'Standard' | 'Extra';
    considerForAsphalt?: boolean;
};

interface BillFormData {
    workOrderId: string;
    billType: string;
    runningBillNumber: string | number;
    billDate: string;
    grossAmount: number | string;
    netPaidAmount: number | string;
    passingDate: string;
    praisaBillNo?: string;
    praisaBillDate?: string;
    voucherNo?: string;
    voucherDate?: string;
    actualCompletionDate?: string;
    lastRecordEntryDate?: string;
    remarks: string;
    auditMemoPreviouslyPaid: number | string;
    dismantleCredit: number | string;
    excessExtraAmount: number | string;
    priceAdjustment: number | string;
    priceAdjustmentType: string;
    adminApprovalAmount: number | string;
    withheldDeposit: number | string;
    netPayableAmount: number | string;
    incomeTax: number | string;
    gst: number | string;
    labourCess: number | string;
    securityDeposit: number | string;
    freeMaintenanceDeposit: number | string;
    asphaltDeposit: number | string;
    coreSampleDeposit: number | string;
    tpi: number | string;
    esmp: number | string;
    timeLimitDeposit: number | string;
    testingCharges: number | string;
    otherDeposit: number | string;
    otherDepositLabel?: string;
    otherDeposit2: number | string;
    otherDeposit2Label?: string;
    totalDeduction: number | string;
    labourCessApplicable: boolean;
    mbNumber?: string;
    items: IBillItem[];
    works: BillWorkRow[];
}

interface BillFormProps {
    initialData?: BillSourceDoc;
    isEditing?: boolean;
    initialWorkOrderId?: string;
    initialTenderPercentage?: number | string;
    initialTenderDirection?: string;
    initialWorks?: BillWorkRow[];
    contractPrice?: number | string;
    submittedSD?: number | string;
    // Live Administrative Approval sanctioned total in rupees (sum of assigned
    // works' Job Number Amount × 100000). Takes precedence over snapshots.
    sanctionedWorksTotal?: number;
    workType?: string;
    budgetHead?: string;
    stipulatedCompletionDate?: string | Date;
    redirectTo?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export { calculateSecurityDeposit };

function parseDateStr(dateStr: string): Date | null {
    return parseSharedDateStr(dateStr);
}

function formatDateForInput(dateString: string | Date | null | undefined): string {
    return formatSharedDateForInput(dateString);
}

function getTodayDateFormatted(): string {
    return todayISTFormatted();
}

export default function BillForm({ 
    initialData = {}, 
    isEditing = false, 
    initialWorkOrderId = '', 
    initialTenderPercentage,
    initialTenderDirection,
    initialWorks = [],
    contractPrice,
    submittedSD,
    sanctionedWorksTotal,
    workType = '',
    budgetHead = '',
    stipulatedCompletionDate,
    redirectTo,
    onSuccess, 
    onCancel 
}: BillFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetchingAbstract, setFetchingAbstract] = useState(false);
    const [workOrders, setWorkOrders] = useState<BillWorkOrderRef[]>([]);
    const [tenderPercentage, setTenderPercentage] = useState<number>(
        initialTenderPercentage !== undefined ? Number(initialTenderPercentage) : 0
    );
    const [tenderDirection, setTenderDirection] = useState<string>(
        initialTenderDirection === 'Equals' ? 'At Par' : (initialTenderDirection || 'Above')
    );
    const [contractPriceState, setContractPriceState] = useState<number>(Number(contractPrice || 0));
    const [, setSubmittedSDState] = useState<number>(Number(submittedSD || 0));
    const [workTypeState, setWorkTypeState] = useState<string>(workType || '');
    const [budgetHeadState, setBudgetHeadState] = useState<string>(budgetHead || '');
    const [abstractFetched, setAbstractFetched] = useState(false);
    const [previousSDTotal, setPreviousSDTotal] = useState<number>(0);
    const [previousTLDTotal, setPreviousTLDTotal] = useState<number>(0);
    const [previousAsphaltTotal, setPreviousAsphaltTotal] = useState<number>(0);
    const [tableRawInputs, setTableRawInputs] = useState<Record<string, string>>({});
    const [isAbstractExpanded, setIsAbstractExpanded] = useState<boolean>(false);
    const [isExcessSavingExpanded, setIsExcessSavingExpanded] = useState<boolean>(false);
    const [isWorkWiseExpanded, setIsWorkWiseExpanded] = useState<boolean>(false);

    const sanitized = Object.fromEntries(
        Object.entries(initialData).map(([k, v]) => [k, v == null ? '' : v])
    ) as unknown as Record<string, string | number | undefined>;

    const formattedInitialWorks = (initialData.works && initialData.works.length > 0)
        ? initialData.works
        : (initialWorks && initialWorks.length > 0)
            ? initialWorks.map((w, i: number) => ({
                srNo: String(i + 1),
                nameOfWork: w.workName || w.nameOfWork || '',
                amount: 0
            }))
            : [];

    const normalizedWorkOrderId = String(initialWorkOrderId || (typeof initialData?.workOrderId === 'object' ? initialData?.workOrderId?._id : initialData?.workOrderId) || sanitized.workOrderId || '');

    const [formData, setFormData] = useState<BillFormData>({
        billType: 'Running',
        runningBillNumber: '1',
        billDate: sanitized.billDate ? formatDateForInput(String(sanitized.billDate)) : getTodayDateFormatted(),
        grossAmount: 0,
        netPaidAmount: sanitized.netPaidAmount || '',
        passingDate: '',
        actualCompletionDate: sanitized.actualCompletionDate ? formatDateForInput(String(sanitized.actualCompletionDate)) : '',
        lastRecordEntryDate: sanitized.lastRecordEntryDate ? formatDateForInput(String(sanitized.lastRecordEntryDate)) : '',
        remarks: '',
        auditMemoPreviouslyPaid: sanitized.auditMemoPreviouslyPaid ?? 0,
        dismantleCredit: sanitized.dismantleCredit ?? 0,
        excessExtraAmount: sanitized.excessExtraAmount ?? 0,
        priceAdjustment: sanitized.priceAdjustment ?? 0,
        priceAdjustmentType: String(sanitized.priceAdjustmentType || 'Payable'),
        adminApprovalAmount: sanitized.adminApprovalAmount ?? 0,
        withheldDeposit: sanitized.withheldDeposit ?? 0,
        netPayableAmount: sanitized.netPayableAmount ?? 0,

        incomeTax: sanitized.incomeTax ?? 0,
        gst: sanitized.gst ?? 0,
        labourCess: sanitized.labourCess ?? 0,
        securityDeposit: sanitized.securityDeposit ?? 0,
        freeMaintenanceDeposit: sanitized.freeMaintenanceDeposit ?? 0,
        asphaltDeposit: sanitized.asphaltDeposit ?? 0,
        coreSampleDeposit: sanitized.coreSampleDeposit ?? 0,
        tpi: sanitized.tpi ?? 0,
        esmp: sanitized.esmp ?? 0,
        timeLimitDeposit: sanitized.timeLimitDeposit ?? 0,
        testingCharges: sanitized.testingCharges ?? 0,
        otherDeposit: sanitized.otherDeposit ?? 0,
        otherDeposit2: sanitized.otherDeposit2 ?? 0,
        totalDeduction: sanitized.totalDeduction ?? 0,
        ...sanitized,
        otherDepositLabel: String(sanitized.otherDepositLabel || 'Other Deposit'),
        otherDeposit2Label: String(sanitized.otherDeposit2Label || 'Other Deposit 2'),
        workOrderId: normalizedWorkOrderId,
        praisaBillNo: String(sanitized.praisaBillNo || ''),
        praisaBillDate: sanitized.praisaBillDate ? formatDateForInput(String(sanitized.praisaBillDate)) : '',
        voucherNo: String(sanitized.voucherNo || ''),
        voucherDate: sanitized.voucherDate ? formatDateForInput(String(sanitized.voucherDate)) : '',
        labourCessApplicable: Boolean(sanitized.labourCessApplicable ?? false),
        items: initialData.items || [] as IBillItem[],
        works: formattedInitialWorks,
    });

    useEffect(() => {
        const fetchWorkOrders = async () => {
            try {
                const res = await fetch('/api/work-orders?limit=1000', { cache: 'no-store' });
                const data = await res.json();
                if (data.success) {
                    setWorkOrders(data.data);
                    console.log('Work Orders loaded, sample packageId:', data.data[0]?.loaId?.tenderId?.packageId);
                }
            } catch (error) {
                console.error('Failed to fetch Work Orders', error);
            }
        };
        fetchWorkOrders();
    }, []);

    useEffect(() => {
        if (contractPrice !== undefined) setContractPriceState(Number(contractPrice));
        if (submittedSD !== undefined) setSubmittedSDState(Number(submittedSD));
        if (workType !== undefined) setWorkTypeState(workType);
        if (budgetHead !== undefined) setBudgetHeadState(budgetHead);
    }, [contractPrice, submittedSD, workType, budgetHead]);

    useEffect(() => {
        if (initialTenderPercentage !== undefined) {
            setTenderPercentage(Number(initialTenderPercentage));
        }
        if (initialTenderDirection) {
            let dir = initialTenderDirection;
            if (dir === 'Equals') dir = 'At Par';
            setTenderDirection(dir);
        }
    }, [initialTenderPercentage, initialTenderDirection]);

    useEffect(() => {
        if (!isEditing && initialWorkOrderId && !abstractFetched) {
            setAbstractFetched(true);
            handleWorkOrderSelect(initialWorkOrderId);
        }
        // Init-once bootstrap guarded by abstractFetched. handleWorkOrderSelect
        // is render-scoped; listing it would re-run the effect every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialWorkOrderId, isEditing, abstractFetched]);

    useEffect(() => {
        if (isEditing && initialData) {
            setFormData((prev) => ({
                ...prev,
                billDate: formatDateForInput(initialData.billDate),
                passingDate: formatDateForInput(initialData.passingDate),
                actualCompletionDate: formatDateForInput(initialData.actualCompletionDate),
                lastRecordEntryDate: formatDateForInput(initialData.lastRecordEntryDate),
                workOrderId: (typeof initialData.workOrderId === 'object' ? initialData.workOrderId?._id : initialData.workOrderId) || '',
                praisaBillNo: initialData.praisaBillNo || '',
                praisaBillDate: initialData.praisaBillDate ? formatDateForInput(initialData.praisaBillDate) : '',
                voucherNo: initialData.voucherNo || '',
                voucherDate: initialData.voucherDate ? formatDateForInput(initialData.voucherDate) : '',
            }));
        }
    }, [initialData, isEditing]);

    useEffect(() => {
        if (formData.workOrderId && workOrders.length > 0) {
            const selectedWorkOrder = workOrders.find((wo) => wo._id === formData.workOrderId);
            if (selectedWorkOrder?.loaId?.tenderId) {
                const pct = selectedWorkOrder.loaId.tenderId.aboveBelowPercentage !== undefined ? Number(selectedWorkOrder.loaId.tenderId.aboveBelowPercentage) : 0;
                let dir = selectedWorkOrder.loaId.tenderId.aboveBelowInWord || 'Above';
                if (dir === 'Equals') dir = 'At Par';
                const cp = Number(selectedWorkOrder.loaId.tenderId.contractPrice || selectedWorkOrder.loaId.tenderId.estimatedAmount || 0);
                const ssd = Number(selectedWorkOrder.securityDepositAmount || 0);
                const wType = selectedWorkOrder.loaId.tenderId.packageId?.workType || '';
                const bHead = selectedWorkOrder.loaId.tenderId.packageId?.budgetHead || '';

                setTenderPercentage(pct);
                setTenderDirection(dir);
                if (cp) setContractPriceState(cp);
                if (ssd) setSubmittedSDState(ssd);
                if (wType) setWorkTypeState(wType);
                if (bHead) setBudgetHeadState(bHead);

                if (formData.items && formData.items.length > 0) {
                    calculateTotals(formData.items, pct, dir);
                }
            }
        }
        // Syncs tender terms when the work order changes. calculateTotals is
        // render-scoped (it closes over live deduction state); listing it
        // would re-run this effect every render and loop on setFormData.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.workOrderId, workOrders]);

    useEffect(() => {
        async function fetchPreviousBills() {
            if (!formData.workOrderId) {
                setPreviousSDTotal(0);
                return;
            }
            try {
                const res = await fetch(`/api/bills?workOrderId=${formData.workOrderId}&limit=1000`);
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    const currentBillNo = Number(formData.runningBillNumber) || 1;
                    const currentBillId = initialData?._id;
                    const prevBills: BillSourceDoc[] = data.data.filter((b: BillSourceDoc) => {
                        if (currentBillId && b._id === currentBillId) {
                            return false;
                        }
                        return Number(b.runningBillNumber || 0) < currentBillNo;
                    });
                    const sum = prevBills.reduce((s: number, b) => s + (Number(b.securityDeposit) || 0), 0);
                    const sumTLD = prevBills.reduce((s: number, b) => s + (Number(b.timeLimitDeposit) || 0), 0);
                    const sumAsphalt = prevBills.reduce((s: number, b) => s + (Number(b.asphaltDeposit) || 0), 0);
                    setPreviousSDTotal(sum);
                    setPreviousTLDTotal(sumTLD);
                    setPreviousAsphaltTotal(sumAsphalt);
                    setFormData((prev) => {
                        return recalculateAuditMemoInternal(prev, undefined, sum, sumTLD, sumAsphalt);
                    });
                }
            } catch (err) {
                console.error('Error fetching previous bills:', err);
            }
        }
        fetchPreviousBills();
        // Loads previous-bill deductions when bill identity changes.
        // recalculateAuditMemoInternal is render-scoped; listing it would
        // re-run (and re-setState) on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.workOrderId, formData.runningBillNumber, initialData?._id]);

    const getDeductionsForNetPayable = (
        netPayVal: number,
        runningBillNo: number,
        cPrice?: number,
        sSD?: number,
        wType?: string,
        bHead?: string,
        prevSD?: number
    ) => {
        // Thin wrapper around the shared pure function so UI state (contract
        // price, work type, previous SD) stays in one place: lib/billing.
        void sSD;
        return getSharedDeductions(netPayVal, runningBillNo, {
            contractPrice: cPrice !== undefined ? cPrice : contractPriceState,
            workType: wType || workTypeState || '',
            budgetHead: bHead || budgetHeadState || '',
            previousSDTotal: prevSD !== undefined ? prevSD : previousSDTotal,
        });
    };

    // ── Administrative Approval (AA) sanctioned total ──────────────────────
    // Live prop value first (sum of assigned works' Job Number Amount in
    // rupees); falls back to package works snapshots, then the selected Work
    // Order's package works.
    const getSanctionedWorksTotal = (workOrderId?: string): number => {
        if (sanctionedWorksTotal != null && sanctionedWorksTotal > 0) return sanctionedWorksTotal;
        const sumAmounts = (works: BillWorkRow[] | undefined) =>
            (works || []).reduce((s: number, w) => s + (Number(w?.amount) || 0), 0);
        const fromProps = sumAmounts(initialWorks);
        if (fromProps > 0) return fromProps;
        const selectedWorkOrder = workOrders.find((wo) => wo._id === (workOrderId || formData.workOrderId));
        return sumAmounts(selectedWorkOrder?.loaId?.tenderId?.packageId?.works || []);
    };

    const recalculateAuditMemoInternal = (nextData: BillFormData, updatedFields?: Partial<typeof formData>, prevSD?: number, prevTLD?: number, prevAsphalt?: number, forceRecalculate?: boolean) => {
        const gross = parseFloat(String(nextData.grossAmount)) || 0;
        const prevPaid = parseFloat(String(nextData.auditMemoPreviouslyPaid)) || 0;
        const dismantle = parseFloat(String(nextData.dismantleCredit)) || 0;
        const excessExtra = parseFloat(String(nextData.excessExtraAmount)) || 0;
        const priceAdj = parseFloat(String(nextData.priceAdjustment)) || 0;
        const priceAdjType = nextData.priceAdjustmentType || 'Payable';
        const priceAdjSign = priceAdjType === 'Deductible' ? -1 : 1;
        const manualDeductionFields = new Set(updatedFields ? Object.keys(updatedFields) : []);
        // Administrative Approval = IF((Gross - sanctioned works total) < 0, 0, Gross - sanctioned works total).
        // Manual entry (if just typed) always wins; when no sanctioned total is
        // known the stored/manual value is kept as before.
        const sanctionedTotal = getSanctionedWorksTotal(nextData.workOrderId);
        const autoAdminAppr = sanctionedTotal > 0
            ? parseFloat(Math.max(0, gross - sanctionedTotal).toFixed(2))
            : (parseFloat(String(nextData.adminApprovalAmount)) || 0);
        const adminAppr = manualDeductionFields.has('adminApprovalAmount')
            ? (parseFloat(String(nextData.adminApprovalAmount)) || 0)
            : autoAdminAppr;
        const withheld = parseFloat(String(nextData.withheldDeposit)) || 0;

        const netPay = parseFloat((gross - prevPaid - dismantle - excessExtra + (priceAdjSign * priceAdj) - adminAppr - withheld).toFixed(2));
        const oldNetPay = parseFloat(String(nextData.netPayableAmount)) || 0;

        const autoDeductions = getDeductionsForNetPayable(netPay, Number(nextData.runningBillNumber), undefined, undefined, undefined, undefined, prevSD);

        const currentPrevTLD = prevTLD !== undefined ? prevTLD : previousTLDTotal;

        // ── Asphalt Deposit: 2% of flagged items' upto-date total (rounded up
        // to ₹100), minus asphalt already deducted in previous bills ──────────
        const flaggedAsphaltBase = (nextData.items || []).reduce(
            (s: number, it) => s + (it?.considerForAsphalt ? (Number(it.uptoDateAmount) || 0) : 0), 0);
        const currentPrevAsphalt = prevAsphalt !== undefined ? prevAsphalt : previousAsphaltTotal;
        const autoAsphalt = flaggedAsphaltBase > 0
            ? Math.max(0, Math.ceil((flaggedAsphaltBase * 0.02) / 100) * 100 - currentPrevAsphalt)
            : (parseFloat(String(nextData.asphaltDeposit)) || 0);
        // No Asphalt Deposit deduction on Final Bill.
        const asphaltVal = nextData.billType === 'Final'
            ? 0
            : (manualDeductionFields.has('asphaltDeposit')
                ? (parseFloat(String(nextData.asphaltDeposit)) || 0)
                : autoAsphalt);

        // ── When editing a saved bill, never auto-recalculate deductions ────────
        // Always use whatever is stored (or what the user just typed). Only recompute totals.
        // Exception: when forceRecalculate is true (Re-Calculate button), auto-calculate the statutory deductions.
        if (isEditing) {
            let storedIT, storedGST, storedCess, storedSD, storedFMD, storedAsph;
            if (forceRecalculate) {
                storedIT   = autoDeductions.incomeTax;
                storedGST  = autoDeductions.gst;
                storedCess = autoDeductions.labourCess;
                storedSD   = autoDeductions.securityDeposit;
                storedFMD  = autoDeductions.freeMaintenanceDeposit;
                storedAsph = asphaltVal;
            } else {
                storedIT   = parseFloat(String(nextData.incomeTax))              || 0;
                storedGST  = (manualDeductionFields.has('incomeTax') && !manualDeductionFields.has('gst'))
                    ? storedIT
                    : (parseFloat(String(nextData.gst)) || 0);
                storedCess = parseFloat(String(nextData.labourCess))             || 0;
                storedSD   = parseFloat(String(nextData.securityDeposit))        || 0;
                storedFMD  = parseFloat(String(nextData.freeMaintenanceDeposit)) || 0;
                storedAsph = manualDeductionFields.has('asphaltDeposit') ? (parseFloat(String(nextData.asphaltDeposit)) || 0) : asphaltVal;
            }
            const storedTPI   = parseFloat(String(nextData.tpi))                    || 0;
            const storedESMP  = parseFloat(String(nextData.esmp))                   || 0;
            const storedTLD   = parseFloat(String(nextData.timeLimitDeposit))       || 0;
            const storedCore  = parseFloat(String(nextData.coreSampleDeposit))      || 0;
            const storedTest  = parseFloat(String(nextData.testingCharges))         || 0;
            const storedOther = parseFloat(String(nextData.otherDeposit))           || 0;
            const storedOther2 = parseFloat(String(nextData.otherDeposit2))         || 0;

            const editTotalDed = parseFloat((storedIT + storedGST + storedCess + storedSD + storedFMD + storedAsph + storedCore + storedTPI + storedESMP + storedTLD + storedTest + storedOther + storedOther2).toFixed(2));
            const editNetPaid  = parseFloat((netPay - editTotalDed).toFixed(2));

            return {
                ...nextData,
                incomeTax:  forceRecalculate ? storedIT   : nextData.incomeTax,
                gst:        forceRecalculate ? storedGST  : ((manualDeductionFields.has('incomeTax') && !manualDeductionFields.has('gst')) ? nextData.incomeTax : nextData.gst),
                labourCess: forceRecalculate ? storedCess : nextData.labourCess,
                securityDeposit:       forceRecalculate ? storedSD  : nextData.securityDeposit,
                freeMaintenanceDeposit:forceRecalculate ? storedFMD : nextData.freeMaintenanceDeposit,
                adminApprovalAmount: manualDeductionFields.has('adminApprovalAmount') ? nextData.adminApprovalAmount : adminAppr,
                asphaltDeposit: storedAsph,
                netPayableAmount: netPay,
                totalDeduction:   editTotalDed,
                netPaidAmount:    editNetPaid,
            };
        }

        // ── New bill: auto-calculate deductions ──────────────────────────────
        const deductionChanged = forceRecalculate || oldNetPay !== netPay;
        const it = manualDeductionFields.has('incomeTax') ? (parseFloat(String(nextData.incomeTax)) || 0)
            : (deductionChanged ? autoDeductions.incomeTax : (nextData.incomeTax !== undefined ? (parseFloat(String(nextData.incomeTax)) || 0) : autoDeductions.incomeTax));
        const gstDeduction = manualDeductionFields.has('gst') ? (parseFloat(String(nextData.gst)) || 0)
            : (manualDeductionFields.has('incomeTax') ? it : (deductionChanged ? autoDeductions.gst : (nextData.gst !== undefined ? (parseFloat(String(nextData.gst)) || 0) : autoDeductions.gst)));
        const cessVal = manualDeductionFields.has('labourCess') ? (parseFloat(String(nextData.labourCess)) || 0)
            : (deductionChanged ? autoDeductions.labourCess : (nextData.labourCess !== undefined ? (parseFloat(String(nextData.labourCess)) || 0) : autoDeductions.labourCess));
        const sd = manualDeductionFields.has('securityDeposit') ? (parseFloat(String(nextData.securityDeposit)) || 0)
            : (deductionChanged ? autoDeductions.securityDeposit : (nextData.securityDeposit !== undefined ? (parseFloat(String(nextData.securityDeposit)) || 0) : autoDeductions.securityDeposit));
        const fmd = manualDeductionFields.has('freeMaintenanceDeposit') ? (parseFloat(String(nextData.freeMaintenanceDeposit)) || 0)
            : (deductionChanged ? autoDeductions.freeMaintenanceDeposit : (nextData.freeMaintenanceDeposit !== undefined ? (parseFloat(String(nextData.freeMaintenanceDeposit)) || 0) : autoDeductions.freeMaintenanceDeposit));
        const tpiVal = manualDeductionFields.has('tpi') ? (parseFloat(String(nextData.tpi)) || 0)
            : (deductionChanged ? autoDeductions.tpi : (nextData.tpi !== undefined ? (parseFloat(String(nextData.tpi)) || 0) : autoDeductions.tpi));
        const esmpVal = manualDeductionFields.has('esmp') ? (parseFloat(String(nextData.esmp)) || 0)
            : (deductionChanged ? autoDeductions.esmp : (nextData.esmp !== undefined ? (parseFloat(String(nextData.esmp)) || 0) : autoDeductions.esmp));

        // Calculate Time Limit Deposit automatically
        let calculatedTLD = 0;
        const selectedWorkOrder = workOrders.find((wo) => wo._id === nextData.workOrderId);
        const compTargetDate = stipulatedCompletionDate 
            ? new Date(stipulatedCompletionDate) 
            : (selectedWorkOrder?.stipulatedCompletionDate ? new Date(selectedWorkOrder.stipulatedCompletionDate) : null);
        if (compTargetDate) {
            const getDaysDiff = (date1: Date, date2: Date) => {
                const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
                const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
                const diffTime = d1.getTime() - d2.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
            };

            if (nextData.billType === 'Running') {
                const lastRecordDate = nextData.lastRecordEntryDate ? parseDateStr(nextData.lastRecordEntryDate) : null;
                if (lastRecordDate) {
                    const daysDelay = Math.max(0, Math.min(100, getDaysDiff(lastRecordDate, compTargetDate)));
                    const sayAmt = parseFloat(String(nextData.grossAmount)) || 0;
                    const totalTLD = Math.ceil((0.001 * sayAmt * daysDelay) / 100) * 100;
                    calculatedTLD = Math.max(0, totalTLD - currentPrevTLD);
                }
            } else if (nextData.billType === 'Final') {
                const completionDate = nextData.actualCompletionDate ? parseDateStr(nextData.actualCompletionDate) : null;
                if (completionDate) {
                    const daysDelay = Math.max(0, Math.min(100, getDaysDiff(completionDate, compTargetDate)));
                    const contractPriceVal = Number(contractPrice
                        ? contractPrice
                        : (selectedWorkOrder?.loaId?.tenderId?.contractPrice || selectedWorkOrder?.loaId?.tenderId?.estimatedAmount || 0));
                    const totalTLD = Math.ceil((0.001 * Number(contractPriceVal) * daysDelay) / 100) * 100;
                    calculatedTLD = Math.max(0, totalTLD - currentPrevTLD);
                }
            }
        }

        const isAutoTrigger = !updatedFields || 
                              'lastRecordEntryDate' in updatedFields || 
                              'actualCompletionDate' in updatedFields || 
                              'billType' in updatedFields || 
                              'grossAmount' in updatedFields || 
                              'workOrderId' in updatedFields;

        const tldRaw = isAutoTrigger
            ? calculatedTLD
            : (nextData.timeLimitDeposit !== undefined && nextData.timeLimitDeposit !== '' && nextData.timeLimitDeposit !== 0
                ? nextData.timeLimitDeposit
                : calculatedTLD);
        const tldNum = parseFloat(String(tldRaw)) || 0;

        const asphalt = asphaltVal;
        const core = parseFloat(String(nextData.coreSampleDeposit)) || 0;
        const testing = parseFloat(String(nextData.testingCharges)) || 0;
        const otherDep = parseFloat(String(nextData.otherDeposit)) || 0;
        const otherDep2 = parseFloat(String(nextData.otherDeposit2)) || 0;

        const totalDed = parseFloat((it + gstDeduction + cessVal + sd + fmd + asphalt + core + tpiVal + esmpVal + tldNum + testing + otherDep + otherDep2).toFixed(2));
        const netPaid = parseFloat((netPay - totalDed).toFixed(2));

        return {
            ...nextData,
            // Preserve raw string for manually-typed fields so decimal input (e.g. "12.") isn't coerced to a number mid-typing.
            incomeTax:             manualDeductionFields.has('incomeTax')             ? nextData.incomeTax             : it,
            gst:                   manualDeductionFields.has('gst')                   ? nextData.gst                   : (manualDeductionFields.has('incomeTax') ? nextData.incomeTax : gstDeduction),
            labourCess:            manualDeductionFields.has('labourCess')            ? nextData.labourCess            : cessVal,
            securityDeposit:       manualDeductionFields.has('securityDeposit')       ? nextData.securityDeposit       : sd,
            freeMaintenanceDeposit:manualDeductionFields.has('freeMaintenanceDeposit')? nextData.freeMaintenanceDeposit: fmd,
            tpi:                   manualDeductionFields.has('tpi')                   ? nextData.tpi                   : tpiVal,
            esmp:                  manualDeductionFields.has('esmp')                  ? nextData.esmp                  : esmpVal,
            asphaltDeposit:        manualDeductionFields.has('asphaltDeposit')        ? nextData.asphaltDeposit        : asphalt,
            coreSampleDeposit:     manualDeductionFields.has('coreSampleDeposit')     ? nextData.coreSampleDeposit     : nextData.coreSampleDeposit,
            testingCharges:        manualDeductionFields.has('testingCharges')        ? nextData.testingCharges        : nextData.testingCharges,
            otherDeposit:          manualDeductionFields.has('otherDeposit')          ? nextData.otherDeposit          : nextData.otherDeposit,
            otherDeposit2:         manualDeductionFields.has('otherDeposit2')         ? nextData.otherDeposit2         : nextData.otherDeposit2,
            timeLimitDeposit: tldRaw,
            adminApprovalAmount: manualDeductionFields.has('adminApprovalAmount') ? nextData.adminApprovalAmount : adminAppr,
            netPayableAmount: netPay,
            totalDeduction: totalDed,
            netPaidAmount: netPaid
        };
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        
        if (name === 'runningBillNumber') {
            setFormData((prev) => {
                const nextData = { ...prev, [name]: value } as BillFormData;
                return recalculateAuditMemoInternal(nextData);
            });
        } else if (name === 'lastRecordEntryDate' || name === 'actualCompletionDate' || name === 'billDate' || name === 'billType') {
            setFormData((prev) => {
                const nextData = { ...prev, [name]: value } as BillFormData;
                return recalculateAuditMemoInternal(nextData, { [name]: value });
            });
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }

        if (name === 'labourCessApplicable') {
            calculateTotals(formData.items, tenderPercentage, tenderDirection, value as boolean);
        }
    };

    useEffect(() => {
        if (initialWorks && initialWorks.length > 0) {
            setFormData((prev) => {
                if (!prev.works || prev.works.length === 0) {
                    const formatted = initialWorks.map((w, i: number) => ({
                        srNo: String(i + 1),
                        nameOfWork: w.workName || w.nameOfWork || '',
                        amount: 0
                    }));
                    return { ...prev, works: formatted };
                }
                return prev;
            });
        }
    }, [initialWorks]);

    const handleWorkOrderSelect = async (id: string) => {
        const selectedWorkOrderObj = workOrders.find((wo) => wo._id === id);
        const pkgWorks = selectedWorkOrderObj?.loaId?.tenderId?.packageId?.works || [];
        const mappedWorks = pkgWorks.map((pw, i: number) => ({
            srNo: String(i + 1),
            nameOfWork: pw.workName || pw.nameOfWork || '',
            amount: 0
        }));

        setFormData((prev) => ({ 
            ...prev, 
            workOrderId: id, 
            works: (prev.works && prev.works.length > 0)
                ? prev.works
                : (mappedWorks.length > 0 ? mappedWorks : prev.works)
        }));
        
        // Fetch abstract if not editing (or if they change work order)
        if (id) {
            setFetchingAbstract(true);
            try {
                const res = await fetch(`/api/bills/abstract?workOrderId=${id}`);
                const data = await res.json();
                if (data.success) {
                    const pct = data.tenderPercentage !== undefined ? data.tenderPercentage : tenderPercentage;
                    const dir = data.tenderDirection || tenderDirection;
                    setTenderPercentage(pct);
                    setTenderDirection(dir);
                    setFormData((prev) => ({ 
                        ...prev, 
                        items: data.data,
                        works: (prev.works && prev.works.length > 0)
                            ? prev.works
                            : (data.works && data.works.length > 0 ? data.works : prev.works),
                        auditMemoPreviouslyPaid: data.previouslyPaid || 0,
                    }));
                    setTableRawInputs({});
                    calculateTotals(data.data, pct, dir);
                } else {
                    alert('Error fetching abstract: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('Failed to fetch BOQ abstract');
            } finally {
                setFetchingAbstract(false);
            }
        } else {
            setFormData((prev) => ({ ...prev, items: [] }));
            setTableRawInputs({});
            calculateTotals([]);
        }
    };

    const handleItemChange = (index: number, field: keyof IBillItem, value: string) => {
        const newItems = [...formData.items];
        let numValue = value === '' ? 0 : parseFloat(value);
        
        // Validation: Part Rate shall not be more than Full Rate
        if (field === 'partRate') {
            if (numValue > newItems[index].fullRate) {
                alert(`Part Rate cannot be more than the Full Rate (₹${newItems[index].fullRate})`);
                numValue = newItems[index].fullRate;
            }
        }
        
        newItems[index] = { ...newItems[index], [field]: numValue };
        
        // Auto-calculations
        const item = newItems[index];
        item.uptoDateAmount = parseFloat((item.quantity * item.partRate).toFixed(2));
        item.toBePaidAmount = parseFloat((item.uptoDateAmount - item.previousPaidAmount).toFixed(2));
        
        setFormData((prev) => ({ ...prev, items: newItems }));
        calculateTotals(newItems);
    };

    const handleAsphaltFlagChange = (index: number, checked: boolean) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], considerForAsphalt: checked };
        setFormData((prev) => ({ ...prev, items: newItems }));
        calculateTotals(newItems);
    };

    const getNextExtraItemNo = (items: IBillItem[]) => {
        const extraItems = items.filter((i) => i.itemType === 'Extra');
        const nums = extraItems
            .map((i) => {
                const match = i.itemNo?.match(/Extra Item (\d+)/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter((n: number) => n > 0);
        const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
        return `Extra Item ${String(maxNum + 1).padStart(2, '0')}`;
    };

    const handleAddExtraItem = () => {
        if (!formData.workOrderId) {
            alert('Please select a Work Order first');
            return;
        }
        const nextItemNo = getNextExtraItemNo(formData.items);
        const newItem: IBillItem = {
            itemNo: nextItemNo,
            description: '',
            quantity: 0,
            fullRate: 0,
            partRate: 0,
            unit: '',
            uptoDateAmount: 0,
            previousPaidAmount: 0,
            toBePaidAmount: 0,
            itemType: 'Extra',
            considerForAsphalt: false
        };
        const nextItems = [...formData.items, newItem];
        setFormData((prev) => ({ ...prev, items: nextItems }));
        calculateTotals(nextItems);
    };

    const handleExtraItemFieldChange = (index: number, field: keyof IBillItem, value: string) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index] };
        
        if (field === 'fullRate') {
            const numVal = value === '' ? 0 : parseFloat(value);
            item.fullRate = numVal;
            item.partRate = numVal;
        } else if (field === 'description' || field === 'unit') {
            item[field] = value;
        }
        
        item.uptoDateAmount = parseFloat((item.quantity * item.partRate).toFixed(2));
        item.toBePaidAmount = parseFloat((item.uptoDateAmount - item.previousPaidAmount).toFixed(2));
        
        newItems[index] = item;
        setFormData((prev) => ({ ...prev, items: newItems }));
        calculateTotals(newItems);
    };

    const handleWorkChange = (index: number, field: string, value: string) => {
        setFormData((prev: BillFormData) => {
            const newWorks = [...prev.works];
            if (field === 'amount') {
                newWorks[index].amount = value === '' ? 0 : parseFloat(value);
            } else if (field === 'nameOfWork' || field === 'srNo') {
                newWorks[index][field] = value;
            } else {
                (newWorks[index] as Record<string, unknown>)[field] = value;
            }
            return { ...prev, works: newWorks };
        });
    };

    const calculateTotals = (items: IBillItem[], pct?: number, dir?: string, cess?: boolean) => {
        const { gross } = calculateBillTotals(
            items,
            pct !== undefined ? pct : tenderPercentage,
            dir !== undefined ? dir : tenderDirection,
            cess !== undefined ? cess : formData.labourCessApplicable,
        );

        setFormData((prev) => {
            const nextData = { ...prev, grossAmount: gross };
            return recalculateAuditMemoInternal(nextData);
        });
    };

    const recalculateAuditMemo = (updatedFields: Partial<typeof formData>, forceRecalculate?: boolean) => {
        setFormData((prev) => {
            const nextData = { ...prev, ...updatedFields };
            return recalculateAuditMemoInternal(nextData, updatedFields, undefined, undefined, undefined, forceRecalculate);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.workOrderId) {
            alert('Please select a Work Order');
            return;
        }
        setLoading(true);

        try {
            const submissionData = { ...formData };
            const parseDateOutput = (dateStr?: string) => {
                if (!dateStr) return undefined;
                const d = parseDateStr(dateStr);
                return d ? d.toISOString() : undefined;
            };

            submissionData.billDate = parseDateOutput(formData.billDate) as string;
            submissionData.passingDate = parseDateOutput(formData.passingDate) as string;
            submissionData.praisaBillDate = parseDateOutput(formData.praisaBillDate);
            submissionData.praisaBillNo = formData.praisaBillNo || undefined;
            submissionData.voucherDate = parseDateOutput(formData.voucherDate);
            submissionData.voucherNo = formData.voucherNo || undefined;
            if (formData.billType === 'Final') {
                submissionData.actualCompletionDate = parseDateOutput(formData.actualCompletionDate || '');
                submissionData.lastRecordEntryDate = undefined;
            } else {
                submissionData.lastRecordEntryDate = parseDateOutput(formData.lastRecordEntryDate || '');
                submissionData.actualCompletionDate = undefined;
            }
            submissionData.grossAmount = Number(formData.grossAmount);
            submissionData.netPaidAmount = Number(formData.netPaidAmount || 0);
            submissionData.runningBillNumber = Number(formData.runningBillNumber);
            submissionData.labourCessApplicable = Boolean(formData.labourCessApplicable);

            // Audit Memo Fields
            submissionData.auditMemoPreviouslyPaid = Number(formData.auditMemoPreviouslyPaid || 0);
            submissionData.dismantleCredit = Number(formData.dismantleCredit || 0);
            submissionData.excessExtraAmount = Number(formData.excessExtraAmount || 0);
            submissionData.priceAdjustment = Number(formData.priceAdjustment || 0);
            submissionData.priceAdjustmentType = formData.priceAdjustmentType;
            submissionData.adminApprovalAmount = Number(formData.adminApprovalAmount || 0);
            submissionData.withheldDeposit = Number(formData.withheldDeposit || 0);
            submissionData.netPayableAmount = Number(formData.netPayableAmount || 0);

            submissionData.incomeTax = Number(formData.incomeTax || 0);
            submissionData.gst = Number(formData.gst || 0);
            submissionData.labourCess = Number(formData.labourCess || 0);
            submissionData.securityDeposit = Number(formData.securityDeposit || 0);
            submissionData.freeMaintenanceDeposit = Number(formData.freeMaintenanceDeposit || 0);
            submissionData.asphaltDeposit = Number(formData.asphaltDeposit || 0);
            submissionData.coreSampleDeposit = Number(formData.coreSampleDeposit || 0);
            submissionData.tpi = Number(formData.tpi || 0);
            submissionData.esmp = Number(formData.esmp || 0);
            submissionData.timeLimitDeposit = Number(formData.timeLimitDeposit || 0);
            submissionData.testingCharges = Number(formData.testingCharges || 0);
            submissionData.otherDeposit = Number(formData.otherDeposit || 0);
            submissionData.otherDepositLabel = formData.otherDepositLabel || 'Other Deposit';
            submissionData.otherDeposit2 = Number(formData.otherDeposit2 || 0);
            submissionData.otherDeposit2Label = formData.otherDeposit2Label || 'Other Deposit 2';
            submissionData.totalDeduction = Number(formData.totalDeduction || 0);

            const url = isEditing ? `/api/bills/${initialData._id}` : '/api/bills';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save Bill');
            }

            if (onSuccess) {
                onSuccess();
            } else if (redirectTo) {
                router.push(redirectTo);
                router.refresh();
            } else {
                router.push('/bills');
                router.refresh();
            }
        } catch (error) {
            console.error(error);
            alert(error instanceof Error && error.message ? error.message : 'Error saving Bill');
        } finally {
            setLoading(false);
        }
    };

    const workOrderOptions = workOrders.map((wo) => ({
        _id: wo._id || '',
        packageName: wo.loaId?.tenderId?.packageName || 'Unknown Package',
        contractorName: wo.loaId?.tenderId?.contractorName || 'N/A'
    }));

    return (
        <>
            {(loading || fetchingAbstract) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                        <p className="text-sm font-semibold text-slate-700">
                            {fetchingAbstract ? 'Fetching BOQ Abstract...' : 'Processing & Saving Bill...'}
                        </p>
                    </div>
                </div>
            )}
            <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') e.preventDefault(); }} className="space-y-6 bg-emerald-50/30 rounded-2xl transition-all duration-300">
            
            {/* General Information Section */}
            <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                            <Receipt className="w-4 h-4" />
                        </span>
                        <h3 className="font-bold text-slate-800">Bill Details</h3>
                    </div>
                </div>
                <div className="p-6">
                    {!initialWorkOrderId && (
                        <div className="mb-4">
                            <SearchableSelect 
                                label="Select Work Order / Package"
                                required
                                options={workOrderOptions}
                                value={formData.workOrderId}
                                onChange={handleWorkOrderSelect}
                                placeholder="Search by package name..."
                            />
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="excel-table table-fixed w-full">
                            <colgroup>
                                <col className="w-[20%]" />
                                <col className="w-[30%]" />
                                <col className="w-[20%]" />
                                <col className="w-[30%]" />
                            </colgroup>
                            <tbody>
                                <tr>
                                    <td className="excel-label">Bill Type</td>
                                    <td className="excel-value">
                                        <select
                                            name="billType"
                                            id="billType"
                                            value={formData.billType}
                                            onChange={handleChange}
                                            className="excel-cell-select font-medium"
                                            required
                                        >
                                            <option value="Running">Running Bill</option>
                                            <option value="Final">Final Bill</option>
                                        </select>
                                    </td>
                                    <td className="excel-label">Bill Number</td>
                                    <td className="excel-value">
                                        <select
                                            name="runningBillNumber"
                                            id="runningBillNumber"
                                            value={formData.runningBillNumber}
                                            onChange={handleChange}
                                            className="excel-cell-select font-medium"
                                            required
                                        >
                                            {[...Array(50)].map((_, i) => {
                                                const num = i + 1;
                                                const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
                                                return (
                                                    <option key={num} value={num}>
                                                        {num}{suffix}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="excel-label">Bill Date</td>
                                    <td className="excel-value">
                                        <input 
                                            type="text" placeholder="DD/MM/YYYY" name="billDate" id="billDate" 
                                            value={formData.billDate} onChange={handleChange} 
                                            className="excel-cell-input" required
                                        />
                                    </td>
                                    <td className="excel-label">
                                        {formData.billType === 'Final' ? 'Date of Completion (Actual)' : 'Last Record Entry / Measurement Date'}
                                    </td>
                                    <td className="excel-value">
                                        {formData.billType === 'Final' ? (
                                            <input 
                                                type="text" placeholder="DD/MM/YYYY" name="actualCompletionDate" id="actualCompletionDate" 
                                                value={formData.actualCompletionDate || ''} onChange={handleChange} 
                                                className="excel-cell-input"
                                            />
                                        ) : (
                                            <input 
                                                type="text" placeholder="DD/MM/YYYY" name="lastRecordEntryDate" id="lastRecordEntryDate" 
                                                value={formData.lastRecordEntryDate || ''} onChange={handleChange} 
                                                className="excel-cell-input"
                                            />
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="excel-label">Measurement Book (M.B.) Number</td>
                                    <td className="excel-value">
                                        <input 
                                            type="text" placeholder="e.g. 2295" name="mbNumber" id="mbNumber" 
                                            value={formData.mbNumber || ''} onChange={handleChange} 
                                            className="excel-cell-input font-mono"
                                        />
                                    </td>
                                    <td className="excel-label">Delay</td>
                                    <td className="excel-value">
                                        <span className="font-mono font-bold text-slate-800 text-xs">
                                            {(() => {
                                                const selectedWorkOrder = workOrders.find((wo) => wo._id === formData.workOrderId);
                                                const compTargetDate = stipulatedCompletionDate 
                                                    ? new Date(stipulatedCompletionDate) 
                                                    : (selectedWorkOrder?.stipulatedCompletionDate ? new Date(selectedWorkOrder.stipulatedCompletionDate) : null);
                                                if (!compTargetDate) return '-';

                                                const getDaysDiff = (date1: Date, date2: Date) => {
                                                    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
                                                    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
                                                    const diffTime = d1.getTime() - d2.getTime();
                                                    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                };

                                                let daysDelay = 0;
                                                if (formData.billType === 'Running') {
                                                    const lastRecordDate = formData.lastRecordEntryDate ? parseDateStr(formData.lastRecordEntryDate) : null;
                                                    if (lastRecordDate) {
                                                        daysDelay = Math.max(0, getDaysDiff(lastRecordDate, compTargetDate));
                                                    }
                                                } else {
                                                    const completionDate = formData.actualCompletionDate ? parseDateStr(formData.actualCompletionDate) : null;
                                                    if (completionDate) {
                                                        daysDelay = Math.max(0, getDaysDiff(completionDate, compTargetDate));
                                                    }
                                                }
                                                return `${daysDelay} days`;
                                            })()}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="excel-label">PRAISA Bill No.</td>
                                    <td className="excel-value">
                                        <input 
                                            type="text" placeholder="e.g. PR-123" name="praisaBillNo" id="praisaBillNo" 
                                            value={formData.praisaBillNo} onChange={handleChange} 
                                            className="excel-cell-input"
                                        />
                                    </td>
                                    <td className="excel-label">PRAISA Bill Date</td>
                                    <td className="excel-value">
                                        <input 
                                            type="text" placeholder="DD/MM/YYYY" name="praisaBillDate" id="praisaBillDate" 
                                            value={formData.praisaBillDate} onChange={handleChange} 
                                            className="excel-cell-input"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="excel-label">Voucher No.</td>
                                    <td className="excel-value">
                                        <input 
                                            type="text" placeholder="e.g. V-123" name="voucherNo" id="voucherNo" 
                                            value={formData.voucherNo || ''} onChange={handleChange} 
                                            className="excel-cell-input"
                                        />
                                    </td>
                                    <td className="excel-label">Voucher Date</td>
                                    <td className="excel-value">
                                        <input 
                                            type="text" placeholder="DD/MM/YYYY" name="voucherDate" id="voucherDate" 
                                            value={formData.voucherDate || ''} onChange={handleChange} 
                                            className="excel-cell-input"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Abstract Section */}
            <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                            <Layers className="w-4 h-4" />
                        </span>
                        <h3 className="font-bold text-slate-800">Bill Abstract (Line Items)</h3>
                        {formData.items && formData.items.length > 0 && (
                            <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                                {formData.items.length} items
                            </span>
                        )}
                        {formData.workOrderId && (
                            <button
                                type="button"
                                onClick={handleAddExtraItem}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Extra Item
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {fetchingAbstract && (
                            <span className="inline-flex items-center text-sm font-semibold text-emerald-600">
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Fetching BOQ...
                            </span>
                        )}
                        {formData.items && formData.items.length > 0 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => downloadPraisaWorkOrderExcel(formData.items, 'WorkOrder.xls')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                                    title="Download PRAISA Work Order Excel (All Items)"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    PRAISA Work Order
                                </button>
                                <button
                                    type="button"
                                    onClick={() => downloadPraisaExcessWorkOrderExcel(formData.items, 'WorkOrder_Excess.xls')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                                    title="Download PRAISA Excess Work Order Excel (Excess Items Only)"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    PRAISA Excess Work Order
                                </button>
                            </>
                        )}
                        {formData.items && formData.items.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsAbstractExpanded(!isAbstractExpanded)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-emerald-300"
                            >
                                {isAbstractExpanded ? (
                                    <>
                                        <ChevronUp className="w-3.5 h-3.5" />
                                        Collapse Line Items
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="w-3.5 h-3.5" />
                                        Expand Line Items ({formData.items.length})
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
                <div className="p-6">
                    <div className="overflow-x-auto border border-emerald-300 rounded-xl shadow-2xs">
                    <table className="excel-table">
                        <thead>
                            <tr className="bg-emerald-100/90 text-emerald-950">
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950">Item No.</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950 w-1/4">Description</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-center text-xs font-bold text-emerald-950">Unit</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">Qty (BOQ)</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">Full Rate (₹)</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950 min-w-[140px]">Upto Date Qty</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950 min-w-[140px]">Part Rate (₹)</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">Upto Date Amt</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">Prev Paid Amt</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950">To Be Paid</th>
                                <th scope="col" className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-center text-xs font-bold text-emerald-950 min-w-[110px]">Consider for Asphalt Deposit?</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {formData.items.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-sm text-gray-500 bg-gray-50/50">
                                        {fetchingAbstract ? (
                                            <div className="flex items-center justify-center gap-2 text-blue-600">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span className="font-medium">Loading BOQ items abstract...</span>
                                            </div>
                                        ) : (
                                            <span>{initialWorkOrderId ? 'No BOQ items found for this work order.' : 'Select a Work Order above to load the BOQ items abstract.'}</span>
                                        )}
                                    </td>
                                </tr>
                            ) : !isAbstractExpanded ? (
                                <tr>
                                    <td colSpan={11} className="px-4 py-3.5 text-center text-xs text-slate-500 bg-emerald-50/40 font-medium">
                                        <button
                                            type="button"
                                            onClick={() => setIsAbstractExpanded(true)}
                                            className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                            {formData.items.length} line items collapsed. Click to expand line item breakdown.
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                formData.items.map((item: IBillItem, index: number) => (
                                    <tr key={index} className="hover:bg-emerald-50/50 transition-colors">
                                        <td className="border border-slate-200 px-3 py-2 text-sm text-slate-700 font-medium whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-mono font-bold">{item.itemNo}</span>
                                                {item.itemType === 'Extra' && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 w-fit leading-none">
                                                        Extra
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-xs text-slate-600 min-w-[200px]">
                                            {item.itemType === 'Extra' ? (
                                                <textarea
                                                    rows={1}
                                                    value={item.description || ''}
                                                    onChange={(e) => handleExtraItemFieldChange(index, 'description', e.target.value)}
                                                    className="block w-full text-xs border-emerald-200 rounded-lg p-1.5 border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[34px]"
                                                    placeholder="Extra item description..."
                                                    required
                                                />
                                            ) : (
                                                <div className="line-clamp-2 font-medium" title={item.description}>
                                                    {item.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500 text-center">
                                            {item.itemType === 'Extra' ? (
                                                <input
                                                    type="text"
                                                    value={item.unit || ''}
                                                    onChange={(e) => handleExtraItemFieldChange(index, 'unit', e.target.value)}
                                                    className="block w-20 text-xs border-emerald-200 rounded-lg p-1 border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                    placeholder="Unit"
                                                    required
                                                />
                                            ) : (
                                                <span className="whitespace-nowrap font-medium">{item.unit}</span>
                                            )}
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-sm text-slate-700 font-mono font-medium text-right bg-slate-50/50">
                                            {item.boqQuantity != null ? Number(item.boqQuantity).toFixed(3) : '-'}
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-sm text-slate-700 font-mono text-right">
                                            {item.itemType === 'Extra' ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={tableRawInputs[`${index}-fullRate`] !== undefined ? tableRawInputs[`${index}-fullRate`] : (item.fullRate === 0 ? '' : String(item.fullRate))}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setTableRawInputs(prev => ({ ...prev, [`${index}-fullRate`]: val }));
                                                        handleExtraItemFieldChange(index, 'fullRate', val);
                                                    }}
                                                    className="block w-24 text-xs border-emerald-200 rounded-lg p-1 border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                                                    placeholder="Rate (₹)"
                                                    required
                                                />
                                            ) : (
                                                <span>{item.fullRate.toFixed(2)}</span>
                                            )}
                                        </td>
                                        
                                        {/* Editable Fields */}
                                        <td className="border border-slate-200 px-3 py-2 bg-emerald-50/30">
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={tableRawInputs[`${index}-quantity`] !== undefined ? tableRawInputs[`${index}-quantity`] : (item.quantity === 0 ? '' : String(item.quantity))}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setTableRawInputs(prev => ({ ...prev, [`${index}-quantity`]: val }));
                                                    handleItemChange(index, 'quantity', val);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const nextInput = document.querySelector(`input[data-qty-index="${index + 1}"]`) as HTMLInputElement;
                                                        if (nextInput) {
                                                            nextInput.focus();
                                                            nextInput.select();
                                                        }
                                                    }
                                                }}
                                                data-qty-index={index}
                                                className="block w-full sm:text-sm border-emerald-200 rounded-lg p-1.5 border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                                            />
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 bg-emerald-50/30">
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={tableRawInputs[`${index}-partRate`] !== undefined ? tableRawInputs[`${index}-partRate`] : (item.partRate === 0 ? '' : String(item.partRate))}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setTableRawInputs(prev => ({ ...prev, [`${index}-partRate`]: val }));
                                                    handleItemChange(index, 'partRate', val);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const nextInput = document.querySelector(`input[data-partrate-index="${index + 1}"]`) as HTMLInputElement;
                                                        if (nextInput) {
                                                            nextInput.focus();
                                                            nextInput.select();
                                                        }
                                                    }
                                                }}
                                                data-partrate-index={index}
                                                className="block w-full sm:text-sm border-emerald-200 rounded-lg p-1.5 border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                                            />
                                        </td>
                                        
                                        {/* Calculated Fields */}
                                        <td className="border border-slate-200 px-3 py-2 text-sm text-slate-800 font-mono text-right bg-slate-50/50">{item.uptoDateAmount.toFixed(2)}</td>
                                        
                                        <td className="border border-slate-200 px-3 py-2 bg-amber-50/30">
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={tableRawInputs[`${index}-previousPaidAmount`] !== undefined ? tableRawInputs[`${index}-previousPaidAmount`] : (item.previousPaidAmount === 0 ? '' : String(item.previousPaidAmount))}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setTableRawInputs(prev => ({ ...prev, [`${index}-previousPaidAmount`]: val }));
                                                    handleItemChange(index, 'previousPaidAmount', val);
                                                }}
                                                className="block w-full sm:text-sm border-amber-200 rounded-lg p-1.5 border focus:ring-amber-500 focus:border-amber-500 font-mono"
                                            />
                                        </td>
                                        
                                        <td className="border border-slate-200 px-3 py-2 text-sm font-bold text-emerald-800 font-mono text-right bg-emerald-100/50">
                                            {item.toBePaidAmount.toFixed(2)}
                                        </td>

                                        <td className="border border-slate-200 px-3 py-2 text-center bg-orange-50/40">
                                            <input
                                                type="checkbox"
                                                checked={!!item.considerForAsphalt}
                                                onChange={(e) => handleAsphaltFlagChange(index, e.target.checked)}
                                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-emerald-300 rounded cursor-pointer"
                                                title="Consider this item for Asphalt Deposit (2% of upto-date amount)"
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {formData.items.length > 0 && (() => {
                            const totalUptoDate = formData.items.reduce((s: number, i) => s + (i.uptoDateAmount || 0), 0);
                            const totalPrevPaid = formData.items.reduce((s: number, i) => s + (i.previousPaidAmount || 0), 0);
                            const totalToBePaid = formData.items.reduce((s: number, i) => s + (i.toBePaidAmount || 0), 0);

                            const pctMultiplier = tenderPercentage / 100;
                            const uptoDateAdj = totalUptoDate * pctMultiplier;
                            const prevPaidAdj = totalPrevPaid * pctMultiplier;
                            const toBePaidAdj = totalToBePaid * pctMultiplier;

                            const uptoDateNet = tenderDirection === 'Below' ? totalUptoDate - uptoDateAdj : totalUptoDate + uptoDateAdj;
                            const prevPaidNet = tenderDirection === 'Below' ? totalPrevPaid - prevPaidAdj : totalPrevPaid + prevPaidAdj;
                            const toBePaidNet = tenderDirection === 'Below' ? totalToBePaid - toBePaidAdj : totalToBePaid + toBePaidAdj;

                            const uptoDateGstBase = formData.labourCessApplicable ? uptoDateNet * 0.99 : uptoDateNet;
                            const prevPaidGstBase = formData.labourCessApplicable ? prevPaidNet * 0.99 : prevPaidNet;
                            const toBePaidGstBase = formData.labourCessApplicable ? toBePaidNet * 0.99 : toBePaidNet;

                            const uptoDateGst = uptoDateGstBase * 0.18;
                            const prevPaidGst = prevPaidGstBase * 0.18;
                            const toBePaidGst = toBePaidGstBase * 0.18;

                            const uptoDatePayable = uptoDateNet + uptoDateGst;
                            const prevPaidPayable = prevPaidNet + prevPaidGst;
                            const toBePaidPayable = toBePaidNet + toBePaidGst;

                            return (
                                <tfoot className="bg-emerald-50/90 font-semibold border-t-2 border-emerald-300">
                                    {/* Row 1: Total Amount */}
                                    <tr className="border-b border-emerald-200">
                                        <td colSpan={7} className="px-3 py-2.5 text-right text-xs font-bold text-slate-700">Total Amount:</td>
                                        <td className="px-3 py-2.5 text-xs text-slate-800 font-mono text-right font-bold">
                                            {totalUptoDate.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-amber-700 font-mono text-right font-bold">
                                            {totalPrevPaid.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-emerald-800 font-mono text-right border-x border-emerald-200 bg-emerald-100 font-extrabold">
                                            ₹{totalToBePaid.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    {/* Row 2: % Above/Below */}
                                    <tr className="border-b border-emerald-200 bg-emerald-50/40">
                                        <td colSpan={7} className="px-3 py-2 text-right text-xs font-semibold text-slate-600">{tenderPercentage}% {tenderDirection}:</td>
                                        <td className="px-3 py-2 text-xs text-slate-600 font-mono text-right">
                                            {tenderDirection === 'Below' ? '-' : ''}{uptoDateAdj.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-amber-600 font-mono text-right">
                                            {tenderDirection === 'Below' ? '-' : ''}{prevPaidAdj.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-emerald-700 font-mono text-right border-x border-emerald-200 font-bold">
                                            {tenderDirection === 'Below' ? '-₹' : '₹'}{toBePaidAdj.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    {/* Row 3: Net Amount */}
                                    <tr className="border-b border-emerald-200">
                                        <td colSpan={7} className="px-3 py-2.5 text-right text-xs text-slate-700 font-bold">Net Amount:</td>
                                        <td className="px-3 py-2.5 text-xs text-slate-800 font-mono text-right font-bold">
                                            {uptoDateNet.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-amber-700 font-mono text-right font-bold">
                                            {prevPaidNet.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-emerald-800 font-mono text-right border-x border-emerald-200 font-extrabold">
                                            ₹{toBePaidNet.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    {/* Row 4: Add 18% GST */}
                                    <tr className="border-b border-emerald-200 bg-emerald-50/40">
                                        <td colSpan={7} className="px-3 py-2 text-right text-xs text-slate-600">
                                            <div className="flex items-center justify-end space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id="labourCessApplicable"
                                                    name="labourCessApplicable"
                                                    checked={formData.labourCessApplicable}
                                                    onChange={handleChange}
                                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-emerald-300 rounded cursor-pointer"
                                                />
                                                <label htmlFor="labourCessApplicable" className="cursor-pointer text-slate-700 font-medium hover:text-slate-900">
                                                    Labour Cess Applicable
                                                </label>
                                                <span className="mx-2 text-emerald-300">|</span>
                                                <span className="font-semibold">Add 18% GST:</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-600 font-mono text-right">
                                            {uptoDateGst.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-amber-600 font-mono text-right">
                                            {prevPaidGst.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-emerald-700 font-mono text-right border-x border-emerald-200 font-bold">
                                            ₹{toBePaidGst.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    {/* Row 5: Net Payable Amount */}
                                    <tr className="bg-emerald-100/70 font-bold border-b border-emerald-200">
                                        <td colSpan={7} className="px-3 py-3 text-right text-xs text-emerald-900 font-extrabold uppercase">Net Payable Amount:</td>
                                        <td className="px-3 py-3 text-xs text-emerald-900 font-mono text-right font-bold">
                                            {uptoDatePayable.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-amber-900 font-mono text-right font-bold">
                                            {prevPaidPayable.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-emerald-950 font-mono text-right border-x border-emerald-300 bg-emerald-200/60 font-black">
                                            ₹{toBePaidPayable.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    {/* Row 6: Say Amount */}
                                    <tr className="bg-emerald-200/80 font-bold border-b-4 border-emerald-400">
                                        <td colSpan={7} className="px-3 py-3 text-right text-xs text-emerald-950 font-black tracking-wider uppercase">Say Amount:</td>
                                        <td className="px-3 py-3 text-xs text-emerald-950 font-mono text-right font-extrabold">
                                            {Math.floor(uptoDatePayable).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-amber-950 font-mono text-right font-extrabold">
                                            {Math.floor(prevPaidPayable).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-emerald-950 font-mono text-right border-x border-emerald-400 bg-emerald-300/60 font-black text-sm">
                                            ₹{Math.floor(toBePaidPayable).toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            );
                        })()}
                    </table>
                </div>
                </div>
            </div>

            {/* Work-wise Expenditure Table */}
            <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                            <Layers className="w-4 h-4" />
                        </span>
                        <h3 className="font-bold text-slate-800">Work-wise Expenditure</h3>
                        {formData.works && formData.works.length > 0 && (
                            <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                                {formData.works.length} works
                            </span>
                        )}
                    </div>
                    {formData.works && formData.works.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsWorkWiseExpanded(!isWorkWiseExpanded)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-emerald-300"
                        >
                            {isWorkWiseExpanded ? (
                                <>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    Collapse Work Breakdown
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    Expand Work Breakdown ({formData.works.length})
                                </>
                            )}
                        </button>
                    )}
                </div>
                {isWorkWiseExpanded && (
                    <div className="p-6">
                    <div className="overflow-x-auto border border-emerald-300 rounded-xl shadow-2xs">
                        <table className="excel-table">
                            <thead>
                                <tr className="bg-emerald-100/90 text-emerald-950">
                                    <th className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950 w-24">SR. No.</th>
                                    <th className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950">Name of Work</th>
                                    <th className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-right text-xs font-bold text-emerald-950 w-48">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-200/60 bg-white">
                                {formData.works.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">
                                            No works found for this package.
                                        </td>
                                    </tr>
                                ) : (
                                    formData.works.map((work, index: number) => (
                                        <tr key={index} className="hover:bg-emerald-50/50">
                                            <td className="border border-slate-200 px-3 py-2">
                                                <input type="text" value={work.srNo} readOnly className="block w-full text-xs font-bold sm:text-sm border-slate-200 rounded-lg p-1.5 border bg-slate-50 font-mono" />
                                            </td>
                                            <td className="border border-slate-200 px-3 py-2">
                                                <input type="text" value={work.nameOfWork} readOnly className="block w-full text-xs sm:text-sm border-slate-200 rounded-lg p-1.5 border bg-slate-50 font-medium" />
                                            </td>
                                            <td className="border border-slate-200 px-3 py-2">
                                                <input type="number" min="0" step="0.01" value={work.amount || ''} onChange={(e) => handleWorkChange(index, 'amount', e.target.value)} className="block w-full text-xs sm:text-sm border-emerald-200 rounded-lg p-1.5 border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-right" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {formData.works.length > 0 && (() => {
                                const totalAmount = formData.works.reduce((s: number, w) => s + (Number(w.amount) || 0), 0);
                                const pctMultiplier = tenderPercentage / 100;
                                const adjAmount = totalAmount * pctMultiplier;
                                const netAmount = tenderDirection === 'Below' ? totalAmount - adjAmount : totalAmount + adjAmount;
                                
                                const gstBase = formData.labourCessApplicable ? netAmount * 0.99 : netAmount;
                                const gstAmount = gstBase * 0.18;
                                const payableAmount = netAmount + gstAmount;

                                return (
                                    <tfoot className="bg-emerald-50/90 font-semibold border-t-2 border-emerald-300">
                                        <tr className="border-b border-emerald-200">
                                            <td colSpan={2} className="px-3 py-2.5 text-right text-xs font-bold text-slate-700">Total Amount:</td>
                                            <td className="px-3 py-2.5 text-xs text-slate-800 font-mono font-bold text-right">₹{totalAmount.toFixed(2)}</td>
                                        </tr>
                                        <tr className="border-b border-emerald-200 bg-emerald-50/40">
                                            <td colSpan={2} className="px-4 py-2 text-right text-xs font-semibold text-slate-600">{tenderPercentage}% {tenderDirection}:</td>
                                            <td className="px-3 py-2 text-xs text-slate-600 font-mono font-bold text-right">
                                                {tenderDirection === 'Below' ? '-₹' : '₹'}{adjAmount.toFixed(2)}
                                            </td>
                                        </tr>
                                        <tr className="border-b border-emerald-200">
                                            <td colSpan={2} className="px-3 py-2.5 text-right text-xs font-bold text-slate-700">Net Amount:</td>
                                            <td className="px-3 py-2.5 text-xs text-emerald-800 font-mono font-bold text-right">₹{netAmount.toFixed(2)}</td>
                                        </tr>
                                        <tr className="border-b border-emerald-200 bg-emerald-50/40">
                                            <td colSpan={2} className="px-3 py-2 text-right text-xs text-slate-600">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        name="labourCessApplicable"
                                                        checked={formData.labourCessApplicable}
                                                        onChange={handleChange}
                                                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-emerald-300 rounded cursor-pointer"
                                                    />
                                                    <label className="cursor-pointer text-slate-700 font-medium hover:text-slate-900">
                                                        Labour Cess Applicable
                                                    </label>
                                                    <span className="mx-2 text-emerald-300">|</span>
                                                    <span className="font-semibold">Add 18% GST:</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-600 font-mono font-bold text-right">₹{gstAmount.toFixed(2)}</td>
                                        </tr>
                                        <tr className="bg-emerald-100/70 font-bold border-b border-emerald-200">
                                            <td colSpan={2} className="px-3 py-3 text-right text-xs text-emerald-900 font-extrabold uppercase">Net Payable Amount:</td>
                                            <td className="px-3 py-3 text-xs text-emerald-950 font-mono text-right font-black">₹{payableAmount.toFixed(2)}</td>
                                        </tr>
                                        <tr className="bg-emerald-200/80 font-bold border-b-4 border-emerald-400">
                                            <td colSpan={2} className="px-3 py-3 text-right text-xs text-emerald-950 font-black tracking-wider uppercase">Say Amount:</td>
                                            <td className="px-3 py-3 text-xs text-emerald-950 font-mono text-right font-black text-sm">₹{Math.floor(payableAmount).toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                );
                            })()}
                        </table>
                    </div>
                    </div>
                )}
            </div>

            {/* Excess / Saving Statement Section */}
            <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                            <TrendingUp className="w-4 h-4" />
                        </span>
                        <h3 className="font-bold text-slate-800">Excess / Saving Statement</h3>
                        {formData.items && formData.items.length > 0 && (
                            <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                                {formData.items.length} items
                            </span>
                        )}
                    </div>
                    {formData.items && formData.items.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsExcessSavingExpanded(!isExcessSavingExpanded)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-emerald-300"
                        >
                            {isExcessSavingExpanded ? (
                                <>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    Collapse Item Details
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    Expand Item Details ({formData.items.length})
                                </>
                            )}
                        </button>
                    )}
                </div>
                
                {isExcessSavingExpanded && (
                    <div className="p-6 overflow-x-auto">
                        <table className="excel-table">
                        <thead>
                            <tr className="bg-emerald-100/90 text-emerald-950">
                                <th rowSpan={2} className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950">Item No.</th>
                                <th rowSpan={2} className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-left text-xs font-bold text-emerald-950 min-w-[200px]">Description</th>
                                <th rowSpan={2} className="border border-emerald-300 px-3 py-2 bg-emerald-100/90 text-center text-xs font-bold text-emerald-950">Unit</th>
                                
                                <th colSpan={3} className="border border-emerald-300 px-3 py-1.5 text-center bg-blue-100/90 text-blue-950 font-bold">As per Tender</th>
                                <th colSpan={3} className="border border-emerald-300 px-3 py-1.5 text-center bg-indigo-100/90 text-indigo-950 font-bold">As per Bill</th>
                                <th colSpan={2} className="border border-emerald-300 px-3 py-1.5 text-center bg-rose-100/90 text-rose-950 font-bold">Excess</th>
                                <th colSpan={2} className="border border-emerald-300 px-3 py-1.5 text-center bg-emerald-200/90 text-emerald-950 font-bold">Saving</th>
                            </tr>
                            <tr className="bg-emerald-100/70 text-emerald-950">
                                <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-blue-50 text-blue-900">Qty</th>
                                <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-blue-50 text-blue-900">Rate (₹)</th>
                                <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-blue-50 text-blue-900">Amount (₹)</th>
                                
                                <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-indigo-50 text-indigo-900">Qty</th>
                                <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-indigo-50 text-indigo-900">Rate (₹)</th>
                                <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-indigo-50 text-indigo-900">Amount (₹)</th>
                                
                                <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-rose-50 text-rose-900">Qty</th>
                                <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-rose-50 text-rose-900">Amount (₹)</th>
                                
                                <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-emerald-100 text-emerald-950">Qty</th>
                                <th className="border border-emerald-300 px-3 py-1.5 text-right text-xs font-semibold bg-emerald-100 text-emerald-950">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-200/60 bg-white">
                            {formData.items.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="px-6 py-8 text-center text-sm text-slate-500">
                                        No line items available to calculate Excess / Saving Statement.
                                    </td>
                                </tr>
                            ) : !isExcessSavingExpanded ? (
                                <tr>
                                    <td colSpan={13} className="px-4 py-3.5 text-center text-xs text-slate-500 bg-emerald-50/40 font-medium">
                                        <button
                                            type="button"
                                            onClick={() => setIsExcessSavingExpanded(true)}
                                            className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                            {formData.items.length} line items collapsed. Click to expand item breakdown.
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                formData.items.map((item, index: number) => {
                                    const tenderQty = Number(item.boqQuantity || 0);
                                    const tenderRate = Number(item.fullRate || 0);
                                    const tenderAmt = tenderQty * tenderRate;

                                    const billQty = Number(item.quantity || 0);
                                    const billRate = Number(item.partRate != null ? item.partRate : item.fullRate || 0);
                                    const billAmt = Number(item.uptoDateAmount != null ? item.uptoDateAmount : (billQty * billRate));

                                    const diffQty = billQty - tenderQty;
                                    const diffAmt = billAmt - tenderAmt;

                                    const excessQty = diffQty > 0 ? diffQty : 0;
                                    const excessAmt = diffAmt > 0 ? diffAmt : 0;

                                    const savingQty = diffQty < 0 ? Math.abs(diffQty) : 0;
                                    const savingAmt = diffAmt < 0 ? Math.abs(diffAmt) : 0;

                                    return (
                                        <tr key={index} className="hover:bg-emerald-50/50 font-mono text-xs">
                                            <td className="border border-slate-200 px-3 py-2 text-left font-sans text-slate-700 font-bold">{item.itemNo}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-left font-sans text-slate-600 max-w-[240px] truncate font-medium" title={item.description}>{item.description}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-center font-sans text-slate-500">{item.unit}</td>
                                            
                                            {/* Tender */}
                                            <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{tenderQty ? tenderQty.toFixed(2) : '0.00'}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{tenderRate ? tenderRate.toFixed(2) : '0.00'}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-right text-blue-900 font-semibold bg-blue-50/30">{tenderAmt ? tenderAmt.toFixed(2) : '0.00'}</td>
                                            
                                            {/* Bill */}
                                            <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{billQty ? billQty.toFixed(2) : '0.00'}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{billRate ? billRate.toFixed(2) : '0.00'}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-right text-indigo-900 font-semibold bg-indigo-50/30">{billAmt ? billAmt.toFixed(2) : '0.00'}</td>
                                            
                                            {/* Excess */}
                                            <td className="border border-slate-200 px-3 py-2 text-right text-rose-700">{excessQty > 0 ? excessQty.toFixed(2) : '-'}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-right text-rose-900 font-bold bg-rose-50/30">{excessAmt > 0 ? `₹${excessAmt.toFixed(2)}` : '-'}</td>
                                            
                                            {/* Saving */}
                                            <td className="border border-slate-200 px-3 py-2 text-right text-emerald-700">{savingQty > 0 ? savingQty.toFixed(2) : '-'}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-right text-emerald-900 font-bold bg-emerald-50/50">{savingAmt > 0 ? `₹${savingAmt.toFixed(2)}` : '-'}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {formData.items.length > 0 && (
                            <tfoot className="bg-emerald-50/90 font-bold text-xs border-t-2 border-emerald-300">
                                {(() => {
                                    const totalTender = formData.items.reduce((s: number, i) => s + ((Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0))), 0);
                                    const totalBill = formData.items.reduce((s: number, i) => s + (Number(i.uptoDateAmount || (Number(i.quantity || 0) * Number(i.partRate || i.fullRate || 0)))), 0);
                                    
                                    const totalExcess = formData.items.reduce((s: number, i) => {
                                        const tAmt = (Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0));
                                        const bAmt = Number(i.uptoDateAmount || (Number(i.quantity || 0) * Number(i.partRate || i.fullRate || 0)));
                                        const diff = bAmt - tAmt;
                                        return s + (diff > 0 ? diff : 0);
                                    }, 0);

                                    const totalSaving = formData.items.reduce((s: number, i) => {
                                        const tAmt = (Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0));
                                        const bAmt = Number(i.uptoDateAmount || (Number(i.quantity || 0) * Number(i.partRate || i.fullRate || 0)));
                                        const diff = bAmt - tAmt;
                                        return s + (diff < 0 ? Math.abs(diff) : 0);
                                    }, 0);

                                    const netDiff = totalExcess - totalSaving;

                                    return (
                                        <>
                                            <tr>
                                                <td colSpan={3} className="px-3 py-2.5 text-right font-sans text-slate-800 uppercase tracking-wider">Total:</td>
                                                <td colSpan={2} className="px-3 py-2.5"></td>
                                                <td className="px-3 py-2.5 text-right font-mono text-blue-950">₹{totalTender.toFixed(2)}</td>
                                                <td colSpan={2} className="px-3 py-2.5"></td>
                                                <td className="px-3 py-2.5 text-right font-mono text-indigo-950">₹{totalBill.toFixed(2)}</td>
                                                <td></td>
                                                <td className="px-3 py-2.5 text-right font-mono text-rose-950">₹{totalExcess.toFixed(2)}</td>
                                                <td></td>
                                                <td className="px-3 py-2.5 text-right font-mono text-emerald-950">₹{totalSaving.toFixed(2)}</td>
                                            </tr>
                                            <tr className="bg-emerald-100/90 text-emerald-950">
                                                <td colSpan={9} className="px-3 py-2.5 text-right font-sans uppercase font-black tracking-wider">
                                                    Net Statement Summary ({netDiff >= 0 ? 'Excess' : 'Saving'}):
                                                </td>
                                                <td colSpan={4} className={`px-3 py-2.5 text-right font-mono font-black text-sm ${netDiff >= 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                                                    {netDiff >= 0 ? `+₹${netDiff.toFixed(2)} (Excess)` : `-₹${Math.abs(netDiff).toFixed(2)} (Saving)`}
                                                </td>
                                            </tr>
                                        </>
                                    );
                                })()}
                            </tfoot>
                        )}
                    </table>
                </div>
                )}
            </div>

            {/* Audit Memo Section */}
            <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                            <Receipt className="w-4 h-4" />
                        </span>
                        <h3 className="font-bold text-slate-800">Audit Memo & Statutory Deductions</h3>
                    </div>
                </div>
                <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        {/* Group 1: Payables / Additions Table */}
                        <div className="overflow-x-auto border border-emerald-300 rounded-xl shadow-2xs">
                            <table className="excel-table table-fixed w-full">
                                <colgroup>
                                    <col className="w-1/2" />
                                    <col className="w-1/2" />
                                </colgroup>
                                <thead>
                                    <tr className="bg-emerald-100/90 text-emerald-950">
                                        <th colSpan={2} className="border border-emerald-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-950">
                                            1. Payables / Deductibles
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="excel-label">Gross Amount</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="grossAmount"
                                                id="grossAmount"
                                                value={formData.grossAmount === 0 ? '' : formData.grossAmount}
                                                onChange={(e) => recalculateAuditMemo({ grossAmount: e.target.value })}
                                                className="excel-cell-input text-right font-mono font-bold"
                                                placeholder="0.00"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Previously Paid Amount</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="auditMemoPreviouslyPaid"
                                                id="auditMemoPreviouslyPaid"
                                                value={formData.auditMemoPreviouslyPaid === 0 ? '' : formData.auditMemoPreviouslyPaid}
                                                onChange={(e) => recalculateAuditMemo({ auditMemoPreviouslyPaid: e.target.value })}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0.00"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Amount of Dismantle Credit</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="dismantleCredit"
                                                id="dismantleCredit"
                                                value={formData.dismantleCredit === 0 ? '' : formData.dismantleCredit}
                                                onChange={(e) => recalculateAuditMemo({ dismantleCredit: e.target.value })}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0.00"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Excess / Extra Items</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="excessExtraAmount"
                                                id="excessExtraAmount"
                                                value={formData.excessExtraAmount === 0 ? '' : formData.excessExtraAmount}
                                                onChange={(e) => recalculateAuditMemo({ excessExtraAmount: e.target.value })}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0.00"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Price Adjustment</td>
                                        <td className="excel-value">
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    name="priceAdjustment"
                                                    id="priceAdjustment"
                                                    value={formData.priceAdjustment === 0 ? '' : formData.priceAdjustment}
                                                    onChange={(e) => recalculateAuditMemo({ priceAdjustment: e.target.value })}
                                                    className="excel-cell-input text-right font-mono w-2/3"
                                                    placeholder="0.00"
                                                />
                                                <select
                                                    name="priceAdjustmentType"
                                                    id="priceAdjustmentType"
                                                    value={formData.priceAdjustmentType}
                                                    onChange={(e) => recalculateAuditMemo({ priceAdjustmentType: e.target.value })}
                                                    className="excel-cell-select w-1/3 text-[11px] font-bold py-0.5"
                                                >
                                                    <option value="Payable">Payable</option>
                                                    <option value="Deductible">Deductible</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Administrative Approval</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="adminApprovalAmount"
                                                id="adminApprovalAmount"
                                                value={formData.adminApprovalAmount === 0 ? '' : formData.adminApprovalAmount}
                                                onChange={(e) => recalculateAuditMemo({ adminApprovalAmount: e.target.value })}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0.00"
                                            />
                                            {(() => {
                                                const sanctioned = getSanctionedWorksTotal(formData.workOrderId);
                                                if (!sanctioned) return null;
                                                return (
                                                    <div className="text-[10px] text-slate-500 font-mono text-right mt-0.5">
                                                        Auto = max(0, Gross − ₹{Math.round(sanctioned).toLocaleString('en-IN')})
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Withheld Deposit</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="withheldDeposit"
                                                id="withheldDeposit"
                                                value={formData.withheldDeposit === 0 ? '' : formData.withheldDeposit}
                                                onChange={(e) => recalculateAuditMemo({ withheldDeposit: e.target.value })}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0.00"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr className="bg-emerald-100/90 font-bold border-t-2 border-emerald-300">
                                        <td className="px-3 py-2 text-right text-xs uppercase font-extrabold text-emerald-950">
                                            Net Payable Amount:
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-black text-sm text-emerald-950">
                                            {Math.round(Number(formData.netPayableAmount || 0)).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Group 2: Deductions Table */}
                        <div className="overflow-x-auto border border-emerald-300 rounded-xl shadow-2xs">
                            <table className="excel-table table-fixed w-full">
                                <colgroup>
                                    <col className="w-1/2" />
                                    <col className="w-1/2" />
                                </colgroup>
                                <thead>
                                    <tr className="bg-emerald-100/90 text-emerald-950">
                                        <th colSpan={2} className="border border-emerald-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-950">
                                            2. Statutory Deductions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="excel-label">Income Tax (IT)</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="incomeTax"
                                                id="incomeTax"
                                                value={formData.incomeTax === 0 ? '' : formData.incomeTax}
                                                onChange={(e) => recalculateAuditMemo({ incomeTax: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">GST</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="gst"
                                                id="gstDeduction"
                                                value={formData.gst === 0 ? '' : formData.gst}
                                                onChange={(e) => recalculateAuditMemo({ gst: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Labour Cess</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="labourCess"
                                                id="labourCessDeduction"
                                                value={formData.labourCess === 0 ? '' : formData.labourCess}
                                                onChange={(e) => recalculateAuditMemo({ labourCess: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Security Deposit</td>
                                        <td className="excel-value">
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const selectedWorkOrder = workOrders.find((wo) => wo._id === formData.workOrderId);
                                                    const cp = contractPriceState || parseFloat(String(selectedWorkOrder?.loaId?.tenderId?.contractPrice || selectedWorkOrder?.loaId?.tenderId?.estimatedAmount || 0));
                                                    const maxSD = cp > 0 ? Math.ceil((cp * 0.05) / 100) * 100 : 0;
                                                    const remainingSD = Math.max(0, maxSD - previousSDTotal);
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={() => recalculateAuditMemo({ securityDeposit: remainingSD })}
                                                            className="shrink-0 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded border border-emerald-300 transition-colors whitespace-nowrap cursor-pointer"
                                                            title="Deduct remaining eligible security deposit"
                                                        >
                                                            Remaining
                                                        </button>
                                                    );
                                                })()}
                                                <input
                                                    type="number"
                                                    step="1"
                                                    name="securityDeposit"
                                                    id="securityDepositDeduction"
                                                    value={formData.securityDeposit === 0 ? '' : formData.securityDeposit}
                                                    onChange={(e) => recalculateAuditMemo({ securityDeposit: e.target.value })}
                                                    onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className="excel-cell-input text-right font-mono"
                                                    placeholder="0"
                                                />
                                            </div>
                                            {(() => {
                                                const selectedWorkOrder = workOrders.find((wo) => wo._id === formData.workOrderId);
                                                const cp = contractPriceState || parseFloat(String(selectedWorkOrder?.loaId?.tenderId?.contractPrice || selectedWorkOrder?.loaId?.tenderId?.estimatedAmount || 0));
                                                const maxSD = cp > 0 ? Math.ceil((cp * 0.05) / 100) * 100 : 0;
                                                return (
                                                    <div className="text-[10px] text-slate-500 font-medium pr-0.5 space-y-0.5 mt-1 border-t border-dashed border-emerald-200 pt-1 text-right">
                                                        <div>
                                                            Prev bills: {Math.round(previousSDTotal).toLocaleString('en-IN')}
                                                        </div>
                                                        <div>
                                                            Max (5%): {Math.round(maxSD).toLocaleString('en-IN')}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Free Maintenance Deposit</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="freeMaintenanceDeposit"
                                                id="freeMaintenanceDeposit"
                                                value={formData.freeMaintenanceDeposit === 0 ? '' : formData.freeMaintenanceDeposit}
                                                onChange={(e) => recalculateAuditMemo({ freeMaintenanceDeposit: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Asphalt Deposit</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="asphaltDeposit"
                                                id="asphaltDeposit"
                                                value={formData.asphaltDeposit === 0 ? '' : formData.asphaltDeposit}
                                                onChange={(e) => recalculateAuditMemo({ asphaltDeposit: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono disabled:bg-slate-100 disabled:text-slate-400"
                                                placeholder="0"
                                                disabled={formData.billType === 'Final'}
                                                title={formData.billType === 'Final' ? 'No Asphalt Deposit on Final Bill' : undefined}
                                            />
                                            {formData.billType === 'Final' ? (
                                                <div className="text-[10px] text-slate-500 font-mono text-right mt-0.5">
                                                    Not applicable for Final Bill
                                                </div>
                                            ) : (() => {
                                                const flagged = (formData.items || []).reduce(
                                                    (s: number, it) => s + (it?.considerForAsphalt ? (Number(it.uptoDateAmount) || 0) : 0), 0);
                                                if (!flagged) return null;
                                                return (
                                                    <div className="text-[10px] text-slate-500 font-mono text-right mt-0.5">
                                                        Auto = ⌈2% of ₹{Math.round(flagged).toLocaleString('en-IN')}⌉ − prev ₹{Math.round(previousAsphaltTotal).toLocaleString('en-IN')}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2} className="border border-emerald-300 px-3 py-1.5">
                                            <button
                                                type="button"
                                                onClick={() => recalculateAuditMemo({}, true)}
                                                className="w-full px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded border border-emerald-300 transition-colors cursor-pointer"
                                            >
                                                Re-Calculate
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Core Sample Deposit</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="coreSampleDeposit"
                                                id="coreSampleDeposit"
                                                value={formData.coreSampleDeposit === 0 ? '' : formData.coreSampleDeposit}
                                                onChange={(e) => recalculateAuditMemo({ coreSampleDeposit: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">TPI (Third Party Inspection)</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="tpi"
                                                id="tpi"
                                                value={formData.tpi === 0 ? '' : formData.tpi}
                                                onChange={(e) => recalculateAuditMemo({ tpi: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">ESMP</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="esmp"
                                                id="esmp"
                                                value={formData.esmp === 0 ? '' : formData.esmp}
                                                onChange={(e) => recalculateAuditMemo({ esmp: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Time Limit Deposit</td>
                                        <td className="excel-value">
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const selectedWorkOrder = workOrders.find((wo) => wo._id === formData.workOrderId);
                                                    const compTargetDate = stipulatedCompletionDate 
                                                        ? new Date(stipulatedCompletionDate) 
                                                        : (selectedWorkOrder?.stipulatedCompletionDate ? new Date(selectedWorkOrder.stipulatedCompletionDate) : null);

                                                    let totalCalculatedTLD = 0;
                                                    if (compTargetDate) {
                                                        const getDaysDiff = (date1: Date, date2: Date) => {
                                                            const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
                                                            const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
                                                            const diffTime = d1.getTime() - d2.getTime();
                                                            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                        };

                                                        let daysDelay = 0;
                                                        if (formData.billType === 'Running') {
                                                            const lastRecordDate = formData.lastRecordEntryDate ? parseDateStr(formData.lastRecordEntryDate) : null;
                                                            if (lastRecordDate) {
                                                                daysDelay = Math.max(0, Math.min(100, getDaysDiff(lastRecordDate, compTargetDate)));
                                                                const sayAmt = Number(formData.grossAmount) || 0;
                                                                totalCalculatedTLD = Math.ceil((0.001 * sayAmt * daysDelay) / 100) * 100;
                                                            }
                                                        } else {
                                                            const completionDate = formData.actualCompletionDate ? parseDateStr(formData.actualCompletionDate) : null;
                                                            if (completionDate) {
                                                                daysDelay = Math.max(0, Math.min(100, getDaysDiff(completionDate, compTargetDate)));
                                                                const contractPriceVal = contractPriceState 
                                                                    ? contractPriceState 
                                                                    : (selectedWorkOrder?.loaId?.tenderId?.contractPrice || selectedWorkOrder?.loaId?.tenderId?.estimatedAmount || 0);
                                                                totalCalculatedTLD = Math.ceil((0.001 * Number(contractPriceVal) * daysDelay) / 100) * 100;
                                                            }
                                                        }
                                                    }
                                                    const remainingTLD = Math.max(0, totalCalculatedTLD - previousTLDTotal);
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={() => recalculateAuditMemo({ timeLimitDeposit: remainingTLD })}
                                                            className="shrink-0 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded border border-emerald-300 transition-colors whitespace-nowrap cursor-pointer"
                                                            title="Deduct remaining time limit deposit"
                                                        >
                                                            Remaining
                                                        </button>
                                                    );
                                                })()}
                                                <input
                                                    type="number"
                                                    step="1"
                                                    name="timeLimitDeposit"
                                                    id="timeLimitDeposit"
                                                    value={formData.timeLimitDeposit === 0 ? '' : formData.timeLimitDeposit}
                                                    onChange={(e) => recalculateAuditMemo({ timeLimitDeposit: e.target.value })}
                                                    onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className="excel-cell-input text-right font-mono"
                                                    placeholder="0"
                                                />
                                            </div>
                                            {(() => {
                                                const selectedWorkOrder = workOrders.find((wo) => wo._id === formData.workOrderId);
                                                const compTargetDate = stipulatedCompletionDate 
                                                    ? new Date(stipulatedCompletionDate) 
                                                    : (selectedWorkOrder?.stipulatedCompletionDate ? new Date(selectedWorkOrder.stipulatedCompletionDate) : null);

                                                const getDaysDiff = (date1: Date, date2: Date) => {
                                                    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
                                                    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
                                                    const diffTime = d1.getTime() - d2.getTime();
                                                    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                };

                                                let daysDelay = 0;
                                                let totalCalculatedTLD = 0;
                                                if (compTargetDate) {
                                                    if (formData.billType === 'Running') {
                                                        const lastRecordDate = formData.lastRecordEntryDate ? parseDateStr(formData.lastRecordEntryDate) : null;
                                                        if (lastRecordDate) {
                                                            daysDelay = Math.max(0, Math.min(100, getDaysDiff(lastRecordDate, compTargetDate)));
                                                            const sayAmt = Number(formData.grossAmount) || 0;
                                                            totalCalculatedTLD = Math.ceil((0.001 * sayAmt * daysDelay) / 100) * 100;
                                                        }
                                                    } else {
                                                        const completionDate = formData.actualCompletionDate ? parseDateStr(formData.actualCompletionDate) : null;
                                                        if (completionDate) {
                                                            daysDelay = Math.max(0, Math.min(100, getDaysDiff(completionDate, compTargetDate)));
                                                            const contractPriceVal = contractPriceState 
                                                                ? contractPriceState 
                                                                : (selectedWorkOrder?.loaId?.tenderId?.contractPrice || selectedWorkOrder?.loaId?.tenderId?.estimatedAmount || 0);
                                                            totalCalculatedTLD = Math.ceil((0.001 * Number(contractPriceVal) * daysDelay) / 100) * 100;
                                                        }
                                                    }
                                                }

                                                return (
                                                    <div className="mt-1 space-y-0.5 border-t border-dashed border-emerald-200 pt-1 text-right pr-0.5">
                                                        {compTargetDate && (
                                                            <p className="text-[10px] text-slate-500 font-medium leading-none">
                                                                Delay: <span className={daysDelay > 0 ? "text-amber-600 font-bold" : "text-slate-500 font-bold"}>{daysDelay} days</span>
                                                            </p>
                                                        )}
                                                        <div className="text-[10px] text-slate-500 font-medium space-y-0.5 pt-0.5">
                                                            <div>
                                                                Prev bills: {Math.round(previousTLDTotal).toLocaleString('en-IN')}
                                                            </div>
                                                            <div>
                                                                Max: {Math.round(totalCalculatedTLD).toLocaleString('en-IN')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Testing Charges</td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="testingCharges"
                                                id="testingCharges"
                                                value={formData.testingCharges === 0 ? '' : formData.testingCharges}
                                                onChange={(e) => recalculateAuditMemo({ testingCharges: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label p-1">
                                            <input
                                                type="text"
                                                name="otherDepositLabel"
                                                value={formData.otherDepositLabel !== undefined ? formData.otherDepositLabel : 'Other Deposit'}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, otherDepositLabel: e.target.value }))}
                                                className="text-xs font-bold text-slate-600 bg-transparent px-1 py-0.5 outline-none w-full border-b border-dashed border-emerald-300 focus:border-emerald-600"
                                                placeholder="Other Deposit"
                                                title="Click to edit label"
                                            />
                                        </td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="otherDeposit"
                                                id="otherDeposit"
                                                value={formData.otherDeposit === 0 ? '' : formData.otherDeposit}
                                                onChange={(e) => recalculateAuditMemo({ otherDeposit: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label p-1">
                                            <input
                                                type="text"
                                                name="otherDeposit2Label"
                                                value={formData.otherDeposit2Label !== undefined ? formData.otherDeposit2Label : 'Other Deposit 2'}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, otherDeposit2Label: e.target.value }))}
                                                className="text-xs font-bold text-slate-600 bg-transparent px-1 py-0.5 outline-none w-full border-b border-dashed border-emerald-300 focus:border-emerald-600"
                                                placeholder="Other Deposit 2"
                                                title="Click to edit label"
                                            />
                                        </td>
                                        <td className="excel-value">
                                            <input
                                                type="number"
                                                step="1"
                                                name="otherDeposit2"
                                                id="otherDeposit2"
                                                value={formData.otherDeposit2 === 0 ? '' : formData.otherDeposit2}
                                                onChange={(e) => recalculateAuditMemo({ otherDeposit2: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="excel-cell-input text-right font-mono"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr className="bg-amber-100/90 font-bold border-t-2 border-amber-300">
                                        <td className="px-3 py-2 text-right text-xs uppercase font-extrabold text-amber-950">
                                            Total Deductions:
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-black text-sm text-amber-950">
                                            {Math.round(Number(formData.totalDeduction || 0)).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Compact Summary Bar */}
                    <div className="mt-4 bg-emerald-800 text-white px-5 py-3 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
                        <div className="flex items-center gap-4 sm:gap-6 text-xs">
                            <div>
                                <span className="text-emerald-200 font-semibold uppercase text-[10px] tracking-wider block">Net Payable</span>
                                <span className="font-mono font-bold text-white text-sm">{Math.round(Number(formData.netPayableAmount || 0)).toLocaleString('en-IN')}</span>
                            </div>
                            <span className="text-emerald-300 font-bold text-base">-</span>
                            <div>
                                <span className="text-emerald-200 font-semibold uppercase text-[10px] tracking-wider block">Total Deductions</span>
                                <span className="font-mono font-bold text-amber-300 text-sm">{Math.round(Number(formData.totalDeduction || 0)).toLocaleString('en-IN')}</span>
                            </div>
                            <span className="text-emerald-300 font-bold text-base">=</span>
                        </div>
                        <div className="text-right">
                            <span className="text-emerald-200 font-bold uppercase text-[10px] tracking-wider block">Final Net Paid Amount:</span>
                            <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">{Math.round(Number(formData.netPaidAmount || 0)).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Summary Section */}
            <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                        <label htmlFor="remarks" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Remarks</label>
                        <textarea 
                            name="remarks" id="remarks" rows={2} value={formData.remarks} onChange={handleChange} 
                            className="mt-1 block w-full text-xs sm:text-sm border-emerald-200 rounded-xl p-2.5 border bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                            placeholder="Enter any additional audit/verification remarks..."
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-emerald-100 mt-6">
                    <div className="flex justify-end items-center gap-3">
                        {onCancel ? (
                            <button type="button" onClick={onCancel} className="bg-white py-2.5 px-5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs">Cancel</button>
                        ) : (
                            <Link href="/bills" className="bg-white py-2.5 px-5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs">Cancel</Link>
                        )}
                        <button type="submit" disabled={loading || fetchingAbstract} className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent shadow-xs text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {loading ? 'Saving...' : 'Save Bill & Abstract'}
                        </button>
                    </div>
                </div>
            </div>
        </form>
        </>
    );
}
