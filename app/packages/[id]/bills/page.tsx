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
    CheckSquare,
    Receipt,
    FileText,
    Printer
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

function serialize<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    const sanitized = JSON.parse(
        JSON.stringify(obj, (_key, value) => {
            if (value && typeof value === 'object') {
                if (value._bsontype || (value.constructor && (value.constructor.name === 'ObjectId' || value.constructor.name === 'ObjectID'))) {
                    return value.toString();
                }
                if (value.type === 'Buffer' || value.buffer) {
                    return typeof value.toString === 'function' ? value.toString() : String(value);
                }
            }
            return value;
        })
    );

    const clean = (val: any): any => {
        if (!val || typeof val !== 'object') return val;
        if (Array.isArray(val)) return val.map(clean);
        const res: any = {};
        for (const k of Object.keys(val)) {
            const v = val[k];
            if (v && typeof v === 'object' && v.buffer && typeof v.buffer === 'object') {
                res[k] = String(v);
            } else {
                res[k] = clean(v);
            }
        }
        return res;
    };

    return clean(sanitized);
}

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ billId?: string }>;
}

export default async function PackageBillsPage({ params, searchParams }: Props) {
    await dbConnect();
    const { id: packageId } = await params;
    const { billId } = await searchParams;

    const pkgRaw = await Package.findById(packageId).lean() as any;
    if (!pkgRaw) {
        notFound();
    }
    const pkg = serialize(pkgRaw);

    // Find all tenders for this package
    const tenders = await Tender.find({ packageId: pkg._id }).lean() as any[];
    const tenderIds = tenders.map(t => t._id);
    const tenderRaw = tenders.find(t => !t.cancelled) || tenders[0] || null;
    const tender = serialize(tenderRaw);

    // Find LOAs for these tenders
    const loas = await LOA.find({ tenderId: { $in: tenderIds } }).lean() as any[];
    const loaIds = loas.map(l => l._id);
    const loa = serialize(loas[0] || null);

    // Find WorkOrders
    const workOrders = await WorkOrder.find({ loaId: { $in: loaIds } }).lean() as any[];
    const workOrderIds = workOrders.map(w => w._id);
    const workOrder = serialize(workOrders[0] || null);

    // Find all bills for this package
    const billsRaw = await Bill.find({ workOrderId: { $in: workOrderIds } })
        .populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: { path: 'tenderId' }
            }
        })
        .sort({ runningBillNumber: 1, billDate: 1 })
        .lean() as any[];
    const bills = serialize(billsRaw);

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
    const activeBillRaw = billId 
        ? (bills.find(b => b._id.toString() === billId) || bills[bills.length - 1]) 
        : bills[bills.length - 1];
    const activeBill = serialize(activeBillRaw);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Top Toolbar */}
            <div className="bg-emerald-600 border border-emerald-700 p-4 rounded-2xl shadow-sm text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Link 
                        href={`/packages/${packageId}`} 
                        className="p-2 hover:bg-emerald-700 bg-emerald-700/40 text-white rounded-xl transition-all border border-emerald-400/40 shadow-2xs flex-shrink-0 cursor-pointer" 
                        title="Back to Package"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 bg-emerald-700/80 text-emerald-100 rounded-lg border border-emerald-500/50">
                                {activeBill.runningBillNumber}{activeBill.runningBillNumber === 1 ? 'st' : activeBill.runningBillNumber === 2 ? 'nd' : activeBill.runningBillNumber === 3 ? 'rd' : 'th'} and {activeBill.billType} Bill
                            </span>
                        </div>
                        <h1 className="text-lg md:text-xl font-extrabold text-white break-words">
                            {pkg.packageName}
                        </h1>
                        <p className="text-xs text-emerald-100 font-medium">
                            Bill Date: {activeBill.billDate ? new Date(activeBill.billDate).toLocaleDateString('en-GB') : '-'} &nbsp;|&nbsp; Gross: <span className="font-mono font-bold text-white">{(activeBill.grossAmount || 0).toLocaleString('en-IN')}</span> &nbsp;|&nbsp; Net Paid: <span className="font-mono font-extrabold text-emerald-200">{(activeBill.netPaidAmount || 0).toLocaleString('en-IN')}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center flex-wrap gap-2 flex-shrink-0 pl-11 md:pl-0">
                    <Link
                        href={`/packages/${packageId}/bills/${activeBill._id.toString()}/edit`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-400/40 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                        <Edit2 className="w-4 h-4" /> Edit Bill
                    </Link>
                    <Link
                        href={`/packages/${packageId}/bills/${activeBill._id.toString()}/print-excess-saving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                        <Printer className="w-4 h-4" /> Excess / Saving Statement
                    </Link>
                    <Link
                        href={`/packages/${packageId}/bills/${activeBill._id.toString()}/checklist`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
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

            {/* BILL ABSTRACT SECTION */}
            <BillAbstractTable 
                items={activeBill.items || []} 
                tender={tender} 
                labourCessApplicable={activeBill.labourCessApplicable || false} 
                initialExpanded={false} 
            />

            {/* EXCESS / SAVING STATEMENT SECTION */}
            <ExcessSavingTable 
                items={activeBill.items || []} 
                initialExpanded={false} 
                packageId={packageId}
                billId={activeBill._id.toString()}
            />

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
                        <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                            <Receipt className="w-4 h-4" />
                        </span>
                        <h3 className="font-bold text-slate-800">Audit Memo & Statutory Deductions</h3>
                    </div>
                </div>
                <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        {/* Group 1: Payables / Deductibles */}
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
                                        <td className="excel-value text-right font-mono font-bold">
                                            {Math.round(activeBill.grossAmount || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Previously Paid Amount</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.auditMemoPreviouslyPaid || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Amount of Dismantle Credit</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.dismantleCredit || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Excess / Extra Items</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.excessExtraAmount || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Price Adjustment</td>
                                        <td className="excel-value">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${(activeBill.priceAdjustmentType || 'Payable') === 'Deductible' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {activeBill.priceAdjustmentType || 'Payable'}
                                                </span>
                                                <span className="font-mono text-right">
                                                    {Math.round(activeBill.priceAdjustment || 0).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Administrative Approval</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.adminApprovalAmount || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Withheld Deposit</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.withheldDeposit || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr className="bg-emerald-100/90 font-bold border-t-2 border-emerald-300">
                                        <td className="px-3 py-2 text-right text-xs uppercase font-extrabold text-emerald-950">
                                            Net Payable Amount:
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-black text-sm text-emerald-950">
                                            {Math.round(activeBill.netPayableAmount || 0).toLocaleString('en-IN')}
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
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.incomeTax || activeBill.incomeTaxTds || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">GST</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.gst || activeBill.gstTds || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Labour Cess</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.labourCess || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Security Deposit</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.securityDeposit || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Free Maintenance Deposit</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.freeMaintenanceDeposit || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Asphalt Deposit</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.asphaltDeposit || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Core Sample Deposit</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.coreSampleDeposit || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">TPI (Third Party Inspection)</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.tpi || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">ESMP</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.esmp || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Time Limit Deposit</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.timeLimitDeposit || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">Testing Charges</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.testingCharges || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">{activeBill.otherDepositLabel || 'Other Deposit'}</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.otherDeposit || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="excel-label">{activeBill.otherDeposit2Label || 'Other Deposit 2'}</td>
                                        <td className="excel-value text-right font-mono">
                                            {Math.round(activeBill.otherDeposit2 || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr className="bg-amber-100/90 font-bold border-t-2 border-amber-300">
                                        <td className="px-3 py-2 text-right text-xs uppercase font-extrabold text-amber-950">
                                            Total Deductions:
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-black text-sm text-amber-950">
                                            {Math.round(activeBill.totalDeduction || 0).toLocaleString('en-IN')}
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
                                <span className="font-mono font-bold text-white text-sm">{Math.round(activeBill.netPayableAmount || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <span className="text-emerald-300 font-bold text-base">-</span>
                            <div>
                                <span className="text-emerald-200 font-semibold uppercase text-[10px] tracking-wider block">Total Deductions</span>
                                <span className="font-mono font-bold text-amber-300 text-sm">{Math.round(activeBill.totalDeduction || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <span className="text-emerald-300 font-bold text-base">=</span>
                        </div>
                        <div className="text-right">
                            <span className="text-emerald-200 font-bold uppercase text-[10px] tracking-wider block">Final Net Paid Amount:</span>
                            <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">{Math.round(activeBill.netPaidAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MEASUREMENT CHECKING TABLE */}
            <MeasurementCheckingTable 
                records={activeBill.measurementChecking || []} 
                billItems={activeBill.items || []} 
                initialExpanded={false} 
            />
        </div>
    );
}
