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
import { 
    ArrowRight,
    TrendingUp,
    Briefcase,
    Building2,
    Construction,
    FileText,
    ClipboardCheck,
    FolderKanban,
    Megaphone,
    ShieldCheck,
    FileSignature,
    Hammer,
    ChevronRight
} from 'lucide-react';
import { Suspense } from 'react';
import SearchBar from '@/components/SearchBar';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ search?: string }>;
}

export default async function Home({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    const search = params.search;

    const [
        allApprovedWorks,
        allTS,
        allPackages,
        allTenders,
        allApprovals,
        allLOAs,
        allWorkOrders
    ] = await Promise.all([
        ApprovedWork.find({}).lean(),
        TechnicalSanction.find({}).lean(),
        Package.find({}).lean(),
        Tender.find({}).lean(),
        Approval.find({}).lean(),
        LOA.find({}).lean(),
        WorkOrder.find({}).lean()
    ]);

    const workNameToNature: Record<string, string> = {};
    allApprovedWorks.forEach(w => {
        if (w.workName) {
            workNameToNature[w.workName.trim().toLowerCase()] = (w as any).natureOfWork || 'Unclassified';
        }
    });

    const tsIdToName: Record<string, string> = {};
    allTS.forEach(ts => {
        tsIdToName[ts._id.toString()] = ts.workName;
    });

    const getNature = (name?: string, id?: any) => {
        let finalName = name;
        if (!finalName && id) {
            finalName = tsIdToName[id.toString()];
        }
        if (!finalName) return 'Unclassified';
        return workNameToNature[finalName.trim().toLowerCase()] || 'Unclassified';
    };

    const packageMap: Record<string, any> = {};
    allPackages.forEach(p => {
        packageMap[p._id.toString()] = p;
    });

    const tenderMap: Record<string, any> = {};
    allTenders.forEach(t => {
        tenderMap[t._id.toString()] = t;
    });

    const getBifurcation = (natures: string[]) => {
        if (natures.length === 0) return [];
        const counts: Record<string, number> = {};
        natures.forEach(n => {
            counts[n] = (counts[n] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    };

    const tsNames = new Set(allTS.map(ts => (ts.workName || '').trim().toLowerCase()));
    const tenderPackageIds = new Set(allTenders.map(t => t.packageId?.toString()));
    const approvalTenderIds = new Set(allApprovals.map(a => a.tenderId?.toString()));
    const loaTenderIds = new Set(allLOAs.map(l => l.tenderId?.toString()));
    const workOrderLoaIds = new Set(allWorkOrders.map(wo => wo.loaId?.toString()));

    const pendingTSWorks = allApprovedWorks.filter(w => !tsNames.has((w.workName || '').trim().toLowerCase()));
    const pendingTSBifurcation = getBifurcation(pendingTSWorks.map(w => (w as any).natureOfWork || 'Unclassified'));

    const pendingDTPPackages = allPackages.filter(p => !p.dtpApprovalDate);
    const pendingDTPNatures: string[] = [];
    pendingDTPPackages.forEach(p => {
        const works = p.works || (p as any).selectedWorks; // Fallback to common variations
        if (works && Array.isArray(works)) {
            works.forEach(w => pendingDTPNatures.push(getNature(w.workName, w.workId)));
        }
    });
    const pendingDTPBifurcation = getBifurcation(pendingDTPNatures);

    const pendingTenderPackages = allPackages.filter(p => !tenderPackageIds.has(p._id.toString()));
    const pendingTenderNatures: string[] = [];
    pendingTenderPackages.forEach(p => {
        const works = p.works || (p as any).selectedWorks;
        if (works && Array.isArray(works)) {
            works.forEach(w => pendingTenderNatures.push(getNature(w.workName, w.workId)));
        }
    });
    const pendingTenderBifurcation = getBifurcation(pendingTenderNatures);

    const pendingApprovalTenders = allTenders.filter(t => !approvalTenderIds.has(t._id.toString()));
    const pendingApprovalNatures: string[] = [];
    pendingApprovalTenders.forEach(t => {
        const pkg = packageMap[t.packageId?.toString()];
        const works = pkg?.works || pkg?.selectedWorks;
        if (works && Array.isArray(works)) {
            works.forEach((w: any) => pendingApprovalNatures.push(getNature(w.workName, w.workId)));
        }
    });
    const pendingApprovalBifurcation = getBifurcation(pendingApprovalNatures);

    const pendingLOATenders = allTenders.filter(t => !loaTenderIds.has(t._id.toString()));
    const pendingLOANatures: string[] = [];
    pendingLOATenders.forEach(t => {
        const pkg = packageMap[t.packageId?.toString()];
        const works = pkg?.works || pkg?.selectedWorks;
        if (works && Array.isArray(works)) {
            works.forEach((w: any) => pendingLOANatures.push(getNature(w.workName, w.workId)));
        }
    });
    const pendingLOABifurcation = getBifurcation(pendingLOANatures);

    const pendingWOLoas = allLOAs.filter(l => !workOrderLoaIds.has(l._id.toString()));
    const pendingWONatures: string[] = [];
    pendingWOLoas.forEach(l => {
        const tender = tenderMap[l.tenderId?.toString()];
        if (tender) {
            const pkg = packageMap[tender.packageId?.toString()];
            const works = pkg?.works || pkg?.selectedWorks;
            if (works && Array.isArray(works)) {
                works.forEach((w: any) => pendingWONatures.push(getNature(w.workName, w.workId)));
            }
        }
    });
    const pendingWOBifurcation = getBifurcation(pendingWONatures);

    let searchResults: any[] = [];
    if (search) {
        const matchingWorks = await ApprovedWork.find({
            workName: { $regex: search, $options: 'i' }
        }).limit(5).lean();

        for (const work of matchingWorks) {
            const ts = await TechnicalSanction.findOne({ workName: (work as any).workName }).lean();
            let pkg = null;
            if (ts) { pkg = await Package.findOne({ "works.workId": ts._id }).lean(); }
            else { pkg = await Package.findOne({ "works.workName": (work as any).workName }).lean(); }
            let tender = null;
            if (pkg) { tender = await Tender.findOne({ packageId: (pkg as any)._id }).lean(); }
            let approval = null, loa = null, workOrder = null;
            if (tender) {
                approval = await Approval.findOne({ tenderId: (tender as any)._id }).lean();
                loa = await LOA.findOne({ tenderId: (tender as any)._id }).lean();
                if (loa) { workOrder = await WorkOrder.findOne({ loaId: (loa as any)._id }).lean(); }
            }
            let status = "Approved Work (Pending TS)", progress = 10;
            if (workOrder) { status = "Work Order Awarded"; progress = 100; }
            else if (loa) { status = "LOA Issued"; progress = 85; }
            else if (approval) { status = "Technical Approval Received"; progress = 75; }
            else if (tender) { status = "Tender Published"; progress = 60; }
            else if ((pkg as any)?.dtpApprovalDate) { status = "DTP Approved"; progress = 50; }
            else if (pkg) { status = "Package/DTP Submitted"; progress = 40; }
            else if ((ts as any)?.tsNumber) { status = "TS Granted"; progress = 30; }
            else if (ts) { status = "TS Submitted"; progress = 20; }
            searchResults.push({
                id: (work._id as any).toString(),
                name: (work as any).workName,
                status,
                progress,
                district: (work as any).district,
                taluka: (work as any).taluka
            });
        }
    }

    const stats = [
        { name: 'Pending TS', count: pendingTSWorks.length, href: '/approved-works?filter=pending', bifurcation: pendingTSBifurcation, step: 1, icon: ClipboardCheck, color: 'blue' },
        { name: 'Pending DTP', count: pendingDTPPackages.length, href: '/packages?filter=pending_dtp', bifurcation: pendingDTPBifurcation, step: 2, icon: FolderKanban, color: 'violet' },
        { name: 'Pending Tender', count: pendingTenderPackages.length, href: '/packages?filter=pending_tender', bifurcation: pendingTenderBifurcation, step: 3, icon: Megaphone, color: 'amber' },
        { name: 'Pending Approval', count: pendingApprovalTenders.length, href: '/tenders?filter=pending_approval', bifurcation: pendingApprovalBifurcation, step: 4, icon: ShieldCheck, color: 'emerald' },
        { name: 'Pending LOA', count: pendingLOATenders.length, href: '/tenders?filter=pending_loa', bifurcation: pendingLOABifurcation, step: 5, icon: FileSignature, color: 'rose' },
        { name: 'Pending Work Order', count: pendingWOLoas.length, href: '/loas?filter=pending', bifurcation: pendingWOBifurcation, step: 6, icon: Hammer, color: 'cyan' }
    ];

    const colorMap: Record<string, { border: string; bg: string; text: string; badge: string; hoverBg: string }> = {
        blue:    { border: 'border-l-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-600',    badge: 'from-blue-500 to-blue-600',       hoverBg: 'group-hover:bg-blue-50' },
        violet:  { border: 'border-l-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-600',  badge: 'from-violet-500 to-violet-600',   hoverBg: 'group-hover:bg-violet-50' },
        amber:   { border: 'border-l-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-600',   badge: 'from-amber-500 to-amber-600',     hoverBg: 'group-hover:bg-amber-50' },
        emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'from-emerald-500 to-emerald-600', hoverBg: 'group-hover:bg-emerald-50' },
        rose:    { border: 'border-l-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-600',    badge: 'from-rose-500 to-rose-600',       hoverBg: 'group-hover:bg-rose-50' },
        cyan:    { border: 'border-l-cyan-500',    bg: 'bg-cyan-50',    text: 'text-cyan-600',    badge: 'from-cyan-500 to-cyan-600',       hoverBg: 'group-hover:bg-cyan-50' },
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-12">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/5 blur-[120px]"></div>
                <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] rounded-full bg-indigo-400/5 blur-[100px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
                        <p className="text-sm font-medium text-slate-500">Real-time overview of infrastructure project lifecycle</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Suspense fallback={<div className="h-10 w-64 bg-slate-100 animate-pulse rounded-lg" />}>
                            <SearchBar placeholder="Trace project status..." />
                        </Suspense>
                        {search && (
                            <Link href="/" className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 transition-all">
                                Clear Trace
                            </Link>
                        )}
                    </div>
                </div>

                {search && (
                    <div className="mb-12 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2 px-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Trace Results: &quot;{search}&quot;</h2>
                        </div>
                        {searchResults.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-slate-900 font-bold mb-1">No matches found</h3>
                                <p className="text-slate-500 text-sm">We couldn&apos;t find any projects matching that name.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {searchResults.map((result) => (
                                    <div key={result.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 transition-all hover:shadow-md hover:border-blue-200 group">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-black text-slate-900 leading-tight mb-1 group-hover:text-blue-600 transition-colors uppercase">{result.name}</h3>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                        <Briefcase className="w-3 h-3" /> {result.taluka}, {result.district}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex-1 md:max-w-xs">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">{result.status}</span>
                                                    <span className="text-[10px] font-black text-slate-400">{result.progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className="bg-blue-600 h-full transition-all duration-1000 ease-out"
                                                        style={{ width: `${result.progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div>
                                                <Link 
                                                    href={`/approved-works/${result.id}`}
                                                    className="inline-flex items-center px-5 py-2.5 text-xs font-black text-white bg-slate-900 rounded-xl hover:bg-blue-600 transition-all shadow-sm active:scale-95"
                                                >
                                                    View Timeline <ArrowRight className="w-3.5 h-3.5 ml-2" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-12">
                    <div className="flex items-center gap-2 mb-6 px-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Process Pipeline</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5 items-stretch">
                        {stats.map((stat) => {
                            const c = colorMap[stat.color];
                            const Icon = stat.icon;
                            return (
                                <div 
                                    key={stat.name} 
                                    className={`group bg-white border border-slate-200/80 border-l-4 ${c.border} rounded-2xl shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 flex flex-col h-full overflow-hidden`}
                                >
                                    {/* Card Header */}
                                    <div className={`px-5 pt-5 pb-4 transition-colors duration-300 ${c.hoverBg}`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                                                    <Icon className={`w-[18px] h-[18px] ${c.text}`} />
                                                </div>
                                                <div>
                                                    <Link href={stat.href} className="block text-sm font-extrabold text-slate-800 hover:text-slate-900 tracking-tight leading-tight">
                                                        {stat.name}
                                                    </Link>
                                                </div>
                                            </div>
                                            <Link href={stat.href} className={`inline-flex items-center justify-center min-w-[44px] h-9 px-3 rounded-xl bg-gradient-to-br ${c.badge} text-white text-lg font-black tabular-nums shadow-sm hover:scale-105 transition-transform duration-200`}>
                                                {stat.count}
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Bifurcation Rows */}
                                    <div className="px-5 pb-4 flex-1">
                                        <div className="border-t border-dashed border-slate-200 pt-3">
                                            {stat.bifurcation.length > 0 ? (
                                                <div className="space-y-0.5">
                                                    {stat.bifurcation.map(b => (
                                                        <Link 
                                                            key={b.name}
                                                            href={`${stat.href}${stat.href.includes('?') ? '&' : '?'}nature=${encodeURIComponent(b.name)}`}
                                                            className="flex justify-between items-center text-[11px] hover:bg-slate-50 py-1.5 px-2 -mx-2 rounded-lg transition-all duration-150 group/link"
                                                        >
                                                            <span className="flex items-center gap-1.5 font-semibold text-slate-500 group-hover/link:text-slate-700 uppercase tracking-tight line-clamp-1">
                                                                <ChevronRight className={`w-3 h-3 ${c.text} opacity-0 -ml-1 group-hover/link:opacity-100 group-hover/link:ml-0 transition-all duration-150`} />
                                                                {b.name}
                                                            </span>
                                                            <span className="font-extrabold text-slate-700 tabular-nums ml-2 group-hover/link:text-slate-900">{b.count}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-[11px] font-medium text-slate-300 italic py-1">No pending items</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
