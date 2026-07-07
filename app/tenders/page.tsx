import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import Approval from '@/models/Approval';
import Package from '@/models/Package';
import WorkOrder from '@/models/WorkOrder';
import Agency from '@/models/Agency';
import Link from 'next/link';
import { Plus, Eye, Edit2 } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import TendersFilterBar from '@/components/TendersFilterBar';
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

    // Fetch agencies, years, and sub-divisions for filters
    const [rawAgencies, years, rawSubDivisions] = await Promise.all([
        Agency.find({}).select('name').sort({ name: 1 }).lean() as Promise<any[]>,
        Tender.distinct('tenderNoticeYear') as Promise<string[]>,
        Package.distinct('subDivision') as Promise<string[]>
    ]);
    const agencies = rawAgencies.map((a: any) => ({
        ...a,
        _id: a._id.toString()
    }));
    const subDivisions = rawSubDivisions.filter(Boolean).sort();
    
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

    if (params.subDivision) {
        filterLabels.push(`Sub Division: ${params.subDivision}`);
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
    if (params.sort && params.order) {
        const orderVal = params.order === 'asc' ? 1 : -1;
        sortObj[params.sort] = orderVal;
        if (params.sort !== 'tenderNoticeYear') sortObj.tenderNoticeYear = -1;
        if (params.sort !== 'noticeNo') sortObj.noticeNo = 1;
        if (params.sort !== 'srNo') sortObj.srNo = 1;
    } else {
        sortObj = { tenderNoticeYear: -1, noticeNo: 1, srNo: 1 };
    }

    const totalItems = await Tender.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const tendersRaw = await Tender.find(query)
        .populate({ path: 'packageId', select: 'works.workName', model: Package })
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
            proposalDate,
            tenderApprovalDate,
            acceptanceLetterDate,
            workOrderDate,
        };
    });

    const columns: Column[] = [
        { key: 'tenderNoticeYear', label: 'Notice Year', sortable: true },
        { key: 'noticeNo', label: 'Notice No.', sortable: true },
        { key: 'srNo', label: 'Sr. No.', align: 'center' },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            sortable: true, 
            minWidth: '200px', 
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
        { key: 'contractorName', label: 'Contractor Name', sortable: true, minWidth: '150px' },
        { key: 'trialNo', label: 'Trial', sortable: true, align: 'center' },
        {
            key: 'proposalDate',
            label: 'Propasal Date',
            render: (row) => row.proposalDate === 'Not Required' ? (
                <span className="text-slate-500 italic font-semibold">Not Required</span>
            ) : <span className="text-slate-600">{formatShortDate(row.proposalDate)}</span>
        },
        {
            key: 'tenderApprovalDate',
            label: 'Approval Date',
            render: (row) => row.tenderApprovalDate === 'Not Required' ? (
                <span className="text-slate-500 italic font-semibold">Not Required</span>
            ) : <span className="text-slate-600">{formatShortDate(row.tenderApprovalDate)}</span>
        },
        {
            key: 'acceptanceLetterDate',
            label: 'LOA Date',
            render: (row) => <span className="text-slate-600">{formatShortDate(row.acceptanceLetterDate)}</span>
        },
        {
            key: 'workOrderDate',
            label: 'Work Order Date',
            render: (row) => <span className="text-slate-600">{formatShortDate(row.workOrderDate)}</span>
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-2">
            <Link href={`/tenders/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/tenders/new?packageId=${row.packageId?._id || row.packageId}&reInvite=true`} className="text-green-600 hover:text-green-900 p-1" title="Re-tender this package">
                <Plus className="w-5 h-5" />
            </Link>
            <Link href={`/tenders/${row._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Tender">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton itemId={row._id} itemName={row.tenderId} apiPath="/api/tenders" />
        </div>
    );

    const filterLabel = filterLabels.length > 0 ? `Filtered by: ${filterLabels.join(' | ')}` : "List of all tenders.";

    return (
        <ListPageLayout
            title="Tenders"
            subtitle={filterLabel}
            addHref="/tenders/new"
            addLabel="Add New Tender"
            searchPlaceholder="Search by Tender ID, Package, or Contractor..."
            filterActive={!!params.filter || !!params.search || !!params.noticeYear || !!params.noticeNo || !!params.contractorName || !!params.trialNo || !!params.subDivision}
            clearFiltersHref="/tenders"
        >
            <TendersFilterBar agencies={agencies} years={years} subDivisions={subDivisions} />
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
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
