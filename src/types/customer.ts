// Customer types
export interface Customer {
  id: string
  customer_id: string
  name: string
  photo_url?: string
  mobile: string
  whatsapp?: string
  address: string
  city: string
  state: string
  pincode: string
  occupation?: string
  company?: string
  monthly_income?: number
  aadhaar?: string
  pan?: string
  /** 'draft' is added for the Save Draft flow */
  status: 'draft' | 'active' | 'inactive' | 'blocked'
  kyc_status: 'pending' | 'verified' | 'rejected'
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'failed'
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | null
  customer_segment?: string | null
  // New fields added by migration 00008
  lead_id?: string | null
  customer_type?: string | null
  date_of_birth?: string | null
  gender?: string | null
  email?: string | null
  district?: string | null
  address_type?: string | null
  kyc_id?: string | null
  kyc_type?: string | null
  kyc_verified_date?: string | null
  income?: number | null
  income_source?: string | null
  cibil_score?: number | null
  cibil_score_date?: string | null
  customer_category?: string | null
  branch?: string | null
}

export interface Guarantor {
  id: string
  customer_id: string
  name: string
  mobile: string
  address: string
  relation: string
  aadhaar?: string
  created_at: string
}

export interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  product: string
  amount?: number
  message?: string
  created_at: string
  /** 'Approved' = eligible for customer creation; 'Converted' = customer already created */
  status?: 'Pending' | 'Rejected' | 'Converted' | 'Interested' | 'Approved'
  rejection_reason?: string
  // Fields added by migration 00008
  customer_conversion_status?: 'Not Created' | 'Converted'
  customer_linked_id?: string | null
  approved_at?: string | null
  approved_by?: string | null
}

export interface LeadFollowup {
  id: string
  lead_id: string
  last_conversation_note?: string
  next_followup_date?: string
  next_followup_time?: string
  reminder_status: 'pending' | 'completed' | 'overdue'
  created_at: string
  updated_at: string
}

/** Full form payload used by Create Customer / Save Draft */
export interface NewCustomerForm {
  // From approved lead (optional)
  lead_id?: string | null

  // BASIC DETAILS
  full_name: string
  customer_type: string
  date_of_birth: string
  gender: string
  mobile: string
  email?: string

  // ADDRESS
  current_address: string
  city: string
  district: string
  state: string
  pin_code: string
  address_type: string

  // KYC
  pan: string
  aadhaar_kyc_id: string
  kyc_status: string
  verification_date: string

  // FINANCIAL PROFILE
  occupation_business: string
  income: string
  income_source: string
  cibil_score?: string
  cibil_score_date?: string

  // CLASSIFICATION
  customer_segment: string
  customer_category: string
  branch: string
}
