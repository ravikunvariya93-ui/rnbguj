import type { ReactNode } from 'react';

// Canonical status pill. Consolidates the per-page badgeClass if-chains
// (emerald/indigo/amber/rose/slate) into one tone map.
type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

const TONES: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

const TENDER_STATUS_TONE: Record<string, Tone> = {
  Cancelled: 'danger',
  'Work Order Issued': 'success',
  'LOA Issued': 'success',
  'Tender Approved': 'info',
  'Approved (No Sanction Req.)': 'info',
  'Proposal Submitted': 'warning',
  Tendered: 'neutral',
};

export function toneForTenderStatus(status: string): Tone {
  return TENDER_STATUS_TONE[status] ?? 'neutral';
}

export default function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
