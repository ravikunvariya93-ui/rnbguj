import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import TechnicalSanction from '@/models/TechnicalSanction';
import Package from '@/models/Package';
import DTP from '@/models/DTP';
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

export default async function ApprovedWorksListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    const normalizeString = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    let query: any = {};
    let filterLabels: string[] = [];

    const allTS = await TechnicalSanction.find({}).select('workName').lean();
    const tsCountMap: Record<string, number> = {};
    allTS.forEach(ts => {
        const name = normalizeString(ts.workName);
        tsCountMap[name] = (tsCountMap[name] || 0) + 1;
    });
    
    
    // Consumption logic for Pending TS is handled in-memory during result processing
    if (params.filter === 'pending') {
        filterLabels.push("Awaiting Technical Sanction (Pending TS)");
    } else if (params.filter === 'pendingDTP') {
        // ... keeping DTP logic as is for now as it's less prioritized but available
        const worksWithTSNames = await TechnicalSanction.find().distinct('workName');
        const allDTPs = await DTP.find({ dtpApprovalDate: { $exists: true, $ne: null } }).select('tsId').lean();
        const approvedPkgIds = new Set(allDTPs.map(d => d.tsId?.toString()));
        const allPackages = await Package.find({}).select('works').lean();
        const approvedDTPWorkNames = new Set<string>();
        allPackages.forEach(pkg => {
            if (approvedPkgIds.has(pkg._id.toString()) && pkg.works && Array.isArray(pkg.works)) {
                pkg.works.forEach(w => {
                    if (w.workName) approvedDTPWorkNames.add(w.workName.trim().toLowerCase().replace(/\s+/g, ' '));
                });
            }
        });
        const pendingDTPWorkNames = worksWithTSNames.filter(name => {
            if (!name) return false;
            return !approvedDTPWorkNames.has(name.trim().toLowerCase().replace(/\s+/g, ' '));
        });
        const finalRegexPatterns = pendingDTPWorkNames.map((name: string) => {
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
            const flexibleSpace = escaped.split(/\s+/).join('\\s+');
            return new RegExp(`^\\s*${flexibleSpace}\\s*$`, 'i');
        });
        query.workName = { $in: finalRegexPatterns };
        filterLabels.push("Awaiting DTP Approval (Pending DTP)");
    }

    // Standard Filters
    if (params.search) {
        query.workName = { $regex: params.search, $options: 'i' };
    }

    const filterFields: Record<string, { label: string, val: string | undefined }> = {
        subDivision: { label: 'Sub Division', val: params.subDivision },
        estimateConsultant: { label: 'Consultant', val: params.estimateConsultant },
        approvalYear: { label: 'Year', val: params.approvalYear },
        roadCategory: { label: 'Road Category', val: params.roadCategory },
        workType: { label: 'Work Type', val: params.workType },
        schemeName: { label: 'Scheme', val: params.schemeName },
        natureOfWork: { label: 'Nature', val: params.natureOfWork }
    };

    const emptyQuery = (field: string) => ({
        $or: [
            { [field]: { $exists: false } },
            { [field]: null },
            { [field]: '' }
        ]
    });

    // We collect global Unspecified conditions to combine them using $and
    const andConditions: any[] = [];

    Object.entries(filterFields).forEach(([field, config]) => {
        if (config.val) {
            // Dashboard sends 'Unspecified' when the property is empty/missing
            // (Also catch 'Unclassified' for backwards compatibility if needed)
            if (config.val === 'Unspecified' || config.val === 'Unclassified') {
                andConditions.push(emptyQuery(field));
                filterLabels.push(`${config.label}: Unspecified`);
            } else {
                query[field] = config.val;
                filterLabels.push(`${config.label}: ${config.val}`);
            }
        }
    });

    if (andConditions.length > 0) {
        query.$and = andConditions;
    }

    const filterLabel = filterLabels.length > 0 
        ? `Filtered by: ${filterLabels.join(' | ')}`
        : "A list of all approved works including budget details, approval dates, amounts, and classifications.";

    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '10');
    const skip = (page - 1) * limit;

    let finalWorks: any[] = [];
    let totalItems = 0;

    if (params.filter === 'pending') {
        // Fetch ALL works matching categories/search, then filter by consumption in memory
        const allPotentialWorks = await ApprovedWork.find(query).sort({ createdAt: -1 }).lean();
        const filtered = allPotentialWorks.filter(w => {
            const safeName = normalizeString(w.workName);
            if (tsCountMap[safeName] > 0) {
                tsCountMap[safeName]--;
                return false;
            }
            return true;
        });
        totalItems = filtered.length;
        finalWorks = filtered.slice(skip, skip + limit);
    } else {
        totalItems = await ApprovedWork.countDocuments(query);
        finalWorks = await ApprovedWork.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    }

    const totalPages = Math.ceil(totalItems / limit);

    const serializedWorks = finalWorks.map((w: any) => ({
        ...w,
        _id: w._id.toString(),
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-2xl font-semibold text-gray-900">Approved Works</h1>
                        {(params.filter || params.search) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Filter className="w-3 h-3 mr-1" /> {params.search ? 'Search Active' : 'Filter Active'}
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{filterLabel}</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link
                        href="/approved-works/new"
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Work
                    </Link>
                </div>
            </div>

            <div className="mt-6 flex justify-start items-center">
                <Suspense fallback={<div className="h-10 w-full max-w-lg bg-gray-100 animate-pulse rounded-md" />}>
                    <SearchBar placeholder="Search by name of work..." />
                </Suspense>
                {(params.filter || params.search) && (
                    <Link href="/approved-works" className="ml-4 text-sm text-blue-600 hover:text-blue-900">
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
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 max-w-xs sm:max-w-sm md:max-w-md">
                                            Name of Work
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 whitespace-normal">
                                            Approval Date
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 whitespace-normal">
                                            Job Number / Amount
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 cursor-default text-right whitespace-normal">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {serializedWorks.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-10 text-center text-sm text-gray-500">
                                                No works found matching the criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        serializedWorks.map((work: any) => (
                                            <tr key={work._id}>
                                                <td className="whitespace-normal py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 max-w-xs sm:max-w-sm md:max-w-md break-words">
                                                    <div className="line-clamp-3" title={work.workName}>
                                                        {work.workName}
                                                    </div>
                                                </td>
                                                <td className="whitespace-normal px-3 py-4 text-sm text-gray-500 break-words">
                                                    {work.jobNumberApprovalDate ? new Date(work.jobNumberApprovalDate).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="whitespace-normal px-3 py-4 text-sm text-gray-500 break-words">
                                                    {work.jobNumberAmount}
                                                </td>
                                                <td className="relative whitespace-normal py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                                        <Link href={`/approved-works/${work._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                                                            <Eye className="w-5 h-5" />
                                                        </Link>
                                                        <Link href={`/approved-works/${work._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                                                            <Edit2 className="w-5 h-5" />
                                                        </Link>
                                                        <GenericDeleteButton 
                                                            itemId={work._id} 
                                                            itemName={work.workName} 
                                                            apiPath="/api/approved-works" 
                                                        />
                                                    </div>
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
