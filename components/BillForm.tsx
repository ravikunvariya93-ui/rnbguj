'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RefreshCw, Plus, Trash2, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import SearchableSelect from './SearchableSelect';

interface IBillItem {
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
}

interface BillFormData {
    workOrderId: string;
    billType: string;
    runningBillNumber: string;
    billDate: string;
    grossAmount: number;
    netPaidAmount: any;
    passingDate: string;
    praisaBillNo?: string;
    praisaBillDate?: string;
    voucherNo?: string;
    voucherDate?: string;
    measurementChecking: any[];
    actualCompletionDate?: string;
    lastRecordEntryDate?: string;
    remarks: string;
    auditMemoPreviouslyPaid: any;
    dismantleCredit: any;
    excessExtraAmount: any;
    priceAdjustment: any;
    priceAdjustmentType: string;
    adminApprovalAmount: any;
    withheldDeposit: any;
    netPayableAmount: any;
    incomeTax: any;
    gst: any;
    labourCess: any;
    securityDeposit: any;
    freeMaintenanceDeposit: any;
    asphaltDeposit: any;
    coreSampleDeposit: any;
    tpi: any;
    esmp: any;
    timeLimitDeposit: any;
    testingCharges: any;
    otherDeposit: any;
    totalDeduction: any;
    labourCessApplicable: boolean;
    items: IBillItem[];
    works: any[];
}

