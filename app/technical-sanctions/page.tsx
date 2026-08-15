import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import TechnicalSanction from '@/models/TechnicalSanction';
import Package from '@/models/Package';
import Link from 'next/link';
import { Plus, Eye, Edit2 } from 'lucide-react';
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

export default async function TechnicalSanctionsListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    if (params.search) {
        query.workName = { $regex: params.search, $options: 'i' };
    }

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { createdAt: -1 });

    const totalItems = await TechnicalSanction.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const sanctionsRaw = await TechnicalSanction.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

    const allPackages = await Package.find({}).select('packageName works').lean();
    const tsIdToPkgInfo = new Map<string, { _id: string, packageName: string }>();
    allPackages.forEach(pkg => {
        if (pkg.works) {
            pkg.works.forEach((w: any) => {
                if (w.workId) {
                    tsIdToPkgInfo.set(w.workId.toString(), {
                        _id: pkg._id.toString(),
                        packageName: pkg.packageName
                    });
                }
            });
        }
    });
        
    const sanctions = sanctionsRaw.map((ts: any) => {
        const pkgInfo = tsIdToPkgInfo.get(ts._id.toString());
        return {
            ...ts,
            _id: ts._id.toString(),
            packageId: pkgInfo?._id || null,
            packageName: pkgInfo?.packageName || null,
        };
    });

    const columns: Column[] = [
        { 
            key: 'srNo', 
            label: 'Sr. No.', 
            render: (row, index) => skip + index + 1
        },
        { 
            key: 'workName', 
            label: 'Name of Work', 
            sortable: true,
            minWidth: '350px',
            render: (row) => (
                <div className="line-clamp-2 max-w-lg whitespace-normal break-words" title={row.workName}>
                    {row.workName}
                </div>
            )
        },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            sortable: true,
            minWidth: '200px',
            render: (row) => row.packageId ? (
                <Link href={`/packages/${row.packageId}`} className="text-emerald-600 hover:underline font-semibold break-words">
                    {row.packageName}
                </Link>
            ) : (
                <span className="text-slate-400 italic">Unpackaged</span>
            )
        },
        { 
            key: 'tsAmount', 
            label: 'TS Amount in Lacs', 
            sortable: true,
            minWidth: '80px',
            align: 'center',
            render: (row) => (row.tsAmount || 0).toLocaleString('en-IN')
        },
        { 
            key: 'tsDate', 
            label: 'T.S. Date', 
            sortable: true,
            render: (row) => row.tsDate ? new Date(row.tsDate).toLocaleDateString('en-GB') : '-'
        },
        { 
            key: 'tsAuthority', 
            label: 'TS Authority', 
            sortable: true,
            render: (row) => row.tsAuthority || '-'
        },
        { 
            key: 'remarks', 
            label: 'Remarks', 
            sortable: true,
            minWidth: '250px',
            render: (row) => (
                <div className="line-clamp-3 max-w-sm whitespace-normal break-words" title={row.remarks}>
                    {row.remarks || '-'}
                </div>
            )
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-3">
            <Link href={`/technical-sanctions/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/technical-sanctions/${row._id}/edit`} className="text-emerald-600 hover:text-emerald-900 p-1" title="Edit Item">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton 
                itemId={row._id} 
                itemName={row.workName} 
                apiPath="/api/technical-sanctions" 
            />
        </div>
    );

    return (
        <ListPageLayout
            title="TS (Technical Sanction)"
            subtitle="List of Technical Sanctions."
            addHref="/technical-sanctions/new"
            addLabel="Add New T.S."
            searchPlaceholder="Search by name of work..."
            filterActive={!!params.search}
            clearFiltersHref="/technical-sanctions"
        >
            <DataTable 
                columns={columns} 
                data={sanctions} 
                emptyMessage="No technical sanctions found matching the search."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
