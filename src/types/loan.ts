export type LoanStructureType = 'regular' | 'interest_only' | 'composite'

export interface CompositePhase {
  phase_number: number
  phase_name: string
  phase_type: 'interest_only' | 'regular'
  tenure_months: number
  monthly_roi: number
}

// Loan types
export type LoanStatus = 'draft' | 'active' | 'closed' | 'overdue' | 'pending'
export type InterestType = 'flat' | 'reducing'
export type LoanType = 'personal' | 'business' | 'home' | 'vehicle' | 'gold' | 'education' | 'agriculture' | 'regular' | 'interest_only' | 'composite' | string

export interface Loan {
  id: string
  loan_number: string
  customer_id: string
  customer_name?: string
  loan_type: LoanType
  loan_amount: number | null
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

  // Wizard fields from migration 00009
  sanctioned_amount?: number | null
  loan_product?: string
  loan_category?: string
  loan_purpose?: string
  branch?: string
  account_opening_date?: string
  repayment_frequency?: 'monthly' | 'weekly' | 'fortnightly'
  repayment_method?: string
  repayment_start_date?: string
  first_demand_date?: string
  emi_due_day?: number
  grace_period?: number
  penal_interest_rate?: number
  late_payment_charges?: number

  // Guarantor
  guarantor_customer_id?: string | null
  guarantor_relationship?: string
  guarantor_type?: string
  guarantor_amount?: number

  // Collateral
  security_type?: string
  security_description?: string
  security_owner_id?: string | null
  security_ownership_type?: string
  security_market_value?: number
  security_valuation_date?: string
  security_ltv?: number
  security_doc_number?: string
  security_doc_status?: string
  security_insurance_required?: boolean
  security_insurance_details?: string

  // Auditing
  created_by?: string

  // Loan Structure & Phases
  loan_structure_type?: LoanStructureType
  monthly_roi?: number
  composite_phases?: CompositePhase[]
}

export interface EMISchedule {
  id: string
  loan_id: string
  emi_number: number
  phase?: string
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

export interface LoanPurposeOption {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoanDocument {
  id: string
  loan_id: string
  document_type: string
  file_url: string
  file_name: string
  created_at: string
}
