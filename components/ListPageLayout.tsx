import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';
import SearchBar from './SearchBar';

interface ListPageLayoutProps {
  title: string;
  subtitle?: string;
  addHref?: string;
  addLabel?: string;
  searchPlaceholder?: string;
  filterActive?: boolean;
  clearFiltersHref?: string;
  extraActions?: React.ReactNode;
  children: React.ReactNode;
}

export default function ListPageLayout({
  title,
  subtitle,
  addHref,
  addLabel = 'Add New',
  searchPlaceholder,
  filterActive,
  clearFiltersHref,
  extraActions,
  children,
}: ListPageLayoutProps) {
  return (
    <div className="max-w-[100%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900">{title}</h1>
            {filterActive && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Filter className="w-3 h-3 mr-1" /> Filter Active
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-700">{subtitle}</p>
          )}
        </div>
        {(addHref || extraActions) && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center gap-2">
            {extraActions}
            {addHref && (
              <Link
                href={addHref}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" /> {addLabel}
              </Link>
            )}
          </div>
        )}
      </div>

      {searchPlaceholder && (
        <div className="mt-6 flex justify-start items-center">
          <Suspense fallback={<div className="h-10 w-full max-w-lg bg-gray-100 animate-pulse rounded-md" />}>
            <SearchBar placeholder={searchPlaceholder} />
          </Suspense>
          {filterActive && clearFiltersHref && (
            <Link href={clearFiltersHref} className="ml-4 text-sm text-blue-600 hover:text-blue-900">
              Clear all filters
            </Link>
          )}
        </div>
      )}

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
