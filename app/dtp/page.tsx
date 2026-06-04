import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import DTP from '@/models/DTP';
import Package from '@/models/Package';
import Link from 'next/link';
import { Plus, Eye, Edit2, FileText } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import { parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function DTPListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;

    let query: any = {};
    if (params.search) {
        const matchingPackages = await Package.find({
            packageName: { $regex: params.search, $options: 'i' }
        }).distinct('_id');
        query.tsId = { $in: matchingPackages };
    }

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { createdAt: -1 });

    const totalItems = await DTP.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const dtpsRaw = await DTP.find(query)
        .populate('tsId')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();
        
    const dtps = dtpsRaw.map((dtp: any) => ({
        ...dtp,
        _id: dtp._id.toString(),
        packageName: dtp.tsId?.packageName || 'Unknown Package',
        approvedWorks: dtp.tsId?.works && dtp.tsId.works.length > 0
            ? dtp.tsId.works.map((w: any) => w.workName).filter(Boolean)
            : []
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
                row.tsId?._id ? (
                    <Link href={`/packages/${row.tsId._id}`} className="text-blue-600 hover:underline font-semibold max-w-sm whitespace-normal break-words">
                        {row.packageName}
                    </Link>
                ) : (
                    <span className="max-w-sm whitespace-normal break-words font-medium">{row.packageName}</span>
                )
            )
        },
        { 
            key: 'approvedWorks', 
            label: 'Approved Works', 
            minWidth: '250px',
            render: (row) => row.approvedWorks.length > 0 ? (
                <div className="space-y-1">
                    {row.approvedWorks.map((work: string, idx: number) => (
                        <div key={idx} className="text-xs leading-tight">
                            {idx + 1}. {work}
                        </div>
                    ))}
                </div>
            ) : <span className="text-slate-400 italic">No works found</span>
        },
        { 
            key: 'tenderAmount', 
            label: 'Tender Amount', 
            sortable: true,
            align: 'center',
            render: (row) => row.tenderAmount ? Number(row.tenderAmount).toLocaleString('en-IN') : '-'
        },
        { 
            key: 'dtpSendingDate', 
            label: 'Date of Sending DTP for Approval', 
            sortable: true,
            render: (row) => row.dtpSendingDate ? new Date(row.dtpSendingDate).toLocaleDateString('en-GB') : '-'
        },
        { 
            key: 'dtpApprovingAuthority', 
            label: 'DTP Approving Authority', 
            sortable: true,
            render: (row) => row.dtpApprovingAuthority || '-'
        },
        { 
            key: 'dtpApprovalDate', 
            label: 'DTP Approval Date', 
            sortable: true,
            render: (row) => row.dtpApprovalDate ? new Date(row.dtpApprovalDate).toLocaleDateString('en-GB') : '-'
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-3">
            <Link href={`/dtp/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/dtp/${row._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton
                itemId={row._id}
                itemName={(row.tsId as any)?.packageName || 'DTP'}
                apiPath="/api/dtps"
            />
        </div>
    );

    const extraActions = (
        <>
            <Link
                href="/dtp/forwarding-letter"
                className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                <FileText className="w-4 h-4 mr-2" /> Generate Forwarding Letter
            </Link>
            <Link
                href="/dtp/dtp-order"
                className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                <FileText className="w-4 h-4 mr-2" /> Generate DTP Order
            </Link>
        </>
    );

    return (
        <ListPageLayout
            title="DTP"
            subtitle="List of all Detailed Technical Proposals."
            addHref="/dtp/new"
            addLabel="Add New DTP"
            searchPlaceholder="Search by package name..."
            filterActive={!!params.search}
            clearFiltersHref="/dtp"
            extraActions={extraActions}
        >
            <DataTable 
                columns={columns} 
                data={dtps} 
                emptyMessage="No DTP records found matching the criteria."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
