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
                        return (
                            <div key={stat.name} className="relative group p-[1px] rounded-3xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
                                {/* Animated border gradient */}
                                <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${stat.color.replace('bg-', 'from-')}/40 to-transparent`}></div>
                                
                                <div className="relative bg-white/90 backdrop-blur-xl p-8 rounded-[23px] shadow-sm border border-slate-200/60 h-full flex flex-col justify-between overflow-hidden">
                                    {/* Subtle background icon */}
                                    <stat.icon className={`absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.03] text-black transform -rotate-12 transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110`} />

                                    <div>
                                        <div className="flex items-start justify-between">
                                            <div className={`p-3.5 rounded-2xl ${stat.bgLight} ${stat.textColor} shadow-inner`}>
                                                <stat.icon className="h-6 w-6" />
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pending</span>
                                                <h2 className="text-4xl font-black text-slate-900 leading-none">{stat.count}</h2>
                                            </div>
                                        </div>

                                        <div className="mt-8 space-y-2">
                                            <div className="flex justify-between items-end">
                                               <p className="text-[15px] font-bold text-slate-700">{stat.name}</p>
                                               <span className="text-xs font-bold text-slate-400">Total {stat.total}</span>
                                            </div>
                                            {/* Premium Progress Bar */}
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ease-out rounded-full ${stat.color}`}
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <p className="mt-4 text-sm text-slate-500 font-medium leading-relaxed">
                                            {stat.description}
                                        </p>
                                    </div>

                                    <div className="mt-8">
                                        <Link 
                                            href={stat.href}
                                            className={`w-full inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${stat.textColor} ${stat.bgLight} hover:bg-white hover:shadow-lg border border-transparent hover:border-slate-100 group/btn`}
                                        >
                                            View Detailed Analysis
                                            <ArrowRight className="ml-2 h-4 w-4 transform transition-transform group-hover/btn:translate-x-1" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
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
