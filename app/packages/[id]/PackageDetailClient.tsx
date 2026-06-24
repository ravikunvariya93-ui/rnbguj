'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, Save, Edit2, Plus, Trash2, CheckCircle2, XCircle, X, Loader2, 
    Calendar, FileText, Settings, Award, Check, ChevronDown, ListPlus, Printer, 
    Receipt, DollarSign, Eye, AlertCircle, FileCheck, Layers, ClipboardCheck,
    Briefcase, FileSpreadsheet, Percent, Building2, User2, Clock, Upload
} from 'lucide-react';
import { parseDateStr, formatDate, formatDateForInput, formatShortDate } from '@/lib/dateUtils';
import SearchableSelect from '@/components/SearchableSelect';

interface PackageDetailClientProps {
    packageId: string;
    pkg: any;
    approvedWorks: any[];
    dtp: any;
    tender: any;
    boq: any;
    approval: any;
    loa: any;
    workOrder: any;
    bills: any[];
    maxAgreementNos?: Record<string, number>;
}

type SectionType = 'package' | 'dtp' | 'tender' | 'boq' | 'approval' | 'loa' | 'workOrder' | 'bills';

export default function PackageDetailClient({
    packageId,
    pkg: initialPkg,
    approvedWorks,
    dtp: initialDtp,
    tender: initialTender,
    boq: initialBoq,
    approval: initialApproval,
    loa: initialLoa,
    workOrder: initialWorkOrder,
    bills: initialBills,
    maxAgreementNos = {},
}: PackageDetailClientProps) {
    const router = useRouter();

    // States for data
    const [pkg, setPkg] = useState(initialPkg);
    const [dtp, setDtp] = useState(initialDtp);
    const [tender, setTender] = useState(initialTender);
    const [boq, setBoq] = useState(initialBoq);
    const [boqForm, setBoqForm] = useState<any>({ items: [], totalAmount: 0 });
    const [parsingBoq, setParsingBoq] = useState(false);
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

    const findApprovedWork = useCallback((workName: string) => {
        if (!approvedWorks || !workName) return null;
        const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const target = normalize(workName);
        return approvedWorks.find((aw: any) => normalize(aw.workName) === target);
    }, [approvedWorks]);

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
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [newBankName, setNewBankName] = useState('');
    const [bankSaving, setBankSaving] = useState(false);
    const [activeBankField, setActiveBankField] = useState<'security' | 'additional'>('security');

    const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
    const [newContractor, setNewContractor] = useState({
        name: '', proprietorName: '', address: '', mobileNo: '', agencyType: ''
    });
    const [editingContractorId, setEditingContractorId] = useState<string | null>(null);
    const [contractorSaving, setContractorSaving] = useState(false);


    // Package Edit Works States
    const [availableWorks, setAvailableWorks] = useState<any[]>([]);
    const [currentSelectionId, setCurrentSelectionId] = useState('');

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

    // Sync state with props
    useEffect(() => {
        setPkg(initialPkg);
        setDtp(initialDtp);
        setTender(initialTender);
        setApproval(initialApproval);
        setLoa(initialLoa);
        setWorkOrder(initialWorkOrder);
        setBills(initialBills);
    }, [initialPkg, initialDtp, initialTender, initialApproval, initialLoa, initialWorkOrder, initialBills]);

    // Fetch banks & agencies
    useEffect(() => {
        const fetchDeps = async () => {
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
                console.error("Failed to load drop down details", err);
            }
        };
        fetchDeps();
    }, []);

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

    // Toggle Edit Modes
    const handleStartEdit = (section: SectionType) => {
        setEditingSection(section);
        if (section === 'package') {
            fetchAvailableWorks();
            setPkgForm({
                packageName: pkg.packageName || '',
                subDivision: pkg.subDivision || '',
                dtpConsultant: pkg.dtpConsultant || '',
                works: pkg.works || [],
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
            setTenderForm({
                packageId: packageId,
                packageName: pkg.packageName || '',
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
            const hasExistingNo = !!workOrder?.agreementNo;
            const defaultYear = workOrder?.agreementYear || '2026-27';
            const defaultNo = hasExistingNo
                ? workOrder.agreementNo
                : String((maxAgreementNos[defaultYear] || 0) + 1);

            setWoForm({
                loaId: loa?._id || '',
                agreementYear: defaultYear,
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
        const { name, value } = e.target;
        setWoForm((prev: any) => {
            const next = { ...prev, [name]: value };
            if (name === 'workOrderDate') {
                next.timeLimitStartsFrom = value;
            }
            if (name === 'agreementYear' && (!workOrder || !workOrder.agreementNo)) {
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
            if (prev.timeLimitStartsFrom === calcDateStr && prev.workDurationMonths === duration) return prev;
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
                    amount: (workToAdd.tsAmount || 0) * 100000
                }]
            }));
            setCurrentSelectionId('');
        }
    };

    const handleRemoveWorkFromPkg = (workIdStr: string) => {
        setPkgForm((prev: any) => ({
            ...prev,
            works: (prev.works || []).filter((w: any) => {
                const id = w.workId && typeof w.workId === 'object' ? w.workId._id : w.workId;
                return String(id) !== String(workIdStr);
            })
        }));
    };

    // Save Handlers
    const handleSavePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pkgForm.works || pkgForm.works.length === 0) {
            alert("Please add at least one work to the package.");
            return;
        }
        setLoading(true);
        try {
            const sanitizedWorks = pkgForm.works.map((w: any) => ({
                workId: w.workId && typeof w.workId === 'object' ? w.workId._id : w.workId,
                workName: w.workName,
                amount: w.amount
            }));
            const submissionData = {
                ...pkgForm,
                works: sanitizedWorks
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
        });
        setEditingContractorId(selected._id);
        setIsContractorModalOpen(true);
    };

    const handleCloseContractorModal = () => {
        setNewContractor({ name: '', proprietorName: '', address: '', mobileNo: '', agencyType: '' });
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
                setNewContractor({ name: '', proprietorName: '', address: '', mobileNo: '', agencyType: '' });
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

        const it = parseFloat((netPaySafe * 0.02).toFixed(2));
        const gst = parseFloat((netPaySafe * 0.02).toFixed(2));
        const cess = parseFloat((netPaySafe * 0.01).toFixed(2));
        const sd = parseFloat((netPaySafe * 0.06).toFixed(2));
        const fmd = parseFloat((netPaySafe * 0.05).toFixed(2));
        const tpi = netPaySafe > 10000000 ? 100000 : 50000;
        const esmp = Number(nextForm.runningBillNumber) === 1 ? 20000 : 0;

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


    // Calculate package timeline progress percent
    const progressStats = useMemo(() => {
        let score = 1; // Package exists
        const stages = [
            { name: 'Package', done: true },
            { name: 'DTP Approval', done: !!dtp },
            { name: 'Tendering', done: !!tender },
            { name: 'Approval', done: !!approval || (approval?.notRequired) || isTenderApprovalNotRequired },
            { name: 'LOA Issued', done: !!loa },
            { name: 'Work Order', done: !!workOrder },
            { name: 'Bills', done: bills && bills.length > 0 },
        ];
        stages.forEach((s, i) => { if (i > 0 && s.done) score++; });
        const percent = Math.round((score / stages.length) * 100);
        return { percent, stages };
    }, [dtp, tender, approval, loa, workOrder, bills]);

    const pkgOptions = useMemo(() => {
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
    }, [availableWorks, pkgForm.works]);

    return (
        <div className="space-y-8 pb-16">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md border border-slate-200 p-5 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                    <Link href="/packages" className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                                Package Module
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                                Sub-Division: {pkg.subDivision || 'N/A'}
                            </span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800 break-words mt-1">
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

            {/* Visual Progress Timeline */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Package Progress</h2>
                    <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        {progressStats.percent}% Stage Complete
                    </span>
                </div>
                <div className="relative w-full h-2 bg-slate-100 rounded-full mb-8">
                    <div className="absolute top-0 left-0 h-2 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressStats.percent}%` }} />
                    <div className="absolute top-0 left-0 w-full flex justify-between -translate-y-2.5 px-1">
                        {progressStats.stages.map((stage, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                                    stage.done ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200'
                                }`}>
                                    {stage.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                                </div>
                                <span className={`text-[10px] md:text-xs font-bold mt-2 hidden sm:block ${
                                    stage.done ? 'text-slate-800' : 'text-slate-400'
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

                {/* 1. Package Overview Card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden hover:shadow-md transition-all">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Layers className="w-5 h-5" /></div>
                            <div>
                                <h3 className="font-bold text-slate-800">1. Package Identification & Works</h3>
                                <p className="text-xs text-slate-400 font-medium">Core package parameters and assigned technical sanctions</p>
                            </div>
                        </div>
                        {editingSection !== 'package' && (
                            <button onClick={() => handleStartEdit('package')} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all">
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
                                                    <select value={pkgForm.subDivision} onChange={(e) => setPkgForm((prev: any) => ({ ...prev, subDivision: e.target.value }))} className="excel-cell-select bg-white">
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
                                                    <select value={pkgForm.dtpConsultant} onChange={(e) => setPkgForm((prev: any) => ({ ...prev, dtpConsultant: e.target.value }))} className="excel-cell-select bg-white">
                                                        <option value="">-- Select Consultant --</option>
                                                        <option value="Umiya Engineers and Project Management Consultancy">Umiya Engineers and Project Management Consultancy</option>
                                                        <option value="Trisha Engineers Consultancy">Trisha Engineers Consultancy</option>
                                                        <option value="Pramukham Engineers Consultancy">Pramukham Engineers Consultancy</option>
                                                        <option value="Kalyan Computers">Kalyan Computers</option>
                                                    </select>
                                                </td>
                                            </tr>
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
                                            />
                                        </div>
                                        <button type="button" onClick={handleAddWorkToPkg} disabled={!currentSelectionId} className="px-4 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold disabled:opacity-50 h-[38px] flex items-center cursor-pointer transition-all">Add</button>
                                    </div>

                                    {/* Table: Approved Work Details (Consolidated) */}
                                    <div className="mb-6">
                                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Works Details (Administrative Sanction & T.S. details)</h5>
                                        <div className="overflow-x-auto">
                                            <table className="excel-table">
                                                <thead>
                                                    <tr className="bg-[#107c41] text-white">
                                                        <th className="border border-slate-300 px-3 py-1.5 w-12 text-center bg-[#107c41]">Sr.</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41]">Name of Work</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-24">Year of Approval</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-36">Length (K.M.) / Chainage</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-28">Budget Head</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-right w-28">Job Number Amount (Lakh)</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-28">Approval Date</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-28">Category of Road</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-28">Work Type</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-36">Nature of Work</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-28">T.S. Date</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-36">T.S. Authority</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 w-16 text-center bg-[#107c41]">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pkgForm.works?.map((w: any, i: number) => {
                                                        const aw = findApprovedWork(w.workName);
                                                        const appYear = aw?.approvalYear || '-';
                                                        const lenChain = getLengthOrChainage(aw);
                                                        const bHead = aw?.budgetHead || '-';
                                                        const jobAmt = aw?.jobNumberAmount !== undefined ? `₹${Number(aw.jobNumberAmount).toFixed(2)}` : '-';
                                                        const appDate = aw?.jobNumberApprovalDate ? formatShortDate(aw.jobNumberApprovalDate) : '-';
                                                        const roadCat = aw?.roadCategory || '-';
                                                        const wType = aw?.workType || '-';
                                                        const nature = aw?.natureOfWork || '-';
                                                        const tsDate = w.workId?.tsDate ? formatShortDate(w.workId.tsDate) : '-';
                                                        const tsAuth = w.workId?.tsAuthority || '-';
                                                        const keyId = w.workId && typeof w.workId === 'object' ? w.workId._id : w.workId;

                                                        return (
                                                            <tr key={keyId} className="hover:bg-slate-50">
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-600">{i + 1}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-800">{w.workName}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-medium text-slate-600">{appYear}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{lenChain}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{bHead}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-slate-700 font-semibold">{jobAmt} Lacs</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-600">{appDate}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{roadCat}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{wType}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{nature}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-600">{tsDate}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{tsAuth}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center">
                                                                    <button type="button" onClick={() => handleRemoveWorkFromPkg(keyId)} className="text-rose-600 p-1 hover:bg-rose-50 rounded-lg cursor-pointer">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {(!pkgForm.works || pkgForm.works.length === 0) && (
                                                        <tr>
                                                            <td colSpan={13} className="border border-slate-200 px-4 py-6 text-center text-slate-400 italic">No works linked yet.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] cursor-pointer">Save Package</button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Sub-Division</td>
                                                <td className="excel-value w-[30%]">{pkg.subDivision || '-'}</td>
                                                <td className="excel-label">DTP Consultant</td>
                                                <td className="excel-value w-[30%]">{pkg.dtpConsultant || '-'}</td>
                                            </tr>
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
                                                    <tr className="bg-[#107c41] text-white">
                                                        <th className="border border-slate-300 px-3 py-1.5 w-12 text-center bg-[#107c41]">Sr. No.</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41]">Name of Work</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-24">Year of Approval</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-36">Length (K.M.) / Chainage</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-28">Budget Head</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-right w-28">Job Number Amount (Lakh)</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-28">Approval Date</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-28">Category of Road</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-28">Work Type</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-36">Nature of Work</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-28">T.S. Date</th>
                                                        <th className="border border-slate-300 px-3 py-1.5 bg-[#107c41] text-center w-36">T.S. Authority</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pkg.works?.map((work: any, i: number) => {
                                                        const aw = findApprovedWork(work.workName);
                                                        const appYear = aw?.approvalYear || '-';
                                                        const lenChain = getLengthOrChainage(aw);
                                                        const bHead = aw?.budgetHead || '-';
                                                        const jobAmt = aw?.jobNumberAmount !== undefined ? `₹${Number(aw.jobNumberAmount).toFixed(2)}` : '-';
                                                        const appDate = aw?.jobNumberApprovalDate ? formatShortDate(work.jobNumberApprovalDate || aw?.jobNumberApprovalDate) : '-';
                                                        const roadCat = aw?.roadCategory || '-';
                                                        const wType = aw?.workType || '-';
                                                        const nature = aw?.natureOfWork || '-';
                                                        const tsDate = work.workId?.tsDate ? formatShortDate(work.workId.tsDate) : '-';
                                                        const tsAuth = work.workId?.tsAuthority || '-';
                                                        const keyId = work.workId && typeof work.workId === 'object' ? work.workId._id : work.workId;

                                                        return (
                                                            <tr key={keyId} className="hover:bg-slate-50">
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-600">{i + 1}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-800">{work.workName}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-medium text-slate-600">{appYear}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{lenChain}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{bHead}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-slate-700 font-semibold">{jobAmt} Lacs</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-600">{appDate}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{roadCat}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{wType}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{nature}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-600">{tsDate}</td>
                                                                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{tsAuth}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {(!pkg.works || pkg.works.length === 0) && (
                                                        <tr>
                                                            <td colSpan={12} className="border border-slate-200 px-4 py-6 text-center text-slate-400 italic">No works linked yet.</td>
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
               
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 2. DTP Approval Section */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${dtp ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <ClipboardCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800">2. DTP Approval Details</h3>
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
                                <button onClick={() => handleStartEdit('dtp')} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all">
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
                                                        <select name="dtpApprovingAuthority" value={dtpForm.dtpApprovingAuthority} onChange={handleDtpFieldChange} className="excel-cell-select bg-white">
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
                                        <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] cursor-pointer">Save DTP</button>
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
                                                    <td className="excel-value w-[30%] text-emerald-700 font-bold font-mono">₹{dtp.tenderAmount ? dtp.tenderAmount.toLocaleString('en-IN') : '-'}</td>
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
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-3">
                                        <Link 
                                            href={`/packages/${packageId}/print-forwarding-letter`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl transition-all cursor-pointer"
                                        >
                                            <FileText className="w-4 h-4" /> Generate Forwarding Letter
                                        </Link>
                                        <Link 
                                            href={`/packages/${packageId}/print-dtp-order`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-bold text-[#107c41] bg-[#107c41]/5 hover:bg-[#107c41]/10 border border-[#107c41]/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
                                        >
                                            <Printer className="w-4 h-4" /> Generate DTP Order
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                    <p className="text-slate-500 font-semibold text-sm">DTP approval details are pending.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Tender Section */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${tender ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Percent className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800">3. Tender Details</h3>
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
                                <button onClick={() => handleStartEdit('tender')} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all">
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
                                                    <td className="excel-value bg-slate-50 font-mono text-slate-500 px-3 py-2 font-bold select-none">{tenderForm.tenderValidityDate || '-'}</td>
                                                    <td className="excel-label">Tender Cancelled</td>
                                                    <td className="excel-value">
                                                        <div className="flex items-center gap-4 px-2">
                                                            <input type="checkbox" name="cancelled" checked={tenderForm.cancelled} onChange={handleTenderFieldChange} className="w-4 h-4 text-[#107c41] border-slate-300 rounded cursor-pointer animate-none" />
                                                            {tenderForm.cancelled && (
                                                                <select name="cancellationReason" value={tenderForm.cancellationReason} onChange={handleTenderFieldChange} className="excel-cell-select bg-white py-0.5 border-slate-200">
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
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1 items-end">
                                                                <button type="button" onClick={() => { setEditingContractorId(null); setIsContractorModalOpen(true); }} className="text-[10px] font-bold text-blue-600 hover:underline flex-shrink-0 cursor-pointer">+ New Contractor</button>
                                                                {tenderForm.contractorName && (
                                                                    <button type="button" onClick={handleOpenEditContractor} className="text-[10px] font-bold text-amber-600 hover:underline flex-shrink-0 cursor-pointer">Edit Contractor</button>
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
                                        <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] cursor-pointer">Save Tender</button>
                                    </div>
                                </form>
                            ) : tender ? (
                                <div className="overflow-x-auto space-y-4">
                                    {tender.cancelled && (
                                        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs font-semibold text-rose-800 mb-2">
                                            🚫 <strong>Tender Cancelled:</strong> {tender.cancellationReason || 'No reason specified'} &nbsp;|&nbsp; Trial No: {tender.trialNo}
                                        </div>
                                    )}
                                    <table className="excel-table">
                                        <tbody>
                                            <tr>
                                                <td className="excel-label">Tender ID</td>
                                                <td className="excel-value w-[30%]">{tender.tenderId || '-'}</td>
                                                <td className="excel-label">Tender Notice Year</td>
                                                <td className="excel-value w-[30%]">{tender.tenderNoticeYear || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Notice / Sr No.</td>
                                                <td className="excel-value">
                                                    No: {tender.noticeNo || '-'} &nbsp;|&nbsp; Sr: {tender.srNo || '-'}
                                                </td>
                                                <td className="excel-label">Trial No.</td>
                                                <td className="excel-value font-mono">{tender.trialNo || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Creation Date</td>
                                                <td className="excel-value">{tender.tenderCreationDate ? new Date(tender.tenderCreationDate).toLocaleDateString('en-GB') : '-'}</td>
                                                <td className="excel-label">Last Submission Date</td>
                                                <td className="excel-value">{tender.lastDateOfSubmission ? new Date(tender.lastDateOfSubmission).toLocaleDateString('en-GB') : '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Tender Validity Date</td>
                                                <td className="excel-value font-mono">{tender.tenderValidityDate ? new Date(tender.tenderValidityDate).toLocaleDateString('en-GB') : '-'}</td>
                                                <td className="excel-label">Contractor Name</td>
                                                <td className="excel-value">{tender.contractorName || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Above / Below %</td>
                                                <td className="excel-value font-mono">
                                                    {tender.aboveBelowPercentage !== undefined ? `${tender.aboveBelowPercentage}% ${tender.aboveBelowInWord || ''}` : '-'}
                                                </td>
                                                <td className="excel-label">Final Contract Price</td>
                                                <td className="excel-value text-emerald-700 font-bold font-mono">₹{tender.contractPrice ? tender.contractPrice.toLocaleString('en-IN') : '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="excel-label">Remarks</td>
                                                <td className="excel-value" colSpan={3}>{tender.remarks || '-'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                    <p className="text-slate-500 font-semibold text-sm">Tender details are pending.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* BOQ Section */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md mt-6">
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${boq ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800">Bill of Quantities (BOQ)</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    boq ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {boq ? '✅ Done' : '⏳ Pending'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">BOQ items list and rates details</p>
                        </div>
                    </div>
                    {editingSection !== 'boq' && (
                        <button 
                            onClick={() => handleStartEdit('boq')}
                            disabled={!tender || tender.cancelled} 
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {boq ? <><Edit2 className="w-3.5 h-3.5" /> Modify BOQ</> : <><Plus className="w-3.5 h-3.5" /> Add BOQ</>}
                        </button>
                    )}
                </div>
                <div className="p-6">
                    {!tender ? (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                            <p className="text-slate-500 font-semibold text-sm">Please complete Tender Details before adding BOQ.</p>
                        </div>
                    ) : editingSection === 'boq' ? (
                        <form onSubmit={handleSaveBoq} className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-sm font-bold text-slate-700">BOQ Items</div>
                                <div className="flex gap-2">
                                    <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-blue-300 shadow-sm text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-all">
                                        {parsingBoq ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                                        {parsingBoq ? 'Parsing PDF...' : 'Fetch from PDF'}
                                        <input type="file" className="hidden" accept=".pdf" onChange={handleBoqPdfUpload} disabled={parsingBoq} />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleBoqAddItem}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20 text-center">No.</th>
                                            <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                            <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Qty</th>
                                            <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Unit</th>
                                            <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">Rate</th>
                                            <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">Amount</th>
                                            <th className="px-3 py-2 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Type</th>
                                            <th className="px-3 py-2 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {boqForm.items?.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="px-2 py-1.5">
                                                    <input
                                                        type="text"
                                                        value={item.itemNo}
                                                        onChange={(e) => handleBoqItemChange(idx, 'itemNo', e.target.value)}
                                                        className="w-full text-center px-1.5 py-1 border border-slate-200 rounded-md text-xs font-mono"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <textarea
                                                        value={item.description}
                                                        onChange={(e) => handleBoqItemChange(idx, 'description', e.target.value)}
                                                        className="w-full px-1.5 py-1 border border-slate-200 rounded-md text-xs"
                                                        rows={1}
                                                        required
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleBoqItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="w-full text-right px-1.5 py-1 border border-slate-200 rounded-md text-xs font-mono"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input
                                                        type="text"
                                                        value={item.unit}
                                                        onChange={(e) => handleBoqItemChange(idx, 'unit', e.target.value)}
                                                        className="w-full px-1.5 py-1 border border-slate-200 rounded-md text-xs"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input
                                                        type="number"
                                                        value={item.rate}
                                                        onChange={(e) => handleBoqItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                                        className="w-full text-right px-1.5 py-1 border border-slate-200 rounded-md text-xs font-mono"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-xs font-bold text-slate-700 font-mono">
                                                    ₹{item.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <select
                                                        value={item.itemType}
                                                        onChange={(e) => handleBoqItemChange(idx, 'itemType', e.target.value)}
                                                        className="w-full px-1 py-1 border border-slate-200 rounded-md text-xs bg-white"
                                                    >
                                                        <option value="Standard">Standard</option>
                                                        <option value="Extra">Extra</option>
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBoqRemoveItem(idx)}
                                                        className="text-rose-600 hover:text-rose-900 p-1 cursor-pointer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl border border-slate-200">
                                <span className="text-sm font-bold text-slate-700">Total Amount:</span>
                                <span className="text-base font-black text-blue-700 font-mono">
                                    ₹{boqForm.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] cursor-pointer">Save BOQ</button>
                            </div>
                        </form>
                    ) : boq ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">{pkg.packageName}</h4>
                                    <p className="text-xs text-slate-400 font-medium">BOQ for Tender {tender?.tenderId}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Amount (Excl. GST)</span>
                                    <span className="text-xl font-black text-blue-600 font-mono">₹{boq.totalAmount?.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-96 overflow-y-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-16">No.</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Description of Item</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Qty</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Unit</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Rate</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {boq.items?.map((item: any, index: number) => (
                                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-slate-900 text-center font-medium">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span>{item.itemNo}</span>
                                                        {item.itemType === 'Extra' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider leading-none scale-90">
                                                                Extra
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</td>
                                                <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium font-mono">{item.quantity?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-slate-500 font-medium">{item.unit}</td>
                                                <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium font-mono">₹{item.rate?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-slate-900 text-right font-bold text-blue-600 font-mono">₹{item.amount?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                            <p className="text-slate-500 font-semibold text-sm">BOQ details are pending.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* 4. Tender Approval Section */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${approval ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Award className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800">4. Tender Approval</h3>
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
                                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] cursor-pointer">Save Approval</button>
                                    </div>
                                </form>
                            ) : approval ? (
                                <div className="overflow-x-auto">
                                    {(approval.notRequired || isTenderApprovalNotRequired) ? (
                                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-600 italic">
                                            🚫 Tender Approval is marked as <strong>Not Required</strong> for this package.
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
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 5. LOA Issued Section */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${loa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800">5. Letter of Acceptance (LOA)</h3>
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
                                                    <td className="excel-value" colSpan={3}>
                                                        <input type="number" name="workDurationMonths" value={loaForm.workDurationMonths} onChange={handleLoaFieldChange} className="excel-cell-input" />
                                                    </td>
                                                </tr>

                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                        <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] cursor-pointer">Save LOA</button>
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
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                        <Link 
                                            href={`/packages/${packageId}/print-loa`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-bold text-[#107c41] bg-[#107c41]/5 hover:bg-[#107c41]/10 border border-[#107c41]/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
                                        >
                                            <Printer className="w-4 h-4" /> Print LOA
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                    <p className="text-slate-500 font-semibold text-sm">LOA details are pending.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 6. Work Order Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${workOrder ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Settings className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">6. Work Order & Deposits</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        workOrder ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {workOrder ? '✅ Done' : '⏳ Pending'}
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
                                                <td className="excel-value font-semibold text-slate-500 bg-slate-50 px-3 py-2">
                                                    {woForm.timeLimitStartsFrom || '-'}
                                                </td>
                                                <td className="excel-label">Stipulated Completion Date</td>
                                                <td className="excel-value font-semibold text-slate-500 bg-slate-50 px-3 py-2">
                                                    {woForm.stipulatedCompletionDate || '-'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-[#107c41] text-white rounded-xl text-sm font-semibold hover:bg-[#0f5b30] cursor-pointer">Save Work Order</button>
                                </div>
                            </form>
                        ) : workOrder ? (
                            <div>
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
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                    <Link 
                                        href={`/packages/${packageId}/print-work-order`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-xs font-bold text-[#107c41] bg-[#107c41]/5 hover:bg-[#107c41]/10 border border-[#107c41]/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
                                    >
                                        <Printer className="w-4 h-4" /> Print Work Order
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-slate-500 font-semibold text-sm">Work Order details are pending.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 7. Billing & Financials Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${(bills && bills.length > 0) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">7. Billing & Audit Memo</h3>
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
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* BILL LOGGING/EDIT MODAL */}
            {isBillModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingBill ? 'Edit Bill Details' : 'Log New Bill'}
                            </h3>
                            <button type="button" onClick={() => { setIsBillModalOpen(false); setEditingBill(null); }} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveBill} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bill Type</label>
                                    <select name="billType" value={billForm.billType} onChange={handleBillFormChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                        <option value="Running">Running Bill</option>
                                        <option value="Final">Final Bill</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bill Number</label>
                                    <select name="runningBillNumber" value={billForm.runningBillNumber} onChange={handleBillFormChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                        {[...Array(50)].map((_, i) => (
                                            <option key={i+1} value={i+1}>{i+1}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bill Date (DD/MM/YYYY)</label>
                                    <input type="text" placeholder="DD/MM/YYYY" required name="billDate" value={billForm.billDate} onChange={handleBillFormChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gross Bill Amount (₹) *</label>
                                    <input type="number" required name="grossAmount" value={billForm.grossAmount} onChange={handleBillFormChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800" />
                                </div>
                            </div>

                            {/* AUDIT MEMO DEDUCTIONS BREAKDOWN */}
                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Statutory Deductions & Audit Memo</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-100 text-xs">
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">Income Tax (2%)</label>
                                        <input type="number" name="incomeTax" value={billForm.incomeTax} readOnly className="w-full px-3 py-1.5 border border-slate-100 bg-white rounded-lg font-mono text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">GST (2%)</label>
                                        <input type="number" name="gst" value={billForm.gst} readOnly className="w-full px-3 py-1.5 border border-slate-100 bg-white rounded-lg font-mono text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">Labour Cess (1%)</label>
                                        <input type="number" name="labourCess" value={billForm.labourCess} readOnly className="w-full px-3 py-1.5 border border-slate-100 bg-white rounded-lg font-mono text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">Security Deposit (6%)</label>
                                        <input type="number" name="securityDeposit" value={billForm.securityDeposit} readOnly className="w-full px-3 py-1.5 border border-slate-100 bg-white rounded-lg font-mono text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">Free Maintenance (5%)</label>
                                        <input type="number" name="freeMaintenanceDeposit" value={billForm.freeMaintenanceDeposit} readOnly className="w-full px-3 py-1.5 border border-slate-100 bg-white rounded-lg font-mono text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">TPI charges</label>
                                        <input type="number" name="tpi" value={billForm.tpi} readOnly className="w-full px-3 py-1.5 border border-slate-100 bg-white rounded-lg font-mono text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">ESMP Charges</label>
                                        <input type="number" name="esmp" value={billForm.esmp} readOnly className="w-full px-3 py-1.5 border border-slate-100 bg-white rounded-lg font-mono text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">Dismantle Credit (Deduct)</label>
                                        <input type="number" name="dismantleCredit" value={billForm.dismantleCredit} onChange={handleBillFormChange} className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg font-mono" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">Asphalt Deposit</label>
                                        <input type="number" name="asphaltDeposit" value={billForm.asphaltDeposit} onChange={handleBillFormChange} className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg font-mono" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">Core Sample Deposit</label>
                                        <input type="number" name="coreSampleDeposit" value={billForm.coreSampleDeposit} onChange={handleBillFormChange} className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg font-mono" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">Time Limit Deposit</label>
                                        <input type="number" name="timeLimitDeposit" value={billForm.timeLimitDeposit} onChange={handleBillFormChange} className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg font-mono" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">Testing Charges</label>
                                        <input type="number" name="testingCharges" value={billForm.testingCharges} onChange={handleBillFormChange} className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg font-mono" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-400 uppercase mb-1">Other Deductions</label>
                                        <input type="number" name="otherDeposit" value={billForm.otherDeposit} onChange={handleBillFormChange} className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg font-mono" />
                                    </div>
                                    <div className="col-span-2 md:col-span-4 border-t border-slate-200/60 my-2"></div>
                                    <div className="col-span-2 md:col-span-2">
                                        <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Total Deductions</span>
                                        <span className="text-lg font-extrabold text-rose-600 font-mono">₹{billForm.totalDeduction?.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="col-span-2 md:col-span-2">
                                        <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Net Paid Amount</span>
                                        <span className="text-lg font-extrabold text-emerald-600 font-mono">₹{billForm.netPaidAmount?.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Passing Date (DD/MM/YYYY)</label>
                                    <input type="text" placeholder="DD/MM/YYYY" name="passingDate" value={billForm.passingDate} onChange={handleBillFormChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bill Remarks</label>
                                    <input type="text" name="remarks" value={billForm.remarks} onChange={handleBillFormChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => { setIsBillModalOpen(false); setEditingBill(null); }} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Save Bill</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button type="button" onClick={handleCloseContractorModal} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold">Cancel</button>
                                <button type="submit" disabled={contractorSaving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
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
                    <div className="bg-white rounded-2xl shadow-xl w-full max-sm overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
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
                                <button type="submit" disabled={bankSaving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Save Bank</button>
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
                                <button type="button" onClick={() => setIsReTenderModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold">Cancel</button>
                                <button 
                                    type="button" 
                                    disabled={!reTenderReason || loading} 
                                    onClick={() => handleExecuteReTender(reTenderReason)} 
                                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
                                >
                                    Confirm & Create Re-Tender
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
