import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Tender from '@/models/Tender';
import Link from 'next/link';
import { Plus, Eye, Edit2, FileText } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import { buildDashboardFilter, parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';

// Ensure Tender model is registered for populate (LOA.tenderId -> ref: 'Tender')
void Tender;

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function LOAListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    let filterLabels: string[] = [];

    const dashboardFilter = await buildDashboardFilter(params);
    if (dashboardFilter.hasFilter && dashboardFilter.tenderIds) {
        query.tenderId = { $in: dashboardFilter.tenderIds };
        filterLabels.push("Dashboard Filters Applied");
    }

    if (params.filter === 'pending') {
        const loasWithWorkOrder = await WorkOrder.find().distinct('loaId');
        query._id = { ...query._id, $nin: loasWithWorkOrder };
        filterLabels.push("Pending Work Order");
    }

    if (params.search) {
        const searchTenders = await Tender.find({
            $or: [
                { packageName: { $regex: params.search, $options: 'i' } },
                { contractorName: { $regex: params.search, $options: 'i' } }
            ]
        }).distinct('_id');
        
        if (query.tenderId) {
            query.$and = [
                { tenderId: query.tenderId },
                { tenderId: { $in: searchTenders } }
            ];
            delete query.tenderId;
        } else {
            query.tenderId = { $in: searchTenders };
        }
    }

    const filterLabel = filterLabels.length > 0 
        ? `Filtered by: ${filterLabels.join(' | ')}`
        : "List of all LOAs issued.";

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { createdAt: -1 });

    const totalItems = await LOA.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const loasRaw = await LOA.find(query)
        .populate('tenderId')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();
        
    const loas = loasRaw.map((loa: any) => ({
        ...loa,
        _id: loa._id.toString(),
    }));

    const columns: Column[] = [
        { 
            key: 'srNo', 
            label: 'Sr. No.', 
            render: (row, index) => skip + index + 1
        },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            sortable: true,
            minWidth: '200px',
            render: (row) => (
                row.tenderId?.packageId ? (
                    <Link href={`/packages/${row.tenderId.packageId}`} className="text-blue-600 hover:underline font-semibold max-w-sm whitespace-normal break-words">
                        {row.tenderId?.packageName || '-'}
                    </Link>
                ) : (
                    <span className="max-w-sm whitespace-normal break-words">{row.tenderId?.packageName || '-'}</span>
                )
            )
        },
        { 
            key: 'contractorname', 
            label: 'Contractor Name', 
            sortable: true,
            render: (row) => <span className="max-w-xs whitespace-normal break-words">{row.tenderId?.contractorName || '-'}</span>
        },
        { 
            key: 'acceptanceletterdate', 
            label: 'Acceptance Letter Date', 
            sortable: true,
            render: (row) => row.acceptanceLetterDate ? new Date(row.acceptanceLetterDate).toLocaleDateString('en-GB') : '-'
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-3">
            <Link href={`/loas/${row._id}/letter`} className="text-emerald-600 hover:text-emerald-900 p-1" title="Generate Letter">
                <FileText className="w-5 h-5" />
            </Link>
            <Link href={`/loas/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/loas/${row._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton 
                itemId={row._id} 
                itemName={row.acceptanceLetterWorksheetNo || 'LOA'} 
                apiPath="/api/loas" 
            />
        </div>
    );

    return (
        <ListPageLayout
            title="Letter of Acceptance (LOA)"
            subtitle={filterLabel}
            addHref="/loas/new"
            addLabel="Add New LOA"
            searchPlaceholder="Search by package or contractor..."
            filterActive={!!params.filter || !!params.search}
            clearFiltersHref="/loas"
        >
            <DataTable 
                columns={columns} 
                data={loas} 
                emptyMessage="No LOAs found matching the criteria."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
