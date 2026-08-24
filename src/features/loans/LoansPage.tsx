import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender, createColumnHelper, type SortingState
} from '@tanstack/react-table'
import { Plus, Download, Eye, SquarePen, FileText, SlidersHorizontal, Calculator, WalletCards, TrendingUp, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react'
import { useLoans, useCustomers, useCreateLoan, useDeleteLoan, useUpdateLoan } from '@/hooks/useDb'
import { useAuthStore } from '@/store/authStore'
import type { Loan } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import {
  Button, SearchInput, Pagination, StatusBadge, Card, CardHeader, CardTitle,
  CardBody, Modal, Input, Select, Badge, DropdownMenu, EmptyState, StatsCard, PageHeader, Textarea
} from '@/components/ui'
import { formatCurrency, formatDate, calculateEMI, generateEMISchedule, cn } from '@/utils'

const columnHelper = createColumnHelper<Loan>()

const loanTypes = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'business', label: 'Business Loan' },
  { value: 'home', label: 'Home Loan' },
  { value: 'vehicle', label: 'Vehicle Loan' },
  { value: 'gold', label: 'Gold Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'agriculture', label: 'Agriculture Loan' },
]

import { CreateCustomerModal } from '../customers/CustomersPage'

function LoanForm({ loan, onClose }: { loan?: Loan; onClose: () => void }) {
  const { data: customers = [] } = useCustomers()
  const createLoan = useCreateLoan()
  const updateLoan = useUpdateLoan()
  const { user } = useAuthStore()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState<'draft' | 'create' | null>(null)
  const [showCustModal, setShowCustModal] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form State
  const [formData, setFormData] = useState({
    customer_id: loan?.customer_id ?? '',
    loan_product: loan?.loan_product ?? 'Personal Loan',
    loan_category: loan?.loan_category ?? 'Retail',
    loan_purpose: loan?.loan_purpose ?? '',
    branch: loan?.branch ?? 'Head Office',
    account_opening_date: loan?.account_opening_date ?? new Date().toISOString().split('T')[0],

    sanctioned_amount: loan?.sanctioned_amount?.toString() ?? '',
    loan_amount: loan?.loan_amount?.toString() ?? '', // Principal
    interest_rate: loan?.interest_rate?.toString() ?? '12',
    interest_type: (loan?.interest_type ?? 'reducing') as 'flat' | 'reducing',
    duration_months: loan?.duration_months?.toString() ?? '12',
    repayment_frequency: (loan?.repayment_frequency ?? 'monthly') as 'monthly' | 'weekly' | 'fortnightly',
    repayment_method: loan?.repayment_method ?? 'NACH',
    processing_fee: loan?.processing_fee?.toString() ?? '0',
    loan_date: loan?.loan_date ?? new Date().toISOString().split('T')[0],

    repayment_start_date: loan?.repayment_start_date ?? new Date().toISOString().split('T')[0],
    first_demand_date: loan?.first_demand_date ?? new Date().toISOString().split('T')[0],
    emi_due_day: loan?.emi_due_day?.toString() ?? '5',
    grace_period: loan?.grace_period?.toString() ?? '3',
    penal_interest_rate: loan?.penal_interest_rate?.toString() ?? '2',
    late_payment_charges: loan?.late_payment_charges?.toString() ?? '500',

    guarantor_required: !!loan?.guarantor_customer_id || false,
    guarantor_customer_id: loan?.guarantor_customer_id ?? '',
    guarantor_relationship: loan?.guarantor_relationship ?? '',
    guarantor_type: loan?.guarantor_type ?? 'Financial',
    guarantor_amount: loan?.guarantor_amount?.toString() ?? '',

    security_required: !!loan?.security_type || false,
    security_type: loan?.security_type ?? '',
    security_description: loan?.security_description ?? '',
    security_owner_id: loan?.security_owner_id ?? '',
    security_ownership_type: loan?.security_ownership_type ?? 'Sole',
    security_market_value: loan?.security_market_value?.toString() ?? '',
    security_valuation_date: loan?.security_valuation_date ?? new Date().toISOString().split('T')[0],
    security_doc_number: loan?.security_doc_number ?? '',
    security_doc_status: loan?.security_doc_status ?? 'Original Deposited',
    security_insurance_required: loan?.security_insurance_required ?? false,
    security_insurance_details: loan?.security_insurance_details ?? '',
  })

  // Auto-enable conditional sections based on product selection
  useEffect(() => {
    const isGuarantorProduct = ['Personal Loan', 'Business Loan', 'Vehicle Loan'].includes(formData.loan_product)
    const isSecurityProduct = ['Home Loan', 'Vehicle Loan', 'Gold Loan'].includes(formData.loan_product)
    setFormData(prev => ({
      ...prev,
      guarantor_required: isGuarantorProduct,
      security_required: isSecurityProduct,
    }))
  }, [formData.loan_product])

  // Lookups
  const selectedCustomer = useMemo(() => customers.find(c => c.id === formData.customer_id), [customers, formData.customer_id])
  const selectedGuarantor = useMemo(() => customers.find(c => c.id === formData.guarantor_customer_id), [customers, formData.guarantor_customer_id])
  const selectedSecurityOwner = useMemo(() => customers.find(c => c.id === formData.security_owner_id), [customers, formData.security_owner_id])

  // Calculations
  const calculatedInstallments = useMemo(() => {
    const months = parseInt(formData.duration_months) || 0
    if (formData.repayment_frequency === 'weekly') return months * 4
    if (formData.repayment_frequency === 'fortnightly') return months * 2
    return months
  }, [formData.duration_months, formData.repayment_frequency])

  const calculatedEmi = useMemo(() => {
    const principal = parseFloat(formData.loan_amount) || 0
    const rate = parseFloat(formData.interest_rate) || 0
    const months = parseInt(formData.duration_months) || 0
    if (!principal || !rate || !months) return 0
    return calculateEMI(principal, rate, months, formData.interest_type as 'flat' | 'reducing', formData.repayment_frequency as any)
  }, [formData.loan_amount, formData.interest_rate, formData.duration_months, formData.interest_type, formData.repayment_frequency])

  const calculatedTotalInterest = useMemo(() => {
    const principal = parseFloat(formData.loan_amount) || 0
    return Math.max(0, calculatedEmi * calculatedInstallments - principal)
  }, [calculatedEmi, calculatedInstallments, formData.loan_amount])

  const calculatedMaturityDate = useMemo(() => {
    if (!formData.repayment_start_date) return ''
    const months = parseInt(formData.duration_months) || 0
    if (formData.repayment_frequency === 'weekly') {
      return dayjs(formData.repayment_start_date).add(months * 4, 'week').format('YYYY-MM-DD')
    } else if (formData.repayment_frequency === 'fortnightly') {
      return dayjs(formData.repayment_start_date).add(months * 2 * 2, 'week').format('YYYY-MM-DD')
    } else {
      return dayjs(formData.repayment_start_date).add(months, 'month').format('YYYY-MM-DD')
    }
  }, [formData.repayment_start_date, formData.duration_months, formData.repayment_frequency])

  const calculatedLtv = useMemo(() => {
    const principal = parseFloat(formData.loan_amount) || 0
    const value = parseFloat(formData.security_market_value) || 0
    if (!principal || !value) return 0
    return Math.round((principal / value) * 100 * 100) / 100
  }, [formData.loan_amount, formData.security_market_value])

  // Validators
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!formData.customer_id) newErrors.customer_id = 'Customer selection is required'
      if (!formData.loan_purpose) newErrors.loan_purpose = 'Loan purpose is required'
      if (!formData.account_opening_date) newErrors.account_opening_date = 'Opening date is required'
    }

    if (currentStep === 2) {
      const sanctioned = parseFloat(formData.sanctioned_amount) || 0
      const principal = parseFloat(formData.loan_amount) || 0
      const rate = parseFloat(formData.interest_rate) || 0
      const duration = parseInt(formData.duration_months) || 0

      if (sanctioned <= 0) newErrors.sanctioned_amount = 'Sanctioned amount must be greater than 0'
      if (principal <= 0) newErrors.loan_amount = 'Principal amount must be greater than 0'
      if (principal > sanctioned) newErrors.loan_amount = 'Principal amount cannot exceed sanctioned amount'
      if (rate <= 0) newErrors.interest_rate = 'Interest rate must be greater than 0'
      if (duration <= 0) newErrors.duration_months = 'Tenure must be greater than 0'
    }

    if (currentStep === 3) {
      if (!formData.repayment_start_date) newErrors.repayment_start_date = 'Repayment start date is required'
      if (!formData.first_demand_date) newErrors.first_demand_date = 'First demand date is required'

      const dueDay = parseInt(formData.emi_due_day) || 0
      if (!formData.emi_due_day) {
        newErrors.emi_due_day = 'EMI due day is required'
      } else {
        if (formData.repayment_frequency === 'weekly' && (dueDay < 1 || dueDay > 7)) {
          newErrors.emi_due_day = 'Weekly due day must be between 1 (Monday) and 7 (Sunday)'
        } else if (formData.repayment_frequency === 'fortnightly' && (dueDay < 1 || dueDay > 14)) {
          newErrors.emi_due_day = 'Fortnightly due day must be between 1 and 14'
        } else if (formData.repayment_frequency === 'monthly' && (dueDay < 1 || dueDay > 31)) {
          newErrors.emi_due_day = 'Monthly due day must be between 1 and 31'
        }
      }
    }

    if (currentStep === 4 && formData.guarantor_required) {
      if (!formData.guarantor_customer_id) newErrors.guarantor_customer_id = 'Guarantor selection is required'
      if (!formData.guarantor_relationship) newErrors.guarantor_relationship = 'Guarantor relationship is required'
    }

    if (currentStep === 5 && formData.security_required) {
      if (!formData.security_type) newErrors.security_type = 'Security type is required'
      if (!formData.security_owner_id) newErrors.security_owner_id = 'Security owner selection is required'
      if (!formData.security_market_value || parseFloat(formData.security_market_value) <= 0) {
        newErrors.security_market_value = 'Market value must be greater than 0'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1)
    } else {
      toast.error('Please fix the validation errors before moving forward.')
    }
  }

  const handlePrev = () => {
    setStep(prev => Math.max(1, prev - 1))
  }

  // Final Action: Save Draft or Create Account
  const handleSave = async (isFinalCreate: boolean) => {
    // Validate current step or whole form
    if (isFinalCreate) {
      // Validate steps 1 to 5
      let isValid = true
      for (let s = 1; s <= 5; s++) {
        if (!validateStep(s)) isValid = false
      }
      if (!isValid) {
        toast.error('All validation checks must pass before creating the account.')
        return
      }
    } else {
      // Minimal validation for draft: must have name and amount
      if (!formData.customer_id) {
        setErrors({ customer_id: 'Customer is required to save a draft' })
        return
      }
      if (!formData.loan_amount || parseFloat(formData.loan_amount) <= 0) {
        setErrors({ loan_amount: 'Principal amount is required to save a draft' })
        return
      }
    }

    setLoading(isFinalCreate ? 'create' : 'draft')
    try {
      const payload = {
        customer_id: formData.customer_id,
        loan_type: formData.loan_category.toLowerCase() as Loan['loan_type'],
        loan_amount: parseFloat(formData.loan_amount),
        interest_rate: parseFloat(formData.interest_rate),
        interest_type: formData.interest_type as 'flat' | 'reducing',
        duration_months: parseInt(formData.duration_months),
        processing_fee: parseFloat(formData.processing_fee) || 0,
        loan_date: formData.loan_date,
        status: isFinalCreate ? ('pending' as const) : ('draft' as const),

        // Wizard details
        sanctioned_amount: parseFloat(formData.sanctioned_amount) || parseFloat(formData.loan_amount),
        loan_product: formData.loan_product,
        loan_category: formData.loan_category,
        loan_purpose: formData.loan_purpose,
        branch: formData.branch,
        account_opening_date: formData.account_opening_date,
        repayment_frequency: formData.repayment_frequency as any,
        repayment_method: formData.repayment_method,
        repayment_start_date: formData.repayment_start_date,
        first_demand_date: formData.first_demand_date,
        emi_due_day: parseInt(formData.emi_due_day, 10),
        grace_period: parseInt(formData.grace_period, 10) || 0,
        penal_interest_rate: parseFloat(formData.penal_interest_rate) || 0,
        late_payment_charges: parseFloat(formData.late_payment_charges) || 0,

        // Guarantor
        guarantor_customer_id: formData.guarantor_required ? formData.guarantor_customer_id : null,
        guarantor_relationship: formData.guarantor_required ? formData.guarantor_relationship : '',
        guarantor_type: formData.guarantor_required ? formData.guarantor_type : '',
        guarantor_amount: formData.guarantor_required ? parseFloat(formData.guarantor_amount) || 0 : 0,

        // Collateral
        security_type: formData.security_required ? formData.security_type : '',
        security_description: formData.security_required ? formData.security_description : '',
        security_owner_id: formData.security_required ? formData.security_owner_id : null,
        security_ownership_type: formData.security_required ? formData.security_ownership_type : '',
        security_market_value: formData.security_required ? parseFloat(formData.security_market_value) || 0 : 0,
        security_valuation_date: formData.security_required ? formData.security_valuation_date : '',
        security_ltv: formData.security_required ? calculatedLtv : 0,
        security_doc_number: formData.security_required ? formData.security_doc_number : '',
        security_doc_status: formData.security_required ? formData.security_doc_status : '',
        security_insurance_required: formData.security_required ? formData.security_insurance_required : false,
        security_insurance_details: formData.security_required ? formData.security_insurance_details : '',

        // Auditing
        created_by: user?.full_name || 'Admin',
      }

      if (loan) {
        await updateLoan.mutateAsync({ id: loan.id, ...payload })
        toast.success('Account successfully updated!')
      } else {
        await createLoan.mutateAsync(payload)
        toast.success(isFinalCreate ? 'Loan account created and pending activation!' : 'Loan account draft saved successfully!')
      }
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(`Operation failed: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(null)
    }
  }

  // Multi-step headers
  const steps = [
    { id: 1, label: 'Customer Details', desc: 'Borrower & product selection' },
    { id: 2, label: 'Loan Details', desc: 'Sanctioned amount & rates' },
    { id: 3, label: 'Repayment Setup', desc: 'Frequency, start date & cycles' },
    { id: 4, label: 'Guarantor Setup', desc: 'Add guarantor customer' },
    { id: 5, label: 'Collateral Assets', desc: 'Pledge physical assets' },
    { id: 6, label: 'Review & Verify', desc: 'Audit final amortization schedule' }
  ]

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[550px]">
      {/* ── Left Sidebar: Step Indicators ── */}
      <div className="w-full md:w-80 bg-slate-50/80 border-r border-slate-200/60 p-6 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-6">
          <div className="pb-4 border-b border-slate-200/50">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Wizard</h4>
            <p className="text-[11px] text-slate-500 mt-1">Configure loan parameters, repayment frequency & collateral checks.</p>
          </div>

          <nav className="space-y-2">
            {steps.map((sec) => {
              const isActive = step === sec.id
              const isDone = step > sec.id
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setStep(sec.id)}
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

        {/* Informative stats panel at the bottom of the sidebar */}
        <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 text-xs">
          <p className="font-bold text-brand-800 mb-1 flex items-center gap-1.5">
            <Calculator className="h-4 w-4" />
            Amortization Preview
          </p>
          <div className="space-y-1 mt-2 text-slate-600 font-semibold">
            <div className="flex justify-between">
              <span>EMI Amount:</span>
              <span className="text-slate-900">{formatCurrency(calculatedEmi)}</span>
            </div>
            <div className="flex justify-between">
              <span>Installments:</span>
              <span className="text-slate-900">{calculatedInstallments}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Interest:</span>
              <span className="text-slate-900">{formatCurrency(calculatedTotalInterest)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Content: Form Fields ── */}
      <div className="flex-1 flex flex-col justify-between bg-white">
        <div className="p-8 overflow-y-auto max-h-[64vh]">

          {/* ── STEP 1: CUSTOMER & ACCOUNT INFORMATION ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Customer Details</h3>
                <p className="text-xs text-slate-400">Onboard the borrower and select branch segment classifications.</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <Select
                    label="Customer ID *"
                    value={formData.customer_id}
                    onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
                    options={customers.map(c => ({ value: c.id, label: `${c.customer_id} — ${c.name}` }))}
                    placeholder="Select borrower customer"
                  />
                  <FieldError msg={errors.customer_id} />
                </div>
                
                <div className="col-span-2">
                  <Input
                    label="Customer Name"
                    value={selectedCustomer?.name ?? 'No customer selected'}
                    disabled
                    placeholder="Automatically populated"
                  />
                </div>

                <Select
                  label="Loan Product *"
                  value={formData.loan_product}
                  onChange={e => setFormData({ ...formData, loan_product: e.target.value })}
                  options={[
                    { value: 'Personal Loan', label: 'Personal Loan' },
                    { value: 'Business Loan', label: 'Business Loan' },
                    { value: 'Home Loan', label: 'Home Loan' },
                    { value: 'Vehicle Loan', label: 'Vehicle Loan' },
                    { value: 'Gold Loan', label: 'Gold Loan' },
                    { value: 'Education Loan', label: 'Education Loan' },
                    { value: 'Agriculture Loan', label: 'Agriculture Loan' }
                  ]}
                />

                <Select
                  label="Loan Category / Segment *"
                  value={formData.loan_category}
                  onChange={e => setFormData({ ...formData, loan_category: e.target.value })}
                  options={[
                    { value: 'Retail', label: 'Retail Banking' },
                    { value: 'SME', label: 'SME Sector' },
                    { value: 'Priority', label: 'Priority Sector' },
                    { value: 'Corporate', label: 'Corporate Lending' }
                  ]}
                />

                <div className="col-span-2">
                  <Input
                    label="Loan Purpose *"
                    value={formData.loan_purpose}
                    onChange={e => setFormData({ ...formData, loan_purpose: e.target.value })}
                    placeholder="e.g. Purchase of equipment, home construction"
                  />
                  <FieldError msg={errors.loan_purpose} />
                </div>

                <Select
                  label="Branch *"
                  value={formData.branch}
                  onChange={e => setFormData({ ...formData, branch: e.target.value })}
                  options={[
                    { value: 'Head Office', label: 'Head Office' },
                    { value: 'Chennai', label: 'Chennai Branch' },
                    { value: 'Coimbatore', label: 'Coimbatore Branch' },
                    { value: 'Madurai', label: 'Madurai Branch' }
                  ]}
                />

                <Input
                  label="Account Opening Date *"
                  type="date"
                  value={formData.account_opening_date}
                  onChange={e => setFormData({ ...formData, account_opening_date: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: LOAN DETAILS ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Loan Details</h3>
                <p className="text-xs text-slate-400">Configure sanctioned principal, processing fees and interest calculation model.</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <Input
                  label="Sanctioned Amount (₹) *"
                  type="number"
                  value={formData.sanctioned_amount}
                  onChange={e => setFormData({ ...formData, sanctioned_amount: e.target.value })}
                  placeholder="Total sanctioned amount"
                />
                <Input
                  label="Loan Principal Amount (₹) *"
                  type="number"
                  value={formData.loan_amount}
                  onChange={e => setFormData({ ...formData, loan_amount: e.target.value })}
                  placeholder="Requested principal amount"
                />
                <div className="col-span-2">
                  <FieldError msg={errors.sanctioned_amount || errors.loan_amount} />
                </div>

                <Input
                  label="Interest Rate (% p.a.) *"
                  type="number"
                  step="0.01"
                  value={formData.interest_rate}
                  onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                  placeholder="Annual interest rate"
                />

                <Select
                  label="Interest Method *"
                  value={formData.interest_type}
                  onChange={e => setFormData({ ...formData, interest_type: e.target.value as 'flat' | 'reducing' })}
                  options={[
                    { value: 'flat', label: 'Flat Interest Rate' },
                    { value: 'reducing', label: 'Reducing Balance Interest' }
                  ]}
                />
                <div className="col-span-2">
                  <FieldError msg={errors.interest_rate} />
                </div>

                <Input
                  label="Tenure (Months) *"
                  type="number"
                  value={formData.duration_months}
                  onChange={e => setFormData({ ...formData, duration_months: e.target.value })}
                  placeholder="Number of months"
                />

                <Input
                  label="Processing Fees (₹)"
                  type="number"
                  value={formData.processing_fee}
                  onChange={e => setFormData({ ...formData, processing_fee: e.target.value })}
                  placeholder="Processing / documentation fee"
                />
                <div className="col-span-2">
                  <FieldError msg={errors.duration_months} />
                </div>

                <div className="col-span-2">
                  <Input
                    label="Sanction / Loan Date *"
                    type="date"
                    value={formData.loan_date}
                    onChange={e => setFormData({ ...formData, loan_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: REPAYMENT SETUP ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Repayment Setup</h3>
                <p className="text-xs text-slate-400">Establish the installment frequency and grace period bounds.</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <Select
                  label="Repayment Frequency *"
                  value={formData.repayment_frequency}
                  onChange={e => setFormData({ ...formData, repayment_frequency: e.target.value as 'monthly' | 'weekly' | 'fortnightly' })}
                  options={[
                    { value: 'monthly', label: 'Monthly Repayments' },
                    { value: 'weekly', label: 'Weekly Repayments' },
                    { value: 'fortnightly', label: 'Fortnightly Repayments' }
                  ]}
                />

                <Select
                  label="Repayment Method *"
                  value={formData.repayment_method}
                  onChange={e => setFormData({ ...formData, repayment_method: e.target.value })}
                  options={[
                    { value: 'NACH', label: 'NACH Debit Mandate' },
                    { value: 'PDC', label: 'Post-Dated Cheques (PDC)' },
                    { value: 'Cash', label: 'Cash Collection' },
                    { value: 'UPI', label: 'UPI / Online Portal' }
                  ]}
                />

                <Input
                  label="First Repayment Start Date *"
                  type="date"
                  value={formData.repayment_start_date}
                  onChange={e => setFormData({ ...formData, repayment_start_date: e.target.value })}
                />

                <Input
                  label="First Demand Date *"
                  type="date"
                  value={formData.first_demand_date}
                  onChange={e => setFormData({ ...formData, first_demand_date: e.target.value })}
                />
                <div className="col-span-2">
                  <FieldError msg={errors.repayment_start_date || errors.first_demand_date} />
                </div>

                <Input
                  label={formData.repayment_frequency === 'weekly' ? 'Weekly Due Day (1-7) *' : formData.repayment_frequency === 'fortnightly' ? 'Fortnightly Due Day (1-14) *' : 'Monthly Due Day (1-31) *'}
                  type="number"
                  value={formData.emi_due_day}
                  onChange={e => setFormData({ ...formData, emi_due_day: e.target.value })}
                  placeholder="e.g. 5"
                />

                <Input
                  label="Grace Period (Days)"
                  type="number"
                  value={formData.grace_period}
                  onChange={e => setFormData({ ...formData, grace_period: e.target.value })}
                  placeholder="Days before penalty applies"
                />
                <div className="col-span-2">
                  <FieldError msg={errors.emi_due_day} />
                </div>

                <Input
                  label="Penal Interest Rate (% p.a.)"
                  type="number"
                  value={formData.penal_interest_rate}
                  onChange={e => setFormData({ ...formData, penal_interest_rate: e.target.value })}
                  placeholder="Additional rate for default"
                />

                <Input
                  label="Late Payment Charges (₹)"
                  type="number"
                  value={formData.late_payment_charges}
                  onChange={e => setFormData({ ...formData, late_payment_charges: e.target.value })}
                  placeholder="Fixed late fee per instance"
                />
              </div>
            </div>
          )}

          {/* ── STEP 4: GUARANTOR (CONDITIONAL) ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Guarantor Details</h3>
                <p className="text-xs text-slate-400">Configure financial or personal guarantors associated with this account.</p>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.guarantor_required}
                    onChange={e => setFormData({ ...formData, guarantor_required: e.target.checked })}
                    className="rounded border-slate-350 text-brand-600 focus:ring-brand-500/30"
                  />
                  Require Guarantor for this Account
                </label>
              </div>

              {!formData.guarantor_required ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Guarantor Not Required</p>
                  <p className="text-[11px] text-slate-400 mt-1">Guarantors are usually required for Personal, Business, and Vehicle loans. You selected: <strong className="text-slate-600">{formData.loan_product}</strong>.</p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" type="button" onClick={() => setFormData({ ...formData, guarantor_required: true })}>
                      Enable Guarantor Manually
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-xs font-semibold text-slate-600">Borrower requires a registered guarantor.</span>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" type="button" onClick={() => setShowCustModal(true)}>
                      <Plus className="h-3 w-3" /> Register New Guarantor
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <Select
                        label="Guarantor Customer ID *"
                        value={formData.guarantor_customer_id}
                        onChange={e => setFormData({ ...formData, guarantor_customer_id: e.target.value })}
                        options={customers.filter(c => c.id !== formData.customer_id).map(c => ({ value: c.id, label: `${c.customer_id} — ${c.name}` }))}
                        placeholder="Select guarantor customer profile"
                      />
                      <FieldError msg={errors.guarantor_customer_id} />
                    </div>

                    <div className="col-span-2">
                      <Input
                        label="Guarantor Name"
                        value={selectedGuarantor?.name ?? 'No guarantor selected'}
                        disabled
                        placeholder="Automatically populated"
                      />
                    </div>

                    <Input
                      label="Relationship with Borrower *"
                      value={formData.guarantor_relationship}
                      onChange={e => setFormData({ ...formData, guarantor_relationship: e.target.value })}
                      placeholder="e.g. Spouse, Brother, Partner"
                    />

                    <Select
                      label="Guarantor Type *"
                      value={formData.guarantor_type}
                      onChange={e => setFormData({ ...formData, guarantor_type: e.target.value })}
                      options={[
                        { value: 'Financial', label: 'Financial Guarantor' },
                        { value: 'Personal', label: 'Personal Reference' },
                        { value: 'Corporate', label: 'Corporate Backing' }
                      ]}
                    />
                    <div className="col-span-2">
                      <FieldError msg={errors.guarantor_relationship} />
                    </div>

                    <div className="col-span-2">
                      <Input
                        label="Guaranteed Amount (₹)"
                        type="number"
                        value={formData.guarantor_amount}
                        onChange={e => setFormData({ ...formData, guarantor_amount: e.target.value })}
                        placeholder="Max limit guaranteed by this profile"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: SECURITY / COLLATERAL (CONDITIONAL) ── */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Security & Collateral</h3>
                <p className="text-xs text-slate-400">Pledge properties, vehicles or physical gold assets as security.</p>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.security_required}
                    onChange={e => setFormData({ ...formData, security_required: e.target.checked })}
                    className="rounded border-slate-350 text-brand-600 focus:ring-brand-500/30"
                  />
                  Require Collateral/Security Asset
                </label>
              </div>

              {!formData.security_required ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Security Collateral Not Required</p>
                  <p className="text-[11px] text-slate-400 mt-1">Collateral checks apply to Home, Vehicle, and Gold products. Product chosen: <strong className="text-slate-600">{formData.loan_product}</strong>.</p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" type="button" onClick={() => setFormData({ ...formData, security_required: true })}>
                      Enable Security Manually
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-5">
                    <Select
                      label="Security / Collateral Type *"
                      value={formData.security_type}
                      onChange={e => setFormData({ ...formData, security_type: e.target.value })}
                      options={[
                        { value: 'Property', label: 'Immovable Property / Land' },
                        { value: 'Vehicle', label: 'Vehicle Hypothecation' },
                        { value: 'Gold', label: 'Physical Gold / Jewelry' },
                        { value: 'FD', label: 'Fixed Deposit Lien' },
                        { value: 'Shares', label: 'Financial Securities / Shares' }
                      ]}
                    />
                    <FieldError msg={errors.security_type} />

                    <Select
                      label="Asset Owner (Customer) *"
                      value={formData.security_owner_id}
                      onChange={e => setFormData({ ...formData, security_owner_id: e.target.value })}
                      options={customers.map(c => ({ value: c.id, label: `${c.customer_id} — ${c.name}` }))}
                      placeholder="Select asset owner profile"
                    />
                    <FieldError msg={errors.security_owner_id} />

                    <div className="col-span-2">
                      <Input
                        label="Asset Owner Name"
                        value={selectedSecurityOwner?.name ?? 'No asset owner selected'}
                        disabled
                        placeholder="Automatically populated"
                      />
                    </div>

                    <Select
                      label="Ownership Type *"
                      value={formData.security_ownership_type}
                      onChange={e => setFormData({ ...formData, security_ownership_type: e.target.value })}
                      options={[
                        { value: 'Sole', label: 'Sole Ownership' },
                        { value: 'Joint', label: 'Joint Ownership' },
                        { value: 'Third Party', label: 'Third-Party Pledge' }
                      ]}
                    />

                    <Input
                      label="Market Valuation (₹) *"
                      type="number"
                      value={formData.security_market_value}
                      onChange={e => setFormData({ ...formData, security_market_value: e.target.value })}
                      placeholder="Current asset market value"
                    />
                    <div className="col-span-2">
                      <FieldError msg={errors.security_market_value} />
                    </div>

                    <Input
                      label="Calculated LTV (%)"
                      value={`${calculatedLtv}%`}
                      disabled
                      placeholder="Computed Loan-to-Value percentage"
                    />

                    <Input
                      label="Valuation Date *"
                      type="date"
                      value={formData.security_valuation_date}
                      onChange={e => setFormData({ ...formData, security_valuation_date: e.target.value })}
                    />

                    <div className="col-span-2">
                      <Textarea
                        label="Asset Description"
                        value={formData.security_description}
                        onChange={e => setFormData({ ...formData, security_description: e.target.value })}
                        placeholder="Details of the pledged asset, registration numbers, weights, or dimensions..."
                        rows={2}
                      />
                    </div>

                    <Input
                      label="Document Registration Number"
                      value={formData.security_doc_number}
                      onChange={e => setFormData({ ...formData, security_doc_number: e.target.value })}
                      placeholder="Document / Deed / RC book number"
                    />

                    <Select
                      label="Document Safe Status *"
                      value={formData.security_doc_status}
                      onChange={e => setFormData({ ...formData, security_doc_status: e.target.value })}
                      options={[
                        { value: 'Original Deposited', label: 'Original Deposited in Vault' },
                        { value: 'Certified Copy', label: 'Certified True Copy Only' },
                        { value: 'Pending Deposit', label: 'Pending vault deposit' }
                      ]}
                    />

                    <div className="col-span-2 flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mt-2">
                      <input
                        type="checkbox"
                        id="insurance_req"
                        checked={formData.security_insurance_required}
                        onChange={e => setFormData({ ...formData, security_insurance_required: e.target.checked })}
                        className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                      />
                      <label htmlFor="insurance_req" className="text-xs font-bold text-slate-700 cursor-pointer">
                        Asset Insurance Policy Required & Deposited
                      </label>
                    </div>

                    {formData.security_insurance_required && (
                      <div className="col-span-2">
                        <Input
                          label="Insurance Policy Details"
                          value={formData.security_insurance_details}
                          onChange={e => setFormData({ ...formData, security_insurance_details: e.target.value })}
                          placeholder="Policy number, Provider name, Sum Assured & Expiry date"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 6: REVIEW & VERIFY ── */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-slate-100 mb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Final Review & Verification</h3>
                <p className="text-xs text-slate-400">Verify all loan account configurations, collateral levels, and schedules.</p>
              </div>

              {/* Grid sections for review */}
              <div className="grid grid-cols-2 gap-4">
                {/* Borrower parameters */}
                <div className="bg-slate-50/80 border border-slate-200/60 p-4.5 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Borrower details</h4>
                  <div className="text-xs font-semibold space-y-1 mt-2">
                    <p><strong>Name:</strong> {selectedCustomer?.name || '—'}</p>
                    <p><strong>Mobile:</strong> {selectedCustomer?.mobile || '—'}</p>
                    <p><strong>Branch:</strong> {formData.branch}</p>
                    <p><strong>Product:</strong> {formData.loan_product} ({formData.loan_category})</p>
                  </div>
                </div>

                {/* Financial calculations */}
                <div className="bg-slate-50/80 border border-slate-200/60 p-4.5 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Loan & Repayment Parameters</h4>
                  <div className="text-xs font-semibold space-y-1 mt-2">
                    <p><strong>Sanctioned principal:</strong> {formatCurrency(parseFloat(formData.sanctioned_amount) || 0)}</p>
                    <p><strong>Loan amount:</strong> {formatCurrency(parseFloat(formData.loan_amount) || 0)}</p>
                    <p><strong>Rate / Method:</strong> {formData.interest_rate}% ({formData.interest_type})</p>
                    <p><strong>Installment frequency:</strong> {formData.repayment_frequency}</p>
                  </div>
                </div>

                {/* Amortization parameters */}
                <div className="col-span-2 bg-emerald-50/40 border border-emerald-100 p-4.5 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Repayment & Amortization Estimates</h4>
                  <div className="grid grid-cols-3 gap-4 text-xs font-bold text-emerald-900 mt-3">
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Estimated EMI Amount</p>
                      <p className="text-base font-extrabold amount-display mt-0.5">{formatCurrency(calculatedEmi)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Installments Count</p>
                      <p className="text-base font-extrabold amount-display mt-0.5">{calculatedInstallments} payments</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Maturity Date Estimate</p>
                      <p className="text-sm font-extrabold mt-1">{calculatedMaturityDate ? formatDate(calculatedMaturityDate) : '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Guarantor Details */}
                <div className="bg-slate-50/80 border border-slate-200/60 p-4.5 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Guarantor references</h4>
                  <div className="text-xs font-semibold space-y-1 mt-2">
                    {formData.guarantor_required && selectedGuarantor ? (
                      <>
                        <p><strong>Guarantor:</strong> {selectedGuarantor.name} ({formData.guarantor_relationship})</p>
                        <p><strong>Verification limit:</strong> {formatCurrency(parseFloat(formData.guarantor_amount) || 0)}</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No guarantor references configured.</p>
                    )}
                  </div>
                </div>

                {/* Collateral details */}
                <div className="bg-slate-50/80 border border-slate-200/60 p-4.5 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Collateral details</h4>
                  <div className="text-xs font-semibold space-y-1 mt-2">
                    {formData.security_required && formData.security_type ? (
                      <>
                        <p><strong>Type:</strong> {formData.security_type}</p>
                        <p><strong>Market Value:</strong> {formatCurrency(parseFloat(formData.security_market_value) || 0)} | <strong>LTV:</strong> {calculatedLtv}%</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No security collateral asset registered.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                <p><strong>Created By:</strong> {user?.full_name || 'Admin'}</p>
                <p><strong>Status Preview:</strong> Pending Activation</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Wizard Controls footer ── */}
        <div className="flex justify-between items-center px-8 py-5 border-t border-slate-100 bg-slate-50/60 rounded-br-2xl flex-shrink-0">
          <div>
            {step > 1 && (
              <Button variant="outline" type="button" onClick={handlePrev}>
                Previous Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={!!loading}>Cancel</Button>

            {/* Save Draft Action always visible to park state */}
            <Button
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={() => handleSave(false)}
              loading={loading === 'draft'}
            >
              Save Draft
            </Button>

            {step < 6 ? (
              <Button type="button" onClick={handleNext}>
                Next Step
              </Button>
            ) : (
              <Button
                onClick={() => handleSave(true)}
                loading={loading === 'create'}
              >
                Create Account
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-modal: Create Customer */}
      <Modal
        isOpen={showCustModal}
        onClose={() => setShowCustModal(false)}
        title="Register New Customer"
        size="xl"
      >
        <CreateCustomerModal
          onClose={() => setShowCustModal(false)}
          onSuccess={(c) => {
            setFormData(prev => ({
              ...prev,
              guarantor_customer_id: c.id,
            }))
            toast.success(`Registered and selected customer: ${c.name}`)
          }}
        />
      </Modal>
    </div>
  )
}


function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-red-500 text-xs font-medium mt-1">{msg}</p>
}

export default function LoansPage() {
  const navigate = useNavigate()
  const [sorting, setSorting] = useLocalStorage<SortingState>('loans_sorting', [])
  const [globalFilter, setGlobalFilter] = useLocalStorage<string>('loans_search', '')
  const [showModal, setShowModal] = useState(false)
  const [editLoan, setEditLoan] = useState<Loan | undefined>()
  const [statusFilter, setStatusFilter] = useLocalStorage<string>('loans_status_filter', 'all')

  const { data: loans = [], isLoading } = useLoans()
  const deleteLoan = useDeleteLoan()

  const handleDeleteLoan = async (id: string, loanNumber: string) => {
    if (!window.confirm(`Delete loan account ${loanNumber}? This will also remove the EMI schedule and payment history. This action cannot be undone.`)) return
    try {
      await deleteLoan.mutateAsync(id)
    } catch {
      alert('Failed to delete account. Please try again.')
    }
  }

  const filteredData = useMemo(() =>
    loans.filter((l) => statusFilter === 'all' || l.status === statusFilter),
    [loans, statusFilter]
  )

  const columns = useMemo(() => [
    columnHelper.accessor('loan_number', {
      header: 'Loan No.',
      cell: (info) => (
        <button
          onClick={() => navigate(`/loans/${info.row.original.id}`)}
          className="text-xs font-mono text-brand-600 font-bold hover:underline hover:text-brand-700 transition-colors cursor-pointer"
        >
          {info.getValue()}
        </button>
      ),
    }),
    columnHelper.accessor('customer_name', {
      header: 'Customer Name',
      cell: (info) => <span className="text-sm font-bold text-slate-800 tracking-tight">{info.getValue()}</span>,
    }),
    columnHelper.accessor('loan_type', {
      header: 'Category',
      cell: (info) => (
        <Badge variant="outline" className="capitalize text-[10px] font-bold">{info.getValue().replace('_', ' ')}</Badge>
      ),
    }),
    columnHelper.accessor('loan_amount', {
      header: 'Principal',
      cell: (info) => <span className="text-xs font-bold text-slate-800 amount-display">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('interest_rate', {
      header: 'Interest Rate',
      cell: (info) => (
        <span className="text-xs font-semibold text-slate-700">
          {info.getValue()}%{' '}
          <span className="text-[10px] text-slate-400 capitalize font-medium">({info.row.original.interest_type})</span>
        </span>
      ),
    }),
    columnHelper.accessor('emi_amount', {
      header: 'Monthly EMI',
      cell: (info) => <span className="text-xs font-extrabold amount-display text-emerald-600">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('remaining_emi', {
      header: 'Progress',
      cell: (info) => {
        const total = info.row.original.emi_count
        const remaining = info.getValue()
        const pct = ((total - remaining) / total) * 100
        return (
          <div className="min-w-[100px]">
            <div className="flex justify-between text-[11px] font-semibold mb-1">
              <span className="text-slate-700">{total - remaining}/{total}</span>
              <span className="text-slate-400">{remaining} left</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('remaining_balance', {
      header: 'Outstanding',
      cell: (info) => <span className="text-xs font-bold amount-display text-slate-800">{formatCurrency(info.getValue())}</span>,
    }),

    columnHelper.accessor('loan_date', {
      header: 'Date',
      cell: (info) => <span className="text-xs text-slate-400 font-medium">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <DropdownMenu
          align="right"
          trigger={
            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          }
          items={[
            { label: 'View Loan', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/loans/${info.row.original.id}`) },
            { label: 'Edit Loan', icon: <SquarePen className="h-4 w-4" />, onClick: () => { setEditLoan(info.row.original); setShowModal(true) } },
            { label: 'View Agreement', icon: <FileText className="h-4 w-4" />, onClick: () => { } },
            { label: 'Delete Account', icon: <Trash2 className="h-4 w-4 text-red-500" />, onClick: () => handleDeleteLoan(info.row.original.id, info.row.original.loan_number), variant: 'danger' as const, separator: true },
          ]}
        />
      ),
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
      <PageHeader
        title="Loan Accounts"
        subtitle="Manage active loan disbursals, interest types, and EMI repayment plans."
        action={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export Accounts
            </Button>
            <Button onClick={() => { setEditLoan(undefined); setShowModal(true) }}>
              <Plus className="h-4 w-4" />
              Create Account
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Loan Portfolio', value: loans.length, icon: <WalletCards className="h-5 w-5" />, bg: 'kpi-blue', iconBg: 'bg-brand-600' },
          { label: 'Active Disbursals', value: loans.filter((l) => l.status === 'active').length, icon: <TrendingUp className="h-5 w-5" />, bg: 'kpi-green', iconBg: 'bg-emerald-600' },
          { label: 'Closed Accounts', value: loans.filter((l) => l.status === 'closed').length, icon: <CheckCircle2 className="h-5 w-5" />, bg: 'kpi-purple', iconBg: 'bg-violet-600' },
          { label: 'Overdue Loans', value: loans.filter((l) => l.status === 'overdue').length, icon: <AlertTriangle className="h-5 w-5" />, bg: 'kpi-red', iconBg: 'bg-red-600' },
        ].map((s) => (
          <StatsCard key={s.label} title={s.label} value={s.value.toString()} icon={s.icon} bgClass={s.bg} iconBg={s.iconBg} />
        ))}
      </div>

      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <SearchInput
            className="w-72"
            placeholder="Search loan number, customer..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          <div className="flex gap-1.5 ml-auto bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            {['all', 'active', 'overdue', 'closed', 'pending'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all',
                  statusFilter === s ? 'bg-brand-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className={cn(
                        'whitespace-nowrap',
                        h.column.getCanSort() && 'cursor-pointer select-none hover:text-slate-900'
                      )}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === 'asc' && ' ↑'}
                      {h.column.getIsSorted() === 'desc' && ' ↓'}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length}><EmptyState title="No loans found" /></td></tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={table.getState().pagination.pageIndex + 1}
          total={filteredData.length}
          pageSize={10}
          onPageChange={(p) => table.setPageIndex(p - 1)}
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editLoan ? 'Edit Loan Account' : 'Create Account'}
        size="full"
      >
        <LoanForm loan={editLoan} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
