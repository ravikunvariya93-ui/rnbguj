'use client';

import { Menu, Building2 } from 'lucide-react';

interface MobileHeaderProps {
    onMenuOpen: () => void;
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
    return (
        <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 h-16 px-4 fixed top-0 w-full z-30 shadow-sm">
            <div className="flex items-center gap-2">
                <Building2 className="h-7 w-7 text-blue-600" />
                <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-900 leading-tight">Panchayat R&B</span>
                    <span className="text-[10px] text-gray-500 font-medium tracking-tight">Bhavnagar</span>
                </div>
            </div>
            
            <button
                onClick={onMenuOpen}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                aria-label="Open sidebar"
            >
                <Menu className="h-6 w-6" />
            </button>
        </header>
    );
}
