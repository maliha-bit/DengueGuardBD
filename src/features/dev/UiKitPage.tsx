import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  BedDouble,
  Bell,
  CalendarDays,
  ChevronDown,
  Droplet,
  FlaskConical,
  Hospital,
  LayoutGrid,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconChip,
  Modal,
  Pill,
  Sheet,
  Skeleton,
  SkeletonCard,
  SkeletonGroup,
  StatCard,
} from '@/components/ui';
import { formatDate, formatNumber } from '@/lib/format';
import { ColorTokens } from './ColorTokens';
import { FormDemo } from './FormDemo';
import { ForecastChart } from './ForecastChart';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {hint && <p className="mt-1 text-sm text-brand-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Kebab() {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      size="sm"
      iconOnly={MoreVertical}
      aria-label={t('common.moreOptions')}
    />
  );
}

export default function UiKitPage() {
  const { t, i18n } = useTranslation();
  const n = (value: number) => formatNumber(value, i18n.language);
  const [period, setPeriod] = useState<'today' | 'thisWeek' | 'monthly'>('today');
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetSide, setSheetSide] = useState<'bottom' | 'right' | null>(null);
  const [retries, setRetries] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const retry = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      setRetries((count) => count + 1);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-brand-sidebar p-0 md:p-4">
      <main className="mx-auto max-w-6xl rounded-none bg-brand-canvas px-4 py-6 md:rounded-panel md:px-8 md:py-8">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="dark" size="md">
            {t('dev.devOnly')}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitch />
            <Button variant="secondary" iconOnly={Search} aria-label={t('common.search')} />
            <Button variant="secondary" iconOnly={Bell} aria-label={t('common.notifications')} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[2.5rem] font-semibold leading-tight tracking-tight md:text-title">
              {t('dev.title')}
            </h1>
            <p className="mt-1 text-sm text-brand-muted">{t('dev.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-muted">
              {formatDate(new Date(), i18n.language)}
            </span>
            <Pill trailingIcon={ChevronDown}>{t('dev.today')}</Pill>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-12">
          <Section title={t('dev.colors')} hint={t('dev.colorsHint')}>
            <ColorTokens />
          </Section>

          <Section title={t('dev.typography')}>
            <Card>
              <dl className="grid gap-5">
                <div>
                  <dt className="text-xs text-brand-muted">{t('dev.typePageTitle')} · 44px</dt>
                  <dd className="text-title">{t('common.appName')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-brand-muted">{t('dev.typeCardTitle')} · 16px</dt>
                  <dd className="text-base font-medium">{t('dev.bedsAvailable')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-brand-muted">{t('dev.typeBigNumber')} · 40px</dt>
                  <dd>
                    <span className="text-stat">{n(62)}</span>{' '}
                    <span className="text-xs text-brand-muted">{t('dev.beds')}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-brand-muted">{t('dev.typeLabel')} · 12–13px</dt>
                  <dd className="text-[13px] text-brand-muted">{t('dev.updatedAgo')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-brand-muted">{t('dev.fontPair')}</dt>
                  <dd className="text-sm">
                    {t('dev.typeBody')}{' '}
                    <span lang="bn" className="font-bangla">
                      {t('dev.banglaSample')}
                    </span>
                  </dd>
                </div>
              </dl>
            </Card>
          </Section>

          <Section title={t('dev.buttons')}>
            <Card className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-3">
                <Button leadingIcon={Plus}>{t('dev.primary')}</Button>
                <Button variant="secondary">{t('dev.secondary')}</Button>
                <Button variant="ghost">{t('dev.ghost')}</Button>
                <Button variant="danger" leadingIcon={Trash2}>
                  {t('dev.danger')}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">{t('dev.small')}</Button>
                <Button size="md">{t('dev.medium')}</Button>
                <Button size="lg">{t('dev.large')}</Button>
                <Button disabled>{t('dev.disabled')}</Button>
                <Button loading>{t('dev.loadingButton')}</Button>
                <Button iconOnly={Plus} aria-label={t('dev.iconOnly')} />
                <Button
                  variant="secondary"
                  iconOnly={Bell}
                  aria-label={t('common.notifications')}
                />
              </div>
              <div className="on-dark flex flex-wrap gap-3 rounded-2xl bg-brand-ink-card p-4 text-white">
                <Button>{t('dev.primary')}</Button>
                <Button variant="ghost" className="hover:bg-white/10">
                  {t('dev.ghost')}
                </Button>
              </div>
            </Card>
          </Section>

          <Section title={t('dev.pillsBadges')}>
            <Card className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('dev.pillsBadges')}>
                {(['today', 'thisWeek', 'monthly'] as const).map((key) => (
                  <Pill key={key} selected={period === key} onClick={() => setPeriod(key)}>
                    {t(`dev.${key}`)}
                  </Pill>
                ))}
                <Pill leadingIcon={CalendarDays}>{formatDate(new Date(), i18n.language)}</Pill>
              </div>
              <div className="on-dark flex flex-wrap gap-2 rounded-2xl bg-brand-sidebar p-4">
                <Pill
                  tone="dark"
                  selected
                  leadingIcon={LayoutGrid}
                  count={n(3)}
                  onClick={() => undefined}
                >
                  {t('dev.cards')}
                </Pill>
                <Pill tone="dark" leadingIcon={Hospital} count={n(1)} onClick={() => undefined}>
                  {t('dev.bedsAvailable')}
                </Pill>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="lime">+{n(5)}%</Badge>
                <Badge tone="lavender">{t('dev.secondaryData')}</Badge>
                <Badge tone="neutral">{t('dev.neutral')}</Badge>
                <Badge tone="dark">{t('dev.dark')}</Badge>
                <Badge tone="risk-low" size="md">
                  {t('risk.low')}
                </Badge>
                <Badge tone="risk-medium" size="md">
                  {t('risk.medium')}
                </Badge>
                <Badge tone="risk-high" size="md">
                  {t('risk.high')}
                </Badge>
                <Badge tone="emergency" size="md">
                  {t('dev.emergency')}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <IconChip icon={Activity} />
                <IconChip icon={Activity} tone="lime" />
                <IconChip icon={Activity} tone="lavender" />
                <IconChip icon={Activity} tone="dark" />
                <IconChip icon={Activity} size="lg" />
              </div>
            </Card>
          </Section>

          <Section title={t('dev.cards')}>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title={t('dev.bedsAvailable')}
                icon={BedDouble}
                value={62}
                unit={t('dev.beds')}
                delta={{ label: `+${n(5)}%` }}
                caption={t('dev.updatedAgo')}
                actions={<Kebab />}
                className="md:row-span-2"
              >
                <div className="mt-5">
                  <Badge tone="risk-medium" size="md">
                    {t('risk.medium')}
                  </Badge>
                </div>
              </StatCard>
              <StatCard
                title={t('dev.labs')}
                icon={FlaskConical}
                value={14}
                unit={t('dev.labsUnit')}
                aside={t('dev.within')}
                actions={<Kebab />}
              />
              <StatCard
                title={t('dev.donors')}
                icon={Droplet}
                value={38}
                unit={t('dev.donorsUnit')}
                delta={{ label: `+${n(10)}%`, tone: 'lavender' }}
                actions={<Kebab />}
              />
              <Card
                tone="dark"
                title={t('dev.forecast')}
                icon={Activity}
                className="md:col-span-2"
                actions={
                  <Pill tone="dark" trailingIcon={ChevronDown}>
                    {t('dev.thisWeek')}
                  </Pill>
                }
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="lime">{t('common.simulatedData')}</Badge>
                  <span className="text-xs text-white/70">{t('dev.forecastCaption')}</span>
                </div>
                <ForecastChart />
              </Card>
              <Card tone="lime" title={t('dev.darkCard')}>
                <p className="text-sm">{t('dev.darkCardBody')}</p>
              </Card>
              <Card tone="lavender" title={t('dev.secondaryData')} icon={Activity}>
                <p className="text-sm">{t('common.disclaimer')}</p>
              </Card>
            </div>
          </Section>

          <Section title={t('dev.skeletons')}>
            <div className="grid gap-4 md:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonGroup className="flex flex-col gap-3 rounded-3xl bg-white p-5">
                <Skeleton shape="text" className="w-1/2" />
                <Skeleton shape="text" />
                <Skeleton shape="text" className="w-5/6" />
                <Skeleton shape="rect" className="h-16" />
              </SkeletonGroup>
            </div>
          </Section>

          <Section title={t('dev.states')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <EmptyState
                  icon={Hospital}
                  title={t('dev.noHospitals')}
                  message={t('dev.noHospitalsMessage')}
                  action={<Button variant="secondary">{t('dev.clearFilters')}</Button>}
                />
              </Card>
              <Card>
                <ErrorState onRetry={retry} retrying={retrying} />
                <p className="text-center text-xs text-brand-muted" aria-live="polite">
                  {t('dev.retryCount', { times: n(retries) })}
                </p>
              </Card>
            </div>
          </Section>

          <Section title={t('dev.overlays')}>
            <Card className="flex flex-wrap gap-3">
              <Button onClick={() => setModalOpen(true)}>{t('dev.openModal')}</Button>
              <Button variant="secondary" onClick={() => setSheetSide('bottom')}>
                {t('dev.openSheet')}
              </Button>
              <Button variant="secondary" onClick={() => setSheetSide('right')}>
                {t('dev.openSideSheet')}
              </Button>
            </Card>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title={t('dev.modalTitle')}
              description={t('dev.modalBody')}
              footer={
                <>
                  <Button variant="secondary" onClick={() => setModalOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={() => setModalOpen(false)}>{t('common.confirm')}</Button>
                </>
              }
            >
              <Badge tone="lavender">{t('common.simulatedData')}</Badge>
            </Modal>
            <Sheet
              open={sheetSide !== null}
              side={sheetSide ?? 'bottom'}
              onClose={() => setSheetSide(null)}
              title={t('dev.sheetTitle')}
            >
              <p className="text-sm text-brand-muted">{t('dev.sheetBody')}</p>
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="secondary" leadingIcon={FlaskConical} fullWidth>
                  {t('dev.labs')}
                </Button>
                <Button variant="secondary" leadingIcon={Droplet} fullWidth>
                  {t('dev.donors')}
                </Button>
              </div>
            </Sheet>
          </Section>

          <Section title={t('dev.form')}>
            <Card>
              <FormDemo />
            </Card>
          </Section>
        </div>
      </main>
    </div>
  );
}
