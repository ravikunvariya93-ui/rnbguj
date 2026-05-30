import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
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
void WorkOrder;
void LOA;
void Tender;

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function BillsPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    if (params.search) {
        // Find matching Tenders
        const matchingTenders = await Tender.find({
            $or: [
                { packageName: { $regex: params.search, $options: 'i' } }
            ]
        }).distinct('_id');

        const matchingLOAs = await LOA.find({ tenderId: { $in: matchingTenders } }).distinct('_id');
        const matchingWorkOrders = await WorkOrder.find({ loaId: { $in: matchingLOAs } }).distinct('_id');

        query.workOrderId = { $in: matchingWorkOrders };
    }

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { createdAt: -1 });

    const totalItems = await Bill.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const billsRaw = await Bill.find(query)
        .populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: { path: 'tenderId' }
            }
        })
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

    const bills = billsRaw.map((bill: any) => ({
        ...bill,
        _id: bill._id.toString(),
    }));

    const columns: Column[] = [
        { 
            key: 'billtype/no.', 
            label: 'Bill Type / No.', 
            sortable: true,
            render: (row) => {
                const nth = row.runningBillNumber === 1 ? 'st' : row.runningBillNumber === 2 ? 'nd' : row.runningBillNumber === 3 ? 'rd' : 'th';
                return <span>{row.runningBillNumber}{nth} and {row.billType} Bill</span>;
            }
        },
        { 
            key: 'package/workorder', 
            label: 'Package / Work Order', 
            sortable: true,
            minWidth: '200px',
            render: (row) => {
                const tender = (row.workOrderId as any)?.loaId?.tenderId;
                return <span className="max-w-xs whitespace-normal break-words">{tender?.packageName || 'Unknown Package'}</span>
            }
        },
        { 
            key: 'grossamount', 
            label: 'Gross Amount', 
            sortable: true,
            render: (row) => <span className="font-mono">₹{row.grossAmount?.toLocaleString('en-IN')}</span>
        },
        { 
            key: 'billdate', 
            label: 'Bill Date', 
            sortable: true,
            render: (row) => row.billDate ? new Date(row.billDate).toLocaleDateString('en-GB') : '-'
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-3">
            <Link href={`/bills/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/bills/${row._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton 
                itemId={row._id} 
                itemName={`Bill ${row.runningBillNumber}`} 
                apiPath="/api/bills" 
            />
        </div>
    );

    return (
        <ListPageLayout
            title="Bills"
            subtitle="A list of all project bills including running and final bills."
            addHref="/bills/new"
            addLabel="Add Bill"
            searchPlaceholder="Search by package name..."
            filterActive={!!params.search}
            clearFiltersHref="/bills"
        >
            <DataTable 
                columns={columns} 
                data={bills} 
                emptyMessage="No bills found. Click 'Add Bill' to create one."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
