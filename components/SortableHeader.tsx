'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Suspense } from 'react';

interface SortableHeaderProps {
    field: string;
    label: string;
    className?: string;
}

function SortableHeaderInner({ field, label, className }: SortableHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentSort = searchParams.get('sort');
    const currentOrder = searchParams.get('order');

    const isActive = currentSort === field;

    const handleSort = () => {
        const params = new URLSearchParams(searchParams.toString());
        
        if (isActive) {
            if (currentOrder === 'asc') {
                params.set('order', 'desc');
            } else if (currentOrder === 'desc') {
                params.delete('sort');
                params.delete('order');
            } else {
                params.set('order', 'asc');
            }
        } else {
            params.set('sort', field);
            params.set('order', 'asc');
        }

        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <th 
            scope="col" 
            className={`cursor-pointer group hover:bg-gray-100 transition-colors ${className}`}
            onClick={handleSort}
        >
            <div className="flex items-center gap-1 select-none">
                {label}
                <span className="text-gray-400 group-hover:text-gray-600 flex-shrink-0">
                    {isActive ? (
                        currentOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                </span>
            </div>
        </th>
    );
}

export default function SortableHeader(props: SortableHeaderProps) {
    return (
        <Suspense fallback={<th scope="col" className={props.className}>{props.label}</th>}>
            <SortableHeaderInner {...props} />
        </Suspense>
    );
}
