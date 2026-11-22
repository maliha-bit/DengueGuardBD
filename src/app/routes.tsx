import { lazy, Suspense, type ComponentType } from 'react';
import { lazyPage } from '@/lib/lazyPage';
import { Navigate, type RouteObject } from 'react-router-dom';
import { PageSkeleton } from '@/components/PageSkeleton';
import { SkeletonCard } from '@/components/ui';
import type { PlaceholderKey } from '@/features/placeholder/PlaceholderPage';
// Bundled with the shell (not lazy): it must open even when nothing else can download.
import OfflinePage from '@/features/offline/OfflinePage';
import { CitizenShell } from './CitizenShell';
import { RouteError } from './RouteError';
import { NAV_ITEMS, type NavKey } from './navigation';
import { StaffShell } from './StaffShell';

/* Every page loads on demand, so the first download is only the app shell (NFR15). */
const pages = {
  dashboard: lazyPage(() => import('@/features/dashboard/DashboardPage')),
  risk: lazyPage(() => import('@/features/risk/RiskMapPage')),
  hospitals: lazyPage(() => import('@/features/hospitals/HospitalsPage')),
  hospitalDetail: lazyPage(() => import('@/features/hospitals/HospitalDetailPage')),
  appointments: lazyPage(() => import('@/features/appointments/AppointmentsPage')),
  symptoms: lazyPage(() => import('@/features/triage/SymptomCheckerPage')),
  homeCare: lazyPage(() => import('@/features/homecare/HomeCarePage')),
  feverLog: lazyPage(() => import('@/features/fever-log/FeverLogPage')),
  chatbot: lazyPage(() => import('@/features/chatbot/ChatbotPage')),
  findDonors: lazyPage(() => import('@/features/donors/FindDonorsPage')),
  myRequests: lazyPage(() => import('@/features/donors/MyRequestsPage')),
  donorProfile: lazyPage(() => import('@/features/donors/DonorProfilePage')),
  donorInbox: lazyPage(() => import('@/features/donors/DonorInboxPage')),
  labs: lazyPage(() => import('@/features/labs/LabsPage')),
  myReports: lazyPage(() => import('@/features/reports/MyReportsPage')),
  newReport: lazyPage(() => import('@/features/reports/NewReportPage')),
  placeholder: lazyPage<{ page: PlaceholderKey }>(async () => ({
    default: (await import('@/features/placeholder/PlaceholderPage')).PlaceholderPage,
  })),
  notFound: lazyPage(async () => ({ default: (await import('./NotFoundPage')).NotFoundPage })),
};

// Dev-only UI kit; not linked anywhere and tree-shaken out of production builds.
const UiKitPage = import.meta.env.DEV ? lazy(() => import('@/features/dev/UiKitPage')) : null;

/** Sections with real pages (everything else in the nav is still a placeholder). */
const BUILT_PAGES: NavKey[] = [
  'dashboard',
  'riskMap',
  'hospitals',
  'appointments',
  'symptomChecker',
  'homeCare',
  'feverLog',
  'chatbot',
  'donors',
  'labs',
  'reportSite',
];

const placeholderRoutes: RouteObject[] = NAV_ITEMS.filter(
  (item) => !BUILT_PAGES.includes(item.key),
).map((item) => ({
  path: item.to.slice(1),
  element: (
    <Suspense fallback={<PageSkeleton />}>
      <pages.placeholder page={item.key as PlaceholderKey} />
    </Suspense>
  ),
}));

