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
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function TendersListPage({ searchParams }: Props) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

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

    if (isAuditor && auditorSubDivision) {
        const worksInAuditorSubDiv = await ApprovedWork.find({ subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } }).select('workName').lean();
        const workNames = worksInAuditorSubDiv.map((aw: any) => aw.workName).filter(Boolean);
        packageFilters.push({
            $or: [
                { subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } },
                { 'works.workName': { $in: workNames } }
            ]
        });
        if (!params.subDivision) {
            filterLabels.push(`Sub Division: ${auditorSubDivision}`);
        }
    }

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
    if (params.sort && params.order && params.sort !== 'workType' && params.sort !== 'contractorMobile' && params.sort !== 'noOfRoads') {
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
        const noOfRoads = pkg?.works && Array.isArray(pkg.works) && pkg.works.length > 0 ? pkg.works.length : 1;
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
            noOfRoads,
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
    } else if (params.sort === 'noOfRoads' && params.order) {
        const orderVal = params.order === 'asc' ? 1 : -1;
        tenders.sort((a: any, b: any) => {
            const valA = typeof a.noOfRoads === 'number' ? a.noOfRoads : 1;
            const valB = typeof b.noOfRoads === 'number' ? b.noOfRoads : 1;
            return (valA - valB) * orderVal;
        });
    }

    const columns: Column[] = [
        { 
            key: 'srNo', 
            label: 'Sr. No.', 
            align: 'center',
            width: '45px',
            sortable: true,
            cellClassName: 'whitespace-nowrap text-center text-xs',
            render: (row, index) => skip + index + 1
        },
        { key: 'tenderNoticeYear', label: 'Notice Year', sortable: true, align: 'center', width: '75px', cellClassName: 'whitespace-nowrap text-center text-xs' },
        { key: 'noticeNo', label: 'Notice No.', sortable: true, align: 'center', width: '65px', cellClassName: 'whitespace-nowrap text-center text-xs' },
        { key: 'tenderSrNo', label: 'Sub Sr.', sortable: true, align: 'center', width: '55px', cellClassName: 'whitespace-nowrap text-center text-xs', render: (row) => row.srNo || '-' },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            sortable: true, 
            footer: <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-950">Total</span>,
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    {row.packageId?._id ? (
                        <Link href={`/packages/${row.packageId._id}`} className="text-black font-normal hover:underline break-words text-xs">
                            {row.packageName || '-'}
                        </Link>
                    ) : (
                        <span className="text-black font-normal break-words text-xs">{row.packageName || '-'}</span>
                    )}
                    {row.cancelled && (
                        <span className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-50 text-red-600 border border-red-200 leading-none">
                            Cancelled: {row.cancellationReason || 'N/A'}
                        </span>
                    )}
                </div>
            ) 
        },
        {
            key: 'noOfRoads',
            label: 'No. of Roads',
            align: 'center',
            width: '65px',
            sortable: true,
            cellClassName: 'whitespace-nowrap text-center',
            footer: (rows: any[]) => {
                const total = rows.reduce((sum: number, r: any) => sum + (typeof r.noOfRoads === 'number' ? r.noOfRoads : 1), 0);
                return (
                    <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 text-xs font-black rounded-md bg-emerald-600 text-white shadow-xs">
                        {total}
                    </span>
                );
            },
            render: (row) => (
                <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                    {row.noOfRoads ?? 1}
                </span>
            )
        },
        { 
            key: 'workType', 
            label: 'Work Type', 
            sortable: true, 
            align: 'center',
            width: '75px',
            cellClassName: 'whitespace-nowrap text-center text-xs',
            render: (row) => row.workType || '-' 
        },
        { 
            key: 'contractorName', 
            label: 'Contractor Name', 
            sortable: true,
            width: '145px',
            cellClassName: 'text-xs break-words'
        },
        { 
            key: 'contractorMobile', 
            label: 'Mobile No.', 
            sortable: true, 
            align: 'center',
            width: '90px',
            cellClassName: 'whitespace-nowrap text-center text-xs',
            render: (row) => row.contractorMobile || '-' 
        },
        {
            key: 'bidders',
            label: 'Bidders',
            align: 'center',
            width: '80px',
            cellClassName: 'whitespace-nowrap text-center',
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
            align: 'center',
            width: '78px',
            cellClassName: 'whitespace-nowrap text-center',
            render: (row) => <span className="text-slate-600 font-mono text-[10.5px]">{formatShortDate(row.acceptanceLetterDate)}</span>
        },
        {
            key: 'workOrderDate',
            label: 'Work Order Date',
            sortable: true,
            align: 'center',
            width: '82px',
            cellClassName: 'whitespace-nowrap text-center',
            render: (row) => <span className="text-slate-600 font-mono text-[10.5px]">{formatShortDate(row.workOrderDate)}</span>
        },
        { 
            key: 'remarks', 
            label: 'Remarks', 
            sortable: true,
            width: '110px',
            render: (row) => (
                <div className="whitespace-normal break-words text-[11px] leading-tight">
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
                    className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        !params.filter
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    All Tenders
                </Link>
                <Link
                    href="/tenders?filter=pending_proposal"
                    className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        params.filter === 'pending_proposal'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    Pending Proposal
                </Link>
                <Link
                    href="/tenders?filter=pending_approval"
                    className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        params.filter === 'pending_approval'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    Pending Approval
                </Link>
                <Link
                    href="/tenders?filter=pending_loa"
                    className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        params.filter === 'pending_loa'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    Pending LOA
                </Link>
                <Link
                    href="/tenders?filter=pending_work_order"
                    className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        params.filter === 'pending_work_order'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    Pending Work Order
                </Link>
            </div>
            <DataTable 
                columns={columns} 
                data={tenders} 
                emptyMessage="No tenders found matching the criteria."
                theme="emerald"
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
