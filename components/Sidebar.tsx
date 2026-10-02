'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { memo, useEffect, useMemo, useState } from 'react';
import {
    Building2, FileText, Home, CheckCircle,
    Package, Layers, X, User, LogOut, Users, ClipboardList, TrendingUp, Landmark, BarChart3,
    Shield, MapPin, ChevronDown, BookOpen, ListTodo
} from 'lucide-react';
import { ROLE_LABELS } from '@/lib/roles';
import { MODULES, canAccessModule } from '@/lib/access';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

interface SessionUser {
    role?: string;
    roles?: string[];
    roleLabel?: string;
    modules?: string[];
    name?: string;
    username?: string;
}

const MODULE_ICONS: Record<string, typeof Home> = {
    dashboard: Home,
    tasks: ListTodo,
    'approved-works': CheckCircle,
    'technical-sanctions': Layers,
    packages: Package,
    committee: Landmark,
    tenders: FileText,
    agreements: ClipboardList,
    bills: FileText,
    'excess-proposals': TrendingUp,
    contractors: User,
    reports: BarChart3,
};

const ADMIN_LINKS = [
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Roles', href: '/admin/roles', icon: Shield },
    { name: 'Jurisdictions', href: '/admin/jurisdictions', icon: MapPin },
];

export default memo(function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const sessionUser = session?.user as SessionUser | undefined;

    // Server-side identity fallback: the client JWT can predate access
    // updates (roles/modules), and next-auth never refreshes those fields
    // on its own. Resolve the truth from /api/me (DB-backed, keyed by the
    // stable token sub) so the menu works without forcing a re-login.
    const [serverIdentity, setServerIdentity] = useState<SessionUser | null>(null);
    useEffect(() => {
        if (!sessionUser) return;
        if (
            sessionUser.role ||
            (Array.isArray(sessionUser.roles) && sessionUser.roles.length > 0) ||
            (Array.isArray(sessionUser.modules) && sessionUser.modules.length > 0)
        ) return;
        let cancelled = false;
        fetch('/api/me')
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!cancelled && data && (data.role || (Array.isArray(data.roles) && data.roles.length > 0))) {
                    setServerIdentity(data);
                }
            })
            .catch(() => null);
        return () => { cancelled = true; };
    }, [sessionUser?.username]);

    const user = useMemo(
        () => (serverIdentity ? { ...sessionUser, ...serverIdentity } : sessionUser),
        [sessionUser, serverIdentity],
    );

    // Main navigation is driven by the modules granted to the user's role.
    const filteredNavigation = useMemo(
        () =>
            MODULES.filter((m) => m.key !== 'admin').map((m) => ({
                name: m.label,
                href: m.href,
                icon: MODULE_ICONS[m.key] ?? FileText,
                moduleKey: m.key,
            })).filter((item) => canAccessModule(user, item.moduleKey)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user?.role, JSON.stringify(user?.modules)],
    );

    const showAdmin = useMemo(() => canAccessModule(user, 'admin'), [user?.role, user?.modules]);

    // Stale session (minted before roles/modules existed in the token) —
    // every module check fails and the nav renders empty. Surface an
    // actionable message instead of a blank sidebar.
    const hasSessionIdentity = !!user && (
        !!user.role ||
        (Array.isArray(user.roles) && user.roles.length > 0) ||
        (Array.isArray(user.modules) && user.modules.length > 0)
    );

    // PB group: Approved Work + TS
    const PB_KEYS = ['approved-works', 'technical-sanctions'];
    // Tender group: Package + Committee + Tender + Agreement + Contractor List
    const TENDER_KEYS = ['packages', 'committee', 'tenders', 'agreements', 'contractors'];
    // Bill group: Bill + Excess Proposal
    const BILL_KEYS = ['bills', 'excess-proposals'];
    const pbNavigation = filteredNavigation.filter((item) => PB_KEYS.includes(item.moduleKey));
    const tenderNavigation = filteredNavigation.filter((item) => TENDER_KEYS.includes(item.moduleKey));
    const billNavigation = filteredNavigation.filter((item) => BILL_KEYS.includes(item.moduleKey));
    const restNavigation = filteredNavigation.filter((item) => !PB_KEYS.includes(item.moduleKey) && !TENDER_KEYS.includes(item.moduleKey) && !BILL_KEYS.includes(item.moduleKey));
    const isPbActive = pbNavigation.some((item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
    const isTenderActive = tenderNavigation.some((item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
    const isBillActive = billNavigation.some((item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
    const isAdminActive = ADMIN_LINKS.some((item) => pathname === item.href || pathname.startsWith(item.href));
    const [pbOpen, setPbOpen] = useState(false);
    const [tenderOpen, setTenderOpen] = useState(false);
    const [billOpen, setBillOpen] = useState(false);
    const [adminOpen, setAdminOpen] = useState(false);

    useEffect(() => {
        if (isPbActive) setPbOpen(true);
    }, [isPbActive]);

    useEffect(() => {
        if (isTenderActive) setTenderOpen(true);
    }, [isTenderActive]);

    useEffect(() => {
        if (isBillActive) setBillOpen(true);
    }, [isBillActive]);

    useEffect(() => {
        if (isAdminActive) setAdminOpen(true);
    }, [isAdminActive]);

    // Human-readable role label for sidebar footer
    const roleLabel = user?.roleLabel || (user?.role ? (ROLE_LABELS[user.role] || user.role) : 'No Role');

    const renderNavItem = (item: { name: string; href: string; icon: typeof Home }) => {
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
    };

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
                        {user && !hasSessionIdentity ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                                <p className="font-bold text-amber-800">Session outdated</p>
                                <p className="text-amber-700 mt-1">Your login predates the latest access update, so no menu can be shown.</p>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    className="mt-3 w-full px-3 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors"
                                >
                                    Sign out & sign in again
                                </button>
                            </div>
                        ) : (
                            <>
                        {restNavigation.filter((item) => item.href === '/').map(renderNavItem)}
                        {/* PB group */}
                        {pbNavigation.length > 0 && (
                            <div className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() => setPbOpen((v) => !v)}
                                    aria-expanded={pbOpen}
                                    className={`group flex w-full items-center px-3 py-2 text-sm font-medium rounded-xl transition-all ${isPbActive
                                        ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                                        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                        }`}
                                >
                                    <BookOpen
                                        className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isPbActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`}
                                    />
                                    <span className="flex-1 text-left">PB</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${pbOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {pbOpen && (
                                    <div className="ml-4 pl-2 border-l border-gray-200 space-y-1">
                                        {pbNavigation.map(renderNavItem)}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Tender group */}
                        {tenderNavigation.length > 0 && (
                            <div className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() => setTenderOpen((v) => !v)}
                                    aria-expanded={tenderOpen}
                                    className={`group flex w-full items-center px-3 py-2 text-sm font-medium rounded-xl transition-all ${isTenderActive
                                        ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                                        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                        }`}
                                >
                                    <FileText
                                        className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isTenderActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`}
                                    />
                                    <span className="flex-1 text-left">Tender</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${tenderOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {tenderOpen && (
                                    <div className="ml-4 pl-2 border-l border-gray-200 space-y-1">
                                        {tenderNavigation.map(renderNavItem)}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Bill group */}
                        {billNavigation.length > 0 && (
                            <div className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() => setBillOpen((v) => !v)}
                                    aria-expanded={billOpen}
                                    className={`group flex w-full items-center px-3 py-2 text-sm font-medium rounded-xl transition-all ${isBillActive
                                        ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                                        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                        }`}
                                >
                                    <FileText
                                        className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isBillActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`}
                                    />
                                    <span className="flex-1 text-left">Bill</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${billOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {billOpen && (
                                    <div className="ml-4 pl-2 border-l border-gray-200 space-y-1">
                                        {billNavigation.map(renderNavItem)}
                                    </div>
                                )}
                            </div>
                        )}
                        {restNavigation.filter((item) => item.href !== '/' && item.moduleKey !== 'tasks').map(renderNavItem)}
                            </>
                        )}
                    </nav>
                    {/* Admin group */}
                    {showAdmin && (
                        <div className="mt-6 px-4 space-y-1">
                            <button
                                type="button"
                                onClick={() => setAdminOpen((v) => !v)}
                                aria-expanded={adminOpen}
                                className={`group flex w-full items-center px-3 py-2 text-sm font-medium rounded-xl transition-all ${isAdminActive
                                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                            >
                                <Shield
                                    className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isAdminActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`}
                                />
                                <span className="flex-1 text-left">Admin</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {adminOpen && (
                                <div className="ml-4 pl-2 border-l border-gray-200 space-y-1">
                                    {ADMIN_LINKS.map((item) => {
                                        const isActive = pathname === item.href || pathname.startsWith(item.href);
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
                                </div>
                            )}
                        </div>
                    )}
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
})
