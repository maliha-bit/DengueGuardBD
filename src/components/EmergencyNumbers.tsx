import { Phone, PhoneCall } from 'lucide-react';
import { buttonClasses } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';

/** National emergency (999) and DGHS health hotline (16263) as tap-to-call links. */
export function EmergencyNumbers({ layout = 'stack' }: { layout?: 'stack' | 'sheet' }) {
  const { t, n } = useLocale();
  const digits = (value: number) => n(value, { useGrouping: false });
  return (
    <div className="flex flex-col gap-2">
      <a
        href="tel:999"
        className={cn(
          buttonClasses({
            variant: 'danger',
            size: layout === 'sheet' ? 'lg' : 'md',
            fullWidth: true,
          }),
          'justify-start',
        )}
      >
        <PhoneCall aria-hidden="true" className="h-4 w-4" />
        <span className="font-semibold">{digits(999)}</span>
        <span className="truncate font-normal opacity-90">{t('emergency.ambulance')}</span>
      </a>
      <a
        href="tel:16263"
        className={cn(
          buttonClasses({
            variant: layout === 'sheet' ? 'secondary' : 'dark',
            size: layout === 'sheet' ? 'lg' : 'md',
            fullWidth: true,
          }),
          'justify-start',
        )}
      >
        <Phone aria-hidden="true" className="h-4 w-4" />
        <span className="font-semibold">{digits(16263)}</span>
        <span className="truncate font-normal opacity-90">{t('emergency.hotline')}</span>
      </a>
    </div>
  );
}
