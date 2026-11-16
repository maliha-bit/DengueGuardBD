import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui';
import DashboardPage from '@/features/dashboard/DashboardPage';
import { PlaceholderPage, type PlaceholderKey } from '@/features/placeholder/PlaceholderPage';
import { CitizenShell } from './CitizenShell';
import { NAV_ITEMS } from './navigation';
import { NotFoundPage } from './NotFoundPage';

// Dev-only UI kit; not linked anywhere and tree-shaken out of production builds.
const UiKitPage = import.meta.env.DEV ? lazy(() => import('@/features/dev/UiKitPage')) : null;

const placeholderRoutes: RouteObject[] = NAV_ITEMS.filter((item) => item.key !== 'dashboard').map(
  (item) => ({
    path: item.to.slice(1),
    element: <PlaceholderPage page={item.key as PlaceholderKey} />,
  }),
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <CitizenShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      ...placeholderRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
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
];
