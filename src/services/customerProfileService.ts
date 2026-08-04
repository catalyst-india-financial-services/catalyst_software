import { supabase } from './supabase'

// --- Extended Customer Interface ---
export interface ExtendedCustomer {
  id: string
  customer_id: string
  name: string
  photo_url?: string | null
  mobile: string
  whatsapp?: string | null
  address: string
  city: string
  state: string
  pincode: string
  occupation?: string | null
  company?: string | null
  monthly_income?: number | null
  aadhaar?: string | null
  pan?: string | null
  status: 'active' | 'inactive' | 'blocked'
  kyc_status: 'pending' | 'verified' | 'rejected'
  created_at: string
  updated_at: string
  sync_status?: string

  // Banking / CRM Extra Fields
  dob?: string | null
  gender?: string | null
  alt_mobile?: string | null
  email?: string | null
  website?: string | null
  pref_language?: string | null
  category?: string | null
  branch?: string | null
  employee_assigned?: string | null
  lead_source?: string | null
  billing_address?: string | null
  shipping_address?: string | null
  permanent_address?: string | null
  district?: string | null
  country?: string | null
  company_name?: string | null
  industry?: string | null
  annual_income?: number | null
  credit_limit?: number | null
  advance_received?: number | null
  bank_name?: string | null
  account_number?: string | null
  ifsc?: string | null
  upi_id?: string | null
  payment_terms?: string | null

  // Compliance
  compliance_kyc_status?: string | null
  compliance_doc_verified?: boolean | null
  compliance_blacklisted?: boolean | null
  compliance_legal_issues?: string | null
  compliance_credit_risk?: string | null
  compliance_fraud_check?: string | null
  compliance_status?: string | null

  // KYC specific docs
  kyc_gst?: string | null
  kyc_driving_license?: string | null
  kyc_passport?: string | null
  kyc_verified_by?: string | null
  kyc_verified_date?: string | null
  kyc_expiry_date?: string | null

  google_maps_url?: string | null
  customer_type?: 'Individual' | 'Business' | null
}

export interface CustomerProject {
  id: string
  customer_id: string
  project_name: string
  project_id: string
  start_date: string
  end_date: string
  status: 'Running' | 'Completed' | 'Pending'
  amount: number
  progress: number
  assigned_employee?: string
  created_at?: string
}

export interface CustomerQuotation {
  id: string
  customer_id: string
  quotation_number: string
  date: string
  amount: number
  status: 'Pending' | 'Approved' | 'Rejected' | 'Expired'
  converted: boolean
  created_at?: string
}

export interface CustomerInvoice {
  id: string
  customer_id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  amount: number
  paid: number
  pending: number
  created_at?: string
}

export interface CustomerPayment {
  id: string
  customer_id: string
  payment_date: string
  amount: number
  payment_method: string
  reference_number?: string
  collected_by: string
  receipt_url?: string | null
  status: 'Success' | 'Pending' | 'Failed'
  created_at?: string
}

export interface CustomerDocument {
  id: string
  customer_id: string
  document_name: string
  document_type: string
  file_url: string
  file_size: string
  version: number
  created_at: string
}

export interface CustomerCommunication {
  id: string
  customer_id: string
  type: 'Call' | 'WhatsApp' | 'SMS' | 'Email' | 'Meeting' | 'Note'
  date: string
  time: string
  employee: string
  description: string
  attachment_url?: string | null
  status: string
  created_at?: string
}

export interface CustomerFollowup {
  id: string
  customer_id: string
  followup_date: string
  reminder_date?: string | null
  reminder_time?: string | null
  customer_response?: string | null
  next_action?: string | null
  assigned_staff?: string | null
  status: 'pending' | 'completed' | 'overdue'
  created_at?: string
}

export interface CustomerNote {
  id: string
  customer_id: string
  date: string
  time: string
  employee_name: string
  content: string
  attachments?: string | null
  is_pinned: boolean
  created_at?: string
}

export interface CustomerActivity {
  id: string
  customer_id: string
  activity_type: string
  description: string
  icon_color: string
  created_at: string
}

