import { QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { routes } from '@/app/routes';

const testQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

/** Render a component with i18n, React Query, division context and a memory router. */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const queryClient = testQueryClient();
  return render(ui, {
    wrapper: ({ children }) => (
      <AppProviders queryClient={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {children}
        </MemoryRouter>
      </AppProviders>
    ),
    ...options,
  });
}

function AppRoutes() {
  return useRoutes(routes);
}

/**
 * Render the real app routes at a given path. Uses a plain MemoryRouter: the data router's
 * Request objects are rejected by Node's fetch under jsdom.
 */
export function renderApp(path = '/') {
  return render(
    <AppProviders queryClient={testQueryClient()}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
}
