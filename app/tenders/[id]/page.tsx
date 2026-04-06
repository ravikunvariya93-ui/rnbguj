import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import Link from 'next/link';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    const tender = await Tender.findById(id).lean();

    if (!tender) {
        notFound();
    }

    const sections = [
        {
            title: 'Tender Identification',
            fields: [
                { label: 'Tender ID', value: tender.tenderId },
                { label: 'Package Name', value: tender.packageName },
                { label: 'Trial No.', value: tender.trialNo },
                { label: 'Re-Invite?', value: tender.reInvite ? 'Yes' : 'No' },
                { label: 'Tender Notice Year', value: tender.tenderNoticeYear },
                { label: 'Notice No.', value: tender.noticeNo },
                { label: 'Sr No.', value: tender.srNo },
            ]
        },
        {
            title: 'Timeline & Validity',
            fields: [
                { label: 'Creation Date', value: tender.tenderCreationDate ? new Date(tender.tenderCreationDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Last Submission Date', value: tender.lastDateOfSubmission ? new Date(tender.lastDateOfSubmission).toLocaleDateString('en-GB') : '-' },
                { label: 'Opening Date', value: tender.tenderOpeningDate ? new Date(tender.tenderOpeningDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Validity Date', value: tender.tenderValidityDate ? new Date(tender.tenderValidityDate).toLocaleDateString('en-GB') : '-' },
            ]
        },
        {
            title: 'Contract & Pricing',
            fields: [
                { label: 'Estimated Amount', value: tender.estimatedAmount ? `₹${tender.estimatedAmount.toLocaleString('en-IN')}` : '-' },
                { label: 'Contractor Name', value: tender.contractorName },
                { label: 'Contract Price', value: tender.contractPrice ? `₹${tender.contractPrice.toLocaleString('en-IN')}` : '-' },
                { label: 'Above/Below (%)', value: tender.aboveBelowPercentage ? `${tender.aboveBelowPercentage}%` : '-' },
                { label: 'Above/Below (Word)', value: tender.aboveBelowInWord },
            ]
        },
        {
            title: 'Approval Details',
            fields: [
                { label: 'Proposal Date', value: tender.proposalDate ? new Date(tender.proposalDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Approval Office', value: tender.tenderApprovalOffice },
                { label: 'Approval No.', value: tender.tenderApprovalNo },
                { label: 'Approval Date', value: tender.tenderApprovalDate ? new Date(tender.tenderApprovalDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Duration (Months)', value: tender.workDurationMonths },
            ]
        },
        {
            title: 'Acceptance & Agreement',
            fields: [
                { label: 'LOA Worksheet No.', value: tender.acceptanceLetterWorksheetNo },
                { label: 'LOA Date', value: tender.acceptanceLetterDate ? new Date(tender.acceptanceLetterDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Agreement Year', value: tender.agreementYear },
                { label: 'Agreement No.', value: tender.agreementNo },
                { label: 'Agreement Date', value: tender.agreementDate ? new Date(tender.agreementDate).toLocaleDateString('en-GB') : '-' },
            ]
        }
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/tenders" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Tender Details</h1>
                </div>
                <Link
                    href={`/tenders/${id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Tender
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{tender.tenderId} - {tender.packageName}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 italic">Full procurement record and contract award details.</p>
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
