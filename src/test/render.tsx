import { QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
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

/** Render the real app routes at a given path. */
export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, {
    initialEntries: [path],
    future: { v7_relativeSplatPath: true },
  });
  return render(
    <AppProviders queryClient={testQueryClient()}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </AppProviders>,
  );
}
