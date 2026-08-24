import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender, createColumnHelper, type SortingState
} from '@tanstack/react-table'
import {
  Plus, Download, Eye, SquarePen, Trash2, Phone, SlidersHorizontal,
  UserPlus, ChevronDown, CheckCircle2, ClipboardList, X, AlertCircle,
  RefreshCw, ArrowRight
} from 'lucide-react'
import {
  useCustomers, useUpdateCustomer,
  useApprovedLeads, useCreateNewCustomer, useSaveDraftCustomer, useUpdateDraftCustomer
} from '@/hooks/useDb'
import type { Customer, Lead, NewCustomerForm } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  Button, SearchInput, Pagination, Avatar, StatusBadge, Card,
  Modal, Input, Select, Textarea, DropdownMenu, EmptyState, PageHeader
} from '@/components/ui'
import { formatDate, cn } from '@/utils'
import { toast } from 'sonner'

const columnHelper = createColumnHelper<Customer>()

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateForm(form: Partial<NewCustomerForm>, fullValidation: boolean): Record<string, string> {
  const errors: Record<string, string> = {}

  // Always required even for draft
  if (!form.full_name || form.full_name.trim().length < 2) {
    errors.full_name = 'Full name must be at least 2 characters'
  } else if (/[^a-zA-Z\s.\-']/.test(form.full_name)) {
    errors.full_name = 'Name contains invalid characters'
  }
  if (!form.mobile) {
    errors.mobile = 'Mobile number is required'
  } else if (!/^[6-9]\d{9}$/.test(form.mobile.replace(/\s/g, ''))) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number'
  }

  if (!fullValidation) return errors

  // Full validation for Create Customer
  if (!form.customer_type) errors.customer_type = 'Customer type is required'
  if (!form.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required'
  } else if (new Date(form.date_of_birth) > new Date()) {
    errors.date_of_birth = 'Date of birth cannot be in the future'
  }
  if (!form.gender) errors.gender = 'Gender is required'

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address'
  }

  if (!form.current_address || form.current_address.trim().length < 5) {
    errors.current_address = 'Address is required'
  }
  if (!form.city || form.city.trim().length < 2) errors.city = 'City is required'
  if (!form.district || form.district.trim().length < 2) errors.district = 'District is required'
  if (!form.state) errors.state = 'State is required'
  if (!form.pin_code) {
    errors.pin_code = 'PIN code is required'
  } else if (!/^\d{6}$/.test(form.pin_code)) {
    errors.pin_code = 'Enter a valid 6-digit PIN code'
  }
  if (!form.address_type) errors.address_type = 'Address type is required'

  if (!form.pan) {
    errors.pan = 'PAN is required'
  } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan.toUpperCase())) {
    errors.pan = 'Enter a valid PAN (e.g., ABCDE1234F)'
  }
  if (!form.aadhaar_kyc_id) {
    errors.aadhaar_kyc_id = 'Aadhaar / KYC ID is required'
  } else if (!/^\d{12}$/.test(form.aadhaar_kyc_id.replace(/\s/g, ''))) {
    errors.aadhaar_kyc_id = 'Enter a valid 12-digit Aadhaar number'
  }
  if (!form.kyc_status) errors.kyc_status = 'KYC status is required'
  if (!form.verification_date) errors.verification_date = 'Verification date is required'

  if (!form.occupation_business || form.occupation_business.trim().length < 2) {
    errors.occupation_business = 'Occupation / Business is required'
  }
  if (!form.income) {
    errors.income = 'Income is required'
  } else if (isNaN(Number(form.income)) || Number(form.income) < 0) {
    errors.income = 'Enter a valid positive income amount'
  }
  if (!form.income_source) errors.income_source = 'Income source is required'

  if (form.cibil_score) {
    const score = parseInt(form.cibil_score, 10)
    if (isNaN(score) || score < 300 || score > 900) {
      errors.cibil_score = 'CIBIL score must be between 300 and 900'
    }
  }

  if (!form.customer_segment) errors.customer_segment = 'Customer segment is required'
  if (!form.customer_category) errors.customer_category = 'Customer category is required'
  if (!form.branch) errors.branch = 'Branch is required'

  return errors
}

