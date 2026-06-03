import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, Calendar, IndianRupee, FileText, LayoutList } from 'lucide-react';
import { notFound } from 'next/navigation';
import GenericDeleteButton from '@/components/GenericDeleteButton';

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

    const sections = [
        {
            title: 'Bill Basics',
            icon: FileText,
            fields: [
                { label: 'Bill Type', value: bill.billType },
                { label: 'Bill Number', value: `${bill.runningBillNumber}${bill.runningBillNumber === 1 ? 'st' : bill.runningBillNumber === 2 ? 'nd' : bill.runningBillNumber === 3 ? 'rd' : 'th'} and ${bill.billType} Bill` },
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
                { label: 'Bill Date', value: bill.billDate ? new Date(bill.billDate).toLocaleDateString('en-GB') : '-' },
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
            <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden mb-8">
                <div className="px-6 py-5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <LayoutList className="w-5 h-5 text-slate-700" />
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bill Abstract (Line Items)</h2>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {bill.items?.length || 0} Items
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">No.</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider w-1/4">Description</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Unit</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Rate (₹)</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-700 bg-blue-50 tracking-wider border-l border-blue-100 min-w-[140px]">Upto Date Qty</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-700 bg-blue-50 tracking-wider border-r border-blue-100 min-w-[140px]">Part Rate (₹)</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider bg-slate-100">Upto Date Amt</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-amber-700 bg-amber-50 tracking-wider">Prev Paid Amt</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 bg-emerald-50 tracking-wider">To Be Paid</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(!bill.items || bill.items.length === 0) ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                                        No abstract items recorded for this bill.
                                    </td>
                                </tr>
                            ) : (
                                bill.items.map((item: any, index: number) => (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4 text-sm text-slate-700 font-medium whitespace-nowrap">{item.itemNo}</td>
                                        <td className="px-4 py-4 text-xs text-slate-600 line-clamp-3" title={item.description}>{item.description}</td>
                                        <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">{item.unit}</td>
                                        <td className="px-4 py-4 text-sm text-slate-700 font-mono">{item.fullRate?.toFixed(2)}</td>
                                        
                                        <td className="px-4 py-4 text-sm text-blue-800 font-mono font-medium border-l border-blue-100 bg-blue-50/30">
                                            {item.quantity?.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-blue-800 font-mono font-medium border-r border-blue-100 bg-blue-50/30">
                                            {item.partRate?.toFixed(2)}
                                        </td>
                                        
                                        <td className="px-4 py-4 text-sm text-slate-800 font-mono bg-slate-50">{item.uptoDateAmount?.toFixed(2)}</td>
                                        <td className="px-4 py-4 text-sm text-amber-800 font-mono bg-amber-50/30">{item.previousPaidAmount?.toFixed(2)}</td>
                                        <td className="px-4 py-4 text-sm font-bold text-emerald-700 font-mono bg-emerald-50/50">
                                            {item.toBePaidAmount?.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {bill.items && bill.items.length > 0 && (() => {
                            const totalUptoDate = bill.items.reduce((s: number, i: any) => s + (i.uptoDateAmount || 0), 0);
                            const totalPrevPaid = bill.items.reduce((s: number, i: any) => s + (i.previousPaidAmount || 0), 0);
                            const totalToBePaid = bill.items.reduce((s: number, i: any) => s + (i.toBePaidAmount || 0), 0);

                            const pct = tender?.aboveBelowPercentage || 0;
                            const dir = tender?.aboveBelowInWord || 'Above';
                            const isCess = bill.labourCessApplicable || false;

                            const uptoDateAdj = totalUptoDate * (pct / 100);
                            const prevPaidAdj = totalPrevPaid * (pct / 100);
                            const toBePaidAdj = totalToBePaid * (pct / 100);

                            const uptoDateNet = dir === 'Below' ? totalUptoDate - uptoDateAdj : totalUptoDate + uptoDateAdj;
                            const prevPaidNet = dir === 'Below' ? totalPrevPaid - prevPaidAdj : totalPrevPaid + prevPaidAdj;
                            const toBePaidNet = dir === 'Below' ? totalToBePaid - toBePaidAdj : totalToBePaid + toBePaidAdj;

                            const uptoDateGstBase = isCess ? uptoDateNet * 0.99 : uptoDateNet;
                            const prevPaidGstBase = isCess ? prevPaidNet * 0.99 : prevPaidNet;
                            const toBePaidGstBase = isCess ? toBePaidNet * 0.99 : toBePaidNet;

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
                                        <td colSpan={6} className="px-4 py-3.5 text-right text-sm text-slate-700 uppercase tracking-wider font-semibold">Total Amount:</td>
                                        <td className="px-4 py-3.5 text-sm text-slate-800 font-mono">
                                            {totalUptoDate.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-amber-700 font-mono">
                                            {totalPrevPaid.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-emerald-700 font-mono text-lg border-x border-emerald-200 bg-emerald-100/50 font-bold">
                                            ₹{totalToBePaid.toFixed(2)}
                                        </td>
                                    </tr>
                                    {/* Row 2: Tender percentage */}
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <td colSpan={6} className="px-4 py-3 text-right text-sm text-slate-600 uppercase tracking-wider font-normal">{pct}% {dir}:</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 font-mono font-normal">
                                            {dir === 'Below' ? '-' : ''}{uptoDateAdj.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-amber-600 font-mono font-normal">
                                            {dir === 'Below' ? '-' : ''}{prevPaidAdj.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-emerald-600 font-mono border-x border-slate-200 font-bold">
                                            {dir === 'Below' ? '-₹' : '₹'}{toBePaidAdj.toFixed(2)}
                                        </td>
                                    </tr>
                                    {/* Row 3: Net Amount */}
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={6} className="px-4 py-3.5 text-right text-sm text-slate-700 uppercase tracking-wider">Net Amount:</td>
                                        <td className="px-4 py-3.5 text-sm text-slate-800 font-mono">
                                            {uptoDateNet.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-amber-700 font-mono">
                                            {prevPaidNet.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-emerald-700 font-mono border-x border-slate-200 font-bold">
                                            ₹{toBePaidNet.toFixed(2)}
                                        </td>
                                    </tr>
                                    {/* Row 4: Add 18% GST */}
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <td colSpan={6} className="px-4 py-3 text-right text-sm text-slate-600 uppercase tracking-wider font-normal">Add 18% GST{isCess ? ' (Cess Applied)' : ''}:</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 font-mono font-normal">
                                            {uptoDateGst.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-amber-600 font-mono font-normal">
                                            {prevPaidGst.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-emerald-600 font-mono border-x border-slate-200 font-bold">
                                            ₹{toBePaidGst.toFixed(2)}
                                        </td>
                                    </tr>
                                    {/* Row 5: Net Payable Amount */}
                                    <tr className="bg-emerald-50 font-bold border-b border-slate-200">
                                        <td colSpan={6} className="px-4 py-4 text-right text-sm text-emerald-800 uppercase tracking-wider">Net Payable Amount:</td>
                                        <td className="px-4 py-4 text-sm text-emerald-800 font-mono text-base font-bold">
                                            {uptoDatePayable.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-amber-800 font-mono text-base font-bold">
                                            {prevPaidPayable.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-emerald-905 font-mono text-lg border-x border-emerald-200 bg-emerald-100/50 font-extrabold">
                                            ₹{toBePaidPayable.toFixed(2)}
                                        </td>
                                    </tr>
                                    {/* Row 6: Say Amount */}
                                    <tr className="bg-emerald-100 font-bold border-b-4 border-emerald-300">
                                        <td colSpan={6} className="px-4 py-3.5 text-right text-sm text-emerald-900 tracking-wider">Say Amount:</td>
                                        <td className="px-4 py-3.5 text-sm text-emerald-900 font-mono">
                                            {Math.floor(uptoDatePayable).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-amber-900 font-mono">
                                            {Math.floor(prevPaidPayable).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-emerald-955 font-mono text-lg border-x border-emerald-300 bg-emerald-200/50 font-extrabold">
                                            ₹{Math.floor(toBePaidPayable).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            );
                        })()}
                    </table>
                </div>
            </div>

            {/* Work-wise Expenditure Section */}
            {bill.works && bill.works.length > 0 && (() => {
                const pct = tender?.aboveBelowPercentage || 0;
                const dir = tender?.aboveBelowInWord || 'Above';
                const isCess = bill.labourCessApplicable || false;

                const totalAmount = bill.works.reduce((s: number, w: any) => s + (w.amount || 0), 0);
                const pctMultiplier = pct / 100;
                const adjAmount = totalAmount * pctMultiplier;
                const netAmount = dir === 'Below' ? totalAmount - adjAmount : totalAmount + adjAmount;
                
                const gstBase = isCess ? netAmount * 0.99 : netAmount;
                const gstAmount = gstBase * 0.18;
                const payableAmount = netAmount + gstAmount;

                return (
                    <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden mb-8">
                        <div className="px-6 py-5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutList className="w-5 h-5 text-slate-700" />
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Work-wise Expenditure</h2>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider w-24">SR. No.</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider">Name of Work</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 tracking-wider w-48">Amount (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {bill.works.map((work: any, index: number) => (
                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3.5 text-sm text-slate-700 font-medium whitespace-nowrap">{work.srNo}</td>
                                            <td className="px-4 py-3.5 text-sm text-slate-600">{work.nameOfWork}</td>
                                            <td className="px-4 py-3.5 text-sm text-slate-800 font-mono">₹{work.amount?.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={2} className="px-4 py-2.5 text-right text-sm text-slate-700 uppercase tracking-wider font-semibold">Total Amount:</td>
                                        <td className="px-4 py-2.5 text-sm text-slate-800 font-mono">₹{totalAmount.toFixed(2)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <td colSpan={2} className="px-4 py-2 text-right text-sm text-slate-600 uppercase tracking-wider font-normal">{pct}% {dir}:</td>
                                        <td className="px-4 py-2 text-sm text-slate-600 font-mono font-normal">
                                            {dir === 'Below' ? '-₹' : '₹'}{adjAmount.toFixed(2)}
                                        </td>
                                    </tr>
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={2} className="px-4 py-2.5 text-right text-sm text-slate-700 uppercase tracking-wider">Net Amount:</td>
                                        <td className="px-4 py-2.5 text-sm text-emerald-700 font-mono font-bold">₹{netAmount.toFixed(2)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <td colSpan={2} className="px-4 py-2 text-right text-sm text-slate-600 uppercase tracking-wider font-normal">
                                            Add 18% GST{isCess ? ' (Cess Applied)' : ''}:
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-600 font-mono font-normal">₹{gstAmount.toFixed(2)}</td>
                                    </tr>
                                    <tr className="bg-emerald-50 font-bold border-b border-slate-200">
                                        <td colSpan={2} className="px-4 py-3 text-right text-sm text-emerald-800 uppercase tracking-wider">Net Payable Amount:</td>
                                        <td className="px-4 py-3 text-sm text-emerald-900 font-mono text-lg font-extrabold">₹{payableAmount.toFixed(2)}</td>
                                    </tr>
                                    <tr className="bg-emerald-100 font-bold border-b-4 border-emerald-300">
                                        <td colSpan={2} className="px-4 py-3 text-right text-sm text-emerald-900 tracking-wider">Say Amount:</td>
                                        <td className="px-4 py-3 text-sm text-emerald-950 font-mono text-lg font-extrabold">₹{Math.floor(payableAmount).toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                );
            })()}

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
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Security Deposit:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.securityDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
                                    <span className="text-sm text-slate-600">Time Limit Deposit:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.timeLimitDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Testing Charges:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.testingCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-sm text-slate-600">Other Deposit:</span>
                                    <span className="text-sm text-slate-800 font-mono">₹{(bill.otherDeposit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
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
