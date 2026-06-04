import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import Approval from '@/models/Approval';
import Package from '@/models/Package';
import Link from 'next/link';
import { Plus, Eye, Edit2 } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import { buildDashboardFilter, parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function TendersListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    let filterLabels: string[] = [];

    const dashboardFilter = await buildDashboardFilter(params);
    if (dashboardFilter.hasFilter && dashboardFilter.packageIds) {
        query.packageId = { $in: dashboardFilter.packageIds };
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

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { tenderNoticeYear: -1, noticeNo: 1, srNo: 1 });

    const totalItems = await Tender.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const tendersRaw = await Tender.find(query)
        .populate({ path: 'packageId', select: 'works.workName', model: Package })
        .collation({ locale: "en_US", numericOrdering: true })
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

    const tenders = tendersRaw.map((t: any) => ({
        ...t,
        _id: t._id.toString(),
        approvedWorks: t.packageId?.works?.map((w: any) => w.workName).join(', ') || '-',
    }));

    const columns: Column[] = [
        { key: 'tenderNoticeYear', label: 'Notice Year', sortable: true },
        { key: 'noticeNo', label: 'Notice No.', sortable: true },
        { key: 'srNo', label: 'Sr. No.', align: 'center' },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            sortable: true, 
            minWidth: '200px', 
            render: (row) => (
                <div className="flex flex-col gap-1">
                    {row.packageId?._id ? (
                        <Link href={`/packages/${row.packageId._id}`} className="text-blue-600 hover:underline font-semibold break-words">
                            {row.packageName || '-'}
                        </Link>
                    ) : (
                        <span className="break-words">{row.packageName || '-'}</span>
                    )}
                    {row.cancelled && (
                        <span className="inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 leading-none">
                            Cancelled: {row.cancellationReason || 'N/A'}
                        </span>
                    )}
                </div>
            ) 
        },
        { 
            key: 'approvedWorks', 
            label: 'Approved Works', 
            minWidth: '250px',
            render: (row) => row.approvedWorks && row.approvedWorks !== '-' ? (
                <ul className="list-disc pl-4 space-y-1">
                    {row.approvedWorks.split(', ').map((work: string, idx: number) => (
                        <li key={idx} className="text-xs leading-tight">{work}</li>
                    ))}
                </ul>
            ) : <span className="text-slate-400 italic">No works found</span>
        },
        { key: 'contractorName', label: 'Contractor Name', sortable: true, minWidth: '150px' },
        { key: 'trialNo', label: 'Trial', sortable: true, align: 'center' },
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-2">
            <Link href={`/tenders/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/tenders/new?packageId=${row.packageId}&reInvite=true`} className="text-green-600 hover:text-green-900 p-1" title="Re-tender this package">
                <Plus className="w-5 h-5" />
            </Link>
            <Link href={`/tenders/${row._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Tender">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton itemId={row._id} itemName={row.tenderId} apiPath="/api/tenders" />
        </div>
    );

    const filterLabel = filterLabels.length > 0 ? `Filtered by: ${filterLabels.join(' | ')}` : "List of all tenders.";

    return (
        <ListPageLayout
            title="Tenders"
            subtitle={filterLabel}
            addHref="/tenders/new"
            addLabel="Add New Tender"
            searchPlaceholder="Search by Tender ID, Package, or Contractor..."
            filterActive={!!params.filter || !!params.search}
            clearFiltersHref="/tenders"
        >
            <DataTable 
                columns={columns} 
                data={tenders} 
                emptyMessage="No tenders found matching the criteria."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
