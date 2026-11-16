export const hintId = (id: string) => `${id}-hint`;
export const errorId = (id: string) => `${id}-error`;

export function describedBy(id: string, hint: unknown, error: unknown): string | undefined {
  if (error) return errorId(id);
  if (hint) return hintId(id);
  return undefined;
}

export const controlClasses =
  'min-h-12 w-full rounded-2xl bg-white px-4 text-sm text-brand-ink ring-1 ring-inset ring-brand-line placeholder:text-brand-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink disabled:cursor-not-allowed disabled:bg-brand-canvas disabled:opacity-70 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[#C9353A]';
