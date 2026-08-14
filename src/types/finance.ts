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

// ─── Bank Account ─────────────────────────────────────────────────────────────
export type BankAccountType = 'cash' | 'bank' | 'current' | 'savings'

export interface BankAccount {
  id: string
  name: string
  account_type: BankAccountType
  account_number?: string
  bank_name?: string
  opening_balance: number
  is_active: boolean
  created_at: string
  updated_at: string
  user_id?: string
}

// ─── Transaction (Accounting Ledger) ─────────────────────────────────────────
export type TxnType = 'disbursement' | 'repayment' | 'expense' | 'deposit'
export type TxnDirection = 'debit' | 'credit'

export interface Transaction {
  id: string
  txn_id: string
  txn_type: TxnType
  direction: TxnDirection
  amount: number
  bank_account_id: string
  customer_id?: string
  loan_id?: string
  reference_number?: string
  description?: string
  date: string
  // repayment
  principal?: number
  interest?: number
  other_charges?: number
  // expense
  category?: string
  // deposit
  deposit_type?: string
  // metadata
  created_by: string
  is_reversed: boolean
  reversal_of?: string
  created_at: string
  updated_at: string
  // joined fields
  bank_account_name?: string
  customer_name?: string
  loan_number?: string
}
