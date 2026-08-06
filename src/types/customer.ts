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
  status: 'active' | 'inactive' | 'blocked'
  kyc_status: 'pending' | 'verified' | 'rejected'
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'failed'
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | null
  customer_segment?: string | null
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
  status?: 'Pending' | 'Rejected' | 'Converted' | 'Interested'
  rejection_reason?: string
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
