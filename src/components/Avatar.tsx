import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

/** Initials avatar (no photos). */
export function Avatar({
  name,
  size = 'md',
  tone = 'lavender',
}: {
  name: string;
  size?: 'sm' | 'md';
  tone?: 'lavender' | 'lime';
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-brand-ink',
        size === 'md' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs',
        tone === 'lavender' ? 'bg-brand-lavender' : 'bg-brand-lime',
      )}
    >
      {initials(name)}
    </span>
  );
}
