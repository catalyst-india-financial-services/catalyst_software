// Payment types
export type PaymentMode = 'cash' | 'upi' | 'bank' | 'cheque'

export interface EMIPayment {
  id: string
  loan_id: string
  customer_id: string
  emi_schedule_id: string
  emi_number: number
  payment_date: string
  payment_mode: PaymentMode
  amount_paid: number
  principal_paid: number
  interest_paid: number
  penalty: number
  discount: number
  advance_emi: number
  partial: boolean
  receipt_number: string
  collected_by: string
  notes?: string
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'failed'
}

// Income types
export type IncomeCategory = 'interest' | 'processing_fee' | 'penalty' | 'other'

export interface Income {
  id: string
  category: IncomeCategory
  amount: number
  description: string
  date: string
  reference?: string
  loan_id?: string
  customer_id?: string
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'failed'
}

// Expense types
export type ExpenseCategory = 'rent' | 'salary' | 'fuel' | 'electricity' | 'internet' | 'maintenance' | 'other'

export interface Expense {
  id: string
  category: ExpenseCategory
  amount: number
  description: string
  date: string
  receipt_url?: string
  approved_by?: string
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'failed'
}
