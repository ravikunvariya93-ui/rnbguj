import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
import Link from 'next/link';
import { 
    ArrowLeft, 
    Edit2, 
    Calendar, 
    IndianRupee, 
    FileText, 
    LayoutList, 
    CheckSquare,
    Printer,
    Layers,
    Receipt,
    Clock,
    AlertCircle
} from 'lucide-react';
import { notFound } from 'next/navigation';
import ExcessSavingTable from '@/components/ExcessSavingTable';
import BillAbstractTable from '@/components/BillAbstractTable';
import WorkWiseExpenditureTable from '@/components/WorkWiseExpenditureTable';
import MeasurementCheckingTable from '@/components/MeasurementCheckingTable';

// Ensure models are registered for populate
void WorkOrder;
void LOA;
void Tender;
void Package;

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ billId?: string }>;
}

export default async function PackageBillsPage({ params, searchParams }: Props) {
    await dbConnect();
    const { id: packageId } = await params;
    const { billId } = await searchParams;

    const pkg = await Package.findById(packageId).lean() as any;
    if (!pkg) {
        notFound();
    }

    // Find all tenders for this package
    const tenders = await Tender.find({ packageId: pkg._id }).lean() as any[];
    const tenderIds = tenders.map(t => t._id);
    const tender = tenders.find(t => !t.cancelled) || tenders[0] || null;

    // Find LOAs for these tenders
    const loas = await LOA.find({ tenderId: { $in: tenderIds } }).lean() as any[];
    const loaIds = loas.map(l => l._id);
    const loa = loas[0] || null;

    // Find WorkOrders
    const workOrders = await WorkOrder.find({ loaId: { $in: loaIds } }).lean() as any[];
    const workOrderIds = workOrders.map(w => w._id);
    const workOrder = workOrders[0] || null;

    // Find all bills for this package
    const bills = await Bill.find({ workOrderId: { $in: workOrderIds } })
        .populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: { path: 'tenderId' }
            }
        })
        .sort({ runningBillNumber: 1, billDate: 1 })
        .lean() as any[];

    if (!bills || bills.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <Link
                        href={`/packages/${packageId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Package
                    </Link>
                </div>
                <div className="bg-white rounded-2xl border border-dashed border-emerald-200 p-12 text-center shadow-xs">
                    <Receipt className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-slate-800">No Bills Logged</h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        There are no billing entries logged for <strong>{pkg.packageName}</strong> yet.
                    </p>
                    <div className="mt-6">
                        <Link
                            href={`/packages/${packageId}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                            Return to Package Details
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Select active bill
    const activeBill = billId 
        ? (bills.find(b => b._id.toString() === billId) || bills[bills.length - 1]) 
        : bills[bills.length - 1];

    const finalContractPrice = tender?.contractPrice || tender?.estimatedAmount || 0;

    const previousBills = await Bill.find({
        workOrderId: activeBill.workOrderId?._id || activeBill.workOrderId,
        runningBillNumber: { $lt: activeBill.runningBillNumber || 1 }
    }).lean() as any[];
    const totalPreviousDeducted = previousBills.reduce((sum: number, b: any) => sum + (b.securityDeposit || 0), 0);

    const compTargetDate = workOrder?.stipulatedCompletionDate ? new Date(workOrder.stipulatedCompletionDate) : null;
    let daysDelay = 0;
    if (compTargetDate) {
        const getDaysDiff = (date1: Date, date2: Date) => {
            const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
            const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
            const diffTime = d1.getTime() - d2.getTime();
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };
        if (activeBill.billType === 'Running') {
            if (activeBill.lastRecordEntryDate) {
                daysDelay = Math.max(0, getDaysDiff(new Date(activeBill.lastRecordEntryDate), compTargetDate));
            }
        } else {
            if (activeBill.actualCompletionDate) {
                daysDelay = Math.max(0, getDaysDiff(new Date(activeBill.actualCompletionDate), compTargetDate));
            }
        }
    }

    const sections = [
        {
            title: 'Basic Info',
            icon: LayoutList,
            fields: [
                { label: 'Bill Type', value: `${activeBill.runningBillNumber}${activeBill.runningBillNumber === 1 ? 'st' : activeBill.runningBillNumber === 2 ? 'nd' : activeBill.runningBillNumber === 3 ? 'rd' : 'th'} and ${activeBill.billType} Bill` },
                { label: 'Package Name', value: pkg.packageName },
                { label: 'Agency / Contractor', value: tender?.selectedAgencyName || workOrder?.agencyName || '-' },
                { label: 'Work Order No.', value: workOrder?.workOrderNo ? `${workOrder.workOrderNo} (${workOrder.workOrderDate ? new Date(workOrder.workOrderDate).toLocaleDateString('en-GB') : '-'})` : '-' },
                { label: 'Agreement No.', value: workOrder?.agreementNo ? `${workOrder.agreementNo} of ${workOrder.agreementYear || '-'}` : '-' },
            ]
        },
        {
            title: 'Dates & Timelines',
            icon: Calendar,
            fields: [
                { label: 'Bill Date', value: activeBill.billDate ? new Date(activeBill.billDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Stipulated Completion Date', value: workOrder?.stipulatedCompletionDate ? new Date(workOrder.stipulatedCompletionDate).toLocaleDateString('en-GB') : '-' },
                { label: activeBill.billType === 'Running' ? 'Last Record Entry Date' : 'Actual Completion Date', value: (activeBill.billType === 'Running' ? activeBill.lastRecordEntryDate : activeBill.actualCompletionDate) ? new Date(activeBill.billType === 'Running' ? activeBill.lastRecordEntryDate : activeBill.actualCompletionDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Delay (Days)', value: daysDelay > 0 ? `${daysDelay} Days` : '0 (On Time)' },
            ]
        },
        {
            title: 'Financial Breakdown',
            icon: IndianRupee,
            fields: [
                { label: 'Tender Approved Amount', value: finalContractPrice ? `₹${finalContractPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-' },
                { label: 'Gross Work Executed', value: `₹${(activeBill.grossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                { label: 'Work Done Since Last Bill', value: `₹${(activeBill.workDoneSinceLastBill || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                { label: 'Net Payable Amount', value: `₹${(activeBill.netPayableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
            ]
        },
        {
            title: 'Statutory Deductions',
            icon: FileText,
            fields: [
                { label: 'Total Deductions', value: `₹${(activeBill.totalDeduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                { label: 'Security Deposit Deducted', value: `₹${(activeBill.securityDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Total SD: ₹${(totalPreviousDeducted + (activeBill.securityDeposit || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })})` },
                { label: 'IT-TDS / GST-TDS / Cess', value: `IT: ₹${(activeBill.incomeTaxTds || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | GST: ₹${(activeBill.gstTds || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Cess: ₹${(activeBill.labourCess || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                { label: 'Net Paid Amount (Cheque)', value: `₹${(activeBill.netPaidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
            ]
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* TOP HEADER */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/packages/${packageId}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Package
                        </Link>
                        <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-emerald-100/90 text-emerald-950 rounded-lg border border-emerald-300">
                            {activeBill.runningBillNumber}{activeBill.runningBillNumber === 1 ? 'st' : activeBill.runningBillNumber === 2 ? 'nd' : activeBill.runningBillNumber === 3 ? 'rd' : 'th'} and {activeBill.billType} Bill
                        </span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 pt-1">
                        {pkg.packageName}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                        Bill Date: {activeBill.billDate ? new Date(activeBill.billDate).toLocaleDateString('en-GB') : '-'} &nbsp;|&nbsp; Gross: <span className="font-mono font-bold text-slate-700">₹{(activeBill.grossAmount || 0).toLocaleString('en-IN')}</span> &nbsp;|&nbsp; Net Paid: <span className="font-mono font-extrabold text-emerald-700">₹{(activeBill.netPaidAmount || 0).toLocaleString('en-IN')}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href={`/packages/${packageId}/bills/${activeBill._id.toString()}/edit`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                        <Edit2 className="w-4 h-4" /> Edit Bill
                    </Link>
                    <Link
                        href={`/bills/${activeBill._id.toString()}/checklist`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                        <CheckSquare className="w-4 h-4" /> Audit Checklist
                    </Link>
                </div>
            </div>

            {/* BILL SELECTOR TABS (IF MULTIPLE BILLS) */}
            {bills.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Bills:</span>
                    {bills.map((b: any) => {
                        const isSelected = b._id.toString() === activeBill._id.toString();
                        return (
                            <Link
                                key={b._id.toString()}
                                href={`/packages/${packageId}/bills?billId=${b._id.toString()}`}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                                    isSelected
                                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200'
                                }`}
                            >
                                {b.runningBillNumber}{b.runningBillNumber === 1 ? 'st' : b.runningBillNumber === 2 ? 'nd' : b.runningBillNumber === 3 ? 'rd' : 'th'} {b.billType} Bill
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* 4 SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {sections.map((section) => (
                    <div key={section.title} className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 bg-transparent border-b border-emerald-200 flex items-center gap-2">
                            <section.icon className="w-4 h-4 text-emerald-800" />
                            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{section.title}</h2>
                        </div>
                        <div className="p-5">
                            <dl className="grid grid-cols-1 gap-y-3.5">
                                {section.fields.map((field) => (
                                    <div key={field.label}>
                                        <dt className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{field.label}</dt>
                                        <dd className="mt-0.5 text-xs text-slate-800 font-semibold">{field.value?.toString() || '-'}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                ))}
            </div>

            {/* BILL ABSTRACT SECTION */}
            <BillAbstractTable 
                items={activeBill.items || []} 
                tender={tender} 
                labourCessApplicable={activeBill.labourCessApplicable || false} 
                initialExpanded={false} 
            />

            {/* EXCESS / SAVING STATEMENT SECTION */}
            <ExcessSavingTable items={activeBill.items || []} initialExpanded={false} />

            {/* WORK-WISE EXPENDITURE SECTION */}
            <WorkWiseExpenditureTable 
                works={activeBill.works || []} 
                tender={tender} 
                labourCessApplicable={activeBill.labourCessApplicable || false} 
                initialExpanded={false} 
            />

            {/* AUDIT MEMO SECTION */}
            <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl shadow-xs overflow-hidden mb-8">
                <div className="px-6 py-4 bg-transparent border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-800" />
                        <h2 className="text-base font-bold text-slate-800 tracking-tight">Audit Memo</h2>
                    </div>
                </div>
                
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Group 1: Payables / Deductibles */}
                        <div className="bg-white p-5 rounded-xl border border-emerald-200 space-y-3 shadow-2xs">
                            <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider border-b border-emerald-100 pb-2">
                                Payables / Deductibles
                            </h3>
                            
                            <div className="space-y-2.5 text-xs">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600 font-medium">Gross Amount:</span>
                                    <span className="text-slate-800 font-mono font-bold">₹{(activeBill.grossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Previously Paid Amount:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.auditMemoPreviouslyPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Amount of Dismantle Credit:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.dismantleCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Amount of Excess / Extra Items:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.excessExtraAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600 flex items-center gap-1.5">
                                        <span>Amount of Price Adjustment:</span>
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${(activeBill as any).priceAdjustmentType === 'Deductible' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                            {(activeBill as any).priceAdjustmentType || 'Payable'}
                                        </span>
                                    </span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.priceAdjustment || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Amount of Administrative Approval:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.adminApprovalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Withheld Deposit:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.withheldDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center border-t border-emerald-200 pt-3 bg-emerald-50/70 p-3 rounded-lg">
                                <span className="text-xs font-bold text-emerald-950">Net Payable Amount:</span>
                                <span className="text-sm font-extrabold text-emerald-950 font-mono">₹{(activeBill.netPayableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Group 2: Deductions & Net Paid */}
                        <div className="bg-white p-5 rounded-xl border border-emerald-200 space-y-3 shadow-2xs">
                            <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider border-b border-emerald-100 pb-2">
                                Statutory Deductions
                            </h3>
                            
                            <div className="space-y-2.5 text-xs">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Income Tax TDS:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.incomeTaxTds || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">GST TDS:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.gstTds || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Labour Cess:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.labourCess || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Security Deposit:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.securityDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Water Charges:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.waterCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Liquidated Damages (Delay Penalty):</span>
                                    <span className="text-rose-600 font-mono font-semibold">₹{(activeBill.liquidatedDamages || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-600">Other Deductions:</span>
                                    <span className="text-slate-800 font-mono">₹{(activeBill.otherDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center border-t border-emerald-200 pt-3 bg-emerald-100/70 p-3 rounded-lg">
                                <span className="text-xs font-extrabold text-emerald-950">Net Paid Amount (Cheque):</span>
                                <span className="text-sm font-black text-emerald-950 font-mono">₹{(activeBill.netPaidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MEASUREMENT CHECKING TABLE */}
            <MeasurementCheckingTable items={activeBill.items || []} initialExpanded={false} />
        </div>
    );
}
