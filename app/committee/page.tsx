import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import ApprovedWork from '@/models/ApprovedWork';
import Link from 'next/link';
import { Eye, Edit2, CheckCircle2, Clock } from 'lucide-react';
import Pagination from '@/components/Pagination';
import CommitteeFilterBar from './CommitteeFilterBar';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import { parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';
import { formatShortDate } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function CommitteeListPage({ searchParams }: Props) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const params = await searchParams;
    
    // Fetch unique/distinct values for filter selectors
    const [subDivisionsPkg, subDivisionsAw, budgetHeadsPkg, budgetHeadsAw] = await Promise.all([
        Package.distinct('subDivision'),
        ApprovedWork.distinct('subDivision'),
        Package.distinct('budgetHead'),
        ApprovedWork.distinct('budgetHead'),
    ]);
    const subDivisions = Array.from(new Set([...subDivisionsPkg, ...subDivisionsAw])).filter(Boolean).sort() as string[];
    const budgetHeads = Array.from(new Set(['Pending', ...budgetHeadsPkg, ...budgetHeadsAw])).filter(Boolean).sort() as string[];

    let query: any = {};
    let filterLabels: string[] = [];
    const andConditions: any[] = [];

    // Filter tabs
    if (params.filter === 'pending_date') {
        andConditions.push({
            committee: { $in: ['Bandhkam Committee', 'Karobari'] },
            $or: [
                { committeeDate: { $exists: false } },
                { committeeDate: null }
            ]
        });
        filterLabels.push('Pending Committee Date');
    } else if (params.filter === 'date_added') {
        andConditions.push({
            committee: { $in: ['Bandhkam Committee', 'Karobari'] },
            committeeDate: { $exists: true, $ne: null }
        });
        filterLabels.push('Committee Date Added');
    } else if (params.filter === 'bandhkam') {
        andConditions.push({ committee: 'Bandhkam Committee' });
        filterLabels.push('Bandhkam Committee');
    } else if (params.filter === 'karobari') {
        andConditions.push({ committee: 'Karobari' });
        filterLabels.push('Karobari');
    } else if (params.filter === 'not_required') {
        andConditions.push({ committee: 'Not Required' });
        filterLabels.push('Not Required');
    } else if (params.filter === 'not_determined') {
        andConditions.push({
            $or: [
                { committee: { $exists: false } },
                { committee: null },
                { committee: '' },
                { committee: 'Not Determined' }
            ]
        });
        filterLabels.push('Not Determined');
    }

    if (params.committeeType) {
        if (params.committeeType === 'Not Determined') {
            andConditions.push({
                $or: [
                    { committee: { $exists: false } },
                    { committee: null },
                    { committee: '' },
                    { committee: 'Not Determined' }
                ]
            });
        } else {
            andConditions.push({ committee: params.committeeType });
        }
        filterLabels.push(`Committee: ${params.committeeType}`);
    }

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
        : "List of all packages with Committee approval status and dates.";

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { createdAt: -1 });

    const totalItems = await Package.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch counts for quick filter badges
    const [pendingDateCount, bandhkamCount, karobariCount, notRequiredCount, notDeterminedCount] = await Promise.all([
        Package.countDocuments({
            committee: { $in: ['Bandhkam Committee', 'Karobari'] },
            $or: [{ committeeDate: { $exists: false } }, { committeeDate: null }]
        }),
        Package.countDocuments({ committee: 'Bandhkam Committee' }),
        Package.countDocuments({ committee: 'Karobari' }),
        Package.countDocuments({ committee: 'Not Required' }),
        Package.countDocuments({
            $or: [
                { committee: { $exists: false } },
                { committee: null },
                { committee: '' },
                { committee: 'Not Determined' }
            ]
        })
    ]);

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
    const workBudgetHeadMap = new Map<string, string>();
    allApprovedWorks.forEach((aw: any) => {
        if (aw.workName) {
            const key = normalize(aw.workName);
            workSubDivisionMap.set(key, aw.subDivision || '');
            workBudgetHeadMap.set(key, aw.budgetHead || '');
        }
    });

    const packages = packagesRaw.map((p: any) => {
        const firstWorkName = p.works && p.works[0]?.workName;
        const normalizedKey = firstWorkName ? normalize(firstWorkName) : '';
        const inferredSubDivision = normalizedKey ? workSubDivisionMap.get(normalizedKey) : '';
        
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
            subDivision: p.subDivision || inferredSubDivision || '-',
            budgetHead: p.budgetHead || inferredBudgetHead || '-',
            committee: p.committee || '',
            committeeDate: p.committeeDate || null
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
            minWidth: '280px',
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
            minWidth: '140px',
            render: (row) => row.subDivision
        },
        {
            key: 'budgetHead',
            label: 'Budget Head',
            sortable: true,
            minWidth: '160px',
            render: (row) => row.budgetHead
        },
        {
            key: 'committee',
            label: 'Committee Required',
            sortable: true,
            minWidth: '180px',
            render: (row) => {
                if (row.committee === 'Bandhkam Committee') {
                    return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Bandhkam Committee
                        </span>
                    );
                }
                if (row.committee === 'Karobari') {
                    return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            Karobari
                        </span>
                    );
                }
                if (row.committee === 'Not Required') {
                    return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300">
                            Not Required
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Not Determined
                    </span>
                );
            }
        },
        {
            key: 'committeeDate',
            label: 'Committee Date',
            sortable: true,
            minWidth: '150px',
            render: (row) => {
                if (row.committee === 'Not Required') {
                    return <span className="text-slate-400 text-xs">-</span>;
                }
                if (row.committeeDate) {
                    return (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {formatShortDate(row.committeeDate)}
                        </span>
                    );
                }
                if (row.committee === 'Bandhkam Committee' || row.committee === 'Karobari') {
                    return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Date
                        </span>
                    );
                }
                return <span className="text-slate-400 text-xs">-</span>;
            }
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-3">
            <Link href={`/packages/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Package Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/packages/${row._id}/edit`} className="text-emerald-600 hover:text-emerald-900 p-1" title="Edit Package">
                <Edit2 className="w-5 h-5" />
            </Link>
        </div>
    );

    return (
        <ListPageLayout
            title="Committee Management"
            subtitle={filterLabel}
            searchPlaceholder="Search by package name..."
            filterActive={!!params.filter || !!params.search || !!params.subDivision || !!params.budgetHead || !!params.committeeType}
            clearFiltersHref="/committee"
        >
            <CommitteeFilterBar 
                subDivisions={subDivisions} 
                budgetHeads={budgetHeads} 
            />
            
            {/* Filter Tabs */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <Link
                    href="/committee"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        !params.filter
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    All Packages
                </Link>
                <Link
                    href="/committee?filter=pending_date"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'pending_date'
                            ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-amber-700 hover:bg-amber-50'
                    }`}
                >
                    <Clock className="w-3.5 h-3.5" />
                    Pending Committee Date
                    {pendingDateCount > 0 && (
                        <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                            params.filter === 'pending_date' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
                        }`}>
                            {pendingDateCount}
                        </span>
                    )}
                </Link>
                <Link
                    href="/committee?filter=date_added"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'date_added'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Date Added
                </Link>
                <Link
                    href="/committee?filter=bandhkam"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'bandhkam'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-blue-700 hover:bg-blue-50'
                    }`}
                >
                    Bandhkam Committee ({bandhkamCount})
                </Link>
                <Link
                    href="/committee?filter=karobari"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'karobari'
                            ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-purple-700 hover:bg-purple-50'
                    }`}
                >
                    Karobari ({karobariCount})
                </Link>
                <Link
                    href="/committee?filter=not_required"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'not_required'
                            ? 'bg-slate-700 border-slate-700 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Not Required ({notRequiredCount})
                </Link>
                <Link
                    href="/committee?filter=not_determined"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'not_determined'
                            ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-amber-700 hover:bg-amber-50'
                    }`}
                >
                    Not Determined ({notDeterminedCount})
                </Link>
            </div>

            <DataTable 
                columns={columns} 
                data={packages} 
                emptyMessage="No packages found matching the committee criteria."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
