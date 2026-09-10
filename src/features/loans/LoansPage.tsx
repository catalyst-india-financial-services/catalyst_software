import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender, createColumnHelper, type SortingState
} from '@tanstack/react-table'
import { Plus, Download, Eye, SquarePen, FileText, SlidersHorizontal, Calculator, WalletCards, TrendingUp, CheckCircle2, AlertTriangle, Trash2, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLoans, useCustomers, useCreateLoan, useDeleteLoan, useUpdateLoan, useLoanPurposeOptions, useAddLoanPurposeOption } from '@/hooks/useDb'
import { useAuthStore } from '@/store/authStore'
import type { Loan } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import {
  Button, SearchInput, Pagination, StatusBadge, Card, CardHeader, CardTitle,
  CardBody, Modal, Input, Select, Badge, DropdownMenu, EmptyState, StatsCard, PageHeader, Textarea
} from '@/components/ui'
import {
  formatCurrency, formatDate, calculateEMI, generateEMISchedule, cn,
  calculateLoanSchedule, type LoanStructureType, type CompositePhase, DEFAULT_COMPOSITE_PHASES
} from '@/utils'

const columnHelper = createColumnHelper<Loan>()

const loanTypes = [
  { value: 'regular', label: 'Regular Loan' },
  { value: 'interest_only', label: 'Interest Loan' },
  { value: 'composite', label: 'Composite Loan' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'business', label: 'Business Loan' },
  { value: 'home', label: 'Home Loan' },
  { value: 'vehicle', label: 'Vehicle Loan' },
  { value: 'gold', label: 'Gold Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'agriculture', label: 'Agriculture Loan' },
]

import { CreateCustomerModal } from '../customers/CustomersPage'

const LOAN_SECTION_REQUIRED_FIELDS = {
  1: ['customer_id', 'loan_product', 'loan_category', 'loan_purpose', 'branch', 'account_opening_date'],
  2: ['sanctioned_amount', 'loan_structure_type', 'loan_date'],
  3: ['repayment_frequency', 'repayment_method', 'repayment_start_date', 'first_demand_date', 'emi_due_day'],
  4: ['guarantor_customer_id', 'guarantor_relationship', 'guarantor_type'],
  5: ['security_type', 'security_owner_id', 'security_ownership_type', 'security_market_value', 'security_valuation_date', 'security_doc_status'],
  6: [],
} as const

const LOAN_SECTION_TICK_FIELDS = {
  1: ['customer_id', 'loan_purpose', 'account_opening_date'],
  2: ['sanctioned_amount', 'loan_structure_type'],
  3: ['repayment_start_date', 'first_demand_date', 'emi_due_day'],
  4: ['guarantor_customer_id', 'guarantor_relationship'],
  5: ['security_type', 'security_owner_id', 'security_market_value'],
  6: [],
} as const

function isLoanFieldFilled(value: unknown) {
  if (typeof value === 'string') return value.trim().length > 0
  return value !== null && value !== undefined
}

function LoanForm({ loan, onClose, onCompletionChange }: { loan?: Loan; onClose: () => void; onCompletionChange?: (completion: number) => void }) {
  const { data: customers = [] } = useCustomers()
  const activeCustomers = customers.filter(c => c.status === 'active')
  const createLoan = useCreateLoan()
  const updateLoan = useUpdateLoan()
  const { user, isBranchUser, userBranch, selectedBranch } = useAuthStore()
  const activeBranch = isBranchUser ? userBranch : selectedBranch

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState<'draft' | 'create' | null>(null)
  const [showCustModal, setShowCustModal] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const steps = [
    { id: 1, label: 'Customer Details', desc: 'Borrower & product selection' },
    { id: 2, label: 'Loan Details', desc: 'Sanctioned amount & rates' },
    { id: 3, label: 'Repayment Setup', desc: 'Frequency, start date & cycles' },
    { id: 4, label: 'Guarantor Setup', desc: 'Add guarantor customer' },
    { id: 5, label: 'Collateral Assets', desc: 'Pledge physical assets' },
    { id: 6, label: 'Review & Verify', desc: 'Audit final amortization schedule' }
  ]
  const stepsForCompletion = steps.map((sec) => sec.id)

  // Form State
  const [formData, setFormData] = useState({
    customer_id: loan?.customer_id ?? '',
    loan_product: loan?.loan_product ?? 'Personal Loan',
    loan_category: loan?.loan_category ?? 'Retail',
    loan_purpose: loan?.loan_purpose ?? '',
    branch: loan?.branch ?? (activeBranch ? activeBranch : 'Head Office'),
    account_opening_date: loan?.account_opening_date ?? new Date().toISOString().split('T')[0],

    sanctioned_amount: loan?.sanctioned_amount?.toString() ?? '',
    loan_amount: loan?.loan_amount?.toString() ?? '', // Principal
    loan_structure_type: ((loan as any)?.loan_structure_type || (loan?.loan_type === 'composite' || loan?.loan_type === 'interest_only' || loan?.loan_type === 'regular' ? loan.loan_type : 'regular')) as LoanStructureType,
    monthly_roi: ((loan as any)?.monthly_roi?.toString() ?? (loan?.interest_rate ? (loan.interest_rate / 12).toString() : '1')),
    composite_phases: ((loan as any)?.composite_phases && (loan as any).composite_phases.length > 0 ? (loan as any).composite_phases : DEFAULT_COMPOSITE_PHASES) as CompositePhase[],
    interest_rate: loan?.interest_rate?.toString() ?? '12',
    interest_type: (loan?.interest_type ?? 'flat') as 'flat' | 'reducing',
    duration_months: loan?.duration_months?.toString() ?? '25',
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

  const getSectionRequiredFields = (sectionId: number) => {
    if (sectionId === 4 && !formData.guarantor_required) return []
    if (sectionId === 5 && !formData.security_required) return []
    return [...LOAN_SECTION_REQUIRED_FIELDS[sectionId as keyof typeof LOAN_SECTION_REQUIRED_FIELDS]]
  }

  const getSectionTickFields = (sectionId: number) => {
    if (sectionId === 4 && !formData.guarantor_required) return []
    if (sectionId === 5 && !formData.security_required) return []
    return [...LOAN_SECTION_TICK_FIELDS[sectionId as keyof typeof LOAN_SECTION_TICK_FIELDS]]
  }

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

  const { data: loanPurposeOptions = [] } = useLoanPurposeOptions()
  const addLoanPurposeOption = useAddLoanPurposeOption()
  const [isAddingPurpose, setIsAddingPurpose] = useState(false)
  const [newPurposeName, setNewPurposeName] = useState('')

  // Calculations based on 3 Loan Types
  const calculatedScheduleResult = useMemo(() => {
    const principal = parseFloat(formData.sanctioned_amount || formData.loan_amount) || 0
    const months = parseInt(formData.duration_months) || (formData.loan_structure_type === 'composite' ? 30 : 25)
    const roi = parseFloat(formData.monthly_roi) || (parseFloat(formData.interest_rate) / 12) || 1
    const startDate = formData.repayment_start_date || formData.loan_date || new Date().toISOString().split('T')[0]

    return calculateLoanSchedule({
      loanAmount: principal,
      loanStructureType: formData.loan_structure_type,
      tenureMonths: months,
      monthlyRoi: roi,
      startDate,
      frequency: formData.repayment_frequency,
      phases: formData.composite_phases,
    })
  }, [
    formData.sanctioned_amount,
    formData.loan_amount,
    formData.loan_structure_type,
    formData.duration_months,
    formData.monthly_roi,
    formData.interest_rate,
    formData.repayment_start_date,
    formData.loan_date,
    formData.repayment_frequency,
    formData.composite_phases,
  ])

  const calculatedInstallments = useMemo(() => {
    return calculatedScheduleResult.schedule.length
  }, [calculatedScheduleResult])

  const calculatedEmi = useMemo(() => {
    return calculatedScheduleResult.schedule[0]?.emi_amount || 0
  }, [calculatedScheduleResult])

  const calculatedTotalInterest = useMemo(() => {
    return calculatedScheduleResult.totalInterest
  }, [calculatedScheduleResult])

  const calculatedMaturityDate = useMemo(() => {
    return calculatedScheduleResult.maturityDate
  }, [calculatedScheduleResult])

  const calculatedLtv = useMemo(() => {
    const principal = parseFloat(formData.sanctioned_amount || formData.loan_amount) || 0
    const value = parseFloat(formData.security_market_value) || 0
    if (!principal || !value) return 0
    return Math.round((principal / value) * 100 * 100) / 100
  }, [formData.sanctioned_amount, formData.loan_amount, formData.security_market_value])

  const sectionCompletion = useMemo(() => {
    return Object.fromEntries(
      stepsForCompletion.map((sectionId) => {
        const fields = getSectionRequiredFields(sectionId)
        const filledCount = fields.filter((field) => isLoanFieldFilled((formData as Record<string, unknown>)[field])).length
        const completion = fields.length === 0 ? 100 : Math.round((filledCount / fields.length) * 100)
        return [sectionId, completion]
      })
    ) as Record<number, number>
  }, [formData.guarantor_required, formData.security_required, formData])

  const sectionTickCompletion = useMemo(() => {
    return Object.fromEntries(
      stepsForCompletion.map((sectionId) => {
        const fields = getSectionTickFields(sectionId)
        const filledCount = fields.filter((field) => isLoanFieldFilled((formData as Record<string, unknown>)[field])).length
        const completion = fields.length === 0 ? 100 : Math.round((filledCount / fields.length) * 100)
        return [sectionId, completion]
      })
    ) as Record<number, number>
  }, [formData.guarantor_required, formData.security_required, formData])

  const overallCompletion = useMemo(() => {
    const allRequiredFields = stepsForCompletion.flatMap((sectionId) => getSectionRequiredFields(sectionId))
    const filledCount = allRequiredFields.filter((field) => isLoanFieldFilled((formData as Record<string, unknown>)[field])).length
    return allRequiredFields.length === 0 ? 0 : Math.round((filledCount / allRequiredFields.length) * 100)
  }, [formData.guarantor_required, formData.security_required, formData])

  useEffect(() => {
    onCompletionChange?.(overallCompletion)
  }, [onCompletionChange, overallCompletion])

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
      const duration = parseInt(formData.duration_months) || 0
      const monthlyRoi = parseFloat(formData.monthly_roi) || 0

      if (sanctioned <= 0) newErrors.sanctioned_amount = 'Sanctioned amount must be greater than 0'
      if (!formData.loan_structure_type) newErrors.loan_structure_type = 'Please select a loan type'
      if (formData.loan_structure_type !== 'composite') {
        if (duration <= 0) newErrors.duration_months = 'Tenure must be greater than 0'
        if (monthlyRoi <= 0) newErrors.monthly_roi = 'Monthly ROI must be greater than 0'
      } else {
        if (!formData.composite_phases || formData.composite_phases.length === 0) {
          newErrors.composite_phases = 'At least one phase must be configured'
        }
      }

      if (!formData.loan_date) {
        newErrors.loan_date = 'Sanction / Loan date is required'
      }
    }

    if (currentStep === 3) {
      if (!formData.repayment_start_date) {
        newErrors.repayment_start_date = 'Repayment start date is required'
      }

      if (!formData.first_demand_date) {
        newErrors.first_demand_date = 'First demand date is required'
      }

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
      if (!formData.security_valuation_date) {
        newErrors.security_valuation_date = 'Valuation date is required'
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
  // Draft: saves with status='draft', account is NOT active — just parked
  // Create Account: saves with status='pending' (awaiting admin activation/KYC)
  // Verified: status shown in table when all mandatory fields are complete AND status is pending
  const handleSave = async (isFinalCreate: boolean) => {
    if (isFinalCreate) {
      // Must pass all section validations before creating
      let isValid = true
      for (let s = 1; s <= 5; s++) {
        if (!validateStep(s)) isValid = false
      }
      if (!isValid) {
        toast.error('All validation checks must pass before creating the account.')
        return
      }
    } else {
      // Minimal validation for draft: must have a customer selected
      if (!formData.customer_id) {
        setErrors({ customer_id: 'Customer is required to save a draft' })
        toast.error('Please select a customer before saving as draft.')
        return
      }
    }

    setLoading(isFinalCreate ? 'create' : 'draft')
    try {
      // Determine status:
      //   draft  → user clicked "Save Draft" (incomplete, not yet an account)
      //   pending → user clicked "Create Account" (submitted for activation, KYC pending)
      const computedStatus: 'draft' | 'pending' = isFinalCreate ? 'pending' : 'draft'
      const principalVal = formData.sanctioned_amount ? parseFloat(formData.sanctioned_amount) : (formData.loan_amount ? parseFloat(formData.loan_amount) : 0)
      const computedTenure = formData.loan_structure_type === 'composite'
        ? calculatedScheduleResult.totalTenureMonths
        : (parseInt(formData.duration_months, 10) || 25)
      const computedMonthlyRoi = parseFloat(formData.monthly_roi) || (parseFloat(formData.interest_rate) / 12) || 1
      const structureProductLabel = formData.loan_structure_type === 'composite'
        ? 'Composite Loan'
        : formData.loan_structure_type === 'interest_only'
        ? 'Interest Loan'
        : 'Regular Loan'

      const payload = {
        customer_id: formData.customer_id,
        loan_type: (formData.loan_structure_type || 'regular') as Loan['loan_type'],
        loan_amount: principalVal,
        interest_rate: computedMonthlyRoi * 12,
        interest_type: (formData.interest_type as 'flat' | 'reducing') || 'flat',
        duration_months: computedTenure,
        processing_fee: parseFloat(formData.processing_fee) || 0,
        loan_date: formData.loan_date || formData.account_opening_date || new Date().toISOString().split('T')[0],
        status: computedStatus,

        // Loan Structure & Phases
        loan_structure_type: formData.loan_structure_type,
        monthly_roi: computedMonthlyRoi,
        composite_phases: formData.composite_phases,

        // Wizard details
        sanctioned_amount: principalVal,
        loan_product: structureProductLabel,
        loan_category: formData.loan_category,
        loan_purpose: formData.loan_purpose,
        branch: formData.branch,
        account_opening_date: formData.account_opening_date,
        repayment_frequency: formData.repayment_frequency as any,
        repayment_method: formData.repayment_method,
        repayment_start_date: formData.repayment_start_date,
        first_demand_date: formData.first_demand_date,
        emi_due_day: parseInt(formData.emi_due_day, 10) || 5,
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
        if (isFinalCreate) {
          toast.success('Account submitted! Status: Pending — KYC verification in progress.')
        } else {
          toast.success('Draft saved. The account will show as Draft until you complete and submit it.')
        }
      }
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(`Operation failed: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full min-h-0 overflow-hidden">
      {/* ── Left Sidebar: Step Indicators ── */}
      <div className="w-full md:w-56 bg-slate-50/80 border-r border-slate-200/60 p-3 flex flex-col justify-between flex-shrink-0 overflow-y-auto">
        <div className="space-y-3">
          <div className="pb-4 border-b border-slate-200/50">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Wizard</h4>
            <p className="text-[11px] text-slate-500 mt-1">Configure loan parameters, repayment frequency & collateral checks.</p>
          </div>

          <nav className="space-y-2">
            {steps.map((sec) => {
              const isActive = step === sec.id
              const isDone = step > sec.id
              const isSectionComplete = (sectionTickCompletion[sec.id] ?? 0) === 100
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setStep(sec.id)}
                  className={cn(
                    'w-full flex items-start gap-2 p-2.5 rounded-2xl text-left transition-all border outline-none',
                    isActive
                      ? 'bg-white border-slate-200/80 shadow-md shadow-slate-100/50 text-slate-800'
                      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/40'
                  )}
                >
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all mt-0.5',
                    isActive && 'bg-brand-600 text-white shadow-xs',
                    isDone && (isSectionComplete ? 'bg-emerald-100 text-emerald-700 border-none' : 'bg-red-100 text-red-700 border-none'),
                    !isActive && !isDone && 'bg-slate-200/60 text-slate-500'
                  )}>
                    {isDone ? <CheckCircle2 className="h-4.5 w-4.5" /> : sec.id}
                  </span>
                  <div>
                    <p className={cn('text-[10px] font-bold', isActive ? 'text-slate-800' : 'text-slate-600')}>{sec.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sec.desc}</p>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

      </div>

      {/* ── Right Content: Form Fields ── */}
      <div className="flex-1 flex flex-col justify-between bg-white min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 p-3 overflow-y-auto">

          {/* ── STEP 1: CUSTOMER & ACCOUNT INFORMATION ── */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Select
                    label="Customer ID *"
                    value={formData.customer_id}
                    onChange={e => {
                      setFormData({ ...formData, customer_id: e.target.value })
                      if (errors.customer_id) {
                        setErrors(prev => {
                          const next = { ...prev }
                          delete next.customer_id
                          return next
                        })
                      }
                    }}
                     options={activeCustomers.map(c => ({ value: c.id, label: `${c.customer_id} — ${c.name}` }))}
                    placeholder="Select borrower customer"
                  />
                  <FieldError msg={errors.customer_id} />
                </div>
                
                <div>
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Loan Purpose *</label>
                  <div className="relative">
                    <select
                      value={formData.loan_purpose}
                      onChange={e => setFormData({ ...formData, loan_purpose: e.target.value })}
                      className={cn(
                        'w-full border rounded-lg px-3 py-2 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white font-medium text-slate-700',
                        errors.loan_purpose ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <option value="">Select loan purpose</option>
                      {loanPurposeOptions.map(opt => (
                        <option key={opt.id} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.loan_purpose} />
                  {!isAddingPurpose ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingPurpose(true)}
                      className="text-[10px] font-bold text-brand-600 hover:text-brand-700 mt-1"
                    >
                      + Add new loan purpose
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="text"
                        value={newPurposeName}
                        onChange={e => setNewPurposeName(e.target.value)}
                        placeholder="New loan purpose name"
                        className="flex-1 border rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (!newPurposeName.trim()) return
                            addLoanPurposeOption.mutate(newPurposeName.trim(), {
                              onSuccess: () => {
                                setFormData(prev => ({ ...prev, loan_purpose: newPurposeName.trim() }))
                                setNewPurposeName('')
                                setIsAddingPurpose(false)
                                toast.success('Loan purpose added')
                              },
                              onError: (err: any) => toast.error(err.message || 'Failed to add loan purpose'),
                            })
                          } else if (e.key === 'Escape') {
                            setIsAddingPurpose(false)
                            setNewPurposeName('')
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newPurposeName.trim()) return
                          addLoanPurposeOption.mutate(newPurposeName.trim(), {
                            onSuccess: () => {
                              setFormData(prev => ({ ...prev, loan_purpose: newPurposeName.trim() }))
                              setNewPurposeName('')
                              setIsAddingPurpose(false)
                              toast.success('Loan purpose added')
                            },
                            onError: (err: any) => toast.error(err.message || 'Failed to add loan purpose'),
                          })
                        }}
                        className="px-2.5 py-1.5 text-[10px] font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsAddingPurpose(false); setNewPurposeName('') }}
                        className="px-2.5 py-1.5 text-[10px] font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <Select
                    label="Branch *"
                    value={formData.branch}
                    onChange={e => setFormData({ ...formData, branch: e.target.value })}
                    disabled={!!activeBranch}
                    options={[
                      { value: 'Head Office', label: 'Head Office' },
                      { value: 'Aniyapuram', label: 'Aniyapuram Branch' },
                      { value: 'Vallipuram', label: 'Vallipuram Branch' },
                      { value: 'Namakkal', label: 'Namakkal Branch' }
                    ]}
                  />
                  {activeBranch && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                      Auto-set to your branch. Cannot be changed.
                    </p>
                  )}
                </div>

                <Input
                  label="Account Opening Date *"
                  type="date"
                  value={formData.account_opening_date}
                  onChange={e => setFormData({ ...formData, account_opening_date: e.target.value })}
                  error={errors.account_opening_date}
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: LOAN DETAILS ── */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Sanctioned Amount (₹) *"
                  type="number"
                  value={formData.sanctioned_amount}
                  onChange={e => {
                    const val = e.target.value.replace(/^0+/, '')
                    setFormData({
                      ...formData,
                      sanctioned_amount: val,
                      loan_amount: val,
                    })
                  }}
                  placeholder="Total sanctioned amount (e.g. 100000)"
                />

                <Select
                  label="Loan Type *"
                  value={formData.loan_structure_type}
                  onChange={e => {
                    const nextType = e.target.value as LoanStructureType
                    setFormData(prev => ({
                      ...prev,
                      loan_structure_type: nextType,
                      ...(nextType === 'regular'
                        ? { duration_months: '25', monthly_roi: '1', interest_rate: '12' }
                        : nextType === 'interest_only'
                        ? { duration_months: '25', monthly_roi: '2', interest_rate: '24' }
                        : { duration_months: '30', monthly_roi: '1', interest_rate: '12' }),
                    }))
                  }}
                  options={[
                    { value: 'regular', label: 'Regular Loan' },
                    { value: 'interest_only', label: 'Interest Loan' },
                    { value: 'composite', label: 'Composite Loan' }
                  ]}
                />
                <div className="col-span-2">
                  <FieldError msg={errors.sanctioned_amount || errors.loan_structure_type} />
                </div>

                {/* ── REGULAR LOAN INPUTS ── */}
                {formData.loan_structure_type === 'regular' && (
                  <>
                    <Input
                      label="Tenure (Months) *"
                      type="number"
                      value={formData.duration_months}
                      onChange={e => setFormData({ ...formData, duration_months: e.target.value })}
                      placeholder="e.g. 25"
                    />

                    <div>
                      <Input
                        label="ROI (% per month) *"
                        type="number"
                        step="0.1"
                        value={formData.monthly_roi}
                        onChange={e => setFormData({
                          ...formData,
                          monthly_roi: e.target.value,
                          interest_rate: ((parseFloat(e.target.value) || 0) * 12).toString()
                        })}
                        placeholder="e.g. 1"
                      />
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Annual equivalent: {((parseFloat(formData.monthly_roi) || 0) * 12).toFixed(1)}% p.a.
                      </p>
                    </div>
                    <div className="col-span-2">
                      <FieldError msg={errors.duration_months || errors.monthly_roi} />
                    </div>

                    {/* Calculation Summary Card for Regular Loan */}
                    <div className="col-span-2 bg-blue-50/60 border border-blue-200/80 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <Calculator className="h-4 w-4 text-blue-600" /> Regular Loan Calculation Parameters
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Equal Principal Amortization
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-blue-900 mt-2">
                        <div>
                          <p className="text-[10px] text-blue-600 font-bold">Principal EMI</p>
                          <p className="font-bold text-sm">{formatCurrency(calculatedScheduleResult.schedule[0]?.principal || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-600 font-bold">Monthly Interest</p>
                          <p className="font-bold text-sm">{formatCurrency(calculatedScheduleResult.schedule[0]?.interest || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-600 font-bold">Total Monthly EMI</p>
                          <p className="font-bold text-sm">{formatCurrency(calculatedScheduleResult.schedule[0]?.emi_amount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-600 font-bold">Total Interest</p>
                          <p className="font-bold text-sm">{formatCurrency(calculatedScheduleResult.totalInterest)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── INTEREST LOAN INPUTS ── */}
                {formData.loan_structure_type === 'interest_only' && (
                  <>
                    <Input
                      label="Tenure (Months) *"
                      type="number"
                      value={formData.duration_months}
                      onChange={e => setFormData({ ...formData, duration_months: e.target.value })}
                      placeholder="e.g. 25"
                    />

                    <div>
                      <Input
                        label="ROI (% per month) *"
                        type="number"
                        step="0.1"
                        value={formData.monthly_roi}
                        onChange={e => setFormData({
                          ...formData,
                          monthly_roi: e.target.value,
                          interest_rate: ((parseFloat(e.target.value) || 0) * 12).toString()
                        })}
                        placeholder="e.g. 2"
                      />
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Annual equivalent: {((parseFloat(formData.monthly_roi) || 0) * 12).toFixed(1)}% p.a.
                      </p>
                    </div>
                    <div className="col-span-2">
                      <FieldError msg={errors.duration_months || errors.monthly_roi} />
                    </div>

                    {/* Calculation Summary Card for Interest Loan */}
                    <div className="col-span-2 bg-amber-50/60 border border-amber-200/80 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <Calculator className="h-4 w-4 text-amber-600" /> Interest Only Loan Parameters
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Bullet Principal at Maturity
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-amber-900 mt-2">
                        <div>
                          <p className="text-[10px] text-amber-600 font-bold">Monthly Interest Due</p>
                          <p className="font-bold text-sm">{formatCurrency(calculatedScheduleResult.schedule[0]?.interest || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-amber-600 font-bold">Principal at Maturity</p>
                          <p className="font-bold text-sm">{formatCurrency(parseFloat(formData.sanctioned_amount) || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-amber-600 font-bold">Total Interest ({calculatedScheduleResult.totalTenureMonths} mos)</p>
                          <p className="font-bold text-sm">{formatCurrency(calculatedScheduleResult.totalInterest)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── COMPOSITE LOAN (PHASES SETUP) ── */}
                {formData.loan_structure_type === 'composite' && (
                  <div className="col-span-2 bg-purple-50/40 border border-purple-200/70 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                          <SlidersHorizontal className="h-4 w-4 text-purple-600" /> Composite Phases Setup
                        </h5>
                        <p className="text-[11px] text-purple-700 mt-0.5">
                          Configure multi-phase repayment (e.g. Phase 1 Interest-Only, Phase 2 Regular Principal + Interest).
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          Total Tenure: {calculatedScheduleResult.totalTenureMonths} Months
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] border-purple-300 text-purple-800 hover:bg-purple-100"
                          onClick={() => {
                            const nextNum = formData.composite_phases.length + 1
                            setFormData(prev => ({
                              ...prev,
                              composite_phases: [
                                ...prev.composite_phases,
                                {
                                  phase_number: nextNum,
                                  phase_name: `Phase ${nextNum}`,
                                  phase_type: 'regular',
                                  tenure_months: 12,
                                  monthly_roi: 1,
                                }
                              ]
                            }))
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Phase
                        </Button>
                      </div>
                    </div>

                    {/* Phase Cards */}
                    <div className="space-y-2.5">
                      {formData.composite_phases.map((phase, idx) => {
                        const principalAmt = parseFloat(formData.sanctioned_amount) || 100000
                        const phaseInt = Math.round(principalAmt * ((phase.monthly_roi || 0) / 100))
                        const phaseEmi = phase.phase_type === 'regular' ? Math.round(principalAmt / (phase.tenure_months || 1)) : 0

                        return (
                          <div key={idx} className="bg-white border border-purple-100/90 rounded-xl p-3 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800">{phase.phase_name || `Phase ${idx + 1}`}</span>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                  phase.phase_type === 'interest_only'
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                )}>
                                  {phase.phase_type === 'interest_only' ? 'Interest Only' : 'Regular (Principal + Interest)'}
                                </span>
                              </div>
                              {formData.composite_phases.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      composite_phases: prev.composite_phases.filter((_, i) => i !== idx).map((p, i) => ({
                                        ...p,
                                        phase_number: i + 1,
                                        phase_name: `Phase ${i + 1}`,
                                      }))
                                    }))
                                  }}
                                  className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                                  title="Remove phase"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                              <Select
                                label="Phase Type *"
                                value={phase.phase_type}
                                onChange={e => {
                                  const newType = e.target.value as 'interest_only' | 'regular'
                                  setFormData(prev => ({
                                    ...prev,
                                    composite_phases: prev.composite_phases.map((p, i) => i === idx ? { ...p, phase_type: newType } : p)
                                  }))
                                }}
                                options={[
                                  { value: 'interest_only', label: 'Interest Only' },
                                  { value: 'regular', label: 'Regular (Principal + EMI)' },
                                ]}
                              />

                              <Input
                                label="Tenure (Months) *"
                                type="number"
                                value={phase.tenure_months}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10) || 0
                                  setFormData(prev => ({
                                    ...prev,
                                    composite_phases: prev.composite_phases.map((p, i) => i === idx ? { ...p, tenure_months: val } : p)
                                  }))
                                }}
                                placeholder="Months"
                              />

                              <Input
                                label="ROI (% per month) *"
                                type="number"
                                step="0.1"
                                value={phase.monthly_roi}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0
                                  setFormData(prev => ({
                                    ...prev,
                                    composite_phases: prev.composite_phases.map((p, i) => i === idx ? { ...p, monthly_roi: val } : p)
                                  }))
                                }}
                                placeholder="Monthly %"
                              />
                            </div>

                            {/* Phase micro preview */}
                            <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg text-slate-600 border border-slate-100">
                              <span>
                                <strong>{phase.tenure_months} Months</strong> @ {phase.monthly_roi}% ROI
                                ({(phase.monthly_roi * 12).toFixed(0)}% p.a.)
                              </span>
                              <span>
                                Monthly Interest: <strong className="text-slate-800">{formatCurrency(phaseInt)}</strong>
                                {phase.phase_type === 'regular' && (
                                  <> | Principal EMI: <strong className="text-slate-800">{formatCurrency(phaseEmi)}</strong></>
                                )}
                                {' '}= Total: <strong className="text-brand-700">{formatCurrency(phaseInt + phaseEmi)}</strong>/mo
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Overall composite preview */}
                    <div className="bg-white/80 border border-purple-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs text-purple-900 font-bold">
                      <span>
                        Total Interest: {formatCurrency(calculatedScheduleResult.totalInterest)} | Total Principal: {formatCurrency(calculatedScheduleResult.totalPrincipal)}
                      </span>
                      <span className="text-brand-700 font-extrabold">
                        Total Demand: {formatCurrency(calculatedScheduleResult.totalDemand)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Common fields */}
                <Input
                  label="Processing Fees (₹)"
                  type="number"
                  value={formData.processing_fee}
                  onChange={e => setFormData({ ...formData, processing_fee: e.target.value })}
                  placeholder="Processing / documentation fee"
                />

                <Input
                  label="Sanction / Loan Date *"
                  type="date"
                  value={formData.loan_date}
                  onChange={e => setFormData({ ...formData, loan_date: e.target.value })}
                  error={errors.loan_date}
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: REPAYMENT SETUP ── */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                  error={errors.repayment_start_date}
                />

                <Input
                  label="First Demand Date *"
                  type="date"
                  value={formData.first_demand_date}
                  onChange={e => setFormData({ ...formData, first_demand_date: e.target.value })}
                  error={errors.first_demand_date}
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
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 mb-3">
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
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Guarantor Not Required</p>
                  <p className="text-[11px] text-slate-400 mt-1">Guarantors are usually required for Personal, Business, and Vehicle loans. You selected: <strong className="text-slate-600">{formData.loan_product}</strong>.</p>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" type="button" onClick={() => setFormData({ ...formData, guarantor_required: true })}>
                      Enable Guarantor Manually
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                    <span className="text-xs font-semibold text-slate-600">Borrower requires a registered guarantor.</span>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" type="button" onClick={() => setShowCustModal(true)}>
                      <Plus className="h-3 w-3" /> Register New Guarantor
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Select
                        label="Guarantor Customer ID *"
                        value={formData.guarantor_customer_id}
                        onChange={e => setFormData({ ...formData, guarantor_customer_id: e.target.value })}
                        options={activeCustomers.filter(c => c.id !== formData.customer_id).map(c => ({ value: c.id, label: `${c.customer_id} — ${c.name}` }))}
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
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 mb-3">
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
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Security Collateral Not Required</p>
                  <p className="text-[11px] text-slate-400 mt-1">Collateral checks apply to Home, Vehicle, and Gold products. Product chosen: <strong className="text-slate-600">{formData.loan_product}</strong>.</p>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" type="button" onClick={() => setFormData({ ...formData, security_required: true })}>
                      Enable Security Manually
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
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
                      options={activeCustomers.map(c => ({ value: c.id, label: `${c.customer_id} — ${c.name}` }))}
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
                      error={errors.security_valuation_date}
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

                    <div className="col-span-2 flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 mt-2">
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
            <div className="space-y-3">
              {/* Grid sections for review */}
              <div className="grid grid-cols-2 gap-3">
                {/* Borrower parameters */}
                <div className="bg-slate-50/80 border border-slate-200/60 p-3.5 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Borrower details</h4>
                  <div className="text-xs font-semibold space-y-1 mt-2">
                    <p><strong>Name:</strong> {selectedCustomer?.name || '—'}</p>
                    <p><strong>Mobile:</strong> {selectedCustomer?.mobile || '—'}</p>
                    <p><strong>Branch:</strong> {formData.branch}</p>
                    <p><strong>Product:</strong> {formData.loan_product} ({formData.loan_category})</p>
                  </div>
                </div>

                {/* Financial calculations */}
                <div className="bg-slate-50/80 border border-slate-200/60 p-3.5 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Loan & Repayment Parameters</h4>
                  <div className="text-xs font-semibold space-y-1 mt-2">
                    <p><strong>Sanctioned Principal:</strong> {formatCurrency(parseFloat(formData.sanctioned_amount) || 0)}</p>
                    <p><strong>Loan Structure Type:</strong> <span className="capitalize font-bold text-brand-700">{formData.loan_structure_type === 'composite' ? 'Composite Loan' : formData.loan_structure_type === 'interest_only' ? 'Interest Loan' : 'Regular Loan'}</span></p>
                    <p><strong>Monthly ROI:</strong> {formData.loan_structure_type === 'composite' ? 'Multi-Phase Rates' : `${formData.monthly_roi}% p.m. (${((parseFloat(formData.monthly_roi) || 0) * 12).toFixed(1)}% p.a.)`}</p>
                    <p><strong>Total Tenure:</strong> {calculatedScheduleResult.totalTenureMonths} Months ({calculatedInstallments} installments)</p>
                  </div>
                </div>

                {/* Amortization parameters */}
                <div className="col-span-2 bg-emerald-50/40 border border-emerald-100 p-3.5 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Repayment & Amortization Estimates</h4>
                  <div className="grid grid-cols-4 gap-3 text-xs font-bold text-emerald-900 mt-3">
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Total Principal</p>
                      <p className="text-base font-extrabold amount-display mt-0.5">{formatCurrency(calculatedScheduleResult.totalPrincipal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Total Interest</p>
                      <p className="text-base font-extrabold amount-display mt-0.5 text-blue-800">{formatCurrency(calculatedScheduleResult.totalInterest)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Total Repayment Demand</p>
                      <p className="text-base font-extrabold amount-display mt-0.5 text-brand-700">{formatCurrency(calculatedScheduleResult.totalDemand)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Maturity Date</p>
                      <p className="text-sm font-extrabold mt-1">{calculatedMaturityDate ? formatDate(calculatedMaturityDate) : '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Guarantor Details */}
                <div className="bg-slate-50/80 border border-slate-200/60 p-3.5 rounded-2xl">
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
                <div className="bg-slate-50/80 border border-slate-200/60 p-3.5 rounded-2xl">
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

                {/* ── Amortization Demand Flow Preview Table ── */}
                <div className="col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-brand-600" /> Amortization Demand Flow Schedule
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Demand flow schedule calculated based on selected <strong className="text-slate-700">{formData.loan_structure_type === 'composite' ? 'Composite Phased Structure' : formData.loan_structure_type === 'interest_only' ? 'Interest Only Structure' : 'Regular Loan Structure'}</strong>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                        {calculatedScheduleResult.schedule.length} Total Installments
                      </span>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/90 text-slate-600 text-[10px] font-bold uppercase sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Sr No</th>
                          {formData.loan_structure_type === 'composite' && <th className="px-3 py-2">Phase</th>}
                          <th className="px-3 py-2">Due Date</th>
                          <th className="px-3 py-2 text-right">Principal O/s</th>
                          <th className="px-3 py-2 text-right">Interest</th>
                          <th className="px-3 py-2 text-right">EMI (Principal)</th>
                          <th className="px-3 py-2 text-right">Total Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-xs">
                        {calculatedScheduleResult.schedule.map((row) => (
                          <tr key={row.emi_number} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2 font-bold text-slate-700 font-sans">#{row.emi_number}</td>
                            {formData.loan_structure_type === 'composite' && (
                              <td className="px-3 py-2 font-sans">
                                <span className={cn(
                                  "text-[9px] font-extrabold px-2 py-0.5 rounded-full border",
                                  row.phase === 'Phase 1'
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                )}>
                                  {row.phase || 'Phase 1'}
                                </span>
                              </td>
                            )}
                            <td className="px-3 py-2 text-slate-500 font-sans">{formatDate(row.due_date)}</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-800">{formatCurrency(row.outstanding_balance)}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(row.interest)}</td>
                            <td className="px-3 py-2 text-right text-slate-800 font-bold">{row.principal > 0 ? formatCurrency(row.principal) : '—'}</td>
                            <td className="px-3 py-2 text-right font-extrabold text-brand-700">{formatCurrency(row.emi_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs">
                        <tr>
                          <td className="px-3 py-2 font-sans" colSpan={formData.loan_structure_type === 'composite' ? 3 : 2}>
                            Totals ({calculatedScheduleResult.schedule.length} Payments)
                          </td>
                          <td className="px-3 py-2 text-right font-sans text-slate-400">—</td>
                          <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(calculatedScheduleResult.totalInterest)}</td>
                          <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(calculatedScheduleResult.totalPrincipal)}</td>
                          <td className="px-3 py-2 text-right text-brand-700 font-extrabold">{formatCurrency(calculatedScheduleResult.totalDemand)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Audit Logs & Status Preview */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-500">
                  <p><strong>Created By:</strong> {user?.full_name || 'Admin'}</p>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-500">Account Status:</strong>
                    {overallCompletion === 100 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 border-amber-100 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        Pending (KYC Required)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-100 border-slate-200 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse flex-shrink-0" />
                        Draft ({overallCompletion}% complete)
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-500">KYC Status:</strong>
                    {overallCompletion === 100 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-blue-50 border-blue-100 text-blue-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        KYC Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-100 border-slate-200 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse flex-shrink-0" />
                        Incomplete — Fill all fields
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    {overallCompletion < 100
                      ? `Complete remaining ${100 - overallCompletion}% of fields to enable account creation.`
                      : 'All fields complete. Click "Create Account" to submit for activation.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Wizard Controls footer ── */}
        <div className="flex justify-between items-center px-5 py-3.5 border-t border-slate-200 bg-slate-50/95 rounded-br-2xl flex-shrink-0 z-20 shadow-xs">
          <div>
            {step > 1 && (
              <Button variant="outline" type="button" onClick={handlePrev}>
                Previous Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={!!loading}>Cancel</Button>

            {/* Save Draft Action always visible to park state */}
            <Button
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold"
              onClick={() => handleSave(false)}
              loading={loading === 'draft'}
            >
              Save Draft
            </Button>

            {step < 6 ? (
              <Button type="button" onClick={handleNext} className="bg-brand-600 hover:bg-brand-700 text-white font-semibold">
                Next Step
              </Button>
            ) : (
              <Button
                onClick={() => handleSave(true)}
                loading={loading === 'create'}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-xs"
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
  const [loanFormCompletion, setLoanFormCompletion] = useState(0)
  const [statusFilter, setStatusFilter] = useLocalStorage<string>('loans_status_filter', 'all')

  const { data: loans = [], isLoading } = useLoans()
  const { data: customers = [] } = useCustomers()

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

  // Horizontal scroll arrows state & handlers
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    const el = tableContainerRef.current
    if (el) {
      setCanScrollLeft(el.scrollLeft > 10)
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
    }
  }

  useEffect(() => {
    const el = tableContainerRef.current
    if (el) {
      el.addEventListener('scroll', checkScroll)
      checkScroll()
      window.addEventListener('resize', checkScroll)

      const observer = new ResizeObserver(() => checkScroll())
      observer.observe(el)

      return () => {
        el.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
        observer.disconnect()
      }
    }
  }, [isLoading, filteredData])

  const scrollTable = (direction: 'left' | 'right') => {
    const el = tableContainerRef.current
    if (el) {
      const scrollAmount = el.clientWidth * 0.4
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

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
      cell: (info) => {
        const val = info.getValue()
        return <span className="text-xs font-bold text-slate-800 amount-display">{val ? formatCurrency(val) : <span className="text-slate-350 font-normal">—</span>}</span>
      },
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
      cell: (info) => {
        const val = info.getValue()
        return <span className="text-xs font-extrabold amount-display text-emerald-600">{val ? formatCurrency(val) : <span className="text-slate-350 font-normal">—</span>}</span>
      },
    }),
    columnHelper.accessor('remaining_emi', {
      header: 'Progress',
      cell: (info) => {
        const total = info.row.original.emi_count
        const remaining = info.getValue()
        const pct = total ? ((total - remaining) / total) * 100 : 0
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
      cell: (info) => {
        const val = info.getValue()
        return <span className="text-xs font-bold amount-display text-slate-800">{val ? formatCurrency(val) : <span className="text-slate-350 font-normal">—</span>}</span>
      },
    }),

    columnHelper.accessor('loan_date', {
      header: 'Date',
      cell: (info) => <span className="text-xs text-slate-400 font-medium">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const loan = info.row.original
        const customer = customers.find(c => c.id === loan.customer_id)
        const isKycVerified = customer ? (customer.kyc_status === 'verified' || customer.status === 'active') : false
        const isSubmitted = loan.status !== 'draft'
        const status = isKycVerified && isSubmitted ? 'active' : loan.status
        return <StatusBadge status={status} />
      },
    }),
    columnHelper.display({
      id: 'kyc_status',
      header: 'KYC',
      cell: (info) => {
        const loan = info.row.original
        const customer = customers.find(c => c.id === loan.customer_id)
        const isKycVerified = customer ? (customer.kyc_status === 'verified' || customer.status === 'active') : false
        const kycStatus = isKycVerified ? 'verified' : 'pending'
        const kycLabel = isKycVerified ? 'Verified' : 'Pending'
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            kycStatus === 'verified'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-amber-50 border-amber-100 text-amber-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              kycStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-400'
            }`} />
            {kycLabel}
          </span>
        )
      },
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
  ], [navigate, customers])

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Loan Portfolio', value: loans.length, icon: <WalletCards className="h-5 w-5" />, bg: 'kpi-blue', iconBg: 'bg-brand-600' },
          { label: 'Active Disbursals', value: loans.filter((l) => l.status === 'active').length, icon: <TrendingUp className="h-5 w-5" />, bg: 'kpi-green', iconBg: 'bg-emerald-600' },
          { label: 'Pending / Draft', value: loans.filter((l) => l.status === 'pending' || l.status === 'draft').length, icon: <FileText className="h-5 w-5" />, bg: 'kpi-purple', iconBg: 'bg-amber-500' },
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
          <div className="flex gap-1.5 ml-auto bg-slate-100 p-1 rounded-lg border border-slate-200/50">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'pending', label: 'Pending' },
              { key: 'draft', label: 'Draft' },
              { key: 'overdue', label: 'Overdue' },
              { key: 'closed', label: 'Closed' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all',
                  statusFilter === s.key ? 'bg-brand-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative group/table">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTable('left')}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md border border-slate-200/80 hover:bg-white hover:text-brand-600 active:scale-95 transition-all duration-200 cursor-pointer"
              aria-label="Scroll table left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Scroll Right Button */}
          {canScrollRight && (
            <button
              onClick={() => scrollTable('right')}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md border border-slate-200/80 hover:bg-white hover:text-brand-600 active:scale-95 transition-all duration-200 cursor-pointer"
              aria-label="Scroll table right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div ref={tableContainerRef} className="overflow-x-auto">
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
        onClose={() => { setShowModal(false); setLoanFormCompletion(0) }}
        title={editLoan ? 'Edit Loan Account' : 'Create Account'}
        size="xl"
        noScroll
        headerContent={
          <div className="flex items-center gap-2 min-w-[130px]">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${loanFormCompletion}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 min-w-[34px] text-right">
              {loanFormCompletion}%
            </span>
          </div>
        }
      >
        <LoanForm loan={editLoan} onClose={() => { setShowModal(false); setLoanFormCompletion(0) }} onCompletionChange={setLoanFormCompletion} />
      </Modal>
    </div>
  )
}
