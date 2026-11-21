import { useMemo, useState } from 'react';
import { Clock, Droplet, Phone, SearchX, Send } from 'lucide-react';
import { useDivisions, useDonors } from '@/api/queries';
import type { DonorListing } from '@/api/types';
import { useSession } from '@/app/session';
import { Avatar } from '@/components/Avatar';
import { LoginPrompt } from '@/components/LoginPrompt';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Pill,
  Select,
  SkeletonCard,
  SkeletonGroup,
} from '@/components/ui';
import { formatRelative, localDigits } from '@/lib/format';
import { useLocale } from '@/lib/useLocale';
import { DonorTabs } from './DonorTabs';
import {
  BLOOD_GROUPS,
  DONATION_TYPES,
  EMPTY_DONOR_FILTERS,
  matchesDonor,
  sortDonors,
  type DonorFilters,
} from './donorUtils';
import { RequestDonorModal } from './RequestDonorModal';

/** Find blood / platelet donors (UC21–UC22). Public to browse; requesting needs login. */
export default function FindDonorsPage() {
  const { t, l, n } = useLocale();
  const query = useDonors();
  const divisions = useDivisions();
  const { isLoggedIn } = useSession();
  const [filters, setFilters] = useState<DonorFilters>(EMPTY_DONOR_FILTERS);
  const [requesting, setRequesting] = useState<DonorListing | null>(null);
  const [loginFor, setLoginFor] = useState<DonorListing | null>(null);

  const districtOptions = useMemo(
    () =>
      (divisions.data ?? []).flatMap((div) =>
        div.districts.map((d) => ({ value: d.districtId, label: `${l(d.name)} (${l(div.name)})` })),
      ),
    [divisions.data, l],
  );
  const update = (changes: Partial<DonorFilters>) => setFilters((f) => ({ ...f, ...changes }));

  const request = (donor: DonorListing) => {
    if (isLoggedIn) setRequesting(donor);
    else setLoginFor(donor);
  };

  return (
    <>
      <PageHeader title={t('donors.title')} subtitle={t('donors.subtitle')} />
      <DonorTabs />

      <Card className="mb-4">
        <form
          aria-label={t('donors.filtersLabel')}
          onSubmit={(e) => e.preventDefault()}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        >
          <Select
            label={t('donors.bloodGroup')}
            value={filters.bloodGroup}
            onChange={(e) => update({ bloodGroup: e.target.value as DonorFilters['bloodGroup'] })}
            options={[
              { value: '', label: t('donors.anyGroup') },
              ...BLOOD_GROUPS.map((g) => ({ value: g, label: g })),
            ]}
          />
          <Select
            label={t('donors.donationType')}
            value={filters.donationType}
            onChange={(e) =>
              update({ donationType: e.target.value as DonorFilters['donationType'] })
            }
            options={[
              { value: '', label: t('donors.anyType') },
              ...DONATION_TYPES.map((type) => ({ value: type, label: t(`donors.types.${type}`) })),
            ]}
          />
          <Select
            label={t('donors.district')}
            value={filters.districtId}
            onChange={(e) => update({ districtId: e.target.value })}
            options={[{ value: '', label: t('hospitals.allDistricts') }, ...districtOptions]}
          />
          <Pill
            selected={filters.availableOnly}
            onClick={() => update({ availableOnly: !filters.availableOnly })}
            className="justify-center"
          >
            {t('donors.availableNow')}
          </Pill>
        </form>
      </Card>

      <QueryState
        query={query}
        skeleton={
          <SkeletonGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </SkeletonGroup>
        }
        empty={
          <Card>
            <EmptyState
              icon={Droplet}
              title={t('donors.emptyTitle')}
              message={t('donors.emptyMessage')}
            />
          </Card>
        }
        isEmpty={(all) => all.length === 0}
      >
        {(all) => {
          const results = sortDonors(all.filter((d) => matchesDonor(d, filters)));
          if (results.length === 0) {
            return (
              <Card>
                <EmptyState
                  icon={SearchX}
                  title={t('donors.noMatchTitle')}
                  message={t('donors.noMatchMessage')}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setFilters(EMPTY_DONOR_FILTERS)}
                    >
                      {t('hospitals.clearFilters')}
                    </Button>
                  }
                />
              </Card>
            );
          }
          return (
            <section aria-label={t('donors.resultsLabel')}>
              <p className="mb-3 text-sm text-brand-muted" aria-live="polite">
                {t('donors.count', { count: results.length, total: n(results.length) })}
              </p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((donor) => (
                  <li key={donor.donorId}>
                    <DonorCard donor={donor} onRequest={() => request(donor)} />
                  </li>
                ))}
              </ul>
            </section>
          );
        }}
      </QueryState>

      {requesting && <RequestDonorModal donor={requesting} onClose={() => setRequesting(null)} />}
      <LoginPrompt
        open={loginFor !== null}
        onClose={() => setLoginFor(null)}
        title={t('donors.loginTitle')}
        body={t('donors.loginBody')}
        onLoggedIn={() => {
          setRequesting(loginFor);
          setLoginFor(null);
        }}
      />
    </>
  );
}

function DonorCard({ donor, onRequest }: { donor: DonorListing; onRequest: () => void }) {
  const { t, l, lang } = useLocale();
  return (
    <article
      aria-label={t('donors.cardLabel', { group: donor.bloodGroup, district: l(donor.district) })}
      className="flex h-full flex-col rounded-3xl bg-white p-5"
    >
      <div className="flex items-start gap-3">
        <Avatar name={donor.name.en} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="risk-high" icon={Droplet} size="md">
              {donor.bloodGroup}
            </Badge>
            <Badge tone={donor.available ? 'lime' : 'neutral'}>
              {donor.available ? t('donors.available') : t('donors.notAvailable')}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm font-medium">{t(`donors.types.${donor.donationType}`)}</p>
          <p className="text-sm text-brand-muted">{l(donor.district)}</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <Clock aria-hidden="true" className="h-4 w-4 text-brand-muted" />
          <dt className="sr-only">{t('donors.lastActive')}</dt>
          <dd>{t('donors.lastActiveAgo', { time: formatRelative(donor.lastActiveAt, lang) })}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Phone aria-hidden="true" className="h-4 w-4 text-brand-muted" />
          <dt className="sr-only">{t('donors.phone')}</dt>
          <dd>
            <span className="font-mono tracking-wide" data-testid="masked-phone">
              {localDigits(donor.maskedPhone, lang)}
            </span>
            <span className="ml-1 text-xs text-brand-muted">{t('donors.phoneHidden')}</span>
          </dd>
        </div>
      </dl>
      <Button
        className="mt-4"
        fullWidth
        leadingIcon={Send}
        disabled={!donor.available}
        onClick={onRequest}
      >
        {donor.available ? t('donors.requestButton') : t('donors.notAvailable')}
      </Button>
    </article>
  );
}
