import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Link from 'next/link';
import { Plus, Eye, Edit2 } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import { parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';

// Ensure models are registered for populate
void LOA;
void Tender;

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function WorkOrderListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    if (params.search) {
        // Find matching Tenders
        const matchingTenders = await Tender.find({
            $or: [
                { packageName: { $regex: params.search, $options: 'i' } },
                { contractorName: { $regex: params.search, $options: 'i' } }
            ]
        }).distinct('_id');

        // Find matching LOAs for those Tenders
        const matchingLOAs = await LOA.find({
            tenderId: { $in: matchingTenders }
        }).distinct('_id');

        // Filter WorkOrders by those LOAs
        query.loaId = { $in: matchingLOAs };
    }

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { createdAt: -1 });

    const totalItems = await WorkOrder.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const workOrdersRaw = await WorkOrder.find(query)
        .populate({
            path: 'loaId',
            populate: { path: 'tenderId' }
        })
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

    const workOrders = workOrdersRaw.map((wo: any) => ({
        ...wo,
        _id: wo._id.toString(),
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
            render: (row) => {
                const tender = (row.loaId as any)?.tenderId;
                return <span className="max-w-sm whitespace-normal break-words font-medium">{tender?.packageName || '-'}</span>
            }
        },
        { 
            key: 'contractorname', 
            label: 'Contractor Name', 
            sortable: true,
            render: (row) => {
                const tender = (row.loaId as any)?.tenderId;
                return <span className="max-w-xs whitespace-normal break-words">{tender?.contractorName || '-'}</span>
            }
        },
        { 
            key: 'workOrderDate', 
            label: 'Work Order Date', 
            sortable: true,
            render: (row) => row.workOrderDate ? new Date(row.workOrderDate).toLocaleDateString('en-GB') : '-'
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-3">
            <Link href={`/work-orders/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/work-orders/${row._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton 
                itemId={row._id} 
                itemName={row.workOrderWorksheetNo || 'Work Order'} 
                apiPath="/api/work-orders" 
            />
        </div>
    );

    return (
        <ListPageLayout
            title="Work Orders"
            subtitle="List of all Work Orders issued."
            addHref="/work-orders/new"
            addLabel="Add New Work Order"
            searchPlaceholder="Search by package or contractor..."
            filterActive={!!params.search}
            clearFiltersHref="/work-orders"
        >
            <DataTable 
                columns={columns} 
                data={workOrders} 
                emptyMessage="No Work Orders found matching the search."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
