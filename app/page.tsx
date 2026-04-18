import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import TechnicalSanction from '@/models/TechnicalSanction';
import Package from '@/models/Package';
import DTP from '@/models/DTP';
import DashboardFilters from '@/components/DashboardFilters';
import ReportGrouping from '@/components/ReportGrouping';
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

    // Fetch related docs to determine pending statuses
    const allTS = await TechnicalSanction.find({}).select('workName').lean();
    const tsNames = new Set(allTS.map(ts => (ts.workName || '').trim().toLowerCase()));

    const allPackages = await Package.find({}).select('works').lean();
    const workNameToPackageId = new Map<string, string>();
    allPackages.forEach(pkg => {
        if (pkg.works && Array.isArray(pkg.works)) {
            pkg.works.forEach(w => {
                if (w.workName) workNameToPackageId.set(w.workName.trim().toLowerCase(), pkg._id.toString());
            });
        }
    });

    const allDTPs = await DTP.find({}).select('tsId dtpApprovalDate').lean();
    const dtpPackageIds = new Set(allDTPs.filter(d => Boolean(d.dtpApprovalDate)).map(d => d.tsId?.toString()));

    const totalWorks = works.length;
    let overallPendingTS = 0;
    let overallPendingDTP = 0;

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

    const groupByField = params.groupBy || 'natureOfWork';
    const groupLabels: Record<string, string> = {
        natureOfWork: 'Nature of Work',
        subDivision: 'Sub Division',
        estimateConsultant: 'Consultant',
        approvalYear: 'Approval Year',
        roadCategory: 'Road Category',
        workType: 'Work Type',
        schemeName: 'Scheme Name'
    };
    const groupByLabel = groupLabels[groupByField] || 'Category';

    // Grouping dynamically
    const groupedData = works.reduce((acc, work) => {
        const rawVal = (work as any)[groupByField];
        const category = rawVal ? rawVal.toString().trim() : 'Unspecified';
        
        if (!acc[category]) acc[category] = { count: 0, pendingTS: 0, pendingDTP: 0 };
        
        acc[category].count += 1;

        const safeName = (work.workName || '').trim().toLowerCase();
        
        // Tracking Pending TS/DTP
        const hasTS = tsNames.has(safeName);
        if (!hasTS) {
            acc[category].pendingTS += 1;
            overallPendingTS += 1;
        } else {
            const pkgId = workNameToPackageId.get(safeName);
            if (!pkgId || !dtpPackageIds.has(pkgId)) {
                acc[category].pendingDTP += 1;
                overallPendingDTP += 1;
            }
        }

        return acc;
    }, {} as Record<string, { count: number; pendingTS: number; pendingDTP: number; }>);

    const reportRows = Object.entries(groupedData).map(([category, data]) => ({
        category,
        count: data.count,
        pendingTS: data.pendingTS,
        pendingDTP: data.pendingDTP
    })).sort((a, b) => b.count - a.count);

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

                            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Report Category ({groupByLabel})</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Total Approved Works</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Pending TS</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Pending DTP</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportRows.length > 0 ? (
                                            <>
                                                {reportRows.map(row => {
                                                    const rowParams = new URLSearchParams(searchParamsObj);
                                                    rowParams.set(groupByField, row.category !== 'Unspecified' ? row.category : '');
                                                    rowParams.delete('groupBy');
                                                    const rowQuery = `?${rowParams.toString()}`;

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
                                                                {row.pendingTS > 0 ? row.pendingTS : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-sm font-black text-amber-600 font-mono">
                                                                {row.pendingDTP > 0 ? row.pendingDTP : '-'}
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
                                                        {overallPendingTS > 0 ? overallPendingTS : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-sm font-black text-amber-600 font-mono">
                                                        {overallPendingDTP > 0 ? overallPendingDTP : '-'}
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
