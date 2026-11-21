import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui';
import DashboardPage from '@/features/dashboard/DashboardPage';
import { PlaceholderPage, type PlaceholderKey } from '@/features/placeholder/PlaceholderPage';
import AppointmentsPage from '@/features/appointments/AppointmentsPage';
import ChatbotPage from '@/features/chatbot/ChatbotPage';
import DonorInboxPage from '@/features/donors/DonorInboxPage';
import DonorProfilePage from '@/features/donors/DonorProfilePage';
import FindDonorsPage from '@/features/donors/FindDonorsPage';
import MyRequestsPage from '@/features/donors/MyRequestsPage';
import FeverLogPage from '@/features/fever-log/FeverLogPage';
import HomeCarePage from '@/features/homecare/HomeCarePage';
import HospitalDetailPage from '@/features/hospitals/HospitalDetailPage';
import HospitalsPage from '@/features/hospitals/HospitalsPage';
import LabsPage from '@/features/labs/LabsPage';
import MyReportsPage from '@/features/reports/MyReportsPage';
import NewReportPage from '@/features/reports/NewReportPage';
import RiskMapPage from '@/features/risk/RiskMapPage';
import SymptomCheckerPage from '@/features/triage/SymptomCheckerPage';
import { CitizenShell } from './CitizenShell';
import { NAV_ITEMS, type NavKey } from './navigation';
import { NotFoundPage } from './NotFoundPage';
import { StaffShell } from './StaffShell';

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
  element: <PlaceholderPage page={item.key as PlaceholderKey} />,
}));

/* Staff portals load on demand (citizens never download them). */
const staffPages = {
  hospitalOverview: lazy(() => import('@/features/hospital-portal/HospitalOverviewPage')),
  beds: lazy(() => import('@/features/hospital-portal/BedUpdatePage')),
  doctors: lazy(() => import('@/features/hospital-portal/DoctorsPage')),
  schedule: lazy(() => import('@/features/hospital-portal/SchedulePage')),
  slots: lazy(() => import('@/features/hospital-portal/SlotGeneratorPage')),
  appointments: lazy(() => import('@/features/hospital-portal/HospitalAppointmentsPage')),
  lab: lazy(() => import('@/features/lab-portal/LabListingPage')),
  authority: lazy(() => import('@/features/authority/AuthorityOverviewPage')),
  reports: lazy(() => import('@/features/authority/ReportsPage')),
  tasks: lazy(() => import('@/features/authority/TasksPage')),
  approvals: lazy(() => import('@/features/admin/ApprovalsPage')),
  directories: lazy(() => import('@/features/admin/DirectoriesPage')),
  knowledge: lazy(() => import('@/features/admin/KnowledgePage')),
  forecast: lazy(() => import('@/features/admin/ForecastPage')),
  analytics: lazy(() => import('@/features/admin/AnalyticsPage')),
  audit: lazy(() => import('@/features/admin/AuditPage')),
};

function page(Page: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<SkeletonCard className="mt-8" />}>
      <Page />
    </Suspense>
  );
}

const staffRoutes: RouteObject[] = [
  {
    path: '/staff/hospital',
    element: <StaffShell portal="hospital_staff" />,
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
    children: [{ index: true, element: page(staffPages.lab) }],
  },
  {
    path: '/staff/authority',
    element: <StaffShell portal="authority" />,
    children: [
      { index: true, element: page(staffPages.authority) },
      { path: 'reports', element: page(staffPages.reports) },
      { path: 'tasks', element: page(staffPages.tasks) },
    ],
  },
  {
    path: '/staff/admin',
    element: <StaffShell portal="admin" />,
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

export const routes: RouteObject[] = [
  ...staffRoutes,
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
      { path: 'symptoms', element: <SymptomCheckerPage /> },
      { path: 'symptom-checker', element: <Navigate to="/symptoms" replace /> },
      { path: 'home-care', element: <HomeCarePage /> },
      { path: 'fever-log', element: <FeverLogPage /> },
      { path: 'chatbot', element: <ChatbotPage /> },
      { path: 'donors', element: <FindDonorsPage /> },
      { path: 'donors/requests', element: <MyRequestsPage /> },
      { path: 'donor/profile', element: <DonorProfilePage /> },
      { path: 'donor/inbox', element: <DonorInboxPage /> },
      { path: 'labs', element: <LabsPage /> },
      { path: 'reports', element: <MyReportsPage /> },
      { path: 'reports/new', element: <NewReportPage /> },
      { path: 'report', element: <Navigate to="/reports/new" replace /> },
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
