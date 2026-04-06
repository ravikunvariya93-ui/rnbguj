import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import Link from 'next/link';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    
    // Populate loaId then populate tenderId within loaId
    const workOrder = await WorkOrder.findById(id)
        .populate({
            path: 'loaId',
            populate: { path: 'tenderId' }
        })
        .lean();

    if (!workOrder) {
        notFound();
    }

    const loa = workOrder.loaId as any;
    const tender = loa?.tenderId as any;

    const sections = [
        {
            title: 'Agreement Details',
            fields: [
                { label: 'Agreement Year', value: workOrder.agreementYear },
                { label: 'Agreement No.', value: workOrder.agreementNo },
                { label: 'Agreement Date', value: workOrder.agreementDate ? new Date(workOrder.agreementDate).toLocaleDateString('en-GB') : '-' },
            ]
        },
        {
            title: 'Work Order Details',
            fields: [
                { label: 'Worksheet No.', value: workOrder.workOrderWorksheetNo },
                { label: 'Work Order Date', value: workOrder.workOrderDate ? new Date(workOrder.workOrderDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Time Limit Starts From', value: workOrder.timeLimitStartsFrom ? new Date(workOrder.timeLimitStartsFrom).toLocaleDateString('en-GB') : '-' },
                { label: 'Work Duration (Months)', value: workOrder.workDurationMonths },
                { label: 'Stipulated Completion Date', value: workOrder.stipulatedCompletionDate ? new Date(workOrder.stipulatedCompletionDate).toLocaleDateString('en-GB') : '-' },
            ]
        },
        {
            title: 'Security Deposit',
            fields: [
                { label: 'Type', value: workOrder.securityDepositType },
                { label: 'Bank Name', value: workOrder.securityDepositBankName },
                { label: 'S.D. Number', value: workOrder.securityDepositNumber },
                { label: 'S.D. Amount', value: workOrder.securityDepositAmount ? `₹${workOrder.securityDepositAmount.toLocaleString('en-IN')}` : '-' },
                { label: 'S.D. Date', value: workOrder.securityDepositDate ? new Date(workOrder.securityDepositDate).toLocaleDateString('en-GB') : '-' },
            ]
        },
        {
            title: 'Tender Information',
            fields: [
                { label: 'Linked Tender ID', value: tender?.tenderId || 'Unknown' },
                { label: 'Package Name', value: tender?.packageName || '-' },
                { label: 'Contractor Name', value: tender?.contractorName || '-' },
            ]
        }
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/work-orders" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Work Order Details</h1>
                </div>
                <Link
                    href={`/work-orders/${id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Order
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{tender?.packageName || 'Work Order Record'}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 italic">Official work commencement order and contract agreement summary.</p>
                </div>
                <div className="px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        {sections.map((section) => (
                            <div key={section.title} className="py-4 sm:py-5">
                                <dt className="text-sm font-semibold text-blue-600 px-4 sm:px-6 mb-4 uppercase tracking-wider">
                                    {section.title}
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-6 px-4 sm:px-6">
                                        {section.fields.map((field) => (
                                            <div key={field.label} className="sm:col-span-1">
                                                <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{field.value?.toString() || '-'}</dd>
                                            </div>
                                        ))}
                                    </div>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </div>
    );
}
