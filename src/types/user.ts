// User and Auth types
export type UserRole = 'admin' | 'manager' | 'staff'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  mobile?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  role: UserRole
  module: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
  can_export: boolean
}

// Notification types
export type NotificationType = 'upcoming_emi' | 'overdue_emi' | 'due_today' | 'new_loan' | 'payment_received' | 'system'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  customer_id?: string
  loan_id?: string
  is_read: boolean
  created_at: string
}

// Settings types
export interface CompanySettings {
  id: string
  company_name: string
  logo_url?: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  gst_number?: string
  pan_number?: string
  default_interest_rate: number
  default_penalty_rate: number
  penalty_grace_days: number
  receipt_prefix: string
  loan_prefix: string
  customer_prefix: string
  created_at: string
  updated_at: string
}

// Activity log
export interface ActivityLog {
  id: string
  user_id: string
  user_name: string
  action: string
  module: string
  record_id?: string
  details?: string
  ip_address?: string
  created_at: string
}

// Report types
export interface DashboardStats {
  total_customers: number
  active_loans: number
  closed_loans: number
  todays_collection: number
  pending_emi: number
  overdue_loans: number
  interest_earned: number
  monthly_income: number
  monthly_expense: number
  net_profit: number
  collection_rate: number
}

export interface ChartDataPoint {
  name: string
  value?: number
  [key: string]: string | number | undefined
}
