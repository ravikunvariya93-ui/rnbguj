'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const { status } = useSession();

    const isLoginPage = pathname === '/login';
    const showLayout = !isLoginPage && status === 'authenticated';

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* Mobile Header (Hamburger Menu) */}
            {showLayout && <MobileHeader onMenuOpen={() => setIsSidebarOpen(true)} />}

            {/* Sidebar with state support */}
            {showLayout && (
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)} 
                />
            )}

            {/* Main Content Area */}
            <main className={`flex-1 overflow-y-auto w-full ${showLayout ? 'md:ml-64 pt-20 md:pt-8' : ''} p-4 sm:p-6 lg:p-8`}>
                <div className={`${isLoginPage ? 'h-full flex items-center justify-center' : 'max-w-7xl mx-auto'}`}>
                    {children}
                </div>
            </main>
        </div>
    );
}
