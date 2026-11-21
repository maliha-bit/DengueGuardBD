import { useCallback } from 'react';
import { useLogExport } from '@/api/staffQueries';
import { useToast } from '@/components/ui';
import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv';
import { toIsoDate } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';

/** Download rows as CSV and record the export in the audit trail. */
export function useCsvExport() {
  const { t } = useLocale();
  const toast = useToast();
  const logExport = useLogExport();
  return useCallback(
    <T>(name: string, rows: T[], columns: CsvColumn<T>[]) => {
      const filename = `${name}-${toIsoDate(new Date())}.csv`;
      downloadCsv(filename, toCsv(rows, columns));
      logExport.mutate(filename);
      toast({ tone: 'success', message: t('staff.export.done', { file: filename }) });
    },
    [logExport, t, toast],
  );
}
