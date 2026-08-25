'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, Save, Edit2, Plus, Trash2, CheckCircle2, XCircle, X, Loader2, 
    Calendar, FileText, Settings, Award, Check, ChevronDown, ChevronUp, ListPlus, Printer, 
    Receipt, DollarSign, Eye, AlertCircle, FileCheck, Layers, ClipboardCheck,
    Briefcase, FileSpreadsheet, Percent, Building2, User2, Clock, Upload, CreditCard, CheckSquare, TrendingUp
} from 'lucide-react';
import { parseDateStr, formatDate, formatDateForInput, formatShortDate } from '@/lib/dateUtils';
import SearchableSelect from '@/components/SearchableSelect';
import BillForm from '@/components/BillForm';

const blobViewUrl = (url?: string) =>
    url && url.startsWith('http') ? `/api/blob?url=${encodeURIComponent(url)}` : url || '#';

interface PackageDetailClientProps {
    packageId: string;
    pkg: any;
    approvedWorks: any[];
    dtp: any;
    tender: any;
    tenders?: any[];
    boq: any;
    approval: any;
    loa: any;
    workOrder: any;
    bills: any[];
    excessProposals?: any[];
    depositRefunds?: any[];
    maxAgreementNos?: Record<string, number>;
}

type SectionType = 'package' | 'dtp' | 'tender' | 'boq' | 'approval' | 'loa' | 'workOrder' | 'bills' | 'depositRefund';