interface BillFormProps {
    initialData?: any;
    isEditing?: boolean;
    initialWorkOrderId?: string;
    initialTenderPercentage?: number;
    initialTenderDirection?: string;
    initialWorks?: any[];
    contractPrice?: number;
    submittedSD?: number;
    workType?: string;
    budgetHead?: string;
    stipulatedCompletionDate?: string | Date;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function calculateSecurityDeposit(netPayVal: number, contractPriceVal: number = 0, previousDeducted: number = 0): number {
    const netPay = Math.max(netPayVal || 0, 0);
    const sdBase = netPay > 0 ? Math.ceil((netPay * 0.06) / 100) * 100 : 0;
    
    const contractPrice = Math.max(contractPriceVal || 0, 0);
    if (contractPrice > 0) {
        const sdMax = Math.ceil((contractPrice * 0.05) / 100) * 100;
        const remainingMax = Math.max(0, sdMax - previousDeducted);
        return Math.min(sdBase, remainingMax);
    }
    
    return sdBase;
}

function parseDateStr(dateStr: string): Date | null {
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

function formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    try {
        const dateObj = new Date(dateString);
        if (isNaN(dateObj.getTime())) return '';
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${dateObj.getFullYear()}`;
    } catch {
        return '';
    }
}

function getTodayDateFormatted(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
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
    workType = '',
    budgetHead = '',
    stipulatedCompletionDate,
    onSuccess, 
    onCancel 
}: BillFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetchingAbstract, setFetchingAbstract] = useState(false);
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [tenderPercentage, setTenderPercentage] = useState<number>(
        initialTenderPercentage !== undefined ? initialTenderPercentage : 0
    );
    const [tenderDirection, setTenderDirection] = useState<string>(
        initialTenderDirection === 'Equals' ? 'At Par' : (initialTenderDirection || 'Above')
    );
    const [contractPriceState, setContractPriceState] = useState<number>(contractPrice || 0);
    const [submittedSDState, setSubmittedSDState] = useState<number>(submittedSD || 0);
    const [workTypeState, setWorkTypeState] = useState<string>(workType || '');
    const [budgetHeadState, setBudgetHeadState] = useState<string>(budgetHead || '');
    const [abstractFetched, setAbstractFetched] = useState(false);
    const [previousSDTotal, setPreviousSDTotal] = useState<number>(0);
    const [tableRawInputs, setTableRawInputs] = useState<Record<string, string>>({});

    const sanitized = Object.fromEntries(
        Object.entries(initialData).map(([k, v]) => [k, v == null ? '' : v])
    ) as any;

    const formattedInitialWorks = (initialData.works && initialData.works.length > 0)
        ? initialData.works
        : (initialWorks && initialWorks.length > 0)
            ? initialWorks.map((w: any, i: number) => ({
                srNo: String(i + 1),
                nameOfWork: w.workName || w.nameOfWork || '',
                amount: 0
            }))
            : [];

    const [formData, setFormData] = useState<BillFormData>({
        workOrderId: initialWorkOrderId || '',
        billType: 'Running',
        runningBillNumber: '1',
        billDate: sanitized.billDate ? formatDateForInput(sanitized.billDate) : getTodayDateFormatted(),
        grossAmount: 0,
        netPaidAmount: sanitized.netPaidAmount || '',
        passingDate: '',
        actualCompletionDate: sanitized.actualCompletionDate ? formatDateForInput(sanitized.actualCompletionDate) : '',
        lastRecordEntryDate: sanitized.lastRecordEntryDate ? formatDateForInput(sanitized.lastRecordEntryDate) : '',
        remarks: '',
        auditMemoPreviouslyPaid: sanitized.auditMemoPreviouslyPaid ?? 0,
        dismantleCredit: sanitized.dismantleCredit ?? 0,
        excessExtraAmount: sanitized.excessExtraAmount ?? 0,
        priceAdjustment: sanitized.priceAdjustment ?? 0,
        priceAdjustmentType: sanitized.priceAdjustmentType || 'Payable',
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
        totalDeduction: sanitized.totalDeduction ?? 0,
        ...sanitized,
        praisaBillNo: sanitized.praisaBillNo || '',
        praisaBillDate: sanitized.praisaBillDate ? formatDateForInput(sanitized.praisaBillDate) : '',
        voucherNo: sanitized.voucherNo || '',
        voucherDate: sanitized.voucherDate ? formatDateForInput(sanitized.voucherDate) : '',
        measurementChecking: (initialData.measurementChecking && initialData.measurementChecking.length > 0)
            ? initialData.measurementChecking.map((mc: any) => ({
                ...mc,
                date: mc.date ? formatDateForInput(mc.date) : ''
            }))
            : [],
        labourCessApplicable: sanitized.labourCessApplicable ?? false,
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
        if (contractPrice !== undefined) setContractPriceState(contractPrice);
        if (submittedSD !== undefined) setSubmittedSDState(submittedSD);
        if (workType !== undefined) setWorkTypeState(workType);
        if (budgetHead !== undefined) setBudgetHeadState(budgetHead);
    }, [contractPrice, submittedSD, workType, budgetHead]);

    useEffect(() => {
        if (initialTenderPercentage !== undefined) {
            setTenderPercentage(initialTenderPercentage);
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
    }, [initialWorkOrderId, isEditing, abstractFetched]);

    useEffect(() => {
        if (isEditing && initialData) {
            setFormData((prev: any) => ({
                ...prev,
                billDate: formatDateForInput(initialData.billDate),
                passingDate: formatDateForInput(initialData.passingDate),
                actualCompletionDate: formatDateForInput(initialData.actualCompletionDate),
                lastRecordEntryDate: formatDateForInput(initialData.lastRecordEntryDate),
                workOrderId: initialData.workOrderId?._id || initialData.workOrderId || '',
                praisaBillNo: initialData.praisaBillNo || '',
                praisaBillDate: initialData.praisaBillDate ? formatDateForInput(initialData.praisaBillDate) : '',
                voucherNo: initialData.voucherNo || '',
                voucherDate: initialData.voucherDate ? formatDateForInput(initialData.voucherDate) : '',
                measurementChecking: (initialData.measurementChecking && initialData.measurementChecking.length > 0)
                    ? initialData.measurementChecking.map((mc: any) => ({
                        ...mc,
                        date: mc.date ? formatDateForInput(mc.date) : ''
                    }))
                    : [],
            }));
        }
    }, [initialData, isEditing]);

    useEffect(() => {
        if (formData.workOrderId && workOrders.length > 0) {
            const selectedWorkOrder = workOrders.find((wo: any) => wo._id === formData.workOrderId);
            if (selectedWorkOrder?.loaId?.tenderId) {
                const pct = selectedWorkOrder.loaId.tenderId.aboveBelowPercentage !== undefined ? selectedWorkOrder.loaId.tenderId.aboveBelowPercentage : 0;
                let dir = selectedWorkOrder.loaId.tenderId.aboveBelowInWord || 'Above';
                if (dir === 'Equals') dir = 'At Par';
                const cp = selectedWorkOrder.loaId.tenderId.contractPrice || selectedWorkOrder.loaId.tenderId.estimatedAmount || 0;
                const ssd = selectedWorkOrder.securityDepositAmount || 0;
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
                    const prevBills = data.data.filter((b: any) => {
                        if (currentBillId && b._id === currentBillId) {
                            return false;
                        }
                        return (b.runningBillNumber || 0) < currentBillNo;
                    });
                    const sum = prevBills.reduce((s: number, b: any) => s + (b.securityDeposit || 0), 0);
                    setPreviousSDTotal(sum);
                    setFormData((prev: any) => {
                        return recalculateAuditMemoInternal(prev, undefined, sum);
                    });
                }
            } catch (err) {
                console.error('Error fetching previous bills:', err);
            }
        }
        fetchPreviousBills();
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
        const netPay = Math.max(netPayVal, 0);
        const incomeTax = netPay > 0 ? Math.ceil((netPay * 0.02) / 10) * 10 : 0;
        const gst = netPay > 0 ? Math.ceil((netPay * 0.02) / 10) * 10 : 0;
        const labourCess = netPay > 0 ? Math.ceil((netPay * 0.01) / 10) * 10 : 0;

        const cp = cPrice !== undefined ? cPrice : contractPriceState;
        const securityDeposit = calculateSecurityDeposit(netPay, cp, prevSD !== undefined ? prevSD : previousSDTotal);

        const currentWType = wType || workTypeState || '';
        const isBuilding = String(currentWType).toLowerCase().includes('building');
        const freeMaintenanceDeposit = isBuilding ? 0 : parseFloat((netPay * 0.05).toFixed(2));

        const currentBHead = String(bHead || budgetHeadState || '').trim().toLowerCase();
        const isMMGSY = currentBHead.includes('5054 mmgsy normal') || currentBHead.includes('5054 mmgsy scsp') || currentBHead.includes('mmgsy');

        const tpi = isMMGSY ? (netPay > 10000000 ? 100000 : 50000) : 0;
        const billNoStr = String(runningBillNo || '').trim().toLowerCase();
        const isFirstBill = Number(runningBillNo) === 1 || billNoStr === '1' || billNoStr.includes('1st') || billNoStr.includes('first');
        const esmp = (isMMGSY && isFirstBill) ? 20000 : 0;
        return {
            incomeTax,
            gst,
            labourCess,
            securityDeposit,
            freeMaintenanceDeposit,
            tpi,
            esmp
        };
    };

    const recalculateAuditMemoInternal = (nextData: any, updatedFields?: Partial<typeof formData>, prevSD?: number) => {
        const gross = parseFloat(nextData.grossAmount) || 0;
        const prevPaid = parseFloat(nextData.auditMemoPreviouslyPaid) || 0;
        const dismantle = parseFloat(nextData.dismantleCredit) || 0;
        const excessExtra = parseFloat(nextData.excessExtraAmount) || 0;
        const priceAdj = parseFloat(nextData.priceAdjustment) || 0;
        const priceAdjType = nextData.priceAdjustmentType || 'Payable';
        const priceAdjSign = priceAdjType === 'Deductible' ? -1 : 1;
        const adminAppr = parseFloat(nextData.adminApprovalAmount) || 0;
        const withheld = parseFloat(nextData.withheldDeposit) || 0;

        const netPay = parseFloat((gross - prevPaid - dismantle - excessExtra + (priceAdjSign * priceAdj) - adminAppr - withheld).toFixed(2));
        const oldNetPay = parseFloat(nextData.netPayableAmount) || 0;

        const autoDeductions = getDeductionsForNetPayable(netPay, Number(nextData.runningBillNumber), undefined, undefined, undefined, undefined, prevSD);

        const manualDeductionFields = new Set(updatedFields ? Object.keys(updatedFields) : []);

        // ── When editing a saved bill, never auto-recalculate deductions ────────
        // Always use whatever is stored (or what the user just typed). Only recompute totals.
        if (isEditing) {
            const storedIT    = parseFloat(nextData.incomeTax)              || 0;
            const storedGST   = parseFloat(nextData.gst)                    || 0;
            const storedCess  = parseFloat(nextData.labourCess)             || 0;
            const storedSD    = parseFloat(nextData.securityDeposit)        || 0;
            const storedFMD   = parseFloat(nextData.freeMaintenanceDeposit) || 0;
            const storedTPI   = parseFloat(nextData.tpi)                    || 0;
            const storedESMP  = parseFloat(nextData.esmp)                   || 0;
            const storedTLD   = parseFloat(nextData.timeLimitDeposit)       || 0;
            const storedAsph  = parseFloat(nextData.asphaltDeposit)         || 0;
            const storedCore  = parseFloat(nextData.coreSampleDeposit)      || 0;
            const storedTest  = parseFloat(nextData.testingCharges)         || 0;
            const storedOther = parseFloat(nextData.otherDeposit)           || 0;

            const editTotalDed = parseFloat((storedIT + storedGST + storedCess + storedSD + storedFMD + storedAsph + storedCore + storedTPI + storedESMP + storedTLD + storedTest + storedOther).toFixed(2));
            const editNetPaid  = parseFloat((netPay - editTotalDed).toFixed(2));

            return {
                ...nextData,
                netPayableAmount: netPay,
                totalDeduction:   editTotalDed,
                netPaidAmount:    editNetPaid,
            };
        }

        // ── New bill: auto-calculate deductions ──────────────────────────────
        let it, gstDeduction, cessVal, sd, fmd, tpiVal, esmpVal;
        const deductionChanged = oldNetPay !== netPay;
        it = manualDeductionFields.has('incomeTax') ? (parseFloat(nextData.incomeTax) || 0)
            : (deductionChanged ? autoDeductions.incomeTax : (nextData.incomeTax !== undefined ? (parseFloat(nextData.incomeTax) || 0) : autoDeductions.incomeTax));
        gstDeduction = manualDeductionFields.has('gst') ? (parseFloat(nextData.gst) || 0)
            : (deductionChanged ? autoDeductions.gst : (nextData.gst !== undefined ? (parseFloat(nextData.gst) || 0) : autoDeductions.gst));
        cessVal = manualDeductionFields.has('labourCess') ? (parseFloat(nextData.labourCess) || 0)
            : (deductionChanged ? autoDeductions.labourCess : (nextData.labourCess !== undefined ? (parseFloat(nextData.labourCess) || 0) : autoDeductions.labourCess));
        sd = manualDeductionFields.has('securityDeposit') ? (parseFloat(nextData.securityDeposit) || 0)
            : (deductionChanged ? autoDeductions.securityDeposit : (nextData.securityDeposit !== undefined ? (parseFloat(nextData.securityDeposit) || 0) : autoDeductions.securityDeposit));
        fmd = manualDeductionFields.has('freeMaintenanceDeposit') ? (parseFloat(nextData.freeMaintenanceDeposit) || 0)
            : (deductionChanged ? autoDeductions.freeMaintenanceDeposit : (nextData.freeMaintenanceDeposit !== undefined ? (parseFloat(nextData.freeMaintenanceDeposit) || 0) : autoDeductions.freeMaintenanceDeposit));
        tpiVal = manualDeductionFields.has('tpi') ? (parseFloat(nextData.tpi) || 0)
            : (deductionChanged ? autoDeductions.tpi : (nextData.tpi !== undefined ? (parseFloat(nextData.tpi) || 0) : autoDeductions.tpi));
        esmpVal = manualDeductionFields.has('esmp') ? (parseFloat(nextData.esmp) || 0)
            : (deductionChanged ? autoDeductions.esmp : (nextData.esmp !== undefined ? (parseFloat(nextData.esmp) || 0) : autoDeductions.esmp));

        // Calculate Time Limit Deposit automatically
        let calculatedTLD = 0;
        const selectedWorkOrder = workOrders.find((wo: any) => wo._id === nextData.workOrderId);
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
                    const sayAmt = parseFloat(nextData.grossAmount) || 0;
                    calculatedTLD = Math.ceil((0.001 * sayAmt * daysDelay) / 100) * 100;
                }
            } else if (nextData.billType === 'Final') {
                const completionDate = nextData.actualCompletionDate ? parseDateStr(nextData.actualCompletionDate) : null;
                if (completionDate) {
                    const daysDelay = Math.max(0, Math.min(100, getDaysDiff(completionDate, compTargetDate)));
                    const contractPriceVal = contractPrice 
                        ? contractPrice 
                        : (selectedWorkOrder?.loaId?.tenderId?.contractPrice || selectedWorkOrder?.loaId?.tenderId?.estimatedAmount || 0);
                    calculatedTLD = Math.ceil((0.001 * contractPriceVal * daysDelay) / 100) * 100;
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
        const tldNum = parseFloat(tldRaw) || 0;

        const asphalt = parseFloat(nextData.asphaltDeposit) || 0;
        const core = parseFloat(nextData.coreSampleDeposit) || 0;
        const testing = parseFloat(nextData.testingCharges) || 0;
        const otherDep = parseFloat(nextData.otherDeposit) || 0;

        const totalDed = parseFloat((it + gstDeduction + cessVal + sd + fmd + asphalt + core + tpiVal + esmpVal + tldNum + testing + otherDep).toFixed(2));
        const netPaid = parseFloat((netPay - totalDed).toFixed(2));

        return {
            ...nextData,
            // Preserve raw string for manually-typed fields so decimal input (e.g. "12.") isn't coerced to a number mid-typing.
            incomeTax:             manualDeductionFields.has('incomeTax')             ? nextData.incomeTax             : it,
            gst:                   manualDeductionFields.has('gst')                   ? nextData.gst                   : gstDeduction,
            labourCess:            manualDeductionFields.has('labourCess')            ? nextData.labourCess            : cessVal,
            securityDeposit:       manualDeductionFields.has('securityDeposit')       ? nextData.securityDeposit       : sd,
            freeMaintenanceDeposit:manualDeductionFields.has('freeMaintenanceDeposit')? nextData.freeMaintenanceDeposit: fmd,
            tpi:                   manualDeductionFields.has('tpi')                   ? nextData.tpi                   : tpiVal,
            esmp:                  manualDeductionFields.has('esmp')                  ? nextData.esmp                  : esmpVal,
            asphaltDeposit:        manualDeductionFields.has('asphaltDeposit')        ? nextData.asphaltDeposit        : nextData.asphaltDeposit,
            coreSampleDeposit:     manualDeductionFields.has('coreSampleDeposit')     ? nextData.coreSampleDeposit     : nextData.coreSampleDeposit,
            testingCharges:        manualDeductionFields.has('testingCharges')        ? nextData.testingCharges        : nextData.testingCharges,
            otherDeposit:          manualDeductionFields.has('otherDeposit')          ? nextData.otherDeposit          : nextData.otherDeposit,
            timeLimitDeposit: tldRaw,
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
            setFormData((prev: any) => {
                const nextData = { ...prev, [name]: value };
                return recalculateAuditMemoInternal(nextData);
            });
        } else if (name === 'lastRecordEntryDate' || name === 'actualCompletionDate' || name === 'billDate' || name === 'billType') {
            setFormData((prev: any) => {
                const nextData = { ...prev, [name]: value };
                return recalculateAuditMemoInternal(nextData, { [name]: value });
            });
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }

        if (name === 'labourCessApplicable') {
            calculateTotals(formData.items, tenderPercentage, tenderDirection, value as boolean);
        }
    };

    useEffect(() => {
        if (initialWorks && initialWorks.length > 0) {
            setFormData((prev: any) => {
                if (!prev.works || prev.works.length === 0) {
                    const formatted = initialWorks.map((w: any, i: number) => ({
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
        const selectedWorkOrderObj = workOrders.find((wo: any) => wo._id === id);
        const pkgWorks = selectedWorkOrderObj?.loaId?.tenderId?.packageId?.works || [];
        const mappedWorks = pkgWorks.map((pw: any, i: number) => ({
            srNo: String(i + 1),
            nameOfWork: pw.workName || pw.nameOfWork || '',
            amount: 0
        }));

        setFormData((prev: any) => ({ 
            ...prev, 
            workOrderId: id, 
            works: (prev.works && prev.works.length > 0)
                ? prev.works
                : (mappedWorks.length > 0 ? mappedWorks : prev.works),
            measurementChecking: []
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
                    setFormData((prev: any) => ({ 
                        ...prev, 
                        items: data.data,
                        works: (prev.works && prev.works.length > 0)
                            ? prev.works
                            : (data.works && data.works.length > 0 ? data.works : prev.works),
                        measurementChecking: [],
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
            setFormData((prev: any) => ({ ...prev, items: [], measurementChecking: [] }));
            setTableRawInputs({});
            calculateTotals([]);
        }
    };

    const syncMCWithItems = (mc: any[], items: any[]) => {
        if (!mc || mc.length === 0) return mc;
        return mc.map((row: any) => {
            const selectedItem = items.find((it: any) => it.itemNo === row.itemNo);
            if (selectedItem) {
                const rate = selectedItem.partRate > 0 ? selectedItem.partRate : selectedItem.fullRate;
                const qty = parseFloat(row.quantity) || 0;
                return {
                    ...row,
                    rate: rate,
                    amount: parseFloat((qty * rate).toFixed(2))
                };
            }
            return row;
        });
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
        
        setFormData((prev: any) => {
            const nextMC = syncMCWithItems(prev.measurementChecking || [], newItems);
            return { ...prev, items: newItems, measurementChecking: nextMC };
        });
        calculateTotals(newItems);
    };

    const getNextExtraItemNo = (items: IBillItem[]) => {
        const extraItems = items.filter((i: any) => i.itemType === 'Extra');
        const nums = extraItems
            .map((i: any) => {
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
            itemType: 'Extra'
        };
        const nextItems = [...formData.items, newItem];
        setFormData((prev: any) => ({ ...prev, items: nextItems }));
        calculateTotals(nextItems);
    };

    const handleRemoveExtraItem = (index: number) => {
        const nextItems = formData.items.filter((_: any, i: number) => i !== index);
        setFormData((prev: any) => ({ ...prev, items: nextItems }));
        calculateTotals(nextItems);
    };

    const handleExtraItemFieldChange = (index: number, field: keyof IBillItem, value: any) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index] };
        
        if (field === 'fullRate') {
            const numVal = value === '' ? 0 : parseFloat(value);
            item.fullRate = numVal;
            item.partRate = numVal;
        } else if (field === 'description' || field === 'unit') {
            item[field] = value as any;
        }
        
        item.uptoDateAmount = parseFloat((item.quantity * item.partRate).toFixed(2));
        item.toBePaidAmount = parseFloat((item.uptoDateAmount - item.previousPaidAmount).toFixed(2));
        
        newItems[index] = item;
        setFormData((prev: any) => {
            const nextMC = syncMCWithItems(prev.measurementChecking || [], newItems);
            return { ...prev, items: newItems, measurementChecking: nextMC };
        });
        calculateTotals(newItems);
    };

    const addWork = () => {
        setFormData((prev: any) => ({
            ...prev,
            works: [...prev.works, { srNo: String(prev.works.length + 1), nameOfWork: '', amount: 0 }]
        }));
    };

    const removeWork = (index: number) => {
        setFormData((prev: any) => {
            const newWorks = prev.works.filter((_: any, i: number) => i !== index);
            return { ...prev, works: newWorks };
        });
    };

    const handleWorkChange = (index: number, field: string, value: string) => {
        setFormData((prev: any) => {
            const newWorks = [...prev.works];
            if (field === 'amount') {
                newWorks[index][field] = value === '' ? 0 : parseFloat(value);
            } else {
                newWorks[index][field] = value;
            }
            return { ...prev, works: newWorks };
        });
    };

    const addMeasurementCheckingRow = () => {
        const today = getTodayDateFormatted();
        setFormData((prev: any) => ({
            ...prev,
            measurementChecking: [
                ...(prev.measurementChecking || []),
                { date: today, itemNo: '', mbPageNo: '', quantity: 0, rate: 0, amount: 0 }
            ]
        }));
    };

    const removeMeasurementCheckingRow = (index: number) => {
        setFormData((prev: any) => {
            const nextMC = (prev.measurementChecking || []).filter((_: any, i: number) => i !== index);
            return { ...prev, measurementChecking: nextMC };
        });
    };

    const handleMeasurementCheckingChange = (index: number, field: string, value: any) => {
        setFormData((prev: any) => {
            const nextMC = [...(prev.measurementChecking || [])];
            const row = { ...nextMC[index] };
            
            if (field === 'itemNo') {
                row.itemNo = value;
                const selectedItem = prev.items.find((it: any) => it.itemNo === value);
                if (selectedItem) {
                    row.rate = selectedItem.partRate > 0 ? selectedItem.partRate : selectedItem.fullRate;
                } else {
                    row.rate = 0;
                }
                const qty = parseFloat(row.quantity) || 0;
                row.amount = parseFloat((qty * row.rate).toFixed(2));
            } else if (field === 'quantity') {
                row.quantity = value === '' ? 0 : parseFloat(value);
                const rate = parseFloat(row.rate) || 0;
                row.amount = parseFloat((row.quantity * rate).toFixed(2));
            } else if (field === 'rate') {
                row.rate = value === '' ? 0 : parseFloat(value);
                const qty = parseFloat(row.quantity) || 0;
                row.amount = parseFloat((qty * row.rate).toFixed(2));
            } else {
                row[field] = value;
            }

            nextMC[index] = row;
            return { ...prev, measurementChecking: nextMC };
        });
    };

    const calculateTotals = (items: IBillItem[], pct?: number, dir?: string, cess?: boolean) => {
        const actualPct = pct !== undefined ? pct : tenderPercentage;
        const actualDir = dir !== undefined ? dir : tenderDirection;
        const isCess = cess !== undefined ? cess : formData.labourCessApplicable;

        const totalUptoDate = items.reduce((sum, item) => sum + (item.uptoDateAmount || 0), 0);
        const adjAmount = totalUptoDate * (actualPct / 100);
        const netAmount = actualDir === 'Below' ? totalUptoDate - adjAmount : totalUptoDate + adjAmount;
        
        const gstBase = isCess ? netAmount * 0.99 : netAmount;
        const gst18 = gstBase * 0.18;
        
        const netPayable = netAmount + gst18;
        const grossVal = Math.floor(netPayable);

        setFormData((prev: any) => {
            const nextData = { ...prev, grossAmount: grossVal };
            return recalculateAuditMemoInternal(nextData);
        });
    };

    const recalculateAuditMemo = (updatedFields: Partial<typeof formData>) => {
        setFormData((prev: any) => {
            const nextData = { ...prev, ...updatedFields };
            return recalculateAuditMemoInternal(nextData, updatedFields);
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

            submissionData.billDate = parseDateOutput(formData.billDate) as any;
            submissionData.passingDate = parseDateOutput(formData.passingDate) as any;
            submissionData.praisaBillDate = parseDateOutput(formData.praisaBillDate) as any;
            submissionData.praisaBillNo = formData.praisaBillNo || undefined;
            submissionData.voucherDate = parseDateOutput(formData.voucherDate) as any;
            submissionData.voucherNo = formData.voucherNo || undefined;
            if (formData.measurementChecking && formData.measurementChecking.length > 0) {
                submissionData.measurementChecking = formData.measurementChecking.map((mc: any) => ({
                    ...mc,
                    date: parseDateOutput(mc.date) as any,
                    quantity: Number(mc.quantity || 0),
                    rate: Number(mc.rate || 0),
                    amount: Number(mc.amount || 0)
                }));
            } else {
                submissionData.measurementChecking = [];
            }
            if (formData.billType === 'Final') {
                submissionData.actualCompletionDate = parseDateOutput(formData.actualCompletionDate || '') as any;
                submissionData.lastRecordEntryDate = undefined;
            } else {
                submissionData.lastRecordEntryDate = parseDateOutput(formData.lastRecordEntryDate || '') as any;
                submissionData.actualCompletionDate = undefined;
            }
            submissionData.grossAmount = Number(formData.grossAmount) as any;
            submissionData.netPaidAmount = Number(formData.netPaidAmount || 0) as any;
            submissionData.runningBillNumber = Number(formData.runningBillNumber) as any;
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
            } else {
                router.push('/bills');
                router.refresh();
            }
        } catch (error) {
            console.error(error);
            alert((error as any).message || 'Error saving Bill');
        } finally {
            setLoading(false);
        }
    };

    const workOrderOptions = workOrders.map((wo: any) => ({
        _id: wo._id,
        packageName: wo.loaId?.tenderId?.packageName || 'Unknown Package',
        contractorName: wo.loaId?.tenderId?.contractorName || 'N/A'
    }));

    const selectedWorkOrderObj = workOrders.find((wo: any) => wo._id === formData.workOrderId);
    const packageWorks = selectedWorkOrderObj?.loaId?.tenderId?.packageId?.works || [];

    return (
        <>
            {(loading || fetchingAbstract) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 border border-slate-100">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-sm font-semibold text-slate-700">
                            {fetchingAbstract ? 'Fetching BOQ Abstract...' : 'Processing & Saving Bill...'}
                        </p>
                    </div>
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white shadow rounded-lg">
            
            {/* General Information Section */}
            <div className="p-8 pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Bill Details</h3>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {!initialWorkOrderId && (
                        <div className="sm:col-span-6">
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

                    <div className="sm:col-span-2">
                        <label htmlFor="billType" className="block text-sm font-medium text-gray-700">Bill Type</label>
                        <select
                            name="billType"
                            id="billType"
                            value={formData.billType}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                            required
                        >
                            <option value="Running">Running Bill</option>
                            <option value="Final">Final Bill</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="runningBillNumber" className="block text-sm font-medium text-gray-700">Bill Number</label>
                        <select
                            name="runningBillNumber"
                            id="runningBillNumber"
                            value={formData.runningBillNumber}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
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
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="billDate" className="block text-sm font-medium text-gray-700">Bill Date</label>
                        <input 
                            type="text" placeholder="DD/MM/YYYY" name="billDate" id="billDate" 
                            value={formData.billDate} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" required
                        />
                    </div>

                    {formData.billType === 'Final' ? (
                        <div className="sm:col-span-2">
                            <label htmlFor="actualCompletionDate" className="block text-sm font-medium text-gray-700">Date of Completion (Actual)</label>
                            <input 
                                type="text" placeholder="DD/MM/YYYY" name="actualCompletionDate" id="actualCompletionDate" 
                                value={formData.actualCompletionDate || ''} onChange={handleChange} 
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                            />
                        </div>
                    ) : (
                        <div className="sm:col-span-2">
                            <label htmlFor="lastRecordEntryDate" className="block text-sm font-medium text-gray-700">Last Record Entry / Measurement Date</label>
                            <input 
                                type="text" placeholder="DD/MM/YYYY" name="lastRecordEntryDate" id="lastRecordEntryDate" 
                                value={formData.lastRecordEntryDate || ''} onChange={handleChange} 
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                            />
                        </div>
                    )}

                    <div className="sm:col-span-2">
                        <label htmlFor="mbNumber" className="block text-sm font-medium text-gray-700">Measurement Book (M.B.) Number</label>
                        <input 
                            type="text" placeholder="e.g. 2295" name="mbNumber" id="mbNumber" 
                            value={(formData as any).mbNumber || ''} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="praisaBillNo" className="block text-sm font-medium text-gray-700">PRAISA Bill No.</label>
                        <input 
                            type="text" placeholder="e.g. PR-123" name="praisaBillNo" id="praisaBillNo" 
                            value={formData.praisaBillNo} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="praisaBillDate" className="block text-sm font-medium text-gray-700">PRAISA Bill Date</label>
                        <input 
                            type="text" placeholder="DD/MM/YYYY" name="praisaBillDate" id="praisaBillDate" 
                            value={formData.praisaBillDate} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="voucherNo" className="block text-sm font-medium text-gray-700">Voucher No.</label>
                        <input 
                            type="text" placeholder="e.g. V-123" name="voucherNo" id="voucherNo" 
                            value={formData.voucherNo || ''} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="voucherDate" className="block text-sm font-medium text-gray-700">Voucher Date</label>
                        <input 
                            type="text" placeholder="DD/MM/YYYY" name="voucherDate" id="voucherDate" 
                            value={formData.voucherDate || ''} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-500 font-semibold">Delay</label>
                        <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded-md sm:text-sm font-mono font-bold text-slate-700">
                            {(() => {
                                const selectedWorkOrder = workOrders.find((wo: any) => wo._id === formData.workOrderId);
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Abstract Section */}
            <div className="p-8 pt-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Bill Abstract (Line Items)</h3>
                        {formData.workOrderId && (
                            <button
                                type="button"
                                onClick={handleAddExtraItem}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Extra Item
                            </button>
                        )}
                    </div>
                    {fetchingAbstract && (
                        <span className="inline-flex items-center text-sm text-blue-600">
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Fetching BOQ...
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Item No.</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider w-1/4">Description</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Unit</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider bg-slate-100">Qty (BOQ)</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Full Rate (₹)</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-blue-700 bg-blue-50 tracking-wider border-l border-blue-100 min-w-[140px]">Upto Date Qty</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-blue-700 bg-blue-50 tracking-wider border-r border-blue-100 min-w-[140px]">Part Rate (₹)</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider bg-slate-100">Upto Date Amt</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-amber-700 bg-amber-50 tracking-wider">Prev Paid Amt</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-emerald-700 bg-emerald-50 tracking-wider">To Be Paid</th>
                                <th scope="col" className="px-3 py-3 text-center text-xs font-semibold text-slate-700 tracking-wider w-12">Actions</th>
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
                            ) : (
                                formData.items.map((item: IBillItem, index: number) => (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-3 text-sm text-slate-700 font-medium whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span>{item.itemNo}</span>
                                                {item.itemType === 'Extra' && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 w-fit leading-none">
                                                        Extra
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-600 min-w-[200px]">
                                            {item.itemType === 'Extra' ? (
                                                <textarea
                                                    rows={1}
                                                    value={item.description || ''}
                                                    onChange={(e) => handleExtraItemFieldChange(index, 'description', e.target.value)}
                                                    className="block w-full text-xs border-gray-300 rounded-md p-1 border focus:ring-blue-500 focus:border-blue-500 min-h-[34px]"
                                                    placeholder="Extra item description..."
                                                    required
                                                />
                                            ) : (
                                                <div className="line-clamp-2" title={item.description}>
                                                    {item.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-500">
                                            {item.itemType === 'Extra' ? (
                                                <input
                                                    type="text"
                                                    value={item.unit || ''}
                                                    onChange={(e) => handleExtraItemFieldChange(index, 'unit', e.target.value)}
                                                    className="block w-20 text-xs border-gray-300 rounded-md p-1 border focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Unit"
                                                    required
                                                />
                                            ) : (
                                                <span className="whitespace-nowrap">{item.unit}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-700 font-mono font-medium bg-slate-50/50">
                                            {item.boqQuantity != null ? Number(item.boqQuantity).toFixed(3) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-700 font-mono">
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
                                                    className="block w-24 text-xs border-gray-300 rounded-md p-1 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                                    placeholder="Rate (₹)"
                                                    required
                                                />
                                            ) : (
                                                <span>{item.fullRate.toFixed(2)}</span>
                                            )}
                                        </td>
                                        
                                        {/* Editable Fields */}
                                        <td className="px-3 py-2 border-l border-blue-100 bg-blue-50/30">
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
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                            />
                                        </td>
                                        <td className="px-3 py-2 border-r border-blue-100 bg-blue-50/30">
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
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                            />
                                        </td>
                                        
                                        {/* Calculated Fields */}
                                        <td className="px-3 py-3 text-sm text-slate-800 font-mono bg-slate-50">{item.uptoDateAmount.toFixed(2)}</td>
                                        
                                        <td className="px-3 py-2 bg-amber-50/30">
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
                                                className="block w-full sm:text-sm border-amber-200 rounded-md p-1.5 border focus:ring-amber-500 focus:border-amber-500 font-mono"
                                            />
                                        </td>
                                        
                                        <td className="px-3 py-3 text-sm font-bold text-emerald-700 font-mono bg-emerald-50/50">
                                            {item.toBePaidAmount.toFixed(2)}
                                        </td>
                                        
                                        {/* Actions Column */}
                                        <td className="px-3 py-2 text-center">
                                            {item.itemType === 'Extra' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveExtraItem(index)}
                                                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                                                    title="Remove Extra Item"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {formData.items.length > 0 && (() => {
                            const totalUptoDate = formData.items.reduce((s: number, i: any) => s + (i.uptoDateAmount || 0), 0);
                            const totalPrevPaid = formData.items.reduce((s: number, i: any) => s + (i.previousPaidAmount || 0), 0);
                            const totalToBePaid = formData.items.reduce((s: number, i: any) => s + (i.toBePaidAmount || 0), 0);

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
                                <tfoot className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                                    {/* Row 1: Total Amount */}
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={7} className="px-3 py-2.5 text-right text-sm text-slate-700">Total Amount:</td>
                                        <td className="px-3 py-2.5 text-sm text-slate-800 font-mono">
                                            {totalUptoDate.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-amber-700 font-mono">
                                            {totalPrevPaid.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-emerald-700 font-mono text-lg border-x border-emerald-200 bg-emerald-100/50 font-bold">
                                            ₹{totalToBePaid.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    {/* Row 2: % Above/Below */}
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <td colSpan={7} className="px-3 py-2 text-right text-sm text-slate-600">{tenderPercentage}% {tenderDirection}:</td>
                                        <td className="px-3 py-2 text-sm text-slate-600 font-mono">
                                            {tenderDirection === 'Below' ? '-' : ''}{uptoDateAdj.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-amber-600 font-mono">
                                            {tenderDirection === 'Below' ? '-' : ''}{prevPaidAdj.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-emerald-600 font-mono border-x border-slate-200 font-bold">
                                            {tenderDirection === 'Below' ? '-₹' : '₹'}{toBePaidAdj.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    {/* Row 3: Net Amount */}
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={7} className="px-3 py-2.5 text-right text-sm text-slate-700 font-semibold">Net Amount:</td>
                                        <td className="px-3 py-2.5 text-sm text-slate-800 font-mono">
                                            {uptoDateNet.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-amber-700 font-mono">
                                            {prevPaidNet.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-emerald-700 font-mono border-x border-slate-200 font-bold">
                                            ₹{toBePaidNet.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    {/* Row 4: Add 18% GST */}
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <td colSpan={7} className="px-3 py-2 text-right text-sm text-slate-600">
                                            <div className="flex items-center justify-end space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id="labourCessApplicable"
                                                    name="labourCessApplicable"
                                                    checked={formData.labourCessApplicable}
                                                    onChange={handleChange}
                                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer"
                                                />
                                                <label htmlFor="labourCessApplicable" className="cursor-pointer text-slate-600 hover:text-slate-800">
                                                    Labour Cess Applicable
                                                </label>
                                                <span className="mx-2 text-slate-300">|</span>
                                                <span>Add 18% GST:</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-600 font-mono">
                                            {uptoDateGst.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-amber-600 font-mono">
                                            {prevPaidGst.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-emerald-600 font-mono border-x border-slate-200 font-bold">
                                            ₹{toBePaidGst.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    {/* Row 5: Net Payable Amount */}
                                    <tr className="bg-emerald-50 font-bold border-b border-slate-200">
                                        <td colSpan={7} className="px-3 py-3 text-right text-sm text-emerald-800 text-base">Net Payable Amount:</td>
                                        <td className="px-3 py-3 text-sm text-emerald-800 font-mono text-base">
                                            {uptoDatePayable.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 text-sm text-amber-800 font-mono text-base">
                                            {prevPaidPayable.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 text-sm text-emerald-900 font-mono text-lg border-x border-emerald-200 bg-emerald-100/50 font-extrabold">
                                            ₹{toBePaidPayable.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    {/* Row 6: Say Amount */}
                                    <tr className="bg-emerald-100 font-bold border-b-4 border-emerald-300">
                                        <td colSpan={7} className="px-3 py-3 text-right text-sm text-emerald-900 tracking-wider">Say Amount:</td>
                                        <td className="px-3 py-3 text-sm text-emerald-900 font-mono">
                                            {Math.floor(uptoDatePayable).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 text-sm text-amber-900 font-mono">
                                            {Math.floor(prevPaidPayable).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 text-sm text-emerald-955 font-mono text-lg border-x border-emerald-300 bg-emerald-200/50 font-extrabold">
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

            {/* Work-wise Expenditure Table */}
            <div className="p-8 pt-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Work-wise Expenditure</h3>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 w-24">SR. No.</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700">Name of Work</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 w-48">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {formData.works.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No works found for this package.
                                    </td>
                                </tr>
                            ) : (
                                formData.works.map((work: any, index: number) => (
                                    <tr key={index}>
                                        <td className="px-3 py-2">
                                            <input type="text" value={work.srNo} readOnly className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border bg-gray-50" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input type="text" value={work.nameOfWork} readOnly className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border bg-gray-50" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input type="number" min="0" step="0.01" value={work.amount || ''} onChange={(e) => handleWorkChange(index, 'amount', e.target.value)} className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-indigo-500 focus:border-indigo-500" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {formData.works.length > 0 && (() => {
                            const totalAmount = formData.works.reduce((s: number, w: any) => s + (w.amount || 0), 0);
                            const pctMultiplier = tenderPercentage / 100;
                            const adjAmount = totalAmount * pctMultiplier;
                            const netAmount = tenderDirection === 'Below' ? totalAmount - adjAmount : totalAmount + adjAmount;
                            
                            const gstBase = formData.labourCessApplicable ? netAmount * 0.99 : netAmount;
                            const gstAmount = gstBase * 0.18;
                            const payableAmount = netAmount + gstAmount;

                            return (
                                <tfoot className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={2} className="px-3 py-2.5 text-right text-sm text-slate-700">Total Amount:</td>
                                        <td className="px-3 py-2.5 text-sm text-slate-800 font-mono font-bold">₹{totalAmount.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <td colSpan={2} className="px-3 py-2 text-right text-sm text-slate-600">{tenderPercentage}% {tenderDirection}:</td>
                                        <td className="px-3 py-2 text-sm text-slate-600 font-mono font-bold">
                                            {tenderDirection === 'Below' ? '-₹' : '₹'}{adjAmount.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={2} className="px-3 py-2.5 text-right text-sm text-slate-700 font-semibold">Net Amount:</td>
                                        <td className="px-3 py-2.5 text-sm text-emerald-700 font-mono font-bold">₹{netAmount.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <td colSpan={2} className="px-3 py-2 text-right text-sm text-slate-600">
                                            <div className="flex items-center justify-end space-x-2">
                                                <input
                                                    type="checkbox"
                                                    name="labourCessApplicable"
                                                    checked={formData.labourCessApplicable}
                                                    onChange={handleChange}
                                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer"
                                                />
                                                <label className="cursor-pointer text-slate-600 hover:text-slate-800">
                                                    Labour Cess Applicable
                                                </label>
                                                <span className="mx-2 text-slate-300">|</span>
                                                <span>Add 18% GST:</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-600 font-mono font-bold">₹{gstAmount.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                    <tr className="bg-emerald-50 font-bold border-b border-slate-200">
                                        <td colSpan={2} className="px-3 py-3 text-right text-sm text-emerald-800 text-base">Net Payble Amount:</td>
                                        <td className="px-3 py-3 text-sm text-emerald-900 font-mono text-lg font-extrabold">₹{payableAmount.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                    <tr className="bg-emerald-100 font-bold border-b-4 border-emerald-300">
                                        <td colSpan={2} className="px-3 py-3 text-right text-sm text-emerald-900 tracking-wider">Say Amount:</td>
                                        <td className="px-3 py-3 text-sm text-emerald-950 font-mono text-lg font-extrabold">₹{Math.floor(payableAmount).toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            );
                        })()}
                    </table>
                </div>
            </div>

            {/* Measurement Checking Section */}
            <div className="p-8 pt-4 border-t border-gray-250">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Measurement Checking</h3>
                    <button
                        type="button"
                        onClick={addMeasurementCheckingRow}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Measurement Row
                    </button>
                </div>
                
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 w-44">Date</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700">Item No.</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 w-36">MB Page No.</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 w-36">QTY.</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 w-36">Rate (₹)</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 w-36">Amount (₹)</th>
                                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 w-16">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {!formData.measurementChecking || formData.measurementChecking.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No measurement checking records added yet. Click "Add Measurement Row" above.
                                    </td>
                                </tr>
                            ) : (
                                formData.measurementChecking.map((mc: any, index: number) => (
                                    <tr key={index}>
                                        <td className="px-3 py-2">
                                            <input 
                                                type="text" 
                                                placeholder="DD/MM/YYYY"
                                                value={mc.date || ''} 
                                                onChange={(e) => handleMeasurementCheckingChange(index, 'date', e.target.value)} 
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border"
                                                required
                                            />
                                        </td>
                                        
                                        <td className="px-3 py-2">
                                            <select
                                                value={mc.itemNo || ''}
                                                onChange={(e) => handleMeasurementCheckingChange(index, 'itemNo', e.target.value)}
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border"
                                                required
                                            >
                                                <option value="">Select Item No.</option>
                                                {formData.items.map((item: any) => (
                                                    <option key={item.itemNo} value={item.itemNo}>
                                                        {item.itemNo} - {item.description.substring(0, 50)}...
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        
                                        <td className="px-3 py-2">
                                            <input 
                                                type="text" 
                                                placeholder="MB Page No."
                                                value={mc.mbPageNo || ''} 
                                                onChange={(e) => handleMeasurementCheckingChange(index, 'mbPageNo', e.target.value)} 
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border"
                                                required
                                            />
                                        </td>
                                        
                                        <td className="px-3 py-2">
                                            <input 
                                                type="number" 
                                                min="0"
                                                step="0.001"
                                                placeholder="QTY"
                                                value={mc.quantity === 0 ? '' : mc.quantity} 
                                                onChange={(e) => handleMeasurementCheckingChange(index, 'quantity', e.target.value)} 
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border text-right font-mono"
                                                required
                                            />
                                        </td>
                                        
                                        <td className="px-3 py-2">
                                            <input 
                                                type="number" 
                                                value={mc.rate || ''} 
                                                readOnly 
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border bg-gray-50 text-right font-mono font-medium text-slate-600"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        
                                        <td className="px-3 py-2">
                                            <input 
                                                type="number" 
                                                value={mc.amount || ''} 
                                                readOnly 
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border bg-gray-50 text-right font-mono font-bold text-slate-800"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeMeasurementCheckingRow(index)}
                                                className="text-red-500 hover:text-red-700 transition-colors p-1"
                                                title="Delete Row"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {formData.items.length > 0 && (() => {
                            const totalMCAmount = (formData.measurementChecking || []).reduce((s: number, mc: any) => s + (mc.amount || 0), 0);
                            const totalBillAmount = formData.items.reduce((s: number, i: any) => s + (i.uptoDateAmount || 0), 0);
                            const requiredMCAmount = totalBillAmount * 0.10;
                            const isMet = totalMCAmount >= requiredMCAmount;
                            const diff = totalMCAmount - requiredMCAmount;
                            return (
                                <tfoot className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={5} className="px-3 py-2 text-right text-xs text-slate-500 uppercase tracking-wider">Required Measurement Amount (10% of Total Amount):</td>
                                        <td className="px-3 py-2 text-xs font-mono font-bold text-right text-slate-700">₹{requiredMCAmount.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                    <tr className={`border-b border-slate-200 ${isMet ? "bg-emerald-50" : "bg-rose-50"}`}>
                                        <td colSpan={5} className={`px-3 py-2.5 text-right text-sm uppercase font-bold ${isMet ? "text-emerald-800" : "text-rose-800"}`}>Total Measurement Amount:</td>
                                        <td className={`px-3 py-2.5 text-sm font-mono font-extrabold text-right ${isMet ? "text-emerald-900" : "text-rose-900"}`}>₹{totalMCAmount.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td colSpan={5} className="px-3 py-2 text-right text-xs text-slate-500 uppercase tracking-wider">Difference (+ / -):</td>
                                        <td className={`px-3 py-2 text-xs font-mono font-bold text-right ${diff >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                            {diff >= 0 ? '+' : ''}₹{diff.toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            );
                        })()}
                    </table>
                </div>
            </div>

