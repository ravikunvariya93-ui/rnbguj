import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Single source of truth for buttons. Before: rounded-lg/xl/md, emerald-600
// vs #107c41, font-bold vs semibold scattered across ~40 call sites.
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 border border-transparent shadow-xs',
  secondary: 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-2xs',
  danger: 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 shadow-2xs',
  ghost: 'bg-transparent text-emerald-700 hover:bg-emerald-50 border border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-xs',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md') {
  return `inline-flex items-center justify-center gap-1.5 font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]}`;
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`${buttonClass(variant, size)} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = 'primary', size = 'md', className = '', children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link href={href} prefetch className={`${buttonClass(variant, size)} ${className}`}>
      {children}
    </Link>
  );
}
