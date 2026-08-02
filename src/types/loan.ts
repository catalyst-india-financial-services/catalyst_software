// Loan types
export type LoanStatus = 'active' | 'closed' | 'overdue' | 'pending'
export type InterestType = 'flat' | 'reducing'
export type LoanType = 'personal' | 'business' | 'home' | 'vehicle' | 'gold' | 'education' | 'agriculture'

export interface Loan {
  id: string
  loan_number: string
  customer_id: string
  customer_name?: string
  loan_type: LoanType
  loan_amount: number
  interest_rate: number
  interest_type: InterestType
  duration_months: number
  processing_fee: number
  loan_date: string
  emi_amount: number
  emi_count: number
  remaining_emi: number
  remaining_balance: number
  total_interest: number
  status: LoanStatus
  disbursed_amount: number
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'failed'
}

export interface EMISchedule {
  id: string
  loan_id: string
  emi_number: number
  due_date: string
  emi_amount: number
  principal: number
  interest: number
  outstanding_balance: number
  status: 'pending' | 'paid' | 'overdue' | 'partial'
  paid_amount?: number
  paid_date?: string
  penalty?: number
  created_at: string
}

export interface LoanDocument {
  id: string
  loan_id: string
  document_type: string
  file_url: string
  file_name: string
  created_at: string
}
