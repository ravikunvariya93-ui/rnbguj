import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import Link from 'next/link';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function ApprovedWorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    const work = await ApprovedWork.findById(id).lean();

    if (!work) {
        notFound();
    }

    const sections = [
        {
            title: 'General Information',
            fields: [
                { label: 'Name of Work', value: work.workName },
                { label: 'Taluka', value: work.taluka },
                { label: 'District', value: work.district },
                { label: 'Sub Division', value: work.subDivision },
                { label: 'MLA Name', value: work.mlaName },
                { label: 'MP Name', value: work.mpName },
                { label: 'Road Category', value: work.roadCategory },
            ]
        },
        {
            title: 'Financial & Approval Details',
            fields: [
                { label: 'Scheme Name', value: work.schemeName },
                { label: 'Budget Head', value: work.budgetHead },
                { label: 'Approval Year', value: work.approvalYear },
                { label: 'Nature of Work', value: work.natureOfWork },
                { label: 'Length (km)', value: work.length },
                { label: 'Amount Approved (Lakhs)', value: work.jobNumberAmount ? `₹${work.jobNumberAmount.toLocaleString('en-IN')}` : '-' },
                { label: 'WMS Code', value: work.wmsItemCode },
                { label: 'Approval Date', value: work.jobNumberApprovalDate ? new Date(work.jobNumberApprovalDate).toLocaleDateString('en-GB') : '-' },
            ]
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/approved-works" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Approved Work Details</h1>
                </div>
                <Link
                    href={`/approved-works/${id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Work
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{work.workName}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 italic">Detailed summary of project specifications and approvals.</p>
                </div>
                <div className="px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        {sections.map((section) => (
                            <div key={section.title} className="py-4 sm:py-5">
                                <dt className="text-sm font-semibold text-blue-600 px-4 sm:px-6 mb-4 uppercase tracking-wider">
                                    {section.title}
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 px-4 sm:px-6">
                                        {section.fields.map((field) => (
                                            <div key={field.label} className="sm:col-span-1">
                                                <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{field.value || '-'}</dd>
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