            {/* Excess / Saving Statement Section */}
            <div className="p-8 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Excess / Saving Statement</h3>
                </div>
                
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-slate-50 font-bold text-slate-700">
                            <tr className="border-b border-slate-200">
                                <th rowSpan={2} className="px-3 py-3 text-left border-r border-slate-200">Item No.</th>
                                <th rowSpan={2} className="px-3 py-3 text-left border-r border-slate-200 min-w-[200px]">Description</th>
                                <th rowSpan={2} className="px-3 py-3 text-center border-r border-slate-200">Unit</th>
                                
                                <th colSpan={3} className="px-3 py-2 text-center bg-blue-50/80 text-blue-900 border-r border-slate-200 border-b border-blue-200 font-bold">As per Tender</th>
                                <th colSpan={3} className="px-3 py-2 text-center bg-indigo-50/80 text-indigo-900 border-r border-slate-200 border-b border-indigo-200 font-bold">As per Bill</th>
                                <th colSpan={2} className="px-3 py-2 text-center bg-rose-50/80 text-rose-900 border-r border-slate-200 border-b border-rose-200 font-bold">Excess</th>
                                <th colSpan={2} className="px-3 py-2 text-center bg-emerald-50/80 text-emerald-900 border-b border-emerald-200 font-bold">Saving</th>
                            </tr>
                            <tr className="border-b border-slate-200">
                                <th className="px-3 py-2 text-right bg-blue-50/40 text-blue-800">Qty</th>
                                <th className="px-3 py-2 text-right bg-blue-50/40 text-blue-800">Rate (₹)</th>
                                <th className="px-3 py-2 text-right bg-blue-50/40 text-blue-800 border-r border-slate-200">Amount (₹)</th>
                                
