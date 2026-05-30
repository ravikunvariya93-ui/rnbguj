import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import TechnicalSanction from '@/models/TechnicalSanction';
import Link from 'next/link';
import { Eye, Edit2, AlertCircle } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import { parsePagination } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function UnmatchedTSPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;

    // 1. Fetch all approved works
    const works = await ApprovedWork.find({}).select('workName').lean();
    const normalizeString = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const approvedWorkCounts: Record<string, number> = {};
    works.forEach(w => {
        const name = normalizeString(w.workName as string);
        approvedWorkCounts[name] = (approvedWorkCounts[name] || 0) + 1;
    });

    // 2. Fetch all TS records
    const allTS = await TechnicalSanction.find({}).lean();
    
    // 3. Find unmatched TS
    let unmatchedTS: any[] = [];
    allTS.forEach(ts => {
        const name = normalizeString(ts.workName as string);
        if (approvedWorkCounts[name] && approvedWorkCounts[name] > 0) {
            approvedWorkCounts[name]--;
        } else {
            unmatchedTS.push(ts);
        }
    });

    // 4. Apply search filter in-memory
    if (params.search) {
        const searchLower = params.search.toLowerCase();
        unmatchedTS = unmatchedTS.filter(ts => 
            (ts.workName as string)?.toLowerCase().includes(searchLower)
        );
    }

    // 5. Apply sorting in-memory (default: newest first)
    unmatchedTS.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
    });

    // 6. Apply pagination in-memory
    const { page, limit, skip } = parsePagination(params);
    const totalItems = unmatchedTS.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedTS = unmatchedTS.slice(skip, skip + limit).map(ts => ({
        ...ts,
        _id: ts._id.toString()
    }));

    const columns: Column[] = [
        { 
            key: 'srNo', 
            label: 'Sr. No.', 
            render: (row, index) => skip + index + 1
        },
        { 
            key: 'workName', 
            label: 'Name of Work', 
            render: (row) => <span className="max-w-xs whitespace-normal break-words font-medium">{row.workName}</span>
        },
        { 
            key: 'tsAmount', 
            label: 'TS Amount', 
            render: (row) => `₹${(row.tsAmount || 0).toLocaleString('en-IN')}`
        },
        { 
            key: 'tsDate', 
            label: 'T.S. Date', 
            render: (row) => row.tsDate ? new Date(row.tsDate).toLocaleDateString('en-GB') : '-'
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-3">
            <Link href={`/technical-sanctions/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/technical-sanctions/${row._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton 
                itemId={row._id} 
                itemName={row.workName} 
                apiPath="/api/technical-sanctions" 
            />
        </div>
    );

    const extraActions = (
        <div className="flex items-center space-x-2 mr-4">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">Missing Links Detected</span>
        </div>
    );

    return (
        <ListPageLayout
            title="Unmatched TS Records"
            subtitle="These Technical Sanctions are either duplicates or contain typos in their Name of Work, preventing them from linking to Approved Works."
            searchPlaceholder="Search by name of work..."
            filterActive={!!params.search}
            clearFiltersHref="/unmatched-ts"
            extraActions={extraActions}
        >
            <DataTable 
                columns={columns} 
                data={paginatedTS} 
                emptyMessage="No unmatched technical sanctions found!"
                actions={renderActions}
            />
            {totalPages > 1 && (
                <div className="mt-4">
                    <Pagination currentPage={page} totalPages={totalPages} />
                </div>
            )}
        </ListPageLayout>
    );
}
