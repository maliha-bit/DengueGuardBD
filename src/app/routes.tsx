import { lazy, Suspense } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui';
import DashboardPage from '@/features/dashboard/DashboardPage';
import { PlaceholderPage, type PlaceholderKey } from '@/features/placeholder/PlaceholderPage';
import AppointmentsPage from '@/features/appointments/AppointmentsPage';
import HospitalDetailPage from '@/features/hospitals/HospitalDetailPage';
import HospitalsPage from '@/features/hospitals/HospitalsPage';
import RiskMapPage from '@/features/risk/RiskMapPage';
import { CitizenShell } from './CitizenShell';
import { NAV_ITEMS, type NavKey } from './navigation';
import { NotFoundPage } from './NotFoundPage';

// Dev-only UI kit; not linked anywhere and tree-shaken out of production builds.
const UiKitPage = import.meta.env.DEV ? lazy(() => import('@/features/dev/UiKitPage')) : null;

/** Sections with real pages (everything else in the nav is still a placeholder). */
const BUILT_PAGES: NavKey[] = ['dashboard', 'riskMap', 'hospitals', 'appointments'];

const placeholderRoutes: RouteObject[] = NAV_ITEMS.filter(
  (item) => !BUILT_PAGES.includes(item.key),
).map((item) => ({
  path: item.to.slice(1),
  element: <PlaceholderPage page={item.key as PlaceholderKey} />,
}));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <CitizenShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'risk', element: <RiskMapPage /> },
      { path: 'risk-map', element: <Navigate to="/risk" replace /> },
      { path: 'hospitals', element: <HospitalsPage /> },
      { path: 'hospitals/:hospitalId', element: <HospitalDetailPage /> },
      { path: 'appointments', element: <AppointmentsPage /> },
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
