import dbConnect from '@/lib/db';
import LOA from '@/models/LOA';
import Link from 'next/link';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function LOADetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    const loa = await LOA.findById(id).populate('tenderId').lean();

    if (!loa) {
        notFound();
    }

    const sections = [
        {
            title: 'Acceptance Detail',
            fields: [
                { label: 'Worksheet No.', value: loa.acceptanceLetterWorksheetNo },
                { label: 'Acceptance Letter Date', value: loa.acceptanceLetterDate ? new Date(loa.acceptanceLetterDate).toLocaleDateString('en-GB') : '-' },
                { label: 'Stamp Duty', value: loa.stampDuty ? `₹${loa.stampDuty.toLocaleString('en-IN')}` : '-' },
                { label: 'Defect Liability Period', value: loa.defectLiabilityPeriod },
            ]
        },
        {
            title: 'Tender Information',
            fields: [
                { label: 'Linked Tender ID', value: (loa.tenderId as any)?.tenderId || 'Unknown' },
                { label: 'Package Name', value: (loa.tenderId as any)?.packageName || '-' },
                { label: 'Contractor Name', value: (loa.tenderId as any)?.contractorName || '-' },
            ]
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/loas" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Letter of Acceptance Details</h1>
                </div>
                <Link
                    href={`/loas/${id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit LOA
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{(loa.tenderId as any)?.packageName || 'LOA Record'}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 italic">Formal acceptance of the tender and contract terms.</p>
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
