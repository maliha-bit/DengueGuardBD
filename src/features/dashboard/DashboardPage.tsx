import { CalendarDays } from 'lucide-react';
import { Disclaimer } from '@/components/Disclaimer';
import { DivisionSelect } from '@/components/DivisionSelect';
import { PageHeader } from '@/components/PageHeader';
import { Pill } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';
import { AppointmentCard } from './AppointmentCard';
import { BedsCard } from './BedsCard';
import { ForecastCasesCard } from './ForecastCasesCard';
import { OutlookCard } from './OutlookCard';
import { PreventionTipCard } from './PreventionTipCard';
import { QuickActions } from './QuickActions';
import { RiskTodayCard } from './RiskTodayCard';

/**
 * Citizen dashboard. Bento layout on xl (3 columns):
 *   [ Risk today ] [ Beds        ] [ 7-day     ]
 *   [  (tall)    ] [ Appointment ] [ outlook   ]
 *   [ Tip        ] [ Forecast cases (dark)     ]
 */
export default function DashboardPage() {
  const { t, d } = useLocale();
  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <>
            <Pill leadingIcon={CalendarDays} className="bg-white ring-0">
              {d(new Date(), { day: 'numeric', month: 'long', year: 'numeric' })}
            </Pill>
            <DivisionSelect />
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RiskTodayCard className="md:row-span-2 xl:col-start-1 xl:row-start-1" />
        <BedsCard className="xl:col-start-2 xl:row-start-1" />
        <AppointmentCard className="xl:col-start-2 xl:row-start-2" />
        <OutlookCard className="md:col-span-2 xl:col-span-1 xl:col-start-3 xl:row-span-2 xl:row-start-1" />
        <PreventionTipCard className="xl:col-start-1 xl:row-start-3" />
        <ForecastCasesCard className="md:col-span-1 xl:col-span-2 xl:col-start-2 xl:row-start-3" />
      </div>

      <QuickActions />
      <Disclaimer short className="mt-6" />
    </>
  );
}
