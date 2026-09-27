import React, { lazy } from 'react';
import StudentAttendance from './modules/students/StudentAttendance';
import ErrorBoundary from './components/ErrorBoundary';
import SidebarDemo from './components/sidebar/SidebarDemo';

// Real components instead of ComingSoon
const EnhancedStudentList = lazy(() => import('./modules/students/EnhancedStudentList'));
const AddStudent = lazy(() => import('./modules/students/AddStudent'));
const StudentPerformancePage = lazy(() => import('./modules/admin/pages/Students/StudentPerformancePage'));
const FeeRecordsPage = lazy(() => import('./modules/admin/pages/Students/FeeRecordsPage'));
const TransportAssignmentPage = lazy(() => import('./modules/admin/pages/Students/TransportAssignmentPage'));

// Direct routes configuration for testing and sub-features
const testRoutes = [
  {
    path: '/admin/sidebar-demo',
    element: <ErrorBoundary><SidebarDemo /></ErrorBoundary>,
  },
  {
    path: '/admin/students/list',
    element: <ErrorBoundary><EnhancedStudentList /></ErrorBoundary>,
  },
  {
    path: '/admin/students/add',
    element: <ErrorBoundary><AddStudent /></ErrorBoundary>,
  },
  {
    path: '/admin/students/attendance',
    element: <ErrorBoundary><StudentAttendance /></ErrorBoundary>,
  },
  {
    path: '/admin/students/performance',
    element: <ErrorBoundary><StudentPerformancePage /></ErrorBoundary>,
  },
  {
    path: '/admin/students/fees',
    element: <ErrorBoundary><FeeRecordsPage /></ErrorBoundary>,
  },
  {
    path: '/admin/students/transport',
    element: <ErrorBoundary><TransportAssignmentPage /></ErrorBoundary>,
  }
];

export default testRoutes;
