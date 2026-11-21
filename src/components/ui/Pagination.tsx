import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import { Button } from './Button';

/** "Page 2 of 5" with previous / next buttons. */
export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  const { t, i18n } = useTranslation();
  if (pages <= 1) return null;
  const n = (value: number) => formatNumber(value, i18n.language);
  return (
    <nav
      aria-label={t('staff.table.pagination')}
      className="mt-4 flex items-center justify-between gap-2"
    >
      <Button
        variant="secondary"
        size="sm"
        leadingIcon={ChevronLeft}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t('staff.table.previous')}
      </Button>
      <p className="text-sm text-brand-muted" aria-live="polite">
        {t('staff.table.pageOf', { page: n(page), pages: n(pages) })}
      </p>
      <Button
        variant="secondary"
        size="sm"
        trailingIcon={ChevronRight}
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        {t('staff.table.next')}
      </Button>
    </nav>
  );
}
