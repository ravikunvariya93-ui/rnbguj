import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Package from '@/models/Package';
import ApprovedWork from '@/models/ApprovedWork';
import DataTable from '@/components/DataTable';
import Badge, { toneForTenderStatus } from '@/components/ui/Badge';
import SearchBar from '@/components/SearchBar';
import { Search } from 'lucide-react';
import { formatShortDate } from '@/lib/dateUtils';
import type { Column } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{
        page?: string;
        limit?: string;
        search?: string;
    }>;
}

type LeanId = { toString(): string };
interface PkgWorkEntry {
    workName?: string;
    amount?: number | string;
    [key: string]: unknown;
}
interface PkgDoc {
    _id: LeanId;
    packageName?: string;
    works?: PkgWorkEntry[];
    [key: string]: unknown;
}
interface TenderDoc {
    _id: LeanId;
    packageId?: LeanId | string | null;
    estimatedAmount?: number;
    contractPrice?: number;
    proposalDate?: unknown;
    tenderApprovalDate?: unknown;
    [key: string]: unknown;
}
interface ApprovalDoc {
    tenderId?: LeanId | string | null;
    proposalDate?: unknown;
    tenderApprovalDate?: unknown;
    notRequired?: boolean;
    [key: string]: unknown;
}
interface LoaDoc {
    _id: LeanId;
    tenderId?: LeanId | string | null;
    acceptanceLetterDate?: unknown;
    [key: string]: unknown;
}
interface WorkOrderDoc {
    _id?: LeanId;
    loaId?: LeanId | string | null;
    workOrderDate?: unknown;
    [key: string]: unknown;
}
interface MasterRow {
    _id: string;
    [key: string]: unknown;
}
interface SearchTenderDoc {
    _id: LeanId;
    packageId?: LeanId | string | null;
    estimatedAmount?: number;
    contractPrice?: number;
    proposalDate?: unknown;
    tenderApprovalDate?: unknown;
    acceptanceLetterDate?: unknown;
    workOrderDate?: unknown;
    [key: string]: unknown;
}
interface SearchApprovedWorkDoc {
    _id: LeanId;
    workName?: string;
    [key: string]: unknown;
}
export default async function Home({ searchParams }: Props) {
    await dbConnect();

    const params = await searchParams;

    const searchQuery = params.search?.trim();

    // Packages are needed for search-result mapping.
    const needPackages = Boolean(searchQuery);

    const [
        allPackages
    ] = await Promise.all([
        needPackages ? Package.find({}).select('_id packageName works.workName').lean() : Promise.resolve([])
    ]);

    // Normalize strings for fuzzy matching
    const normalizeString = (str: string | null | undefined) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const searchApprovedWorksColumns: Column[] = [
        { 
            key: 'srNo', 
            label: 'Sr. No.', 
            render: (row, idx) => idx + 1, 
            align: 'center',
            width: '5%'
        },
        { 
            key: 'workName', 
            label: 'Name of Work', 
            width: '26%',
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-800 break-words leading-tight">{row.workName}</span>
                </div>
            )
        },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            width: '18%',
            render: (row) => row.packageId ? (
                <Link href={`/packages/${row.packageId}`} className="text-emerald-600 hover:underline font-semibold break-words">
                    {row.packageName}
                </Link>
            ) : (
                <span className="text-slate-400 italic">Unpackaged</span>
            )
        },
        { key: 'jobNumberAmount', label: 'Amount (Lakh)', align: 'center', width: '10%', render: (row) => row.jobNumberAmount || '-' },
        { key: 'approvalYear', label: 'Approval Year', align: 'center', width: '12%' },
        { key: 'workType', label: 'Work Type', width: '12%' },
        { key: 'estimateConsultant', label: 'Estimate Consultant', width: '17%' }
    ];

    // 4. Search Results Report (If search query exists)
    let searchResultsData: MasterRow[] = [];
    let searchApprovedWorksData: MasterRow[] = [];
    if (searchQuery) {
        // Find packages whose packageName matches OR which contain a work matching the search query
        const searchPackages = (allPackages as unknown as PkgDoc[]).filter((pkg: PkgDoc) => {
            const pkgNameMatch = pkg.packageName?.toLowerCase().includes(searchQuery.toLowerCase());
            const workNameMatch = pkg.works?.some((w: PkgWorkEntry) => w.workName?.toLowerCase().includes(searchQuery.toLowerCase()));
            return pkgNameMatch || workNameMatch;
        });
        const searchPackageIds = (searchPackages as unknown as PkgDoc[]).map((pkg: PkgDoc) => pkg._id);

        // Tender branch + approved-works branch run concurrently (were sequential).
        const [searchTendersRaw, matchedApprovedWorksRaw] = await Promise.all([
            Tender.find({
                $or: [
                    { packageName: { $regex: searchQuery, $options: 'i' } },
                    { packageId: { $in: searchPackageIds } }
                ]
            } as unknown as Parameters<typeof Tender.find>[0])
            .select('_id tenderNoticeYear noticeNo srNo packageName packageId contractorName proposalDate tenderApprovalDate acceptanceLetterDate workOrderDate cancelled cancellationReason')
            .sort({ tenderNoticeYear: -1, noticeNo: 1, srNo: 1 })
            .lean(),
            ApprovedWork.find({
                $or: [
                    { workName: { $regex: searchQuery, $options: 'i' } }
                ]
            })
            .select('_id workName circle district subDivision taluka approvalYear jobNumberAmount workType estimateConsultant remarks')
            .limit(100)
            .lean(),
        ]);

        const searchTenderIds = (searchTendersRaw as unknown as SearchTenderDoc[]).map((t: SearchTenderDoc) => t._id);

        // Fetch related records for matched search tenders
        const [searchApprovals, searchLOAs] = await Promise.all([
            Approval.find({ tenderId: { $in: searchTenderIds } } as unknown as Parameters<typeof Approval.find>[0]).select('tenderId notRequired proposalDate tenderApprovalDate').lean() as unknown as ApprovalDoc[],
            LOA.find({ tenderId: { $in: searchTenderIds } }).select('_id tenderId acceptanceLetterDate').lean() as unknown as LoaDoc[]
        ]);

        const searchLoaIds = searchLOAs.map((l: LoaDoc) => l._id);
        const searchWorkOrders = await WorkOrder.find({ loaId: { $in: searchLoaIds } } as unknown as Parameters<typeof WorkOrder.find>[0]).select('loaId workOrderDate').lean() as unknown as WorkOrderDoc[];

        const searchApprovalMap = new Map(searchApprovals.map((a: ApprovalDoc) => [String(a.tenderId), a]));
        const searchLoaMap = new Map(searchLOAs.map((l: LoaDoc) => [String(l.tenderId), l]));
        const searchWorkOrderMap = new Map(searchWorkOrders.map((wo: WorkOrderDoc) => [String(wo.loaId), wo]));
        const searchPackageMap = new Map((allPackages as unknown as PkgDoc[]).map((p: PkgDoc) => [p._id.toString(), p]));

        searchResultsData = (searchTendersRaw as unknown as (SearchTenderDoc & Record<string, unknown>)[]).map((tender: SearchTenderDoc & Record<string, unknown>) => {
            const tIdStr = tender._id.toString();
            const approval = searchApprovalMap.get(tIdStr);
            const loa = searchLoaMap.get(tIdStr);
            const workOrder = loa ? searchWorkOrderMap.get(loa._id.toString()) : null;

            const isApprovalNotRequired = approval?.notRequired === true || (
                (tender.estimatedAmount !== undefined && tender.estimatedAmount !== null)
                    ? Number(tender.estimatedAmount) < 5000000
                    : (tender.contractPrice !== undefined && Number(tender.contractPrice) < 5000000)
            );
            const proposalDate = isApprovalNotRequired ? 'Not Required' : (tender.proposalDate || approval?.proposalDate || null);
            const tenderApprovalDate = isApprovalNotRequired ? 'Not Required' : (tender.tenderApprovalDate || approval?.tenderApprovalDate || null);
            const acceptanceLetterDate = tender.acceptanceLetterDate || loa?.acceptanceLetterDate || null;
            const workOrderDate = tender.workOrderDate || workOrder?.workOrderDate || null;

            const pkg = tender.packageId ? searchPackageMap.get(String(tender.packageId)) : null;
            const approvedWorks = pkg && pkg.works && pkg.works.length > 0 
                ? pkg.works.map((w: PkgWorkEntry) => w.workName).filter(Boolean)
                : [];

            // Compute lifecycle status
            let status = 'Tendered';
            if (tender.cancelled) {
                status = 'Cancelled';
            } else if (workOrderDate) {
                status = 'Work Order Issued';
            } else if (acceptanceLetterDate) {
                status = 'LOA Issued';
            } else if (isApprovalNotRequired) {
                status = 'Approved (No Sanction Req.)';
            } else if (tenderApprovalDate) {
                status = 'Tender Approved';
            } else if (proposalDate) {
                status = 'Proposal Submitted';
            }

            return {
                _id: tIdStr,
                tenderNoticeYear: tender.tenderNoticeYear || '-',
                noticeNo: tender.noticeNo || '-',
                srNo: tender.srNo || '-',
                packageName: tender.packageName || 'Unspecified Package',
                approvedWorks,
                packageId: tender.packageId ? String(tender.packageId) : null,
                contractorName: tender.contractorName || '-',
                proposalDate,
                tenderApprovalDate,
                acceptanceLetterDate,
                workOrderDate,
                cancelled: tender.cancelled || false,
                cancellationReason: tender.cancellationReason || '',
                status,
            };
        });

        // Search Approved Works directly (already fetched above in parallel)
        const workNameToPkgInfo = new Map<string, { _id: string, packageName: string }>();
        (allPackages as unknown as PkgDoc[]).forEach((pkg: PkgDoc) => {
            if (pkg.works) {
                pkg.works.forEach((pw: PkgWorkEntry) => {
                    if (pw.workName) {
                        workNameToPkgInfo.set(normalizeString(pw.workName), {
                            _id: pkg._id.toString(),
                            packageName: pkg.packageName as string
                        });
                    }
                });
            }
        });

        searchApprovedWorksData = (matchedApprovedWorksRaw as unknown as (SearchApprovedWorkDoc & Record<string, unknown>)[]).map((w: SearchApprovedWorkDoc & Record<string, unknown>) => {
            const pkgInfo = workNameToPkgInfo.get(normalizeString(w.workName));
            return {
                ...w,
                _id: w._id.toString(),
                packageName: pkgInfo ? pkgInfo.packageName : null,
                packageId: pkgInfo ? pkgInfo._id : null
            };
        });
    }

    const searchColumns: Column[] = [
        { key: 'tenderNoticeYear', label: 'Notice Year', width: '7%' },
        { key: 'noticeNo', label: 'Notice No.', width: '7%' },
        { key: 'srNo', label: 'Sr No.', align: 'center', width: '4%' },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            width: '16%', 
            render: (row) => (
                <div className="flex flex-col gap-1">
                    {row.packageId ? (
                        <Link href={`/packages/${row.packageId}`} className="text-emerald-600 hover:underline font-semibold break-words">
                            {row.packageName}
                        </Link>
                    ) : (
                        <span className="break-words font-medium text-slate-700">{row.packageName}</span>
                    )}
                </div>
            ) 
        },
        { 
            key: 'approvedWorks', 
            label: 'Approved Works', 
            width: '20%',
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
        { key: 'contractorName', label: 'Contractor Name', width: '11%' },
        { 
            key: 'proposalDate', 
            label: 'Proposal Date', 
            width: '7%',
            render: (row) => row.proposalDate === 'Not Required' ? (
                <span className="text-slate-500 italic font-semibold">Not Required</span>
            ) : <span className="text-slate-600">{formatShortDate(row.proposalDate)}</span> 
        },
        { 
            key: 'tenderApprovalDate', 
            label: 'Approval Date', 
            width: '7%',
            render: (row) => row.tenderApprovalDate === 'Not Required' ? (
                <span className="text-slate-500 italic font-semibold">Not Required</span>
            ) : <span className="text-slate-600">{formatShortDate(row.tenderApprovalDate)}</span> 
        },
        { 
            key: 'acceptanceLetterDate', 
            label: 'Acceptance Date', 
            width: '7%',
            render: (row) => <span className="text-slate-600">{formatShortDate(row.acceptanceLetterDate)}</span> 
        },
        { 
            key: 'workOrderDate', 
            label: 'Work Order Date', 
            width: '7%',
            render: (row) => <span className="text-slate-600">{formatShortDate(row.workOrderDate)}</span> 
        },
        {
            key: 'status',
            label: 'Status',
            width: '7%',
            render: (row) => <Badge tone={toneForTenderStatus(row.status)}>{row.status}</Badge>,
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-8 space-y-12">
            <div className="max-w-[100%] mx-auto space-y-12">
                {/* Advanced Search */}
                <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-600 p-2 rounded-xl shadow-sm">
                            <Search className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Search Works & Tenders</h2>
                            <p className="text-xs text-slate-500 font-medium">Find any approved work, package, or tender across the division</p>
                        </div>
                    </div>
                    <div className="w-full">
                        <Suspense fallback={<div className="h-10 bg-slate-200 animate-pulse rounded-md" />}>
                            <SearchBar placeholder="Type a work name or package name…" />
                        </Suspense>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                        Case-insensitive partial match — results appear below in Tenders & Packages and Approved Works tables. Clear the box to hide results.
                    </p>
                </div>

                {/* Search Results Section */}
                {searchQuery && (
                    <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-6">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Search Results</h2>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">Matching results for &quot;{searchQuery}&quot;</p>
                        </div>

                        {/* Matching Tenders & Packages Table */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Matching Tenders & Packages</h3>
                            <DataTable 
                                columns={searchColumns} 
                                data={searchResultsData} 
                                emptyMessage="No matching tenders or packages found."
                                exportFilename="Tenders_Search_Results.xlsx"
                                fixedLayout
                            />
                        </div>

                        {/* Matching Approved Works Table */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Matching Approved Works</h3>
                            <DataTable 
                                columns={searchApprovedWorksColumns} 
                                data={searchApprovedWorksData} 
                                emptyMessage="No matching approved works found."
                                exportFilename="Approved_Works_Search_Results.xlsx"
                                fixedLayout
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
