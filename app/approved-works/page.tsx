import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import TechnicalSanction from '@/models/TechnicalSanction';
import Package from '@/models/Package';
import DTP from '@/models/DTP';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Link from 'next/link';
import { Plus, Eye, Edit2 } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import { parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function ApprovedWorksListPage({ searchParams }: Props) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const params = await searchParams;
    const normalizeString = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    let query: any = {};
    let filterLabels: string[] = [];

    const allTS = await TechnicalSanction.find({}).select('workName').lean();
    const tsCountMap: Record<string, number> = {};
    allTS.forEach(ts => {
        const name = normalizeString(ts.workName as string);
        tsCountMap[name] = (tsCountMap[name] || 0) + 1;
    });

    // Align in-memory matching with Dashboard global calculations
    const allApprovedGlobal = await ApprovedWork.find({}).select('_id workName').lean();
    const globalPendingTSIds = new Set<string>();
    const tempTSCountMap = { ...tsCountMap };
    allApprovedGlobal.forEach(w => {
        const safeName = normalizeString(w.workName as string);
        if (tempTSCountMap[safeName] > 0) {
            tempTSCountMap[safeName]--;
        } else {
            globalPendingTSIds.add(w._id.toString());
        }
    });
    
    if (params.filter === 'pending') {
        filterLabels.push("Awaiting Technical Sanction (Pending TS)");
    } else if (params.filter === 'preparedTS') {
        filterLabels.push("Technical Sanction Prepared");
    } else if (params.filter === 'pendingPackage') {
        filterLabels.push("Pending Package");
    }

    if (['pendingDTP', 'preparedDTP', 'pendingTender', 'pendingProposal', 'pendingApproval', 'pendingLOA', 'pendingWorkOrder'].includes(params.filter || '')) {
        const filterNames: Record<string, string> = {
            pendingDTP: "Awaiting DTP Approval",
            preparedDTP: "DTP Approved",
            pendingTender: "Pending Tender",
            pendingProposal: "Pending Proposal",
            pendingApproval: "Pending Approval",
            pendingLOA: "Pending LOA",
            pendingWorkOrder: "Pending Work Order"
        };
        if (params.filter) {
            filterLabels.push(filterNames[params.filter] || params.filter);
        }
    }

    // Standard Filters
    if (params.search) {
        query.workName = { $regex: params.search, $options: 'i' };
    }

    // Explicit cast for TS to avoid union type issues
    const typedParams = params as Record<string, string | undefined>;

    const filterFields: Record<string, { label: string, val: string | undefined }> = {
        subDivision: { label: 'Sub Division', val: typedParams.subDivision },
        estimateConsultant: { label: 'Consultant', val: typedParams.estimateConsultant },
        approvalYear: { label: 'Year', val: typedParams.approvalYear },
        roadCategory: { label: 'Road Category', val: typedParams.roadCategory },
        workType: { label: 'Work Type', val: typedParams.workType },
        schemeName: { label: 'Scheme', val: typedParams.schemeName },
        natureOfWork: { label: 'Nature', val: typedParams.natureOfWork },
        jobNumberApprovalDate: { label: 'Date', val: typedParams.jobNumberApprovalDate }
    };

    const emptyQuery = (field: string) => ({
        $or: [
            { [field]: { $exists: false } },
            { [field]: null },
            { [field]: '' }
        ]
    });

    const andConditions: any[] = [];

    Object.entries(filterFields).forEach(([field, config]) => {
        if (config.val) {
            if (config.val === 'Unspecified' || config.val === 'Unclassified') {
                andConditions.push(emptyQuery(field));
                filterLabels.push(`${config.label}: Unspecified`);
            } else if (field === 'jobNumberApprovalDate') {
                const [day, month, year] = config.val.split('/').map(Number);
                const startDate = new Date(year, month - 1, day);
                const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
                query[field] = { $gte: startDate, $lte: endDate };
                filterLabels.push(`${config.label}: ${config.val}`);
            } else if (field === 'workType') {
                if (config.val !== 'all') {
                    const types = config.val.split(',').filter(Boolean);
                    if (types.length > 1) {
                        query[field] = { $in: types };
                    } else if (types.length === 1) {
                        query[field] = types[0];
                    }
                    filterLabels.push(`${config.label}: ${config.val}`);
                }
            } else {
                query[field] = config.val;
                filterLabels.push(`${config.label}: ${config.val}`);
            }
        }
    });

    if (isAuditor && auditorSubDivision) {
        andConditions.push({ subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } });
        if (!typedParams.subDivision) {
            filterLabels.push(`Sub Division: ${auditorSubDivision}`);
        }
    }

    if (andConditions.length > 0) {
        query.$and = andConditions;
    }

    const filterLabel = filterLabels.length > 0 
        ? `Filtered by: ${filterLabels.join(' | ')}`
        : "A list of all approved works including budget details, approval dates, amounts, and classifications.";

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { createdAt: -1 });

    const allPackages = await Package.find({}).select('packageName works').lean();
    const workNameToPkgInfo = new Map<string, { _id: string, packageName: string }>();
    allPackages.forEach(pkg => {
        if (pkg.works) {
            pkg.works.forEach((w: any) => {
                if (w.workName) {
                    workNameToPkgInfo.set(normalizeString(w.workName), {
                        _id: pkg._id.toString(),
                        packageName: pkg.packageName
                    });
                }
            });
        }
    });

    let finalWorks: any[] = [];
    let totalItems = 0;

    if (params.filter && params.filter !== 'none') {
        const allDTPs = await DTP.find({}).select('tsId dtpApprovalDate tenderAmount').lean();
        const allTenders = await Tender.find({}).sort({ trialNo: 1 }).select('packageId proposalDate tenderApprovalDate').lean();
        const allApprovals = await Approval.find({}).select('tenderId proposalDate tenderApprovalDate notRequired').lean();
        const allLOAs = await LOA.find({}).select('tenderId').lean();
        const allWorkOrders = await WorkOrder.find({}).select('loaId').lean();

        const dtpPkgIds = new Set(allDTPs.map(d => d.tsId?.toString()));
        const approvedDtpPkgIds = new Set(allDTPs.filter(d => Boolean(d.dtpApprovalDate || (d.tenderAmount !== undefined && d.tenderAmount !== null))).map(d => d.tsId?.toString()));
        const tenderPkgIds = new Set(allTenders.map(t => t.packageId?.toString()));
        const approvalByTenderId = new Map<string, any>();
        allApprovals.forEach(a => {
            if (a.tenderId) {
                const tIdStr = a.tenderId.toString();
                const existing = approvalByTenderId.get(tIdStr);
                if (!existing || (!existing.tenderApprovalDate && a.tenderApprovalDate)) {
                    approvalByTenderId.set(tIdStr, a);
                }
            }
        });
        const loaTenderIds = new Set(allLOAs.map(l => l.tenderId?.toString()));
        const woLoaIds = new Set(allWorkOrders.map(wo => wo.loaId?.toString()));

        const workNameToPkgId = new Map<string, string>();
        allPackages.forEach(pkg => {
            if (pkg.works) {
                pkg.works.forEach((w: any) => {
                    if (w.workName) workNameToPkgId.set(normalizeString(w.workName), pkg._id.toString());
                });
            }
        });

        const tenderByPkgId = new Map(allTenders.map(t => [t.packageId?.toString(), t]));
        const loaByTenderId = new Map(allLOAs.map(l => [l.tenderId?.toString(), l]));

        const allPotentialWorks = await ApprovedWork.find(query).sort(sortObj).lean();
        const filtered = allPotentialWorks.filter(w => {
            const safeName = normalizeString(w.workName as string);
            const pkgId = workNameToPkgId.get(safeName);
            
            if (params.filter === 'pending') {
                return globalPendingTSIds.has(w._id.toString());
            }
            if (params.filter === 'preparedTS') {
                return !globalPendingTSIds.has(w._id.toString());
            }

            if (params.filter === 'pendingPackage') {
                const isPendingTS = globalPendingTSIds.has(w._id.toString());
                return !isPendingTS && !pkgId;
            }

            // DTP logic: DTP is pending if TS is prepared but DTP is not approved
            if (params.filter === 'pendingDTP') {
                const isPendingTS = globalPendingTSIds.has(w._id.toString());
                if (isPendingTS) return false;
                return !pkgId || !approvedDtpPkgIds.has(pkgId);
            }
            if (params.filter === 'preparedDTP') {
                const isPendingTS = globalPendingTSIds.has(w._id.toString());
                if (isPendingTS) return false;
                return pkgId && approvedDtpPkgIds.has(pkgId);
            }

            if (!pkgId) return false;
            
            const hasDTP = dtpPkgIds.has(pkgId);
            if (!hasDTP) return false;
            if (params.filter === 'pendingTender') return !tenderPkgIds.has(pkgId);

            const hasTender = tenderPkgIds.has(pkgId);
            if (!hasTender) return false;
            
            const tender = tenderByPkgId.get(pkgId);
            if (!tender) return false;
            const tId = tender._id.toString();
            const approval = approvalByTenderId.get(tId);
            const isApprovalNotRequired = approval?.notRequired === true || (
                (tender.estimatedAmount !== undefined && tender.estimatedAmount !== null)
                    ? Number(tender.estimatedAmount) < 5000000
                    : (tender.contractPrice !== undefined && Number(tender.contractPrice) < 5000000)
            );
            const hasProposalDate = isApprovalNotRequired || Boolean(tender.proposalDate) || Boolean(approval?.proposalDate);
            const hasApproval = isApprovalNotRequired || Boolean(tender.tenderApprovalDate) || Boolean(approval?.tenderApprovalDate);

            if (hasApproval) {
                if (params.filter === 'pendingProposal') return false;
                if (params.filter === 'pendingApproval') return false;

                const hasLOA = loaTenderIds.has(tId);
                if (params.filter === 'pendingLOA') return !hasLOA;
                if (!hasLOA) return false;

                if (params.filter === 'pendingWorkOrder') {
                    const loa = loaByTenderId.get(tId);
                    return loa ? !woLoaIds.has(loa._id.toString()) : false;
                }
            } else {
                if (params.filter === 'pendingProposal') return !hasProposalDate;
                if (!hasProposalDate) return false;

                if (params.filter === 'pendingApproval') return !hasApproval;
                return false;
            }

            return true;
        });

        totalItems = filtered.length;
        finalWorks = filtered.slice(skip, skip + limit);
    } else {
        totalItems = await ApprovedWork.countDocuments(query);
        finalWorks = await ApprovedWork.find(query)
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean();
    }

    const totalPages = Math.ceil(totalItems / limit);

    const serializedWorks = finalWorks.map((w: any) => {
        const pkgInfo = workNameToPkgInfo.get(normalizeString(w.workName));
        return {
            ...w,
            _id: w._id.toString(),
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
                <div className="line-clamp-3 max-w-lg whitespace-normal break-words" title={row.workName}>
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
            key: 'jobNumberAmount', 
            label: 'Job Number Amount (in Lakh)', 
            sortable: true,
            minWidth: '80px',
            align: 'center',
            render: (row) => row.jobNumberAmount || '-'
        },
        { 
            key: 'jobNumberApprovalDate', 
            label: 'Approval Date', 
            sortable: true,
            render: (row) => row.jobNumberApprovalDate ? new Date(row.jobNumberApprovalDate).toLocaleDateString('en-GB') : '-'
        },
        { 
            key: 'workType', 
            label: 'Work Type', 
            sortable: true,
            render: (row) => row.workType || '-'
        },
        { 
            key: 'estimateConsultant', 
            label: 'Estimate Consultant', 
            sortable: true,
            minWidth: '150px',
            render: (row) => row.estimateConsultant || '-'
        },
        { 
            key: 'remarks', 
            label: 'Remarks', 
            sortable: true,
            minWidth: '120px',
            render: (row) => (
                <div className="line-clamp-2 max-w-[150px] whitespace-normal break-words" title={row.remarks}>
                    {row.remarks || '-'}
                </div>
            )
        }
    ];

    const renderActions = (row: any) => (
        <div className="flex items-center justify-end space-x-3">
            <Link href={`/approved-works/${row._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                <Eye className="w-5 h-5" />
            </Link>
            <Link href={`/approved-works/${row._id}/edit`} className="text-emerald-600 hover:text-emerald-900 p-1" title="Edit Item">
                <Edit2 className="w-5 h-5" />
            </Link>
            <GenericDeleteButton 
                itemId={row._id} 
                itemName={row.workName} 
                apiPath="/api/approved-works" 
            />
        </div>
    );

    return (
        <ListPageLayout
            title="Approved Works"
            subtitle={filterLabel}
            addHref="/approved-works/new"
            addLabel="Add New Work"
            searchPlaceholder="Search by name of work..."
            filterActive={!!params.filter || !!params.search || Object.values(filterFields).some(f => f.val)}
            clearFiltersHref="/approved-works"
        >
            <DataTable 
                columns={columns} 
                data={serializedWorks} 
                emptyMessage="No works found matching the criteria."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
