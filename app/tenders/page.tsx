import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import Approval from '@/models/Approval';
import Package from '@/models/Package';
import WorkOrder from '@/models/WorkOrder';
import Agency from '@/models/Agency';
import ApprovedWork from '@/models/ApprovedWork';
import Link from 'next/link';
import { Plus, Eye, Edit2 } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import TendersFilterBar from '@/components/TendersFilterBar';
import ViewBiddersModalButton from '@/components/ViewBiddersModalButton';
import { buildDashboardFilter, parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';
import { formatShortDate } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function TendersListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;

    // Fetch agencies, years, sub-divisions, work types, approved works, and building types for inference
    const [rawAgencies, years, rawSubDivisions, rawWorkTypesAw, rawWorkTypesPkg, allApprovedWorks, rawBuildingTypesAw, rawBuildingTypesPkg] = await Promise.all([
        Agency.find({}).select('name mobileNo').sort({ name: 1 }).lean() as Promise<any[]>,
        Tender.distinct('tenderNoticeYear') as Promise<string[]>,
        Package.distinct('subDivision') as Promise<string[]>,
        ApprovedWork.distinct('workType') as Promise<string[]>,
        Package.distinct('workType') as Promise<string[]>,
        ApprovedWork.find({}).select('workName workType buildingType').lean() as Promise<any[]>,
        ApprovedWork.distinct('buildingType') as Promise<string[]>,
        Package.distinct('buildingType') as Promise<string[]>
    ]);
    const agencies = rawAgencies.map((a: any) => ({
        ...a,
        _id: a._id.toString()
    }));
    const agencyMobileMap = new Map(rawAgencies.map((a: any) => [a.name, a.mobileNo]));
    const subDivisions = rawSubDivisions.filter(Boolean).sort();
    const PREDEFINED_WORK_TYPES = ['Road', 'Building', 'Structure', 'Other'];
    const workTypes = Array.from(new Set([...PREDEFINED_WORK_TYPES, ...rawWorkTypesAw, ...rawWorkTypesPkg]))
        .filter(Boolean)
        .sort();
    const buildingTypes = Array.from(new Set([...rawBuildingTypesAw, ...rawBuildingTypesPkg]))
        .filter(Boolean)
        .sort() as string[];

    const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const workTypeMap = new Map<string, string>();
    allApprovedWorks.forEach((aw: any) => {
        if (aw.workName) {
            workTypeMap.set(normalize(aw.workName), aw.workType || '');
        }
    });
    
    let query: any = {};
    let filterLabels: string[] = [];

    const dashboardFilter = await buildDashboardFilter(params);
    if (dashboardFilter.hasFilter && dashboardFilter.packageIds) {
        query.packageId = { $in: dashboardFilter.packageIds };
        filterLabels.push("Dashboard Filters Applied");
    }

    if (params.filter === 'pending_proposal') {
        const approvalsWithProposal = await Approval.find({
            $or: [
                { proposalDate: { $ne: null } },
                { notRequired: true }
            ]
        }).distinct('tenderId');
        query.proposalDate = null;
        query._id = { ...query._id, $nin: approvalsWithProposal.map((id: any) => id.toString()) };
        query.cancelled = { $ne: true };
        // Exclude tenders that do not require approval (tender amount < 5,000,000)
        query.$and = [
            ...(query.$and || []),
            {
                $or: [
                    { estimatedAmount: { $gte: 5000000 } },
                    { 
                        $and: [
                            { $or: [{ estimatedAmount: { $exists: false } }, { estimatedAmount: null }] },
                            { $or: [{ contractPrice: { $exists: false } }, { contractPrice: null }, { contractPrice: { $gte: 5000000 } }] }
                        ]
                    }
                ]
            }
        ];
        filterLabels.push("Pending Proposal");
    } else if (params.filter === 'pending_approval') {
        const approvalsWithProposal = await Approval.find({
            $or: [
                { proposalDate: { $ne: null } },
                { notRequired: true }
            ]
        }).distinct('tenderId');
        const tendersWithProposalDate = await Tender.find({ proposalDate: { $ne: null } }).distinct('_id');
        const allTendersWithProposal = Array.from(new Set([
            ...tendersWithProposalDate.map((id: any) => id.toString()),
            ...approvalsWithProposal.map((id: any) => id.toString())
        ]));
        const approvalsWithApproval = await Approval.find({
            $or: [
                { tenderApprovalDate: { $ne: null } },
                { notRequired: true }
            ]
        }).distinct('tenderId');
        query.tenderApprovalDate = null;
        query._id = { 
            ...query._id, 
            $in: allTendersWithProposal, 
            $nin: approvalsWithApproval.map((id: any) => id.toString()) 
        };
        query.cancelled = { $ne: true };
        // Exclude tenders that do not require approval (tender amount < 5,000,000)
        query.$and = [
            ...(query.$and || []),
            {
                $or: [
                    { estimatedAmount: { $gte: 5000000 } },
                    { 
                        $and: [
                            { $or: [{ estimatedAmount: { $exists: false } }, { estimatedAmount: null }] },
                            { $or: [{ contractPrice: { $exists: false } }, { contractPrice: null }, { contractPrice: { $gte: 5000000 } }] }
                        ]
                    }
                ]
            }
        ];
        filterLabels.push("Pending Approval");
    } else if (params.filter === 'pending_loa') {
        const tendersWithApprovalDate = await Tender.find({ tenderApprovalDate: { $ne: null } }).distinct('_id');
        const approvalsWithApproval = await Approval.find({
            $or: [
                { tenderApprovalDate: { $ne: null } },
                { notRequired: true }
            ]
        }).distinct('tenderId');
        const lowPriceTenders = await Tender.find({
            $or: [
                { estimatedAmount: { $lt: 5000000, $gt: 0 } },
                { 
                    $and: [
                        { $or: [{ estimatedAmount: { $exists: false } }, { estimatedAmount: null }] },
                        { contractPrice: { $lt: 5000000, $ne: null, $gt: 0 } }
                    ]
                }
            ]
        }).distinct('_id');
        
        const tendersApproved = Array.from(new Set([
            ...tendersWithApprovalDate.map((id: any) => id.toString()),
            ...approvalsWithApproval.map((id: any) => id.toString()),
            ...lowPriceTenders.map((id: any) => id.toString())
        ]));
        const tendersWithLoaDocs = await LOA.find().distinct('tenderId');
        const tendersWithLoaDate = await Tender.find({ acceptanceLetterDate: { $ne: null } }).distinct('_id');
        const tendersWithLoaAll = Array.from(new Set([
            ...tendersWithLoaDocs.map((id: any) => id.toString()),
            ...tendersWithLoaDate.map((id: any) => id.toString())
        ]));
        query._id = { 
            ...query._id, 
            $in: tendersApproved, 
            $nin: tendersWithLoaAll 
        };
        query.cancelled = { $ne: true };
        filterLabels.push("Pending LOA");
    } else if (params.filter === 'pending_work_order') {
        const tendersWithLoaDocs = await LOA.find().distinct('tenderId');
        const tendersWithLoaDate = await Tender.find({ acceptanceLetterDate: { $ne: null } }).distinct('_id');
        const tendersWithLoaAll = Array.from(new Set([
            ...tendersWithLoaDocs.map((id: any) => id.toString()),
            ...tendersWithLoaDate.map((id: any) => id.toString())
        ]));
        const loaWithWorkOrder = await WorkOrder.find().distinct('loaId');
        const tendersWithWorkOrderDocs = await LOA.find({ _id: { $in: loaWithWorkOrder } }).distinct('tenderId');
        const tendersWithWorkOrderDate = await Tender.find({ workOrderDate: { $ne: null } }).distinct('_id');
        const tendersWithWorkOrderAll = Array.from(new Set([
            ...tendersWithWorkOrderDocs.map((id: any) => id.toString()),
            ...tendersWithWorkOrderDate.map((id: any) => id.toString())
        ]));
        query._id = { 
            ...query._id, 
            $in: tendersWithLoaAll, 
            $nin: tendersWithWorkOrderAll 
        };
        query.cancelled = { $ne: true };
        filterLabels.push("Pending Work Order");
    }

    if (params.search) {
        query.$or = [
            { tenderId: { $regex: params.search, $options: 'i' } },
            { packageName: { $regex: params.search, $options: 'i' } },
            { contractorName: { $regex: params.search, $options: 'i' } }
        ];
    }

    const packageFilters: any[] = [];
    if (params.subDivision) {
        const worksInSubDiv = await ApprovedWork.find({ subDivision: params.subDivision }).select('workName').lean();
        const workNames = worksInSubDiv.map((aw: any) => aw.workName).filter(Boolean);
        packageFilters.push({
            $or: [
                { subDivision: params.subDivision },
                { 'works.workName': { $in: workNames } }
            ]
        });
        filterLabels.push(`Sub Division: ${params.subDivision}`);
    }

    if (params.workType) {
        const selectedWorkTypes = params.workType.split(',').filter(Boolean);
        if (selectedWorkTypes.length > 0) {
            const worksInWorkType = await ApprovedWork.find({ workType: { $in: selectedWorkTypes } }).select('workName').lean();
            const workNames = worksInWorkType.map((aw: any) => aw.workName).filter(Boolean);
            packageFilters.push({
                $or: [
                    { workType: { $in: selectedWorkTypes } },
                    { 'works.workName': { $in: workNames } }
                ]
            });
            filterLabels.push(`Work Type: ${selectedWorkTypes.join(', ')}`);
        }
    }

    if (params.buildingType) {
        const selectedBuildingTypes = params.buildingType.split(',').filter(Boolean);
        if (selectedBuildingTypes.length > 0) {
            const worksInBuildingType = await ApprovedWork.find({ buildingType: { $in: selectedBuildingTypes } }).select('workName').lean();
            const workNames = worksInBuildingType.map((aw: any) => aw.workName).filter(Boolean);
            packageFilters.push({
                $or: [
                    { buildingType: { $in: selectedBuildingTypes } },
                    { 'works.workName': { $in: workNames } }
                ]
            });
            filterLabels.push(`Building Type: ${selectedBuildingTypes.join(', ')}`);
        }
    }

    if (packageFilters.length > 0) {
        const matchingPackages = await Package.find({ $and: packageFilters }).distinct('_id');
        const matchingPkgIdStrs = matchingPackages.map((id: any) => id.toString());
        if (query.packageId && query.packageId.$in) {
            const existingSet = new Set((query.packageId.$in as any[]).map((id: any) => id.toString()));
            const intersected = matchingPkgIdStrs.filter(idStr => existingSet.has(idStr));
            query.packageId = { $in: intersected };
        } else {
            query.packageId = { $in: matchingPkgIdStrs };
        }
    }

    if (params.noticeYear) {
        query.tenderNoticeYear = params.noticeYear;
        filterLabels.push(`Notice Year: ${params.noticeYear}`);
    }
    if (params.noticeNo) {
        query.noticeNo = params.noticeNo;
        filterLabels.push(`Notice No: ${params.noticeNo}`);
    }
    if (params.contractorName) {
        query.contractorName = params.contractorName;
        filterLabels.push(`Contractor: ${params.contractorName}`);
    }
    if (params.trialNo) {
        query.trialNo = parseInt(params.trialNo, 10);
        filterLabels.push(`Trial No: ${params.trialNo}`);
    }

    const { page, limit, skip } = parsePagination(params);
    let sortObj: any = {};
    if (params.sort && params.order && params.sort !== 'workType' && params.sort !== 'contractorMobile') {
        const orderVal = params.order === 'asc' ? 1 : -1;
        const dbSortField = params.sort === 'tenderSrNo' ? 'srNo' : params.sort;
        sortObj[dbSortField] = orderVal;
        if (dbSortField !== 'tenderNoticeYear') sortObj.tenderNoticeYear = -1;
        if (dbSortField !== 'noticeNo') sortObj.noticeNo = 1;
        if (dbSortField !== 'srNo') sortObj.srNo = 1;
    } else {
        sortObj = { tenderNoticeYear: -1, noticeNo: 1, srNo: 1 };
    }

    const totalItems = await Tender.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const tendersRaw = await Tender.find(query)
        .populate({ path: 'packageId', select: 'works.workName workType', model: Package })
        .collation({ locale: "en_US", numericOrdering: true })
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

    const tenderIds = tendersRaw.map((t: any) => t._id);

    const [approvals, loas] = await Promise.all([
        Approval.find({ tenderId: { $in: tenderIds } }).select('tenderId notRequired proposalDate tenderApprovalDate').lean(),
        LOA.find({ tenderId: { $in: tenderIds } }).select('_id tenderId acceptanceLetterDate').lean()
    ]);

    const loaIds = loas.map((l: any) => l._id);
    const workOrders = await WorkOrder.find({ loaId: { $in: loaIds } }).select('loaId workOrderDate').lean();

    const approvalMap = new Map(approvals.map((a: any) => [a.tenderId?.toString(), a]));
    const loaMap = new Map(loas.map((l: any) => [l.tenderId?.toString(), l]));
    const workOrderMap = new Map(workOrders.map((wo: any) => [wo.loaId?.toString(), wo]));

    const tenders = tendersRaw.map((t: any) => {
        const tIdStr = t._id.toString();
        const approval = approvalMap.get(tIdStr);
        const loa = loaMap.get(tIdStr);
        const workOrder = loa ? workOrderMap.get(loa._id.toString()) : null;

        const pkg = t.packageId;
        const firstWorkName = pkg?.works && pkg.works[0]?.workName;
        const normalizedKey = firstWorkName ? normalize(firstWorkName) : '';
        const inferredWorkType = normalizedKey ? workTypeMap.get(normalizedKey) : '';
        const workType = pkg?.workType || inferredWorkType || '-';
        const contractorMobile = (t.contractorName && agencyMobileMap.get(t.contractorName)) || (t as any).contractorMobile || '-';

        const isApprovalNotRequired = approval?.notRequired === true || (
            (t.estimatedAmount !== undefined && t.estimatedAmount !== null)
                ? Number(t.estimatedAmount) < 5000000
                : (t.contractPrice !== undefined && Number(t.contractPrice) < 5000000)
        );
        const proposalDate = isApprovalNotRequired ? 'Not Required' : (t.proposalDate || approval?.proposalDate || null);
        const tenderApprovalDate = isApprovalNotRequired ? 'Not Required' : (t.tenderApprovalDate || approval?.tenderApprovalDate || null);
        const acceptanceLetterDate = t.acceptanceLetterDate || loa?.acceptanceLetterDate || null;
        const workOrderDate = t.workOrderDate || workOrder?.workOrderDate || null;

        return {
            ...t,
            _id: tIdStr,
            workType,
            contractorMobile,
            proposalDate,
            tenderApprovalDate,
            acceptanceLetterDate,
            workOrderDate,
        };
    });

    if (params.sort === 'workType' && params.order) {
        const orderVal = params.order === 'asc' ? 1 : -1;
        tenders.sort((a: any, b: any) => {
            const valA = (a.workType || '').toString();
            const valB = (b.workType || '').toString();
            return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * orderVal;
        });
    } else if (params.sort === 'contractorMobile' && params.order) {
        const orderVal = params.order === 'asc' ? 1 : -1;
        tenders.sort((a: any, b: any) => {
            const valA = (a.contractorMobile || '').toString();
            const valB = (b.contractorMobile || '').toString();
            return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * orderVal;
        });
    }

    const columns: Column[] = [
        { 
            key: 'srNo', 
            label: 'Sr. No.', 
            align: 'center',
            sortable: true,
            render: (row, index) => skip + index + 1
        },
        { key: 'tenderNoticeYear', label: 'Notice Year', sortable: true },
        { key: 'noticeNo', label: 'Notice No.', sortable: true },
        { key: 'tenderSrNo', label: 'Sub Sr.', sortable: true, align: 'center', render: (row) => row.srNo || '-' },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            sortable: true, 
            render: (row) => (
                <div className="flex flex-col gap-1">
                    {row.packageId?._id ? (
                        <Link href={`/packages/${row.packageId._id}`} className="text-blue-600 hover:underline font-semibold break-words">
                            {row.packageName || '-'}
                        </Link>
                    ) : (
                        <span className="break-words">{row.packageName || '-'}</span>
                    )}
                    {row.cancelled && (
                        <span className="inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 leading-none">
                            Cancelled: {row.cancellationReason || 'N/A'}
                        </span>
                    )}
                </div>
            ) 
        },
        { 
            key: 'workType', 
            label: 'Work Type', 
            sortable: true, 
            render: (row) => row.workType || '-' 
        },
        { key: 'contractorName', label: 'Contractor Name', sortable: true },
        { key: 'contractorMobile', label: 'Mobile No.', sortable: true, render: (row) => row.contractorMobile || '-' },
        {
            key: 'bidders',
            label: 'Bidders',
            align: 'center',
            render: (row) => (
                <ViewBiddersModalButton
                    bidders={row.bidders || []}
                    tenderId={row.tenderId}
                    packageName={row.packageName}
                    contractorName={row.contractorName}
                />
            )
        },
        {
            key: 'acceptanceLetterDate',
            label: 'LOA Date',
            sortable: true,
            render: (row) => <span className="text-slate-600 font-mono text-[11px]">{formatShortDate(row.acceptanceLetterDate)}</span>
        },
        {
            key: 'workOrderDate',
            label: 'Work Order Date',
            sortable: true,
            render: (row) => <span className="text-slate-600 font-mono text-[11px]">{formatShortDate(row.workOrderDate)}</span>
        },
        { 
            key: 'remarks', 
            label: 'Remarks', 
            sortable: true,
            render: (row) => (
                <div className="whitespace-normal break-words max-w-[140px] text-[11px]">
                    {row.remarks || '-'}
                </div>
            ) 
        },
    ];

    const filterLabel = filterLabels.length > 0 ? `Filtered by: ${filterLabels.join(' | ')}` : "List of all tenders.";

    return (
        <ListPageLayout
            title="Tenders"
            subtitle={filterLabel}
            addHref="/tenders/new"
            addLabel="Add New Tender"
            searchPlaceholder="Search by Tender ID, Package, or Contractor..."
            filterActive={!!params.filter || !!params.search || !!params.noticeYear || !!params.noticeNo || !!params.contractorName || !!params.trialNo || !!params.subDivision || !!params.workType || !!params.buildingType}
            clearFiltersHref="/tenders"
        >
            <TendersFilterBar agencies={agencies} years={years} subDivisions={subDivisions} workTypes={workTypes} buildingTypes={buildingTypes} />
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <Link
                    href="/tenders"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        !params.filter
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    All Tenders
                </Link>
                <Link
                    href="/tenders?filter=pending_proposal"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'pending_proposal'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Pending Proposal
                </Link>
                <Link
                    href="/tenders?filter=pending_approval"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'pending_approval'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Pending Approval
                </Link>
                <Link
                    href="/tenders?filter=pending_loa"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'pending_loa'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Pending LOA
                </Link>
                <Link
                    href="/tenders?filter=pending_work_order"
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                        params.filter === 'pending_work_order'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Pending Work Order
                </Link>
            </div>
            <DataTable 
                columns={columns} 
                data={tenders} 
                emptyMessage="No tenders found matching the criteria."
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
