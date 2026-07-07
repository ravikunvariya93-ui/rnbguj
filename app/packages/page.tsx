import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import DTP from '@/models/DTP';
import Tender from '@/models/Tender';
import Link from 'next/link';
import ApprovedWork from '@/models/ApprovedWork';
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

export default async function PackagesListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    let filterLabels: string[] = [];

    const dashboardFilter = await buildDashboardFilter(params);
    if (dashboardFilter.hasFilter && dashboardFilter.packageIds) {
        if (query._id) {
            query._id.$in = dashboardFilter.packageIds;
        } else {
            query._id = { $in: dashboardFilter.packageIds };
        }
        filterLabels.push("Dashboard Filters Applied");
    }

    if (params.filter === 'pending_dtp') {
        const packagesWithDTP = await DTP.find().distinct('tsId');
        query._id = { ...query._id, $nin: packagesWithDTP };
        filterLabels.push("Pending DTP");
    } else if (params.filter === 'pending_tender') {
        const packagesWithTender = await Tender.find().distinct('packageId');
        query._id = { ...query._id, $nin: packagesWithTender };
        filterLabels.push("Pending Tender");
    }

    if (params.search) {
        query.packageName = { $regex: params.search, $options: 'i' };
    }

    const filterLabel = filterLabels.length > 0
        ? `Filtered by: ${filterLabels.join(' | ')}`
        : "List of all packages containing approved works.";

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { createdAt: -1 });

    const totalItems = await Package.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const [packagesRaw, allApprovedWorks] = await Promise.all([
        Package.find(query)
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean(),
        ApprovedWork.find({}).select('workName subDivision workType').lean() as Promise<any[]>
    ]);
        
    const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const workSubDivisionMap = new Map<string, string>();
    const workTypeMap = new Map<string, string>();
    allApprovedWorks.forEach((aw: any) => {
        if (aw.workName) {
            const key = normalize(aw.workName);
            workSubDivisionMap.set(key, aw.subDivision || '');
            workTypeMap.set(key, aw.workType || '');
        }
    });

    const packages = packagesRaw.map((p: any) => {
        const firstWorkName = p.works && p.works[0]?.workName;
        const normalizedKey = firstWorkName ? normalize(firstWorkName) : '';
        const inferredSubDivision = normalizedKey ? workSubDivisionMap.get(normalizedKey) : '';
        const inferredWorkType = normalizedKey ? workTypeMap.get(normalizedKey) : '';
        return {
            ...p,
            _id: p._id.toString(),
            subDivision: p.subDivision || inferredSubDivision || '',
            workType: p.workType || inferredWorkType || '',
            approvedWorks: p.works && p.works.length > 0
                ? p.works.map((w: any) => w.workName).filter(Boolean)
                : []
        };
    });

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
                <Link href={`/packages/${row._id}`} className="max-w-md whitespace-normal break-words font-medium text-blue-600 hover:underline">
                    {row.packageName}
                </Link>
            )
        },
        { 
            key: 'subDivision', 
            label: 'Sub Division', 
            sortable: true,
            minWidth: '150px',
            render: (row) => row.subDivision || '-'
        },
        { 
            key: 'workType', 
            label: 'Work Type', 
            sortable: true,
            minWidth: '120px',
            render: (row) => row.workType || '-'
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
            key: 'dtpConsultant', 
            label: 'DTP Consultant', 
            sortable: true,
            minWidth: '250px',
            render: (row) => row.dtpConsultant || '-'
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-3">
            <Link href={`/packages/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/packages/${row._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton 
                itemId={row._id} 
                itemName={row.packageName} 
                apiPath="/api/packages" 
            />
        </div>
    );

    return (
        <ListPageLayout
            title="Packages"
            subtitle={filterLabel}
            addHref="/packages/new"
            addLabel="Add New Package"
            searchPlaceholder="Search by package name..."
            filterActive={!!params.filter || !!params.search}
            clearFiltersHref="/packages"
        >
            <DataTable 
                columns={columns} 
                data={packages} 
                emptyMessage="No packages found matching the criteria."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
