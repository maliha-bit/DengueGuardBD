import { MapPin } from 'lucide-react';
import { useDivisions } from '@/api/queries';
import type { DivisionId } from '@/api/types';
import { useDivision } from '@/app/division';
import { Select, Skeleton } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';

/** Compact division picker for the page header; shared via DivisionContext. */
export function DivisionSelect() {
  const { t, l } = useLocale();
  const { divisionId, setDivisionId } = useDivision();
  const { data, isPending, isError } = useDivisions();

  if (isPending) return <Skeleton shape="rect" className="h-11 w-36 rounded-full" />;
  if (isError || data.length === 0) return null;

  return (
    <div className="w-44">
      <Select
        label={t('topbar.division')}
        hideLabel
        appearance="pill"
        leadingIcon={MapPin}
        value={divisionId}
        onChange={(event) => setDivisionId(event.target.value as DivisionId)}
        options={data.map((division) => ({ value: division.divisionId, label: l(division.name) }))}
      />
    </div>
  );
}
