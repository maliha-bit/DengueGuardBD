import { useState } from 'react';
import { Bell, CalendarCheck, Droplet, ShieldAlert, type LucideIcon } from 'lucide-react';
import { useNotifications } from '@/api/queries';
import type { Notification } from '@/api/types';
import { EmptyState, IconChip, Sheet, Skeleton, SkeletonGroup } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { QueryState } from './QueryState';

const kindIcon: Record<Notification['kind'], LucideIcon> = {
  risk_alert: ShieldAlert,
  appointment: CalendarCheck,
  donor_request: Droplet,
};

/** Bell with unread count; opens the notifications sheet. */
export function NotificationsButton() {
  const { t, l, n, lang } = useLocale();
  const [open, setOpen] = useState(false);
  const query = useNotifications();
  const unread = query.data?.filter((item) => !item.read).length ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={
          unread > 0
            ? t('topbar.notificationsUnread', { count: n(unread) })
            : t('common.notifications')
        }
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-ink hover:bg-white/70"
      >
        <Bell aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-lime px-1 text-[11px] font-semibold text-brand-ink ring-2 ring-brand-canvas"
          >
            {n(unread)}
          </span>
        )}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('common.notifications')}
        side="right"
      >
        <QueryState
          query={query}
          isEmpty={(items) => items.length === 0}
          skeleton={
            <SkeletonGroup className="flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton shape="circle" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton shape="text" className="w-1/2" />
                    <Skeleton shape="text" />
                  </div>
                </div>
              ))}
            </SkeletonGroup>
          }
          empty={
            <EmptyState
              icon={Bell}
              title={t('notifications.emptyTitle')}
              message={t('notifications.emptyMessage')}
            />
          }
        >
          {(items) => (
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li
                  key={item.notificationId}
                  className="flex gap-3 rounded-2xl bg-brand-canvas p-3"
                >
                  <IconChip
                    icon={kindIcon[item.kind]}
                    tone={item.kind === 'risk_alert' ? 'lime' : 'lavender'}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{l(item.title)}</p>
                    <p className="mt-0.5 text-sm text-brand-ink/80">{l(item.body)}</p>
                    <p className="mt-1 text-xs text-brand-muted">
                      {formatRelative(item.createdAt, lang)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Sheet>
    </>
  );
}
