'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, Save, Edit2, Plus, Trash2, CheckCircle2, XCircle, X, Loader2, 
    Calendar, FileText, Settings, Award, Check, ChevronDown, ListPlus, 
    Receipt, DollarSign, Eye, AlertCircle, FileCheck, Layers, ClipboardCheck,
    Briefcase, FileSpreadsheet, Percent, Building2, User2, Clock
} from 'lucide-react';
import { parseDateStr, formatDate, formatDateForInput } from '@/lib/dateUtils';
import SearchableSelect from '@/components/SearchableSelect';
import BillForm from '@/components/BillForm';

interface ApprovedWorkDetailClientProps {
    workId: string;
    work: any;
    ts: any;
    pkg: any;
    dtp: any;
    tender: any;
    approval: any;
    loa: any;
    workOrder: any;
    bills: any[];
    maxAgreementNos?: Record<string, number>;
}

type SectionType = 'work' | 'ts' | 'package' | 'dtp' | 'tender' | 'approval' | 'loa' | 'workOrder' | 'bills';

export default function ApprovedWorkDetailClient({
    workId,
    work: initialWork,
    ts: initialTs,
    pkg: initialPkg,
    dtp: initialDtp,
    tender: initialTender,
    approval: initialApproval,
    loa: initialLoa,
    workOrder: initialWorkOrder,
    bills: initialBills,
    maxAgreementNos = {},
}: ApprovedWorkDetailClientProps) {
    const router = useRouter();
    
    // States for data
    const [work, setWork] = useState(initialWork);
    const [ts, setTs] = useState(initialTs);
    const [pkg, setPkg] = useState(initialPkg);
    const [dtp, setDtp] = useState(initialDtp);
    const [tender, setTender] = useState(initialTender);
    const [approval, setApproval] = useState(initialApproval);
    const [loa, setLoa] = useState(initialLoa);
    const [workOrder, setWorkOrder] = useState(initialWorkOrder);
    const [bills, setBills] = useState(initialBills);

    // Active edit section
    const [editingSection, setEditingSection] = useState<SectionType | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Toast notification state
    const [toast, setToast] = useState<{ visible: boolean; type: 'success' | 'error'; message: string }>({
        visible: false,
        type: 'success',
        message: '',
    });

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ visible: true, type, message });
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, 3000);
    }, []);

    // Form states
    const [workForm, setWorkForm] = useState<any>({});
    const [tsForm, setTsForm] = useState<any>({});
    const [pkgForm, setPkgForm] = useState<any>({});
    const [dtpForm, setDtpForm] = useState<any>({});
    const [tenderForm, setTenderForm] = useState<any>({});
    const [approvalForm, setApprovalForm] = useState<any>({});
    const [loaForm, setLoaForm] = useState<any>({});
    const [woForm, setWoForm] = useState<any>({});

    // Helper to determine if tender approval is not required based on tender amount or contract price
    const isTenderApprovalNotRequired = useMemo(() => {
        if (!tender) return false;
        const tenderAmt = tender.estimatedAmount !== undefined && tender.estimatedAmount !== null 
            ? Number(tender.estimatedAmount) 
            : Number(tender.contractPrice || 0);
        return tenderAmt > 0 && tenderAmt < 5000000;
    }, [tender]);
    
    // Bank list & contractor list for select dropdowns
    const [banks, setBanks] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [newBankName, setNewBankName] = useState('');
    const [bankSaving, setBankSaving] = useState(false);
    const [activeBankField, setActiveBankField] = useState<'security' | 'additional'>('security');
    
    const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
    const [newContractor, setNewContractor] = useState({
        name: '', proprietorName: '', address: '', mobileNo: '', agencyType: '', gstNo: ''
    });
    const [editingContractorId, setEditingContractorId] = useState<string | null>(null);
    const [contractorSaving, setContractorSaving] = useState(false);


    // Bill modal states
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [editingBill, setEditingBill] = useState<any | null>(null);
    const [billForm, setBillForm] = useState<any>({
        billType: 'Running',
        runningBillNumber: '1',
        billDate: '',
        grossAmount: '',
        passingDate: '',
        remarks: '',
        labourCessApplicable: false,
        auditMemoPreviouslyPaid: 0,
        dismantleCredit: 0,
        excessExtraAmount: 0,
        priceAdjustment: 0,
        priceAdjustmentType: 'Payable',
        adminApprovalAmount: 0,
        withheldDeposit: 0,
        netPayableAmount: 0,
        incomeTax: 0,
        gst: 0,
        labourCess: 0,
        securityDeposit: 0,
        freeMaintenanceDeposit: 0,
        asphaltDeposit: 0,
        coreSampleDeposit: 0,
        tpi: 0,
        esmp: 0,
        timeLimitDeposit: 0,
        testingCharges: 0,
        otherDeposit: 0,
        totalDeduction: 0,
        netPaidAmount: 0,
    });

    // Sync data if props change (e.g. after refresh)
    useEffect(() => {
        setWork(initialWork);
        setTs(initialTs);
        setPkg(initialPkg);
        setDtp(initialDtp);
        setTender(initialTender);
        setApproval(initialApproval);
        setLoa(initialLoa);
        setWorkOrder(initialWorkOrder);
        setBills(initialBills);
    }, [initialWork, initialTs, initialPkg, initialDtp, initialTender, initialApproval, initialLoa, initialWorkOrder, initialBills]);

    // Fetch dependencies
    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const [bankRes, agencyRes] = await Promise.all([
                    fetch('/api/banks'),
                    fetch('/api/agencies')
                ]);
                const bankData = await bankRes.json();
                const agencyData = await agencyRes.json();
                if (bankData.success) setBanks(bankData.data);
                if (agencyData.success) setAgencies(agencyData.data);
            } catch (err) {
                console.error("Error loading dropdown dependencies", err);
            }
        };
        fetchDependencies();
    }, []);

    // Set initial values on Edit Mode toggle
    const handleStartEdit = (section: SectionType) => {
        setEditingSection(section);
        if (section === 'work') {
            setWorkForm({
                circle: work.circle || 'Panchayat R&B Circle, Rajkot',
                district: work.district || 'Bhavnagar',
                subDivision: work.subDivision || '',
                taluka: work.taluka || '',
                constituencyName: work.constituencyName || '',
                budgetType: work.budgetType || '',
                wmsItemCode: work.wmsItemCode || '',
                approvalYear: work.approvalYear || '2025-26',
                jobNumberApprovalDate: formatDateForInput(work.jobNumberApprovalDate),
                jobNumberAmount: work.jobNumberAmount || '',
                workName: work.workName || '',
                proposedLength: work.proposedLength || '',
                contractProvision: work.contractProvision || '',
                rpmsCode: work.rpmsCode || '',
                type: work.type || '',
                budgetHead: work.budgetHead || '',
                projectType: work.projectType || '',
                mlaName: work.mlaName || '',
                roadCategory: work.roadCategory || '',
                workType: work.workType || 'Road',
                buildingType: work.buildingType || '',
                parliamentaryConstituency: work.parliamentaryConstituency || '',
                mpName: work.mpName || '',
                workNameGujarati: work.workNameGujarati || '',
                natureOfWork: work.natureOfWork || '',
                schemeName: work.schemeName || '',
                length: work.length || '',
                chainage: work.chainage || '',
                estimateConsultant: work.estimateConsultant || '',
                remarks: work.remarks || '',
            });
        } else if (section === 'ts') {
            setTsForm({
                workName: work.workName,
                tsAuthority: ts?.tsAuthority || '',
                tsNumber: ts?.tsNumber || '',
                tsDate: ts?.tsDate ? formatDateForInput(ts.tsDate) : '',
                tsAmount: ts?.tsAmount || '',
                remarks: ts?.remarks || '',
            });
        } else if (section === 'package') {
            setPkgForm({
                packageName: pkg?.packageName || work.workName + (work.workType ? " " + work.workType + " Package" : " Package"),
                subDivision: pkg?.subDivision || work.subDivision || '',
                dtpConsultant: pkg?.dtpConsultant || '',
                works: pkg?.works || [{ workId: ts?._id, workName: work.workName, amount: (ts?.tsAmount || 0) * 100000 }],
            });
        } else if (section === 'dtp') {
            setDtpForm({
                tsId: pkg?._id || '',
                dtpSendingNo: dtp?.dtpSendingNo || '',
                dtpSendingDate: dtp?.dtpSendingDate ? formatDateForInput(dtp.dtpSendingDate) : '',
                dtpApprovingAuthority: dtp?.dtpApprovingAuthority || '',
                dtpApprovalNo: dtp?.dtpApprovalNo || '',
                dtpApprovalDate: dtp?.dtpApprovalDate ? formatDateForInput(dtp.dtpApprovalDate) : '',
                tenderAmount: dtp?.tenderAmount || '',
                remarks: dtp?.remarks || '',
            });
        } else if (section === 'tender') {
            setTenderForm({
                packageId: pkg?._id || '',
                packageName: pkg?.packageName || '',
                tenderId: tender?.tenderId || '',
                tenderNoticeYear: tender?.tenderNoticeYear || '2026-27',
                noticeNo: tender?.noticeNo || '',
                srNo: tender?.srNo || '',
                trialNo: tender?.trialNo || 1,
                tenderCreationDate: tender?.tenderCreationDate ? formatDateForInput(tender.tenderCreationDate) : '',
                lastDateOfSubmission: tender?.lastDateOfSubmission ? formatDateForInput(tender.lastDateOfSubmission) : '',
                tenderValidityDate: tender?.tenderValidityDate ? formatDateForInput(tender.tenderValidityDate) : '',
                reInvite: tender?.reInvite || false,
                cancelled: tender?.cancelled || false,
                cancellationReason: tender?.cancellationReason || '',
                contractorName: tender?.contractorName || '',
                contractPrice: tender?.contractPrice || '',
                aboveBelowPercentage: tender?.aboveBelowPercentage || '',
                aboveBelowInWord: tender?.aboveBelowInWord === 'Equals' ? 'At Par' : (tender?.aboveBelowInWord || 'Below'),
                remarks: tender?.remarks || '',
            });
        } else if (section === 'approval') {
            setApprovalForm({
                tenderId: tender?._id || '',
                notRequired: isTenderApprovalNotRequired ? true : (approval?.notRequired || false),
                proposalDate: approval?.proposalDate ? formatDateForInput(approval.proposalDate) : '',
                tenderApprovalOffice: approval?.tenderApprovalOffice || '',
                tenderApprovalNo: approval?.tenderApprovalNo || '',
                tenderApprovalDate: approval?.tenderApprovalDate ? formatDateForInput(approval.tenderApprovalDate) : '',
            });
        } else if (section === 'loa') {
            setLoaForm({
                tenderId: tender?._id || '',
                stampDuty: loa?.stampDuty || '',
                defectLiabilityPeriod: loa?.defectLiabilityPeriod || '12 Months',
                workDurationMonths: loa?.workDurationMonths || tender?.workDurationMonths || '',
                acceptanceLetterWorksheetNo: loa?.acceptanceLetterWorksheetNo || '',
                acceptanceLetterDate: loa?.acceptanceLetterDate ? formatDateForInput(loa.acceptanceLetterDate) : '',
            });
        } else if (section === 'workOrder') {
            const isNotReq = workOrder?.notRequired || false;
            const hasExistingNo = !!workOrder?.agreementNo;
            const defaultYear = workOrder?.agreementYear || '2026-27';
            const defaultNo = isNotReq ? '' : (hasExistingNo
                ? workOrder.agreementNo
                : String((maxAgreementNos[defaultYear] || 0) + 1));

            setWoForm({
                loaId: loa?._id || '',
                notRequired: isNotReq,
                agreementYear: isNotReq ? '' : defaultYear,
                agreementNo: defaultNo,
                agreementDate: workOrder?.agreementDate ? formatDateForInput(workOrder.agreementDate) : '',
                securityDepositType: workOrder?.securityDepositType || 'FDR',
                securityDepositBankName: workOrder?.securityDepositBankName || '',
                securityDepositNumber: workOrder?.securityDepositNumber || '',
                securityDepositAmount: workOrder?.securityDepositAmount || '',
                securityDepositDate: workOrder?.securityDepositDate ? formatDateForInput(workOrder.securityDepositDate) : '',
                additionalSecurityDepositType: workOrder?.additionalSecurityDepositType || 'FDR',
                additionalSecurityDepositBankName: workOrder?.additionalSecurityDepositBankName || '',
                additionalSecurityDepositNumber: workOrder?.additionalSecurityDepositNumber || '',
                additionalSecurityDepositAmount: workOrder?.additionalSecurityDepositAmount || '',
                additionalSecurityDepositDate: workOrder?.additionalSecurityDepositDate ? formatDateForInput(workOrder.additionalSecurityDepositDate) : '',
                workOrderWorksheetNo: workOrder?.workOrderWorksheetNo || '',
                workOrderDate: workOrder?.workOrderDate ? formatDateForInput(workOrder.workOrderDate) : '',
                timeLimitStartsFrom: workOrder?.timeLimitStartsFrom ? formatDateForInput(workOrder.timeLimitStartsFrom) : '',
                workDurationMonths: workOrder?.workDurationMonths || loa?.workDurationMonths || '',
                stipulatedCompletionDate: workOrder?.stipulatedCompletionDate ? formatDateForInput(workOrder.stipulatedCompletionDate) : '',
            });
        }
    };

    const handleCancelEdit = () => {
        setEditingSection(null);
    };

    // Form field changes
    const handleWorkFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setWorkForm((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleTsFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setTsForm((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleDtpFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setDtpForm((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleTenderFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setTenderForm((prev: any) => ({ ...prev, [name]: val }));
    };

    const handleApprovalFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setApprovalForm((prev: any) => ({ ...prev, [name]: val }));
    };

    const handleLoaFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLoaForm((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleWoFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setWoForm((prev: any) => {
            const next = { ...prev, [name]: val };
            if (name === 'notRequired') {
                if (val) {
                    next.agreementNo = '';
                    next.agreementYear = '';
                } else if (!next.agreementNo) {
                    const defaultYear = prev.agreementYear || workOrder?.agreementYear || '2026-27';
                    next.agreementYear = defaultYear;
                    next.agreementNo = workOrder?.agreementNo || String((maxAgreementNos[defaultYear] || 0) + 1);
                }
            }
            if (name === 'workOrderDate') {
                next.timeLimitStartsFrom = value;
            }
            if (name === 'agreementYear' && !next.notRequired && (!workOrder || !workOrder.agreementNo)) {
                next.agreementNo = String((maxAgreementNos[value] || 0) + 1);
            }
            return next;
        });
    };

    // Auto-calculating Tender validity date: submission date + 120 days
    useEffect(() => {
        if (!tenderForm.lastDateOfSubmission) return;
        const parsed = parseDateStr(tenderForm.lastDateOfSubmission);
        if (parsed) {
            const validDate = new Date(parsed);
            validDate.setDate(validDate.getDate() + 120);
            setTenderForm((prev: any) => ({ ...prev, tenderValidityDate: formatDate(validDate) }));
        }
    }, [tenderForm.lastDateOfSubmission]);

    // Tender contract price auto-calculation
    useEffect(() => {
        const base = Number(dtp?.tenderAmount || 0);
        if (!base) return;

        if (tenderForm.aboveBelowInWord === 'At Par') {
            setTenderForm((prev: any) => ({ ...prev, contractPrice: base.toFixed(2), aboveBelowPercentage: 0 }));
            return;
        }

        const pct = Number(tenderForm.aboveBelowPercentage);
        if (!isNaN(pct)) {
            if (tenderForm.aboveBelowInWord === 'Above') {
                setTenderForm((prev: any) => ({ ...prev, contractPrice: (base + (base * pct / 100)).toFixed(2) }));
            } else if (tenderForm.aboveBelowInWord === 'Below') {
                setTenderForm((prev: any) => ({ ...prev, contractPrice: (base - (base * pct / 100)).toFixed(2) }));
            }
        }
    }, [tenderForm.aboveBelowPercentage, tenderForm.aboveBelowInWord, dtp]);

    // Work Order: auto calculate Time Limit Starts From (Acceptance Letter Date + 1 month)
    useEffect(() => {
        if (!loa?.acceptanceLetterDate) return;
        const accDate = new Date(loa.acceptanceLetterDate);
        const nextMonth = new Date(accDate.getFullYear(), accDate.getMonth() + 1, 1);
        const calcDateStr = formatDate(nextMonth);
        const duration = woForm.workDurationMonths || loa.workDurationMonths || '';
        
        setWoForm((prev: any) => {
            if (prev.timeLimitStartsFrom) return prev;
            return { ...prev, timeLimitStartsFrom: calcDateStr, workDurationMonths: duration };
        });
    }, [loa]);

    // Work Order: calculate Stipulated Completion Date
    useEffect(() => {
        if (!woForm.timeLimitStartsFrom || !woForm.workDurationMonths) return;
        const tlsfDate = parseDateStr(String(woForm.timeLimitStartsFrom));
        if (!tlsfDate) return;
        
        const workMonths = Number(woForm.workDurationMonths) || 0;
        const stipulatedDate = new Date(tlsfDate);
        stipulatedDate.setMonth(stipulatedDate.getMonth() + workMonths);
        stipulatedDate.setDate(stipulatedDate.getDate() - 1);

        setWoForm((prev: any) => ({
            ...prev,
            stipulatedCompletionDate: formatDate(stipulatedDate),
        }));
    }, [woForm.timeLimitStartsFrom, woForm.workDurationMonths]);

    // Saves
    const handleSaveWork = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = { ...workForm };
            if (data.jobNumberApprovalDate) {
                const parsed = parseDateStr(data.jobNumberApprovalDate);
                if (parsed) data.jobNumberApprovalDate = parsed.toISOString();
            }
            const res = await fetch(`/api/approved-works/${workId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save Approved Work details.");
            showToast('success', 'Approved Work details saved!');
            setEditingSection(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTS = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = { ...tsForm };
            if (data.tsDate) {
                const parsed = parseDateStr(data.tsDate);
                if (parsed) data.tsDate = parsed.toISOString();
            }
            const url = ts ? `/api/technical-sanctions/${ts._id}` : `/api/technical-sanctions`;
            const method = ts ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save Technical Sanction details.");
            showToast('success', 'Technical Sanction details saved!');
            setEditingSection(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = {
                packageName: pkgForm.packageName,
                subDivision: pkgForm.subDivision,
                dtpConsultant: pkgForm.dtpConsultant,
                works: [{ workId: ts._id, workName: work.workName, amount: (ts.tsAmount || 0) * 100000 }]
            };
            const url = pkg ? `/api/packages/${pkg._id}` : `/api/packages`;
            const method = pkg ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save Package details.");
            showToast('success', 'Package details saved!');
            setEditingSection(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = { ...dtpForm, tsId: pkg._id };
            if (data.dtpSendingDate) {
                const parsed = parseDateStr(data.dtpSendingDate);
                if (parsed) data.dtpSendingDate = parsed.toISOString();
            }
            if (data.dtpApprovalDate) {
                const parsed = parseDateStr(data.dtpApprovalDate);
                if (parsed) data.dtpApprovalDate = parsed.toISOString();
            }
            const url = dtp ? `/api/dtps/${dtp._id}` : `/api/dtps`;
            const method = dtp ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save DTP details.");
            showToast('success', 'DTP details saved!');
            setEditingSection(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTender = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = { ...tenderForm, packageId: pkg._id, packageName: pkg.packageName };
            if (data.tenderCreationDate) {
                const parsed = parseDateStr(data.tenderCreationDate);
                if (parsed) data.tenderCreationDate = parsed.toISOString();
            }
            if (data.lastDateOfSubmission) {
                const parsed = parseDateStr(data.lastDateOfSubmission);
                if (parsed) data.lastDateOfSubmission = parsed.toISOString();
            }
            if (data.tenderValidityDate) {
                const parsed = parseDateStr(data.tenderValidityDate);
                if (parsed) data.tenderValidityDate = parsed.toISOString();
            }
            const url = tender ? `/api/tenders/${tender._id}` : `/api/tenders`;
            const method = tender ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save Tender details.");
            showToast('success', 'Tender details saved!');
            setEditingSection(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveApproval = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = { 
                ...approvalForm, 
                tenderId: tender._id,
                notRequired: approvalForm.notRequired || isTenderApprovalNotRequired
            };
            if (data.proposalDate) {
                const parsed = parseDateStr(data.proposalDate);
                if (parsed) data.proposalDate = parsed.toISOString();
            }
            if (data.tenderApprovalDate) {
                const parsed = parseDateStr(data.tenderApprovalDate);
                if (parsed) data.tenderApprovalDate = parsed.toISOString();
            }
            const url = approval ? `/api/approvals/${approval._id}` : `/api/approvals`;
            const method = approval ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save Tender Approval details.");
            showToast('success', 'Tender Approval details saved!');
            setEditingSection(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLoa = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = { ...loaForm, tenderId: tender._id };
            if (data.acceptanceLetterDate) {
                const parsed = parseDateStr(data.acceptanceLetterDate);
                if (parsed) data.acceptanceLetterDate = parsed.toISOString();
            }
            const url = loa ? `/api/loas/${loa._id}` : `/api/loas`;
            const method = loa ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save LOA details.");
            showToast('success', 'LOA details saved!');
            setEditingSection(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveWorkOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = { ...woForm, loaId: loa._id };
            if (data.notRequired) {
                data.agreementNo = '';
                data.agreementYear = '';
                data.agreementDate = null;
            }
            if (data.agreementDate) {
                const parsed = parseDateStr(data.agreementDate);
                if (parsed) data.agreementDate = parsed.toISOString();
            }
            if (data.securityDepositDate) {
                const parsed = parseDateStr(data.securityDepositDate);
                if (parsed) data.securityDepositDate = parsed.toISOString();
            }
            if (data.additionalSecurityDepositDate) {
                const parsed = parseDateStr(data.additionalSecurityDepositDate);
                if (parsed) data.additionalSecurityDepositDate = parsed.toISOString();
            }
            if (data.workOrderDate) {
                const parsed = parseDateStr(data.workOrderDate);
                if (parsed) data.workOrderDate = parsed.toISOString();
            }
            if (data.timeLimitStartsFrom) {
                const parsed = parseDateStr(data.timeLimitStartsFrom);
                if (parsed) data.timeLimitStartsFrom = parsed.toISOString();
            }
            if (data.stipulatedCompletionDate) {
                const parsed = parseDateStr(data.stipulatedCompletionDate);
                if (parsed) data.stipulatedCompletionDate = parsed.toISOString();
            }
            const url = workOrder ? `/api/work-orders/${workOrder._id}` : `/api/work-orders`;
            const method = workOrder ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save Work Order details.");
            showToast('success', 'Work Order details saved!');
            setEditingSection(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Bank addition handler
    const handleCreateBank = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBankName.trim()) return;
        setBankSaving(true);
        try {
            const res = await fetch('/api/banks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBankName }),
            });
            const data = await res.json();
            if (data.success) {
                setBanks(prev => [...prev, data.data].sort((a,b) => a.name.localeCompare(b.name)));
                if (activeBankField === 'security') {
                    setWoForm((prev: any) => ({ ...prev, securityDepositBankName: data.data.name }));
                } else {
                    setWoForm((prev: any) => ({ ...prev, additionalSecurityDepositBankName: data.data.name }));
                }
                setNewBankName('');
                setIsBankModalOpen(false);
                showToast('success', 'Bank added successfully.');
            }
        } catch (err) {
            showToast('error', 'Error adding bank.');
        } finally {
            setBankSaving(false);
        }
    };

    const handleOpenEditContractor = () => {
        const selected = agencies.find(a => a.name === tenderForm.contractorName);
        if (!selected) return;
        setNewContractor({
            name: selected.name || '',
            proprietorName: selected.proprietorName || '',
            address: selected.address || '',
            mobileNo: selected.mobileNo || '',
            agencyType: selected.agencyType || '',
            gstNo: selected.gstNo || '',
        });
        setEditingContractorId(selected._id);
        setIsContractorModalOpen(true);
    };

    const handleCloseContractorModal = () => {
        setNewContractor({ name: '', proprietorName: '', address: '', mobileNo: '', agencyType: '', gstNo: '' });
        setEditingContractorId(null);
        setIsContractorModalOpen(false);
    };

    // Contractor addition/edit handler
    const handleCreateContractor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContractor.name.trim()) return;
        setContractorSaving(true);
        try {
            const isEditing = !!editingContractorId;
            const url = isEditing ? `/api/agencies/${editingContractorId}` : '/api/agencies';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newContractor),
            });
            const data = await res.json();
            if (data.success) {
                if (isEditing) {
                    setAgencies(prev => prev.map(a => a._id === editingContractorId ? data.data : a).sort((a,b) => a.name.localeCompare(b.name)));
                    setTenderForm((prev: any) => ({ ...prev, contractorName: data.data.name }));
                    showToast('success', 'Contractor/Agency updated successfully.');
                } else {
                    setAgencies(prev => [...prev, data.data].sort((a,b) => a.name.localeCompare(b.name)));
                    setTenderForm((prev: any) => ({ ...prev, contractorName: data.data.name }));
                    showToast('success', 'Contractor/Agency added successfully.');
                }
                setNewContractor({ name: '', proprietorName: '', address: '', mobileNo: '', agencyType: '', gstNo: '' });
                setEditingContractorId(null);
                setIsContractorModalOpen(false);
            } else {
                showToast('error', data.error || `Error ${isEditing ? 'updating' : 'adding'} contractor.`);
            }
        } catch (err) {
            showToast('error', `Error ${editingContractorId ? 'updating' : 'adding'} contractor.`);
        } finally {
            setContractorSaving(false);
        }
    };

    // BILLS SECTION LOGIC
    const handleOpenBillModal = (existingBill: any = null) => {
        setEditingBill(existingBill);
        if (existingBill) {
            setBillForm({
                billType: existingBill.billType || 'Running',
                runningBillNumber: String(existingBill.runningBillNumber || '1'),
                billDate: formatDateForInput(existingBill.billDate),
                grossAmount: String(existingBill.grossAmount || ''),
                passingDate: existingBill.passingDate ? formatDateForInput(existingBill.passingDate) : '',
                remarks: existingBill.remarks || '',
                labourCessApplicable: existingBill.labourCessApplicable || false,
                auditMemoPreviouslyPaid: existingBill.auditMemoPreviouslyPaid || 0,
                dismantleCredit: existingBill.dismantleCredit || 0,
                excessExtraAmount: existingBill.excessExtraAmount || 0,
                priceAdjustment: existingBill.priceAdjustment || 0,
                priceAdjustmentType: existingBill.priceAdjustmentType || 'Payable',
                adminApprovalAmount: existingBill.adminApprovalAmount || 0,
                withheldDeposit: existingBill.withheldDeposit || 0,
                netPayableAmount: existingBill.netPayableAmount || 0,
                incomeTax: existingBill.incomeTax || 0,
                gst: existingBill.gst || 0,
                labourCess: existingBill.labourCess || 0,
                securityDeposit: existingBill.securityDeposit || 0,
                freeMaintenanceDeposit: existingBill.freeMaintenanceDeposit || 0,
                asphaltDeposit: existingBill.asphaltDeposit || 0,
                coreSampleDeposit: existingBill.coreSampleDeposit || 0,
                tpi: existingBill.tpi || 0,
                esmp: existingBill.esmp || 0,
                timeLimitDeposit: existingBill.timeLimitDeposit || 0,
                testingCharges: existingBill.testingCharges || 0,
                otherDeposit: existingBill.otherDeposit || 0,
                totalDeduction: existingBill.totalDeduction || 0,
                netPaidAmount: existingBill.netPaidAmount || 0,
            });
        } else {
            setBillForm({
                billType: 'Running',
                runningBillNumber: String(bills.length + 1),
                billDate: '',
                grossAmount: '',
                passingDate: '',
                remarks: '',
                labourCessApplicable: false,
                auditMemoPreviouslyPaid: 0,
                dismantleCredit: 0,
                excessExtraAmount: 0,
                priceAdjustment: 0,
                priceAdjustmentType: 'Payable',
                adminApprovalAmount: 0,
                withheldDeposit: 0,
                netPayableAmount: 0,
                incomeTax: 0,
                gst: 0,
                labourCess: 0,
                securityDeposit: 0,
                freeMaintenanceDeposit: 0,
                asphaltDeposit: 0,
                coreSampleDeposit: 0,
                tpi: 0,
                esmp: 0,
                timeLimitDeposit: 0,
                testingCharges: 0,
                otherDeposit: 0,
                totalDeduction: 0,
                netPaidAmount: 0,
            });
        }
        setIsBillModalOpen(true);
    };

    // Calculate Audit Memo details
    const recalculateBillDeductions = useCallback((nextForm: any) => {
        const gross = parseFloat(nextForm.grossAmount) || 0;
        const prevPaid = parseFloat(nextForm.auditMemoPreviouslyPaid) || 0;
        const dismantle = parseFloat(nextForm.dismantleCredit) || 0;
        const excessExtra = parseFloat(nextForm.excessExtraAmount) || 0;
        const priceAdj = parseFloat(nextForm.priceAdjustment) || 0;
        const priceAdjType = nextForm.priceAdjustmentType || 'Payable';
        const priceAdjSign = priceAdjType === 'Deductible' ? -1 : 1;
        const adminAppr = parseFloat(nextForm.adminApprovalAmount) || 0;
        const withheld = parseFloat(nextForm.withheldDeposit) || 0;

        const netPay = parseFloat((gross - prevPaid - dismantle - excessExtra + (priceAdjSign * priceAdj) - adminAppr - withheld).toFixed(2));
        const netPaySafe = Math.max(netPay, 0);

        // Deductions formula based on net payable
        const it = netPaySafe > 0 ? Math.ceil((netPaySafe * 0.02) / 10) * 10 : 0;
        const gst = netPaySafe > 0 ? Math.ceil((netPaySafe * 0.02) / 10) * 10 : 0;
        const cess = netPaySafe > 0 ? Math.ceil((netPaySafe * 0.01) / 10) * 10 : 0;
        const contractPrice = parseFloat(work?.contractPrice || pkg?.contractPrice || work?.estimatedCost || pkg?.amount) || 0;
        const sdBase = netPaySafe > 0 ? Math.ceil((netPaySafe * 0.06) / 100) * 100 : 0;
        const sdMax = contractPrice > 0 ? Math.ceil((contractPrice * 0.05) / 100) * 100 : 0;
        const sd = sdMax > 0 ? Math.min(sdBase, sdMax) : sdBase;
        const isBuilding = String(work?.workType || pkg?.workType || '').toLowerCase().includes('building');
        const fmd = isBuilding ? 0 : parseFloat((netPaySafe * 0.05).toFixed(2));
        const currentBHead = String(work?.budgetHead || pkg?.budgetHead || '').trim().toLowerCase();
        const isMMGSY = currentBHead.includes('5054 mmgsy normal') || currentBHead.includes('5054 mmgsy scsp') || currentBHead.includes('mmgsy');

        const tpi = isMMGSY ? (netPaySafe > 10000000 ? 100000 : 50000) : 0;
        const billNoStr = String(nextForm.runningBillNumber || '').trim().toLowerCase();
        const isFirstBill = Number(nextForm.runningBillNumber) === 1 || billNoStr === '1' || billNoStr.includes('1st') || billNoStr.includes('first');
        const esmp = (isMMGSY && isFirstBill) ? 20000 : 0;

        const asphalt = parseFloat(nextForm.asphaltDeposit) || 0;
        const core = parseFloat(nextForm.coreSampleDeposit) || 0;
        const tld = parseFloat(nextForm.timeLimitDeposit) || 0;
        const testing = parseFloat(nextForm.testingCharges) || 0;
        const otherDep = parseFloat(nextForm.otherDeposit) || 0;

        const totalDeduction = parseFloat((it + gst + cess + sd + fmd + asphalt + core + tpi + esmp + tld + testing + otherDep).toFixed(2));
        const netPaid = parseFloat((netPay - totalDeduction).toFixed(2));

        return {
            ...nextForm,
            netPayableAmount: netPay,
            incomeTax: it,
            gst: gst,
            labourCess: cess,
            securityDeposit: sd,
            freeMaintenanceDeposit: fmd,
            tpi: tpi,
            esmp: esmp,
            totalDeduction: totalDeduction,
            netPaidAmount: netPaid
        };
    }, []);

    const handleBillFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        
        setBillForm((prev: any) => {
            const next = { ...prev, [name]: val };
            return recalculateBillDeductions(next);
        });
    };

    const handleSaveBill = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const submission = { ...billForm, workOrderId: workOrder._id };
            if (submission.billDate) {
                const parsed = parseDateStr(submission.billDate);
                if (parsed) submission.billDate = parsed.toISOString();
            }
            if (submission.passingDate) {
                const parsed = parseDateStr(submission.passingDate);
                if (parsed) submission.passingDate = parsed.toISOString();
            }

            const url = editingBill ? `/api/bills/${editingBill._id}` : '/api/bills';
            const method = editingBill ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submission),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to save bill.');
            }

            showToast('success', editingBill ? 'Bill details updated successfully.' : 'Bill created successfully.');
            setIsBillModalOpen(false);
            setEditingBill(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBill = async (id: string) => {
        if (!confirm('Are you sure you want to delete this bill?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete bill.');
            showToast('success', 'Bill deleted.');
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate dynamic timelines progress percentage
    const progressStats = useMemo(() => {
        let score = 1; // ApprovedWork always exists
        const stages = [
            { name: 'Approved', done: true, color: 'text-emerald-600 bg-emerald-100 border-emerald-300' },
            { name: 'T.S.', done: !!ts, color: ts ? 'text-emerald-600 bg-emerald-100 border-emerald-300' : 'text-slate-400 bg-slate-50 border-slate-200' },
            { name: 'Package', done: !!pkg, color: pkg ? 'text-emerald-600 bg-emerald-100 border-emerald-300' : 'text-slate-400 bg-slate-50 border-slate-200' },
            { name: 'DTP Approval', done: !!dtp, color: dtp ? 'text-emerald-600 bg-emerald-100 border-emerald-300' : 'text-slate-400 bg-slate-50 border-slate-200' },
            { name: 'Tendering', done: !!tender, color: tender ? 'text-emerald-600 bg-emerald-100 border-emerald-300' : 'text-slate-400 bg-slate-50 border-slate-200' },
            { name: 'Approval', done: !!approval || (approval?.notRequired) || isTenderApprovalNotRequired, color: (approval || approval?.notRequired || isTenderApprovalNotRequired) ? 'text-emerald-600 bg-emerald-100 border-emerald-300' : 'text-slate-400 bg-slate-50 border-slate-200' },
            { name: 'LOA Issued', done: !!loa, color: loa ? 'text-emerald-600 bg-emerald-100 border-emerald-300' : 'text-slate-400 bg-slate-50 border-slate-200' },
            { name: 'Work Order', done: !!workOrder, color: workOrder ? 'text-emerald-600 bg-emerald-100 border-emerald-300' : 'text-slate-400 bg-slate-50 border-slate-200' },
            { name: 'Bills', done: bills && bills.length > 0, color: (bills && bills.length > 0) ? 'text-emerald-600 bg-emerald-100 border-emerald-300' : 'text-slate-400 bg-slate-50 border-slate-200' },
        ];
        
        stages.forEach((s, idx) => {
            if (idx > 0 && s.done) score++;
        });

        const percent = Math.round((score / stages.length) * 100);
        return { percent, stages };
    }, [ts, pkg, dtp, tender, approval, loa, workOrder, bills]);

    return (
        <div className="space-y-8 pb-16">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md border border-slate-200 p-5 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                    <Link href="/approved-works" className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                {work.budgetType || 'Approved Work'}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                                Job No: {work.wmsItemCode || 'N/A'}
                            </span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800 line-clamp-1 mt-1">
                            {work.workName}
                        </h1>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 font-semibold uppercase">Job Cost</p>
                    <p className="text-2xl font-extrabold text-blue-600">
                        ₹{work.jobNumberAmount ? `${work.jobNumberAmount.toFixed(2)} Lacs` : 'N/A'}
                    </p>
                </div>
            </div>

            {/* Global Loader Overlay */}
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-slate-100">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <span className="text-sm font-semibold text-slate-700">Updating project details...</span>
                    </div>
                </div>
            )}

            {/* Global Toast */}
            {toast.visible && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border transition-all duration-300 ${
                    toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                    <span className="text-sm font-semibold">{toast.message}</span>
                </div>
            )}

            {/* Visual Progress Timeline */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Project Timeline</h2>
                    <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        {progressStats.percent}% Complete
                    </span>
                </div>
                
                {/* Horizontal Progress Bar */}
                <div className="relative w-full h-2 bg-slate-100 rounded-full mb-8">
                    <div 
                        className="absolute top-0 left-0 h-2 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressStats.percent}%` }}
                    />
                    <div className="absolute top-0 left-0 w-full flex justify-between -translate-y-2.5 px-1">
                        {progressStats.stages.map((stage, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                                    stage.done ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200'
                                }`}>
                                    {stage.done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                </div>
                                <span className={`text-[10px] md:text-xs font-bold mt-2 hidden sm:block ${
                                    stage.done ? 'text-slate-800 font-semibold' : 'text-slate-400'
                                }`}>
                                    {stage.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* STACKED SECTION CARDS */}
            <div className="space-y-6">

                {/* 1. Approved Work Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">1. Administrative Sanction (Approved Work)</h3>
                                <p className="text-xs text-slate-400 font-medium">Core work parameters and allocations</p>
                            </div>
                        </div>
                        {editingSection !== 'work' && (
                            <button onClick={() => handleStartEdit('work')} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all cursor-pointer">
                                <Edit2 className="w-3.5 h-3.5" /> Edit Details
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6">
                        {editingSection === 'work' ? (
                            <form onSubmit={handleSaveWork} className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Circle</td>
                                                <td className="excel-value w-[30%]">
                                                    <input type="text" name="circle" value={workForm.circle} onChange={handleWorkFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">District</td>
                                                <td className="excel-value w-[30%]">
                                                    <input type="text" name="district" value={workForm.district} onChange={handleWorkFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Sub Division</td>
                                                <td className="excel-value">
                                                    <select name="subDivision" value={workForm.subDivision} onChange={handleWorkFieldChange} className="excel-cell-select bg-white">
                                                        <option value="">-- Select --</option>
                                                        <option value="Bhavnagar">Bhavnagar</option>
                                                        <option value="Mahuva">Mahuva</option>
                                                        <option value="Palitana">Palitana</option>
                                                        <option value="Talaja">Talaja</option>
                                                        <option value="Shihor">Shihor</option>
                                                        <option value="Vallabhipur">Vallabhipur</option>
                                                    </select>
                                                </td>
                                                <td className="excel-label">Taluka</td>
                                                <td className="excel-value">
                                                    <input type="text" name="taluka" value={workForm.taluka} onChange={handleWorkFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Constituency Name</td>
                                                <td className="excel-value">
                                                    <input type="text" name="constituencyName" value={workForm.constituencyName} onChange={handleWorkFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">Budget Type</td>
                                                <td className="excel-value">
                                                    <input type="text" name="budgetType" value={workForm.budgetType} onChange={handleWorkFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">WMS Item Code</td>
                                                <td className="excel-value">
                                                    <input type="text" name="wmsItemCode" value={workForm.wmsItemCode} onChange={handleWorkFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">Approval Year</td>
                                                <td className="excel-value">
                                                    <input type="text" name="approvalYear" value={workForm.approvalYear} onChange={handleWorkFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Approval Date</td>
                                                <td className="excel-value">
                                                    <input type="text" name="jobNumberApprovalDate" value={workForm.jobNumberApprovalDate} onChange={handleWorkFieldChange} placeholder="DD/MM/YYYY" className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">Amount (₹ Lacs)</td>
                                                <td className="excel-value">
                                                    <input type="number" name="jobNumberAmount" value={workForm.jobNumberAmount} onChange={handleWorkFieldChange} step="0.01" className="excel-cell-input font-mono" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Work Name *</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <input type="text" name="workName" value={workForm.workName} onChange={handleWorkFieldChange} required className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Estimate Consultant</td>
                                                <td className="excel-value">
                                                    <input type="text" name="estimateConsultant" value={workForm.estimateConsultant} onChange={handleWorkFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">Work Type / Category</td>
                                                <td className="excel-value">
                                                    <div className="flex gap-2">
                                                        <select name="workType" value={workForm.workType} onChange={handleWorkFieldChange} className="excel-cell-select bg-white">
                                                            <option value="Road">Road</option>
                                                            <option value="Building">Building</option>
                                                            <option value="Bridge">Bridge</option>
                                                        </select>
                                                        <input type="text" name="roadCategory" value={workForm.roadCategory} onChange={handleWorkFieldChange} placeholder="Category" className="excel-cell-input" />
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Remarks</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <textarea name="remarks" value={workForm.remarks} onChange={handleWorkFieldChange} rows={2} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] flex items-center gap-2 cursor-pointer">
                                        <Save className="w-4 h-4" /> Save Changes
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="excel-table">
                                    <tbody>
                                        <tr>
                                            <td className="excel-label">Circle / District</td>
                                            <td className="excel-value w-[30%]">{work.circle || '-'} / {work.district || '-'}</td>
                                            <td className="excel-label">Sub-Division / Taluka</td>
                                            <td className="excel-value w-[30%]">{work.subDivision || '-'} / {work.taluka || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">Constituency Name</td>
                                            <td className="excel-value">{work.constituencyName || '-'}</td>
                                            <td className="excel-label">Budget Head / Type</td>
                                            <td className="excel-value">{work.budgetHead || '-'} / {work.budgetType || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">WMS Item Code</td>
                                            <td className="excel-value font-mono">{work.wmsItemCode || '-'}</td>
                                            <td className="excel-label">Approval Year / Date</td>
                                            <td className="excel-value">{work.approvalYear || '-'} &nbsp;|&nbsp; {work.jobNumberApprovalDate ? new Date(work.jobNumberApprovalDate).toLocaleDateString('en-GB') : '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">Estimate Consultant</td>
                                            <td className="excel-value">{work.estimateConsultant || '-'}</td>
                                            <td className="excel-label font-bold">Job Cost</td>
                                            <td className="excel-value font-bold font-mono text-emerald-700">₹{work.jobNumberAmount ? `${work.jobNumberAmount.toFixed(2)} Lacs` : '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">Road Category / Type</td>
                                            <td className="excel-value" colSpan={3}>{work.roadCategory || '-'} / {work.workType || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">Remarks</td>
                                            <td className="excel-value" colSpan={3}>{work.remarks || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Technical Sanction (TS) Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${ts ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <FileCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">2. Technical Sanction (T.S.)</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        ts ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {ts ? '✅ Done' : '⏳ Pending'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Sanctioned T.S. amount and authorities</p>
                            </div>
                        </div>
                        {editingSection !== 'ts' && (
                            <button onClick={() => handleStartEdit('ts')} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all cursor-pointer">
                                {ts ? <><Edit2 className="w-3.5 h-3.5" /> Modify T.S.</> : <><Plus className="w-3.5 h-3.5" /> Add T.S.</>}
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6">
                        {editingSection === 'ts' ? (
                            <form onSubmit={handleSaveTS} className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Name of Work</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <span className="px-2 py-1 text-slate-500 font-semibold text-xs block">{tsForm.workName}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">T.S. Authority</td>
                                                <td className="excel-value w-[30%]">
                                                    <select name="tsAuthority" value={tsForm.tsAuthority} onChange={handleTsFieldChange} className="excel-cell-select bg-white">
                                                        <option value="">-- Select Authority --</option>
                                                        <option value="Executive Engineer (EE)">Executive Engineer (EE)</option>
                                                        <option value="Deputy Executive Engineer (DEE)">Deputy Executive Engineer (DEE)</option>
                                                        <option value="The Superintending Engineer, Panchayat Road and Building Circle - 2, Rajkot.">The Superintending Engineer, Panchayat Road and Building Circle - 2, Rajkot.</option>
                                                        <option value="Road and Building Department">Road and Building Department</option>
                                                    </select>
                                                </td>
                                                <td className="excel-label">T.S. Number</td>
                                                <td className="excel-value w-[30%]">
                                                    <input type="text" name="tsNumber" value={tsForm.tsNumber} onChange={handleTsFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">T.S. Date</td>
                                                <td className="excel-value">
                                                    <input type="text" placeholder="DD/MM/YYYY" name="tsDate" value={tsForm.tsDate} onChange={handleTsFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">T.S. Amount (₹ Lacs)</td>
                                                <td className="excel-value">
                                                    <input type="number" name="tsAmount" value={tsForm.tsAmount} onChange={handleTsFieldChange} step="0.01" className="excel-cell-input font-mono" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Remarks</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <input type="text" name="remarks" value={tsForm.remarks} onChange={handleTsFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] flex items-center gap-2 cursor-pointer">
                                        <Save className="w-4 h-4" /> Save Sanction
                                    </button>
                                </div>
                            </form>
                        ) : ts ? (
                            <div className="overflow-x-auto">
                                <table className="excel-table">
                                    <tbody>
                                        <tr>
                                            <td className="excel-label">T.S. Authority</td>
                                            <td className="excel-value w-[30%]">{ts.tsAuthority || '-'}</td>
                                            <td className="excel-label">T.S. Number / Date</td>
                                            <td className="excel-value w-[30%]">{ts.tsNumber || '-'} &nbsp;|&nbsp; {ts.tsDate ? new Date(ts.tsDate).toLocaleDateString('en-GB') : '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">T.S. Amount</td>
                                            <td className="excel-value font-bold font-mono text-emerald-700">₹{ts.tsAmount ? `${ts.tsAmount.toFixed(2)} Lacs` : '-'}</td>
                                            <td className="excel-label">T.S. Remarks</td>
                                            <td className="excel-value">{ts.remarks || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">Technical Sanction details are pending.</p>
                                <p className="text-slate-400 text-xs mt-0.5">Please add a Technical Sanction to proceed with Package details.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Package Details Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${pkg ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">3. Package Details</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        pkg ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {pkg ? '✅ Done' : '⏳ Pending'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Work packaging and assigning DTP consultants</p>
                            </div>
                        </div>
                        {editingSection !== 'package' && (
                            <button 
                                onClick={() => handleStartEdit('package')}
                                disabled={!ts} 
                                title={!ts ? "Please create Technical Sanction first" : ""}
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {pkg ? <><Edit2 className="w-3.5 h-3.5" /> Modify Package</> : <><Plus className="w-3.5 h-3.5" /> Create Package</>}
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6">
                        {editingSection === 'package' ? (
                            <form onSubmit={handleSavePackage} className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Package Name *</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <input type="text" name="packageName" value={pkgForm.packageName} onChange={(e) => setPkgForm((prev: any) => ({ ...prev, packageName: e.target.value }))} required className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Sub Division</td>
                                                <td className="excel-value w-[30%]">
                                                    <select name="subDivision" value={pkgForm.subDivision} onChange={(e) => setPkgForm((prev: any) => ({ ...prev, subDivision: e.target.value }))} className="excel-cell-select bg-white">
                                                        <option value="">-- Select --</option>
                                                        <option value="Bhavnagar">Bhavnagar</option>
                                                        <option value="Mahuva">Mahuva</option>
                                                        <option value="Palitana">Palitana</option>
                                                        <option value="Talaja">Talaja</option>
                                                        <option value="Shihor">Shihor</option>
                                                        <option value="Vallabhipur">Vallabhipur</option>
                                                    </select>
                                                </td>
                                                <td className="excel-label">DTP Consultant</td>
                                                <td className="excel-value w-[30%]">
                                                    <select name="dtpConsultant" value={pkgForm.dtpConsultant} onChange={(e) => setPkgForm((prev: any) => ({ ...prev, dtpConsultant: e.target.value }))} className="excel-cell-select bg-white">
                                                        <option value="">-- Select Consultant --</option>
                                                        <option value="Umiya Engineers and Project Management Consultancy">Umiya Engineers and Project Management Consultancy</option>
                                                        <option value="Trisha Engineers Consultancy">Trisha Engineers Consultancy</option>
                                                        <option value="Pramukham Engineers Consultancy">Pramukham Engineers Consultancy</option>
                                                        <option value="Kalyan Computers">Kalyan Computers</option>
                                                        <option value="Karansinh Janaksinh Rana">Karansinh Janaksinh Rana</option>
                                                        <option value="MCWAY MANAGEMENTS LIMITED">MCWAY MANAGEMENTS LIMITED</option>
                                                        <option value="Infinizy Civil Consultant">Infinizy Civil Consultant</option>
                                                    </select>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Linked Work</td>
                                                <td className="excel-value font-mono text-slate-500 font-semibold" colSpan={3}>
                                                    📌 {work.workName} &nbsp;|&nbsp; T.S. Amount: ₹{(ts?.tsAmount || 0).toFixed(2)} Lacs
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] flex items-center gap-2 cursor-pointer">
                                        <Save className="w-4 h-4" /> Save Package
                                    </button>
                                </div>
                            </form>
                        ) : pkg ? (
                            <div className="overflow-x-auto">
                                <table className="excel-table">
                                    <tbody>
                                        <tr>
                                            <td className="excel-label">Package Name</td>
                                            <td className="excel-value w-[30%]">{pkg.packageName}</td>
                                            <td className="excel-label">Sub-Division / DTP Consultant</td>
                                            <td className="excel-value w-[30%]">{pkg.subDivision || '-'} &nbsp;|&nbsp; {pkg.dtpConsultant || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">Package details are pending.</p>
                                <p className="text-slate-400 text-xs mt-0.5">Please create a Package once Technical Sanction is added.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. DTP Details Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${dtp ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <ClipboardCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">4. DTP Approval</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        dtp ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {dtp ? '✅ Done' : '⏳ Pending'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Detailed Tender Papers approval details</p>
                            </div>
                        </div>
                        {editingSection !== 'dtp' && (
                            <button 
                                onClick={() => handleStartEdit('dtp')}
                                disabled={!pkg} 
                                title={!pkg ? "Please create Package first" : ""}
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {dtp ? <><Edit2 className="w-3.5 h-3.5" /> Modify DTP</> : <><Plus className="w-3.5 h-3.5" /> Add DTP</>}
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6">
                        {editingSection === 'dtp' ? (
                            <form onSubmit={handleSaveDtp} className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">DTP Sending No.</td>
                                                <td className="excel-value w-[30%]">
                                                    <input type="text" name="dtpSendingNo" value={dtpForm.dtpSendingNo} onChange={handleDtpFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">DTP Sending Date</td>
                                                <td className="excel-value w-[30%]">
                                                    <input type="text" placeholder="DD/MM/YYYY" name="dtpSendingDate" value={dtpForm.dtpSendingDate} onChange={handleDtpFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Tender Amount (₹)</td>
                                                <td className="excel-value">
                                                    <input type="number" name="tenderAmount" value={dtpForm.tenderAmount} onChange={handleDtpFieldChange} step="0.01" className="excel-cell-input font-mono" />
                                                </td>
                                                <td className="excel-label">DTP Approving Authority</td>
                                                <td className="excel-value">
                                                    <select name="dtpApprovingAuthority" value={dtpForm.dtpApprovingAuthority} onChange={handleDtpFieldChange} className="excel-cell-select bg-white">
                                                        <option value="">-- Select Authority --</option>
                                                        <option value="Executive Engineer (EE)">Executive Engineer (EE)</option>
                                                        <option value="Deputy Executive Engineer (DEE)">Deputy Executive Engineer (DEE)</option>
                                                        <option value="The Superintending Engineer, Panchayat Road and Building Circle - 2, Rajkot.">The Superintending Engineer, Panchayat Road and Building Circle - 2, Rajkot.</option>
                                                        <option value="Road and Building Department">Road and Building Department</option>
                                                    </select>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">DTP Approval No.</td>
                                                <td className="excel-value">
                                                    <input type="text" name="dtpApprovalNo" value={dtpForm.dtpApprovalNo} onChange={handleDtpFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">DTP Approval Date</td>
                                                <td className="excel-value">
                                                    <input type="text" placeholder="DD/MM/YYYY" name="dtpApprovalDate" value={dtpForm.dtpApprovalDate} onChange={handleDtpFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Remarks</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <textarea name="remarks" value={dtpForm.remarks} onChange={handleDtpFieldChange} rows={2} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] flex items-center gap-2 cursor-pointer">
                                        <Save className="w-4 h-4" /> Save DTP
                                    </button>
                                </div>
                            </form>
                        ) : dtp ? (
                            <div className="overflow-x-auto">
                                <table className="excel-table">
                                    <tbody>
                                        <tr>
                                            <td className="excel-label">Sending Details</td>
                                            <td className="excel-value w-[30%]">WS No: {dtp.dtpSendingNo || '-'} &nbsp;|&nbsp; Date: {dtp.dtpSendingDate ? new Date(dtp.dtpSendingDate).toLocaleDateString('en-GB') : '-'}</td>
                                            <td className="excel-label">Approving Authority</td>
                                            <td className="excel-value w-[30%]">{dtp.dtpApprovingAuthority || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">Approval Details</td>
                                            <td className="excel-value font-mono">No: {dtp.dtpApprovalNo || '-'} &nbsp;|&nbsp; Date: {dtp.dtpApprovalDate ? new Date(dtp.dtpApprovalDate).toLocaleDateString('en-GB') : '-'}</td>
                                            <td className="excel-label">Tender Amount</td>
                                            <td className="excel-value font-bold font-mono text-emerald-700">₹{dtp.tenderAmount ? dtp.tenderAmount.toLocaleString('en-IN') : '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">DTP approval details are pending.</p>
                                <p className="text-slate-400 text-xs mt-0.5">Please add DTP details once Package is created.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Tender Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${tender ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Percent className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">5. Tender Details</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        tender ? (tender.cancelled ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800') : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {tender ? (tender.cancelled ? '🚫 Cancelled' : '✅ Done') : '⏳ Pending'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Bidding trial details, rates, and agency selection</p>
                            </div>
                        </div>
                        {editingSection !== 'tender' && (
                            <button 
                                onClick={() => handleStartEdit('tender')}
                                disabled={!pkg} 
                                title={!pkg ? "Please create Package first" : ""}
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {tender ? <><Edit2 className="w-3.5 h-3.5" /> Modify Tender</> : <><Plus className="w-3.5 h-3.5" /> Add Tender</>}
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6">
                        {editingSection === 'tender' ? (
                            <form onSubmit={handleSaveTender} className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Tender ID</td>
                                                <td className="excel-value w-[30%]">
                                                    <input type="text" name="tenderId" value={tenderForm.tenderId} onChange={handleTenderFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">Tender Notice Year</td>
                                                <td className="excel-value w-[30%]">
                                                    <select name="tenderNoticeYear" value={tenderForm.tenderNoticeYear} onChange={handleTenderFieldChange} className="excel-cell-select bg-white">
                                                        <option value="2024-25">2024-25</option>
                                                        <option value="2025-26">2025-26</option>
                                                        <option value="2026-27">2026-27</option>
                                                        <option value="2027-28">2027-28</option>
                                                    </select>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Notice / Sr No.</td>
                                                <td className="excel-value">
                                                    <div className="flex gap-2">
                                                        <input type="text" name="noticeNo" placeholder="Notice" value={tenderForm.noticeNo} onChange={handleTenderFieldChange} className="excel-cell-input" />
                                                        <input type="text" name="srNo" placeholder="Sr" value={tenderForm.srNo} onChange={handleTenderFieldChange} className="excel-cell-input w-20" />
                                                    </div>
                                                </td>
                                                <td className="excel-label">Trial No.</td>
                                                <td className="excel-value font-mono">
                                                    <input type="number" name="trialNo" value={tenderForm.trialNo} onChange={handleTenderFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Creation Date</td>
                                                <td className="excel-value">
                                                    <input type="text" name="tenderCreationDate" value={tenderForm.tenderCreationDate} onChange={handleTenderFieldChange} placeholder="DD/MM/YYYY" className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">Last Submission Date</td>
                                                <td className="excel-value">
                                                    <input type="text" name="lastDateOfSubmission" value={tenderForm.lastDateOfSubmission} onChange={handleTenderFieldChange} placeholder="DD/MM/YYYY" className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Tender Validity Date</td>
                                                <td className="excel-value font-semibold text-slate-500 bg-slate-50 px-3 py-2">
                                                    {tenderForm.tenderValidityDate || '-'}
                                                </td>
                                                <td className="excel-label">Status Check</td>
                                                <td className="excel-value">
                                                    <div className="flex items-center gap-4 py-1">
                                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" name="cancelled" checked={tenderForm.cancelled} onChange={handleTenderFieldChange} className="w-4 h-4 text-[#107c41] border-slate-200 rounded cursor-pointer" />
                                                            <span className="text-xs font-bold text-slate-600">Tender Cancelled</span>
                                                        </label>
                                                        {tenderForm.cancelled && (
                                                            <select name="cancellationReason" value={tenderForm.cancellationReason} onChange={handleTenderFieldChange} className="excel-cell-select bg-white w-40">
                                                                <option value="">-- Reason --</option>
                                                                <option value="High Rate">High Rate</option>
                                                                <option value="Single Bidder">Single Bidder</option>
                                                                <option value="Technical Ground">Technical Ground</option>
                                                                <option value="Administrative Ground">Administrative Ground</option>
                                                                <option value="Other">Other</option>
                                                            </select>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr className="bg-[#107c41]/10">
                                                <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-[#107c41] bg-[#107c41]/10 border-b border-slate-300 text-left uppercase">Tender Bidding Output</th>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Agency / Contractor Name</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <div className="flex gap-2 items-center">
                                                        <div className="flex-grow">
                                                            <SearchableSelect
                                                                placeholder="Search contractor..."
                                                                options={agencies}
                                                                value={agencies.find(a => a.name === tenderForm.contractorName)?._id || ''}
                                                                onChange={(id) => {
                                                                    const selected = agencies.find(a => a._id === id);
                                                                    setTenderForm((prev: any) => ({ ...prev, contractorName: selected ? selected.name : '' }));
                                                                }}
                                                                displayField="name"
                                                                helperField="address"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 items-end">
                                                            <button type="button" onClick={() => { setEditingContractorId(null); setIsContractorModalOpen(true); }} className="px-2 py-1 text-[10px] font-bold text-white bg-[#107c41] rounded-md whitespace-nowrap cursor-pointer hover:bg-[#0f5b30]">+ New</button>
                                                            {tenderForm.contractorName && (
                                                                <button type="button" onClick={handleOpenEditContractor} className="px-2 py-0.5 text-[10px] font-bold text-white bg-amber-600 rounded-md whitespace-nowrap cursor-pointer hover:bg-amber-700">Edit</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Above / Below (Word)</td>
                                                <td className="excel-value">
                                                    <select name="aboveBelowInWord" value={tenderForm.aboveBelowInWord} onChange={handleTenderFieldChange} className="excel-cell-select bg-white">
                                                        <option value="Above">Above</option>
                                                        <option value="Below">Below</option>
                                                        <option value="At Par">At Par</option>
                                                    </select>
                                                </td>
                                                <td className="excel-label">Above / Below (%)</td>
                                                <td className="excel-value">
                                                    <input type="number" name="aboveBelowPercentage" value={tenderForm.aboveBelowPercentage} onChange={handleTenderFieldChange} step="0.01" className="excel-cell-input font-mono" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Final Contract Price</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <input type="number" name="contractPrice" value={tenderForm.contractPrice} onChange={handleTenderFieldChange} step="0.01" className="excel-cell-input font-mono font-bold text-[#107c41]" />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] flex items-center gap-2 cursor-pointer">
                                        <Save className="w-4 h-4" /> Save Tender
                                    </button>
                                </div>
                            </form>
                        ) : tender ? (
                            <div className="overflow-x-auto">
                                {tender.cancelled ? (
                                    <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs font-semibold text-rose-800 mb-2">
                                        🚫 <strong>Tender Cancelled:</strong> {tender.cancellationReason || 'No reason specified'} &nbsp;|&nbsp; Trial No: {tender.trialNo} &nbsp;|&nbsp; Notice No: {tender.noticeNo}
                                    </div>
                                ) : (
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Tender ID / Trial No</td>
                                                <td className="excel-value w-[30%]">{tender.tenderId || '-'} &nbsp;|&nbsp; Trial {tender.trialNo}</td>
                                                <td className="excel-label">Contractor Agency</td>
                                                <td className="excel-value w-[30%]">{tender.contractorName || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Contract Price</td>
                                                <td className="excel-value font-bold font-mono text-emerald-700">₹{tender.contractPrice ? tender.contractPrice.toLocaleString('en-IN') : '-'}</td>
                                                <td className="excel-label">Percentage Mode</td>
                                                <td className="excel-value">{tender.aboveBelowPercentage}% {tender.aboveBelowInWord}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">Tender details are pending.</p>
                                <p className="text-slate-400 text-xs mt-0.5">Please add tender details once Package is created.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 6. Tender Approval Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${approval ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">6. Tender Approval</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        (approval?.notRequired || isTenderApprovalNotRequired) 
                                            ? 'bg-slate-100 text-slate-800' 
                                            : approval ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {(approval?.notRequired || isTenderApprovalNotRequired) 
                                            ? '🚫 Not Required' 
                                            : approval ? '✅ Done' : '⏳ Pending'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Tender sanction and approval office details</p>
                            </div>
                        </div>
                        {editingSection !== 'approval' && (
                            <button 
                                onClick={() => handleStartEdit('approval')}
                                disabled={!tender || tender.cancelled} 
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {approval ? <><Edit2 className="w-3.5 h-3.5" /> Modify Approval</> : <><Plus className="w-3.5 h-3.5" /> Add Approval</>}
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6">
                        {editingSection === 'approval' ? (
                            <form onSubmit={handleSaveApproval} className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Approval Requirement</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <label className="inline-flex items-center gap-2 cursor-pointer py-1">
                                                        <input 
                                                            type="checkbox" 
                                                            name="notRequired" 
                                                            checked={approvalForm.notRequired || isTenderApprovalNotRequired} 
                                                            disabled={isTenderApprovalNotRequired}
                                                            onChange={handleApprovalFieldChange} 
                                                            className="w-4 h-4 text-[#107c41] border-slate-200 rounded cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed" 
                                                        />
                                                        <span className="text-xs font-bold text-slate-700">Tender Approval Not Required {isTenderApprovalNotRequired && "(Auto - Price < 50L)"}</span>
                                                    </label>
                                                </td>
                                            </tr>
                                            {!approvalForm.notRequired && (
                                                <>
                                                    <tr>
                                                        <td className="excel-label">Proposal Date</td>
                                                        <td className="excel-value w-[30%]">
                                                            <input type="text" placeholder="DD/MM/YYYY" name="proposalDate" value={approvalForm.proposalDate} onChange={handleApprovalFieldChange} className="excel-cell-input" />
                                                        </td>
                                                        <td className="excel-label">Tender Approval Office</td>
                                                        <td className="excel-value w-[30%]">
                                                            <select name="tenderApprovalOffice" value={approvalForm.tenderApprovalOffice} onChange={handleApprovalFieldChange} className="excel-cell-select bg-white">
                                                                <option value="">-- Select Office --</option>
                                                                <option value="Executive Engineer (EE)">Executive Engineer (EE)</option>
                                                                <option value="Deputy Executive Engineer (DEE)">Deputy Executive Engineer (DEE)</option>
                                                                <option value="The Superintending Engineer, Panchayat Road and Building Circle - 2, Rajkot.">The Superintending Engineer, Rajkot.</option>
                                                                <option value="Road and Building Department">Road and Building Department</option>
                                                            </select>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="excel-label">Tender Approval No.</td>
                                                        <td className="excel-value">
                                                            <input type="text" name="tenderApprovalNo" value={approvalForm.tenderApprovalNo} onChange={handleApprovalFieldChange} className="excel-cell-input" />
                                                        </td>
                                                        <td className="excel-label">Tender Approval Date</td>
                                                        <td className="excel-value">
                                                            <input type="text" placeholder="DD/MM/YYYY" name="tenderApprovalDate" value={approvalForm.tenderApprovalDate} onChange={handleApprovalFieldChange} className="excel-cell-input" />
                                                        </td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] flex items-center gap-2 cursor-pointer">
                                        <Save className="w-4 h-4" /> Save Approval
                                    </button>
                                </div>
                            </form>
                        ) : approval ? (
                            <div className="overflow-x-auto">
                                {(approval.notRequired || isTenderApprovalNotRequired) ? (
                                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-600 italic">
                                        🚫 Tender Approval is marked as <strong>Not Required</strong> for this work.
                                    </div>
                                ) : (
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Proposal Date</td>
                                                <td className="excel-value w-[30%]">{approval.proposalDate ? new Date(approval.proposalDate).toLocaleDateString('en-GB') : '-'}</td>
                                                <td className="excel-label">Approval Office</td>
                                                <td className="excel-value w-[30%]">{approval.tenderApprovalOffice || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Approval Number</td>
                                                <td className="excel-value">{approval.tenderApprovalNo || '-'}</td>
                                                <td className="excel-label">Approval Date</td>
                                                <td className="excel-value">{approval.tenderApprovalDate ? new Date(approval.tenderApprovalDate).toLocaleDateString('en-GB') : '-'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">Tender Approval details are pending.</p>
                                <p className="text-slate-400 text-xs mt-0.5">Please add approval details once Tender is saved.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 7. LOA Issued Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${loa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">7. Letter of Acceptance (LOA)</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        loa ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {loa ? '✅ Done' : '⏳ Pending'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Stamp duty, work durations, and acceptance letter dates</p>
                            </div>
                        </div>
                        {editingSection !== 'loa' && (
                            <button 
                                onClick={() => handleStartEdit('loa')}
                                disabled={!tender || tender.cancelled} 
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {loa ? <><Edit2 className="w-3.5 h-3.5" /> Modify LOA</> : <><Plus className="w-3.5 h-3.5" /> Add LOA</>}
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6">
                        {editingSection === 'loa' ? (
                            <form onSubmit={handleSaveLoa} className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Acceptance Letter WS No.</td>
                                                <td className="excel-value w-[30%]">
                                                    <input type="text" name="acceptanceLetterWorksheetNo" value={loaForm.acceptanceLetterWorksheetNo} onChange={handleLoaFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">Acceptance Letter Date</td>
                                                <td className="excel-value w-[30%]">
                                                    <input type="text" placeholder="DD/MM/YYYY" name="acceptanceLetterDate" value={loaForm.acceptanceLetterDate} onChange={handleLoaFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Duration of Work (Months)</td>
                                                <td className="excel-value">
                                                    <input type="number" name="workDurationMonths" value={loaForm.workDurationMonths} onChange={handleLoaFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">Stamp Duty Fee (₹)</td>
                                                <td className="excel-value">
                                                    <input type="number" name="stampDuty" value={loaForm.stampDuty} onChange={handleLoaFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Defect Liability Period</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <input type="text" name="defectLiabilityPeriod" value={loaForm.defectLiabilityPeriod} onChange={handleLoaFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] flex items-center gap-2 cursor-pointer">
                                        <Save className="w-4 h-4" /> Save LOA
                                    </button>
                                </div>
                            </form>
                        ) : loa ? (
                            <div className="overflow-x-auto">
                                <table className="excel-table">
                                    <tbody>
                                        <tr>
                                            <td className="excel-label">Acceptance Letter WS No.</td>
                                            <td className="excel-value w-[30%] font-mono">{loa.acceptanceLetterWorksheetNo || '-'}</td>
                                            <td className="excel-label">Acceptance Letter Date</td>
                                            <td className="excel-value w-[30%]">{loa.acceptanceLetterDate ? new Date(loa.acceptanceLetterDate).toLocaleDateString('en-GB') : '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">Duration of Work</td>
                                            <td className="excel-value">{loa.workDurationMonths ? `${loa.workDurationMonths} Months` : '-'}</td>
                                            <td className="excel-label">Stamp Duty Fee</td>
                                            <td className="excel-value font-mono text-emerald-700 font-bold">₹{loa.stampDuty ? loa.stampDuty.toLocaleString('en-IN') : '0'}</td>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">Defect Liability Period</td>
                                            <td className="excel-value" colSpan={3}>{loa.defectLiabilityPeriod || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">LOA details are pending.</p>
                                <p className="text-slate-400 text-xs mt-0.5">Please add LOA details once Tender is saved.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 8. Work Order Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${(workOrder || workOrder?.notRequired) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Settings className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">8. Work Order & Deposits</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        workOrder?.notRequired ? 'bg-slate-100 text-slate-700 border border-slate-300' : workOrder ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {workOrder?.notRequired ? '🚫 Not Required' : workOrder ? '✅ Done' : '⏳ Pending'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Agreement Details, Security Deposits, Work Order timelines</p>
                            </div>
                        </div>
                        {editingSection !== 'workOrder' && (
                            <button 
                                onClick={() => handleStartEdit('workOrder')}
                                disabled={!loa} 
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {workOrder ? <><Edit2 className="w-3.5 h-3.5" /> Modify Work Order</> : <><Plus className="w-3.5 h-3.5" /> Add Work Order</>}
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6">
                        {editingSection === 'workOrder' ? (
                            <form onSubmit={handleSaveWorkOrder} className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Requirement</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <label className="inline-flex items-center gap-2 cursor-pointer py-1">
                                                        <input 
                                                            type="checkbox" 
                                                            name="notRequired" 
                                                            checked={woForm.notRequired || false} 
                                                            onChange={handleWoFieldChange} 
                                                            className="w-4 h-4 text-[#107c41] border-slate-200 rounded cursor-pointer" 
                                                        />
                                                        <span className="text-xs font-bold text-slate-700">Work Order Not Required</span>
                                                    </label>
                                                </td>
                                            </tr>
                                            {!woForm.notRequired && (
                                                <>
                                                    <tr className="bg-[#107c41]/10">
                                                        <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-[#107c41] bg-[#107c41]/10 border-b border-slate-300 text-left uppercase">Agreement Details</th>
                                                    </tr>
                                            <tr>
                                                <td className="excel-label">Agreement Year</td>
                                                <td className="excel-value w-[30%]">
                                                    <select name="agreementYear" value={woForm.agreementYear} onChange={handleWoFieldChange} className="excel-cell-select bg-white">
                                                        <option value="2024-25">2024-25</option>
                                                        <option value="2025-26">2025-26</option>
                                                        <option value="2026-27">2026-27</option>
                                                        <option value="2027-28">2027-28</option>
                                                    </select>
                                                </td>
                                                <td className="excel-label">Agreement No.</td>
                                                <td className="excel-value w-[30%]">
                                                    <input type="text" name="agreementNo" value={woForm.agreementNo} onChange={handleWoFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Agreement Date</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <input type="text" placeholder="DD/MM/YYYY" name="agreementDate" value={woForm.agreementDate} onChange={handleWoFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>

                                            <tr className="bg-[#107c41]/10">
                                                <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-[#107c41] bg-[#107c41]/10 border-b border-slate-300 text-left uppercase">Security Deposit Details</th>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">SD Type</td>
                                                <td className="excel-value">
                                                    <select name="securityDepositType" value={woForm.securityDepositType} onChange={handleWoFieldChange} className="excel-cell-select bg-white">
                                                        <option value="FDR">FDR</option>
                                                        <option value="Bank Guarantee">Bank Guarantee</option>
                                                    </select>
                                                </td>
                                                <td className="excel-label">Bank Name</td>
                                                <td className="excel-value">
                                                    <div className="flex gap-2 items-center">
                                                        <div className="flex-grow">
                                                            <SearchableSelect
                                                                placeholder="Search bank..."
                                                                options={banks}
                                                                value={banks.find(b => b.name === woForm.securityDepositBankName)?._id || ''}
                                                                onChange={(id) => {
                                                                    const selected = banks.find(b => b._id === id);
                                                                    setWoForm((prev: any) => ({ ...prev, securityDepositBankName: selected ? selected.name : '' }));
                                                                }}
                                                                displayField="name"
                                                            />
                                                        </div>
                                                        <button type="button" onClick={() => { setActiveBankField('security'); setIsBankModalOpen(true); }} className="px-2 py-1 text-[10px] font-bold text-white bg-[#107c41] rounded-md whitespace-nowrap cursor-pointer hover:bg-[#0f5b30]">+ Add</button>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">SD Number</td>
                                                <td className="excel-value">
                                                    <input type="text" name="securityDepositNumber" value={woForm.securityDepositNumber} onChange={handleWoFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">SD Amount (₹)</td>
                                                <td className="excel-value">
                                                    <input type="number" name="securityDepositAmount" value={woForm.securityDepositAmount} onChange={handleWoFieldChange} className="excel-cell-input font-mono" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">SD Date</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <input type="text" placeholder="DD/MM/YYYY" name="securityDepositDate" value={woForm.securityDepositDate} onChange={handleWoFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>

                                            <tr className="bg-[#107c41]/10">
                                                <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-[#107c41] bg-[#107c41]/10 border-b border-slate-300 text-left uppercase">Additional Security Deposit (ASD)</th>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">ASD Type</td>
                                                <td className="excel-value">
                                                    <select name="additionalSecurityDepositType" value={woForm.additionalSecurityDepositType} onChange={handleWoFieldChange} className="excel-cell-select bg-white">
                                                        <option value="FDR">FDR</option>
                                                        <option value="Bank Guarantee">Bank Guarantee</option>
                                                    </select>
                                                </td>
                                                <td className="excel-label">Bank Name</td>
                                                <td className="excel-value">
                                                    <div className="flex gap-2 items-center">
                                                        <div className="flex-grow">
                                                            <SearchableSelect
                                                                placeholder="Search bank..."
                                                                options={banks}
                                                                value={banks.find(b => b.name === woForm.additionalSecurityDepositBankName)?._id || ''}
                                                                onChange={(id) => {
                                                                    const selected = banks.find(b => b._id === id);
                                                                    setWoForm((prev: any) => ({ ...prev, additionalSecurityDepositBankName: selected ? selected.name : '' }));
                                                                }}
                                                                displayField="name"
                                                            />
                                                        </div>
                                                        <button type="button" onClick={() => { setActiveBankField('additional'); setIsBankModalOpen(true); }} className="px-2 py-1 text-[10px] font-bold text-white bg-[#107c41] rounded-md whitespace-nowrap cursor-pointer hover:bg-[#0f5b30]">+ Add</button>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">ASD Number</td>
                                                <td className="excel-value">
                                                    <input type="text" name="additionalSecurityDepositNumber" value={woForm.additionalSecurityDepositNumber} onChange={handleWoFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">ASD Amount (₹)</td>
                                                <td className="excel-value">
                                                    <input type="number" name="additionalSecurityDepositAmount" value={woForm.additionalSecurityDepositAmount} onChange={handleWoFieldChange} className="excel-cell-input font-mono" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">ASD Date</td>
                                                <td className="excel-value" colSpan={3}>
                                                    <input type="text" placeholder="DD/MM/YYYY" name="additionalSecurityDepositDate" value={woForm.additionalSecurityDepositDate} onChange={handleWoFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>

                                            <tr className="bg-[#107c41]/10">
                                                <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-[#107c41] bg-[#107c41]/10 border-b border-slate-300 text-left uppercase">Work Order Issuance Timelines</th>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Work Order WS No.</td>
                                                <td className="excel-value">
                                                    <input type="text" name="workOrderWorksheetNo" value={woForm.workOrderWorksheetNo} onChange={handleWoFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">Work Order Date</td>
                                                <td className="excel-value">
                                                    <input type="text" placeholder="DD/MM/YYYY" name="workOrderDate" value={woForm.workOrderDate} onChange={handleWoFieldChange} className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Time Limit Starts From</td>
                                                <td className="excel-value">
                                                    <input type="text" placeholder="DD/MM/YYYY" name="timeLimitStartsFrom" value={woForm.timeLimitStartsFrom} onChange={handleWoFieldChange} className="excel-cell-input" />
                                                </td>
                                                <td className="excel-label">Stipulated Completion Date</td>
                                                <td className="excel-value font-semibold text-slate-500 bg-slate-50 px-3 py-2">
                                                    {woForm.stipulatedCompletionDate || '-'}
                                                </td>
                                            </tr>
                                        </>
                                    )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] flex items-center gap-2 cursor-pointer">
                                        <Save className="w-4 h-4" /> Save Work Order
                                    </button>
                                </div>
                            </form>
                        ) : workOrder?.notRequired ? (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-semibold text-sm">
                                Work Order is not required for this work.
                            </div>
                        ) : workOrder ? (
                            <div className="overflow-x-auto">
                                <table className="excel-table">
                                    <tbody>
                                        <tr className="bg-[#107c41]/10">
                                            <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-[#107c41] bg-[#107c41]/10 border-b border-slate-300 text-left uppercase">Agreement & Work Order</th>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">Agreement Year</td>
                                            <td className="excel-value w-[30%]">{workOrder.agreementYear || '-'}</td>
                                            <td className="excel-label">Agreement Details</td>
                                            <td className="excel-value w-[30%]">No: {workOrder.agreementNo || '-'} &nbsp;|&nbsp; Date: {workOrder.agreementDate ? new Date(workOrder.agreementDate).toLocaleDateString('en-GB') : '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">Work Order Details</td>
                                            <td className="excel-value font-mono">WS No: {workOrder.workOrderWorksheetNo || '-'} &nbsp;|&nbsp; Date: {workOrder.workOrderDate ? new Date(workOrder.workOrderDate).toLocaleDateString('en-GB') : '-'}</td>
                                            <td className="excel-label">Completion Target</td>
                                            <td className="excel-value">{workOrder.stipulatedCompletionDate ? new Date(workOrder.stipulatedCompletionDate).toLocaleDateString('en-GB') : '-'}</td>
                                        </tr>
                                        <tr className="bg-[#107c41]/10">
                                            <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-[#107c41] bg-[#107c41]/10 border-b border-slate-300 text-left uppercase">Security Deposits</th>
                                        </tr>
                                        <tr>
                                            <td className="excel-label">Security Deposit</td>
                                            <td className="excel-value font-mono" colSpan={3}>
                                                Type: {workOrder.securityDepositType || '-'} &nbsp;|&nbsp; Bank: {workOrder.securityDepositBankName || '-'} &nbsp;|&nbsp; No: {workOrder.securityDepositNumber || '-'} &nbsp;|&nbsp; Amount: <strong className="text-emerald-700">₹{workOrder.securityDepositAmount?.toLocaleString('en-IN') || 0}</strong>
                                            </td>
                                        </tr>
                                        {workOrder.additionalSecurityDepositAmount > 0 && (
                                            <tr>
                                                <td className="excel-label">Additional SD</td>
                                                <td className="excel-value font-mono" colSpan={3}>
                                                    Type: {workOrder.additionalSecurityDepositType || '-'} &nbsp;|&nbsp; Bank: {workOrder.additionalSecurityDepositBankName || '-'} &nbsp;|&nbsp; No: {workOrder.additionalSecurityDepositNumber || '-'} &nbsp;|&nbsp; Amount: <strong className="text-emerald-700">₹{workOrder.additionalSecurityDepositAmount?.toLocaleString('en-IN') || 0}</strong>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">Work Order details are pending.</p>
                                <p className="text-slate-400 text-xs mt-0.5">Please add Work Order details once LOA is issued.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 9. Billing / Financials Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${(bills && bills.length > 0) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">9. Billing & Audit Memo</h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700">
                                        {bills ? bills.length : 0} Bills Logged
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Gross work measurements, statutory deductions, net payments</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleOpenBillModal(null)}
                            disabled={!workOrder}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" /> Log New Bill
                        </button>
                    </div>

                    <div className="p-6">
                        {bills && bills.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="excel-table">
                                    <thead>
                                        <tr className="bg-[#107c41] text-white">
                                            <th className="border border-slate-300 px-4 py-1.5 bg-[#107c41] text-center w-20">Bill No.</th>
                                            <th className="border border-slate-300 px-4 py-1.5 bg-[#107c41] text-center w-24">Type</th>
                                            <th className="border border-slate-300 px-4 py-1.5 bg-[#107c41] text-center w-32">Bill Date</th>
                                            <th className="border border-slate-300 px-4 py-1.5 bg-[#107c41] text-right">Gross Amount</th>
                                            <th className="border border-slate-300 px-4 py-1.5 bg-[#107c41] text-right">Deductions</th>
                                            <th className="border border-slate-300 px-4 py-1.5 bg-[#107c41] text-right text-emerald-100 font-bold">Net Paid</th>
                                            <th className="border border-slate-300 px-4 py-1.5 bg-[#107c41] text-center w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {bills.map((bill: any, idx: number) => (
                                            <tr key={bill._id} className="hover:bg-slate-50">
                                                <td className="border border-slate-200 px-4 py-1.5 text-center font-mono font-semibold text-slate-800">{bill.runningBillNumber || idx + 1}</td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-center font-semibold">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        bill.billType === 'Final' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {bill.billType}
                                                    </span>
                                                </td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-center font-semibold">
                                                    {bill.billDate ? new Date(bill.billDate).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-right font-mono font-bold text-slate-800">₹{bill.grossAmount?.toLocaleString('en-IN')}</td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-right font-mono font-semibold text-rose-600">₹{bill.totalDeduction?.toLocaleString('en-IN') || 0}</td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-right font-mono font-extrabold text-emerald-700">₹{bill.netPaidAmount?.toLocaleString('en-IN') || 0}</td>
                                                <td className="border border-slate-200 px-4 py-1.5">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => handleOpenBillModal(bill)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer" title="Edit Bill">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteBill(bill._id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer" title="Delete Bill">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">No billing entries logged yet.</p>
                                <p className="text-slate-400 text-xs mt-0.5">Please log bills once Work Order details are set up.</p>
                            </div>
                        )}
                        {/* INLINE FULL-WIDTH BILL FORM */}
                        {isBillModalOpen && (
                            <div className="mt-6 border border-blue-200 bg-white rounded-2xl p-6 shadow-xs transition-all duration-300 animate-in fade-in slide-in-from-top-4">
                                <div className="pb-4 mb-6 border-b border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                                            <Receipt className="w-4 h-4" />
                                        </span>
                                        <h3 className="text-base font-bold text-slate-800">
                                            {editingBill ? 'Edit Bill Details' : 'Add New Bill & Abstract'}
                                        </h3>
                                    </div>
                                    <button type="button" onClick={() => { setIsBillModalOpen(false); setEditingBill(null); }} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <BillForm 
                                    initialData={editingBill || {}} 
                                    isEditing={!!editingBill} 
                                    initialWorkOrderId={workOrder?._id} 
                                    initialTenderPercentage={tender?.aboveBelowPercentage}
                                    initialTenderDirection={tender?.aboveBelowInWord}
                                    initialWorks={pkg?.works || (work ? [work] : [])}
                                    contractPrice={tender?.contractPrice || tender?.estimatedAmount}
                                    submittedSD={workOrder?.securityDepositAmount || tender?.securityDepositAmount}
                                    workType={work?.workType || pkg?.workType}
                                    budgetHead={work?.budgetHead || pkg?.budgetHead}
                                    onCancel={() => { setIsBillModalOpen(false); setEditingBill(null); }}
                                    onSuccess={() => {
                                        setIsBillModalOpen(false);
                                        setEditingBill(null);
                                        showToast('success', editingBill ? 'Bill details updated successfully.' : 'Bill created successfully.');
                                        router.refresh();
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CONTRACTOR ADD MODAL */}
            {isContractorModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                            <h3 className="text-sm font-bold text-slate-800">{editingContractorId ? 'Edit Contractor' : 'Add New Contractor'}</h3>
                            <button type="button" onClick={handleCloseContractorModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateContractor} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contractor / Agency Name *</label>
                                <input type="text" required value={newContractor.name} onChange={(e) => setNewContractor(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proprietor Name</label>
                                <input type="text" value={newContractor.proprietorName} onChange={(e) => setNewContractor(prev => ({ ...prev, proprietorName: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                                <textarea rows={2} value={newContractor.address} onChange={(e) => setNewContractor(prev => ({ ...prev, address: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile No.</label>
                                    <input type="tel" value={newContractor.mobileNo} onChange={(e) => setNewContractor(prev => ({ ...prev, mobileNo: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Agency Type</label>
                                    <select value={newContractor.agencyType} onChange={(e) => setNewContractor(prev => ({ ...prev, agencyType: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                        <option value="">-- Select --</option>
                                        <option value="Proprietorship">Proprietorship</option>
                                        <option value="Partnership">Partnership</option>
                                        <option value="Private Limited">Private Limited</option>
                                        <option value="Public Limited">Public Limited</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GST No.</label>
                                <input type="text" value={newContractor.gstNo} onChange={(e) => setNewContractor(prev => ({ ...prev, gstNo: e.target.value.toUpperCase() }))} placeholder="e.g. 24AAAAA0000A1Z5" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono uppercase" />
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button type="button" onClick={handleCloseContractorModal} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold">Cancel</button>
                                <button type="submit" disabled={contractorSaving} className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                                    {contractorSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {contractorSaving ? 'Saving...' : editingContractorId ? 'Save Changes' : 'Save Contractor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BANK ADD MODAL */}
            {isBankModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                            <h3 className="text-sm font-bold text-slate-800">Add New Bank</h3>
                            <button type="button" onClick={() => setIsBankModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateBank} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bank Name *</label>
                                <input type="text" required value={newBankName} onChange={(e) => setNewBankName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsBankModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold">Cancel</button>
                                <button type="submit" disabled={bankSaving} className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                                    {bankSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {bankSaving ? 'Saving Bank...' : 'Save Bank'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
