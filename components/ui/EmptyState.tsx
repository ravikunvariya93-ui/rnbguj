import type { ReactNode } from 'react';

// Canonical empty/placeholder block (replaces dashed-border one-offs).
export default function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center space-y-3">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      {hint ? <p className="text-[11px] text-slate-400 font-medium -mt-2">{hint}</p> : null}
      {action}
    </div>
  );
}
