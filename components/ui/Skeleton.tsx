export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="h-4 w-8 animate-pulse rounded bg-slate-100" />
      <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6" aria-hidden="true">
      <div className="h-5 w-48 animate-pulse rounded-md bg-slate-200 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
