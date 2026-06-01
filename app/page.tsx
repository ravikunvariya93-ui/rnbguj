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
import { formatShortDate } from '@/lib/dateUtils';
import type { Column } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ 
        page?: string;
        limit?: string;
    }>;
}

export default async function Home({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;

    const reportTenders = await Tender.find({ cancelled: { $ne: true } }).lean();
    const reportApprovals = await Approval.find({}).lean();
    const reportLOAs = await LOA.find({}).lean();
    const reportWorkOrders = await WorkOrder.find({}).lean();
    const reportPackages = await Package.find({}).lean();
    const allApprovedWorks = await ApprovedWork.find({}).lean();
    const allTS = await TechnicalSanction.find({}).select('workName').lean();
    const allDTPs = await DTP.find({}).lean();

    // Build mapping tables
    const approvalMap = new Map(reportApprovals.map(a => [a.tenderId?.toString(), a]));
    const loaMap = new Map(reportLOAs.map(l => [l.tenderId?.toString(), l]));
    const workOrderMap = new Map(reportWorkOrders.map(wo => [wo.loaId?.toString(), wo]));
    const packageMap = new Map(reportPackages.map(p => [p._id.toString(), p]));

    // Normalize and filter Pending TS Works
    const normalizeString = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const tsCountMap: Record<string, number> = {};
    allTS.forEach(ts => {
        const name = normalizeString(ts.workName as string);
        tsCountMap[name] = (tsCountMap[name] || 0) + 1;
    });

    const pendingTSWorks = allApprovedWorks.filter(w => {
        const safeName = normalizeString(w.workName as string);
        if (tsCountMap[safeName] > 0) {
            tsCountMap[safeName]--;
            return false;
        }
        return true;
    });

    // Filter Pending DTP Works (Approved Works whose TS exists but DTP Approval Date does not exist)
    const pendingTSIds = new Set(pendingTSWorks.map(w => w._id.toString()));
    const workNameToPkg = new Map<string, any>();
    reportPackages.forEach(pkg => {
        if (pkg.works) {
            pkg.works.forEach((pw: any) => {
                if (pw.workName) {
                    workNameToPkg.set(normalizeString(pw.workName), pkg);
                }
            });
        }
    });

    const pkgIdToDTP = new Map<string, any>();
    allDTPs.forEach(d => {
        if (d.tsId) {
            pkgIdToDTP.set(d.tsId.toString(), d);
        }
    });
    // --- Build Summary Report Data ---
    const summaryMap: Record<string, any> = {};

    allApprovedWorks.forEach(work => {
        const year = work.approvalYear || 'Unspecified';
        if (!summaryMap[year]) {
            summaryMap[year] = { 
                year, 
                total: 0, 
                tsPrepared: 0, 
                tsPending: 0, 
                dtpPrepared: 0, 
                dtpPending: 0 
            };
        }
        
        summaryMap[year].total++;
        
        const isTSPending = pendingTSIds.has(work._id.toString());
        if (isTSPending) {
            summaryMap[year].tsPending++;
        } else {
            // It has TS prepared.
            summaryMap[year].tsPrepared++;

            // Now check DTP status
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

    const summaryData = Object.values(summaryMap).sort((a, b) => b.year.localeCompare(a.year));
    
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
    // ---------------------------------

    // In-memory Join & Fallback Logic
    let tendersReportData = reportTenders.map((tender: any) => {
        const tIdStr = tender._id.toString();
        const approval = approvalMap.get(tIdStr);
        const loa = loaMap.get(tIdStr);
        const workOrder = loa ? workOrderMap.get(loa._id.toString()) : null;

        // Date fallback rules
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

    // Apply Excel-Style Multi-Level Sorting: Year (Desc) -> Notice No (Asc) -> Sr No (Asc)
    tendersReportData.sort((a, b) => {
        const yearA = a.tenderNoticeYear || '';
        const yearB = b.tenderNoticeYear || '';
        if (yearA !== yearB) return yearB.localeCompare(yearA, undefined, { numeric: true });

        const noticeA = a.noticeNo || '';
        const noticeB = b.noticeNo || '';
        if (noticeA !== noticeB) return String(noticeA).localeCompare(String(noticeB), undefined, { numeric: true });

        const srA = a.srNo || '';
        const srB = b.srNo || '';
        if (srA !== srB) return String(srA).localeCompare(String(srB), undefined, { numeric: true });

        return 0;
    });

    // Paginate in memory
    const tenderPage = parseInt(params.page || '1');
    const tenderLimit = parseInt(params.limit || '100');
    const tenderTotalItems = tendersReportData.length;
    const tenderTotalPages = Math.ceil(tenderTotalItems / tenderLimit);
    const tenderSkip = (tenderPage - 1) * tenderLimit;

    const paginatedTendersReportData = tendersReportData.slice(tenderSkip, tenderSkip + tenderLimit);

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
                    <span className="break-words">{row.packageName}</span>
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

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-8 space-y-12">
            <div className="max-w-[100%] mx-auto space-y-12">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
                    <p className="text-sm font-medium text-slate-500">Panchayat Road and Building Division, Bhavnagar</p>
                </div>

                {/* 0. Summary Report */}
                <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Summary Report</h2>
                            <p className="text-xs text-slate-500 font-medium">Overview of works and packages status by Approval Year</p>
                        </div>
                        <ExportTableButton tableId="summary-table" filename="Summary_Report.xlsx" />
                    </div>
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
                </div>


                {/* 3. Pending Work Order Report */}
                <details className="group bg-white shadow-sm rounded-xl border border-slate-100 overflow-hidden">
                    <summary className="list-none p-6 cursor-pointer flex justify-between items-center hover:bg-slate-50 transition-colors [&::-webkit-details-marker]:hidden">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Pending Work Order Report</h2>
                            <p className="text-xs text-slate-500 font-medium">Active tender notice tracks and contract allocations</p>
                        </div>
                        <div className="text-slate-400 group-open:rotate-180 transition-transform duration-200">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
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
            </div>
        </div>
    );
}
