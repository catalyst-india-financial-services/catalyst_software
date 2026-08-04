import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import DashboardPage from '@/features/dashboard/DashboardPage'
import CustomersPage from '@/features/customers/CustomersPage'
import CustomerDetailPage from '@/features/customers/CustomerDetailPage'
import LoansPage from '@/features/loans/LoansPage'
import LoanDetailPage from '@/features/loans/LoanDetailPage'
import EMICollectionPage from '@/features/emi/EMICollectionPage'
import LeadsPage from '@/features/leads/LeadsPage'
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
          { path: '/leads', element: <LeadsPage /> },
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
