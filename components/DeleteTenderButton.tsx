'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    tenderId: string;
    tenderName: string;
}

export default function DeleteTenderButton({ tenderId, tenderName }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        const confirmed = window.confirm(`Are you sure you want to delete tender "${tenderName}"? This will also delete any associated Approval, LOA, and Work Order records.`);
        
        if (!confirmed) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/tenders/${tenderId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete tender');
            }

            router.refresh();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-700 transition-colors p-2 disabled:opacity-50"
            title="Delete Tender"
        >
            {isDeleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Trash2 className="w-5 h-5" />
            )}
        </button>
    );
}