export default function PackageDetailClient({
    packageId,
    pkg: initialPkg,
    approvedWorks,
    dtp: initialDtp,
    tender: initialTender,
    tenders: initialTenders = [],
    boq: initialBoq,
    approval: initialApproval,
    loa: initialLoa,
    workOrder: initialWorkOrder,
    bills: initialBills,
    excessProposals: initialExcessProposals = [],
    depositRefunds: initialDepositRefunds = [],
    maxAgreementNos = {},
}: PackageDetailClientProps) {
    const router = useRouter();

    // States for data
    const [pkg, setPkg] = useState(initialPkg);
    const [dtp, setDtp] = useState(initialDtp);
    const [tender, setTender] = useState(initialTender);
    const [tenders, setTenders] = useState<any[]>(initialTenders || []);
    const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);
    const [boq, setBoq] = useState(initialBoq);
    const [isBoqExpanded, setIsBoqExpanded] = useState<boolean>(false);
    const [boqForm, setBoqForm] = useState<any>({ items: [], totalAmount: 0 });
    const [parsingBoq, setParsingBoq] = useState(false);
    const [approval, setApproval] = useState(initialApproval);
    const [loa, setLoa] = useState(initialLoa);
    const [workOrder, setWorkOrder] = useState(initialWorkOrder);
    const [bills, setBills] = useState(initialBills);
    const [excessProposals, setExcessProposals] = useState<any[]>(initialExcessProposals || []);
    const [depositRefunds, setDepositRefunds] = useState<any[]>(initialDepositRefunds || []);

    const additionalSdRefund = useMemo(() => {
        return depositRefunds.find((dr: any) => dr.refundType === 'Additional SD') || null;
    }, [depositRefunds]);

    const [additionalSdForm, setAdditionalSdForm] = useState<any>({
        orderNo: '',
        orderDate: '',
        applicationRef: '',
        applicationDate: '',
        actualCompletionDate: '',
        bankName: '',
        fdrNumber: '',
        fdrDate: '',
        amount: '',
        status: 'Pending',
        remarks: '',
    });

    // Excess Proposal modal states
    const [isExcessModalOpen, setIsExcessModalOpen] = useState(false);
    const [editingExcessProposal, setEditingExcessProposal] = useState<any | null>(null);
    const [uploadingExcessPdf, setUploadingExcessPdf] = useState(false);
    const [savingExcessProposal, setSavingExcessProposal] = useState(false);
    const [deletingExcessId, setDeletingExcessId] = useState<string | null>(null);
    const [excessForm, setExcessForm] = useState({
        proposalNo: '',
        proposalDate: new Date().toISOString().split('T')[0],
        pdfUrl: '',
        fileName: '',
        fileSize: 0,
        remarks: '',
        status: 'Submitted',
    });

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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('openBill') === 'true' || window.location.hash === '#bill-form-section') {
                setIsBillModalOpen(true);
                setTimeout(() => {
                    const el = document.getElementById('package-bill-form-section');
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 200);
            }
        }
    }, []);

    const findApprovedWork = useCallback((workName: string) => {
        if (!approvedWorks || !workName) return null;
        const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const target = normalize(workName);
        return approvedWorks.find((aw: any) => normalize(aw.workName) === target);
    }, [approvedWorks]);

    const displayedSubDivision = useMemo(() => {
        if (pkg.subDivision) return pkg.subDivision;
        const firstWorkName = pkg.works && pkg.works[0]?.workName;
        if (firstWorkName) {
            const aw = findApprovedWork(firstWorkName);
            if (aw?.subDivision) return aw.subDivision;
        }
        return '';
    }, [pkg, findApprovedWork]);

    const displayedWorkType = useMemo(() => {
        if (pkg.workType) return pkg.workType;
        const firstWorkName = pkg.works && pkg.works[0]?.workName;
        if (firstWorkName) {
            const aw = findApprovedWork(firstWorkName);
            if (aw?.workType) return aw.workType;
        }
        return '';
    }, [pkg, findApprovedWork]);

    const getLengthOrChainage = useCallback((aw: any) => {
        if (!aw) return '-';
        const parts = [];
        if (aw.length) parts.push(`${aw.length} K.M.`);
        if (aw.chainage) parts.push(aw.chainage);
        return parts.length > 0 ? parts.join(' / ') : '-';
    }, []);

    // Form states
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

    // Dropdown dependency states
    const [banks, setBanks] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [buildingTypeOptions, setBuildingTypeOptions] = useState<string[]>([]);
    const [isAddingNewBuildingType, setIsAddingNewBuildingType] = useState(false);
    const [newBuildingTypeValue, setNewBuildingTypeValue] = useState('');
    const [budgetHeadOptions, setBudgetHeadOptions] = useState<string[]>([]);
    const [isAddingNewBudgetHead, setIsAddingNewBudgetHead] = useState(false);
    const [newBudgetHeadValue, setNewBudgetHeadValue] = useState('');
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


    // Package Edit Works States
    const [availableWorks, setAvailableWorks] = useState<any[]>([]);
    const [allPackagesData, setAllPackagesData] = useState<any[]>([]);
    const [tsNotRequiredCheckbox, setTsNotRequiredCheckbox] = useState(false);
    const [currentSelectionId, setCurrentSelectionId] = useState('');

    // Tender Fee Modal States
    const [isTenderFeeModalOpen, setIsTenderFeeModalOpen] = useState(false);
    const [tenderFeeBidders, setTenderFeeBidders] = useState<any[]>([]);
    const [savingTenderFee, setSavingTenderFee] = useState(false);

    // Bill Modal States
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [isReTenderModalOpen, setIsReTenderModalOpen] = useState(false);
    const [reTenderReason, setReTenderReason] = useState('');
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

    // PDF Parse States
    const [parsingTenderPdf, setParsingTenderPdf] = useState(false);
    const [parsedBidders, setParsedBidders] = useState<any[]>([]);
    const [parsedTenderInfo, setParsedTenderInfo] = useState<any>(null);
    const [isBiddersModalOpen, setIsBiddersModalOpen] = useState(false);

    // Sync state with props
    useEffect(() => {
        setPkg(initialPkg);
        setDtp(initialDtp);
        setTender(initialTender);
        setTenders(initialTenders || []);
        setApproval(initialApproval);
        setLoa(initialLoa);
        setWorkOrder(initialWorkOrder);
        setBills(initialBills);
        setExcessProposals(initialExcessProposals || []);
        setDepositRefunds(initialDepositRefunds || []);
    }, [initialPkg, initialDtp, initialTender, initialTenders, initialApproval, initialLoa, initialWorkOrder, initialBills, initialExcessProposals, initialDepositRefunds]);

    // Sync selectedTrialId state when active tender or tenders change
    useEffect(() => {
        if (tender?._id) {
            setSelectedTrialId(tender._id);
        } else if (tenders && tenders.length > 0) {
            setSelectedTrialId(tenders[0]._id);
        } else {
            setSelectedTrialId(null);
        }
    }, [tender, tenders]);

    // Fetch banks & agencies & building types
    useEffect(() => {
        const fetchDeps = async () => {
            try {
                const [bankRes, agencyRes, buildingRes] = await Promise.all([
                    fetch('/api/banks'),
                    fetch('/api/agencies'),
                    fetch('/api/metadata/building-types')
                ]);
                const bankData = await bankRes.json();
                const agencyData = await agencyRes.json();
                if (bankData.success) setBanks(bankData.data);
                if (agencyData.success) setAgencies(agencyData.data);

                if (buildingRes.ok) {
                    const dbBuildingTypes = await buildingRes.json();
                    const DEFAULT_BUILDING_TYPES = [
                        "Residential",
                        "Non-Residential",
                        "Hospital",
                        "School",
                        "Office"
                    ];
                    const initialBuildingType = pkg.buildingType ? [pkg.buildingType] : [];
                    const combined = Array.from(new Set([...DEFAULT_BUILDING_TYPES, ...initialBuildingType, ...dbBuildingTypes])).sort();
                    setBuildingTypeOptions(combined);
                }

                const budgetRes = await fetch('/api/metadata/budget-heads');
                if (budgetRes.ok) {
                    const dbBudgetHeads = await budgetRes.json();
                    const initialBudgetHead = pkg.budgetHead ? [pkg.budgetHead] : [];
                    const combined = Array.from(new Set([...initialBudgetHead, ...dbBudgetHeads])).filter(Boolean).sort();
                    setBudgetHeadOptions(combined as string[]);
                }
            } catch (err) {
                console.error("Failed to load drop down details", err);
            }
        };
        fetchDeps();
    }, [pkg.buildingType, pkg.budgetHead]);

    // Get unassigned Technical Sanctions for Package Edit mode
    const fetchAvailableWorks = async () => {
        try {
            const [resTS, resPackages] = await Promise.all([
                fetch('/api/technical-sanctions'),
                fetch('/api/packages?limit=1000')
            ]);
            const dataTS = await resTS.json();
            const dataPackages = await resPackages.json();

            if (dataTS.success && dataPackages.success) {
                const assignedWorkIds = new Set<string>();
                dataPackages.data
                    .filter((p: any) => p._id !== packageId)
                    .forEach((p: any) => {
                        if (p.works && Array.isArray(p.works)) {
                            p.works.forEach((w: any) => {
                                if (w.workId) assignedWorkIds.add(String(w.workId));
                            });
                        }
                    });

                setAllPackagesData(dataPackages.data);
                const givenTS = dataTS.data.filter((ts: any) => 
                    ts.tsDate && 
                    ts.tsAmount && 
                    !assignedWorkIds.has(String(ts._id))
                );
                setAvailableWorks(givenTS);
            }
        } catch (error) {
            console.error("Failed to fetch available works", error);
        }
    };

    const handleBuildingTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'ADD_NEW') {
            setIsAddingNewBuildingType(true);
        } else {
            setPkgForm((prev: any) => ({ ...prev, buildingType: e.target.value }));
        }
    };

    const handleAddNewBuildingType = () => {
        if (newBuildingTypeValue.trim()) {
            const val = newBuildingTypeValue.trim();
            if (!buildingTypeOptions.includes(val)) {
                setBuildingTypeOptions(prev => [...prev, val].sort());
            }
            setPkgForm((prev: any) => ({ ...prev, buildingType: val }));
            setIsAddingNewBuildingType(false);
            setNewBuildingTypeValue('');
        }
    };

    const cancelAddNewBuildingType = () => {
        setIsAddingNewBuildingType(false);
        setNewBuildingTypeValue('');
    };

    const handleBudgetHeadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'ADD_NEW') {
            setIsAddingNewBudgetHead(true);
        } else {
            setPkgForm((prev: any) => ({ ...prev, budgetHead: e.target.value }));
        }
    };

    const handleAddNewBudgetHead = () => {
        if (newBudgetHeadValue.trim()) {
            const val = newBudgetHeadValue.trim();
            if (!budgetHeadOptions.includes(val)) {
                setBudgetHeadOptions(prev => [...prev, val].sort());
            }
            setPkgForm((prev: any) => ({ ...prev, budgetHead: val }));
            setIsAddingNewBudgetHead(false);
            setNewBudgetHeadValue('');
        }
    };

    const cancelAddNewBudgetHead = () => {
        setIsAddingNewBudgetHead(false);
        setNewBudgetHeadValue('');
    };

    // Auto-inherit Budget Head from selected approved works if same
    useEffect(() => {
        if (!pkgForm.works || pkgForm.works.length === 0 || approvedWorks.length === 0 || editingSection !== 'package') return;

        const normalize = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim();
        
        const matchedBudgetHeads = pkgForm.works.map((sw: any) => {
            const normalizedName = normalize(sw.workName);
            const aw = approvedWorks.find((aw: any) => normalize(aw.workName) === normalizedName);
            return aw?.budgetHead || null;
        }).filter(Boolean);

        if (matchedBudgetHeads.length > 0) {
            const first = matchedBudgetHeads[0];
            const allSame = matchedBudgetHeads.every((bh: string) => bh === first);
            if (allSame && first) {
                setPkgForm((prev: any) => ({ ...prev, budgetHead: first }));
            }
        }
    }, [pkgForm.works, approvedWorks, editingSection]);

    // Toggle Edit Modes
    const handleStartEdit = (section: SectionType) => {
        setEditingSection(section);
        if (section === 'package') {
            fetchAvailableWorks();
            setPkgForm({
                packageName: pkg.packageName || '',
                subDivision: pkg.subDivision || '',
                workType: pkg.workType || '',
                buildingType: pkg.buildingType || '',
                dtpConsultant: pkg.dtpConsultant || '',
                works: pkg.works || [],
                budgetHead: pkg.budgetHead || '',
                committee: pkg.committee || '',
                committeeDate: pkg.committeeDate ? formatDateForInput(pkg.committeeDate) : '',
            });
        } else if (section === 'dtp') {
            setDtpForm({
                tsId: packageId,
                dtpSendingNo: dtp?.dtpSendingNo || '',
                dtpSendingDate: dtp?.dtpSendingDate ? formatDateForInput(dtp.dtpSendingDate) : '',
                dtpApprovingAuthority: dtp?.dtpApprovingAuthority || '',
                dtpApprovalNo: dtp?.dtpApprovalNo || '',
                dtpApprovalDate: dtp?.dtpApprovalDate ? formatDateForInput(dtp.dtpApprovalDate) : '',
                tenderAmount: dtp?.tenderAmount || '',
                remarks: dtp?.remarks || '',
            });
        } else if (section === 'tender') {
            const latestTender = tenders && tenders.length > 0 ? tenders[0] : null;
            const nextTrialNo = latestTender ? (latestTender.trialNo || 1) + 1 : 1;
            setTenderForm({
                packageId: packageId,
                packageName: pkg.packageName || '',
                tenderId: tender?.tenderId || latestTender?.tenderId || '',
                tenderNoticeYear: tender?.tenderNoticeYear || latestTender?.tenderNoticeYear || '2026-27',
                noticeNo: tender?.noticeNo || latestTender?.noticeNo || '',
                srNo: tender?.srNo || latestTender?.srNo || '',
                trialNo: tender?.trialNo || nextTrialNo,
                tenderCreationDate: tender?.tenderCreationDate ? formatDateForInput(tender.tenderCreationDate) : '',
                lastDateOfSubmission: tender?.lastDateOfSubmission ? formatDateForInput(tender.lastDateOfSubmission) : '',
                tenderValidityDate: tender?.tenderValidityDate ? formatDateForInput(tender.tenderValidityDate) : '',
                reInvite: tender?.reInvite || (latestTender ? true : false),
                cancelled: tender?.cancelled || false,
                cancellationReason: tender?.cancellationReason || '',
                contractorName: tender?.contractorName || '',
                contractPrice: tender?.contractPrice || '',
                aboveBelowPercentage: tender?.aboveBelowPercentage || '',
                aboveBelowInWord: tender?.aboveBelowInWord === 'Equals' ? 'At Par' : (tender?.aboveBelowInWord || 'Below'),
                remarks: tender?.remarks || '',
            });
        } else if (section === 'boq') {
            setBoqForm({
                items: boq?.items ? JSON.parse(JSON.stringify(boq.items)) : [],
                totalAmount: boq?.totalAmount || 0
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
        } else if (section === 'depositRefund') {
            const finalBill = bills?.find((b: any) => b.billType === 'Final' || b.actualCompletionDate);
            const defActualDate = finalBill?.actualCompletionDate
                ? formatDateForInput(finalBill.actualCompletionDate)
                : (workOrder?.stipulatedCompletionDate ? formatDateForInput(workOrder.stipulatedCompletionDate) : '');

            setAdditionalSdForm({
                _id: additionalSdRefund?._id || undefined,
                packageId: packageId,
                workOrderId: workOrder?._id || undefined,
                refundType: 'Additional SD',
                orderNo: additionalSdRefund?.orderNo || '219',
                orderDate: additionalSdRefund?.orderDate ? formatDateForInput(additionalSdRefund.orderDate) : formatDateForInput(new Date()),
                applicationRef: additionalSdRefund?.applicationRef || (tender?.contractorName ? `${tender.contractorName} ની અરજી` : ''),
                applicationDate: additionalSdRefund?.applicationDate ? formatDateForInput(additionalSdRefund.applicationDate) : '',
                actualCompletionDate: additionalSdRefund?.actualCompletionDate ? formatDateForInput(additionalSdRefund.actualCompletionDate) : defActualDate,
                bankName: additionalSdRefund?.bankName || workOrder?.additionalSecurityDepositBankName || '',
                fdrNumber: additionalSdRefund?.fdrNumber || workOrder?.additionalSecurityDepositNumber || '',
                fdrDate: additionalSdRefund?.fdrDate ? formatDateForInput(additionalSdRefund.fdrDate) : (workOrder?.additionalSecurityDepositDate ? formatDateForInput(workOrder.additionalSecurityDepositDate) : ''),
                amount: additionalSdRefund?.amount !== undefined && additionalSdRefund?.amount !== null ? additionalSdRefund.amount : (workOrder?.additionalSecurityDepositAmount || ''),
                status: additionalSdRefund?.status || 'Pending',
                remarks: additionalSdRefund?.remarks || '',
            });
        }
    };

    const handleCancelEdit = () => {
        setEditingSection(null);
    };

    const handleSaveAdditionalSdRefund = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...additionalSdForm,
                packageId,
                workOrderId: workOrder?._id || undefined,
                refundType: 'Additional SD',
            };
            if (payload.orderDate) payload.orderDate = parseDateStr(payload.orderDate)?.toISOString() || payload.orderDate;
            if (payload.applicationDate) payload.applicationDate = parseDateStr(payload.applicationDate)?.toISOString() || payload.applicationDate;
            if (payload.actualCompletionDate) payload.actualCompletionDate = parseDateStr(payload.actualCompletionDate)?.toISOString() || payload.actualCompletionDate;
            if (payload.fdrDate) payload.fdrDate = parseDateStr(payload.fdrDate)?.toISOString() || payload.fdrDate;
            if (payload.amount !== undefined && payload.amount !== '') payload.amount = Number(payload.amount);

            const res = await fetch('/api/deposit-refunds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Failed to save Deposit Refund details.');

            showToast('success', 'Additional SD Refund details saved successfully!');
            setEditingSection(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Generic form handlers
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

    // Package add/remove works inline handlers
    const handleAddWorkToPkg = () => {
        if (!currentSelectionId) return;

        if (tsNotRequiredCheckbox) {
            const workToAdd = approvedWorks.find(w => w._id === currentSelectionId);
            if (workToAdd) {
                const isAlreadyAdded = pkgForm.works?.some((sw: any) => sw.workName === workToAdd.workName);
                if (isAlreadyAdded) {
                    alert("Work already added to this package.");
                    return;
                }
                setPkgForm((prev: any) => ({
                    ...prev,
                    works: [...(prev.works || []), {
                        workId: null,
                        workName: workToAdd.workName,
                        amount: (workToAdd.jobNumberAmount || 0) * 100000,
                        tsNotRequired: true
                    }]
                }));
                setCurrentSelectionId('');
            }
        } else {
            const workToAdd = availableWorks.find(w => w._id === currentSelectionId);
            if (workToAdd) {
                const isAlreadyAdded = pkgForm.works?.some((sw: any) => {
                    const swId = sw.workId && typeof sw.workId === 'object' ? sw.workId._id : sw.workId;
                    return String(swId) === String(workToAdd._id);
                });
                if (isAlreadyAdded) {
                    alert("Work already added to this package.");
                    return;
                }
                setPkgForm((prev: any) => ({
                    ...prev,
                    works: [...(prev.works || []), {
                        workId: workToAdd,
                        workName: workToAdd.workName,
                        amount: (workToAdd.tsAmount || 0) * 100000,
                        tsNotRequired: false
                    }]
                }));
                setCurrentSelectionId('');
            }
        }
    };

    const handleRemoveWorkFromPkg = (workName: string, workIdStr: string | null) => {
        setPkgForm((prev: any) => ({
            ...prev,
            works: (prev.works || []).filter((w: any) => {
                const id = w.workId && typeof w.workId === 'object' ? w.workId._id : w.workId;
                if (workIdStr && String(id) === String(workIdStr)) return false;
                if (w.workName === workName) return false;
                return true;
            })
        }));
    };

    // Save Handlers
    const handleSavePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const sanitizedWorks = pkgForm.works.map((w: any) => ({
                workId: w.workId && typeof w.workId === 'object' ? w.workId._id : w.workId,
                workName: w.workName,
                amount: w.amount,
                tsNotRequired: w.tsNotRequired || false
            }));
            const submissionData = {
                ...pkgForm,
                buildingType: pkgForm.workType === 'Building' ? pkgForm.buildingType : undefined,
                works: sanitizedWorks,
                committeeDate: pkgForm.committeeDate ? (parseDateStr(pkgForm.committeeDate)?.toISOString() || pkgForm.committeeDate) : null,
            };
            const res = await fetch(`/api/packages/${packageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });
            if (!res.ok) throw new Error("Failed to save Package details.");
            showToast('success', 'Package details updated successfully!');
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
            const data = { ...dtpForm, tsId: packageId };
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

    const handleExecuteReTender = async (reason: string) => {
        if (!tender) return;
        setLoading(true);
        try {
            // 1. Cancel the current tender
            const cancelRes = await fetch(`/api/tenders/${tender._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    cancelled: true, 
                    cancellationReason: reason 
                }),
            });
            if (!cancelRes.ok) throw new Error("Failed to cancel current tender.");

            // 2. Create the new tender trial
            const newTenderData = {
                packageId: packageId,
                packageName: pkg.packageName,
                tenderNoticeYear: tender.tenderNoticeYear || '2026-27',
                trialNo: (Number(tender.trialNo) || 1) + 1,
                reInvite: true,
                cancelled: false,
                cancellationReason: '',
                contractorName: '',
                contractPrice: '',
                aboveBelowPercentage: '',
                aboveBelowInWord: 'Below',
                remarks: `Re-tender (Trial #${(Number(tender.trialNo) || 1) + 1}) after cancellation: ${reason}`
            };

            const createRes = await fetch('/api/tenders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTenderData),
            });
            if (!createRes.ok) throw new Error("Failed to create new tender trial.");

            showToast('success', 'Re-tender trial created successfully!');
            setIsReTenderModalOpen(false);
            setEditingSection(null);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBoqAddItem = () => {
        setBoqForm((prev: any) => ({
            ...prev,
            items: [...prev.items, { itemNo: '', description: '', quantity: 0, unit: '', rate: 0, amount: 0, itemType: 'Standard' }]
        }));
    };

    const handleBoqRemoveItem = (index: number) => {
        const newItems = [...boqForm.items];
        newItems.splice(index, 1);
        const total = newItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
        setBoqForm((prev: any) => ({ ...prev, items: newItems, totalAmount: total }));
    };

    const handleBoqItemChange = (index: number, field: string, value: any) => {
        const newItems = [...boqForm.items];
        const item = { ...newItems[index], [field]: value };
        
        // Auto calculate amount
        if (field === 'quantity' || field === 'rate') {
            item.amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
        }

        newItems[index] = item;
        const total = newItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
        setBoqForm((prev: any) => ({ ...prev, items: newItems, totalAmount: total }));
    };

    const handleBoqPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setParsingBoq(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await fetch('/api/boqs/parse-pdf', {
                method: 'POST',
                body: uploadData
            });
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                const parsedItems = data.data.map((item: any) => ({
                    ...item,
                    itemType: item.itemType || 'Standard'
                }));
                const newItems = [...boqForm.items, ...parsedItems];
                const total = newItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
                setBoqForm((prev: any) => ({ ...prev, items: newItems, totalAmount: total }));
                showToast('success', `Parsed ${parsedItems.length} items from PDF successfully!`);
            } else {
                showToast('error', 'Could not extract any items from the PDF.');
            }
        } catch (error) {
            console.error(error);
            showToast('error', 'Error parsing PDF');
        } finally {
            setParsingBoq(false);
        }
    };

    const handleTenderPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setParsingTenderPdf(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await fetch('/api/tenders/parse-pdf', {
                method: 'POST',
                body: uploadData
            });
            const data = await res.json();
            if (data.success && data.bidders && data.bidders.length > 0) {
                const bidders = data.bidders;
                const info = data.tenderInfo;
                setParsedBidders(bidders);
                setParsedTenderInfo(info);

                // Auto-fill from L1 bidder
                const l1 = bidders.find((b: any) => b.rank === 'L1') || bidders[0];
                setTenderForm((prev: any) => ({
                    ...prev,
                    tenderId: prev.tenderId || info?.tenderId || '',
                    tenderNoticeYear: prev.tenderNoticeYear || info?.noticeYear || '2026-27',
                    noticeNo: prev.noticeNo || info?.noticeNo || '',
                    srNo: prev.srNo || info?.srNo || '',
                    contractorName: l1.contractorName || '',
                    aboveBelowInWord: l1.aboveBelow === 'EQUALS' ? 'At Par' : (l1.aboveBelow === 'ABOVE' ? 'Above' : 'Below'),
                    aboveBelowPercentage: l1.percentage !== undefined ? l1.percentage : '',
                    contractPrice: l1.totalAmount !== undefined ? l1.totalAmount : '',
                    bidders: bidders.map((b: any) => ({
                        rank: b.rank,
                        contractorName: b.contractorName,
                        aboveBelow: b.aboveBelow,
                        percentage: b.percentage,
                        totalAmount: b.totalAmount,
                    })),
                }));

                setIsBiddersModalOpen(true);
                showToast('success', `Parsed ${bidders.length} bidders — form auto-filled from ${l1.rank}.`);
            } else {
                showToast('error', data.error || 'Could not extract any comparative bidder details from the PDF.');
            }
        } catch (error) {
            console.error(error);
            showToast('error', 'Error parsing PDF');
        } finally {
            setParsingTenderPdf(false);
            e.target.value = '';
        }
    };

    const handleOpenTenderFeeModal = () => {
        if (!displayTender || !displayTender.bidders || displayTender.bidders.length === 0) {
            showToast('error', 'No bidders found for this tender trial. Please add or import bidders first.');
            return;
        }
        const todayStr = formatShortDate(new Date());
        setTenderFeeBidders(displayTender.bidders.map((b: any) => ({
            ...b,
            tenderFeeBankName: b.tenderFeeBankName || '',
            tenderFeeDdNo: b.tenderFeeDdNo || '',
            tenderFeeDdDate: b.tenderFeeDdDate ? formatShortDate(b.tenderFeeDdDate) : '',
            tenderFeeDdAmount: b.tenderFeeDdAmount !== undefined && b.tenderFeeDdAmount !== null ? b.tenderFeeDdAmount : '',
            tenderFeeChallanDate: b.tenderFeeChallanDate ? formatShortDate(b.tenderFeeChallanDate) : todayStr,
        })));
        setIsTenderFeeModalOpen(true);
    };

    const handleTenderFeeChange = (index: number, field: string, value: any) => {
        setTenderFeeBidders((prev: any[]) => prev.map((item, idx) => {
            if (idx === index) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleSaveTenderFees = async () => {
        if (!displayTender) return;
        setSavingTenderFee(true);
        try {
            const updatedBidders = tenderFeeBidders.map((b: any) => {
                const bidderObj: any = {
                    rank: b.rank,
                    contractorName: b.contractorName,
                    aboveBelow: b.aboveBelow,
                    percentage: b.percentage,
                    totalAmount: b.totalAmount,
                    tenderFeeBankName: b.tenderFeeBankName || '',
                    tenderFeeDdNo: b.tenderFeeDdNo || '',
                    tenderFeeDdAmount: b.tenderFeeDdAmount !== '' ? Number(b.tenderFeeDdAmount) : undefined,
                };
                if (b.tenderFeeDdDate) {
                    const p = parseDateStr(b.tenderFeeDdDate);
                    if (p) bidderObj.tenderFeeDdDate = p.toISOString();
                }
                if (b.tenderFeeChallanDate) {
                    const p = parseDateStr(b.tenderFeeChallanDate);
                    if (p) bidderObj.tenderFeeChallanDate = p.toISOString();
                }
                return bidderObj;
            });

            const res = await fetch(`/api/tenders/${displayTender._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bidders: updatedBidders }),
            });
            if (!res.ok) throw new Error('Failed to save Tender Fee details.');
            showToast('success', 'Tender Fee details saved successfully!');
            setIsTenderFeeModalOpen(false);
            router.refresh();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSavingTenderFee(false);
        }
    };

    const handleSaveBoq = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tender) return;
        if (boqForm.items.length === 0) {
            showToast('error', 'Please add at least one item');
            return;
        }

        setLoading(true);
        try {
            const data = {
                tenderId: tender._id,
                items: boqForm.items,
                totalAmount: boqForm.totalAmount
            };
            const url = boq ? `/api/boqs/${boq._id}` : `/api/boqs`;
            const method = boq ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save BOQ details.");
            const resData = await res.json();
            showToast('success', 'BOQ details saved successfully!');
            setBoq(resData.data);
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
            const data = { ...tenderForm, packageId: packageId, packageName: pkg.packageName };
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
        setTimeout(() => {
            const el = document.getElementById('package-bill-form-section');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

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

        const it = netPaySafe > 0 ? Math.ceil((netPaySafe * 0.02) / 10) * 10 : 0;
        const gst = it; // GST equal to Income Tax (IT)
        const cess = netPaySafe > 0 ? Math.ceil((netPaySafe * 0.01) / 10) * 10 : 0;

        const contractPrice = tender?.contractPrice || tender?.estimatedAmount || 0;
        const sdBase = netPaySafe > 0 ? Math.ceil((netPaySafe * 0.06) / 100) * 100 : 0;
        const sdMax = contractPrice > 0 ? Math.ceil((contractPrice * 0.05) / 100) * 100 : 0;
        const sd = sdMax > 0 ? Math.min(sdBase, sdMax) : sdBase;
        const isBuilding = String(pkg?.workType || '').toLowerCase().includes('building');
        const fmd = isBuilding ? 0 : (netPaySafe > 0 ? Math.ceil((netPaySafe * 0.05) / 100) * 100 : 0);
        const currentBHead = String(pkg?.budgetHead || '').trim().toLowerCase();
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
            if (name === 'incomeTax') {
                next.gst = val;
            }
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

            if (!res.ok) throw new Error("Failed to save bill.");
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

    const handleOpenAddExcessModal = () => {
        setEditingExcessProposal(null);
        setExcessForm({
            proposalNo: '',
            proposalDate: new Date().toISOString().split('T')[0],
            pdfUrl: '',
            fileName: '',
            fileSize: 0,
            remarks: '',
            status: 'Submitted',
        });
        setIsExcessModalOpen(true);
    };

    const handleOpenEditExcessModal = (p: any) => {
        setEditingExcessProposal(p);
        setExcessForm({
            proposalNo: p.proposalNo || '',
            proposalDate: p.proposalDate ? new Date(p.proposalDate).toISOString().split('T')[0] : '',
            pdfUrl: p.pdfUrl || '',
            fileName: p.fileName || '',
            fileSize: p.fileSize || 0,
            remarks: p.remarks || '',
            status: p.status || 'Submitted',
        });
        setIsExcessModalOpen(true);
    };

    const handleExcessPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingExcessPdf(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'excess-proposals');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to upload PDF');
            }

            setExcessForm(prev => ({
                ...prev,
                pdfUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
            }));
            showToast('success', 'PDF uploaded successfully.');
        } catch (err: any) {
            showToast('error', err.message || 'Error uploading file');
        } finally {
            setUploadingExcessPdf(false);
        }
    };

    const handleSaveExcessProposal = async (e: React.FormEvent) => {
        e.preventDefault();

        setSavingExcessProposal(true);
        try {
            const url = editingExcessProposal 
                ? `/api/excess-proposals/${editingExcessProposal._id}` 
                : '/api/excess-proposals';
            const method = editingExcessProposal ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...excessForm,
                    packageId,
                    workOrderId: workOrder?._id,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save proposal');
            }

            if (editingExcessProposal) {
                setExcessProposals(prev => prev.map(p => (p._id === editingExcessProposal._id ? data.data : p)));
                showToast('success', 'Excess Proposal updated successfully.');
            } else {
                setExcessProposals(prev => [data.data, ...prev]);
                showToast('success', 'Excess Proposal created successfully.');
            }

            setIsExcessModalOpen(false);
        } catch (err: any) {
            showToast('error', err.message || 'Error saving proposal');
        } finally {
            setSavingExcessProposal(false);
        }
    };

    const handleDeleteExcessProposal = async (id: string, proposalNo: string) => {
        if (!confirm(`Are you sure you want to delete Excess Proposal "${proposalNo}"?`)) return;

        setDeletingExcessId(id);
        try {
            const res = await fetch(`/api/excess-proposals/${id}`, {
                method: 'DELETE',
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete proposal');
            }

            setExcessProposals(prev => prev.filter(p => p._id !== id));
            showToast('success', 'Excess Proposal deleted successfully.');
        } catch (err: any) {
            showToast('error', err.message || 'Error deleting proposal');
        } finally {
            setDeletingExcessId(null);
        }
    };



    const sortedBills = useMemo(() => {
        if (!bills || !Array.isArray(bills)) return [];
        return [...bills].sort((a, b) => {
            const timeA = a.billDate ? new Date(a.billDate).getTime() : 0;
            const timeB = b.billDate ? new Date(b.billDate).getTime() : 0;
            if (timeA !== timeB) {
                return timeA - timeB;
            }
            const numA = parseInt(a.runningBillNumber || '0', 10) || 0;
            const numB = parseInt(b.runningBillNumber || '0', 10) || 0;
            return numA - numB;
        });
    }, [bills]);

    const pkgOptions = useMemo(() => {
        if (tsNotRequiredCheckbox) {
            return approvedWorks
                .filter(aw => {
                    const inCurrent = pkgForm.works?.some((sw: any) => sw.workName === aw.workName);
                    if (inCurrent) return false;
                    const inOther = allPackagesData.some((p: any) => 
                        p._id !== packageId && p.works?.some((w: any) => w.workName === aw.workName)
                    );
                    return !inOther;
                })
                .map(aw => ({
                    _id: aw._id,
                    packageName: aw.workName,
                    'TS Amount': 'T.S. Not Required'
                }));
        } else {
            return availableWorks
                .filter(w => !pkgForm.works?.some((sw: any) => {
                    const swId = sw.workId && typeof sw.workId === 'object' ? sw.workId._id : sw.workId;
                    return String(swId) === String(w._id);
                }))
                .map(w => ({
                    _id: w._id,
                    packageName: w.workName,
                    'TS Amount': w.tsAmount ? `₹${w.tsAmount} Lacs` : 'N/A'
                }));
        }
    }, [availableWorks, pkgForm.works, tsNotRequiredCheckbox, approvedWorks, allPackagesData, packageId]);

    const displayTender = useMemo(() => {
        if (!selectedTrialId) return null;
        return tenders.find((t: any) => t._id === selectedTrialId) || null;
    }, [selectedTrialId, tenders]);

    return (
        <div className="space-y-5 pb-16">
            {/* Top Toolbar */}
            <div className="bg-emerald-600 border border-emerald-700 p-4 rounded-2xl shadow-sm text-white">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/packages" className="p-2 hover:bg-emerald-700 bg-emerald-700/40 text-white rounded-xl transition-all border border-emerald-400/40 shadow-2xs flex-shrink-0 cursor-pointer" title="Back to Packages">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-lg md:text-xl font-extrabold text-white break-words">
                            {pkg.packageName}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Loader & Toast */}
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-slate-100">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <span className="text-sm font-semibold text-slate-700">Updating package details...</span>
                    </div>
                </div>
            )}

            {toast.visible && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border transition-all duration-300 ${
                    toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                    <span className="text-sm font-semibold">{toast.message}</span>
                </div>
            )}

            {/* STACKED SECTION CARDS */}
            <div className="space-y-5">

                {/* 1. Package Overview Card (Full Width) */}
                <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden hover:shadow-md transition-all">
                    <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Package Identification & Works</h3>
                        {editingSection !== 'package' && (
                            <button onClick={() => handleStartEdit('package')} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer">
                                <Edit2 className="w-3.5 h-3.5" /> Modify Package
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
                                                    <input type="text" value={pkgForm.packageName} onChange={(e) => setPkgForm((prev: any) => ({ ...prev, packageName: e.target.value }))} required className="excel-cell-input" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Sub Division</td>
                                                <td className="excel-value w-[30%]">
                                                    <select value={pkgForm.subDivision} onChange={(e) => setPkgForm((prev: any) => ({ ...prev, subDivision: e.target.value }))} className="excel-cell-select">
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
                                                    <select value={pkgForm.dtpConsultant} onChange={(e) => setPkgForm((prev: any) => ({ ...prev, dtpConsultant: e.target.value }))} className="excel-cell-select">
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
                                                <td className="excel-label">Work Type</td>
                                                <td className="excel-value w-[30%]" colSpan={pkgForm.workType === 'Building' ? 1 : 3}>
                                                    <select
                                                        value={pkgForm.workType || ''}
                                                        onChange={(e) => setPkgForm((prev: any) => ({
                                                            ...prev,
                                                            workType: e.target.value,
                                                            buildingType: e.target.value === 'Building' ? prev.buildingType : ''
                                                        }))}
                                                        className="excel-cell-select"
                                                    >
                                                        <option value="">-- Select Work Type --</option>
                                                        <option value="Road">Road</option>
                                                        <option value="Building">Building</option>
                                                        <option value="Structure">Structure</option>
                                                        <option value="Service">Service</option>
                                                    </select>
                                                </td>
                                                {pkgForm.workType === 'Building' && (
                                                    <>
                                                        <td className="excel-label">Building Type</td>
                                                        <td className="excel-value w-[30%]">
                                                            {isAddingNewBuildingType ? (
                                                                <div className="flex gap-1 items-center px-1 py-0.5">
                                                                    <input
                                                                        type="text"
                                                                        className="excel-cell-input bg-emerald-100/60 w-full border border-emerald-200 rounded px-1.5 py-0.5 text-xs"
                                                                        value={newBuildingTypeValue}
                                                                        onChange={(e) => setNewBuildingTypeValue(e.target.value)}
                                                                        placeholder="New type..."
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                handleAddNewBuildingType();
                                                                            } else if (e.key === 'Escape') {
                                                                                e.preventDefault();
                                                                                cancelAddNewBuildingType();
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleAddNewBuildingType}
                                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-0.5 text-[10px] font-semibold cursor-pointer"
                                                                    >
                                                                        Add
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={cancelAddNewBuildingType}
                                                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded px-2 py-0.5 text-[10px] font-semibold cursor-pointer"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <select
                                                                    value={pkgForm.buildingType || ''}
                                                                    onChange={handleBuildingTypeChange}
                                                                    className="excel-cell-select"
                                                                >
                                                                    <option value="">-- Select Building Type --</option>
                                                                    {buildingTypeOptions.map(option => (
                                                                        <option key={option} value={option}>{option}</option>
                                                                    ))}
                                                                    <option value="ADD_NEW" className="text-emerald-700 font-bold">+ Add New Building Type</option>
                                                                </select>
                                                            )}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Budget Head</td>
                                                <td className="excel-value" colSpan={3}>
                                                    {isAddingNewBudgetHead ? (
                                                        <div className="flex gap-1 items-center px-1 py-0.5">
                                                            <input
                                                                type="text"
                                                                className="excel-cell-input bg-emerald-100/60 w-full border border-emerald-200 rounded px-1.5 py-0.5 text-xs"
                                                                value={newBudgetHeadValue}
                                                                onChange={(e) => setNewBudgetHeadValue(e.target.value)}
                                                                placeholder="New budget head..."
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        handleAddNewBudgetHead();
                                                                    } else if (e.key === 'Escape') {
                                                                        e.preventDefault();
                                                                        cancelAddNewBudgetHead();
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleAddNewBudgetHead}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-0.5 text-[10px] font-semibold cursor-pointer"
                                                            >
                                                                Add
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelAddNewBudgetHead}
                                                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded px-2 py-0.5 text-[10px] font-semibold cursor-pointer"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={pkgForm.budgetHead || ''}
                                                            onChange={handleBudgetHeadChange}
                                                            className="excel-cell-select font-medium"
                                                        >
                                                            <option value="">-- Select Budget Head --</option>
                                                            {budgetHeadOptions.map(option => (
                                                                <option key={option} value={option}>{option}</option>
                                                            ))}
                                                            <option value="ADD_NEW" className="text-emerald-700 font-bold">+ Add New Budget Head</option>
                                                        </select>
                                                    )}
                                                </td>
                                            </tr>
                                            {/* Committee Section */}
                                            {(() => {
                                                const isBuilding = (pkgForm.workType || '').trim().toLowerCase() === 'building';
                                                const bhRaw = (pkgForm.budgetHead || '').trim();
                                                const bh = bhRaw.toLowerCase();
                                                const cp = tender?.contractPrice || 0;
                                                
                                                let autoCommittee = '';
                                                if (isBuilding) {
                                                    autoCommittee = cp >= 3000000 ? 'Karobari' : 'Bandhkam Committee';
                                                } else if (!bhRaw) {
                                                    autoCommittee = '';
                                                } else {
                                                    const bandhkamBudgets = ['15th finance commission', '2515 cdp-5', 'dp own fund', 'ddo shri pravas grant', 'icds', 'pending'];
                                                    const karobariBudgets = ['3054 s.r.', 'buj', 'pending'];
                                                    const isBandhkam = cp < 3000000 && bandhkamBudgets.some(b => bh.includes(b));
                                                    const isKarobari = cp >= 3000000 && karobariBudgets.some(b => bh.includes(b));
                                                    autoCommittee = isBandhkam ? 'Bandhkam Committee' : isKarobari ? 'Karobari' : 'Not Required';
                                                }
                                                // Sync auto-determined value into form
                                                if (autoCommittee && pkgForm.committee !== autoCommittee) {
                                                    setTimeout(() => setPkgForm((prev: any) => ({ ...prev, committee: autoCommittee })), 0);
                                                }
                                                const showDate = autoCommittee === 'Bandhkam Committee' || autoCommittee === 'Karobari';
                                                return (
                                                    <>
                                                        <tr>
                                                            <td className="excel-label">Committee Required</td>
                                                            <td className="excel-value" colSpan={3}>
                                                                {autoCommittee ? (
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                                        autoCommittee === 'Bandhkam Committee'
                                                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                                            : autoCommittee === 'Karobari'
                                                                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                                                            : 'bg-slate-100 text-slate-500 border border-slate-300'
                                                                    }`}>
                                                                        {autoCommittee}
                                                                    </span>
                                                                ) : (
                                                                    <select
                                                                        value={pkgForm.committee || ''}
                                                                        onChange={(e) => setPkgForm((prev: any) => ({ ...prev, committee: e.target.value }))}
                                                                        className="excel-cell-select"
                                                                    >
                                                                        <option value="">-- Select Committee --</option>
                                                                        <option value="Bandhkam Committee">Bandhkam Committee</option>
                                                                        <option value="Karobari">Karobari</option>
                                                                        <option value="Not Required">Not Required</option>
                                                                    </select>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {/* Show date only for Bandhkam / Karobari */}
                                                        {showDate && (
                                                            <tr>
                                                                <td className="excel-label">Committee Date</td>
                                                                <td className="excel-value" colSpan={3}>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="DD/MM/YYYY"
                                                                        value={pkgForm.committeeDate || ''}
                                                                        onChange={(e) => setPkgForm((prev: any) => ({ ...prev, committeeDate: e.target.value }))}
                                                                        onPaste={(e) => {
                                                                            const pasted = e.clipboardData.getData('text');
                                                                            if (pasted) {
                                                                                const formatted = formatDateForInput(pasted.trim());
                                                                                if (formatted) {
                                                                                    e.preventDefault();
                                                                                    setPkgForm((prev: any) => ({ ...prev, committeeDate: formatted }));
                                                                                }
                                                                            }
                                                                        }}
                                                                        onBlur={() => {
                                                                            if (pkgForm.committeeDate) {
                                                                                const formatted = formatDateForInput(pkgForm.committeeDate.trim());
                                                                                if (formatted) {
                                                                                    setPkgForm((prev: any) => ({ ...prev, committeeDate: formatted }));
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="excel-cell-input"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Assigned Works in Package</h4>
                                    
                                    <div className="flex items-end gap-3 mb-4">
                                        <div className="flex-grow">
                                            <SearchableSelect 
                                                label="Add Work to Package"
                                                options={pkgOptions}
                                                value={currentSelectionId}
                                                onChange={(id) => setCurrentSelectionId(id)}
                                                placeholder="Search works..."
                                                helperField="TS Amount"
                                                inputClassName="bg-transparent border-emerald-200"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <input 
                                                type="checkbox" 
                                                id="detailTsNotRequiredCheckbox" 
                                                checked={tsNotRequiredCheckbox} 
                                                onChange={(e) => {
                                                    setTsNotRequiredCheckbox(e.target.checked);
                                                    setCurrentSelectionId('');
                                                }} 
                                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="detailTsNotRequiredCheckbox" className="text-xs font-bold text-slate-700 select-none">T.S. Not Required</label>
                                        </div>
                                        <button type="button" onClick={handleAddWorkToPkg} disabled={!currentSelectionId} className="px-4 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold disabled:opacity-50 h-[38px] flex items-center cursor-pointer transition-all">Add</button>
                                    </div>

                                    {/* Table: Approved Work Details (Consolidated) */}
                                    <div className="mb-6">
                                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Works Details (Administrative Sanction & T.S. details)</h5>
                                        <div className="overflow-x-auto">
                                            <table className="excel-table">
                                                <thead>
                                                    <tr className="bg-emerald-100 text-emerald-950">
                                                        <th className="border border-emerald-300 px-3 py-1.5 w-12 text-center bg-emerald-100 text-emerald-950 font-bold">Sr.</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-emerald-950 font-bold">Name of Work</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-center w-24 text-emerald-950 font-bold">Year of Approval</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-center w-28 text-emerald-950 font-bold">Budget Head</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-right w-28 text-emerald-950 font-bold">Job Number Amount (Lakh)</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-center w-28 text-emerald-950 font-bold">Approval Date</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-center w-28 text-emerald-950 font-bold">Work Type</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 w-16 text-center bg-emerald-100 text-emerald-950 font-bold">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pkgForm.works?.map((w: any, i: number) => {
                                                        const aw = findApprovedWork(w.workName);
                                                        const appYear = aw?.approvalYear || '-';
                                                        const bHead = aw?.budgetHead || '-';
                                                        const jobAmt = aw?.jobNumberAmount !== undefined ? `₹${Number(aw.jobNumberAmount).toFixed(2)}` : '-';
                                                        const appDate = aw?.jobNumberApprovalDate ? formatShortDate(aw.jobNumberApprovalDate) : '-';
                                                        const wType = aw?.workType || '-';
                                                        const keyId = w.workId && typeof w.workId === 'object' ? w.workId._id : w.workId;

                                                        return (
                                                            <tr key={keyId || w.workName} className="hover:bg-slate-50">
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-600">{i + 1}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-800">{w.workName}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-medium text-slate-600">{appYear}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{bHead}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-slate-700 font-semibold">{jobAmt} Lacs</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-600">{appDate}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{wType}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => {
                                                                                setPkgForm((prev: any) => ({
                                                                                    ...prev,
                                                                                    works: prev.works.map((item: any, idx: number) => {
                                                                                        if (idx === i) {
                                                                                            return { ...item, tsNotRequired: !item.tsNotRequired };
                                                                                        }
                                                                                        return item;
                                                                                    })
                                                                                }));
                                                                            }} 
                                                                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                                                                w.tsNotRequired 
                                                                                    ? 'bg-amber-100 border-amber-300 text-amber-800' 
                                                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                                            }`}
                                                                        >
                                                                            {w.tsNotRequired ? 'TS Not Req' : 'TS Req'}
                                                                        </button>
                                                                        <button type="button" onClick={() => handleRemoveWorkFromPkg(w.workName, keyId)} className="text-rose-600 p-1 hover:bg-rose-50 rounded-lg cursor-pointer">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {(!pkgForm.works || pkgForm.works.length === 0) && (
                                                        <tr>
                                                            <td colSpan={8} className="border border-slate-200 px-4 py-6 text-center text-slate-400 italic">No works linked yet.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer">Save Package</button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Sub-Division</td>
                                                <td className="excel-value w-[30%]">{displayedSubDivision || '-'}</td>
                                                <td className="excel-label">DTP Consultant</td>
                                                <td className="excel-value w-[30%]">{pkg.dtpConsultant || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Work Type</td>
                                                <td className="excel-value w-[30%]" colSpan={pkg.workType === 'Building' ? 1 : 3}>{displayedWorkType || '-'}</td>
                                                {pkg.workType === 'Building' && (
                                                    <>
                                                        <td className="excel-label">Building Type</td>
                                                        <td className="excel-value w-[30%]">{pkg.buildingType || '-'}</td>
                                                    </>
                                                )}
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Budget Head</td>
                                                <td className="excel-value" colSpan={3}>{pkg.budgetHead || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Committee Required</td>
                                                <td className="excel-value" colSpan={3}>
                                                    {pkg.committee ? (
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                            pkg.committee === 'Bandhkam Committee'
                                                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                                : pkg.committee === 'Karobari'
                                                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                                                : 'bg-slate-100 text-slate-500 border border-slate-300'
                                                        }`}>
                                                            {pkg.committee}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">Not determined</span>
                                                    )}
                                                </td>
                                            </tr>
                                            {/* Show Committee Date only for Bandhkam Committee or Karobari */}
                                            {(pkg.committee === 'Bandhkam Committee' || pkg.committee === 'Karobari') && (
                                                <tr>
                                                    <td className="excel-label">Committee Date</td>
                                                    <td className="excel-value" colSpan={3}>
                                                        {pkg.committeeDate ? formatDate(pkg.committeeDate) : '-'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 space-y-6">
                                    <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-2">Assigned Works ({pkg.works?.length || 0})</span>
                                    
                                    {/* Table: Approved Work Details (Consolidated) */}
                                    <div>
                                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Works Details (Administrative Sanction & T.S. details)</h5>
                                        <div className="overflow-x-auto">
                                            <table className="excel-table">
                                                <thead>
                                                    <tr className="bg-emerald-100 text-emerald-950">
                                                        <th className="border border-emerald-300 px-3 py-1.5 w-12 text-center bg-emerald-100 text-emerald-950 font-bold">Sr. No.</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-emerald-950 font-bold">Name of Work</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-center w-24 text-emerald-950 font-bold">Year of Approval</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-center w-28 text-emerald-950 font-bold">Budget Head</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-right w-28 text-emerald-950 font-bold">Job Number Amount (Lakh)</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-center w-28 text-emerald-950 font-bold">Approval Date</th>
                                                        <th className="border border-emerald-300 px-3 py-1.5 bg-emerald-100 text-center w-28 text-emerald-950 font-bold">Work Type</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pkg.works?.map((work: any, i: number) => {
                                                        const aw = findApprovedWork(work.workName);
                                                        const appYear = aw?.approvalYear || '-';
                                                        const bHead = aw?.budgetHead || '-';
                                                        const jobAmt = aw?.jobNumberAmount !== undefined ? `₹${Number(aw.jobNumberAmount).toFixed(2)}` : '-';
                                                        const appDate = aw?.jobNumberApprovalDate ? formatShortDate(work.jobNumberApprovalDate || aw?.jobNumberApprovalDate) : '-';
                                                        const wType = aw?.workType || '-';
                                                        const keyId = work.workId && typeof work.workId === 'object' ? work.workId._id : work.workId;

                                                        return (
                                                            <tr key={keyId || work.workName} className="hover:bg-slate-50">
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-600">{i + 1}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-800">{work.workName}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-medium text-slate-600">{appYear}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{bHead}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-slate-700 font-semibold">{jobAmt} Lacs</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-600">{appDate}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{wType}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {(!pkg.works || pkg.works.length === 0) && (
                                                        <tr>
                                                            <td colSpan={7} className="border border-slate-200 px-4 py-6 text-center text-slate-400 italic">No works linked yet.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* ROW 1: DTP Approval Details and Tender Details Side by Side (Equal Height) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                    {/* 2. DTP Approval Section */}
                    <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col h-full">
                        <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800">DTP Approval Details</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    dtp ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {dtp ? '✅ Done' : '⏳ Pending'}
                                </span>
                            </div>
                            {editingSection !== 'dtp' && (
                                <button onClick={() => handleStartEdit('dtp')} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer">
                                    {dtp ? <><Edit2 className="w-3.5 h-3.5" /> Modify DTP</> : <><Plus className="w-3.5 h-3.5" /> Add DTP</>}
                                </button>
                            )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                            {editingSection === 'dtp' ? (
                                <form onSubmit={handleSaveDtp} className="space-y-4">
                                    <div className="overflow-x-auto">
                                        <table className="excel-table">
                                            <tbody>
                                                <tr>
                                                    <td className="excel-label">WS No. of Sending DTP for Approval</td>
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
                                                    <td className="excel-value w-[30%]">
                                                        <input type="number" name="tenderAmount" value={dtpForm.tenderAmount} onChange={handleDtpFieldChange} step="0.01" className="excel-cell-input text-right font-mono" />
                                                    </td>
                                                    <td className="excel-label">DTP Approving Authority</td>
                                                    <td className="excel-value">
                                                        <select name="dtpApprovingAuthority" value={dtpForm.dtpApprovingAuthority} onChange={handleDtpFieldChange} className="excel-cell-select">
                                                            <option value="">-- Select --</option>
                                                            <option value="Executive Engineer (EE)">Executive Engineer (EE)</option>
                                                            <option value="The Superintending Engineer, Panchayat Road and Building Circle - 2, Rajkot.">The Superintending Engineer, Rajkot.</option>
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
                                        <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer">Save DTP</button>
                                    </div>
                                </form>
                            ) : dtp ? (
                                <div>
                                    <div className="overflow-x-auto">
                                        <table className="excel-table">
                                            <tbody>
                                                <tr>
                                                    <td className="excel-label">WS No. of Sending DTP for Approval</td>
                                                    <td className="excel-value w-[30%] font-mono">{dtp.dtpSendingNo || '-'}</td>
                                                    <td className="excel-label">DTP Sending Date</td>
                                                    <td className="excel-value w-[30%]">{dtp.dtpSendingDate ? new Date(dtp.dtpSendingDate).toLocaleDateString('en-GB') : '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="excel-label">Tender Amount</td>
                                                    <td className="excel-value w-[30%] text-emerald-800 font-bold font-mono">₹{dtp.tenderAmount ? dtp.tenderAmount.toLocaleString('en-IN') : '-'}</td>
                                                    <td className="excel-label">DTP Approving Authority</td>
                                                    <td className="excel-value">{dtp.dtpApprovingAuthority || '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="excel-label">DTP Approval No.</td>
                                                    <td className="excel-value font-mono">{dtp.dtpApprovalNo || '-'}</td>
                                                    <td className="excel-label">DTP Approval Date</td>
                                                    <td className="excel-value">{dtp.dtpApprovalDate ? new Date(dtp.dtpApprovalDate).toLocaleDateString('en-GB') : '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="excel-label">Remarks</td>
                                                    <td className="excel-value" colSpan={3}>{dtp.remarks || '-'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-emerald-200/60 flex justify-end gap-3">
                                        <Link 
                                            href={`/packages/${packageId}/print-forwarding-letter`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 px-4 py-2 rounded-xl transition-all cursor-pointer"
                                        >
                                            <FileText className="w-4 h-4" /> Generate Forwarding Letter
                                        </Link>
                                        <Link 
                                            href={`/packages/${packageId}/print-dtp-order`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 px-4 py-2 rounded-xl transition-all cursor-pointer"
                                        >
                                            <Printer className="w-4 h-4" /> Generate DTP Order
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-emerald-200 rounded-2xl bg-emerald-100/40">
                                    <AlertCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                    <p className="text-slate-500 font-semibold text-sm">DTP approval details are pending.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Tender Section */}
                    <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col h-full">
                        <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800">Tender Details</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    tender ? (tender.cancelled ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800') : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {tender ? (tender.cancelled ? '🚫 Cancelled' : '✅ Done') : '⏳ Pending'}
                                </span>
                                {tenders && tenders.length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                        {tenders.length} {tenders.length === 1 ? 'attempt' : 'attempts'}
                                    </span>
                                )}
                            </div>
                            {editingSection !== 'tender' && (
                                <button onClick={() => handleStartEdit('tender')} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer">
                                    {tender ? <><Edit2 className="w-3.5 h-3.5" /> Modify Tender</> : <><Plus className="w-3.5 h-3.5" /> Add Tender</>}
                                </button>
                            )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                            {editingSection === 'tender' ? (
                                <form onSubmit={handleSaveTender} className="space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800">💡 Import from PDF</h4>
                                            <p className="text-[10px] text-slate-500 mt-0.5">Upload nProcure comparative statement PDF to auto-fill bidder details.</p>
                                        </div>
                                        <div>
                                            <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl cursor-pointer transition-all">
                                                {parsingTenderPdf ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        Parsing PDF...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-3.5 h-3.5" />
                                                        Upload Tender PDF
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={handleTenderPdfUpload}
                                                    disabled={parsingTenderPdf}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    </div>
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
                                                        <select name="tenderNoticeYear" value={tenderForm.tenderNoticeYear} onChange={handleTenderFieldChange} className="excel-cell-select">
                                                            <option value="2024-25">2024-25</option>
                                                            <option value="2025-26">2025-26</option>
                                                            <option value="2026-27">2026-27</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="excel-label">Notice / Sr No.</td>
                                                    <td className="excel-value">
                                                        <div className="flex gap-1 items-center">
                                                            <input type="text" name="noticeNo" placeholder="Notice" value={tenderForm.noticeNo} onChange={handleTenderFieldChange} className="excel-cell-input w-2/3" />
                                                            <span className="text-slate-400">/</span>
                                                            <input type="text" name="srNo" placeholder="Sr" value={tenderForm.srNo} onChange={handleTenderFieldChange} className="excel-cell-input w-1/3" />
                                                        </div>
                                                    </td>
                                                    <td className="excel-label">Trial No.</td>
                                                    <td className="excel-value">
                                                        <input type="number" name="trialNo" value={tenderForm.trialNo} onChange={handleTenderFieldChange} className="excel-cell-input font-mono" />
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="excel-label">Creation Date</td>
                                                    <td className="excel-value">
                                                        <input type="text" placeholder="DD/MM/YYYY" name="tenderCreationDate" value={tenderForm.tenderCreationDate} onChange={handleTenderFieldChange} className="excel-cell-input" />
                                                    </td>
                                                    <td className="excel-label">Last Submission Date</td>
                                                    <td className="excel-value">
                                                        <input type="text" placeholder="DD/MM/YYYY" name="lastDateOfSubmission" value={tenderForm.lastDateOfSubmission} onChange={handleTenderFieldChange} className="excel-cell-input" />
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="excel-label">Tender Validity Date</td>
                                                    <td className="excel-value bg-amber-100/40 font-mono text-slate-700 px-3 py-2 font-bold select-none">{tenderForm.tenderValidityDate || '-'}</td>
                                                    <td className="excel-label">Tender Cancelled</td>
                                                    <td className="excel-value">
                                                        <div className="flex items-center gap-4 px-2">
                                                            <input type="checkbox" name="cancelled" checked={tenderForm.cancelled} onChange={handleTenderFieldChange} className="w-4 h-4 text-emerald-600 border-slate-300 rounded cursor-pointer animate-none" />
                                                            {tenderForm.cancelled && (
                                                                <select name="cancellationReason" value={tenderForm.cancellationReason} onChange={handleTenderFieldChange} className="excel-cell-select py-0.5 border-amber-200">
                                                                    <option value="">-- Reason --</option>
                                                                    <option value="High Rate">High Rate</option>
                                                                    <option value="Single Bidder">Single Bidder</option>
                                                                    <option value="Technical Ground">Technical Ground</option>
                                                                    <option value="Administrative Ground">Administrative Ground</option>
                                                                </select>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="excel-label">Agency / Contractor</td>
                                                    <td className="excel-value" colSpan={3}>
                                                        <div className="flex gap-2 items-center p-1">
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
                                                                    inputClassName="bg-transparent border-emerald-200"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1 items-end">
                                                                <button type="button" onClick={() => { setEditingContractorId(null); setIsContractorModalOpen(true); }} className="text-[10px] font-bold text-emerald-700 hover:underline flex-shrink-0 cursor-pointer">+ New Contractor</button>
                                                                {tenderForm.contractorName && (
                                                                    <button type="button" onClick={handleOpenEditContractor} className="text-[10px] font-bold text-amber-600 hover:underline flex-shrink-0 cursor-pointer">Edit Contractor</button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {tenderForm.contractorName && (() => {
                                                            const sel = agencies.find(a => a.name === tenderForm.contractorName);
                                                            if (!sel) return null;
                                                            return (
                                                                <div className="mt-1 px-2 py-1 bg-amber-100/50 border border-amber-200 rounded text-[11px] text-slate-700 flex flex-wrap gap-x-4 gap-y-0.5 font-normal">
                                                                    {sel.proprietorName && <span><strong>Proprietor:</strong> {sel.proprietorName}</span>}
                                                                    {sel.mobileNo && <span><strong>Mobile:</strong> {sel.mobileNo}</span>}
                                                                    {sel.gstNo && <span><strong>GST No:</strong> <code className="font-mono font-bold text-slate-700">{sel.gstNo}</code></span>}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="excel-label">Above / Below (Word)</td>
                                                    <td className="excel-value">
                                                        <select name="aboveBelowInWord" value={tenderForm.aboveBelowInWord} onChange={handleTenderFieldChange} className="excel-cell-select">
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
                                                    <td className="excel-value font-bold font-mono text-emerald-800" colSpan={3}>
                                                        <input type="number" name="contractPrice" value={tenderForm.contractPrice} onChange={handleTenderFieldChange} step="0.01" className="excel-cell-input font-bold text-emerald-800 text-right font-mono" />
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="excel-label">Remarks</td>
                                                    <td className="excel-value" colSpan={3}>
                                                        <textarea name="remarks" value={tenderForm.remarks} onChange={handleTenderFieldChange} rows={2} className="excel-cell-input" />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        {tender && (
                                            <button type="button" onClick={() => { setIsReTenderModalOpen(true); setReTenderReason(''); }} className="mr-auto px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold cursor-pointer">Re-Tender</button>
                                        )}
                                        <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                        <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer">Save Tender</button>
                                    </div>
                                </form>
                            ) : displayTender ? (
                                <div className="overflow-x-auto space-y-4">
                                    {/* Trial/Attempt selection tabs */}
                                    {tenders && tenders.length > 1 && (
                                        <div className="flex flex-wrap gap-2 mb-4 border-b border-emerald-200/60 pb-3">
                                            {tenders.map((t: any) => {
                                                const isSel = t._id === selectedTrialId;
                                                return (
                                                    <button
                                                        key={t._id}
                                                        type="button"
                                                        onClick={() => setSelectedTrialId(t._id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                                            isSel
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                                : t.cancelled
                                                                ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                                                                : 'bg-emerald-100/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                                        }`}
                                                    >
                                                        Trial #{t.trialNo} {t.cancelled ? '🚫' : '✅'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {displayTender.cancelled && (
                                        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs font-semibold text-rose-800 mb-2">
                                            🚫 <strong>Tender Cancelled (Trial #{displayTender.trialNo}):</strong> {displayTender.cancellationReason || 'No reason specified'}
                                        </div>
                                    )}

                                    {!tender && (
                                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs font-semibold text-amber-800 mb-2 animate-none">
                                            ⏳ <strong>No Active Tender:</strong> All previous trials have been cancelled. Click "Add Tender" to start a new trial.
                                        </div>
                                    )}

                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Tender ID</td>
                                                <td className="excel-value w-[30%]">{displayTender.tenderId || '-'}</td>
                                                <td className="excel-label">Tender Notice Year</td>
                                                <td className="excel-value w-[30%]">{displayTender.tenderNoticeYear || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Notice / Sr No.</td>
                                                <td className="excel-value">
                                                    No: {displayTender.noticeNo || '-'} &nbsp;|&nbsp; Sr: {displayTender.srNo || '-'}
                                                </td>
                                                <td className="excel-label">Trial No.</td>
                                                <td className="excel-value font-mono">{displayTender.trialNo || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Creation Date</td>
                                                <td className="excel-value">{displayTender.tenderCreationDate ? new Date(displayTender.tenderCreationDate).toLocaleDateString('en-GB') : '-'}</td>
                                                <td className="excel-label">Last Submission Date</td>
                                                <td className="excel-value">{displayTender.lastDateOfSubmission ? new Date(displayTender.lastDateOfSubmission).toLocaleDateString('en-GB') : '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Tender Validity Date</td>
                                                <td className="excel-value font-mono">{displayTender.tenderValidityDate ? new Date(displayTender.tenderValidityDate).toLocaleDateString('en-GB') : '-'}</td>
                                                <td className="excel-label">Contractor Name</td>
                                                <td className="excel-value">{displayTender.contractorName || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Above / Below %</td>
                                                <td className="excel-value font-mono">
                                                    {displayTender.aboveBelowPercentage !== undefined ? `${displayTender.aboveBelowPercentage}% ${displayTender.aboveBelowInWord || ''}` : '-'}
                                                </td>
                                                <td className="excel-label">Final Contract Price</td>
                                                <td className="excel-value text-emerald-800 font-bold font-mono">₹{displayTender.contractPrice ? displayTender.contractPrice.toLocaleString('en-IN') : '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Remarks</td>
                                                <td className="excel-value" colSpan={3}>{displayTender.remarks || '-'}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {/* Comparative Bidders Table */}
                                    {displayTender.bidders && displayTender.bidders.length > 0 && (
                                        <div className="mt-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                                                    Comparative Statement — All Bidders
                                                </h4>
                                                <button 
                                                    type="button" 
                                                    onClick={handleOpenTenderFeeModal}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                                                >
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    Manage Tender Fees
                                                </button>
                                            </div>
                                            <div className="border border-emerald-200 rounded-xl overflow-hidden shadow-2xs">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead>
                                                        <tr className="bg-emerald-100/90 text-emerald-950 font-bold border-b border-emerald-200">
                                                            <th className="px-3 py-2 text-center w-[8%] text-emerald-950">Rank</th>
                                                            <th className="px-3 py-2 text-emerald-950">Name of Party</th>
                                                            <th className="px-3 py-2 text-right w-[15%] text-emerald-950">Above / Below</th>
                                                            <th className="px-3 py-2 text-right w-[15%] text-emerald-950">Percentage (%)</th>
                                                            <th className="px-3 py-2 text-right w-[20%] text-emerald-950">Total Amount (₹)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-emerald-100">
                                                        {displayTender.bidders.map((b: any, idx: number) => {
                                                            const isWinner = b.contractorName === displayTender.contractorName;
                                                            return (
                                                                <tr key={idx} className={`transition-colors ${isWinner ? 'bg-emerald-100/60' : 'hover:bg-emerald-50/60'}`}>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                            isWinner ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
                                                                        }`}>
                                                                            {b.rank}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-slate-800 font-medium">
                                                                        {b.contractorName}
                                                                        {isWinner && <span className="ml-2 text-[9px] font-bold text-emerald-800 bg-emerald-200 px-1.5 py-0.5 rounded-full">✓ Contract Awarded</span>}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right text-slate-600">{b.aboveBelow}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-slate-700 font-semibold">{b.percentage}%</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-emerald-800 font-semibold">{b.totalAmount ? `₹${b.totalAmount.toLocaleString('en-IN')}` : '-'}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-emerald-200 rounded-2xl bg-emerald-100/40">
                                    <AlertCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                    <p className="text-slate-500 font-semibold text-sm">Tender details are pending.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ROW 2: Tender Approval and Letter of Acceptance (LOA) Side by Side (Equal Height) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                    {/* 4. Tender Approval Section */}
                    <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col h-full">
                        <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800">Tender Approval</h3>
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
                            {editingSection !== 'approval' && (
                                <button 
                                    onClick={() => handleStartEdit('approval')}
                                    disabled={!tender || tender.cancelled} 
                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {approval ? <><Edit2 className="w-3.5 h-3.5" /> Modify Approval</> : <><Plus className="w-3.5 h-3.5" /> Add Approval</>}
                                </button>
                            )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
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
                                                                className="w-4 h-4 text-emerald-600 border-slate-200 rounded cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed" 
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
                                                                <select name="tenderApprovalOffice" value={approvalForm.tenderApprovalOffice} onChange={handleApprovalFieldChange} className="excel-cell-select">
                                                                    <option value="">-- Select Office --</option>
                                                                    <option value="Executive Engineer (EE)">Executive Engineer (EE)</option>
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
                                        <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer">Save Approval</button>
                                    </div>
                                </form>
                            ) : approval ? (
                                <div>
                                    {(approval.notRequired || isTenderApprovalNotRequired) ? (
                                        <div className="bg-emerald-100/60 border border-emerald-200 p-3 rounded-xl text-xs font-semibold text-emerald-900 italic">
                                            🚫 Tender Approval is marked as <strong>Not Required</strong> for this package.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
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
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-emerald-200 rounded-2xl bg-emerald-100/40">
                                    <AlertCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                    <p className="text-slate-500 font-semibold text-sm">Approval details are pending.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 5. LOA Issued Section */}
                    <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col h-full">
                        <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800">Letter of Acceptance (LOA)</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    loa ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {loa ? '✅ Done' : '⏳ Pending'}
                                </span>
                            </div>
                            {editingSection !== 'loa' && (
                                <button 
                                    onClick={() => handleStartEdit('loa')}
                                    disabled={!tender || tender.cancelled} 
                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {loa ? <><Edit2 className="w-3.5 h-3.5" /> Modify LOA</> : <><Plus className="w-3.5 h-3.5" /> Add LOA</>}
                                </button>
                            )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
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
                                                    <td className="excel-value" colSpan={3}>
                                                        <input type="number" name="workDurationMonths" value={loaForm.workDurationMonths} onChange={handleLoaFieldChange} className="excel-cell-input" />
                                                    </td>
                                                </tr>

                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                        <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer">Save LOA</button>
                                    </div>
                                </form>
                            ) : loa ? (
                                <>
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
                                                    <td className="excel-value" colSpan={3}>{loa.workDurationMonths ? `${loa.workDurationMonths} Months` : '-'}</td>
                                                </tr>

                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-emerald-200/60 flex justify-end">
                                        <Link 
                                            href={`/packages/${packageId}/print-loa`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 px-4 py-2 rounded-xl transition-all cursor-pointer"
                                        >
                                            <Printer className="w-4 h-4" /> Print LOA
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-emerald-200 rounded-2xl bg-emerald-100/40">
                                    <AlertCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                    <p className="text-slate-500 font-semibold text-sm">LOA details are pending.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 6. Work Order Section */}
                <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">Work Order & Deposits</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                workOrder?.notRequired 
                                    ? 'bg-slate-100 text-slate-800' 
                                    : workOrder ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                                {workOrder?.notRequired ? '🚫 Not Required' : workOrder ? '✅ Done' : '⏳ Pending'}
                            </span>
                        </div>
                        {editingSection !== 'workOrder' && (
                            <button 
                                onClick={() => handleStartEdit('workOrder')}
                                disabled={!loa} 
                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                                                            className="w-4 h-4 text-emerald-600 border-slate-200 rounded cursor-pointer" 
                                                        />
                                                        <span className="text-xs font-bold text-slate-700">Work Order Not Required</span>
                                                    </label>
                                                </td>
                                            </tr>
                                            {!woForm.notRequired && (
                                                <>
                                                    <tr className="bg-emerald-100/90">
                                                        <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-100/90 border-b border-emerald-200 text-left uppercase tracking-wider">Agreement Details</th>
                                                    </tr>
                                                    <tr>
                                                        <td className="excel-label">Agreement Year</td>
                                                        <td className="excel-value w-[30%]">
                                                            <select name="agreementYear" value={woForm.agreementYear} onChange={handleWoFieldChange} className="excel-cell-select">
                                                                <option value="2024-25">2024-25</option>
                                                                <option value="2025-26">2025-26</option>
                                                                <option value="2026-27">2026-27</option>
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

                                                    <tr className="bg-emerald-100/90">
                                                        <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-100/90 border-b border-emerald-200 text-left uppercase tracking-wider">Security Deposit Details</th>
                                                    </tr>
                                                    <tr>
                                                        <td className="excel-label">SD Type</td>
                                                        <td className="excel-value">
                                                            <select name="securityDepositType" value={woForm.securityDepositType} onChange={handleWoFieldChange} className="excel-cell-select">
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
                                                                        inputClassName="bg-transparent border-emerald-200"
                                                                    />
                                                                </div>
                                                                <button type="button" onClick={() => { setActiveBankField('security'); setIsBankModalOpen(true); }} className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 rounded-md whitespace-nowrap cursor-pointer hover:bg-emerald-700">+ Add</button>
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

                                                    <tr className="bg-emerald-100/90">
                                                        <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-100/90 border-b border-emerald-200 text-left uppercase tracking-wider">Additional Security Deposit (ASD)</th>
                                                    </tr>
                                                    <tr>
                                                        <td className="excel-label">ASD Type</td>
                                                        <td className="excel-value">
                                                            <select name="additionalSecurityDepositType" value={woForm.additionalSecurityDepositType} onChange={handleWoFieldChange} className="excel-cell-select">
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
                                                                        inputClassName="bg-transparent border-emerald-200"
                                                                    />
                                                                </div>
                                                                <button type="button" onClick={() => { setActiveBankField('additional'); setIsBankModalOpen(true); }} className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 rounded-md whitespace-nowrap cursor-pointer hover:bg-emerald-700">+ Add</button>
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

                                                    <tr className="bg-emerald-100/90">
                                                        <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-100/90 border-b border-emerald-200 text-left uppercase tracking-wider">Work Order Issuance Timelines</th>
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
                                                        <td className="excel-value font-semibold text-slate-700 bg-transparent px-3 py-2">
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
                                    <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer">Save Work Order</button>
                                </div>
                            </form>
                        ) : workOrder ? (
                            <div>
                                {workOrder.notRequired ? (
                                    <div className="bg-emerald-100/60 border border-emerald-200 p-3 rounded-xl text-xs font-semibold text-emerald-900 italic">
                                        🚫 Work Order is marked as <strong>Not Required</strong> for this package.
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="excel-table">
                                                <tbody>
                                                    <tr className="bg-emerald-100/90">
                                                        <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-100/90 border-b border-emerald-200 text-left uppercase tracking-wider">Agreement & Work Order</th>
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
                                                    <tr className="bg-emerald-100/90">
                                                        <th colSpan={4} className="px-4 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-100/90 border-b border-emerald-200 text-left uppercase tracking-wider">Security Deposits</th>
                                                    </tr>
                                                    <tr>
                                                        <td className="excel-label">Security Deposit</td>
                                                        <td className="excel-value font-mono" colSpan={3}>
                                                            Type: {workOrder.securityDepositType || '-'} &nbsp;|&nbsp; Bank: {workOrder.securityDepositBankName || '-'} &nbsp;|&nbsp; No: {workOrder.securityDepositNumber || '-'} &nbsp;|&nbsp; Amount: <strong className="text-emerald-900">₹{workOrder.securityDepositAmount?.toLocaleString('en-IN') || 0}</strong>
                                                        </td>
                                                    </tr>
                                                    {workOrder.additionalSecurityDepositAmount > 0 && (
                                                        <tr>
                                                            <td className="excel-label">Additional SD</td>
                                                            <td className="excel-value font-mono" colSpan={3}>
                                                                Type: {workOrder.additionalSecurityDepositType || '-'} &nbsp;|&nbsp; Bank: {workOrder.additionalSecurityDepositBankName || '-'} &nbsp;|&nbsp; No: {workOrder.additionalSecurityDepositNumber || '-'} &nbsp;|&nbsp; Amount: <strong className="text-emerald-900">₹{workOrder.additionalSecurityDepositAmount?.toLocaleString('en-IN') || 0}</strong>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-emerald-200/50 flex justify-end gap-3">
                                            <Link 
                                                href={`/packages/${packageId}/print-agreement`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 px-4 py-2 rounded-xl transition-all cursor-pointer"
                                            >
                                                <Printer className="w-4 h-4" /> Print Agreement
                                            </Link>
                                            <Link 
                                                href={`/packages/${packageId}/print-work-order`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 px-4 py-2 rounded-xl transition-all cursor-pointer"
                                            >
                                                <Printer className="w-4 h-4" /> Print Work Order
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-emerald-200 rounded-2xl bg-emerald-100/40">
                                <AlertCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">Work Order details are pending.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bill of Quantities (BOQ) Section */}
                <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">Bill of Quantities (BOQ)</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                boq ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                                {boq ? '✅ Done' : '⏳ Pending'}
                            </span>
                            {boq?.items && boq.items.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {boq.items.length} {boq.items.length === 1 ? 'item' : 'items'}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {boq && boq.items && boq.items.length > 0 && editingSection !== 'boq' && (
                                <button
                                    type="button"
                                    onClick={() => setIsBoqExpanded(!isBoqExpanded)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                                >
                                    {isBoqExpanded ? (
                                        <>
                                            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                                            Collapse Items
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                            Expand Items ({boq.items.length})
                                        </>
                                    )}
                                </button>
                            )}

                            {editingSection !== 'boq' && (
                                <button 
                                    onClick={() => handleStartEdit('boq')}
                                    disabled={!tender || tender.cancelled} 
                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {boq ? <><Edit2 className="w-3.5 h-3.5" /> Modify BOQ</> : <><Plus className="w-3.5 h-3.5" /> Add BOQ</>}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-6">
                        {!tender ? (
                            <div className="text-center py-6 border border-dashed border-emerald-200 rounded-2xl bg-emerald-100/40">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">Please complete Tender Details before adding BOQ.</p>
                            </div>
                        ) : editingSection === 'boq' ? (
                            <form onSubmit={handleSaveBoq} className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-emerald-100/50 border border-emerald-200 p-3.5 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">BOQ Line Items Editor</span>
                                        <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-semibold">
                                            {boqForm.items?.length || 0} items
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 shadow-2xs text-xs font-bold rounded-lg text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 transition-all">
                                            {parsingBoq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                            {parsingBoq ? 'Parsing PDF...' : 'Fetch from PDF'}
                                            <input type="file" className="hidden" accept=".pdf" onChange={handleBoqPdfUpload} disabled={parsingBoq} />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleBoqAddItem}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-transparent text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-colors cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Item
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-emerald-200 rounded-xl shadow-2xs">
                                    <table className="min-w-full divide-y divide-emerald-200">
                                        <thead className="bg-emerald-100/90 text-emerald-950">
                                            <tr>
                                                <th className="px-3 py-2 text-center text-[11px] font-bold text-emerald-950 uppercase tracking-wider w-20">No.</th>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold text-emerald-950 uppercase tracking-wider">Description of Item</th>
                                                <th className="px-3 py-2 text-right text-[11px] font-bold text-emerald-950 uppercase tracking-wider w-28">Qty</th>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold text-emerald-950 uppercase tracking-wider w-24">Unit</th>
                                                <th className="px-3 py-2 text-right text-[11px] font-bold text-emerald-950 uppercase tracking-wider w-28">Rate (₹)</th>
                                                <th className="px-3 py-2 text-right text-[11px] font-bold text-emerald-950 uppercase tracking-wider w-32">Amount (₹)</th>
                                                <th className="px-3 py-2 text-center text-[11px] font-bold text-emerald-950 uppercase tracking-wider w-28">Type</th>
                                                <th className="px-3 py-2 w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-transparent divide-y divide-emerald-200/60">
                                            {boqForm.items?.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-emerald-100/40 transition-colors">
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="text"
                                                            value={item.itemNo}
                                                            onChange={(e) => handleBoqItemChange(idx, 'itemNo', e.target.value)}
                                                            className="w-full text-center px-1.5 py-1 border border-emerald-200 rounded-md text-xs font-mono bg-emerald-100/60"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <textarea
                                                            value={item.description}
                                                            onChange={(e) => handleBoqItemChange(idx, 'description', e.target.value)}
                                                            className="w-full px-2 py-1 border border-emerald-200 rounded-md text-xs resize-y bg-emerald-100/60"
                                                            rows={1}
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleBoqItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                            className="w-full text-right px-2 py-1 border border-emerald-200 rounded-md text-xs font-mono bg-emerald-100/60"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="text"
                                                            value={item.unit}
                                                            onChange={(e) => handleBoqItemChange(idx, 'unit', e.target.value)}
                                                            className="w-full px-2 py-1 border border-emerald-200 rounded-md text-xs text-center bg-emerald-100/60"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="number"
                                                            value={item.rate}
                                                            onChange={(e) => handleBoqItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                                            className="w-full text-right px-2 py-1 border border-emerald-200 rounded-md text-xs font-mono bg-emerald-100/60"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right text-xs font-bold text-slate-800 font-mono">
                                                        ₹{item.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <select
                                                            value={item.itemType}
                                                            onChange={(e) => handleBoqItemChange(idx, 'itemType', e.target.value)}
                                                            className="w-full px-2 py-1 border border-emerald-200 rounded-md text-xs bg-emerald-100/60"
                                                        >
                                                            <option value="Standard">Standard</option>
                                                            <option value="Extra">Extra</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-1.5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleBoqRemoveItem(idx)}
                                                            className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                                            title="Delete Item"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center bg-emerald-100/60 p-4 rounded-xl border border-emerald-200">
                                    <span className="text-sm font-bold text-emerald-950">Total BOQ Amount (Excl. GST):</span>
                                    <span className="text-lg font-black text-emerald-900 font-mono">
                                        ₹{boqForm.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer">Save BOQ</button>
                                </div>
                            </form>
                        ) : boq ? (
                            <div className="space-y-4">
                                {/* Items Breakdown Table */}
                                {!isBoqExpanded ? (
                                    <div className="p-4 text-center text-xs text-slate-600 bg-emerald-100/50 border border-emerald-200 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setIsBoqExpanded(true)}
                                            className="inline-flex items-center gap-1.5 text-emerald-900 hover:text-emerald-950 font-bold hover:underline cursor-pointer"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                            {boq.items?.length || 0} BOQ line items collapsed. Click to expand full items breakdown.
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto border border-emerald-200 rounded-xl max-h-[500px] overflow-y-auto shadow-2xs">
                                        <table className="min-w-full divide-y divide-emerald-200 text-xs">
                                            <thead className="bg-emerald-100/90 text-emerald-950 sticky top-0 z-10">
                                                <tr className="text-emerald-950 font-bold">
                                                    <th className="px-3 py-2.5 text-center w-16 uppercase">Item No.</th>
                                                    <th className="px-4 py-2.5 text-left uppercase">Description of Item</th>
                                                    <th className="px-3 py-2.5 text-right w-24 uppercase">Qty</th>
                                                    <th className="px-3 py-2.5 text-center w-20 uppercase">Unit</th>
                                                    <th className="px-3 py-2.5 text-right w-28 uppercase">Rate (₹)</th>
                                                    <th className="px-4 py-2.5 text-right w-36 uppercase">Amount (₹)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-transparent divide-y divide-emerald-200/60">
                                                {(!boq.items || boq.items.length === 0) ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No BOQ items recorded.</td>
                                                    </tr>
                                                ) : (
                                                    boq.items.map((item: any, index: number) => (
                                                        <tr key={index} className="hover:bg-emerald-100/50 transition-colors">
                                                            <td className="px-3 py-2.5 text-center font-medium">
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className="font-mono font-semibold text-slate-800">{item.itemNo}</span>
                                                                    {item.itemType === 'Extra' && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                                                                            Extra
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-slate-700 leading-relaxed whitespace-pre-wrap">{item.description}</td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-slate-900 font-medium">{item.quantity != null ? Number(item.quantity).toLocaleString('en-IN') : '-'}</td>
                                                            <td className="px-3 py-2.5 text-center text-slate-500 font-medium">
                                                                <span className="px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-900 text-[11px]">{item.unit || '-'}</span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-slate-800">{item.rate != null ? `₹${Number(item.rate).toLocaleString('en-IN')}` : '-'}</td>
                                                            <td className="px-4 py-2.5 text-right font-bold text-emerald-900 font-mono text-xs">
                                                                {item.amount != null ? `₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                            {boq.items && boq.items.length > 0 && (
                                                <tfoot className="bg-emerald-200/80 text-emerald-950 font-bold border-t border-emerald-300">
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-2.5 text-right text-emerald-950 uppercase tracking-wider text-[11px]">Total BOQ Amount:</td>
                                                        <td className="px-4 py-2.5 text-right font-mono text-emerald-950 text-sm font-black">₹{boq.totalAmount?.toLocaleString('en-IN')}</td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-emerald-200 rounded-2xl bg-emerald-100/40">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">BOQ details are pending.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 7. Billing & Financials Section */}
                <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">Billing & Audit Memo</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                {bills ? bills.length : 0} Bills Logged
                            </span>
                        </div>
                        <button 
                            onClick={() => handleOpenBillModal(null)}
                            disabled={!workOrder}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 hover:scale-105 active:scale-95 px-3.5 py-1.5 rounded-lg border border-emerald-300 shadow-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" /> Log New Bill
                        </button>
                    </div>

                    <div className="p-6">
                        {sortedBills && sortedBills.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="excel-table">
                                    <thead>
                                        <tr className="bg-emerald-100/90 text-emerald-950">
                                            <th className="border border-emerald-300 px-4 py-2 bg-emerald-100/90 text-center w-20 text-emerald-950 font-bold">Bill No.</th>
                                            <th className="border border-emerald-300 px-4 py-2 bg-emerald-100/90 text-center w-24 text-emerald-950 font-bold">Type</th>
                                            <th className="border border-emerald-300 px-4 py-2 bg-emerald-100/90 text-center w-32 text-emerald-950 font-bold">Bill Date</th>
                                            <th className="border border-emerald-300 px-4 py-2 bg-emerald-100/90 text-center w-28 text-emerald-950 font-bold">Delay</th>
                                            <th className="border border-emerald-300 px-4 py-2 bg-emerald-100/90 text-right text-emerald-950 font-bold">Gross (₹)</th>
                                            <th className="border border-emerald-300 px-4 py-2 bg-emerald-100/90 text-right text-emerald-950 font-bold">Deductions (₹)</th>
                                            <th className="border border-emerald-300 px-4 py-2 bg-emerald-100/90 text-right text-emerald-950 font-bold">Net Paid (₹)</th>
                                            <th className="border border-emerald-300 px-4 py-2 bg-emerald-100/90 text-center w-36 text-emerald-950 font-bold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-emerald-200/60">
                                        {sortedBills.map((bill: any, idx: number) => (
                                            <tr key={bill._id} className="hover:bg-emerald-100/50">
                                                <td className="border border-slate-200 px-4 py-1.5 text-center font-mono font-semibold text-slate-800">{bill.runningBillNumber || idx + 1}</td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-center font-semibold">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        bill.billType === 'Final' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-900'
                                                    }`}>
                                                        {bill.billType}
                                                    </span>
                                                </td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-center font-semibold">
                                                    {bill.billDate ? new Date(bill.billDate).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-center font-semibold">
                                                    {(() => {
                                                        const compTargetDate = workOrder?.stipulatedCompletionDate ? (parseDateStr(workOrder.stipulatedCompletionDate) || new Date(workOrder.stipulatedCompletionDate)) : null;
                                                        if (!compTargetDate || isNaN(compTargetDate.getTime())) return '-';
                                                        
                                                        const getDaysDiff = (date1: Date, date2: Date) => {
                                                             const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
                                                             const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
                                                             const diffTime = d1.getTime() - d2.getTime();
                                                             return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                        };
                                                        
                                                        let daysDelay = 0;
                                                        if (bill.billType === 'Running') {
                                                            if (bill.lastRecordEntryDate) {
                                                                const dt = parseDateStr(bill.lastRecordEntryDate) || new Date(bill.lastRecordEntryDate);
                                                                if (!isNaN(dt.getTime())) {
                                                                    daysDelay = Math.max(0, getDaysDiff(dt, compTargetDate));
                                                                }
                                                            }
                                                        } else {
                                                            if (bill.actualCompletionDate) {
                                                                const dt = parseDateStr(bill.actualCompletionDate) || new Date(bill.actualCompletionDate);
                                                                if (!isNaN(dt.getTime())) {
                                                                    daysDelay = Math.max(0, getDaysDiff(dt, compTargetDate));
                                                                }
                                                            }
                                                        }
                                                        
                                                        return daysDelay > 0 ? (
                                                            <span className="text-rose-600 font-bold text-xs">{daysDelay} days</span>
                                                        ) : (
                                                            <span className="text-slate-500 text-xs">0 days</span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-right font-mono font-bold text-slate-800">₹{bill.grossAmount?.toLocaleString('en-IN')}</td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-right font-mono font-semibold text-rose-600">₹{bill.totalDeduction?.toLocaleString('en-IN') || 0}</td>
                                                <td className="border border-slate-200 px-4 py-1.5 text-right font-mono font-extrabold text-emerald-700">₹{bill.netPaidAmount?.toLocaleString('en-IN') || 0}</td>
                                                <td className="border border-slate-200 px-4 py-1.5">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Link href={`/packages/${packageId}/bills/${bill._id}/deduction`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-emerald-800 hover:bg-emerald-100 rounded-md cursor-pointer transition-colors" title="View Deduction Statement">
                                                            <FileSpreadsheet className="w-4 h-4" />
                                                        </Link>
                                                        <Link href={`/packages/${packageId}/bills/${bill._id}/checklist`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-emerald-800 hover:bg-emerald-100 rounded-md cursor-pointer transition-colors" title="View Bill Checklist">
                                                            <ClipboardCheck className="w-4 h-4" />
                                                        </Link>
                                                        <button onClick={() => handleOpenBillModal(bill)} className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-md cursor-pointer transition-colors" title="Edit Bill">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-emerald-200 rounded-2xl bg-emerald-100/40">
                                <AlertCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">No billing entries logged yet.</p>
                            </div>
                        )}
                        {/* INLINE FULL-WIDTH BILL FORM */}
                        {isBillModalOpen && (
                            <div id="package-bill-form-section" className="scroll-mt-6 mt-6 border-2 border-emerald-300 bg-white rounded-2xl p-6 shadow-xl shadow-emerald-950/5 ring-4 ring-emerald-500/10 transition-all duration-500 animate-in fade-in zoom-in-95 slide-in-from-top-6">
                                <div className="pb-4 mb-6 border-b border-emerald-100 flex justify-between items-center bg-gradient-to-r from-emerald-50/90 to-white p-4 -m-6 mb-6 rounded-t-2xl">
                                    <div className="flex items-center gap-3">
                                        <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm animate-pulse">
                                            <Receipt className="w-5 h-5" />
                                        </span>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                {editingBill ? 'Edit Bill Details' : 'Log New Bill & Abstract Entry'}
                                                {!editingBill && (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 animate-pulse">
                                                        ✨ New Bill
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-xs text-slate-500 font-medium">Enter bill measurement parameters, deductions & audit memo</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => { setIsBillModalOpen(false); setEditingBill(null); }} className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-all cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <BillForm 
                                    initialData={editingBill || {}} 
                                    isEditing={!!editingBill} 
                                    initialWorkOrderId={workOrder?._id} 
                                    initialTenderPercentage={tender?.aboveBelowPercentage}
                                    initialTenderDirection={tender?.aboveBelowInWord}
                                    initialWorks={pkg?.works}
                                    contractPrice={tender?.contractPrice || tender?.estimatedAmount}
                                    submittedSD={workOrder?.securityDepositAmount || tender?.securityDepositAmount}
                                    workType={pkg?.workType}
                                    budgetHead={pkg?.budgetHead}
                                    stipulatedCompletionDate={workOrder?.stipulatedCompletionDate}
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

                {/* 8. Excess Proposal Section */}
                <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">Excess Proposal</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                excessProposals.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                                {excessProposals.length > 0 ? '✅ Submitted' : '⏳ Pending'}
                            </span>
                            {excessProposals.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                    {excessProposals.length} {excessProposals.length === 1 ? 'proposal' : 'proposals'}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleOpenAddExcessModal}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Excess Proposal
                        </button>
                    </div>
                    <div className="p-6">
                        {excessProposals.length > 0 ? (
                            <div className="overflow-x-auto border border-emerald-200 rounded-xl shadow-2xs">
                                <table className="min-w-full divide-y divide-emerald-200 text-xs">
                                    <thead className="bg-emerald-100/90 text-emerald-950">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider w-16">Sr.</th>
                                            <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Proposal No.</th>
                                            <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Proposal Date</th>
                                            <th className="px-4 py-2.5 text-center font-bold uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-2.5 text-center font-bold uppercase tracking-wider">Attached PDF</th>
                                            <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Remarks</th>
                                            <th className="px-4 py-2.5 text-center font-bold uppercase tracking-wider w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {excessProposals.map((p, idx) => (
                                            <tr key={p._id} className="hover:bg-emerald-50/40 transition-colors">
                                                <td className="px-4 py-2.5 text-slate-500 font-mono font-bold">{idx + 1}</td>
                                                <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{p.proposalNo || '-'}</td>
                                                <td className="px-4 py-2.5 text-slate-600">
                                                    {p.proposalDate ? new Date(p.proposalDate).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                                        p.status === 'Approved'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : p.status === 'Rejected'
                                                            ? 'bg-rose-100 text-rose-800'
                                                            : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {p.status || 'Submitted'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {p.pdfUrl ? (
                                                        <a
                                                            href={blobViewUrl(p.pdfUrl)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                                            title="View attached PDF"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-rose-600" />
                                                            <span>View PDF</span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">No PDF</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-600">{p.remarks || '-'}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleOpenEditExcessModal(p)}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer transition-colors"
                                                            title="Edit Proposal"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteExcessProposal(p._id, p.proposalNo)}
                                                            disabled={deletingExcessId === p._id}
                                                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors disabled:opacity-50"
                                                            title="Delete Proposal"
                                                        >
                                                            {deletingExcessId === p._id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-emerald-200 rounded-2xl bg-emerald-100/40">
                                <AlertCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">No excess proposal submitted for this package yet.</p>
                                <button
                                    onClick={handleOpenAddExcessModal}
                                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Submit Excess Proposal
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 9. Deposit Refund Section */}
                <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">Deposit Refund</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                additionalSdRefund?.status === 'Refunded'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : additionalSdRefund?.status === 'Order Generated'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                            }`}>
                                {additionalSdRefund?.status === 'Refunded' ? '✅ Refunded' : additionalSdRefund?.status === 'Order Generated' ? '📄 Order Generated' : '⏳ Pending'}
                            </span>
                            {workOrder?.additionalSecurityDepositAmount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                    Additional SD: ₹{Number(workOrder.additionalSecurityDepositAmount).toLocaleString('en-IN')}
                                </span>
                            )}
                        </div>

                        {editingSection !== 'depositRefund' && (
                            <button
                                onClick={() => handleStartEdit('depositRefund')}
                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer"
                            >
                                {additionalSdRefund ? (
                                    <><Edit2 className="w-3.5 h-3.5" /> Modify Additional SD Refund</>
                                ) : (
                                    <><Plus className="w-3.5 h-3.5" /> Add Additional SD Refund</>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="p-6">
                        {editingSection === 'depositRefund' ? (
                            <form onSubmit={handleSaveAdditionalSdRefund} className="space-y-4">
                                <div className="p-3 bg-emerald-100/60 border border-emerald-200 rounded-xl">
                                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider mb-3">Additional SD Refund Parameters</h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Refund Order / WS No.</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 219"
                                                value={additionalSdForm.orderNo}
                                                onChange={(e) => setAdditionalSdForm((prev: any) => ({ ...prev, orderNo: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Refund Order Date</label>
                                            <input
                                                type="date"
                                                value={additionalSdForm.orderDate}
                                                onChange={(e) => setAdditionalSdForm((prev: any) => ({ ...prev, orderDate: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Status</label>
                                            <select
                                                value={additionalSdForm.status}
                                                onChange={(e) => setAdditionalSdForm((prev: any) => ({ ...prev, status: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Order Generated">Order Generated</option>
                                                <option value="Refunded">Refunded</option>
                                            </select>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block font-bold text-slate-700 mb-1">Contractor Application Reference (વંચાણે લીધા)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. હરપાલસિંહ અમરસિંહ સરવૈયા ની અરજી"
                                                value={additionalSdForm.applicationRef}
                                                onChange={(e) => setAdditionalSdForm((prev: any) => ({ ...prev, applicationRef: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Actual Completion Date</label>
                                            <input
                                                type="date"
                                                value={additionalSdForm.actualCompletionDate}
                                                onChange={(e) => setAdditionalSdForm((prev: any) => ({ ...prev, actualCompletionDate: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                                            <select
                                                value={additionalSdForm.bankName}
                                                onChange={(e) => setAdditionalSdForm((prev: any) => ({ ...prev, bankName: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                                <option value="">-- Select Bank --</option>
                                                {banks.map((b: any) => (
                                                    <option key={b._id || b.name} value={b.name}>{b.name}</option>
                                                ))}
                                                {additionalSdForm.bankName && !banks.some((b: any) => b.name === additionalSdForm.bankName) && (
                                                    <option value={additionalSdForm.bankName}>{additionalSdForm.bankName}</option>
                                                )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">FDR / BG Number</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 01360IBG25000003"
                                                value={additionalSdForm.fdrNumber}
                                                onChange={(e) => setAdditionalSdForm((prev: any) => ({ ...prev, fdrNumber: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">FDR Issue Date</label>
                                            <input
                                                type="date"
                                                value={additionalSdForm.fdrDate}
                                                onChange={(e) => setAdditionalSdForm((prev: any) => ({ ...prev, fdrDate: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">FDR Amount (₹)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 225000"
                                                value={additionalSdForm.amount}
                                                onChange={(e) => setAdditionalSdForm((prev: any) => ({ ...prev, amount: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div className="sm:col-span-2 md:col-span-2">
                                            <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                                            <input
                                                type="text"
                                                placeholder="Optional notes or reference..."
                                                value={additionalSdForm.remarks}
                                                onChange={(e) => setAdditionalSdForm((prev: any) => ({ ...prev, remarks: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-50">Cancel</button>
                                    <button type="submit" disabled={loading} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-50 flex items-center gap-2">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Deposit Refund
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                {/* Additional SD Refund Card */}
                                <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-2xs">
                                    <div className="px-4 py-2.5 bg-emerald-100/70 border-b border-emerald-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="w-4 h-4 text-emerald-800" />
                                            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Additional Security Deposit (SD) Refund</span>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                            additionalSdRefund?.status === 'Refunded'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : additionalSdRefund?.status === 'Order Generated'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {additionalSdRefund?.status || 'Pending'}
                                        </span>
                                    </div>

                                    <div className="p-4">
                                        <div className="overflow-x-auto">
                                            <table className="excel-table mb-3">
                                                <tbody>
                                                    <tr>
                                                        <td className="excel-label w-[20%]">FDR Bank Name</td>
                                                        <td className="excel-value w-[30%]">{additionalSdRefund?.bankName || workOrder?.additionalSecurityDepositBankName || '-'}</td>
                                                        <td className="excel-label w-[20%]">FDR / BG Number</td>
                                                        <td className="excel-value font-mono w-[30%]">{additionalSdRefund?.fdrNumber || workOrder?.additionalSecurityDepositNumber || '-'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="excel-label">FDR Issue Date</td>
                                                        <td className="excel-value">
                                                            {additionalSdRefund?.fdrDate
                                                                ? new Date(additionalSdRefund.fdrDate).toLocaleDateString('en-GB')
                                                                : (workOrder?.additionalSecurityDepositDate ? new Date(workOrder.additionalSecurityDepositDate).toLocaleDateString('en-GB') : '-')}
                                                        </td>
                                                        <td className="excel-label">Additional SD Amount</td>
                                                        <td className="excel-value font-mono font-bold text-emerald-900">
                                                            ₹{Number(additionalSdRefund?.amount !== undefined ? additionalSdRefund.amount : (workOrder?.additionalSecurityDepositAmount || 0)).toLocaleString('en-IN')}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="excel-label">Work Order Start Date</td>
                                                        <td className="excel-value">
                                                            {workOrder?.timeLimitStartsFrom
                                                                ? new Date(workOrder.timeLimitStartsFrom).toLocaleDateString('en-GB')
                                                                : (workOrder?.workOrderDate ? new Date(workOrder.workOrderDate).toLocaleDateString('en-GB') : '-')}
                                                        </td>
                                                        <td className="excel-label">Stipulated Completion Date</td>
                                                        <td className="excel-value">
                                                            {workOrder?.stipulatedCompletionDate ? new Date(workOrder.stipulatedCompletionDate).toLocaleDateString('en-GB') : '-'}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="excel-label">Actual Completion Date</td>
                                                        <td className="excel-value font-semibold text-slate-800">
                                                            {additionalSdRefund?.actualCompletionDate
                                                                ? new Date(additionalSdRefund.actualCompletionDate).toLocaleDateString('en-GB')
                                                                : (bills?.find((b: any) => b.billType === 'Final' || b.actualCompletionDate)?.actualCompletionDate
                                                                    ? new Date(bills.find((b: any) => b.billType === 'Final' || b.actualCompletionDate).actualCompletionDate).toLocaleDateString('en-GB')
                                                                    : 'Not Recorded')}
                                                        </td>
                                                        <td className="excel-label">Refund Order No & Date</td>
                                                        <td className="excel-value font-mono">
                                                            {additionalSdRefund?.orderNo ? `No: ${additionalSdRefund.orderNo}` : '-'} &nbsp;|&nbsp; {additionalSdRefund?.orderDate ? new Date(additionalSdRefund.orderDate).toLocaleDateString('en-GB') : '-'}
                                                        </td>
                                                    </tr>
                                                    {additionalSdRefund?.applicationRef && (
                                                        <tr>
                                                            <td className="excel-label">Contractor Application</td>
                                                            <td className="excel-value" colSpan={3}>{additionalSdRefund.applicationRef}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl text-xs text-slate-700 leading-relaxed mb-3">
                                            <strong>ℹ️ ITB Clause 34.1(B) Rule:</strong> ટેન્ડરના આઇ.ટી.બી. કલોઝ નં.૩૪.૧(બી) મુજબ કામ પૂર્ણ થયાનાં ૨૮ દિવસ પછી રજુ કરેલ એડીશનલ પર્ફોમન્સ સિકયોરીટી ડીપોઝીટ પેટે રજુ કરેલ એફ.ડી.આર. પરત કરવાની રહે છે.
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => handleStartEdit('depositRefund')}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                                            >
                                                <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit Refund Details
                                            </button>
                                            <Link
                                                href={`/packages/${packageId}/print-additional-sd`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                                            >
                                                <Printer className="w-4 h-4" /> Print Additional SD Order / Export to Word (.doc)
                                            </Link>
                                        </div>
                                    </div>
                                </div>
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
                                <button type="button" onClick={handleCloseContractorModal} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                <button type="submit" disabled={contractorSaving} className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
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
                                <button type="button" onClick={() => setIsBankModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                <button type="submit" disabled={bankSaving} className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                                    {bankSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {bankSaving ? 'Saving Bank...' : 'Save Bank'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RE-TENDER CANCELLATION MODAL */}
            {isReTenderModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                            <h3 className="text-sm font-bold text-slate-800">Confirm Re-Tender</h3>
                            <button type="button" onClick={() => setIsReTenderModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-500">
                                This will cancel the current Tender trial (Trial #{tender?.trialNo}) and create a new Tender trial (Trial #{(Number(tender?.trialNo) || 1) + 1}).
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason for Cancelling Current Tender *</label>
                                <select 
                                    value={reTenderReason} 
                                    onChange={(e) => setReTenderReason(e.target.value)} 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                                >
                                    <option value="">-- Select Reason --</option>
                                    <option value="High Rate">High Rate</option>
                                    <option value="Single Bidder">Single Bidder</option>
                                    <option value="Technical Ground">Technical Ground</option>
                                    <option value="Administrative Ground">Administrative Ground</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsReTenderModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                <button 
                                    type="button" 
                                    disabled={!reTenderReason || loading} 
                                    onClick={() => handleExecuteReTender(reTenderReason)} 
                                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                                >
                                    Confirm & Create Re-Tender
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BIDDERS LIST FROM PDF MODAL */}
            {isBiddersModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Comparative Statement</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Tender ID: {parsedTenderInfo?.tenderId} &nbsp;|&nbsp; Notice: {parsedTenderInfo?.noticeNo} ({parsedTenderInfo?.noticeYear}) &nbsp;|&nbsp; Sr No: {parsedTenderInfo?.srNo} &nbsp;|&nbsp; ECV: ₹{parsedTenderInfo?.estimatedAmount ? parsedTenderInfo.estimatedAmount.toLocaleString('en-IN') : '-'}</p>
                            </div>
                            <button type="button" onClick={() => setIsBiddersModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 max-h-[65vh] overflow-y-auto">
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                            <th className="px-4 py-2 text-center w-[8%]">Rank</th>
                                            <th className="px-4 py-2">Name of Party</th>
                                            <th className="px-4 py-2 text-right">Above / Below</th>
                                            <th className="px-4 py-2 text-right">Percentage (%)</th>
                                            <th className="px-4 py-2 text-right">Total Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parsedBidders.map((b: any, idx: number) => {
                                            const isL1 = b.rank === 'L1';
                                            return (
                                                <tr key={idx} className={`${isL1 ? 'bg-emerald-50/40' : ''}`}>
                                                    <td className="px-4 py-2 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            isL1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {b.rank}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 font-medium text-slate-800">{b.contractorName}</td>
                                                    <td className="px-4 py-2 text-right text-slate-500">{b.aboveBelow}</td>
                                                    <td className="px-4 py-2 text-right font-mono text-slate-700 font-bold">{b.percentage}%</td>
                                                    <td className="px-4 py-2 text-right font-mono text-emerald-700 font-bold">₹{b.totalAmount ? b.totalAmount.toLocaleString('en-IN') : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsBiddersModalOpen(false)}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold cursor-pointer"
                            >
                                Save & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MANAGE TENDER FEES MODAL */}
            {isTenderFeeModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Manage Tender Fee Details for Bidders</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Tender ID: {displayTender?.tenderId} &nbsp;|&nbsp; Trial #{displayTender?.trialNo}</p>
                            </div>
                            <button type="button" onClick={() => setIsTenderFeeModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <p className="text-xs text-slate-500">
                                Enter or update the Bank Name, DD Number, DD Date, DD Amount, and Date of Generating Challan for each bidder below.
                            </p>
                            
                            <div className="space-y-4">
                                {tenderFeeBidders.map((b: any, idx: number) => {
                                    const isL1 = b.rank === 'L1';
                                    return (
                                        <div key={idx} className={`p-4 rounded-xl border ${isL1 ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50/50 border-slate-200'}`}>
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    isL1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                                }`}>
                                                    {b.rank}
                                                </span>
                                                <span className="font-bold text-sm text-slate-800">{b.contractorName}</span>
                                                <span className="text-xs text-slate-500 font-mono ml-auto">
                                                    Bid: {b.percentage}% {b.aboveBelow} ({b.totalAmount ? `₹${b.totalAmount.toLocaleString('en-IN')}` : '-'})
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Name of Bank</label>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setIsBankModalOpen(true)}
                                                            className="text-[9px] text-emerald-700 hover:underline font-bold"
                                                        >
                                                            + Add
                                                        </button>
                                                    </div>
                                                    <select 
                                                        value={b.tenderFeeBankName || ''} 
                                                        onChange={(e) => handleTenderFeeChange(idx, 'tenderFeeBankName', e.target.value)} 
                                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 font-medium"
                                                    >
                                                        <option value="">-- Select Bank --</option>
                                                        {banks.map((bank: any) => (
                                                            <option key={bank._id || bank.name} value={bank.name}>
                                                                {bank.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tender Fee DD No.</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. 514820" 
                                                        value={b.tenderFeeDdNo || ''} 
                                                        onChange={(e) => handleTenderFeeChange(idx, 'tenderFeeDdNo', e.target.value)} 
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono focus:ring-1 focus:ring-emerald-500" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">DD Date</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="DD/MM/YYYY" 
                                                        value={b.tenderFeeDdDate || ''} 
                                                        onChange={(e) => handleTenderFeeChange(idx, 'tenderFeeDdDate', e.target.value)} 
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono focus:ring-1 focus:ring-emerald-500" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">DD Amount (₹)</label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="e.g. 1500" 
                                                        value={b.tenderFeeDdAmount !== undefined ? b.tenderFeeDdAmount : ''} 
                                                        onChange={(e) => handleTenderFeeChange(idx, 'tenderFeeDdAmount', e.target.value)} 
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono text-right focus:ring-1 focus:ring-emerald-500" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Generating Challan</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="DD/MM/YYYY" 
                                                        value={b.tenderFeeChallanDate || ''} 
                                                        onChange={(e) => handleTenderFeeChange(idx, 'tenderFeeChallanDate', e.target.value)} 
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono focus:ring-1 focus:ring-emerald-500" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
                            <button 
                                type="button" 
                                onClick={() => setIsTenderFeeModalOpen(false)} 
                                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-100 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                disabled={savingTenderFee} 
                                onClick={handleSaveTenderFees} 
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer flex items-center gap-2"
                            >
                                {savingTenderFee ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Save Tender Fees
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXCESS PROPOSAL MODAL */}
            {isExcessModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-emerald-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                                    <TrendingUp className="w-4 h-4" />
                                </span>
                                <h3 className="text-sm font-bold text-slate-800">
                                    {editingExcessProposal ? 'Edit Excess Proposal' : 'Add Excess Proposal'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsExcessModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveExcessProposal} className="p-6 space-y-4 text-xs">
                            {/* Proposal No. & Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Proposal No.
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. EP/2026/01 (optional)"
                                        value={excessForm.proposalNo}
                                        onChange={(e) => setExcessForm((prev) => ({ ...prev, proposalNo: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Proposal Date
                                    </label>
                                    <input
                                        type="date"
                                        value={excessForm.proposalDate}
                                        onChange={(e) => setExcessForm((prev) => ({ ...prev, proposalDate: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Status</label>
                                <select
                                    value={excessForm.status}
                                    onChange={(e) => setExcessForm((prev) => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="Submitted">Submitted</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>

                            {/* PDF Upload */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Proposal PDF</label>
                                <div className="border border-dashed border-emerald-300 rounded-xl p-4 bg-emerald-50/40 text-center">
                                    {excessForm.pdfUrl ? (
                                        <div className="flex items-center justify-between bg-white border border-emerald-200 p-2.5 rounded-lg">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText className="w-5 h-5 text-rose-600 flex-shrink-0" />
                                                <span className="font-semibold text-slate-800 truncate">{excessForm.fileName || 'Attached Proposal PDF'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={blobViewUrl(excessForm.pdfUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                                                    title="Preview PDF"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => setExcessForm((prev) => ({ ...prev, pdfUrl: '', fileName: '', fileSize: 0 }))}
                                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                                    title="Remove PDF"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center justify-center py-2">
                                            {uploadingExcessPdf ? (
                                                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mb-1" />
                                            ) : (
                                                <Upload className="w-6 h-6 text-emerald-600 mb-1" />
                                            )}
                                            <span className="font-bold text-emerald-800">
                                                {uploadingExcessPdf ? 'Uploading PDF...' : 'Click to Upload Proposal PDF'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 mt-0.5">Accepts .pdf files</span>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleExcessPdfUpload}
                                                disabled={uploadingExcessPdf}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Remarks / Notes</label>
                                <textarea
                                    rows={2}
                                    placeholder="Optional notes or details about the excess items..."
                                    value={excessForm.remarks}
                                    onChange={(e) => setExcessForm((prev) => ({ ...prev, remarks: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsExcessModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingExcessProposal || uploadingExcessPdf}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {savingExcessProposal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    {editingExcessProposal ? 'Update Proposal' : 'Save Proposal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
