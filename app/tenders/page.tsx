import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import Approval from '@/models/Approval';
import Link from 'next/link';
import { Plus, Filter, Eye, Edit2 } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import GenericDeleteButton from '@/components/GenericDeleteButton';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ 
        filter?: string; 
        search?: string; 
        page?: string; 
        limit?: string; 
        natureOfWork?: string;
        subDivision?: string;
        estimateConsultant?: string;
        approvalYear?: string;
        roadCategory?: string;
        workType?: string;
        schemeName?: string;
    }>;
}

export default async function TendersListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    let filterLabels: string[] = [];

    // Dashboard Filters / Nature Logic
    const metadataFiltersArr: any = [];
    if (params.estimateConsultant) metadataFiltersArr.push({ estimateConsultant: params.estimateConsultant });
    if (params.approvalYear) metadataFiltersArr.push({ approvalYear: params.approvalYear });
    if (params.roadCategory) metadataFiltersArr.push({ roadCategory: params.roadCategory });
    if (params.workType) metadataFiltersArr.push({ workType: params.workType });
    if (params.schemeName) metadataFiltersArr.push({ schemeName: params.schemeName });
    if (params.natureOfWork) {
        if (params.natureOfWork === 'Unclassified') {
            metadataFiltersArr.push({ $or: [{ natureOfWork: { $exists: false } }, { natureOfWork: null }, { natureOfWork: '' }] });
        } else {
            metadataFiltersArr.push({ natureOfWork: params.natureOfWork });
        }
    }

    if (metadataFiltersArr.length > 0 || params.subDivision) {
        let validWorkNames: string[] = [];
        let tsIds: any[] = [];
        
        if (metadataFiltersArr.length > 0) {
            const { default: ApprovedWork } = await import('@/models/ApprovedWork');
            const workQuery = metadataFiltersArr.length > 1 ? { $and: metadataFiltersArr } : metadataFiltersArr[0];
            const matchingWorks = await ApprovedWork.find(workQuery).select('workName').lean();
            validWorkNames = matchingWorks.map((w: any) => w.workName);
            
            const { default: TechnicalSanction } = await import('@/models/TechnicalSanction');
            const matchingTS = await TechnicalSanction.find({ workName: { $in: validWorkNames } }).select('_id').lean();
            tsIds = matchingTS.map((ts: any) => ts._id);
        }

        const { default: Package } = await import('@/models/Package');
        let pkgQuery: any = {};
        if (params.subDivision) pkgQuery.subDivision = params.subDivision;
        if (metadataFiltersArr.length > 0) {
            pkgQuery.$or = [
                { "works.workName": { $in: validWorkNames } },
                { "works.workId": { $in: tsIds } }
            ];
        }
        
        const matchingPkgs = await Package.find(pkgQuery).select('_id').lean();
        query.packageId = { $in: matchingPkgs.map((p: any) => p._id) };
        filterLabels.push("Dashboard Filters Applied");
    }

    if (params.filter === 'pending_loa') {
        const tendersWithLoa = await LOA.find().distinct('tenderId');
        query._id = { ...query._id, $nin: tendersWithLoa };
        filterLabels.push("Pending LOA");
    } else if (params.filter === 'pending_approval') {
        const tendersWithApproval = await Approval.find().distinct('tenderId');
        query._id = { ...query._id, $nin: tendersWithApproval };
        filterLabels.push("Pending Technical Approval");
    }

    if (params.search) {
        query.$or = [
            { tenderId: { $regex: params.search, $options: 'i' } },
            { packageName: { $regex: params.search, $options: 'i' } },
            { contractorName: { $regex: params.search, $options: 'i' } }
        ];
    }

    const filterLabel = filterLabels.length > 0 
        ? `Filtered by: ${filterLabels.join(' | ')}`
        : "List of all tenders.";

    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '10');
    const skip = (page - 1) * limit;

    const totalItems = await Tender.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const tendersRaw = await Tender.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
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
                        {(params.filter || params.search) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Filter className="w-3 h-3 mr-1" /> {params.search ? 'Search Active' : 'Filter Active'}
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
                <Suspense fallback={<div className="h-10 w-full max-w-lg bg-gray-100 animate-pulse rounded-md" />}>
                    <SearchBar placeholder="Search by Tender ID, Package, or Contractor..." />
                </Suspense>
                {(params.filter || params.search) && (
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
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Trial</th>
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
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{tender.trialNo || 1}</td>
                                                <td className="whitespace-normal px-3 py-4 text-sm text-gray-500 max-w-xs" style={{ wordBreak: 'break-word' }}>{tender.contractorName || '-'}</td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex items-center justify-end space-x-2">
                                                    <Link href={`/tenders/${tender._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                                                        <Eye className="w-5 h-5" />
                                                    </Link>
                                                    <Link href={`/tenders/new?packageId=${tender.packageId}&reInvite=true`} className="text-green-600 hover:text-green-900 p-1" title="Re-tender this package">
                                                        <Plus className="w-5 h-5" />
                                                    </Link>
                                                    <Link href={`/tenders/${tender._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Tender">
                                                        <Edit2 className="w-5 h-5" />
                                                    </Link>
                                                    <GenericDeleteButton 
                                                        itemId={tender._id} 
                                                        itemName={tender.tenderId} 
                                                        apiPath="/api/tenders" 
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
