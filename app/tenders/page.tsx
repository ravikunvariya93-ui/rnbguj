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
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import TendersFilterBar from '@/components/TendersFilterBar';
import TenderDateSubFilter from '@/components/TenderDateSubFilter';
import ViewBiddersModalButton from '@/components/ViewBiddersModalButton';
import { buildDashboardFilter, parsePagination } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';
import { formatShortDate } from '@/lib/dateUtils';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

export const dynamic = 'force-dynamic';

type LeanId = { toString(): string };
interface AgencyLean {
    _id: LeanId;
    name?: string;
    mobileNo?: string;
    [key: string]: unknown;
}
interface ApprovedWorkLean {
    workName?: string;
    workType?: string;
    [key: string]: unknown;
}
interface BidderLean {
    rank?: string;
    contractorName?: string;
    aboveBelow?: string;
    percentage?: number | null;
    totalAmount?: number | null;
    [key: string]: unknown;
}
interface PkgWorksEntry {
    workName?: string;
    [key: string]: unknown;
}
interface PkgRef {
    _id?: LeanId;
    works?: PkgWorksEntry[];
    workType?: string;
    [key: string]: unknown;
}
interface TenderLean {
    _id: LeanId;
    packageId?: PkgRef | string | null;
    bidders?: BidderLean[];
    contractorName?: string;
    contractorMobile?: string;
    estimatedAmount?: number;
    contractPrice?: number;
    proposalDate?: unknown;
    tenderApprovalDate?: unknown;
    acceptanceLetterDate?: unknown;
    workOrderDate?: unknown;
    [key: string]: unknown;
}
interface ApprovalLean {
    _id?: LeanId;
    tenderId?: LeanId | null;
    notRequired?: boolean;
    proposalDate?: unknown;
    tenderApprovalDate?: unknown;
    [key: string]: unknown;
}
interface LoaLean {
    _id: LeanId;
    tenderId?: LeanId | null;
    acceptanceLetterDate?: unknown;
    [key: string]: unknown;
}
interface WorkOrderLean {
    _id?: LeanId;
    loaId?: LeanId | null;
    workOrderDate?: unknown;
    [key: string]: unknown;
}
interface TenderRow {
    _id: string;
    workType?: unknown;
    contractorMobile?: unknown;
    noOfRoads?: unknown;
    [key: string]: unknown;
}
type MongoFilter = Record<string, unknown>;
const toIdStr = (id: unknown): string => String(id);

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function TendersListPage({ searchParams }: Props) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const params = await searchParams;

    // Fetch agencies, years, sub-divisions, work types, approved works, and building types for inference
    const [rawAgencies, years, rawSubDivisions, rawWorkTypesAw, rawWorkTypesPkg, allApprovedWorks, rawBuildingTypesAw, rawBuildingTypesPkg] = await Promise.all([
        Agency.find({}).select('name mobileNo').sort({ name: 1 }).lean(),
        Tender.distinct('tenderNoticeYear') as Promise<string[]>,
        Package.distinct('subDivision') as Promise<string[]>,
        ApprovedWork.distinct('workType') as Promise<string[]>,
        Package.distinct('workType') as Promise<string[]>,
        ApprovedWork.find({}).select('workName workType buildingType').lean(),
        ApprovedWork.distinct('buildingType') as Promise<string[]>,
        Package.distinct('buildingType') as Promise<string[]>
    ]);
    const agencies = rawAgencies.map((a) => ({
        ...a,
        _id: a._id.toString()
    }));
    const agencyMobileMap = new Map(rawAgencies.map((a) => [a.name, a.mobileNo]));
    const subDivisions = rawSubDivisions.filter(Boolean).sort();
    const PREDEFINED_WORK_TYPES = ['Road', 'Building', 'Structure', 'Other'];
    const workTypes = Array.from(new Set([...PREDEFINED_WORK_TYPES, ...rawWorkTypesAw, ...rawWorkTypesPkg]))
        .filter(Boolean)
        .sort();
    const buildingTypes = Array.from(new Set([...rawBuildingTypesAw, ...rawBuildingTypesPkg]))
        .filter(Boolean)
        .sort() as string[];

    const normalize = (s: string | null | undefined) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const workTypeMap = new Map<string, string>();
    allApprovedWorks.forEach((aw) => {
        if (aw.workName) {
            workTypeMap.set(normalize(aw.workName), aw.workType || '');
        }
    });
    
    const query: MongoFilter = {};
    const filterLabels: string[] = [];

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
        query._id = { ...((query._id ?? {}) as Record<string, unknown>), $nin: approvalsWithProposal.map(toIdStr) };
        query.cancelled = { $ne: true };
        // Exclude tenders that do not require approval (tender amount < 5,000,000)
        query.$and = [
            ...(Array.isArray(query.$and) ? (query.$and as MongoFilter[]) : []),
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
            ...tendersWithProposalDate.map(toIdStr),
            ...approvalsWithProposal.map(toIdStr)
        ]));
        const approvalsWithApproval = await Approval.find({
            $or: [
                { tenderApprovalDate: { $ne: null } },
                { notRequired: true }
            ]
        }).distinct('tenderId');
        query.tenderApprovalDate = null;
        query._id = { 
            ...((query._id ?? {}) as Record<string, unknown>), 
            $in: allTendersWithProposal, 
            $nin: approvalsWithApproval.map(toIdStr) 
        };
        query.cancelled = { $ne: true };
        // Exclude tenders that do not require approval (tender amount < 5,000,000)
        query.$and = [
            ...(Array.isArray(query.$and) ? (query.$and as MongoFilter[]) : []),
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
            ...tendersWithApprovalDate.map(toIdStr),
            ...approvalsWithApproval.map(toIdStr),
            ...lowPriceTenders.map(toIdStr)
        ]));
        const tendersWithLoaDocs = await LOA.find().distinct('tenderId');
        const tendersWithLoaDate = await Tender.find({ acceptanceLetterDate: { $ne: null } }).distinct('_id');
        const tendersWithLoaAll = Array.from(new Set([
            ...tendersWithLoaDocs.map(toIdStr),
            ...tendersWithLoaDate.map(toIdStr)
        ]));
        query._id = { 
            ...((query._id ?? {}) as Record<string, unknown>), 
            $in: tendersApproved, 
            $nin: tendersWithLoaAll 
        };
        query.cancelled = { $ne: true };
        filterLabels.push("Pending LOA");
    } else if (params.filter === 'pending_work_order') {
        const tendersWithLoaDocs = await LOA.find().distinct('tenderId');
        const tendersWithLoaDate = await Tender.find({ acceptanceLetterDate: { $ne: null } }).distinct('_id');
        const tendersWithLoaAll = Array.from(new Set([
            ...tendersWithLoaDocs.map(toIdStr),
            ...tendersWithLoaDate.map(toIdStr)
        ]));
        const loaWithWorkOrder = await WorkOrder.find().distinct('loaId');
        const tendersWithWorkOrderDocs = await LOA.find({ _id: { $in: loaWithWorkOrder } }).distinct('tenderId');
        const tendersWithWorkOrderDate = await Tender.find({ workOrderDate: { $ne: null } }).distinct('_id');
        const tendersWithWorkOrderAll = Array.from(new Set([
            ...tendersWithWorkOrderDocs.map(toIdStr),
            ...tendersWithWorkOrderDate.map(toIdStr)
        ]));
        query._id = { 
            ...((query._id ?? {}) as Record<string, unknown>), 
            $in: tendersWithLoaAll, 
            $nin: tendersWithWorkOrderAll 
        };
        query.cancelled = { $ne: true };
        filterLabels.push("Pending Work Order");
    }

    // ── Date sub-filter (From/To) under the status tabs ────────────────────
    // Pending rows are defined by a *missing* stage date, so the range applies
    // to each tab's anchor date. Proposal/Approval/LOA dates may live on the
    // Tender doc OR the related Approval/LOA doc, so those tabs match either.
    const DATE_ANCHOR_FIELD =
        params.filter === 'pending_proposal' ? 'tenderOpeningDate'
        : params.filter === 'pending_approval' ? 'proposalDate'
        : params.filter === 'pending_loa' ? 'tenderApprovalDate'
        : params.filter === 'pending_work_order' ? 'acceptanceLetterDate'
        : 'tenderCreationDate';
    const DATE_ANCHOR_LABEL =
        params.filter === 'pending_proposal' ? 'Opening Date'
        : params.filter === 'pending_approval' ? 'Proposal Date'
        : params.filter === 'pending_loa' ? 'Approval Date'
        : params.filter === 'pending_work_order' ? 'LOA Date'
        : 'Creation Date';

    const isValidBound = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
    let fromBoundStr = isValidBound(params.fromDate) ? params.fromDate as string : '';
    let toBoundStr = isValidBound(params.toDate) ? params.toDate as string : '';
    // YYYY-MM-DD strings compare chronologically — swap a reversed range
    if (fromBoundStr && toBoundStr && fromBoundStr > toBoundStr) {
        [fromBoundStr, toBoundStr] = [toBoundStr, fromBoundStr];
    }
    const toDisplayDate = (s: string) => {
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y}`;
    };

    const dateRange: { $gte?: Date; $lte?: Date } = {};
    if (fromBoundStr) {
        const [y, m, d] = fromBoundStr.split('-').map(Number);
        dateRange.$gte = new Date(y, m - 1, d);
    }
    if (toBoundStr) {
        const [y, m, d] = toBoundStr.split('-').map(Number);
        dateRange.$lte = new Date(y, m - 1, d, 23, 59, 59, 999);
    }

    if (Object.keys(dateRange).length > 0) {
        if (params.filter === 'pending_approval') {
            const [tIds, aIds] = await Promise.all([
                Tender.find({ proposalDate: dateRange }).distinct('_id'),
                Approval.find({ proposalDate: dateRange }).distinct('tenderId'),
            ]);
            const dateIdSet = new Set([...tIds, ...aIds].map(toIdStr));
            const queryIdFilter = query._id as { $in?: unknown } | undefined;
            const curIn = Array.isArray(queryIdFilter?.$in)
                ? ((queryIdFilter.$in as unknown[]).map(toIdStr))
                : null;
            const intersected = curIn ? curIn.filter((id) => dateIdSet.has(id)) : [...dateIdSet];
            query._id = { ...((query._id ?? {}) as Record<string, unknown>), $in: intersected };
        } else if (params.filter === 'pending_loa') {
            const [tIds, aIds] = await Promise.all([
                Tender.find({ tenderApprovalDate: dateRange }).distinct('_id'),
                Approval.find({ tenderApprovalDate: dateRange }).distinct('tenderId'),
            ]);
            const dateIdSet = new Set([...tIds, ...aIds].map(toIdStr));
            const queryIdFilter = query._id as { $in?: unknown } | undefined;
            const curIn = Array.isArray(queryIdFilter?.$in)
                ? ((queryIdFilter.$in as unknown[]).map(toIdStr))
                : null;
            const intersected = curIn ? curIn.filter((id) => dateIdSet.has(id)) : [...dateIdSet];
            query._id = { ...((query._id ?? {}) as Record<string, unknown>), $in: intersected };
        } else if (params.filter === 'pending_work_order') {
            const [tIds, loaTenderIds] = await Promise.all([
                Tender.find({ acceptanceLetterDate: dateRange }).distinct('_id'),
                LOA.find({ acceptanceLetterDate: dateRange }).distinct('tenderId'),
            ]);
            const dateIdSet = new Set([...tIds, ...loaTenderIds].map(toIdStr));
            const queryIdFilter = query._id as { $in?: unknown } | undefined;
            const curIn = Array.isArray(queryIdFilter?.$in)
                ? ((queryIdFilter.$in as unknown[]).map(toIdStr))
                : null;
            const intersected = curIn ? curIn.filter((id) => dateIdSet.has(id)) : [...dateIdSet];
            query._id = { ...((query._id ?? {}) as Record<string, unknown>), $in: intersected };
        } else {
            query[DATE_ANCHOR_FIELD] = dateRange;
        }
        filterLabels.push(
            `${DATE_ANCHOR_LABEL}: ${fromBoundStr ? toDisplayDate(fromBoundStr) : '…'} to ${toBoundStr ? toDisplayDate(toBoundStr) : '…'}`
        );
    }

    if (params.search) {
        query.$or = [
            { tenderId: { $regex: params.search, $options: 'i' } },
            { packageName: { $regex: params.search, $options: 'i' } },
            { contractorName: { $regex: params.search, $options: 'i' } }
        ];
    }

    const packageFilters: MongoFilter[] = [];

    if (isAuditor && auditorSubDivision) {
        const worksInAuditorSubDiv = await ApprovedWork.find({ subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } }).select('workName').lean();
        const workNames = worksInAuditorSubDiv.map((aw) => aw.workName).filter(Boolean);
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
        const workNames = worksInSubDiv.map((aw) => aw.workName).filter(Boolean);
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
            const workNames = worksInWorkType.map((aw) => aw.workName).filter(Boolean);
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
            const workNames = worksInBuildingType.map((aw) => aw.workName).filter(Boolean);
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
        const matchingPkgIdStrs = matchingPackages.map(toIdStr);
        const pkgFilter = query.packageId as { $in?: unknown } | undefined;
        if (query.packageId && Array.isArray(pkgFilter?.$in)) {
            const existingSet = new Set(((pkgFilter.$in as unknown[]).map(toIdStr)));
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
    const sortObj: Record<string, 1 | -1> = {};
    if (params.sort && params.order && params.sort !== 'workType' && params.sort !== 'contractorMobile' && params.sort !== 'noOfRoads') {
        const orderVal = params.order === 'asc' ? 1 : -1;
        const dbSortField = params.sort === 'tenderSrNo' ? 'srNo' : params.sort;
        sortObj[dbSortField] = orderVal;
        if (dbSortField !== 'tenderNoticeYear') sortObj.tenderNoticeYear = -1;
        if (dbSortField !== 'noticeNo') sortObj.noticeNo = 1;
        if (dbSortField !== 'srNo') sortObj.srNo = 1;
    } else {
        sortObj.tenderNoticeYear = -1;
        sortObj.noticeNo = 1;
        sortObj.srNo = 1;
    }

    const totalItems = await Tender.countDocuments(query as unknown as Parameters<typeof Tender.countDocuments>[0]);
    const totalPages = Math.ceil(totalItems / limit);

    const tendersRaw = await Tender.find(query as unknown as Parameters<typeof Tender.find>[0])
        .populate({ path: 'packageId', select: 'works.workName workType', model: Package })
        .collation({ locale: "en_US", numericOrdering: true })
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

    const tenderIds = tendersRaw.map((t) => t._id.toString());

    const [approvals, loas] = await Promise.all([
        Approval.find({ tenderId: { $in: tenderIds } } as unknown as Parameters<typeof Approval.find>[0]).select('tenderId notRequired proposalDate tenderApprovalDate').lean(),
        LOA.find({ tenderId: { $in: tenderIds } }).select('_id tenderId acceptanceLetterDate').lean()
    ]);

    const loaIds = loas.map((l) => l._id.toString());
    const workOrders = await WorkOrder.find({ loaId: { $in: loaIds } }).select('loaId workOrderDate').lean();

    const approvalMap = new Map(approvals.map((a) => [a.tenderId?.toString(), a]));
    const loaMap = new Map(loas.map((l) => [l.tenderId?.toString(), l]));
    const workOrderMap = new Map(workOrders.map((wo) => [wo.loaId?.toString(), wo]));

    const tenders: TenderRow[] = tendersRaw.map((t) => {
        const tIdStr = t._id.toString();
        const approval = approvalMap.get(tIdStr);
        const loa = loaMap.get(tIdStr);
        const workOrder = loa ? workOrderMap.get(loa._id.toString()) : null;

        const pkg = (t.packageId ?? null) as unknown as PkgRef | null;
        const noOfRoads = pkg?.works && Array.isArray(pkg.works) && pkg.works.length > 0 ? pkg.works.length : 1;
        const firstWorkName = pkg?.works && pkg.works[0]?.workName;
        const normalizedKey = firstWorkName ? normalize(firstWorkName) : '';
        const inferredWorkType = normalizedKey ? workTypeMap.get(normalizedKey) : '';
        const workType = pkg?.workType || inferredWorkType || '-';
        const contractorMobile = (t.contractorName && agencyMobileMap.get(t.contractorName)) || (t as unknown as { contractorMobile?: string }).contractorMobile || '-';

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
            // Bidders cross the server→client boundary into ViewBiddersModalButton:
            // strip Mongoose ObjectIds (rejected by RSC serialization) down to
            // plain JSON with only the fields the modal renders.
            bidders: (t.bidders || []).map((b) => ({
                rank: b.rank ?? '',
                contractorName: b.contractorName ?? '',
                aboveBelow: b.aboveBelow ?? '',
                percentage: b.percentage ?? null,
                totalAmount: b.totalAmount ?? null,
            })),
        };
    });

    if (params.sort === 'workType' && params.order) {
        const orderVal = params.order === 'asc' ? 1 : -1;
        tenders.sort((a: TenderRow, b: TenderRow) => {
            const valA = (a.workType || '').toString();
            const valB = (b.workType || '').toString();
            return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * orderVal;
        });
    } else if (params.sort === 'contractorMobile' && params.order) {
        const orderVal = params.order === 'asc' ? 1 : -1;
        tenders.sort((a: TenderRow, b: TenderRow) => {
            const valA = (a.contractorMobile || '').toString();
            const valB = (b.contractorMobile || '').toString();
            return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * orderVal;
        });
    } else if (params.sort === 'noOfRoads' && params.order) {
        const orderVal = params.order === 'asc' ? 1 : -1;
        tenders.sort((a: TenderRow, b: TenderRow) => {
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
            footer: (rows: TenderRow[]) => {
                const total = rows.reduce((sum: number, r: TenderRow) => sum + (typeof r.noOfRoads === 'number' ? r.noOfRoads : 1), 0);
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

    // Keep the date sub-filter when switching status tabs
    const tabHref = (filterValue: string | null) => {
        const sp = new URLSearchParams();
        if (filterValue) sp.set('filter', filterValue);
        if (fromBoundStr) sp.set('fromDate', fromBoundStr);
        if (toBoundStr) sp.set('toDate', toBoundStr);
        const s = sp.toString();
        return s ? `/tenders?${s}` : '/tenders';
    };

    return (
        <ListPageLayout
            title="Tenders"
            subtitle={filterLabel}
            addHref="/tenders/new"
            addLabel="Add New Tender"
            searchPlaceholder="Search by Tender ID, Package, or Contractor..."
            filterActive={!!params.filter || !!params.search || !!params.noticeYear || !!params.noticeNo || !!params.contractorName || !!params.trialNo || !!params.subDivision || !!params.workType || !!params.buildingType || !!fromBoundStr || !!toBoundStr}
            clearFiltersHref="/tenders"
        >
            <TendersFilterBar agencies={agencies} years={years} subDivisions={subDivisions} workTypes={workTypes} buildingTypes={buildingTypes} />
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Link
                    href={tabHref(null)}
                    className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        !params.filter
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    All Tenders
                </Link>
                <Link
                    href={tabHref('pending_proposal')}
                    className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        params.filter === 'pending_proposal'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    Pending Proposal
                </Link>
                <Link
                    href={tabHref('pending_approval')}
                    className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        params.filter === 'pending_approval'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    Pending Approval
                </Link>
                <Link
                    href={tabHref('pending_loa')}
                    className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        params.filter === 'pending_loa'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    Pending LOA
                </Link>
                <Link
                    href={tabHref('pending_work_order')}
                    className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        params.filter === 'pending_work_order'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    Pending Work Order
                </Link>
            </div>
            <div className="mb-6">
                <TenderDateSubFilter />
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
