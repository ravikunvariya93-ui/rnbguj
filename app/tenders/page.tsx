import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import Approval from '@/models/Approval';
import Link from 'next/link';
import { Plus, Filter, Edit } from 'lucide-react';
import DeleteTenderButton from '@/components/DeleteTenderButton';
import SearchBar from '@/components/SearchBar';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: { filter?: string; search?: string };
}

export default async function TendersListPage({ searchParams }: Props) {
    await dbConnect();
    
    let query: any = {};
    let filterLabel = "List of all tenders.";

    if (searchParams.filter === 'pending_loa') {
        const tendersWithLoa = await LOA.find().distinct('tenderId');
        query._id = { $nin: tendersWithLoa };
        filterLabel = "Showing Tenders awaiting Letter of Acceptance (Pending LOA).";
    } else if (searchParams.filter === 'pending_approval') {
        const tendersWithApproval = await Approval.find().distinct('tenderId');
        query._id = { $nin: tendersWithApproval };
        filterLabel = "Showing Tenders awaiting Technical Approval (Pending Approval).";
    }

    if (searchParams.search) {
        query.$or = [
            { tenderId: { $regex: searchParams.search, $options: 'i' } },
            { packageName: { $regex: searchParams.search, $options: 'i' } },
            { contractorName: { $regex: searchParams.search, $options: 'i' } }
        ];
    }

    const tendersRaw = await Tender.find(query).sort({ createdAt: -1 }).lean();
    const tenders = tendersRaw.map((t: any) => ({
        ...t,
        _id: t._id.toString(),
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-2xl font-semibold text-gray-900">Tenders</h1>
                        {(searchParams.filter || searchParams.search) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Filter className="w-3 h-3 mr-1" /> {searchParams.search ? 'Search Active' : 'Filter Active'}
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{filterLabel}</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link href="/tenders/new" className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Add New Tender
                    </Link>
                </div>
            </div>

            <div className="mt-6 flex justify-start items-center">
                <SearchBar placeholder="Search by Tender ID, Package, or Contractor..." />
                {(searchParams.filter || searchParams.search) && (
                    <Link href="/tenders" className="ml-4 text-sm text-blue-600 hover:text-blue-900">
                        Clear all filters
                    </Link>
                )}
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Tender ID</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Package Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Contractor Name</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 cursor-default text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {tenders.length === 0 ? (
                                        <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-500">No tenders found matching the criteria.</td></tr>
                                    ) : (
                                        tenders.map((tender: any) => (
                                            <tr key={tender._id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{tender.tenderId}</td>
                                                <td className="whitespace-normal px-3 py-4 text-sm text-gray-500 max-w-xs " style={{ wordBreak: 'break-word' }}>{tender.packageName}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{tender.contractorName || '-'}</td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex items-center justify-end space-x-2">
                                                    <Link href={`/tenders/${tender._id}/edit`} className="text-blue-600 hover:text-blue-900 p-2" title="Edit Tender">
                                                        <Edit className="w-5 h-5" />
                                                    </Link>
                                                    <DeleteTenderButton tenderId={tender._id} tenderName={tender.packageName} />
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
