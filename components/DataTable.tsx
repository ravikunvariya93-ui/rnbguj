import React, { useId } from 'react';
import SortableHeader from './SortableHeader';
import ExportTableButton from './ExportTableButton';
import PrintTableButton from './PrintTableButton';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  minWidth?: string;
  render?: (row: any, index: number) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  emptyMessage?: string;
  actions?: (row: any, index: number) => React.ReactNode;
  exportFilename?: string;
}

export default function DataTable({ columns, data, emptyMessage = 'No data available.', actions, exportFilename }: DataTableProps) {
  const tableIdBase = useId();
  const tableId = `data-table-${tableIdBase.replace(/:/g, '')}`;
  const totalColumns = columns.length + (actions ? 1 : 0);

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return ' text-center';
    if (align === 'right') return ' text-right';
    return '';
  };

  return (
    <div className="space-y-3">
      {data.length > 0 && (
        <div className="flex justify-end gap-2 screen-only">
          <ExportTableButton tableId={tableId} filename={exportFilename || 'Export.xlsx'} />
          <PrintTableButton />
        </div>
      )}
      <div className="overflow-x-auto border border-slate-300 shadow-sm rounded-md">
        <table id={tableId} className="w-full text-left border-collapse text-xs font-medium">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            {columns.map((col, colIdx) => {
              const isLast = !actions && colIdx === columns.length - 1;
              const baseClass = `px-3 py-2.5 font-medium text-slate-700${isLast ? '' : ' border-r border-slate-300'}${getAlignClass(col.align)}`;

              if (col.sortable) {
                return (
                  <SortableHeader
                    key={col.key}
                    field={col.key}
                    label={col.label}
                    className={baseClass}
                  />
                );
              }

              return (
                <th key={col.key} scope="col" className={baseClass}>
                  {col.label}
                </th>
              );
            })}
            {actions && (
              <th scope="col" className="px-3 py-2.5 font-medium text-slate-700 text-right">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.length > 0 ? (
            data.map((row: any, index: number) => {
              const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';

              return (
                <tr key={row._id ?? index} className={`${rowBg} hover:bg-emerald-50/80 transition-colors`}>
                  {columns.map((col, colIdx) => {
                    const isLast = !actions && colIdx === columns.length - 1;
                    const cellClass = `px-3 py-2 text-slate-800${isLast ? '' : ' border-r border-slate-200'}${getAlignClass(col.align)}${col.minWidth ? ` min-w-[${col.minWidth}]` : ''}`;

                    const content = col.render
                      ? col.render(row, index)
                      : (row[col.key] ?? '-');

                    return (
                      <td key={col.key} className={cellClass}>
                        {content}
                      </td>
                    );
                  })}
                  {actions && (
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {actions(row, index)}
                    </td>
                  )}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={totalColumns} className="px-4 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
}
