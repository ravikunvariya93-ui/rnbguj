import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import TechnicalSanction from '@/models/TechnicalSanction';
import Package from '@/models/Package';
import DTP from '@/models/DTP';
import DashboardFilters from '@/components/DashboardFilters';
import ReportGrouping from '@/components/ReportGrouping';
import SortableHeader from '@/components/SortableHeader';
import { 
    FileText, Search
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ 
        subDivision?: string;
        estimateConsultant?: string;
        approvalYear?: string;
        roadCategory?: string;
        workType?: string;
        natureOfWork?: string;
        schemeName?: string;
        groupBy?: string;
        sort?: string;
        order?: string;
    }>;
}

export default async function Home({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;

    // Fetch all works to calculate filter options globally 
    const rawApprovedWorks = await ApprovedWork.find({}).select('subDivision estimateConsultant approvalYear roadCategory workType natureOfWork schemeName').lean();

    // Extract Filter Options
    const filterOptions = {
        subDivisions: [...new Set(rawApprovedWorks.map(w => w.subDivision).filter(Boolean))].sort(),
        contractors: [...new Set(rawApprovedWorks.map(w => w.estimateConsultant).filter(Boolean))].sort(),
        years: [...new Set(rawApprovedWorks.map(w => w.approvalYear).filter(Boolean))].sort(),
        roadCategories: [...new Set(rawApprovedWorks.map(w => w.roadCategory).filter(Boolean))].sort(),
        workTypes: [...new Set(rawApprovedWorks.map(w => w.workType).filter(Boolean))].sort(),
        natures: [...new Set(rawApprovedWorks.map(w => w.natureOfWork).filter(Boolean))].sort(),
        schemes: [...new Set(rawApprovedWorks.map(w => w.schemeName).filter(Boolean))].sort(),
    } as any;

    // Build Query from Params to populate the table
    const query: any = {};
    if (params.subDivision) query.subDivision = params.subDivision;
    if (params.estimateConsultant) query.estimateConsultant = params.estimateConsultant;
    if (params.approvalYear) query.approvalYear = params.approvalYear;
    if (params.roadCategory) query.roadCategory = params.roadCategory;
    if (params.workType) query.workType = params.workType;
    if (params.natureOfWork) query.natureOfWork = params.natureOfWork;
    if (params.schemeName) query.schemeName = params.schemeName;

    // Fetch matching works to evaluate aggregates
    const works = await ApprovedWork.find(query).lean();

    const normalizeString = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const allTS = await TechnicalSanction.find({}).select('workName').lean();
    const tsCountMap: Record<string, number> = {};
    allTS.forEach(ts => {
        const name = normalizeString(ts.workName);
        tsCountMap[name] = (tsCountMap[name] || 0) + 1;
    });

    const allPackages = await Package.find({}).select('works').lean();
    const workNameToPackageId = new Map<string, string>();
    allPackages.forEach(pkg => {
        if (pkg.works && Array.isArray(pkg.works)) {
            pkg.works.forEach(w => {
                if (w.workName) workNameToPackageId.set(normalizeString(w.workName), pkg._id.toString());
            });
        }
    });

    const allDTPs = await DTP.find({}).select('tsId dtpApprovalDate').lean();
    const dtpPackageIds = new Set(allDTPs.filter(d => Boolean(d.dtpApprovalDate)).map(d => d.tsId?.toString()));

    const totalWorks = works.length;
    let overallPendingTS = 0;

    // Build base query string for links
    const searchParamsObj = new URLSearchParams();
    if (params.subDivision) searchParamsObj.set('subDivision', params.subDivision);
    if (params.estimateConsultant) searchParamsObj.set('estimateConsultant', params.estimateConsultant);
    if (params.approvalYear) searchParamsObj.set('approvalYear', params.approvalYear);
    if (params.roadCategory) searchParamsObj.set('roadCategory', params.roadCategory);
    if (params.workType) searchParamsObj.set('workType', params.workType);
    if (params.natureOfWork) searchParamsObj.set('natureOfWork', params.natureOfWork);
    if (params.schemeName) searchParamsObj.set('schemeName', params.schemeName);
    if (params.groupBy) searchParamsObj.set('groupBy', params.groupBy);
    
    const queryString = searchParamsObj.toString() ? `?${searchParamsObj.toString()}` : '';

    const groupByField = params.groupBy || 'estimateConsultant';
    const groupLabels: Record<string, string> = {
        natureOfWork: 'Nature of Work',
        subDivision: 'Sub Division',
        estimateConsultant: 'Consultant',
        approvalYear: 'Approval Year',
        roadCategory: 'Road Category',
        workType: 'Work Type',
        schemeName: 'Scheme Name',
        jobNumberApprovalDate: 'Date'
    };
    const groupByLabel = groupLabels[groupByField] || 'Category';

    // Grouping dynamically
    const groupedData = works.reduce((acc, work) => {
        const rawVal = (work as any)[groupByField];
        let category = 'Unspecified';
        
        if (rawVal) {
            if (rawVal instanceof Date) {
                category = rawVal.toLocaleDateString('en-GB');
            } else {
                category = rawVal.toString().trim();
            }
        }
        
        if (!acc[category]) acc[category] = { count: 0, pendingTS: 0 };
        
        acc[category].count += 1;

        const safeName = normalizeString(work.workName);
        
        // Tracking Pending TS (Consumption Model)
        if (tsCountMap[safeName] > 0) {
            tsCountMap[safeName]--;
        } else {
            acc[category].pendingTS += 1;
            overallPendingTS += 1;
        }

        return acc;
    }, {} as Record<string, { count: number; pendingTS: number; }>);

    let reportRows = Object.entries(groupedData).map(([category, data]) => ({
        category,
        count: data.count,
        pendingTS: data.pendingTS
    }));

    // Dashboard Sorting Logic
    const sortField = params.sort || 'count';
    const sortOrder = params.order || 'desc';

    reportRows.sort((a, b) => {
        let valA = (a as any)[sortField];
        let valB = (b as any)[sortField];

        // Chronological sorting for Date categories
        if (sortField === 'category' && groupByField === 'jobNumberApprovalDate') {
            if (valA === 'Unspecified') return sortOrder === 'asc' ? 1 : -1;
            if (valB === 'Unspecified') return sortOrder === 'asc' ? -1 : 1;
            
            const [d1, m1, y1] = valA.split('/').map(Number);
            const [d2, m2, y2] = valB.split('/').map(Number);
            const dateA = new Date(y1, m1 - 1, d1).getTime();
            const dateB = new Date(y2, m2 - 1, d2).getTime();
            
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const totalMatchedTS = totalWorks - overallPendingTS;
    const isDataMismatched = allTS.length > totalMatchedTS;

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            <div className="flex-1 relative z-10">
                {/* Main Content Area */}
                <main className="px-4 sm:px-6 lg:px-10 py-10">
                    <div className="max-w-7xl mx-auto flex flex-col gap-6">

                        {/* Data Table Section */}
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center">
                                <ReportGrouping />
                            </div>
                            
                            {/* Filter Bar */}
                            <DashboardFilters options={filterOptions} />

                            {isDataMismatched && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                                    <div className="bg-amber-500 text-white p-1 rounded-full">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-amber-900">Data Discrepancy Detected</h4>
                                        <p className="text-xs text-amber-800 mt-1">
                                            You have <strong>{allTS.length}</strong> TS records but only <strong>{totalMatchedTS}</strong> matches in your Approved Works list. 
                                            This usually means there are <strong>{allTS.length - totalMatchedTS}</strong> duplicate or typoed Technical Sanction records that are not "spent" properly.
                                            <br />
                                            <Link href="/unmatched-ts" className="font-bold underline hover:text-amber-950 mt-2 inline-block">Click here to view these orphaned TS records and fix them.</Link>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <SortableHeader field="category" label={`Report Category (${groupByLabel})`} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap" />
                                            <SortableHeader field="count" label="Total Approved Works" className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-center" />
                                            <SortableHeader field="pendingTS" label="Pending TS" className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-center" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportRows.length > 0 ? (
                                            <>
                                                {reportRows.map(row => {
                                                    const rowParams = new URLSearchParams(searchParamsObj);
                                                    rowParams.set(groupByField, row.category);
                                                    rowParams.delete('groupBy');
                                                    const rowQuery = `?${rowParams.toString()}`;

                                                    const tsParams = new URLSearchParams(rowParams);
                                                    tsParams.set('filter', 'pending');
                                                    const tsQuery = `?${tsParams.toString()}`;

                                                    const dtpParams = new URLSearchParams(rowParams);
                                                    dtpParams.set('filter', 'pendingDTP');
                                                    const dtpQuery = `?${dtpParams.toString()}`;

                                                    return (
                                                        <tr key={row.category} className="hover:bg-blue-50/50 transition-colors group">
                                                            <td className="px-6 py-4 text-sm font-bold text-slate-700">{row.category}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <Link 
                                                                    href={`/approved-works${rowQuery}`}
                                                                    className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 bg-blue-100 text-blue-700 font-black rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm"
                                                                    title="View Detailed List"
                                                                >
                                                                    {row.count}
                                                                </Link>
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-sm font-black text-rose-600 font-mono">
                                                                {row.pendingTS > 0 ? (
                                                                    <Link 
                                                                        href={`/approved-works${tsQuery}`} 
                                                                        className="hover:underline hover:text-rose-800 transition-colors px-2 py-1 rounded hover:bg-rose-50 inline-block focus:outline-none"
                                                                        title="View Pending TS List"
                                                                    >
                                                                        {row.pendingTS}
                                                                    </Link>
                                                                ) : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="bg-slate-50">
                                                    <td className="px-6 py-4 text-sm font-black text-slate-900 uppercase">Total Overall</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <Link 
                                                            href={`/approved-works${queryString}`}
                                                            className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 bg-slate-800 text-white font-black rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
                                                            title="View Complete Detailed List"
                                                        >
                                                            {totalWorks}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-sm font-black text-rose-600 font-mono">
                                                        {overallPendingTS > 0 ? (() => {
                                                            const p = new URLSearchParams(searchParamsObj);
                                                            p.set('filter', 'pending');
                                                            p.delete('groupBy');
                                                            return (
                                                                <Link 
                                                                    href={`/approved-works?${p.toString()}`} 
                                                                    className="hover:underline hover:text-rose-800 transition-colors px-2 py-1 rounded hover:bg-rose-50 inline-block focus:outline-none"
                                                                    title="View All Pending TS"
                                                                >
                                                                    {overallPendingTS}
                                                                </Link>
                                                            );
                                                        })() : '-'}
                                                    </td>
                                                </tr>
                                            </>
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center">
                                                    <div className="inline-flex flex-col items-center justify-center">
                                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                            <Search className="w-6 h-6 text-slate-400" />
                                                        </div>
                                                        <h3 className="text-sm font-bold text-slate-900 mb-1">No records found</h3>
                                                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                                            Try adjusting your filters to see more matching summary reports.
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
