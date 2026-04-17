import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, Calendar, IndianRupee, FileText } from 'lucide-react';
import { notFound } from 'next/navigation';
import GenericDeleteButton from '@/components/GenericDeleteButton';

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
                { label: 'Bill Number', value: bill.billType === 'Running' ? `${bill.runningBillNumber}${bill.runningBillNumber === 1 ? 'st' : bill.runningBillNumber === 2 ? 'nd' : bill.runningBillNumber === 3 ? 'rd' : 'th'} Running` : 'Final' },
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/bills" className="text-gray-500 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {bill.billType === 'Running' ? `${bill.runningBillNumber}${bill.runningBillNumber === 1 ? 'st' : bill.runningBillNumber === 2 ? 'nd' : bill.runningBillNumber === 3 ? 'rd' : 'th'} Running Bill` : 'Final Bill'}
                        </h1>
                        <p className="text-sm text-gray-500">View detailed financial and temporal project data.</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <GenericDeleteButton 
                        id={id} 
                        endpoint="bills" 
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
