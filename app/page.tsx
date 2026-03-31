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
    Layers, 
    FileCheck, 
    FileText, 
    CheckCircle, 
    Award, 
    ClipboardList,
    ArrowRight
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
    await dbConnect();

    // Fetch total counts for all modules
    const [
        totalApprovedWorks,
        totalTS,
        totalPackages,
        totalDTP,
        totalTenders,
        totalApprovals,
        totalLOAs,
        totalWorkOrders
    ] = await Promise.all([
        ApprovedWork.countDocuments(),
        TechnicalSanction.countDocuments(),
        Package.countDocuments(),
        DTP.countDocuments(),
        Tender.countDocuments(),
        Approval.countDocuments(),
        LOA.countDocuments(),
        WorkOrder.countDocuments()
    ]);

    // Calculate Pending Counts
    const stats = [
        {
            name: 'Pending TS',
            count: Math.max(0, totalApprovedWorks - totalTS),
            total: totalApprovedWorks,
            href: '/approved-works?filter=pending',
            icon: Layers,
            color: 'bg-orange-500',
            textColor: 'text-orange-600',
            bgLight: 'bg-orange-50',
            description: 'Approved works awaiting Technical Sanction'
        },
        {
            name: 'Pending DTP',
            count: Math.max(0, totalPackages - totalDTP),
            total: totalPackages,
            href: '/packages?filter=pending_dtp',
            icon: FileCheck,
            color: 'bg-indigo-500',
            textColor: 'text-indigo-600',
            bgLight: 'bg-indigo-50',
            description: 'Packages awaiting Detailed Technical Proposal'
        },
        {
            name: 'Pending Tender',
            count: Math.max(0, totalPackages - totalTenders),
            total: totalPackages,
            href: '/packages?filter=pending_tender',
            icon: FileText,
            color: 'bg-blue-500',
            textColor: 'text-blue-600',
            bgLight: 'bg-blue-50',
            description: 'Packages awaiting Tender publication'
        },
        {
            name: 'Pending Approval',
            count: Math.max(0, totalTenders - totalApprovals),
            total: totalTenders,
            href: '/tenders?filter=pending_approval',
            icon: CheckCircle,
            color: 'bg-emerald-500',
            textColor: 'text-emerald-600',
            bgLight: 'bg-emerald-50',
            description: 'Tenders awaiting final technical approval'
        },
        {
            name: 'Pending LOA',
            count: Math.max(0, totalTenders - totalLOAs),
            total: totalTenders,
            href: '/tenders?filter=pending_loa',
            icon: Award,
            color: 'bg-purple-500',
            textColor: 'text-purple-600',
            bgLight: 'bg-purple-50',
            description: 'Approved tenders awaiting Letter of Acceptance'
        },
        {
            name: 'Pending Work Order',
            count: Math.max(0, totalLOAs - totalWorkOrders),
            total: totalLOAs,
            href: '/loas?filter=pending',
            icon: ClipboardList,
            color: 'bg-rose-500',
            textColor: 'text-rose-600',
            bgLight: 'bg-rose-50',
            description: 'Accepted tenders awaiting Work Order / Agreement'
        }
    ];

    const today = new Date().toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20">
            {/* Decorative background blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/5 blur-[120px]"></div>
                <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] rounded-full bg-indigo-400/5 blur-[100px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 relative z-10">
                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            Infrastructure <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Intelligence</span>
                        </h1>
                        <p className="text-slate-500 font-medium flex items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                            Live system status for {process.env.NEXT_PUBLIC_APP_NAME || 'Division Dashboard'}
                        </p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-sm border border-slate-200/60 text-slate-600 text-sm font-semibold flex items-center">
                        <ClipboardList className="w-4 h-4 mr-2 text-blue-500" />
                        {today}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => {
                        const progress = stat.total > 0 ? (stat.count / stat.total) * 100 : 0;
                        const segments = 5;
                        const filledSegments = Math.floor((progress / 100) * segments);

                        return (
                            <Link 
                                key={stat.name} 
                                href={stat.href}
                                className="relative group transition-all duration-500 hover:-translate-y-3 aspect-square cursor-pointer"
                            >
                                {/* Enhanced Multi-Layer Shadow */}
                                <div className={`absolute -inset-1 rounded-none opacity-0 group-hover:opacity-40 transition-opacity duration-700 bg-gradient-to-br ${stat.color.replace('bg-', 'from-')} to-transparent blur-2xl -z-10`}></div>
                                
                                <div className="relative h-full bg-white/40 backdrop-blur-3xl p-6 rounded-none border border-white/40 shadow-xl shadow-slate-200/50 flex flex-col justify-between overflow-hidden group-hover:border-white/60 transition-colors duration-500">
                                    {/* Floating Glowing Icon */}
                                    <div className={`absolute -top-6 -right-6 p-10 rounded-none ${stat.bgLight} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-700`}></div>
                                    <div className={`absolute top-4 right-4 p-2.5 rounded-none ${stat.bgLight} ${stat.textColor} shadow-lg shadow-black/5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}>
                                        <stat.icon className="h-5 w-5" />
                                    </div>

                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">Pending Priority</span>
                                        
                                        <div className="flex items-end gap-3 mb-6">
                                            <h2 className={`text-5xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br ${stat.color.replace('bg-', 'from-')} to-slate-900`}>
                                                {stat.count}
                                            </h2>
                                            <div className="pb-1">
                                                <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-none ${stat.bgLight} ${stat.textColor} border border-white/20`}>
                                                    {progress.toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                               <p className="text-lg font-black text-slate-800 tracking-tight">{stat.name}</p>
                                               <span className="text-[11px] font-bold text-slate-400">OF {stat.total}</span>
                                            </div>

                                            {/* Segmented Modern Progress Bar */}
                                            <div className="flex gap-1.5 h-1.5 w-full">
                                                {[...Array(segments)].map((_, i) => (
                                                    <div 
                                                        key={i}
                                                        className={`flex-1 rounded-full transition-all duration-700 delay-[${i * 100}ms] ${
                                                            i < filledSegments 
                                                                ? `${stat.color} shadow-[0_0_8px_rgba(0,0,0,0.1)] group-hover:shadow-[0_0_12px_${stat.color.replace('bg-', 'rgba(')}]` 
                                                                : 'bg-slate-200/50'
                                                        }`}
                                                    ></div>
                                                ))}
                                            </div>
                                        </div>

                                        <p className="mt-6 text-sm text-slate-500 font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                            {stat.description}
                                        </p>
                                    </div>

                                    <div className="mt-8">
                                        <div className={`w-full group/btn relative inline-flex items-center justify-center px-6 py-3 rounded-none text-sm font-black transition-all duration-300 overflow-hidden`}>
                                            <div className={`absolute inset-0 ${stat.bgLight} opacity-50 group-hover/btn:opacity-100 transition-opacity`}></div>
                                            <span className={`relative flex items-center ${stat.textColor}`}>
                                                SYSTEM ANALYSIS
                                                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transform transition-transform group-hover/btn:translate-x-1" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>

                        );
                    })}
                </div>

                {/* Quick Summary Section */}
                <div className="relative overflow-hidden rounded-[32px] p-[1px] bg-gradient-to-r from-blue-600 to-indigo-600 shadow-2xl shadow-blue-500/20">
                    <div className="relative bg-slate-900/10 backdrop-blur-sm p-8 sm:p-12 md:flex md:items-center md:justify-between text-white overflow-hidden">
                        {/* Decorative patterns */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>

                        <div className="relative z-10 max-w-2xl">
                            <h3 className="text-2xl sm:text-3xl font-black mb-4 tracking-tight">System Statistics overview</h3>
                            <p className="text-blue-100 text-lg font-medium opacity-90 leading-relaxed">
                                Comprehensive real-time tracking of the entire project lifecycle, enabling data-driven governance and operational transparency.
                            </p>
                        </div>
                        <div className="relative z-10 mt-10 md:mt-0 flex gap-6">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[24px] px-8 py-6 text-center min-w-[160px] transition-transform hover:scale-105">
                                <p className="text-xs text-blue-200 font-black uppercase tracking-widest mb-2">Total Packages</p>
                                <p className="text-5xl font-black">{totalPackages}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