/* Staff portals load on demand (citizens never download them). */
const staffPages = {
  hospitalOverview: lazyPage(() => import('@/features/hospital-portal/HospitalOverviewPage')),
  beds: lazyPage(() => import('@/features/hospital-portal/BedUpdatePage')),
  doctors: lazyPage(() => import('@/features/hospital-portal/DoctorsPage')),
  schedule: lazyPage(() => import('@/features/hospital-portal/SchedulePage')),
  slots: lazyPage(() => import('@/features/hospital-portal/SlotGeneratorPage')),
  appointments: lazyPage(() => import('@/features/hospital-portal/HospitalAppointmentsPage')),
  lab: lazyPage(() => import('@/features/lab-portal/LabListingPage')),
  authority: lazyPage(() => import('@/features/authority/AuthorityOverviewPage')),
  reports: lazyPage(() => import('@/features/authority/ReportsPage')),
  tasks: lazyPage(() => import('@/features/authority/TasksPage')),
  approvals: lazyPage(() => import('@/features/admin/ApprovalsPage')),
  directories: lazyPage(() => import('@/features/admin/DirectoriesPage')),
  knowledge: lazyPage(() => import('@/features/admin/KnowledgePage')),
  forecast: lazyPage(() => import('@/features/admin/ForecastPage')),
  analytics: lazyPage(() => import('@/features/admin/AnalyticsPage')),
  audit: lazyPage(() => import('@/features/admin/AuditPage')),
};

function page(Page: ComponentType) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Page />
    </Suspense>
  );
}

const staffRoutes: RouteObject[] = [
  {
    path: '/staff/hospital',
    element: <StaffShell portal="hospital_staff" />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(staffPages.hospitalOverview) },
      { path: 'beds', element: page(staffPages.beds) },
      { path: 'doctors', element: page(staffPages.doctors) },
      { path: 'schedule', element: page(staffPages.schedule) },
      { path: 'slots', element: page(staffPages.slots) },
      { path: 'appointments', element: page(staffPages.appointments) },
    ],
  },
  {
    path: '/staff/lab',
    element: <StaffShell portal="lab_staff" />,
    errorElement: <RouteError />,
    children: [{ index: true, element: page(staffPages.lab) }],
  },
  {
    path: '/staff/authority',
    element: <StaffShell portal="authority" />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(staffPages.authority) },
      { path: 'reports', element: page(staffPages.reports) },
      { path: 'tasks', element: page(staffPages.tasks) },
    ],
  },
  {
    path: '/staff/admin',
    element: <StaffShell portal="admin" />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(staffPages.approvals) },
      { path: 'directories', element: page(staffPages.directories) },
      { path: 'knowledge', element: page(staffPages.knowledge) },
      { path: 'forecast', element: page(staffPages.forecast) },
      { path: 'analytics', element: page(staffPages.analytics) },
      { path: 'audit', element: page(staffPages.audit) },
    ],
  },
];

/** Loads every page's code (tests call this so pages render without a loading step). */
export function preloadPages() {
  return Promise.all(
    [...Object.values(pages), ...Object.values(staffPages)].map((p) => p.preload()),
  );
}

export const routes: RouteObject[] = [
  ...staffRoutes,
  {
    path: '/',
    element: <CitizenShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(pages.dashboard) },
      { path: 'risk', element: page(pages.risk) },
      { path: 'risk-map', element: <Navigate to="/risk" replace /> },
      { path: 'hospitals', element: page(pages.hospitals) },
      { path: 'hospitals/:hospitalId', element: page(pages.hospitalDetail) },
      { path: 'appointments', element: page(pages.appointments) },
      { path: 'symptoms', element: page(pages.symptoms) },
      { path: 'symptom-checker', element: <Navigate to="/symptoms" replace /> },
      { path: 'home-care', element: page(pages.homeCare) },
      { path: 'fever-log', element: page(pages.feverLog) },
      { path: 'chatbot', element: page(pages.chatbot) },
      { path: 'donors', element: page(pages.findDonors) },
      { path: 'donors/requests', element: page(pages.myRequests) },
      { path: 'donor/profile', element: page(pages.donorProfile) },
      { path: 'donor/inbox', element: page(pages.donorInbox) },
      { path: 'labs', element: page(pages.labs) },
      { path: 'reports', element: page(pages.myReports) },
      { path: 'reports/new', element: page(pages.newReport) },
      { path: 'report', element: <Navigate to="/reports/new" replace /> },
      { path: 'offline', element: <OfflinePage /> },
      ...placeholderRoutes,
      { path: '*', element: page(pages.notFound) },
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
