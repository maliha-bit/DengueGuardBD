import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ToastProvider } from '@/components/ui/Toast';
import i18n from '@/lib/i18n';
import { DivisionProvider } from './DivisionProvider';
import { SessionProvider } from './SessionProvider';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    },
  });
}

export function AppProviders({
  children,
  queryClient: providedClient,
}: {
  children: ReactNode;
  /** Tests pass their own client (e.g. with retries off). */
  queryClient?: QueryClient;
}) {
  const [queryClient] = useState(() => providedClient ?? createQueryClient());
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <DivisionProvider>
            <ToastProvider>{children}</ToastProvider>
          </DivisionProvider>
        </SessionProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
