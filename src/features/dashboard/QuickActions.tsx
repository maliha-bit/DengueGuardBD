import {
  Droplet,
  FlaskConical,
  Hospital,
  MapPinPlus,
  MessageCircle,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { pillClasses } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';

type ActionKey = 'symptoms' | 'hospital' | 'lab' | 'donor' | 'report' | 'chatbot';

const ACTIONS: Array<{ key: ActionKey; to: string; icon: LucideIcon }> = [
  { key: 'symptoms', to: '/symptoms', icon: Stethoscope },
  { key: 'hospital', to: '/hospitals', icon: Hospital },
  { key: 'lab', to: '/labs', icon: FlaskConical },
  { key: 'donor', to: '/donors', icon: Droplet },
  { key: 'report', to: '/reports/new', icon: MapPinPlus },
  { key: 'chatbot', to: '/chatbot', icon: MessageCircle },
];

export function QuickActions() {
  const { t } = useLocale();
  return (
    <section aria-labelledby="quick-actions" className="mt-6">
      <h2 id="quick-actions" className="mb-3 text-base font-semibold">
        {t('dashboard.actions.title')}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {ACTIONS.map(({ key, to, icon: Icon }) => (
          <li key={key}>
            <Link to={to} className={cn(pillClasses(), 'bg-white pl-1.5 ring-0 hover:bg-white/70')}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-lime">
                <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              </span>
              {t(`dashboard.actions.${key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
