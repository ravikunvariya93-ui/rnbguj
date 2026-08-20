'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
    Building2, FileText, Home, CheckCircle, 
    Package, Layers, X, User, LogOut, Users, ClipboardList, TrendingUp, Landmark 
} from 'lucide-react';
import { ALL_AUDITOR_ROLES, ROLE_LABELS, isAuditorRole } from '@/lib/roles';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const AUDITOR_ROLES = ALL_AUDITOR_ROLES;

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user as any;

    const navigation = [
        { name: 'Dashboard',       href: '/',                  icon: Home,          roles: ['ADMIN', 'SUPERVISOR', 'VIEWER', 'TENDERCLERK', ...AUDITOR_ROLES] },
        { name: 'Approved Work',   href: '/approved-works',    icon: CheckCircle,   roles: ['ADMIN', 'SUPERVISOR', 'VIEWER', 'TENDERCLERK', ...AUDITOR_ROLES] },
        { name: 'TS',              href: '/technical-sanctions', icon: Layers,      roles: ['ADMIN', 'SUPERVISOR', 'VIEWER', 'TENDERCLERK', ...AUDITOR_ROLES] },
        { name: 'Package',         href: '/packages',          icon: Package,       roles: ['ADMIN', 'SUPERVISOR', 'VIEWER', 'TENDERCLERK', ...AUDITOR_ROLES] },
        { name: 'Committee',       href: '/committee',         icon: Landmark,      roles: ['ADMIN', 'SUPERVISOR', 'VIEWER', 'TENDERCLERK', ...AUDITOR_ROLES] },
        { name: 'Tender',          href: '/tenders',           icon: FileText,      roles: ['ADMIN', 'SUPERVISOR', 'VIEWER', 'TENDERCLERK', ...AUDITOR_ROLES] },
        { name: 'Agreement',       href: '/agreements',        icon: ClipboardList, roles: ['ADMIN', 'SUPERVISOR', 'VIEWER', 'TENDERCLERK', ...AUDITOR_ROLES] },
        { name: 'Bill',            href: '/bills',             icon: FileText,      roles: ['ADMIN', 'SUPERVISOR', 'VIEWER', ...AUDITOR_ROLES] },
        { name: 'Excess Proposal', href: '/excess-proposals',  icon: TrendingUp,    roles: ['ADMIN', 'SUPERVISOR', 'VIEWER', 'TENDERCLERK', ...AUDITOR_ROLES] },
        { name: 'User Management', href: '/admin/users',       icon: Users,         roles: ['ADMIN'] },
    ];

    const filteredNavigation = navigation.filter(item => 
        !item.roles || (user?.role && item.roles.includes(user.role))
    );

    // Human-readable role label for sidebar footer
    const roleLabel = user?.role ? (ROLE_LABELS[user.role] || user.role) : 'No Role';

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300 screen-only"
                    onClick={onClose}
                />
            )}

            {/* Sidebar drawer */}
            <aside className={`fixed inset-y-0 left-0 bg-white border-r border-gray-200 w-64 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:flex md:flex-col screen-only`}>
                {/* Logo Section */}
                <div className="flex flex-col items-center justify-center h-20 border-b border-gray-200 px-4 relative">
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-600 p-1.5 rounded-xl shadow-sm">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <span className="font-bold text-lg text-gray-900 leading-tight">Panchayat R&B</span>
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold mt-1">Bhavnagar</span>

                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-500 md:hidden"
                        aria-label="Close sidebar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
                    <nav className="mt-5 flex-1 px-4 space-y-1">
                        {filteredNavigation.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all ${isActive
                                        ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                                        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                        }`}
                                >
                                    <item.icon
                                        className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'
                                            }`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* User Profile / Footer */}
                <div className="flex-shrink-0 flex flex-col border-t border-gray-200 p-4 space-y-2">
                    <Link 
                        href="/profile"
                        className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                            pathname === '/profile' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-emerald-50'
                        }`}
                    >
                        <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <User className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold truncate text-slate-800">{user?.name || 'Guest User'}</p>
                            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider truncate">{roleLabel}</p>
                        </div>
                    </Link>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center gap-3 p-2 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-semibold"
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}