// ─── Field Error component ────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="flex items-center gap-1 mt-1 text-xs font-medium text-red-600">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {msg}
    </p>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100 mb-4">
      <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
        {step}
      </span>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</h3>
    </div>
  )
}

// ─── Create Customer Modal ────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
]

const EMPTY_FORM: Partial<NewCustomerForm> = {
  lead_id: null,
  full_name: '', customer_type: '', date_of_birth: '', gender: '', mobile: '', email: '',
  current_address: '', city: '', district: '', state: '', pin_code: '', address_type: '',
  pan: '', aadhaar_kyc_id: '', kyc_status: '', verification_date: '',
  occupation_business: '', income: '', income_source: '', cibil_score: '', cibil_score_date: '',
  customer_segment: '', customer_category: '', branch: ''
}

export function CreateCustomerModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer?: Customer
  onClose: () => void
  onSuccess?: (c: Customer) => void
}) {
  const isDraft = customer?.status === 'draft'
  const { data: approvedLeads = [] } = useApprovedLeads()
  const createNewCustomer = useCreateNewCustomer()
  const saveDraft = useSaveDraftCustomer()
  const updateDraft = useUpdateDraftCustomer()

  const [form, setForm] = useState<Partial<NewCustomerForm>>(() => {
    if (customer) {
      // Pre-fill from existing draft
      return {
        lead_id: customer.lead_id ?? null,
        full_name: customer.name ?? '',
        customer_type: customer.customer_type ?? '',
        date_of_birth: customer.date_of_birth ?? '',
        gender: customer.gender ?? '',
        mobile: customer.mobile ?? '',
        email: customer.email ?? '',
        current_address: customer.address ?? '',
        city: customer.city ?? '',
        district: customer.district ?? '',
        state: customer.state ?? '',
        pin_code: customer.pincode ?? '',
        address_type: customer.address_type ?? '',
        pan: customer.pan ?? '',
        aadhaar_kyc_id: customer.aadhaar ?? '',
        kyc_status: customer.kyc_status ?? '',
        verification_date: customer.kyc_verified_date ?? '',
        occupation_business: customer.occupation ?? '',
        income: customer.income?.toString() ?? '',
        income_source: customer.income_source ?? '',
        cibil_score: customer.cibil_score?.toString() ?? '',
        cibil_score_date: customer.cibil_score_date ?? '',
        customer_segment: customer.customer_segment ?? '',
        customer_category: customer.customer_category ?? '',
        branch: customer.branch ?? '',
      }
    }
    return { ...EMPTY_FORM }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<'draft' | 'create' | null>(null)
  const [activeSection, setActiveSection] = useState(1)

  // When an approved lead is selected, pre-fill available fields
  const handleLeadSelect = (leadId: string) => {
    if (!leadId) {
      setForm(prev => ({ ...prev, lead_id: null }))
      return
    }
    const lead = approvedLeads.find(l => l.id === leadId)
    if (!lead) return
    setForm(prev => ({
      ...prev,
      lead_id: leadId,
      full_name: lead.name || prev.full_name,
      mobile: lead.phone || prev.mobile,
      email: lead.email || prev.email,
    }))
  }

  const set = (key: keyof NewCustomerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const handleSaveDraft = async () => {
    const draftErrors = validateForm(form, false)
    if (Object.keys(draftErrors).length > 0) {
      setErrors(draftErrors)
      // Highlight step 1 since draft errors reside there
      setActiveSection(1)
      return
    }
    setLoading('draft')
    try {
      let result: Customer
      if (isDraft && customer) {
        result = await updateDraft.mutateAsync({ id: customer.id, form, finalize: false })
        toast.success('Draft updated successfully!')
      } else {
        result = await saveDraft.mutateAsync({ ...form, full_name: form.full_name!, mobile: form.mobile! })
        toast.success('Customer saved as Draft. You can complete it later.')
      }
      if (onSuccess) onSuccess(result)
      onClose()
    } catch (err: any) {
      toast.error(`Failed to save draft: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(null)
    }
  }

  const handleCreateCustomer = async () => {
    const allErrors = validateForm(form, true)
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      // Find the first step that contains an error and focus it
      if (allErrors.full_name || allErrors.mobile || allErrors.customer_type || allErrors.date_of_birth || allErrors.gender) {
        setActiveSection(1)
      } else if (allErrors.current_address || allErrors.city || allErrors.district || allErrors.state || allErrors.pin_code || allErrors.address_type) {
        setActiveSection(2)
      } else if (allErrors.pan || allErrors.aadhaar_kyc_id || allErrors.kyc_status || allErrors.verification_date) {
        setActiveSection(3)
      } else if (allErrors.occupation_business || allErrors.income || allErrors.income_source) {
        setActiveSection(4)
      } else if (allErrors.customer_segment || allErrors.customer_category || allErrors.branch) {
        setActiveSection(5)
      }
      toast.error('Please fix all validation errors before creating the customer.')
      return
    }
    setLoading('create')
    try {
      let result: Customer
      if (isDraft && customer) {
        result = await updateDraft.mutateAsync({ id: customer.id, form, finalize: true })
        toast.success('Customer successfully created and activated!')
      } else {
        result = await createNewCustomer.mutateAsync(form as NewCustomerForm)
        toast.success('Customer created successfully!')
      }
      if (onSuccess) onSuccess(result)
      onClose()
    } catch (err: any) {
      toast.error(`Failed to create customer: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(null)
    }
  }

  const sections = [
    { id: 1, label: 'Basic Details', desc: 'Personal details & mobile number' },
    { id: 2, label: 'Contact & Address', desc: 'Current residential address' },
    { id: 3, label: 'KYC Verification', desc: 'Aadhaar, PAN & KYC dates' },
    { id: 4, label: 'Financial Profile', desc: 'Occupation & monthly income' },
    { id: 5, label: 'Classification', desc: 'Segment, Category & Branch' }
  ]

  const handleNextStep = () => {
    // Quick validation of the current step before advancing
    const stepErrors: Record<string, string> = {}
    if (activeSection === 1) {
      if (!form.full_name) stepErrors.full_name = 'Name is required'
      if (!form.mobile) stepErrors.mobile = 'Mobile is required'
      if (!form.customer_type) stepErrors.customer_type = 'Type is required'
      if (!form.gender) stepErrors.gender = 'Gender is required'
      if (!form.date_of_birth) stepErrors.date_of_birth = 'DOB is required'
    } else if (activeSection === 2) {
      if (!form.current_address) stepErrors.current_address = 'Address is required'
      if (!form.city) stepErrors.city = 'City is required'
      if (!form.district) stepErrors.district = 'District is required'
      if (!form.state) stepErrors.state = 'State is required'
      if (!form.pin_code) stepErrors.pin_code = 'PIN code is required'
      if (!form.address_type) stepErrors.address_type = 'Address type is required'
    } else if (activeSection === 3) {
      if (!form.pan) stepErrors.pan = 'PAN is required'
      if (!form.aadhaar_kyc_id) stepErrors.aadhaar_kyc_id = 'Aadhaar ID is required'
      if (!form.kyc_status) stepErrors.kyc_status = 'KYC status is required'
    } else if (activeSection === 4) {
      if (!form.occupation_business) stepErrors.occupation_business = 'Occupation is required'
      if (!form.income) stepErrors.income = 'Income amount is required'
      if (!form.income_source) stepErrors.income_source = 'Income source is required'
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...stepErrors }))
      toast.error('Please fill all required fields in this step.')
      return
    }

    setActiveSection(prev => Math.min(5, prev + 1))
  }

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[500px]">
      {/* ── Left Sidebar: Step Indicators ── */}
      <div className="w-full md:w-80 bg-slate-50/80 border-r border-slate-200/60 p-6 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-6">
          <div className="pb-4 border-b border-slate-200/50">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registration Wizard</h4>
            <p className="text-[11px] text-slate-500 mt-1">Complete all sections to register the customer profile.</p>
          </div>

          <nav className="space-y-2">
            {sections.map((sec) => {
              const isActive = activeSection === sec.id
              const isDone = activeSection > sec.id
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    // Allow navigating backward or forward if we already visited/filled it
                    setActiveSection(sec.id)
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 p-3.5 rounded-2xl text-left transition-all border outline-none',
                    isActive
                      ? 'bg-white border-slate-200/80 shadow-md shadow-slate-100/50 text-slate-800'
                      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/40'
                  )}
                >
                  <span className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all mt-0.5',
                    isActive && 'bg-brand-600 text-white shadow-xs',
                    isDone && 'bg-emerald-100 text-emerald-700 border-none',
                    !isActive && !isDone && 'bg-slate-200/60 text-slate-500'
                  )}>
                    {isDone ? <CheckCircle2 className="h-4.5 w-4.5" /> : sec.id}
                  </span>
                  <div>
                    <p className={cn('text-xs font-bold', isActive ? 'text-slate-800' : 'text-slate-600')}>{sec.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sec.desc}</p>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Lead select placed nicely at the bottom of sidebar if manual creation */}
        {!isDraft && (
          <div className="pt-4 border-t border-slate-200/50 mt-6">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              Approved Lead Selection
            </label>
            <div className="relative">
              <select
                value={form.lead_id ?? ''}
                onChange={e => handleLeadSelect(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 pr-8 appearance-none"
              >
                <option value="">— Manual / Select Lead —</option>
                {approvedLeads.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* ── Right Content: Form Fields ── */}
      <div className="flex-1 flex flex-col justify-between bg-white">
        <div className="p-8 overflow-y-auto max-h-[64vh]">
          {/* STEP 1: BASIC DETAILS */}
          {activeSection === 1 && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Basic Details</h3>
                <p className="text-xs text-slate-400">Onboard the customer with their primary identity parameters.</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name *</label>
                  <input
                    value={form.full_name ?? ''}
                    onChange={set('full_name')}
                    placeholder="Enter borrower's full name"
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      errors.full_name ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.full_name} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer Type *</label>
                  <div className="relative">
                    <select
                      value={form.customer_type ?? ''}
                      onChange={set('customer_type')}
                      className={cn(
                        'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white font-medium text-slate-700',
                        errors.customer_type ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <option value="">Select type</option>
                      <option value="Individual">Individual</option>
                      <option value="Business">Business</option>
                      <option value="Joint">Joint Account</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.customer_type} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Gender *</label>
                  <div className="relative">
                    <select
                      value={form.gender ?? ''}
                      onChange={set('gender')}
                      className={cn(
                        'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white font-medium text-slate-700',
                        errors.gender ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.gender} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Date of Birth *</label>
                  <input
                    type="date"
                    value={form.date_of_birth ?? ''}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={set('date_of_birth')}
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      errors.date_of_birth ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.date_of_birth} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mobile Number *</label>
                  <input
                    value={form.mobile ?? ''}
                    onChange={set('mobile')}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      errors.mobile ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.mobile} />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={set('email')}
                    placeholder="e.g., mail@example.com (Optional)"
                    className={cn(
                      'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 hover:border-slate-300',
                      errors.email && 'border-red-300'
                    )}
                  />
                  <FieldError msg={errors.email} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT & ADDRESS */}
          {activeSection === 2 && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Residential Address</h3>
                <p className="text-xs text-slate-400">Primary residential address details and house ownership type.</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Current Address *</label>
                  <textarea
                    value={form.current_address ?? ''}
                    onChange={set('current_address')}
                    placeholder="House/Door No, Street Name, Landmark, Area"
                    rows={3}
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none',
                      errors.current_address ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.current_address} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">City *</label>
                  <input
                    value={form.city ?? ''}
                    onChange={set('city')}
                    placeholder="City / Town"
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      errors.city ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.city} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">District *</label>
                  <input
                    value={form.district ?? ''}
                    onChange={set('district')}
                    placeholder="District name"
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      errors.district ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.district} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">State *</label>
                  <div className="relative">
                    <select
                      value={form.state ?? ''}
                      onChange={set('state')}
                      className={cn(
                        'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white font-medium text-slate-700',
                        errors.state ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.state} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">PIN Code *</label>
                  <input
                    value={form.pin_code ?? ''}
                    onChange={set('pin_code')}
                    placeholder="6-digit postal PIN"
                    maxLength={6}
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      errors.pin_code ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.pin_code} />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Address Type *</label>
                  <div className="relative">
                    <select
                      value={form.address_type ?? ''}
                      onChange={set('address_type')}
                      className={cn(
                        'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white font-medium text-slate-700',
                        errors.address_type ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <option value="">Select Address Ownership</option>
                      <option value="Owned">Self-Owned Property</option>
                      <option value="Rented">Rented Accommodation</option>
                      <option value="Family">Family / Parental Property</option>
                      <option value="Company">Company Provided Quarter</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.address_type} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: KYC VERIFICATION */}
          {activeSection === 3 && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">KYC & Verification</h3>
                <p className="text-xs text-slate-400">Verify Government ID coordinates (Aadhaar & PAN).</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">PAN Card *</label>
                  <input
                    value={form.pan ?? ''}
                    onChange={e => { set('pan')({ ...e, target: { ...e.target, value: e.target.value.toUpperCase() } } as any) }}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      errors.pan ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.pan} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Aadhaar / KYC ID *</label>
                  <input
                    value={form.aadhaar_kyc_id ?? ''}
                    onChange={set('aadhaar_kyc_id')}
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      errors.aadhaar_kyc_id ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.aadhaar_kyc_id} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">KYC Status *</label>
                  <div className="relative">
                    <select
                      value={form.kyc_status ?? ''}
                      onChange={set('kyc_status')}
                      className={cn(
                        'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white font-medium text-slate-700',
                        errors.kyc_status ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <option value="">Select KYC state</option>
                      <option value="pending">Pending Audit</option>
                      <option value="verified">Verified & Passed</option>
                      <option value="rejected">Rejected / Failed</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.kyc_status} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Verification Date</label>
                  <input
                    type="date"
                    value={form.verification_date ?? ''}
                    onChange={set('verification_date')}
                    className={cn(
                      'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 hover:border-slate-300',
                      errors.verification_date && 'border-red-300'
                    )}
                  />
                  <FieldError msg={errors.verification_date} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: FINANCIAL PROFILE */}
          {activeSection === 4 && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Financial Profile</h3>
                <p className="text-xs text-slate-400">Add client occupational background & primary income values.</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Occupation / Business *</label>
                  <input
                    value={form.occupation_business ?? ''}
                    onChange={set('occupation_business')}
                    placeholder="e.g. Proprietor, Senior Consultant, Business Owner"
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      errors.occupation_business ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.occupation_business} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Monthly Income (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.income ?? ''}
                    onChange={set('income')}
                    placeholder="Estimated monthly earnings"
                    className={cn(
                      'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                      errors.income ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                    )}
                  />
                  <FieldError msg={errors.income} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Income Source *</label>
                  <div className="relative">
                    <select
                      value={form.income_source ?? ''}
                      onChange={set('income_source')}
                      className={cn(
                        'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white font-medium text-slate-700',
                        errors.income_source ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <option value="">Select source</option>
                      <option value="Salary">Professional Salary</option>
                      <option value="Business">Trading & Business</option>
                      <option value="Agriculture">Agriculture & Farms</option>
                      <option value="Rental">Real Estate Rental</option>
                      <option value="Pension">Government Pension</option>
                      <option value="Other">Other Revenue Channel</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.income_source} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">CIBIL Bureau Score</label>
                  <input
                    type="number"
                    min="300"
                    max="900"
                    value={form.cibil_score ?? ''}
                    onChange={set('cibil_score')}
                    placeholder="300 to 900 (Optional)"
                    className={cn(
                      'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 hover:border-slate-300',
                      errors.cibil_score && 'border-red-300'
                    )}
                  />
                  <FieldError msg={errors.cibil_score} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Bureau Score Date</label>
                  <input
                    type="date"
                    value={form.cibil_score_date ?? ''}
                    onChange={set('cibil_score_date')}
                    className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CLASSIFICATION */}
          {activeSection === 5 && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Classification & Branch</h3>
                <p className="text-xs text-slate-400">Associate the client profile to target business units.</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer Segment *</label>
                  <div className="relative">
                    <select
                      value={form.customer_segment ?? ''}
                      onChange={set('customer_segment')}
                      className={cn(
                        'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white font-medium text-slate-700',
                        errors.customer_segment ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <option value="">Select segment</option>
                      <option value="Retail">Retail Banking</option>
                      <option value="SME">SME Sector</option>
                      <option value="Corporate">Corporate Lending</option>
                      <option value="Priority">Priority Sector</option>
                      <option value="Gold">Gold Club Member</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.customer_segment} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer Category *</label>
                  <div className="relative">
                    <select
                      value={form.customer_category ?? ''}
                      onChange={set('customer_category')}
                      className={cn(
                        'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white font-medium text-slate-700',
                        errors.customer_category ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <option value="">Select category</option>
                      <option value="New">New Registration</option>
                      <option value="Existing">Active Relationship</option>
                      <option value="Dormant">Dormant Account</option>
                      <option value="VIP">VIP Customer</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.customer_category} />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Operating Branch *</label>
                  <div className="relative">
                    <select
                      value={form.branch ?? ''}
                      onChange={set('branch')}
                      className={cn(
                        'w-full border rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white font-medium text-slate-700',
                        errors.branch ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <option value="">Select operating branch</option>
                      <option value="Head Office">Head Office (Chennai)</option>
                      <option value="Chennai">Chennai City Branch</option>
                      <option value="Coimbatore">Coimbatore Central</option>
                      <option value="Madurai">Madurai Regional Unit</option>
                      <option value="Salem">Salem Local Branch</option>
                      <option value="Trichy">Trichy Hub</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.branch} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Action Buttons Footer ── */}
        <div className="flex justify-between items-center px-8 py-5 border-t border-slate-100 bg-slate-50/60 rounded-br-2xl flex-shrink-0">
          <div>
            {activeSection > 1 && (
              <button
                type="button"
                onClick={() => setActiveSection(prev => Math.max(1, prev - 1))}
                className="px-4 py-2.5 text-sm font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                Previous Step
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={!!loading}
              className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSaveDraft}
              disabled={!!loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading === 'draft' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4 text-slate-400" />}
              {isDraft ? 'Update Draft' : 'Save Draft'}
            </button>

            {activeSection < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 rounded-xl transition-colors shadow-sm"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleCreateCustomer}
                disabled={!!loading}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {loading === 'create' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {isDraft ? 'Finalize & Create' : 'Create Customer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Customers Page ───────────────────────────────────────────────────────────

export default function CustomersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sorting, setSorting] = useLocalStorage<SortingState>('customers_sorting', [])
  const [globalFilter, setGlobalFilter] = useLocalStorage<string>('customers_search', '')
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>()
  const [statusFilter, setStatusFilter] = useLocalStorage<string>('customers_status_filter', 'all')

  const prefillLeadId = searchParams.get('leadId')

  useEffect(() => {
    if (prefillLeadId) {
      setEditCustomer(undefined)
      setShowModal(true)
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('leadId')
      setSearchParams(nextParams, { replace: true })
    }
  }, [prefillLeadId, searchParams, setSearchParams])

  const { data: customers = [], isLoading } = useCustomers()

  const filteredData = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'draft') return c.status === 'draft'
      if (statusFilter === 'active') return c.status === 'active'
      return c.status === statusFilter
    })
  }, [customers, statusFilter])

  const activeCount = customers.filter(c => c.status === 'active').length
  const draftCount = customers.filter(c => c.status === 'draft').length
  const kycVerifiedCount = customers.filter(c => c.kyc_status === 'verified').length

  const columns = useMemo(() => [
    columnHelper.accessor('customer_id', {
      header: 'ID',
      cell: (info) => (
        <button
          onClick={() => navigate(`/customers/${info.row.original.id}`)}
          className="text-xs font-mono font-semibold text-brand-600 hover:underline hover:text-brand-700 transition-colors cursor-pointer"
        >
          {info.getValue()}
        </button>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Customer Name',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <Avatar name={info.getValue()} size="sm" />
          <div>
            <p className="text-sm font-bold text-slate-800 tracking-tight">{info.getValue()}</p>
            <p className="text-xs text-slate-400 font-medium">{info.row.original.mobile}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('city', {
      header: 'City',
      cell: (info) => <span className="text-xs font-medium text-slate-600">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('occupation', {
      header: 'Occupation',
      cell: (info) => <span className="text-xs font-medium text-slate-600">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('kyc_status', {
      header: 'KYC',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const status = info.getValue()
        if (status === 'draft') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Draft
            </span>
          )
        }
        return <StatusBadge status={status} />
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Joined',
      cell: (info) => <span className="text-xs text-slate-400 font-medium">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const c = info.row.original
        const isDraft = c.status === 'draft'
        return (
          <DropdownMenu
            align="right"
            trigger={
              <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            }
            items={[
              ...(isDraft ? [
                { label: 'Edit Draft', icon: <SquarePen className="h-4 w-4" />, onClick: () => { setEditCustomer(c); setShowModal(true) } },
              ] : [
                { label: 'View Profile', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/customers/${c.id}`) },
                { label: 'Edit Customer', icon: <SquarePen className="h-4 w-4" />, onClick: () => { setEditCustomer(c); setShowModal(true) } },
                { label: 'Call Phone', icon: <Phone className="h-4 w-4" />, onClick: () => {} },
              ]),
              { separator: true, label: 'Delete Record', icon: <Trash2 className="h-4 w-4" />, variant: 'danger', onClick: () => {} },
            ]}
          />
        )
      },
    }),
  ], [navigate])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Customer Directory"
        subtitle={`${customers.length} total customers registered in system`}
        action={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => { setEditCustomer(undefined); setShowModal(true) }}>
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        }
      />

      {/* Quick Stats Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Customers', value: customers.length, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Active', value: activeCount, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
          { label: 'Drafts Pending', value: draftCount, color: 'text-amber-600', bg: 'bg-amber-50/50' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-2xl border border-slate-200/80 px-5 py-4 flex items-center justify-between shadow-2xs', s.bg)}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
            <span className={cn('text-2xl font-extrabold amount-display', s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Draft Notice */}
      {draftCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl"
        >
          <ClipboardList className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-amber-800 flex-1">
            {draftCount} customer draft{draftCount > 1 ? 's' : ''} pending completion. Click <strong>Edit Draft</strong> to finalize.
          </p>
          <button
            onClick={() => setStatusFilter('draft')}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
          >
            View Drafts <ArrowRight className="h-3 w-3" />
          </button>
        </motion.div>
      )}

      <Card>
        {/* Filter Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <SearchInput
            className="w-72"
            placeholder="Search name, mobile, ID..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          <div className="flex gap-1.5 ml-auto bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'draft', label: 'Draft' },
              { id: 'inactive', label: 'Inactive' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all',
                  statusFilter === s.id ? 'bg-brand-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {s.label}
                {s.id === 'draft' && draftCount > 0 && (
                  <span className="ml-1 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{draftCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        header.column.getCanSort() && 'cursor-pointer select-none hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && ' ↑'}
                        {header.column.getIsSorted() === 'desc' && ' ↓'}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={columns.length} className="py-12 text-center text-sm text-slate-400">Loading customers...</td></tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="py-12"><EmptyState title="No customers found" description="Try adjusting your search filters or add a new customer" /></td></tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      'hover:bg-slate-50/80 transition-colors',
                      row.original.status === 'draft' && 'bg-amber-50/30'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={table.getState().pagination.pageIndex + 1}
          total={filteredData.length}
          pageSize={table.getState().pagination.pageSize}
          onPageChange={(p) => table.setPageIndex(p - 1)}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditCustomer(undefined) }}
        title={
          editCustomer
            ? editCustomer.status === 'draft'
              ? `Edit Draft — ${editCustomer.name}`
              : `Edit Customer — ${editCustomer.name}`
            : 'Create Customer'
        }
        size="full"
      >
        <CreateCustomerModal
          customer={editCustomer}
          onClose={() => { setShowModal(false); setEditCustomer(undefined) }}
        />
      </Modal>
    </div>
  )
}
