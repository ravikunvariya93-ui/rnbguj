'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface DeleteButtonProps {
    itemId: string;
    itemName: string;
    apiPath: string; // e.g., '/api/approved-works'
    redirectPath?: string; // Optional redirect after delete
}

export default function GenericDeleteButton({ itemId, itemName, apiPath, redirectPath }: DeleteButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${itemName}"?`)) {
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch(`${apiPath}/${itemId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                if (redirectPath) {
                    router.push(redirectPath);
                } else {
                    router.refresh();
                }
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete item');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('An error occurred while deleting the item');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-900 transition-colors p-1 disabled:opacity-50"
            title="Delete Item"
        >
            <Trash2 className="w-5 h-5" />
        </button>
    );
}
