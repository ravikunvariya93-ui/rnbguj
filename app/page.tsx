import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Package from '@/models/Package';
import ApprovedWork from '@/models/ApprovedWork';
import TechnicalSanction from '@/models/TechnicalSanction';
import DTP from '@/models/DTP';
import Pagination from '@/components/Pagination';
import DataTable from '@/components/DataTable';
import ExportTableButton from '@/components/ExportTableButton';
import WorkTypeFilter from '@/components/WorkTypeFilter';
import SearchBar from '@/components/SearchBar';
import { formatShortDate } from '@/lib/dateUtils';
import type { Column } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ 
        page?: string;
        limit?: string;
        workType?: string;
        search?: string;
        loadSummary?: string;
        loadPending?: string;
    }>;
}

export default async function Home({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;

    const getQueryString = (overrides: Record<string, string | null>) => {
        const newParams = new URLSearchParams();
        if (params.page) newParams.set('page', params.page);
        if (params.limit) newParams.set('limit', params.limit);
        if (params.workType) newParams.set('workType', params.workType);
        if (params.search) newParams.set('search', params.search);
        if (params.loadSummary === 'true') newParams.set('loadSummary', 'true');
        if (params.loadPending === 'true') newParams.set('loadPending', 'true');
        
        Object.entries(overrides).forEach(([key, val]) => {
            if (val === null) {
                newParams.delete(key);
            } else {
                newParams.set(key, val);
            }
        });
        const str = newParams.toString();
        return str ? `?${str}` : '?';
    };

    // Parse work types selection
    const rawWorkType = params.workType;
    let activeWorkTypes: string[] = ['Road', 'Structure']; // Default initial selection
    let shouldFilter = true;

    if (rawWorkType !== undefined) {
        if (rawWorkType === 'all') {
            shouldFilter = false;
            activeWorkTypes = [];
        } else if (rawWorkType === 'none' || rawWorkType === '') {
            shouldFilter = true;
            activeWorkTypes = [];
        } else {
            shouldFilter = true;
            activeWorkTypes = rawWorkType.split(',').filter(Boolean);
        }
    }

    const PREDEFINED_WORK_TYPES = ['Road', 'Building', 'Structure', 'Service'];
    const distinctWorkTypes: string[] = await ApprovedWork.distinct('workType');
    const workTypes = Array.from(new Set([...PREDEFINED_WORK_TYPES, ...distinctWorkTypes])).filter(Boolean).sort();

    const approvedWorkQuery: any = {};
    if (shouldFilter) {
        approvedWorkQuery.workType = { $in: activeWorkTypes };
    }

    const filterLabelText = !shouldFilter ? 'All' : activeWorkTypes.length === 0 ? 'None' : activeWorkTypes.join(', ');

    const loadSummary = params.loadSummary === 'true';
    const loadPending = params.loadPending === 'true';
    const searchQuery = params.search?.trim();

    // Determine what we need to query
    const needPackages = Boolean(searchQuery || loadSummary || loadPending);
    const needApprovedWorks = Boolean(loadSummary || loadPending);
    const needTS = loadSummary;
    const needDTPs = loadSummary;

    // Fetch only needed collections
    const [
        allApprovedWorks,
        allPackages,
        allTS,
        allDTPs
    ] = await Promise.all([
        needApprovedWorks ? ApprovedWork.find(approvedWorkQuery).select('_id workName approvalYear workType').lean() : Promise.resolve([]),
        needPackages ? Package.find({}).select('_id packageName works.workName').lean() : Promise.resolve([]),
        needTS ? TechnicalSanction.find({}).select('workName').lean() : Promise.resolve([]),
        needDTPs ? DTP.find({}).select('tsId dtpApprovalDate').lean() : Promise.resolve([])
    ]);

    // Normalize strings for fuzzy matching
    const normalizeString = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    let summaryData: any[] = [];
    if (loadSummary) {
        const tsCountMap: Record<string, number> = {};
        allTS.forEach((ts: any) => {
            const name = normalizeString(ts.workName as string);
            tsCountMap[name] = (tsCountMap[name] || 0) + 1;
        });

        const pendingTSIds = new Set<string>();
        allApprovedWorks.forEach((w: any) => {
            const safeName = normalizeString(w.workName as string);
            if (tsCountMap[safeName] > 0) {
                tsCountMap[safeName]--;
            } else {
                pendingTSIds.add(w._id.toString());
            }
        });

        const workNameToPkg = new Map<string, any>();
        allPackages.forEach((pkg: any) => {
            if (pkg.works) {
                pkg.works.forEach((pw: any) => {
                    if (pw.workName) {
                        workNameToPkg.set(normalizeString(pw.workName), pkg);
                    }
                });
            }
        });

        const pkgIdToDTP = new Map<string, any>();
        allDTPs.forEach((d: any) => {
            if (d.tsId) {
                pkgIdToDTP.set(d.tsId.toString(), d);
            }
        });

        const summaryMap: Record<string, any> = {};

        allApprovedWorks.forEach((work: any) => {
            const year = work.approvalYear || 'Unspecified';
            if (!summaryMap[year]) {
                summaryMap[year] = { year, total: 0, tsPrepared: 0, tsPending: 0, dtpPrepared: 0, dtpPending: 0 };
            }
            
            summaryMap[year].total++;
            
            const isTSPending = pendingTSIds.has(work._id.toString());
            if (isTSPending) {
                summaryMap[year].tsPending++;
            } else {
                summaryMap[year].tsPrepared++;
                const safeName = normalizeString(work.workName as string);
                const pkg = workNameToPkg.get(safeName);
                const dtp = pkg ? pkgIdToDTP.get(pkg._id.toString()) : null;
                const hasApprovedDTP = Boolean(dtp && dtp.dtpApprovalDate);
                
                if (hasApprovedDTP) {
                    summaryMap[year].dtpPrepared++;
                } else {
                    summaryMap[year].dtpPending++;
                }
            }
        });

        summaryData = Object.values(summaryMap).sort((a, b) => b.year.localeCompare(a.year));
        
        const summaryTotals = summaryData.reduce((acc, row) => ({
            year: 'Total',
            total: acc.total + row.total,
            tsPrepared: acc.tsPrepared + row.tsPrepared,
            tsPending: acc.tsPending + row.tsPending,
            dtpPrepared: acc.dtpPrepared + row.dtpPrepared,
            dtpPending: acc.dtpPending + row.dtpPending
        }), { year: 'Total', total: 0, tsPrepared: 0, tsPending: 0, dtpPrepared: 0, dtpPending: 0 });

        if (summaryData.length > 0) {
            summaryData.push(summaryTotals);
        }
    }

    // 2. Pending Work Order Report (Server-Side Pagination)
    let paginatedTendersReportData: any[] = [];
    let tenderTotalPages = 0;
    let tenderPage = 1;

    if (loadPending) {
        const filteredWorkNames = new Set(
            allApprovedWorks.map((w: any) => normalizeString(w.workName as string))
        );

        const matchingPackageIds = allPackages.filter((pkg: any) => {
            if (!shouldFilter) return true;
            return pkg.works?.some((w: any) => filteredWorkNames.has(normalizeString(w.workName)));
        }).map((pkg: any) => pkg._id);

        tenderPage = parseInt(params.page || '1');
        const tenderLimit = parseInt(params.limit || '100');
        const tenderSkip = (tenderPage - 1) * tenderLimit;

        // Find Tenders that already have a WorkOrder (either in database or with workOrderDate set)
        const workOrders = await WorkOrder.find({}).select('loaId').lean() as any[];
        const loaIdsWithWO = workOrders.map(wo => wo.loaId?.toString()).filter(Boolean);
        const loasWithWO = await LOA.find({ _id: { $in: loaIdsWithWO } }).select('tenderId').lean() as any[];
        const tenderIdsWithWO = loasWithWO.map(l => l.tenderId?.toString()).filter(Boolean);

        const tenderQuery: any = { 
            cancelled: { $ne: true },
            _id: { $nin: tenderIdsWithWO },
            $or: [
                { workOrderDate: { $exists: false } },
                { workOrderDate: null },
                { workOrderDate: '' }
            ]
        };
        if (shouldFilter) {
            tenderQuery.packageId = { $in: matchingPackageIds };
        }

        const [tenderTotalItems, reportTendersRaw] = await Promise.all([
            Tender.countDocuments(tenderQuery),
            Tender.find(tenderQuery)
                .select('_id tenderNoticeYear noticeNo srNo packageName packageId contractorName proposalDate tenderApprovalDate acceptanceLetterDate workOrderDate cancelled cancellationReason')
                .sort({ tenderNoticeYear: -1, noticeNo: 1, srNo: 1 })
                .skip(tenderSkip)
                .limit(tenderLimit)
                .lean()
        ]);

        tenderTotalPages = Math.ceil(tenderTotalItems / tenderLimit);
        const tenderIds = reportTendersRaw.map((t: any) => t._id);

        // Fetch related records ONLY for the paginated Tenders (Massive performance boost)
        const [reportApprovals, reportLOAs] = await Promise.all([
            Approval.find({ tenderId: { $in: tenderIds } }).select('tenderId notRequired proposalDate tenderApprovalDate').lean(),
            LOA.find({ tenderId: { $in: tenderIds } }).select('_id tenderId acceptanceLetterDate').lean()
        ]);

        const loaIds = reportLOAs.map((l: any) => l._id);
        const reportWorkOrders = await WorkOrder.find({ loaId: { $in: loaIds } }).select('loaId workOrderDate').lean();

        const approvalMap = new Map(reportApprovals.map((a: any) => [a.tenderId?.toString(), a]));
        const loaMap = new Map(reportLOAs.map((l: any) => [l.tenderId?.toString(), l]));
        const workOrderMap = new Map(reportWorkOrders.map((wo: any) => [wo.loaId?.toString(), wo]));
        const packageMap = new Map(allPackages.map((p: any) => [p._id.toString(), p]));

        paginatedTendersReportData = reportTendersRaw.map((tender: any) => {
            const tIdStr = tender._id.toString();
            const approval = approvalMap.get(tIdStr);
            const loa = loaMap.get(tIdStr);
            const workOrder = loa ? workOrderMap.get(loa._id.toString()) : null;

            const isApprovalNotRequired = approval?.notRequired === true;
            const proposalDate = isApprovalNotRequired ? 'Not Required' : (tender.proposalDate || approval?.proposalDate || null);
            const tenderApprovalDate = isApprovalNotRequired ? 'Not Required' : (tender.tenderApprovalDate || approval?.tenderApprovalDate || null);
            const acceptanceLetterDate = tender.acceptanceLetterDate || loa?.acceptanceLetterDate || null;
            const workOrderDate = tender.workOrderDate || workOrder?.workOrderDate || null;

            const pkg = tender.packageId ? packageMap.get(tender.packageId.toString()) : null;
            const approvedWorks = pkg && pkg.works && pkg.works.length > 0 
                ? pkg.works.map((w: any) => w.workName).filter(Boolean)
                : [];

            return {
                _id: tIdStr,
                tenderNoticeYear: tender.tenderNoticeYear || '-',
                noticeNo: tender.noticeNo || '-',
                srNo: tender.srNo || '-',
                packageName: tender.packageName || 'Unspecified Package',
                approvedWorks,
                packageId: tender.packageId?.toString() || null,
                contractorName: tender.contractorName || '-',
                proposalDate,
                tenderApprovalDate,
                acceptanceLetterDate,
                workOrderDate,
                cancelled: tender.cancelled || false,
                cancellationReason: tender.cancellationReason || '',
            };
        });
    }

    const columns: Column[] = [
        { key: 'tenderNoticeYear', label: 'Notice Year' },
        { key: 'noticeNo', label: 'Notice No.' },
        { key: 'srNo', label: 'Sr No.', align: 'center' },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            minWidth: '200px', 
            render: (row) => (
                <div className="flex flex-col gap-1">
                    {row.packageId ? (
                        <Link href={`/packages/${row.packageId}`} className="text-blue-600 hover:underline font-semibold break-words">
                            {row.packageName}
                        </Link>
                    ) : (
                        <span className="break-words font-medium text-slate-700">{row.packageName}</span>
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
        { key: 'contractorName', label: 'Contractor Name', minWidth: '150px' },
        { 
            key: 'proposalDate', 
            label: 'Proposal Date', 
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
        { key: 'acceptanceLetterDate', label: 'Acceptance Date', render: (row) => <span className="text-slate-600">{formatShortDate(row.acceptanceLetterDate)}</span> }
    ];

    // 4. Search Results Report (If search query exists)
    let searchResultsData: any[] = [];
    if (searchQuery) {
        // Find packages whose packageName matches OR which contain a work matching the search query
        const searchPackages = allPackages.filter((pkg: any) => {
            const pkgNameMatch = pkg.packageName?.toLowerCase().includes(searchQuery.toLowerCase());
            const workNameMatch = pkg.works?.some((w: any) => w.workName?.toLowerCase().includes(searchQuery.toLowerCase()));
            return pkgNameMatch || workNameMatch;
        });
        const searchPackageIds = searchPackages.map((pkg: any) => pkg._id);

        // Find Tenders matching the search query in packageName OR belonging to matching packages
        const searchTendersRaw = await Tender.find({
            $or: [
                { packageName: { $regex: searchQuery, $options: 'i' } },
                { packageId: { $in: searchPackageIds } }
            ]
        })
        .select('_id tenderNoticeYear noticeNo srNo packageName packageId contractorName proposalDate tenderApprovalDate acceptanceLetterDate workOrderDate cancelled cancellationReason')
        .sort({ tenderNoticeYear: -1, noticeNo: 1, srNo: 1 })
        .lean();

        const searchTenderIds = searchTendersRaw.map((t: any) => t._id);

        // Fetch related records for matched search tenders
        const [searchApprovals, searchLOAs] = await Promise.all([
            Approval.find({ tenderId: { $in: searchTenderIds } }).select('tenderId notRequired proposalDate tenderApprovalDate').lean(),
            LOA.find({ tenderId: { $in: searchTenderIds } }).select('_id tenderId acceptanceLetterDate').lean()
        ]);

        const searchLoaIds = searchLOAs.map((l: any) => l._id);
        const searchWorkOrders = await WorkOrder.find({ loaId: { $in: searchLoaIds } }).select('loaId workOrderDate').lean();

        const searchApprovalMap = new Map(searchApprovals.map((a: any) => [a.tenderId?.toString(), a]));
        const searchLoaMap = new Map(searchLOAs.map((l: any) => [l.tenderId?.toString(), l]));
        const searchWorkOrderMap = new Map(searchWorkOrders.map((wo: any) => [wo.loaId?.toString(), wo]));
        const searchPackageMap = new Map(allPackages.map((p: any) => [p._id.toString(), p]));

        searchResultsData = searchTendersRaw.map((tender: any) => {
            const tIdStr = tender._id.toString();
            const approval = searchApprovalMap.get(tIdStr);
            const loa = searchLoaMap.get(tIdStr);
            const workOrder = loa ? searchWorkOrderMap.get(loa._id.toString()) : null;

            const isApprovalNotRequired = approval?.notRequired === true;
            const proposalDate = isApprovalNotRequired ? 'Not Required' : (tender.proposalDate || approval?.proposalDate || null);
            const tenderApprovalDate = isApprovalNotRequired ? 'Not Required' : (tender.tenderApprovalDate || approval?.tenderApprovalDate || null);
            const acceptanceLetterDate = tender.acceptanceLetterDate || loa?.acceptanceLetterDate || null;
            const workOrderDate = tender.workOrderDate || workOrder?.workOrderDate || null;

            const pkg = tender.packageId ? searchPackageMap.get(tender.packageId.toString()) : null;
            const approvedWorks = pkg && pkg.works && pkg.works.length > 0 
                ? pkg.works.map((w: any) => w.workName).filter(Boolean)
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
                packageId: tender.packageId?.toString() || null,
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
    }

    const searchColumns: Column[] = [
        { key: 'tenderNoticeYear', label: 'Notice Year' },
        { key: 'noticeNo', label: 'Notice No.' },
        { key: 'srNo', label: 'Sr No.', align: 'center' },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            minWidth: '200px', 
            render: (row) => (
                <div className="flex flex-col gap-1">
                    {row.packageId ? (
                        <Link href={`/packages/${row.packageId}`} className="text-blue-600 hover:underline font-semibold break-words">
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
        { key: 'contractorName', label: 'Contractor Name', minWidth: '150px' },
        { 
            key: 'proposalDate', 
            label: 'Proposal Date', 
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
            label: 'Acceptance Date', 
            render: (row) => <span className="text-slate-600">{formatShortDate(row.acceptanceLetterDate)}</span> 
        },
        { 
            key: 'workOrderDate', 
            label: 'Work Order Date', 
            render: (row) => <span className="text-slate-600">{formatShortDate(row.workOrderDate)}</span> 
        },
        { 
            key: 'status', 
            label: 'Status', 
            render: (row) => {
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (row.status === 'Cancelled') {
                    badgeClass = 'bg-red-50 text-red-700 border border-red-200';
                } else if (row.status === 'Work Order Issued') {
                    badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                } else if (row.status === 'LOA Issued') {
                    badgeClass = 'bg-blue-50 text-blue-700 border border-blue-200';
                } else if (row.status === 'Tender Approved' || row.status === 'Approved (No Sanction Req.)') {
                    badgeClass = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
                } else if (row.status === 'Proposal Submitted') {
                    badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
                }
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClass}`}>
                        {row.status}
                    </span>
                );
            }
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-8 space-y-12">
            <div className="max-w-[100%] mx-auto space-y-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
                        <p className="text-sm font-medium text-slate-500">Panchayat Road and Building Division, Bhavnagar</p>
                    </div>
                    <div className="w-full md:w-96">
                        <Suspense fallback={<div className="h-10 bg-slate-200 animate-pulse rounded-md" />}>
                            <SearchBar placeholder="Search work or package name..." />
                        </Suspense>
                    </div>
                </div>

                {/* Search Results Section */}
                {searchQuery && (
                    <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Search Results</h2>
                                <p className="text-xs text-slate-500 font-medium">Matching results for "{searchQuery}"</p>
                            </div>
                        </div>
                        <DataTable 
                            columns={searchColumns} 
                            data={searchResultsData} 
                            emptyMessage="No matching works or packages found."
                            exportFilename="Search_Results.xlsx"
                        />
                    </div>
                )}

                {/* 0. Summary Report */}
                <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Summary Report</h2>
                                {loadSummary && (
                                    <Link 
                                        href={getQueryString({ loadSummary: null })}
                                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
                                    >
                                        Hide Report
                                    </Link>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Overview of works and packages status by Approval Year — Filtered: {filterLabelText}</p>
                        </div>
                        {loadSummary && (
                            <div className="flex items-center gap-3">
                                <Suspense fallback={null}>
                                    <WorkTypeFilter workTypes={workTypes} />
                                </Suspense>
                                <ExportTableButton tableId="summary-table" filename="Summary_Report.xlsx" />
                            </div>
                        )}
                    </div>

                    {loadSummary ? (
                        <div className="overflow-x-auto border border-slate-300 shadow-sm rounded-lg">
                            <table id="summary-table" className="w-full text-left border-collapse text-xs font-medium">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-300">
                                        <th rowSpan={2} className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300">Approval Year</th>
                                        <th rowSpan={2} className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300 text-center">Total Approved Works</th>
                                        <th colSpan={2} className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300 text-center">TS</th>
                                        <th colSpan={2} className="px-3 py-2.5 font-bold text-slate-700 text-center">DTP</th>
                                    </tr>
                                    <tr className="bg-slate-100 border-b border-slate-300">
                                        <th className="px-3 py-2.5 font-medium text-slate-700 border-r border-slate-300 text-center">Prepared</th>
                                        <th className="px-3 py-2.5 font-medium text-slate-700 border-r border-slate-300 text-center">Pending</th>
                                        <th className="px-3 py-2.5 font-medium text-slate-700 border-r border-slate-300 text-center">Prepared</th>
                                        <th className="px-3 py-2.5 font-medium text-slate-700 text-center">Pending</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {summaryData.length > 0 ? summaryData.map((row: any, index: number) => {
                                        const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
                                        return (
                                            <tr key={row.year} className={`${rowBg} hover:bg-blue-50/80 transition-colors`}>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200"><span className="font-bold">{row.year}</span></td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    {row.year !== 'Total' ? <Link href={`/approved-works?approvalYear=${encodeURIComponent(row.year)}`} className="text-blue-600 hover:underline font-medium">{row.total}</Link> : <Link href="/approved-works" className="text-blue-600 hover:underline font-bold">{row.total}</Link>}
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    {row.year !== 'Total' ? <Link href={`/approved-works?approvalYear=${encodeURIComponent(row.year)}&filter=preparedTS`} className="text-blue-600 hover:underline font-medium">{row.tsPrepared}</Link> : <Link href="/approved-works?filter=preparedTS" className="text-blue-600 hover:underline font-bold">{row.tsPrepared}</Link>}
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    {row.year !== 'Total' ? <Link href={`/approved-works?approvalYear=${encodeURIComponent(row.year)}&filter=pending`} className="text-amber-600 hover:underline font-medium">{row.tsPending}</Link> : <Link href="/approved-works?filter=pending" className="text-amber-700 hover:underline font-bold">{row.tsPending}</Link>}
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    {row.year !== 'Total' ? <Link href={`/approved-works?approvalYear=${encodeURIComponent(row.year)}&filter=preparedDTP`} className="text-blue-600 hover:underline font-medium">{row.dtpPrepared}</Link> : <Link href="/approved-works?filter=preparedDTP" className="text-blue-600 hover:underline font-bold">{row.dtpPrepared}</Link>}
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 text-center">
                                                    {row.year !== 'Total' ? <Link href={`/approved-works?approvalYear=${encodeURIComponent(row.year)}&filter=pendingDTP`} className="text-amber-600 hover:underline font-medium">{row.dtpPending}</Link> : <Link href="/approved-works?filter=pendingDTP" className="text-amber-700 hover:underline font-bold">{row.dtpPending}</Link>}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No summary data available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-3">
                            <p className="text-xs font-semibold text-slate-500">Summary Report data is not loaded.</p>
                            <Link 
                                href={getQueryString({ loadSummary: 'true' })} 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                Load Summary Report
                            </Link>
                        </div>
                    )}
                </div>

                {/* 3. Pending Work Order Report */}
                {loadPending ? (
                    <details className="group bg-white shadow-sm rounded-xl border border-slate-100 overflow-hidden" open>
                        <summary className="list-none p-6 cursor-pointer flex justify-between items-center hover:bg-slate-50 transition-colors [&::-webkit-details-marker]:hidden">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Pending Work Order Report</h2>
                                    <Link 
                                        href={getQueryString({ loadPending: null })} 
                                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
                                    >
                                        Hide Report
                                    </Link>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">Active tender notice tracks and contract allocations — Filtered: {filterLabelText}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Suspense fallback={null}>
                                    <WorkTypeFilter workTypes={workTypes} stopPropagation />
                                </Suspense>
                                <div className="text-slate-400 group-open:rotate-180 transition-transform duration-200">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </summary>
                        <div className="p-6 border-t border-slate-100 space-y-4">
                            <DataTable 
                                columns={columns} 
                                data={paginatedTendersReportData} 
                                emptyMessage="No tender notices found."
                                exportFilename="Pending_Work_Order_Report.xlsx"
                            />
                            {tenderTotalPages > 1 && (
                                <div className="mt-4 flex justify-end">
                                    <Pagination currentPage={tenderPage} totalPages={tenderTotalPages} />
                                </div>
                            )}
                        </div>
                    </details>
                ) : (
                    <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Pending Work Order Report</h2>
                                <p className="text-xs text-slate-500 font-medium">Active tender notice tracks and contract allocations — Filtered: {filterLabelText}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-3">
                            <p className="text-xs font-semibold text-slate-500">Pending Work Order Report data is not loaded.</p>
                            <Link 
                                href={getQueryString({ loadPending: 'true' })} 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                Load Pending Work Order Report
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
