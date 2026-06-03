'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RefreshCw, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import SearchableSelect from './SearchableSelect';

interface IBillItem {
    itemNo: string;
    description: string;
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
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${d.getFullYear()}`;
    } catch {
        return '';
    }
}

export default function BillForm({ initialData = {}, isEditing = false }: BillFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetchingAbstract, setFetchingAbstract] = useState(false);
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [tenderPercentage, setTenderPercentage] = useState(0);
    const [tenderDirection, setTenderDirection] = useState('Above');

    const sanitized = Object.fromEntries(
        Object.entries(initialData).map(([k, v]) => [k, v == null ? '' : v])
    ) as any;

    const [formData, setFormData] = useState<BillFormData>({
        workOrderId: '',
        billType: 'Running',
        runningBillNumber: '1',
        billDate: '',
        grossAmount: 0,
        netPaidAmount: sanitized.netPaidAmount || '',
        passingDate: '',
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
        labourCessApplicable: sanitized.labourCessApplicable ?? false,
        items: initialData.items || [] as IBillItem[],
        works: initialData.works || [] as any[],
    });

    useEffect(() => {
        const fetchWorkOrders = async () => {
            try {
                const res = await fetch('/api/work-orders', { cache: 'no-store' });
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
        if (isEditing && initialData) {
            setFormData((prev: any) => ({
                ...prev,
                billDate: formatDateForInput(initialData.billDate),
                passingDate: formatDateForInput(initialData.passingDate),
                workOrderId: initialData.workOrderId?._id || initialData.workOrderId || '',
            }));
        }
    }, [initialData, isEditing]);

    useEffect(() => {
        if (formData.workOrderId && workOrders.length > 0) {
            const selectedWorkOrder = workOrders.find((wo: any) => wo._id === formData.workOrderId);
            if (selectedWorkOrder?.loaId?.tenderId) {
                const pct = selectedWorkOrder.loaId.tenderId.aboveBelowPercentage || 0;
                const dir = selectedWorkOrder.loaId.tenderId.aboveBelowInWord || 'Above';
                setTenderPercentage(pct);
                setTenderDirection(dir);
                if (formData.items && formData.items.length > 0) {
                    calculateTotals(formData.items, pct, dir);
                }
            }
        }
    }, [formData.workOrderId, workOrders]);

    const getDeductionsForNetPayable = (netPayVal: number, runningBillNo: number) => {
        const netPay = Math.max(netPayVal, 0);
        const incomeTax = parseFloat((netPay * 0.02).toFixed(2));
        const gst = parseFloat((netPay * 0.02).toFixed(2));
        const labourCess = parseFloat((netPay * 0.01).toFixed(2));
        const securityDeposit = parseFloat((netPay * 0.06).toFixed(2));
        const freeMaintenanceDeposit = parseFloat((netPay * 0.05).toFixed(2));
        const tpi = netPay > 10000000 ? 100000 : 50000;
        const esmp = runningBillNo === 1 ? 20000 : 0;
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

    const recalculateAuditMemoInternal = (nextData: any) => {
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

        const autoDeductions = getDeductionsForNetPayable(netPay, Number(nextData.runningBillNumber));

        let it, gstDeduction, cessVal, sd, fmd, tpiVal, esmpVal;

        if (oldNetPay !== netPay) {
            it = autoDeductions.incomeTax;
            gstDeduction = autoDeductions.gst;
            cessVal = autoDeductions.labourCess;
            sd = autoDeductions.securityDeposit;
            fmd = autoDeductions.freeMaintenanceDeposit;
            tpiVal = autoDeductions.tpi;
            esmpVal = autoDeductions.esmp;
        } else {
            it = nextData.incomeTax !== undefined ? (parseFloat(nextData.incomeTax) || 0) : autoDeductions.incomeTax;
            gstDeduction = nextData.gst !== undefined ? (parseFloat(nextData.gst) || 0) : autoDeductions.gst;
            cessVal = nextData.labourCess !== undefined ? (parseFloat(nextData.labourCess) || 0) : autoDeductions.labourCess;
            sd = nextData.securityDeposit !== undefined ? (parseFloat(nextData.securityDeposit) || 0) : autoDeductions.securityDeposit;
            fmd = nextData.freeMaintenanceDeposit !== undefined ? (parseFloat(nextData.freeMaintenanceDeposit) || 0) : autoDeductions.freeMaintenanceDeposit;
            tpiVal = nextData.tpi !== undefined ? (parseFloat(nextData.tpi) || 0) : autoDeductions.tpi;
            esmpVal = nextData.esmp !== undefined ? (parseFloat(nextData.esmp) || 0) : autoDeductions.esmp;
        }

        const asphalt = parseFloat(nextData.asphaltDeposit) || 0;
        const core = parseFloat(nextData.coreSampleDeposit) || 0;
        const tld = parseFloat(nextData.timeLimitDeposit) || 0;
        const testing = parseFloat(nextData.testingCharges) || 0;
        const otherDep = parseFloat(nextData.otherDeposit) || 0;

        const totalDed = parseFloat((it + gstDeduction + cessVal + sd + fmd + asphalt + core + tpiVal + esmpVal + tld + testing + otherDep).toFixed(2));
        const netPaid = parseFloat((netPay - totalDed).toFixed(2));

        return {
            ...nextData,
            incomeTax: it,
            gst: gstDeduction,
            labourCess: cessVal,
            securityDeposit: sd,
            freeMaintenanceDeposit: fmd,
            tpi: tpiVal,
            esmp: esmpVal,
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
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }

        if (name === 'labourCessApplicable') {
            calculateTotals(formData.items, tenderPercentage, tenderDirection, value as boolean);
        }
    };

    const handleWorkOrderSelect = async (id: string) => {
        const selectedWorkOrderObj = workOrders.find((wo: any) => wo._id === id);
        const pkgWorks = selectedWorkOrderObj?.loaId?.tenderId?.packageId?.works || [];
        const mappedWorks = pkgWorks.map((pw: any, i: number) => ({
            srNo: String(i + 1),
            nameOfWork: pw.workName,
            amount: 0
        }));

        setFormData((prev: any) => ({ ...prev, workOrderId: id, works: mappedWorks }));
        
        // Fetch abstract if not editing (or if they change work order)
        if (id) {
            setFetchingAbstract(true);
            try {
                const res = await fetch(`/api/bills/abstract?workOrderId=${id}`);
                const data = await res.json();
                if (data.success) {
                    setFormData((prev: any) => ({ ...prev, items: data.data }));
                    calculateTotals(data.data);
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
            setFormData((prev: any) => ({ ...prev, items: [] }));
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
        
        setFormData((prev: any) => ({ ...prev, items: newItems }));
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
        setFormData((prev: any) => ({ ...prev, items: newItems }));
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

    const calculateTotals = (items: IBillItem[], pct?: number, dir?: string, cess?: boolean) => {
        const actualPct = pct !== undefined ? pct : tenderPercentage;
        const actualDir = dir !== undefined ? dir : tenderDirection;
        const isCess = cess !== undefined ? cess : formData.labourCessApplicable;

        const totalToBePaid = items.reduce((sum, item) => sum + (item.toBePaidAmount || 0), 0);
        const adjAmount = totalToBePaid * (actualPct / 100);
        const netAmount = actualDir === 'Below' ? totalToBePaid - adjAmount : totalToBePaid + adjAmount;
        
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
            return recalculateAuditMemoInternal(nextData);
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
            const parseDateOutput = (dateStr: string) => {
                if (!dateStr) return undefined;
                const d = parseDateStr(dateStr);
                return d ? d.toISOString() : undefined;
            };

            submissionData.billDate = parseDateOutput(formData.billDate) as any;
            submissionData.passingDate = parseDateOutput(formData.passingDate) as any;
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

            router.push('/bills');
            router.refresh();
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
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white shadow rounded-lg">
            
            {/* General Information Section */}
            <div className="p-8 pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Bill Details</h3>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
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
                                    <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500 bg-gray-50/50">
                                        Select a Work Order above to load the BOQ items abstract.
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
                                        <td className="px-3 py-2 text-sm text-slate-700 font-mono">
                                            {item.itemType === 'Extra' ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.fullRate || ''}
                                                    onChange={(e) => handleExtraItemFieldChange(index, 'fullRate', e.target.value)}
                                                    className="block w-24 text-xs border-gray-300 rounded-md p-1 border focus:ring-blue-500 focus:border-blue-500"
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
                                                step="0.01"
                                                value={item.quantity || ''}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
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
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-3 py-2 border-r border-blue-100 bg-blue-50/30">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.partRate || ''}
                                                onChange={(e) => handleItemChange(index, 'partRate', e.target.value)}
                                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        
                                        {/* Calculated Fields */}
                                        <td className="px-3 py-3 text-sm text-slate-800 font-mono bg-slate-50">{item.uptoDateAmount.toFixed(2)}</td>
                                        
                                        <td className="px-3 py-2 bg-amber-50/30">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.previousPaidAmount || ''}
                                                onChange={(e) => handleItemChange(index, 'previousPaidAmount', e.target.value)}
                                                className="block w-full sm:text-sm border-amber-200 rounded-md p-1.5 border focus:ring-amber-500 focus:border-amber-500"
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
                                        <td colSpan={6} className="px-3 py-2.5 text-right text-sm text-slate-700">Total Amount:</td>
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
                                        <td colSpan={6} className="px-3 py-2 text-right text-sm text-slate-600">{tenderPercentage}% {tenderDirection}:</td>
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
                                        <td colSpan={6} className="px-3 py-2.5 text-right text-sm text-slate-700 font-semibold">Net Amount:</td>
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
                                        <td colSpan={6} className="px-3 py-2 text-right text-sm text-slate-600">
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
                                        <td colSpan={6} className="px-3 py-3 text-right text-sm text-emerald-800 text-base">Net Payable Amount:</td>
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
                                        <td colSpan={6} className="px-3 py-3 text-right text-sm text-emerald-900 tracking-wider">Say Amount:</td>
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

            {/* Audit Memo Section */}
            <div className="p-8 pt-4 border-t border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Audit Memo</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Group 1: Payables / Deductables */}
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Payables / Deductables</h4>
                        
                        <div className="grid grid-cols-2 gap-4 items-center">
                            <span className="text-sm text-slate-600 font-semibold">Gross Amount:</span>
                            <span className="text-sm text-slate-800 font-mono font-bold">₹{Number(formData.grossAmount).toFixed(2)}</span>
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

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label htmlFor="securityDepositDeduction" className="text-sm text-slate-600">Security Deposit:</label>
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
                            <input
                                type="number"
                                step="0.01"
                                name="timeLimitDeposit"
                                id="timeLimitDeposit"
                                value={formData.timeLimitDeposit === 0 ? '' : formData.timeLimitDeposit}
                                onChange={(e) => recalculateAuditMemo({ timeLimitDeposit: e.target.value })}
                                className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                placeholder="0.00"
                            />
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
                        <Link href="/bills" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
                        <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                            <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Bill & Abstract'}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
