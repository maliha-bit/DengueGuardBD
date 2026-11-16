import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorState } from '@/components/ui';

export interface QueryStateProps<T> {
  query: UseQueryResult<T>;
  /** Loading skeleton (NFR28). */
  skeleton: ReactNode;
  /** Shown when isEmpty returns true (NFR28). */
  empty: ReactNode;
  isEmpty?: (data: NonNullable<T>) => boolean;
  compact?: boolean;
  onDark?: boolean;
  children: (data: NonNullable<T>) => ReactNode;
}

/** Renders loading / error (with Retry) / empty / data for one query. */
export function QueryState<T>({
  query,
  skeleton,
  empty,
  isEmpty,
  compact,
  onDark,
  children,
}: QueryStateProps<T>) {
  if (query.isPending) return <>{skeleton}</>;
  if (query.isError) {
    return (
      <ErrorState
        compact={compact}
        onDark={onDark}
        retrying={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }
  const data = query.data;
  if (data === null || data === undefined || isEmpty?.(data)) return <>{empty}</>;
  return <>{children(data)}</>;
}
