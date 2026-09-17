import type { ReactNode } from 'react';

// Canonical list-page header: title + subtitle left, actions right.
// Replaces the dozen hand-rolled flex headers across list pages.
export default function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle ? <p className="text-xs text-slate-500 font-medium">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
