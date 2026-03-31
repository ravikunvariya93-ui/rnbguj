import dbConnect from '@/lib/db';
import Approval from '@/models/Approval';
import Tender from '@/models/Tender';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ApprovalsListPage() {
    await dbConnect();
    // Pre-register Tender so population works reliably
    Tender.find().limit(1);
    
    const approvals = await Approval.find({}).populate('tenderId').sort({ createdAt: -1 });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Approvals</h1>
                    <p className="mt-2 text-sm text-gray-700">List of all tender approvals.</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link href="/approvals/new" className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Add New Approval
                    </Link>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Tender Details</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Office</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Approval No</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Dates</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {approvals.length === 0 ? (
                                        <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-500">No Approvals found.</td></tr>
                                    ) : (
                                        approvals.map((approval: any) => (
                                            <tr key={approval._id}>
                                                <td className="whitespace-normal py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6 max-w-xs">
                                                    {approval.tenderId ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900">ID: {approval.tenderId.tenderId}</span>
                                                            <span className="text-xs text-gray-500">{approval.tenderId.packageName}</span>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{approval.tenderApprovalOffice || '-'}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{approval.tenderApprovalNo || '-'}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs">Proposal: {approval.proposalDate ? new Date(approval.proposalDate).toLocaleDateString('en-GB') : '-'}</span>
                                                        <span className="text-xs">Approval: {approval.tenderApprovalDate ? new Date(approval.tenderApprovalDate).toLocaleDateString('en-GB') : '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <Link href={`/approvals/${approval._id}/edit`} className="text-blue-600 hover:text-blue-900">Edit</Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
