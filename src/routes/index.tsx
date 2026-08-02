import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import DashboardPage from '@/features/dashboard/DashboardPage'
import CustomersPage from '@/features/customers/CustomersPage'
import CustomerDetailPage from '@/features/customers/CustomerDetailPage'
import LoansPage from '@/features/loans/LoansPage'
import LoanDetailPage from '@/features/loans/LoanDetailPage'
import EMICollectionPage from '@/features/emi/EMICollectionPage'
import IncomePage from '@/features/income/IncomePage'
import ExpensesPage from '@/features/expenses/ExpensesPage'
import ReportsPage from '@/features/reports/ReportsPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import LeadsPage from '@/features/leads/LeadsPage'
import UsersPage from '@/features/users/UsersPage'
import SettingsPage from '@/features/settings/SettingsPage'
import LoginPage from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/customers', element: <CustomersPage /> },
          { path: '/customers/:id', element: <CustomerDetailPage /> },
          { path: '/loans', element: <LoansPage /> },
          { path: '/loans/:id', element: <LoanDetailPage /> },
          { path: '/emi-collection', element: <EMICollectionPage /> },
          { path: '/income', element: <IncomePage /> },
          { path: '/expenses', element: <ExpensesPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/leads', element: <LeadsPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
