'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* Mobile Header (Hamburger Menu) */}
            <MobileHeader onMenuOpen={() => setIsSidebarOpen(true)} />

            {/* Sidebar with state support */}
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full md:ml-64 p-4 sm:p-6 lg:p-8 pt-20 md:pt-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
