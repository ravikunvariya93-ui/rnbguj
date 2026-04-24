import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import TechnicalSanction from '@/models/TechnicalSanction';
import Link from 'next/link';
import { Eye, Edit2, AlertCircle } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import SortableHeader from '@/components/SortableHeader';

export const dynamic = 'force-dynamic';

export default async function UnmatchedTSPage() {
    await dbConnect();

    // 1. Fetch all approved works
    const works = await ApprovedWork.find({}).select('workName').lean();
    const normalizeString = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const approvedWorkCounts: Record<string, number> = {};
    works.forEach(w => {
        const name = normalizeString(w.workName as string);
        approvedWorkCounts[name] = (approvedWorkCounts[name] || 0) + 1;
    });

    // 2. Fetch all TS records
    const allTS = await TechnicalSanction.find({}).lean();
    
    // 3. Find unmatched TS
    const unmatchedTS: any[] = [];
    // TODO: add sorting to unmatched
    allTS.forEach(ts => {
        const name = normalizeString(ts.workName as string);
        if (approvedWorkCounts[name] && approvedWorkCounts[name] > 0) {
            approvedWorkCounts[name]--;
        } else {
            unmatchedTS.push(ts);
        }
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                        <h1 className="text-2xl font-semibold text-gray-900">Unmatched TS Records</h1>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                        These Technical Sanctions are either duplicates or contain typos in their Name of Work, preventing them from linking to Approved Works.
                    </p>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-16">Sr. No.</th>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name of Work</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">TS Amount</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">T.S. Date</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 cursor-default text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {unmatchedTS.length === 0 ? (
                                        <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-500">No unmatched technical sanctions found!</td></tr>
                                    ) : (
                                        unmatchedTS.map((ts: any, index: number) => (
                                            <tr key={ts._id.toString()}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">{index + 1}</td>
                                                <td className="whitespace-normal py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 max-w-xs">{ts.workName}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">₹{(ts.tsAmount || 0).toLocaleString('en-IN')}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{ts.tsDate ? new Date(ts.tsDate).toLocaleDateString('en-GB') : '-'}</td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex items-center justify-end space-x-3">
                                                    <Link href={`/technical-sanctions/${ts._id.toString()}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                                                        <Eye className="w-5 h-5" />
                                                    </Link>
                                                    <Link href={`/technical-sanctions/${ts._id.toString()}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                                                        <Edit2 className="w-5 h-5" />
                                                    </Link>
                                                    <GenericDeleteButton 
                                                        itemId={ts._id.toString()} 
                                                        itemName={ts.workName} 
                                                        apiPath="/api/technical-sanctions" 
                                                    />
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