                                <th className="px-3 py-2 text-right bg-indigo-50/40 text-indigo-800">Qty</th>
                                <th className="px-3 py-2 text-right bg-indigo-50/40 text-indigo-800">Rate (Payable) (₹)</th>
                                <th className="px-3 py-2 text-right bg-indigo-50/40 text-indigo-800 border-r border-slate-200">Amount (₹)</th>
                                
                                <th className="px-3 py-2 text-right bg-rose-50/40 text-rose-800">Qty</th>
                                <th className="px-3 py-2 text-right bg-rose-50/40 text-rose-800 border-r border-slate-200">Amount (₹)</th>
                                
                                <th className="px-3 py-2 text-right bg-emerald-50/40 text-emerald-800">Qty</th>
                                <th className="px-3 py-2 text-right bg-emerald-50/40 text-emerald-800">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {formData.items.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No line items available to calculate Excess / Saving Statement.
                                    </td>
                                </tr>
                            ) : (
                                formData.items.map((item: any, index: number) => {
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
                                        <tr key={index} className="hover:bg-slate-50 font-mono text-xs">
                                            <td className="px-3 py-2 text-left font-sans text-slate-700 font-medium border-r border-slate-200">{item.itemNo}</td>
                                            <td className="px-3 py-2 text-left font-sans text-slate-600 border-r border-slate-200 max-w-[240px] truncate" title={item.description}>{item.description}</td>
                                            <td className="px-3 py-2 text-center font-sans text-slate-500 border-r border-slate-200">{item.unit}</td>
                                            
                                            {/* Tender */}
                                            <td className="px-3 py-2 text-right text-slate-700">{tenderQty ? tenderQty.toFixed(2) : '0.00'}</td>
                                            <td className="px-3 py-2 text-right text-slate-700">{tenderRate ? tenderRate.toFixed(2) : '0.00'}</td>
                                            <td className="px-3 py-2 text-right text-blue-900 font-semibold border-r border-slate-200">{tenderAmt ? tenderAmt.toFixed(2) : '0.00'}</td>
                                            
                                            {/* Bill */}
                                            <td className="px-3 py-2 text-right text-slate-700">{billQty ? billQty.toFixed(2) : '0.00'}</td>
                                            <td className="px-3 py-2 text-right text-slate-700">{billRate ? billRate.toFixed(2) : '0.00'}</td>
                                            <td className="px-3 py-2 text-right text-indigo-900 font-semibold border-r border-slate-200">{billAmt ? billAmt.toFixed(2) : '0.00'}</td>
                                            
                                            {/* Excess */}
                                            <td className="px-3 py-2 text-right text-rose-700">{excessQty > 0 ? excessQty.toFixed(2) : '-'}</td>
                                            <td className="px-3 py-2 text-right text-rose-900 font-bold border-r border-slate-200">{excessAmt > 0 ? `₹${excessAmt.toFixed(2)}` : '-'}</td>
                                            
                                            {/* Saving */}
                                            <td className="px-3 py-2 text-right text-emerald-700">{savingQty > 0 ? savingQty.toFixed(2) : '-'}</td>
                                            <td className="px-3 py-2 text-right text-emerald-900 font-bold">{savingAmt > 0 ? `₹${savingAmt.toFixed(2)}` : '-'}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {formData.items.length > 0 && (
                            <tfoot className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300">
                                {(() => {
                                    const totalTender = formData.items.reduce((s: number, i: any) => s + ((Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0))), 0);
                                    const totalBill = formData.items.reduce((s: number, i: any) => s + (Number(i.uptoDateAmount || (Number(i.quantity || 0) * Number(i.partRate || i.fullRate || 0)))), 0);
                                    
                                    const totalExcess = formData.items.reduce((s: number, i: any) => {
                                        const tAmt = (Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0));
                                        const bAmt = Number(i.uptoDateAmount || (Number(i.quantity || 0) * Number(i.partRate || i.fullRate || 0)));
                                        const diff = bAmt - tAmt;
                                        return s + (diff > 0 ? diff : 0);
                                    }, 0);

                                    const totalSaving = formData.items.reduce((s: number, i: any) => {
                                        const tAmt = (Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0));
                                        const bAmt = Number(i.uptoDateAmount || (Number(i.quantity || 0) * Number(i.partRate || i.fullRate || 0)));
                                        const diff = bAmt - tAmt;
                                        return s + (diff < 0 ? Math.abs(diff) : 0);
                                    }, 0);

                                    const netDiff = totalExcess - totalSaving;

                                    return (
                                        <>
                                            <tr>
                                                <td colSpan={3} className="px-3 py-2.5 text-right font-sans text-slate-800 border-r border-slate-200 uppercase tracking-wider">Total:</td>
                                                <td colSpan={2} className="px-3 py-2.5"></td>
                                                <td className="px-3 py-2.5 text-right font-mono text-blue-900 border-r border-slate-200">₹{totalTender.toFixed(2)}</td>
                                                <td colSpan={2} className="px-3 py-2.5"></td>
                                                <td className="px-3 py-2.5 text-right font-mono text-indigo-900 border-r border-slate-200">₹{totalBill.toFixed(2)}</td>
                                                <td></td>
                                                <td className="px-3 py-2.5 text-right font-mono text-rose-900 border-r border-slate-200">₹{totalExcess.toFixed(2)}</td>
                                                <td></td>
                                                <td className="px-3 py-2.5 text-right font-mono text-emerald-900">₹{totalSaving.toFixed(2)}</td>
                                            </tr>
                                            <tr className="bg-slate-200 text-slate-900">
                                                <td colSpan={9} className="px-3 py-2 text-right font-sans uppercase font-bold tracking-wider border-r border-slate-300">
                                                    Net Statement Summary ({netDiff >= 0 ? 'Excess' : 'Saving'}):
                                                </td>
                                                <td colSpan={4} className={`px-3 py-2 text-right font-mono font-extrabold text-sm ${netDiff >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
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
            </div>

            {/* Audit Memo Section */}
            <div className="p-8 pt-4 border-t border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Audit Memo</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Group 1: Payables / Deductables */}
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Payables / Deductables</h4>
                        
                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="grossAmount" className="text-sm text-slate-600 font-semibold">Gross Amount:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="grossAmount"
                                id="grossAmount"
                                value={formData.grossAmount === 0 ? '' : formData.grossAmount}
                                onChange={(e) => recalculateAuditMemo({ grossAmount: e.target.value as any })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono font-bold"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="auditMemoPreviouslyPaid" className="text-sm text-slate-600">Previously Paid Amount:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="auditMemoPreviouslyPaid"
                                id="auditMemoPreviouslyPaid"
                                value={formData.auditMemoPreviouslyPaid === 0 ? '' : formData.auditMemoPreviouslyPaid}
                                onChange={(e) => recalculateAuditMemo({ auditMemoPreviouslyPaid: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="dismantleCredit" className="text-sm text-slate-600">Amount of Dismantle Credit:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="dismantleCredit"
                                id="dismantleCredit"
                                value={formData.dismantleCredit === 0 ? '' : formData.dismantleCredit}
                                onChange={(e) => recalculateAuditMemo({ dismantleCredit: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="excessExtraAmount" className="text-sm text-slate-600">Amount of Excess / Extra Items:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="excessExtraAmount"
                                id="excessExtraAmount"
                                value={formData.excessExtraAmount === 0 ? '' : formData.excessExtraAmount}
                                onChange={(e) => recalculateAuditMemo({ excessExtraAmount: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="priceAdjustment" className="text-sm text-slate-600">Amount of Price Adjustment:</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    name="priceAdjustment"
                                    id="priceAdjustment"
                                    value={formData.priceAdjustment === 0 ? '' : formData.priceAdjustment}
                                    onChange={(e) => recalculateAuditMemo({ priceAdjustment: e.target.value })}
                                    className="block w-2/3 sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                    placeholder="0.00"
                                />
                                <select
                                    name="priceAdjustmentType"
                                    id="priceAdjustmentType"
                                    value={formData.priceAdjustmentType}
                                    onChange={(e) => recalculateAuditMemo({ priceAdjustmentType: e.target.value })}
                                    className="block w-1/3 sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 bg-white font-semibold"
                                >
                                    <option value="Payable">Payable</option>
                                    <option value="Deductible">Deductible</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="adminApprovalAmount" className="text-sm text-slate-600">Amount of Administrative Approval:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="adminApprovalAmount"
                                id="adminApprovalAmount"
                                value={formData.adminApprovalAmount === 0 ? '' : formData.adminApprovalAmount}
                                onChange={(e) => recalculateAuditMemo({ adminApprovalAmount: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="withheldDeposit" className="text-sm text-slate-600">Withheld Deposit:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="withheldDeposit"
                                id="withheldDeposit"
                                value={formData.withheldDeposit === 0 ? '' : formData.withheldDeposit}
                                onChange={(e) => recalculateAuditMemo({ withheldDeposit: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center border-t border-slate-200 pt-4 bg-blue-50/50 p-2 rounded">
                            <span className="text-sm font-bold text-blue-900">Net Payable Amount:</span>
                            <span className="text-sm font-extrabold text-blue-950 font-mono">₹{Number(formData.netPayableAmount || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Group 2: Deductions */}
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Deductions</h4>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="incomeTax" className="text-sm text-slate-600">Income Tax (IT):</label>
                            <input
                                type="number"
                                step="0.01"
                                name="incomeTax"
                                id="incomeTax"
                                value={formData.incomeTax === 0 ? '' : formData.incomeTax}
                                onChange={(e) => recalculateAuditMemo({ incomeTax: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="gstDeduction" className="text-sm text-slate-600">GST:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="gst"
                                id="gstDeduction"
                                value={formData.gst === 0 ? '' : formData.gst}
                                onChange={(e) => recalculateAuditMemo({ gst: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="labourCessDeduction" className="text-sm text-slate-600">Labour Cess:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="labourCess"
                                id="labourCessDeduction"
                                value={formData.labourCess === 0 ? '' : formData.labourCess}
                                onChange={(e) => recalculateAuditMemo({ labourCess: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <div className="grid grid-cols-2 gap-4 items-center">
                                <label htmlFor="securityDepositDeduction" className="text-sm text-slate-600">Security Deposit deducted from Bill:</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="securityDeposit"
                                    id="securityDepositDeduction"
                                    value={formData.securityDeposit === 0 ? '' : formData.securityDeposit}
                                    onChange={(e) => recalculateAuditMemo({ securityDeposit: e.target.value })}
                                    className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                    placeholder="0.00"
                                />
                            </div>
                            {(contractPriceState > 0 || previousSDTotal > 0) && (
                                <div className="grid grid-cols-2 gap-4 mt-1">
                                    <div></div>
                                    <div className="text-[11px] text-slate-400 font-medium pl-1 space-y-0.5">
                                        <div>
                                            total deducted from previous bills: ₹{previousSDTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                        {contractPriceState > 0 && (
                                            <div>
                                                max can be deducted: ₹{(Math.ceil((contractPriceState * 0.05) / 100) * 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (5% of final contract price)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="freeMaintenanceDeposit" className="text-sm text-slate-600">Free Maintenance Deposit:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="freeMaintenanceDeposit"
                                id="freeMaintenanceDeposit"
                                value={formData.freeMaintenanceDeposit === 0 ? '' : formData.freeMaintenanceDeposit}
                                onChange={(e) => recalculateAuditMemo({ freeMaintenanceDeposit: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="asphaltDeposit" className="text-sm text-slate-600">Asphalt Deposit:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="asphaltDeposit"
                                id="asphaltDeposit"
                                value={formData.asphaltDeposit === 0 ? '' : formData.asphaltDeposit}
                                onChange={(e) => recalculateAuditMemo({ asphaltDeposit: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="coreSampleDeposit" className="text-sm text-slate-600">Core Sample Deposit:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="coreSampleDeposit"
                                id="coreSampleDeposit"
                                value={formData.coreSampleDeposit === 0 ? '' : formData.coreSampleDeposit}
                                onChange={(e) => recalculateAuditMemo({ coreSampleDeposit: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="tpi" className="text-sm text-slate-600">Third Party Inspection (TPI):</label>
                            <input
                                type="number"
                                step="0.01"
                                name="tpi"
                                id="tpi"
                                value={formData.tpi === 0 ? '' : formData.tpi}
                                onChange={(e) => recalculateAuditMemo({ tpi: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="esmp" className="text-sm text-slate-600">ESMP:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="esmp"
                                id="esmp"
                                value={formData.esmp === 0 ? '' : formData.esmp}
                                onChange={(e) => recalculateAuditMemo({ esmp: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="timeLimitDeposit" className="text-sm text-slate-600">Time Limit Deposit:</label>
                            <div>
                                <input
                                    type="number"
                                    step="1"
                                    name="timeLimitDeposit"
                                    id="timeLimitDeposit"
                                    value={formData.timeLimitDeposit === 0 ? '' : formData.timeLimitDeposit}
                                    onChange={(e) => recalculateAuditMemo({ timeLimitDeposit: e.target.value })}
                                    className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                    placeholder="0.00"
                                />
                                {(() => {
                                    const selectedWorkOrder = workOrders.find((wo: any) => wo._id === formData.workOrderId);
                                    const compTargetDate = stipulatedCompletionDate 
                                        ? new Date(stipulatedCompletionDate) 
                                        : (selectedWorkOrder?.stipulatedCompletionDate ? new Date(selectedWorkOrder.stipulatedCompletionDate) : null);
                                    if (!compTargetDate) return null;

                                    const getDaysDiff = (date1: Date, date2: Date) => {
                                        const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
                                        const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
                                        const diffTime = d1.getTime() - d2.getTime();
                                        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    };

                                    let daysDelay = 0;
                                    if (formData.billType === 'Running') {
                                        const lastRecordDate = formData.lastRecordEntryDate ? parseDateStr(formData.lastRecordEntryDate) : null;
                                        if (lastRecordDate) daysDelay = Math.max(0, getDaysDiff(lastRecordDate, compTargetDate));
                                    } else {
                                        const completionDate = formData.actualCompletionDate ? parseDateStr(formData.actualCompletionDate) : null;
                                        if (completionDate) daysDelay = Math.max(0, getDaysDiff(completionDate, compTargetDate));
                                    }

                                    return (
                                        <p className="text-[10px] text-slate-500 mt-1 font-medium leading-none">
                                            Delay: <span className={daysDelay > 0 ? "text-amber-600 font-bold" : "text-slate-500 font-bold"}>{daysDelay} days</span> (Target: {compTargetDate.toLocaleDateString('en-GB')})
                                        </p>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="testingCharges" className="text-sm text-slate-600">Testing Charges:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="testingCharges"
                                id="testingCharges"
                                value={formData.testingCharges === 0 ? '' : formData.testingCharges}
                                onChange={(e) => recalculateAuditMemo({ testingCharges: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="otherDeposit" className="text-sm text-slate-600">Other Deposit:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="otherDeposit"
                                id="otherDeposit"
                                value={formData.otherDeposit === 0 ? '' : formData.otherDeposit}
                                onChange={(e) => recalculateAuditMemo({ otherDeposit: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center border-t border-slate-200 pt-4 bg-amber-50/50 p-2 rounded">
                            <span className="text-sm font-bold text-amber-900">Total Deduction:</span>
                            <span className="text-sm font-extrabold text-amber-950 font-mono">₹{Number(formData.totalDeduction || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 bg-emerald-50 p-6 rounded-lg border border-emerald-200 flex justify-between items-center shadow-xs">
                    <span className="text-lg font-bold text-emerald-900">Final Net Payable to Contractor (Net Paid Amount):</span>
                    <span className="text-2xl font-extrabold text-emerald-950 font-mono">₹{Number(formData.netPaidAmount || 0).toFixed(2)}</span>
                </div>
            </div>

            {/* Footer / Summary Section */}
            <div className="p-8 pt-4">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">Remarks</label>
                        <textarea 
                            name="remarks" id="remarks" rows={2} value={formData.remarks} onChange={handleChange} 
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                    </div>
                </div>

                <div className="pt-8">
                    <div className="flex justify-end">
                        {onCancel ? (
                            <button type="button" onClick={onCancel} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
                        ) : (
                            <Link href="/bills" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
                        )}
                        <button type="submit" disabled={loading || fetchingAbstract} className="ml-3 inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">
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
