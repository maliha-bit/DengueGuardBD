import { useState } from 'react';
import { Download, ScrollText, Search, SearchX } from 'lucide-react';
import { useAuditTrail } from '@/api/staffQueries';
import type { AuditEntry } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useCsvExport } from '@/components/useCsvExport';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Pagination,
  pageCount,
  paginate,
  SkeletonCard,
} from '@/components/ui';
import { toIsoDate } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';

/** Audit trail of staff and admin actions: search, date filter, CSV export. */
export default function AuditPage() {
  const { t, l, d } = useLocale();
  const query = useAuditTrail();
  const exportCsv = useCsvExport();
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const action = (e: AuditEntry) => t(`staff.audit.actions.${e.action}`);
  const term = search.trim().toLowerCase();
  const filtered = (query.data ?? []).filter((e) => {
    const day = toIsoDate(new Date(e.createdAt));
    const haystack = [
      e.actorName.en,
      e.actorName.bn,
      e.target.en,
      e.target.bn,
      action(e),
      t(`roles.${e.actorRole}`),
    ]
      .join(' ')
      .toLowerCase();
    return (!term || haystack.includes(term)) && (!from || day >= from) && (!to || day <= to);
  });
  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const onExport = () =>
    exportCsv('audit-trail', filtered, [
      { header: t('staff.audit.who'), value: (e) => l(e.actorName) },
      { header: t('staff.audit.role'), value: (e) => t(`roles.${e.actorRole}`) },
      { header: t('staff.audit.action'), value: action },
      { header: t('staff.audit.target'), value: (e) => l(e.target) },
      { header: t('staff.audit.time'), value: (e) => e.createdAt },
    ]);

  return (
    <>
      <PageHeader
        title={t('staff.audit.title')}
        subtitle={t('staff.audit.subtitle')}
        actions={
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={Download}
            disabled={filtered.length === 0}
            onClick={onExport}
          >
            {t('staff.export.csv')}
          </Button>
        }
      />
      <Card title={t('staff.audit.listTitle')} icon={ScrollText} titleAs="h2">
        <div
          className="mb-4 grid gap-3 sm:grid-cols-3"
          role="group"
          aria-label={t('staff.audit.filters')}
        >
          <Input
            type="search"
            leadingIcon={Search}
            label={t('common.search')}
            placeholder={t('staff.audit.searchPlaceholder')}
            value={search}
            onChange={(e) => filter(() => setSearch(e.target.value))}
          />
          <Input
            type="date"
            label={t('staff.common.from')}
            value={from}
            onChange={(e) => filter(() => setFrom(e.target.value))}
          />
          <Input
            type="date"
            label={t('staff.common.to')}
            value={to}
            onChange={(e) => filter(() => setTo(e.target.value))}
          />
        </div>
        <QueryState
          query={query}
          skeleton={<SkeletonCard />}
          isEmpty={(list) => list.length === 0}
          empty={
            <EmptyState
              icon={ScrollText}
              title={t('staff.audit.emptyTitle')}
              message={t('staff.audit.emptyMessage')}
            />
          }
        >
          {() =>
            filtered.length === 0 ? (
              <EmptyState compact icon={SearchX} title={t('staff.audit.noMatch')} />
            ) : (
              <>
                <DataTable
                  caption={t('staff.audit.listTitle')}
                  rows={paginate(filtered, page)}
                  rowKey={(e) => e.auditId}
                  columns={[
                    { key: 'action', header: t('staff.audit.action'), primary: true, cell: action },
                    { key: 'who', header: t('staff.audit.who'), cell: (e) => l(e.actorName) },
                    {
                      key: 'role',
                      header: t('staff.audit.role'),
                      cell: (e) => t(`roles.${e.actorRole}`),
                    },
                    { key: 'target', header: t('staff.audit.target'), cell: (e) => l(e.target) },
                    {
                      key: 'time',
                      header: t('staff.audit.time'),
                      cell: (e) =>
                        d(e.createdAt, {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        }),
                    },
                  ]}
                />
                <Pagination page={page} pages={pageCount(filtered.length)} onChange={setPage} />
              </>
            )
          }
        </QueryState>
      </Card>
    </>
  );
}
