import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui';
import { HomePage } from './HomePage';
import { NotFoundPage } from './NotFoundPage';

// Dev-only UI kit; tree-shaken out of production builds.
const UiKitPage = import.meta.env.DEV ? lazy(() => import('@/features/dev/UiKitPage')) : null;

const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  ...(UiKitPage
    ? [
        {
          path: '/dev/ui',
          element: (
            <Suspense fallback={<SkeletonCard className="m-6" />}>
              <UiKitPage />
            </Suspense>
          ),
        },
      ]
    : []),
  { path: '*', element: <NotFoundPage /> },
];

export const router = createBrowserRouter(routes, {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
