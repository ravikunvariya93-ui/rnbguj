import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Approval from '@/models/Approval';
import Tender from '@/models/Tender';
import Link from 'next/link';
import { Plus, Eye, Edit2 } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import { parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';

// Ensure Tender model is registered for populate
void Tender;

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function ApprovalsListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    if (params.search) {
        const matchingTenders = await Tender.find({
            $or: [
                { packageName: { $regex: params.search, $options: 'i' } },
                { contractorName: { $regex: params.search, $options: 'i' } }
            ]
        }).distinct('_id');
        query.tenderId = { $in: matchingTenders };
    }

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { createdAt: -1 });

    const totalItems = await Approval.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const approvalsRaw = await Approval.find(query)
        .populate('tenderId')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();
        
    const approvals = approvalsRaw.map((a: any) => ({
        ...a,
        _id: a._id.toString(),
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
            key: 'tenderApprovalDate', 
            label: 'Tender Approval Date', 
            sortable: true,
            render: (row) => row.notRequired ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                    Not Required
                </span>
            ) : (row.tenderApprovalDate ? new Date(row.tenderApprovalDate).toLocaleDateString('en-GB') : '-')
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-3">
            <Link href={`/approvals/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/approvals/${row._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton 
                itemId={row._id} 
                itemName={row.packageName || 'Approval'} 
                apiPath="/api/approvals" 
            />
        </div>
    );

    return (
        <ListPageLayout
            title="Approvals"
            subtitle="List of all tender approvals."
            addHref="/approvals/new"
            addLabel="Add New Approval"
            searchPlaceholder="Search by package or contractor..."
            filterActive={!!params.search}
            clearFiltersHref="/approvals"
        >
            <DataTable 
                columns={columns} 
                data={approvals} 
                emptyMessage="No Approvals found matching the criteria."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
