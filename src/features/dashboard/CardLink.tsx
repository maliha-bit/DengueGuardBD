import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonClasses } from '@/components/ui';

/** Header action for a dashboard card: opens the related page. */
export function CardLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={buttonClasses({ variant: 'ghost', size: 'sm', iconOnly: true })}
    >
      <ArrowUpRight aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
    </Link>
  );
}
