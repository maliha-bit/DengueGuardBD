import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Big page title + subtitle + right-side controls. Also sets the document title. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  const appName = t('common.appName');
  useEffect(() => {
    document.title = `${title} · ${appName}`;
  }, [title, appName]);

  return (
    <div className="mb-6 mt-5 flex flex-wrap items-end justify-between gap-4 md:mb-7 md:mt-7">
      <div className="min-w-0">
        <h1 className="text-[2rem] font-semibold leading-tight tracking-tight md:text-title">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-brand-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
