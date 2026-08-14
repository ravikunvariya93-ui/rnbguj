import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, Calendar, IndianRupee, FileText, LayoutList, CheckSquare } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import ExcessSavingTable from '@/components/ExcessSavingTable';
import BillAbstractTable from '@/components/BillAbstractTable';
import WorkWiseExpenditureTable from '@/components/WorkWiseExpenditureTable';
import MeasurementCheckingTable from '@/components/MeasurementCheckingTable';

// Ensure models are registered for populate
void WorkOrder;
void LOA;
void Tender;

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    
    const bill = await Bill.findById(id)
        .populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: { path: 'tenderId' }
            }
        })
        .lean();

    if (!bill) {
        notFound();
    }

    const workOrder = bill.workOrderId as any;
    const loa = workOrder?.loaId as any;
    const tender = loa?.tenderId as any;

    if (tender?.packageId) {
        redirect(`/packages/${tender.packageId}/bills?billId=${id}`);
    }
    const finalContractPrice = tender?.contractPrice || tender?.estimatedAmount || 0;

    const previousBills = await Bill.find({
        workOrderId: workOrder?._id,
        runningBillNumber: { $lt: bill.runningBillNumber || 1 }
    }).lean();
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
        if (bill.billType === 'Running') {
            if (bill.lastRecordEntryDate) {
                daysDelay = Math.max(0, getDaysDiff(new Date(bill.lastRecordEntryDate), compTargetDate));
            }
        } else {
            if (bill.actualCompletionDate) {
                daysDelay = Math.max(0, getDaysDiff(new Date(bill.actualCompletionDate), compTargetDate));
            }
        }
    }

    const sections = [
        {
            title: 'Bill Basics',
            icon: FileText,
            fields: [
                { label: 'Bill Type', value: bill.billType },
                { label: 'Bill Number', value: `${bill.runningBillNumber}${bill.runningBillNumber === 1 ? 'st' : bill.runningBillNumber === 2 ? 'nd' : bill.runningBillNumber === 3 ? 'rd' : 'th'} and ${bill.billType} Bill` },
                { label: 'PRAISA Bill No.', value: (bill as any).praisaBillNo || '-' },
                { label: 'PRAISA Bill Date', value: (bill as any).praisaBillDate ? new Date((bill as any).praisaBillDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Voucher No.', value: (bill as any).voucherNo || '-' },
                { label: 'Voucher Date', value: (bill as any).voucherDate ? new Date((bill as any).voucherDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Delay', value: compTargetDate ? `${daysDelay} days` : '-' },
                { label: 'M.B. Number', value: (bill as any).mbNumber || '-' },
                { label: 'Remarks', value: bill.remarks || '-' },
            ]
        },
        {
            title: 'Financial Details',
            icon: IndianRupee,
            fields: [
                { label: 'Gross Amount', value: bill.grossAmount ? `₹${bill.grossAmount.toLocaleString('en-IN')}` : '-' },
                { label: 'Net Paid Amount', value: bill.netPaidAmount ? `₹${bill.netPaidAmount.toLocaleString('en-IN')}` : '-' },
                { label: 'Deductions', value: (bill.grossAmount && bill.netPaidAmount) ? `₹${(bill.grossAmount - bill.netPaidAmount).toLocaleString('en-IN')}` : '-' },
            ]
        },
        {
            title: 'Important Dates',
            icon: Calendar,
            fields: [
                { label: 'Stipulated Completion Date (Target)', value: compTargetDate ? new Date(compTargetDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Bill Date', value: bill.billDate ? new Date(bill.billDate).toLocaleDateString('en-GB') : '-' },
                ...(bill.billType === 'Final'
                    ? [{ label: 'Date of Completion (Actual)', value: bill.actualCompletionDate ? new Date(bill.actualCompletionDate).toLocaleDateString('en-GB') : '-' }]
                    : [{ label: 'Last Record Entry / Measurement Date', value: bill.lastRecordEntryDate ? new Date(bill.lastRecordEntryDate).toLocaleDateString('en-GB') : '-' }]
                ),
                { label: 'Delay', value: compTargetDate ? `${daysDelay} days` : '-' },
                { label: 'Passing Date', value: bill.passingDate ? new Date(bill.passingDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Created At', value: new Date(bill.createdAt).toLocaleDateString('en-GB') },
            ]
        },
        {
            title: 'Linked Project',
            icon: FileText,
            fields: [
                { label: 'Package Name', value: tender?.packageName || '-' },
                { label: 'Contractor', value: tender?.contractorName || '-' },
                { label: 'Work Order No.', value: workOrder?.agreementNo || '-' },
            ]
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/bills" className="text-gray-500 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {bill.runningBillNumber}{bill.runningBillNumber === 1 ? 'st' : bill.runningBillNumber === 2 ? 'nd' : bill.runningBillNumber === 3 ? 'rd' : 'th'} and {bill.billType} Bill
                        </h1>
                        <p className="text-sm text-gray-500">View detailed financial and abstract data.</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Link
                        href={`/bills/${id}/checklist`}
                        className="inline-flex items-center px-4 py-2 border border-emerald-600 rounded-md shadow-sm text-sm font-medium text-emerald-700 bg-white hover:bg-emerald-50 transition-colors"
                    >
                        <CheckSquare className="w-4 h-4 mr-2" /> Checklist
                    </Link>
                    <GenericDeleteButton 
                        itemId={id} 
                        apiPath="/api/bills" 
                        redirectPath="/bills" 
                        itemName="Bill"
                    />
                    <Link
                        href={`/bills/${id}/edit`}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        <Edit2 className="w-4 h-4 mr-2" /> Edit Bill
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {sections.map((section) => (
                    <div key={section.title} className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                            <section.icon className="w-4 h-4 text-blue-600" />
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{section.title}</h2>
                        </div>
                        <div className="px-5 py-5">
                            <dl className="grid grid-cols-1 gap-y-4">
                                {section.fields.map((field) => (
                                    <div key={field.label}>
                                        <dt className="text-xs font-medium text-gray-500 uppercase">{field.label}</dt>
                                        <dd className="mt-1 text-sm text-gray-900 font-medium">{field.value?.toString() || '-'}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                ))}
            </div>
            {/* Bill Abstract Section */}
            <BillAbstractTable 
                items={bill.items || []} 
                tender={tender} 
                labourCessApplicable={bill.labourCessApplicable || false} 
                initialExpanded={false} 
            />

            {/* Excess / Saving Statement Section */}
            <ExcessSavingTable items={bill.items || []} initialExpanded={false} />

            {/* Work-wise Expenditure Section */}
            <WorkWiseExpenditureTable 
                works={bill.works || []} 
                tender={tender} 
                labourCessApplicable={bill.labourCessApplicable || false} 
                initialExpanded={false} 
            />

            {/* Audit Memo Section */}
            <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden mb-8">
                <div className="px-6 py-5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-700" />
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Audit Memo</h2>
                    </div>
                </div>
                
                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Group 1: Payables / Deductibles */}
                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
                            <h3 className="text-sm font-bold text-slate-805 uppercase tracking-wider border-b border-slate-200 pb-2">
                                Payables / Deductables
                            </h3>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600 font-medium">Gross Amount:</span>
                                    <span className="text-sm text-slate-800 font-mono font-bold">₹{(bill.grossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Previously Paid Amount:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.auditMemoPreviouslyPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Amount of Dismantle Credit:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.dismantleCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Amount of Excess / Extra Items:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.excessExtraAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600 flex items-center gap-1.5">
                                        <span>Amount of Price Adjustment:</span>
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${(bill as any).priceAdjustmentType === 'Deductible' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {(bill as any).priceAdjustmentType || 'Payable'}
                                        </span>
                                    </span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.priceAdjustment || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Amount of Administrative Approval:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.adminApprovalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Withheld Deposit:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.withheldDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center border-t border-slate-300 pt-4 bg-blue-50/50 p-3 rounded">
                                <span className="text-sm font-bold text-blue-900">Net Payable Amount:</span>
                                <span className="text-base font-extrabold text-blue-955 font-mono">₹{(bill.netPayableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Group 2: Deductions */}
                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
                            <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider border-b border-slate-200 pb-2">
                                Deductions
                            </h3>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Income Tax (IT):</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.incomeTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">GST:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.gst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Labour Cess:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.labourCess || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="border-b border-slate-100 pb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">Security Deposit deducted from Bill:</span>
                                        <span className="text-sm text-slate-800 font-mono">₹{(bill.securityDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 text-right mt-0.5 font-medium space-y-0.5">
                                        <div>
                                            total deducted from previous bills: ₹{totalPreviousDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                        {finalContractPrice > 0 ? (
                                            <div>
                                                max can be deducted: ₹{(Math.ceil((finalContractPrice * 0.05) / 100) * 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (5% of final contract price)
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Free Maintenance Deposit:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.freeMaintenanceDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Asphalt Deposit:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.asphaltDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Core Sample Deposit:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.coreSampleDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Third Party Inspection (TPI):</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.tpi || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">ESMP:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.esmp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-slate-600">Time Limit Deposit:</span>
                                        {(() => {
                                            const compTargetDate = workOrder?.stipulatedCompletionDate ? new Date(workOrder.stipulatedCompletionDate) : null;
                                            if (!compTargetDate) return null;
                                            const getDaysDiff = (date1: Date, date2: Date) => {
                                                const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
                                                const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
                                                const diffTime = d1.getTime() - d2.getTime();
                                                return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                            };
                                            let daysDelay = 0;
                                            if (bill.billType === 'Running') {
                                                if (bill.lastRecordEntryDate) {
                                                    daysDelay = Math.max(0, getDaysDiff(new Date(bill.lastRecordEntryDate), compTargetDate));
                                                }
                                            } else {
                                                if (bill.actualCompletionDate) {
                                                    daysDelay = Math.max(0, getDaysDiff(new Date(bill.actualCompletionDate), compTargetDate));
                                                }
                                            }
                                            return (
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    Delay: {daysDelay} days (Target: {compTargetDate.toLocaleDateString('en-GB')})
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <span className="text-sm text-slate-800 font-mono font-bold">₹{(bill.timeLimitDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Testing Charges:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.testingCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">{bill.otherDepositLabel || 'Other Deposit'}:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.otherDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                {((bill.otherDeposit2 || 0) > 0 || bill.otherDeposit2Label) && (
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <span className="text-sm text-slate-600">{bill.otherDeposit2Label || 'Other Deposit 2'}:</span>
                                        <span className="text-sm text-slate-800 font-mono">₹{(bill.otherDeposit2 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-between items-center border-t border-slate-300 pt-4 bg-amber-50/50 p-3 rounded">
                                <span className="text-sm font-bold text-amber-900">Total Deduction:</span>
                                <span className="text-base font-extrabold text-amber-955 font-mono">₹{(bill.totalDeduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-emerald-50 p-6 rounded-lg border border-emerald-250 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
                        <span className="text-lg font-bold text-emerald-900">Final Net Payable to Contractor (Net Paid Amount):</span>
                        <span className="text-2xl font-extrabold text-emerald-950 font-mono">₹{(bill.netPaidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Measurement Checking Section */}
            <MeasurementCheckingTable 
                records={bill.measurementChecking || []} 
                billItems={bill.items || []} 
                initialExpanded={false} 
            />

            <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-6">
                <h3 className="text-sm font-bold text-blue-800 uppercase mb-4">Project Context</h3>
                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <p className="text-sm text-blue-700">
                            This bill is linked to <strong>{tender?.packageName || 'a project'}</strong> under agreement <strong>{workOrder?.agreementNo || 'N/A'}</strong>. 
                            The contractor recorded is <strong>{tender?.contractorName || 'N/A'}</strong>.
                        </p>
                    </div>
                    <Link 
                        href={`/work-orders/${workOrder?._id}`}
                        className="text-sm font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4"
                    >
                        View Full Work Order
                    </Link>
                </div>
            </div>
        </div>
    );
}
