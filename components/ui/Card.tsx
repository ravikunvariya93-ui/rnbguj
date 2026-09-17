import type { ReactNode } from 'react';

// Canonical card + section header. Replaces 3+ ad-hoc variants
// (border-slate-200/slate-100/gray-100, rounded-2xl, p-6/p-8).
export default function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
        {subtitle ? <p className="text-xs text-slate-500 font-medium">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
