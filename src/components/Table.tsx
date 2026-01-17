import React from 'react';

/**
 * Column definition for Table component
 * Defines how each column should render data
 */
export interface ColumnDef<T> {
  /** Key to access data from row object */
  key: keyof T;
  /** Column header label */
  label: string;
  /** Optional custom render function */
  render?: (value: any, item: T, index: number) => React.ReactNode;
  /** Column width on desktop (e.g., "100px", "20%") - not used on mobile */
  width?: string;
  /** Hide column on mobile devices (< md breakpoint) */
  mobileHidden?: boolean;
}

export interface TableProps<T> {
  /** Array of data to display */
  data: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Unique key accessor for React list rendering */
  rowKey?: (item: T, index: number) => string | number;
  /** Optional row click handler */
  onRowClick?: (item: T, index: number) => void;
  /** Show loading skeleton */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Row hover effect (desktop only) */
  hoverable?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Custom row className */
  rowClassName?: string;
  /** Dark theme (for admin dashboard) */
  dark?: boolean;
}

/**
 * Responsive Table component for EventNexus
 * 
 * Desktop (md+): Full table layout
 * Mobile (<md): Card-based layout
 * 
 * Features:
 * - Fully responsive
 * - Touch-friendly on mobile (min 44px heights)
 * - Keyboard navigation support
 * - Accessible (semantic HTML, ARIA labels)
 * - Dark mode support for admin
 * 
 * @example
 * const columns = [
 *   { key: 'name', label: 'Name' },
 *   { key: 'email', label: 'Email', mobileHidden: true },
 *   { key: 'status', label: 'Status', render: (val) => <Badge>{val}</Badge> }
 * ];
 * <Table data={users} columns={columns} />
 */
export const Table = React.forwardRef<HTMLDivElement, TableProps<any>>(
  (
    {
      data,
      columns,
      rowKey = (_, idx) => idx,
      onRowClick,
      loading = false,
      emptyMessage = 'No data available',
      hoverable = true,
      striped = true,
      rowClassName = '',
      dark = false,
    },
    ref
  ) => {
    const visibleColumns = columns.filter(col => !col.mobileHidden);
    const mobileColumns = columns.filter(col => col.mobileHidden !== true); // Show all on mobile

    // Desktop theme
    const desktopTheme = dark
      ? {
          table: 'w-full',
          thead: 'bg-slate-800 border-b border-slate-700',
          th: 'px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wider',
          tbody: 'divide-y divide-slate-800',
          tr: `${hoverable ? 'hover:bg-slate-800/50' : ''} transition-colors ${striped ? 'odd:bg-slate-900/50' : ''}`,
          td: 'px-4 md:px-6 py-4 md:py-5 text-sm text-slate-300',
        }
      : {
          table: 'w-full',
          thead: 'bg-slate-100 border-b border-slate-300',
          th: 'px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-slate-900 uppercase tracking-wider',
          tbody: 'divide-y divide-slate-200',
          tr: `${hoverable ? 'hover:bg-slate-50' : ''} transition-colors ${striped ? 'odd:bg-slate-50' : ''}`,
          td: 'px-4 md:px-6 py-4 md:py-5 text-sm text-slate-900',
        };

    // Mobile card theme
    const mobileTheme = dark
      ? {
          card: 'bg-slate-900 border border-slate-800 rounded-lg p-4',
          label: 'text-xs font-bold text-slate-500 uppercase tracking-wider',
          value: 'text-sm md:text-base text-slate-300 font-medium',
        }
      : {
          card: 'bg-white border border-slate-200 rounded-lg p-4',
          label: 'text-xs font-bold text-slate-600 uppercase tracking-wider',
          value: 'text-sm md:text-base text-slate-900 font-medium',
        };

    if (loading) {
      return (
        <div ref={ref} className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`${dark ? 'bg-slate-800' : 'bg-slate-200'} h-12 rounded-lg animate-pulse`} />
          ))}
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div
          ref={ref}
          className={`flex items-center justify-center py-12 rounded-lg border-2 border-dashed ${
            dark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-50'
          }`}
        >
          <p className={dark ? 'text-slate-500' : 'text-slate-600'}>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div ref={ref} className="space-y-4">
        {/* Desktop table - hidden on mobile */}
        <div className="hidden md:block overflow-x-auto rounded-lg border" style={{ borderColor: dark ? '#1e293b' : '#e2e8f0' }}>
          <table className={desktopTheme.table}>
            <thead className={desktopTheme.thead}>
              <tr>
                {visibleColumns.map(col => (
                  <th key={String(col.key)} className={desktopTheme.th} style={col.width ? { width: col.width } : {}}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={desktopTheme.tbody}>
              {data.map((item, idx) => (
                <tr
                  key={rowKey(item, idx)}
                  className={`${desktopTheme.tr} ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName}`}
                  onClick={() => onRowClick?.(item, idx)}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick(item, idx);
                    }
                  }}
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {visibleColumns.map(col => (
                    <td key={String(col.key)} className={desktopTheme.td}>
                      {col.render ? col.render(item[col.key], item, idx) : String(item[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards - shown only on mobile */}
        <div className="md:hidden space-y-3">
          {data.map((item, idx) => (
            <div
              key={rowKey(item, idx)}
              className={`${mobileTheme.card} ${onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${rowClassName}`}
              onClick={() => onRowClick?.(item, idx)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(item, idx);
                }
              }}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              <div className="space-y-3">
                {mobileColumns.map((col, colIdx) => (
                  <div key={String(col.key)} className={colIdx > 0 ? 'pt-2 border-t' : ''} style={colIdx > 0 ? { borderColor: dark ? '#334155' : '#e2e8f0' } : {}}>
                    <p className={mobileTheme.label}>{col.label}</p>
                    <p className={mobileTheme.value}>
                      {col.render ? col.render(item[col.key], item, idx) : String(item[col.key] ?? '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

Table.displayName = 'Table';

export default Table;
