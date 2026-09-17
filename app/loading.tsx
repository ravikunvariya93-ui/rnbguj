import { PageSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
    return (
        <div className="w-full space-y-6" aria-busy="true" aria-label="Loading">
            <div className="flex flex-col gap-1">
                <div className="h-7 w-64 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-slate-100" />
            </div>
            <PageSkeleton rows={6} />
        </div>
    );
}
