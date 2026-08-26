import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import ApprovedWork from '@/models/ApprovedWork';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
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
import { formatShortDate, formatDate, parseDateStr } from '@/lib/dateUtils';

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
    const [subDivisionsPkg, subDivisionsAw, workTypesPkg, workTypesAw, budgetHeadsPkg, budgetHeadsAw] = await Promise.all([
        Package.distinct('subDivision'),
        ApprovedWork.distinct('subDivision'),
        Package.distinct('workType'),
        ApprovedWork.distinct('workType'),
        Package.distinct('budgetHead'),
        ApprovedWork.distinct('budgetHead'),
    ]);
    const subDivisions = Array.from(new Set([...subDivisionsPkg, ...subDivisionsAw])).filter(Boolean).sort() as string[];
    const workTypes = Array.from(new Set(['Pending', ...workTypesPkg, ...workTypesAw])).filter(Boolean).sort() as string[];
    const budgetHeads = Array.from(new Set(['Pending', ...budgetHeadsPkg, ...budgetHeadsAw])).filter(Boolean).sort() as string[];

    let filterLabels: string[] = [];
    const baseConditions: any[] = [];

    if (params.committeeType) {
        if (params.committeeType === 'Not Determined') {
            baseConditions.push({
                $or: [
                    { committee: { $exists: false } },
                    { committee: null },
                    { committee: '' },
                    { committee: 'Not Determined' }
                ]
            });
        } else {
            baseConditions.push({ committee: params.committeeType });
        }
        filterLabels.push(`Committee: ${params.committeeType}`);
    }

    if (params.subDivision) {
        const worksInSubDiv = await ApprovedWork.find({ subDivision: params.subDivision }).select('workName').lean();
        const workNamesInSubDiv = worksInSubDiv.map((aw: any) => aw.workName).filter(Boolean);
        baseConditions.push({
            $or: [
                { subDivision: params.subDivision },
                { 'works.workName': { $in: workNamesInSubDiv } }
            ]
        });
        filterLabels.push(`Sub Division: ${params.subDivision}`);
    }

    if (params.workType === 'Pending') {
        const worksWithWorkType = await ApprovedWork.find({
            workType: { $exists: true, $ne: null, $nin: ['', 'Pending'] }
        }).select('workName').lean();
        const workNamesWithWorkType = worksWithWorkType.map((aw: any) => aw.workName).filter(Boolean);
        baseConditions.push({
            $and: [
                {
                    $or: [
                        { workType: { $exists: false } },
                        { workType: null },
                        { workType: '' },
                        { workType: 'Pending' }
                    ]
                },
                {
                    'works.workName': { $nin: workNamesWithWorkType }
                }
            ]
        });
        filterLabels.push('Work Type: Pending');
    } else if (params.workType) {
        const worksInWorkType = await ApprovedWork.find({ workType: params.workType }).select('workName').lean();
        const workNamesInWorkType = worksInWorkType.map((aw: any) => aw.workName).filter(Boolean);
        baseConditions.push({
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
        baseConditions.push({
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
        baseConditions.push({
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
        baseConditions.push({
            $or: [
                { subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } },
                { 'works.workName': { $in: workNamesInAuditorSubDiv } }
            ]
        });
        if (!params.subDivision) {
            filterLabels.push(`Sub Division: ${auditorSubDivision}`);
        }
    }

    let packageIdsWithLoa: any[] = [];
    let loaFetched = false;
    const getPackageIdsWithLoa = async () => {
        if (!loaFetched) {
            const tendersWithLoaDocs = await LOA.find().distinct('tenderId');
            const tendersWithLoaDate = await Tender.find({ acceptanceLetterDate: { $ne: null } }).distinct('_id');
            const tendersWithLoaAll = Array.from(new Set([
                ...tendersWithLoaDocs.map((id: any) => id.toString()),
                ...tendersWithLoaDate.map((id: any) => id.toString())
            ]));
            packageIdsWithLoa = await Tender.find({
                _id: { $in: tendersWithLoaAll },
                packageId: { $exists: true, $ne: null },
                cancelled: { $ne: true }
            }).distinct('packageId');
            loaFetched = true;
        }
        return packageIdsWithLoa;
    };

    const getPackageIdsWithLoaDateRange = async (fromStr?: string, toStr?: string) => {
        const dateQuery: any = {};
        if (fromStr) {
            const fromD = parseDateStr(fromStr) || new Date(fromStr);
            if (!isNaN(fromD.getTime())) {
                fromD.setHours(0, 0, 0, 0);
                dateQuery.$gte = fromD;
            }
        }
        if (toStr) {
            const toD = parseDateStr(toStr) || new Date(toStr);
            if (!isNaN(toD.getTime())) {
                toD.setHours(23, 59, 59, 999);
                dateQuery.$lte = toD;
            }
        }

        const matchingLoas = await LOA.find({ acceptanceLetterDate: dateQuery }).distinct('tenderId');
        const matchingTendersWithDate = await Tender.find({ acceptanceLetterDate: dateQuery }).distinct('_id');

        const allMatchingTenderIds = Array.from(new Set([
            ...matchingLoas.map((id: any) => id.toString()),
            ...matchingTendersWithDate.map((id: any) => id.toString())
        ]));

        const matchingPackageIds = await Tender.find({
            _id: { $in: allMatchingTenderIds },
            packageId: { $exists: true, $ne: null },
            cancelled: { $ne: true }
        }).distinct('packageId');

        return matchingPackageIds;
    };

    const loaFrom = params.loaFromDate || params.fromDate;
    const loaTo = params.loaToDate || params.toDate;

    if (loaFrom || loaTo) {
        const pkgIds = await getPackageIdsWithLoaDateRange(loaFrom, loaTo);
        baseConditions.push({ _id: { $in: pkgIds } });
        if (loaFrom && loaTo) {
            filterLabels.push(`LOA Date: ${formatDate(loaFrom)} to ${formatDate(loaTo)}`);
        } else if (loaFrom) {
            filterLabels.push(`LOA Date from: ${formatDate(loaFrom)}`);
        } else if (loaTo) {
            filterLabels.push(`LOA Date up to: ${formatDate(loaTo)}`);
        }
    } else if (params.hasLoa === 'yes') {
        const pkgIds = await getPackageIdsWithLoa();
        baseConditions.push({ _id: { $in: pkgIds } });
        filterLabels.push('LOA: Given');
    } else if (params.hasLoa === 'no') {
        const pkgIds = await getPackageIdsWithLoa();
        baseConditions.push({ _id: { $nin: pkgIds } });
        filterLabels.push('LOA: Not Given');
    }

    const andConditions: any[] = [...baseConditions];

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

    let query: any = {};
    if (andConditions.length > 0) {
        query.$and = andConditions;
    }

    if (params.search) {
        const searchCond = {
            $or: [
                { packageName: { $regex: params.search, $options: 'i' } },
                { packageNameGujarati: { $regex: params.search, $options: 'i' } }
            ]
        };
        if (query.$and) {
            query.$and.push(searchCond);
        } else {
            query.$and = [searchCond];
        }
    }

    const baseSearchQuery: any = {};
    if (params.search) {
        baseSearchQuery.$or = [
            { packageName: { $regex: params.search, $options: 'i' } },
            { packageNameGujarati: { $regex: params.search, $options: 'i' } }
        ];
    }

    const buildCountQuery = (extraCondition?: any) => {
        const conditions = [...baseConditions];
        if (extraCondition) {
            conditions.push(extraCondition);
        }
        const q: any = { ...baseSearchQuery };
        if (conditions.length > 0) {
            q.$and = conditions;
        }
        return q;
    };

    const filterLabel = filterLabels.length > 0
        ? `Filtered by: ${filterLabels.join(' | ')}`
        : "List of all packages with Committee approval status and dates.";

    const { page, limit, skip } = parsePagination(params);

    // Fetch counts for quick filter badges respecting active filters
    const [
        allCount,
        pendingDateCount,
        dateAddedCount,
        bandhkamCount,
        karobariCount,
        notRequiredCount,
        notDeterminedCount,
        packagesRaw,
        allApprovedWorks,
        allTenders,
        allLoas
    ] = await Promise.all([
        Package.countDocuments(buildCountQuery()),
        Package.countDocuments(buildCountQuery({
            committee: { $in: ['Bandhkam Committee', 'Karobari'] },
            $or: [{ committeeDate: { $exists: false } }, { committeeDate: null }]
        })),
        Package.countDocuments(buildCountQuery({
            committee: { $in: ['Bandhkam Committee', 'Karobari'] },
            committeeDate: { $exists: true, $ne: null }
        })),
        Package.countDocuments(buildCountQuery({ committee: 'Bandhkam Committee' })),
        Package.countDocuments(buildCountQuery({ committee: 'Karobari' })),
        Package.countDocuments(buildCountQuery({ committee: 'Not Required' })),
        Package.countDocuments(buildCountQuery({
            $or: [
                { committee: { $exists: false } },
                { committee: null },
                { committee: '' },
                { committee: 'Not Determined' }
            ]
        })),
        Package.find(query).lean(),
        ApprovedWork.find({}).select('workName subDivision workType budgetHead').lean() as Promise<any[]>,
        Tender.find({ cancelled: { $ne: true } }).select('_id packageId acceptanceLetterDate contractorName estimatedAmount contractPrice aboveBelowPercentage aboveBelowInWord bidders').lean(),
        LOA.find({}).select('tenderId acceptanceLetterDate').lean()
    ]);

    const loaByTenderId = new Map<string, Date>();
    allLoas.forEach((l: any) => {
        if (l.tenderId && l.acceptanceLetterDate) {
            loaByTenderId.set(l.tenderId.toString(), l.acceptanceLetterDate);
        }
    });

    const loaMap = new Map<string, { acceptanceLetterDate?: Date }>();
    const tenderMap = new Map<string, any>();
    allTenders.forEach((t: any) => {
        if (t.packageId) {
            tenderMap.set(t.packageId.toString(), t);
            const date = loaByTenderId.get(t._id.toString()) || t.acceptanceLetterDate;
            if (date) {
                loaMap.set(t.packageId.toString(), { acceptanceLetterDate: date });
            } else if (loaByTenderId.has(t._id.toString())) {
                loaMap.set(t.packageId.toString(), {});
            }
        }
    });
        
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

    const allResolvedPackages = packagesRaw.map((p: any) => {
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

        const loaInfo = loaMap.get(p._id.toString());
        const tender = tenderMap.get(p._id.toString());

        const tenderAmount = tender?.estimatedAmount ?? p.estimatedAmount ?? (p.works && p.works.length > 0 ? p.works.reduce((acc: number, w: any) => acc + (w.amount || 0), 0) : null);
        const contractorName = tender?.contractorName || '';
        const contractPrice = tender?.contractPrice ?? null;
        const aboveBelowPercentage = tender?.aboveBelowPercentage ?? (tender?.bidders && tender.bidders[0]?.percentage != null ? tender.bidders[0].percentage : null);
        const aboveBelow = tender?.aboveBelowInWord || (tender?.bidders && tender.bidders[0]?.aboveBelow ? tender.bidders[0].aboveBelow : '');

        return {
            ...p,
            _id: p._id.toString(),
            subDivision: p.subDivision || inferredSubDivision || '-',
            workType: p.workType || inferredWorkType || '-',
            budgetHead: p.budgetHead || inferredBudgetHead || '-',
            committee: p.committee || '',
            committeeDate: p.committeeDate || null,
            hasLoa: !!loaInfo,
            loaDate: loaInfo?.acceptanceLetterDate || null,
            contractorName,
            tenderAmount,
            contractPrice,
            aboveBelowPercentage,
            aboveBelow,
        };
    });

    // Global in-memory sorting across all resolved packages
    const sortField = params.sort;
    const sortOrder = params.order === 'desc' ? -1 : 1;

    if (sortField) {
        allResolvedPackages.sort((a: any, b: any) => {
            const valA = a[sortField];
            const valB = b[sortField];

            if (valA == null && valB == null) return 0;
            if (valA == null) return 1;
            if (valB == null) return -1;

            if (typeof valA === 'number' && typeof valB === 'number') {
                return (valA - valB) * sortOrder;
            }

            if (typeof valA === 'string' || typeof valB === 'string') {
                const strA = (valA || '').toString().trim().toLowerCase();
                const strB = (valB || '').toString().trim().toLowerCase();
                return strA.localeCompare(strB) * sortOrder;
            }

            if (valA < valB) return -1 * sortOrder;
            if (valA > valB) return 1 * sortOrder;
            return 0;
        });
    } else {
        allResolvedPackages.sort((a: any, b: any) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });
    }

    const totalItems = allResolvedPackages.length;
    const totalPages = Math.ceil(totalItems / limit);
    const packages = allResolvedPackages.slice(skip, skip + limit);

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
            minWidth: '260px',
            render: (row) => (
                <Link href={`/packages/${row._id}`} className="max-w-md whitespace-normal break-words font-medium text-emerald-600 hover:underline">
                    {row.packageName}
                </Link>
            )
        },
        { 
            key: 'packageNameGujarati', 
            label: 'Package Name in Gujarati', 
            sortable: true,
            minWidth: '260px',
            render: (row) => (
                <Link href={`/packages/${row._id}`} className="max-w-md whitespace-normal break-words font-medium text-slate-700 hover:text-emerald-600 hover:underline">
                    {row.packageNameGujarati || '-'}
                </Link>
            )
        },
        { 
            key: 'contractorName', 
            label: 'Contractor Name', 
            sortable: true,
            minWidth: '200px',
            render: (row) => row.contractorName ? (
                <span className="font-semibold text-slate-800">{row.contractorName}</span>
            ) : (
                <span className="text-slate-400 text-xs">-</span>
            )
        },
        { 
            key: 'tenderAmount', 
            label: 'Tender Amount', 
            sortable: true,
            align: 'right',
            minWidth: '150px',
            render: (row) => row.tenderAmount != null ? (
                <span className="font-mono font-semibold text-slate-800">
                    ₹{Number(row.tenderAmount).toLocaleString('en-IN')}
                </span>
            ) : (
                <span className="text-slate-400 text-xs">-</span>
            )
        },
        { 
            key: 'contractPrice', 
            label: 'Final Contract Price', 
            sortable: true,
            align: 'right',
            minWidth: '160px',
            render: (row) => row.contractPrice != null ? (
                <span className="font-mono font-bold text-emerald-700">
                    ₹{Number(row.contractPrice).toLocaleString('en-IN')}
                </span>
            ) : (
                <span className="text-slate-400 text-xs">-</span>
            )
        },
        { 
            key: 'aboveBelowPercentage', 
            label: 'Above/ Below Percentage', 
            sortable: true,
            align: 'right',
            minWidth: '180px',
            render: (row) => row.aboveBelowPercentage != null ? (
                <span className="font-mono font-semibold text-slate-700">
                    {row.aboveBelowPercentage}%
                </span>
            ) : (
                <span className="text-slate-400 text-xs">-</span>
            )
        },
        { 
            key: 'aboveBelow', 
            label: 'Above/ Below?', 
            sortable: true,
            minWidth: '130px',
            render: (row) => {
                if (!row.aboveBelow) return <span className="text-slate-400 text-xs">-</span>;
                const isBelow = row.aboveBelow.toLowerCase().includes('below');
                const isAbove = row.aboveBelow.toLowerCase().includes('above');
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isBelow ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        isAbove ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                        {row.aboveBelow}
                    </span>
                );
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

    const getFilterUrl = (filterVal?: string) => {
        const p = new URLSearchParams();
        if (params.search) p.set('search', params.search);
        if (params.subDivision) p.set('subDivision', params.subDivision);
        if (params.workType) p.set('workType', params.workType);
        if (params.budgetHead) p.set('budgetHead', params.budgetHead);
        if (params.committeeType) p.set('committeeType', params.committeeType);
        if (params.hasLoa) p.set('hasLoa', params.hasLoa);
        if (params.loaFromDate) p.set('loaFromDate', params.loaFromDate);
        if (params.loaToDate) p.set('loaToDate', params.loaToDate);
        if (params.fromDate) p.set('fromDate', params.fromDate);
        if (params.toDate) p.set('toDate', params.toDate);
        if (params.sort) p.set('sort', params.sort);
        if (params.order) p.set('order', params.order);
        if (filterVal) p.set('filter', filterVal);
        const qs = p.toString();
        return qs ? `/committee?${qs}` : '/committee';
    };

    return (
        <ListPageLayout
            title="Committee Management"
            subtitle={filterLabel}
            searchPlaceholder="Search by package name..."
            filterActive={!!params.filter || !!params.search || !!params.subDivision || !!params.workType || !!params.budgetHead || !!params.committeeType || !!params.hasLoa || !!params.loaFromDate || !!params.loaToDate || !!params.fromDate || !!params.toDate || !!params.sort}
            clearFiltersHref="/committee"
        >
            <CommitteeFilterBar 
                subDivisions={subDivisions} 
                workTypes={workTypes}
                budgetHeads={budgetHeads} 
            />
            
            {/* Filter Tabs */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <Link
                    href={getFilterUrl(undefined)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        !params.filter
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    All Packages ({allCount})
                </Link>
                <Link
                    href={getFilterUrl('pending_date')}
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
                    href={getFilterUrl('date_added')}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'date_added'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Date Added ({dateAddedCount})
                </Link>
                <Link
                    href={getFilterUrl('bandhkam')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'bandhkam'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-blue-700 hover:bg-blue-50'
                    }`}
                >
                    Bandhkam Committee ({bandhkamCount})
                </Link>
                <Link
                    href={getFilterUrl('karobari')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'karobari'
                            ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-purple-700 hover:bg-purple-50'
                    }`}
                >
                    Karobari ({karobariCount})
                </Link>
                <Link
                    href={getFilterUrl('not_required')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'not_required'
                            ? 'bg-slate-700 border-slate-700 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Not Required ({notRequiredCount})
                </Link>
                <Link
                    href={getFilterUrl('not_determined')}
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