// --- Customer Profile Service (100% Supabase — no mock data) ---
export const customerProfileService = {

  // 1. Fetch complete profile — returns raw DB data only, no defaults injected
  async getProfile(customerId: string): Promise<ExtendedCustomer> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle()

    if (error) {
      console.error('[customerProfileService] Error fetching profile:', error)
      throw error
    }

    if (!data) throw new Error('Customer not found')

    return data as ExtendedCustomer
  },

  // 2. Update profile — PATCH changed fields only, throws on error
  async updateProfile(customerId: string, payload: Partial<ExtendedCustomer>): Promise<ExtendedCustomer> {
    const { data, error } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', customerId)
      .select()
      .single()

    if (error) {
      console.error('[customerProfileService] Error updating profile:', error)
      throw error
    }

    return data as ExtendedCustomer
  },

  // 3. Projects
  async getProjects(customerId: string): Promise<CustomerProject[]> {
    const { data, error } = await supabase
      .from('customer_projects')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as CustomerProject[]
  },

  async saveProject(customerId: string, project: Partial<CustomerProject>): Promise<void> {
    const payload = { ...project, customer_id: customerId }
    const { error } = await supabase.from('customer_projects').upsert([payload])
    if (error) throw error
  },

  async deleteProject(customerId: string, projectId: string): Promise<void> {
    const { error } = await supabase.from('customer_projects').delete().eq('id', projectId)
    if (error) throw error
  },

  // 4. Quotations
  async getQuotations(customerId: string): Promise<CustomerQuotation[]> {
    const { data, error } = await supabase
      .from('customer_quotations')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as CustomerQuotation[]
  },

  async saveQuotation(customerId: string, quotation: Partial<CustomerQuotation>): Promise<void> {
    const payload = { ...quotation, customer_id: customerId }
    const { error } = await supabase.from('customer_quotations').upsert([payload])
    if (error) throw error
  },

  // 5. Invoices
  async getInvoices(customerId: string): Promise<CustomerInvoice[]> {
    const { data, error } = await supabase
      .from('customer_invoices')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as CustomerInvoice[]
  },

  async saveInvoice(customerId: string, invoice: Partial<CustomerInvoice>): Promise<void> {
    const payload = { ...invoice, customer_id: customerId }
    const { error } = await supabase.from('customer_invoices').upsert([payload])
    if (error) throw error
  },

  // 6. Payments
  async getPayments(customerId: string): Promise<CustomerPayment[]> {
    const { data, error } = await supabase
      .from('customer_payments')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as CustomerPayment[]
  },

  async savePayment(customerId: string, payment: Partial<CustomerPayment>): Promise<void> {
    const payload = { ...payment, customer_id: customerId }
    const { error } = await supabase.from('customer_payments').upsert([payload])
    if (error) throw error
  },

  // 7. Documents
  async getDocuments(customerId: string): Promise<CustomerDocument[]> {
    const { data, error } = await supabase
      .from('customer_documents')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as CustomerDocument[]
  },

  async saveDocument(customerId: string, document: Partial<CustomerDocument>): Promise<void> {
    const payload = { ...document, customer_id: customerId }
    const { error } = await supabase.from('customer_documents').upsert([payload])
    if (error) throw error
  },

  async deleteDocument(customerId: string, documentId: string): Promise<void> {
    const { error } = await supabase.from('customer_documents').delete().eq('id', documentId)
    if (error) throw error
  },

  // 8. Communications
  async getCommunications(customerId: string): Promise<CustomerCommunication[]> {
    const { data, error } = await supabase
      .from('customer_communications')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as CustomerCommunication[]
  },

  async saveCommunication(customerId: string, comm: Partial<CustomerCommunication>): Promise<void> {
    const payload = { ...comm, customer_id: customerId }
    const { error } = await supabase.from('customer_communications').upsert([payload])
    if (error) throw error
  },

  // 9. Follow-ups
  async getFollowups(customerId: string): Promise<CustomerFollowup[]> {
    const { data, error } = await supabase
      .from('customer_followups')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as CustomerFollowup[]
  },

  async saveFollowup(customerId: string, followup: Partial<CustomerFollowup>): Promise<void> {
    const payload = { ...followup, customer_id: customerId }
    const { error } = await supabase.from('customer_followups').upsert([payload])
    if (error) throw error
  },

  // 10. Notes (pinned first)
  async getNotes(customerId: string): Promise<CustomerNote[]> {
    const { data, error } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_pinned', { ascending: false })

    if (error) throw error
    return (data ?? []) as CustomerNote[]
  },

  async saveNote(customerId: string, note: Partial<CustomerNote>): Promise<void> {
    const payload = { ...note, customer_id: customerId }
    const { error } = await supabase.from('customer_notes').upsert([payload])
    if (error) throw error
  },

  async deleteNote(customerId: string, noteId: string): Promise<void> {
    const { error } = await supabase.from('customer_notes').delete().eq('id', noteId)
    if (error) throw error
  },

  // 11. Activities Timeline (newest first)
  async getActivities(customerId: string): Promise<CustomerActivity[]> {
    const { data, error } = await supabase
      .from('customer_activities')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as CustomerActivity[]
  },

  async saveActivity(customerId: string, activity: Partial<CustomerActivity>): Promise<void> {
    const payload = { ...activity, customer_id: customerId }
    const { error } = await supabase.from('customer_activities').upsert([payload])
    if (error) throw error
  },
}
