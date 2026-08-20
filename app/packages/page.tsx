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
import PackagesFilterBar from '@/components/PackagesFilterBar';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import { buildDashboardFilter, parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function PackagesListPage({ searchParams }: Props) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const params = await searchParams;
    
    // Fetch unique/distinct values for filter selectors
    const [subDivisionsPkg, subDivisionsAw, workTypesPkg, workTypesAw, budgetHeadsPkg, budgetHeadsAw, dtpConsultants] = await Promise.all([
        Package.distinct('subDivision'),
        ApprovedWork.distinct('subDivision'),
        Package.distinct('workType'),
        ApprovedWork.distinct('workType'),
        Package.distinct('budgetHead'),
        ApprovedWork.distinct('budgetHead'),
        Package.distinct('dtpConsultant')
    ]);
    const subDivisions = Array.from(new Set([...subDivisionsPkg, ...subDivisionsAw])).filter(Boolean).sort() as string[];
    const workTypes = Array.from(new Set([...workTypesPkg, ...workTypesAw])).filter(Boolean).sort() as string[];
    const budgetHeads = Array.from(new Set(['Pending', ...budgetHeadsPkg, ...budgetHeadsAw])).filter(Boolean).sort() as string[];
    const consultants = dtpConsultants.filter(Boolean).sort() as string[];

    let query: any = {};
    let filterLabels: string[] = [];

    const andConditions: any[] = [];

    if (params.subDivision) {
        const worksInSubDiv = await ApprovedWork.find({ subDivision: params.subDivision }).select('workName').lean();
        const workNamesInSubDiv = worksInSubDiv.map((aw: any) => aw.workName).filter(Boolean);
        andConditions.push({
            $or: [
                { subDivision: params.subDivision },
                { 'works.workName': { $in: workNamesInSubDiv } }
            ]
        });
        filterLabels.push(`Sub Division: ${params.subDivision}`);
    }

    if (params.workType) {
        const worksInWorkType = await ApprovedWork.find({ workType: params.workType }).select('workName').lean();
        const workNamesInWorkType = worksInWorkType.map((aw: any) => aw.workName).filter(Boolean);
        andConditions.push({
            $or: [
                { workType: params.workType },
                { 'works.workName': { $in: workNamesInWorkType } }
            ]
        });
        filterLabels.push(`Work Type: ${params.workType}`);
    }

    if (params.budgetHead === 'Pending') {
        const worksInBudgetHead = await ApprovedWork.find({
            $or: [
                { budgetHead: 'Pending' },
                { budgetHead: { $exists: false } },
                { budgetHead: null },
                { budgetHead: '' }
            ]
        }).select('workName').lean();
        const workNamesInBudgetHead = worksInBudgetHead.map((aw: any) => aw.workName).filter(Boolean);
        andConditions.push({
            $or: [
                { budgetHead: 'Pending' },
                { budgetHead: { $exists: false } },
                { budgetHead: null },
                { budgetHead: '' },
                { 'works.workName': { $in: workNamesInBudgetHead } }
            ]
        });
        filterLabels.push('Budget Head: Pending');
    } else if (params.budgetHead) {
        const worksInBudgetHead = await ApprovedWork.find({ budgetHead: params.budgetHead }).select('workName').lean();
        const workNamesInBudgetHead = worksInBudgetHead.map((aw: any) => aw.workName).filter(Boolean);
        andConditions.push({
            $or: [
                { budgetHead: params.budgetHead },
                { 'works.workName': { $in: workNamesInBudgetHead } }
            ]
        });
        filterLabels.push(`Budget Head: ${params.budgetHead}`);
    }

    if (params.dtpConsultant) {
        andConditions.push({ dtpConsultant: params.dtpConsultant });
        filterLabels.push(`DTP Consultant: ${params.dtpConsultant}`);
    }

    if (params.hasWorks === 'yes') {
        andConditions.push({ 'works.0': { $exists: true } });
        filterLabels.push("With Approved Works");
    } else if (params.hasWorks === 'no') {
        andConditions.push({
            $or: [
                { works: { $exists: false } },
                { works: { $size: 0 } }
            ]
        });
        filterLabels.push("Without Approved Works");
    }

    if (params.filter === 'pending_dtp') {
        const packagesWithDTP = await DTP.find().distinct('tsId');
        andConditions.push({ _id: { $nin: packagesWithDTP } });
        filterLabels.push("Pending DTP");
    } else if (params.filter === 'pending_tender') {
        const packagesWithTender = await Tender.find().distinct('packageId');
        andConditions.push({ _id: { $nin: packagesWithTender } });
        filterLabels.push("Pending Tender");
    }

    const hasDashboardSpecificParams = !!(params.estimateConsultant || params.approvalYear || params.roadCategory || params.schemeName || params.natureOfWork);
    if (hasDashboardSpecificParams) {
        const dashboardFilter = await buildDashboardFilter(params);
        if (dashboardFilter.hasFilter && dashboardFilter.packageIds) {
            andConditions.push({ _id: { $in: dashboardFilter.packageIds } });
            filterLabels.push("Dashboard Filters Applied");
        }
    }

    if (isAuditor && auditorSubDivision) {
        const worksInAuditorSubDiv = await ApprovedWork.find({ subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } }).select('workName').lean();
        const workNamesInAuditorSubDiv = worksInAuditorSubDiv.map((aw: any) => aw.workName).filter(Boolean);
        andConditions.push({
            $or: [
                { subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } },
                { 'works.workName': { $in: workNamesInAuditorSubDiv } }
            ]
        });
        if (!params.subDivision) {
            filterLabels.push(`Sub Division: ${auditorSubDivision}`);
        }
    }

    if (andConditions.length > 0) {
        query.$and = andConditions;
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
        ApprovedWork.find({}).select('workName subDivision workType budgetHead').lean() as Promise<any[]>
    ]);
        
    const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const workSubDivisionMap = new Map<string, string>();
    const workTypeMap = new Map<string, string>();
    const workBudgetHeadMap = new Map<string, string>();
    allApprovedWorks.forEach((aw: any) => {
        if (aw.workName) {
            const key = normalize(aw.workName);
            workSubDivisionMap.set(key, aw.subDivision || '');
            workTypeMap.set(key, aw.workType || '');
            workBudgetHeadMap.set(key, aw.budgetHead || '');
        }
    });

    const packages = packagesRaw.map((p: any) => {
        const firstWorkName = p.works && p.works[0]?.workName;
        const normalizedKey = firstWorkName ? normalize(firstWorkName) : '';
        const inferredSubDivision = normalizedKey ? workSubDivisionMap.get(normalizedKey) : '';
        const inferredWorkType = normalizedKey ? workTypeMap.get(normalizedKey) : '';
        
        let inferredBudgetHead = '';
        if (p.works && p.works.length > 0) {
            const heads = p.works.map((w: any) => {
                const key = normalize(w.workName);
                return workBudgetHeadMap.get(key) || '';
            }).filter(Boolean);
            if (heads.length > 0) {
                const first = heads[0];
                if (heads.every((h: string) => h === first)) {
                    inferredBudgetHead = first;
                }
            }
        }

        return {
            ...p,
            _id: p._id.toString(),
            subDivision: p.subDivision || inferredSubDivision || '',
            workType: p.workType || inferredWorkType || '',
            budgetHead: p.budgetHead || inferredBudgetHead || '',
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
                <Link href={`/packages/${row._id}`} className="max-w-md whitespace-normal break-words font-medium text-emerald-600 hover:underline">
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
            key: 'budgetHead',
            label: 'Budget Head',
            sortable: true,
            minWidth: '150px',
            render: (row) => row.budgetHead || '-'
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
            <Link href={`/packages/${row._id}/edit`} className="text-emerald-600 hover:text-emerald-900 p-1" title="Edit Item">
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
            filterActive={!!params.filter || !!params.search || !!params.subDivision || !!params.workType || !!params.budgetHead || !!params.dtpConsultant || !!params.hasWorks}
            clearFiltersHref="/packages"
        >
            <PackagesFilterBar 
                subDivisions={subDivisions} 
                workTypes={workTypes} 
                budgetHeads={budgetHeads} 
                consultants={consultants} 
            />
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <Link
                    href="/packages"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        !params.filter
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    All Packages
                </Link>
                <Link
                    href="/packages?filter=pending_dtp"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'pending_dtp'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Pending DTP
                </Link>
                <Link
                    href="/packages?filter=pending_tender"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'pending_tender'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Pending Tender
                </Link>
            </div>
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
