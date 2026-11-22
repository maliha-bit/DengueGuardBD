import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/lib/useMediaQuery';

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** The card title on phones (one column should set this). */
  primary?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  /** Accessible name (table caption / list label). */
  caption: string;
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Buttons for one row (last column on desktop, card footer on phones). */
  actions?: (row: T) => ReactNode;
  className?: string;
}

/**
 * Table on wide screens; a list of cards below 1024px (phones, and tablets where the sidebar
 * leaves too little room for columns) so nothing scrolls sideways.
 * Rows carry `data-row` so tests can find them in either layout.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  actions,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const wide = useMediaQuery('(min-width: 1024px)');
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);

  if (!wide) {
    return (
      <ul aria-label={caption} className={cn('flex flex-col gap-3', className)}>
        {rows.map((row) => (
          <li key={rowKey(row)} data-row className="rounded-2xl bg-brand-canvas p-4">
            {primary && <div className="font-semibold">{primary.cell(row)}</div>}
            <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-sm">
              {rest.map((column) => (
                <div key={column.key} className="contents">
                  <dt className="text-brand-muted">{column.header}</dt>
                  <dd className="min-w-0 break-words">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
            {actions && <div className="mt-3 flex flex-wrap gap-2">{actions(row)}</div>}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="border-b border-brand-line px-3 py-2.5 text-xs font-medium text-brand-muted"
              >
                {column.header}
              </th>
            ))}
            {actions && (
              <th
                scope="col"
                className="border-b border-brand-line px-3 py-2.5 text-right text-xs font-medium text-brand-muted"
              >
                {t('staff.table.actions')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} data-row className="align-middle">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'border-b border-brand-line px-3 py-2.5',
                    column.primary && 'font-medium',
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
              {actions && (
                <td className="border-b border-brand-line px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-2">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
