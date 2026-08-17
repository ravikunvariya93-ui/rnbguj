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
  cellClassName?: string | ((row: any, index: number) => string);
  headerClassName?: string;
  footerClassName?: string;
  footer?: React.ReactNode | ((data: any[]) => React.ReactNode);
  render?: (row: any, index: number) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  emptyMessage?: string;
  actions?: (row: any, index: number) => React.ReactNode;
  exportFilename?: string;
  theme?: 'default' | 'emerald';
}

export default function DataTable({ columns, data, emptyMessage = 'No data available.', actions, exportFilename, theme = 'default' }: DataTableProps) {
  const tableIdBase = useId();
  const tableId = `data-table-${tableIdBase.replace(/:/g, '')}`;
  const totalColumns = columns.length + (actions ? 1 : 0);
  const isEmerald = theme === 'emerald';
  const hasFooter = columns.some(col => col.footer !== undefined);

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
      <div className={`overflow-x-auto border ${isEmerald ? 'border-emerald-300' : 'border-slate-300'} shadow-sm rounded-md`}>
        <table id={tableId} className="w-full text-left border-collapse text-xs font-medium">
        <thead>
          <tr className={`${isEmerald ? 'bg-emerald-100/80 border-b border-emerald-300' : 'bg-slate-100 border-b border-slate-300'}`}>
            {columns.map((col, colIdx) => {
              const isLast = !actions && colIdx === columns.length - 1;
              const customHeaderClass = col.headerClassName ? ` ${col.headerClassName}` : '';
              const borderClass = isLast ? '' : (isEmerald ? ' border-r border-emerald-300' : ' border-r border-slate-300');
              const textColor = isEmerald ? 'text-emerald-950' : 'text-slate-700';
              const baseClass = `px-3 py-2.5 font-medium ${textColor}${borderClass}${getAlignClass(col.align)}${customHeaderClass}`;

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
              <th scope="col" className={`px-3 py-2.5 font-medium ${isEmerald ? 'text-emerald-950' : 'text-slate-700'} text-right`}>
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className={`divide-y ${isEmerald ? 'divide-emerald-200' : 'divide-slate-200'}`}>
          {data.length > 0 ? (
            data.map((row: any, index: number) => {
              const rowBg = isEmerald
                ? (index % 2 === 0 ? 'bg-emerald-50/50' : 'bg-emerald-100/40')
                : (index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50');
              const hoverBg = isEmerald ? 'hover:bg-emerald-100/80' : 'hover:bg-emerald-50/80';

              return (
                <tr key={row._id ?? index} className={`${rowBg} ${hoverBg} transition-colors`}>
                  {columns.map((col, colIdx) => {
                    const isLast = !actions && colIdx === columns.length - 1;
                    const borderClass = isLast ? '' : (isEmerald ? ' border-r border-emerald-200' : ' border-r border-slate-200');
                    const textClass = isEmerald ? 'text-emerald-950' : 'text-slate-800';
                    const customCellClass = typeof col.cellClassName === 'function'
                      ? ` ${col.cellClassName(row, index)}`
                      : (col.cellClassName ? ` ${col.cellClassName}` : '');
                    const cellClass = `px-3 py-2 ${textClass}${borderClass}${getAlignClass(col.align)}${col.minWidth ? ` min-w-[${col.minWidth}]` : ''}${customCellClass}`;

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
              <td colSpan={totalColumns} className={`px-4 py-8 text-center ${isEmerald ? 'text-emerald-700 bg-emerald-50/30' : 'text-slate-500'}`}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
        {hasFooter && data.length > 0 && (
          <tfoot className={`font-bold border-t-2 ${isEmerald ? 'bg-emerald-100/90 text-emerald-950 border-emerald-300' : 'bg-slate-100 text-slate-900 border-slate-300'}`}>
            <tr>
              {columns.map((col, colIdx) => {
                const isLast = !actions && colIdx === columns.length - 1;
                const borderClass = isLast ? '' : (isEmerald ? ' border-r border-emerald-300' : ' border-r border-slate-300');
                const customFooterClass = col.footerClassName ? ` ${col.footerClassName}` : '';
                const footerClass = `px-3 py-2.5 ${borderClass}${getAlignClass(col.align)}${customFooterClass}`;
                
                const footerContent = typeof col.footer === 'function'
                  ? col.footer(data)
                  : (col.footer ?? '');

                return (
                  <td key={`footer-${col.key}`} className={footerClass}>
                    {footerContent}
                  </td>
                );
              })}
              {actions && (
                <td className="px-3 py-2.5" />
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
    </div>
  );
}
