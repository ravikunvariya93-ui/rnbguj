import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Tender from '@/models/Tender';
import Link from 'next/link';
import { Plus, Filter, Eye, Edit2 } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import GenericDeleteButton from '@/components/GenericDeleteButton';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ filter?: string; search?: string; page?: string; limit?: string; nature?: string }>;
}

export default async function LOAListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    let filterLabel = "List of all LOAs issued.";

    if (params.filter === 'pending') {
        const loasWithWorkOrder = await WorkOrder.find().distinct('loaId');
        query._id = { $nin: loasWithWorkOrder };
        filterLabel = "Showing LOAs awaiting Work Order / Agreement (Pending Work Order).";
    }

    if (params.search) {
        const matchingTenders = await Tender.find({
            $or: [
                { packageName: { $regex: params.search, $options: 'i' } },
                { contractorName: { $regex: params.search, $options: 'i' } }
            ]
        }).distinct('_id');
        query.tenderId = { $in: matchingTenders };
    }

    if (params.nature) {
        const { default: ApprovedWork } = await import('@/models/ApprovedWork');
        let natureQuery: any;
        if (params.nature === 'Unclassified') {
            natureQuery = { $or: [{ natureOfWork: { $exists: false } }, { natureOfWork: null }, { natureOfWork: '' }] };
        } else {
            natureQuery = { natureOfWork: params.nature };
        }
        const worksWithNature = await ApprovedWork.find(natureQuery).select('workName').lean();
        const validWorkNames = worksWithNature.map((w: any) => w.workName);
        
        const { default: TechnicalSanction } = await import('@/models/TechnicalSanction');
        const tsWithNature = await TechnicalSanction.find({ workName: { $in: validWorkNames } }).select('_id').lean();
        const tsIds = tsWithNature.map((ts: any) => ts._id);

        const { default: Package } = await import('@/models/Package');
        const pkgsWithNature = await Package.find({
            $or: [
                { "works.workName": { $in: validWorkNames } },
                { "works.workId": { $in: tsIds } }
            ]
        }).select('_id').lean();
        const pkgIds = pkgsWithNature.map((p: any) => p._id);

        const tendersWithNature = await Tender.find({ packageId: { $in: pkgIds } }).select('_id').lean();
        const tenderIds = tendersWithNature.map((t: any) => t._id);

        // if tenderId was already set by search, we should intersect the sets or use $and. Usually $and is safer.
        if (query.tenderId) {
            query.$and = [
                { tenderId: query.tenderId },
                { tenderId: { $in: tenderIds } }
            ];
            delete query.tenderId;
        } else {
            query.tenderId = { $in: tenderIds };
        }
        
        filterLabel += ` Filtering by nature: ${params.nature}.`;
    }

    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '10');
    const skip = (page - 1) * limit;

    const totalItems = await LOA.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const loasRaw = await LOA.find(query)
        .populate('tenderId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const loas = loasRaw.map((loa: any) => ({
        ...loa,
        _id: loa._id.toString(),
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-2xl font-semibold text-gray-900">Letter of Acceptance (LOA)</h1>
                        {(params.filter || params.search) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Filter className="w-3 h-3 mr-1" /> {params.search ? 'Search Active' : 'Filter Active'}
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{filterLabel}</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link href="/loas/new" className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Add New LOA
                    </Link>
                </div>
            </div>

            <div className="mt-6 flex justify-start items-center">
                <Suspense fallback={<div className="h-10 w-full max-w-lg bg-gray-100 animate-pulse rounded-md" />}>
                    <SearchBar placeholder="Search by package or contractor..." />
                </Suspense>
                {(params.filter || params.search) && (
                    <Link href="/loas" className="ml-4 text-sm text-blue-600 hover:text-blue-900">
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
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Package Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Contractor Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Acceptance Letter Date</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 cursor-default text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {loas.length === 0 ? (
                                        <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-500">No LOAs found matching the criteria.</td></tr>
                                    ) : (
                                        loas.map((loa: any) => (
                                            <tr key={loa._id}>
                                                <td className="whitespace-normal py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6 max-w-sm">
                                                    {loa.tenderId?.packageName || '-'}
                                                </td>
                                                <td className="whitespace-normal px-3 py-4 text-sm text-gray-500 max-w-xs" style={{ wordBreak: 'break-word' }}>
                                                    {loa.tenderId?.contractorName || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {loa.acceptanceLetterDate ? new Date(loa.acceptanceLetterDate).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex items-center justify-end space-x-3">
                                                    <Link href={`/loas/${loa._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                                                        <Eye className="w-5 h-5" />
                                                    </Link>
                                                    <Link href={`/loas/${loa._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                                                        <Edit2 className="w-5 h-5" />
                                                    </Link>
                                                    <GenericDeleteButton 
                                                        itemId={loa._id} 
                                                        itemName={loa.acceptanceLetterWorksheetNo || 'LOA'} 
                                                        apiPath="/api/loas" 
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                            <Pagination currentPage={page} totalPages={totalPages} />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
