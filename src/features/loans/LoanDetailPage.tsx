import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, WalletCards, Download, FileText, CheckCircle2, Calendar,
  Percent, TrendingDown, Building2, User, MoreVertical, ShieldAlert,
  AlertTriangle, Eye, Trash2, Upload, Printer, FileSpreadsheet, Lock,
  IndianRupee, CalendarDays, Coins, HelpCircle, FileDown, Plus, Info,
  Banknote, Landmark, ShieldCheck, Activity, Search, ShieldAlert as InsuranceIcon,
  Check, X, SquarePen, LayoutDashboard
} from 'lucide-react'
import {
  useLoan, useCustomer, useLoanSchedule, usePayments, useCreatePayment,
  useUpdateLoan, useCustomerDocuments, useSaveCustomerDocument,
  useDeleteCustomerDocument, useCustomerIncomeRecords
} from '@/hooks/useDb'
import {
  Button, Card, CardHeader, CardTitle, CardBody, StatusBadge, Badge,
  Input, Select, Textarea, Modal, DropdownMenu, Avatar
} from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { useAuthStore } from '@/store/authStore'
import type { ExtendedCustomer } from '@/services/customerProfileService'


export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const loanId = id || ''

  // --- Dynamic Queries ---
  const { data: loan, isLoading: isLoanLoading, refetch: refetchLoan } = useLoan(loanId)
  const { data: baseCustomer, isLoading: isCustomerLoading } = useCustomer(loan?.customer_id)
  const customer = baseCustomer as ExtendedCustomer | undefined
  const { data: emiSchedule = [], isLoading: isScheduleLoading, refetch: refetchSchedule } = useLoanSchedule(loanId)

  const { data: payments = [], isLoading: isPaymentsLoading, refetch: refetchPayments } = usePayments(loanId)

  // Custom query for income / transaction Integration
  const { data: incomeRecords = [], isLoading: isIncomeLoading, refetch: refetchIncome } = useCustomerIncomeRecords(loan?.customer_id, loanId)

  // Customer documents
  const { data: documents = [], refetch: refetchDocs } = useCustomerDocuments(loan?.customer_id || '')

  // --- Mutations ---
  const updateLoan = useUpdateLoan()
  const createPayment = useCreatePayment()
  const saveDocument = useSaveCustomerDocument()
  const deleteDocument = useDeleteCustomerDocument()

  // --- UI States ---
  const [activeTab, setActiveTab] = useState<'overview' | 'loan-details' | 'demand-flow' | 'collections' | 'transactions' | 'security' | 'documents'>('overview')
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    if (activeTab && tabRefs.current[activeTab]) {
      tabRefs.current[activeTab]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [activeTab])
  const [isEmiModalOpen, setIsEmiModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false)
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false)

  // Transaction filtering states
  const [txSearch, setTxSearch] = useState('')
  const [txTypeFilter, setTxTypeFilter] = useState('all')

  // Document form state
  const [docForm, setDocForm] = useState({
    name: '',
    type: 'Agreement',
    file: null as File | null,
    file_url: '#',
    file_size: '1.5 MB'
  })

  // Edit Loan form state
  const [editForm, setEditForm] = useState({
    loan_amount: '',
    interest_rate: '',
    duration_months: '',
    processing_fee: '',
    loan_date: '',
    interest_type: 'reducing' as 'flat' | 'reducing',
    status: 'active' as any
  })

  // Set Edit Form default values once loan is loaded
  useEffect(() => {
    if (loan) {
      setEditForm({
        loan_amount: loan.loan_amount.toString(),
        interest_rate: loan.interest_rate.toString(),
        duration_months: loan.duration_months.toString(),
        processing_fee: loan.processing_fee?.toString() || '0',
        loan_date: loan.loan_date,
        interest_type: loan.interest_type || 'reducing',
        status: loan.status
      })
    }
  }, [loan])

  // --- Dynamic Math and Rollups ---

  // 1. Dynamic DPD Calculation
  const dpd = useMemo(() => {
    const overdueItems = emiSchedule.filter(
      s => (s.status === 'pending' || s.status === 'overdue' || s.status === 'partial') &&
        dayjs(s.due_date).isBefore(dayjs(), 'day')
    )
    if (overdueItems.length === 0) return 0
    const earliestDue = overdueItems.reduce((earliest, curr) =>
      dayjs(curr.due_date).isBefore(dayjs(earliest)) ? curr.due_date : earliest
      , overdueItems[0].due_date)
    return dayjs().diff(dayjs(earliestDue), 'day')
  }, [emiSchedule])

  // 2. Next EMI Details
  const nextEmi = useMemo(() => {
    return emiSchedule.find(s => s.status === 'pending' || s.status === 'overdue' || s.status === 'partial') || null
  }, [emiSchedule])

  // 3. Outstanding Interest Calculation
  const outstandingInterest = useMemo(() => {
    return emiSchedule.reduce((sum, s) => {
      if (s.status === 'paid') return sum
      const totalInterest = Number(s.interest || 0)
      if (s.status === 'partial') {
        const principalPart = Number(s.principal || 0)
        const interestPaid = Math.min(totalInterest, Math.max(0, Number(s.paid_amount || 0) - principalPart))
        return sum + Math.max(0, totalInterest - interestPaid)
      }
      return sum + totalInterest
    }, 0)
  }, [emiSchedule])

  // 4. Rollup Payment statistics
  const paymentsRollup = useMemo(() => {
    let totalPrincipalPaid = 0
    let totalInterestPaid = 0
    let totalCollected = 0
    let interestYTD = 0
    let lastPaymentDate = 'N/A'
    let lastPaymentAmount = 0

    const currentYear = dayjs().year()

    if (payments.length > 0) {
      const sorted = [...payments].sort((a, b) => dayjs(b.payment_date).diff(dayjs(a.payment_date)))
      lastPaymentDate = sorted[0].payment_date
      lastPaymentAmount = Number(sorted[0].amount_paid)

      payments.forEach(p => {
        totalPrincipalPaid += Number(p.principal_paid || 0)
        totalInterestPaid += Number(p.interest_paid || 0)
        totalCollected += Number(p.amount_paid || 0)
        if (dayjs(p.payment_date).year() === currentYear) {
          interestYTD += Number(p.interest_paid || 0)
        }
      })
    }

    return {
      totalPrincipalPaid,
      totalInterestPaid,
      totalCollected,
      interestYTD,
      lastPaymentDate,
      lastPaymentAmount
    }
  }, [payments])

  // 5. Alerts generation
  const alerts = useMemo(() => {
    const list = []
    if (dpd > 0) {
      list.push({
        id: 'dpd-overdue',
        type: 'Critical',
        message: `Account is Overdue: DPD is ${dpd} Days. Late penalty applied.`,
        icon: ShieldAlert,
        color: 'text-red-600 bg-red-50 border-red-200'
      })
    }
    if (nextEmi) {
      const diff = dayjs(nextEmi.due_date).diff(dayjs(), 'day')
      if (diff >= 0 && diff <= 7) {
        list.push({
          id: 'emi-due-soon',
          type: 'Upcoming',
          message: `EMI of ${formatCurrency(nextEmi.emi_amount)} is due in ${diff === 0 ? 'today' : `${diff} days`} (${formatDate(nextEmi.due_date)}).`,
          icon: Calendar,
          color: 'text-blue-600 bg-blue-50 border-blue-200'
        })
      }
    }
    if (customer?.kyc_status === 'pending') {
      list.push({
        id: 'kyc-pending',
        type: 'Attention',
        message: 'Customer KYC verification check is pending. Please review documentation.',
        icon: AlertTriangle,
        color: 'text-amber-600 bg-amber-50 border-amber-200'
      })
    }
    if (loan?.status === 'active' && loan?.remaining_emi <= 3) {
      list.push({
        id: 'maturity-approaching',
        type: 'Reminder',
        message: `Loan Account is approaching maturity. Only ${loan.remaining_emi} EMIs remaining.`,
        icon: Info,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
      })
    }
    return list
  }, [dpd, nextEmi, customer, loan])

  // --- Handlers ---

  // Collect EMI submit handler
  const handleCollectEmiSubmit = async (paymentData: any) => {
    try {
      await createPayment.mutateAsync(paymentData)
      toast.success('EMI Payment collected successfully!')
      setIsEmiModalOpen(false)
      // Refetch page data
      refetchLoan()
      refetchSchedule()
      refetchPayments()
      refetchIncome()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to record EMI payment.')
    }
  }

  // Edit Loan parameters handler
  const handleEditLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(editForm.loan_amount)
    const rate = parseFloat(editForm.interest_rate)
    const tenure = parseInt(editForm.duration_months)
    const fee = parseFloat(editForm.processing_fee)

    if (isNaN(amount) || amount <= 0) return toast.error('Principal must be a positive number')
    if (isNaN(rate) || rate < 0) return toast.error('Interest Rate must be valid')
    if (isNaN(tenure) || tenure <= 0) return toast.error('Tenure must be at least 1 month')

    try {
      await updateLoan.mutateAsync({
        id: loanId,
        loan_amount: amount,
        interest_rate: rate,
        duration_months: tenure,
        processing_fee: fee,
        loan_date: editForm.loan_date,
        interest_type: editForm.interest_type,
        status: editForm.status
      })
      toast.success('Account Details Updated Successfully')
      setIsEditModalOpen(false)
      refetchLoan()
      refetchSchedule()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update loan details')
    }
  }

  // Close account handler
  const handleCloseAccount = async () => {
    if (window.confirm('Are you sure you want to CLOSE this loan account? This marks outstanding balance as closed.')) {
      try {
        await updateLoan.mutateAsync({ id: loanId, status: 'closed', remaining_balance: 0, remaining_emi: 0 })
        toast.success('Account Closed successfully')
        refetchLoan()
      } catch (err: any) {
        toast.error(err.message || 'Failed to close account')
      }
    }
  }

  // Document upload handler
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docForm.name.trim()) return toast.error('Please enter a document name')

    try {
      await saveDocument.mutateAsync({
        customerId: loan?.customer_id || '',
        document: {
          document_name: docForm.name.trim(),
          document_type: docForm.type,
          file_url: docForm.file_url,
          file_size: docForm.file_size,
          version: 1
        }
      })
      toast.success('Document uploaded successfully!')
      setIsUploadDocOpen(false)
      setDocForm({ name: '', type: 'Agreement', file: null, file_url: '#', file_size: '1.5 MB' })
      refetchDocs()
    } catch {
      toast.error('Failed to save document')
    }
  }

  // Export Statement to CSV
  const handleExportStatement = () => {
    if (!loan || !customer) return
    const headers = ['Date', 'Payment ID', 'Type', 'Description', 'Amount Paid', 'Principal Component', 'Interest Component', 'Receipt Number', 'Collected By']
    const rows = payments.map(p => [
      formatDate(p.payment_date),
      p.id,
      'EMI Payment',
      `EMI Collection #${p.emi_number}`,
      p.amount_paid,
      p.principal_paid,
      p.interest_paid,
      p.receipt_number,
      p.collected_by
    ])

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Statement_${loan.loan_number}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Account Statement exported successfully!')
  }

  // Statement printable print page
  const handlePrintStatement = () => {
    window.print()
  }

  // Loader screen
  if (isLoanLoading || isCustomerLoading || isScheduleLoading || isPaymentsLoading || isIncomeLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
        <p className="text-sm font-semibold text-slate-500">Loading Account Details...</p>
      </div>
    )
  }

  if (!loan || !customer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
          <Landmark className="h-7 w-7" />
        </div>
        <p className="text-sm font-bold text-slate-700">Account record not found</p>
        <p className="text-xs text-slate-400 mt-1">The requested account or customer does not exist in the database.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/loans')}>
          <ArrowLeft className="h-4 w-4" /> Back to Accounts
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen text-slate-800">

      {/* --- TOP NAVIGATION AREA --- */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-3xs print:hidden">
        {/* Back Button */}
        <button
          onClick={() => navigate('/loans')}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors uppercase tracking-wider rounded-xl whitespace-nowrap flex-shrink-0 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Accounts
        </button>

        {/* Vertical Divider (hidden on mobile) */}
        <div className="hidden md:block w-px h-6 bg-slate-200" />

        {/* Scrollable Tabs */}
        <div className="flex-1 overflow-x-auto flex gap-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth select-none">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'loan-details', label: 'Loan Details', icon: Info },
            { id: 'demand-flow', label: 'Demand Flow', icon: CalendarDays },
            { id: 'collections', label: 'Collections', icon: Coins },
            { id: 'transactions', label: 'Transactions', icon: IndianRupee },
            { id: 'security', label: 'Security', icon: ShieldCheck },
            { id: 'documents', label: 'Documents', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el }}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'bg-brand-600 text-white shadow-xs font-extrabold scale-[1.01]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ==================================================
          1. ACCOUNT PAGE HEADER
          ================================================== */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-col md:flex-row gap-5 items-start md:items-center w-full lg:w-auto">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
            <Landmark className="h-7 w-7 stroke-[2]" />
          </div>
          <div className="space-y-1.5 flex-grow">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight capitalize">
                {loan.loan_type} Loan - <span className="font-mono text-brand-600">{loan.loan_number}</span>
              </h1>
              <span className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
                loan.status === 'active' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                loan.status === 'overdue' && 'bg-red-50 text-red-700 border-red-200 animate-pulse',
                loan.status === 'closed' && 'bg-slate-100 text-slate-600 border-slate-200',
                loan.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-250'
              )}>
                {loan.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-slate-500 font-semibold pt-1">
              <div>Borrower: <span className="text-slate-800 font-bold hover:underline cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>{customer.name}</span></div>
              <div>Customer ID: <span className="font-mono text-slate-800 font-bold">{customer.customer_id}</span></div>
              <div>Product: <span className="text-slate-800 font-bold capitalize">{loan.loan_type} Loan</span></div>
              <div>Branch: <span className="text-slate-800 font-bold">{customer.branch || 'Namakkal Branch'}</span></div>
              <div className="col-span-2 sm:col-span-4">Opening Date: <span className="text-slate-800 font-bold">{formatDate(loan.loan_date)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto print:hidden">
          <Button
            onClick={() => setIsEmiModalOpen(true)}
            className="flex-1 sm:flex-none bg-brand-600 hover:bg-brand-700 text-white font-bold"
            disabled={loan.status === 'closed'}
          >
            <Coins className="h-4 w-4" /> Collect EMI
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsStatementModalOpen(true)}
            className="flex-1 sm:flex-none border-slate-200 text-slate-700 font-bold"
          >
            <FileText className="h-4 w-4 text-brand-600" /> Statement
          </Button>

          <DropdownMenu
            trigger={
              <Button variant="outline" className="h-9 px-3 border-slate-200">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
            items={[
              { label: 'Edit Account parameters', icon: <SquarePen className="h-4 w-4" />, onClick: () => setIsEditModalOpen(true) },
              { label: 'Account Timeline History', icon: <Activity className="h-4 w-4" />, onClick: () => setActiveTab('overview') },
              { label: 'Export statement (CSV)', icon: <FileSpreadsheet className="h-4 w-4 text-emerald-500" />, onClick: handleExportStatement },
              { label: 'Close Account', icon: <X className="h-4 w-4 text-red-500" />, onClick: handleCloseAccount, variant: 'danger', separator: true }
            ]}
          />
        </div>
      </div>

      {/* ==================================================
          3. FINANCIAL & ACCOUNT STATUS SUMMARY (Overview Only)
          ================================================== */}
      {activeTab === 'overview' && (
        <>
          {/* ==================================================
              3. FINANCIAL SUMMARY CARDS
              ================================================== */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: 'Loan Amount', value: formatCurrency(loan.loan_amount), subtitle: 'Sanctioned base principal', color: 'text-slate-900', icon: Banknote },
              { label: 'Outstanding Principal', value: formatCurrency(loan.remaining_balance), subtitle: 'Balance base amount', color: 'text-slate-900', icon: Landmark },
              { label: 'Outstanding Interest', value: formatCurrency(outstandingInterest), subtitle: 'Accrued unpaid interest', color: 'text-amber-600', icon: TrendingDown },
              { label: 'EMI (Monthly)', value: formatCurrency(loan.emi_amount), subtitle: `${loan.duration_months} Months tenure`, color: 'text-brand-600', icon: Coins },
              { label: 'ROI', value: `${loan.interest_rate}%`, subtitle: `${loan.interest_type} rate calculation`, color: 'text-emerald-600', icon: Percent },
              { label: 'Tenure', value: `${loan.duration_months} Months`, subtitle: `End date: ${formatDate(dayjs(loan.loan_date).add(loan.duration_months, 'month').toDate())}`, color: 'text-purple-600', icon: CalendarDays }
            ].map((c) => {
              const Icon = c.icon
              return (
                <Card key={c.label} className="p-4 bg-white border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">{c.label}</span>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="mt-3">
                    <p className={cn('text-lg font-black font-mono tracking-tight', c.color)}>{c.value}</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">{c.subtitle}</p>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* ==================================================
              4. ACCOUNT STATUS SUMMARY
              ================================================== */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-150/80 shadow-2xs grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              {
                label: 'DPD (Days Past Due)',
                value: dpd > 0 ? `${dpd} Days` : '0 Days',
                badgeColor: dpd > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              },
              {
                label: 'Next EMI Due',
                value: nextEmi ? formatDate(nextEmi.due_date) : 'Fully Paid',
                badgeColor: nextEmi ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              },
              {
                label: 'EMI Amount',
                value: formatCurrency(loan.emi_amount),
                badgeColor: 'bg-slate-50 text-slate-700 border-slate-200'
              },
              {
                label: 'Account Status',
                value: loan.status.toUpperCase(),
                badgeColor: loan.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  loan.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-slate-100 text-slate-600 border-slate-200'
              },
              {
                label: 'Document Status',
                value: customer.compliance_doc_verified ? 'Verified' : 'Pending',
                badgeColor: customer.compliance_doc_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              },
              {
                label: 'Insurance Status',
                value: 'Active',
                badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1 px-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                <span className={cn(
                  'inline-fit w-fit px-2 py-0.5 rounded-md border text-[11px] font-extrabold font-mono mt-1 text-center',
                  item.badgeColor
                )}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Main Grid area */}
      <div className={cn(
        "grid grid-cols-1 gap-6",
        activeTab === 'overview' ? "lg:grid-cols-3" : "grid-cols-1"
      )}>

        {/* Left 2 Cols: TABS PANEL */}
        <div className={cn(
          "space-y-6",
          activeTab === 'overview' ? "lg:col-span-2" : "w-full"
        )}>

          {/* TAB CONTENTS */}
          <div className="space-y-6">

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 gap-6">

                {/* Visual amortization schedule overview bar */}
                <Card className="p-6">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Principal Repayment Schedule Progress</h3>
                  <div className="flex justify-between items-center text-xs font-bold mb-2">
                    <span className="text-slate-600">Total Principal Paid: {formatCurrency(paymentsRollup.totalPrincipalPaid)}</span>
                    <span className="text-brand-600">Remaining Balance: {formatCurrency(loan.remaining_balance)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, (paymentsRollup.totalPrincipalPaid / loan.loan_amount) * 100))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {Math.round((paymentsRollup.totalPrincipalPaid / loan.loan_amount) * 100)}% of loan principal has been recovered.
                  </p>
                </Card>

                {/* Alerts desk in mobile/overview */}
                <div className="lg:hidden">
                  <Card className="p-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150 pb-3.5 mb-4">Alerts & Reminders</h3>
                    <div className="space-y-3">
                      {alerts.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">No alerts for this account</div>
                      ) : (
                        alerts.map(a => (
                          <div key={a.id} className={cn('p-3 rounded-xl border flex gap-2.5 text-xs', a.color)}>
                            <a.icon className="h-4.5 w-4.5 flex-shrink-0" />
                            <div>
                              <p className="font-extrabold">{a.type}</p>
                              <p className="font-medium mt-0.5 leading-snug">{a.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* LOAN DETAILS TAB */}
            {activeTab === 'loan-details' && (
              <Card>
                <CardHeader>
                  <CardTitle>Account Details & Technical Specifications</CardTitle>
                </CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 p-6 text-sm">
                  {[
                    { label: 'Loan Number / ID', value: loan.loan_number, mono: true },
                    { label: 'Sanctioned Amount', value: formatCurrency(loan.loan_amount), bold: true },
                    { label: 'Disbursement Date', value: formatDate(loan.loan_date) },
                    { label: 'Processing Fee Paid', value: formatCurrency(loan.processing_fee || 0) },
                    { label: 'Interest Rate Percentage', value: `${loan.interest_rate}% per annum` },
                    { label: 'Interest Accrual Type', value: loan.interest_type === 'reducing' ? 'Reducing Balance' : 'Flat Balance' },
                    { label: 'Total Tenure Period', value: `${loan.duration_months} Months` },
                    { label: 'Base EMI Amount', value: formatCurrency(loan.emi_amount), bold: true },
                    { label: 'Outstanding Balance', value: formatCurrency(loan.remaining_balance), bold: true, color: 'text-red-600' },
                    { label: 'Closed Status Date', value: loan.status === 'closed' ? 'Closed/Completed' : 'Active Account' }
                  ].map((d) => (
                    <div key={d.label} className="border-b border-slate-100 pb-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">{d.label}</span>
                      <span className={cn(
                        'font-bold text-slate-800',
                        d.mono && 'font-mono text-brand-600',
                        d.bold && 'font-extrabold',
                        d.color
                      )}>
                        {d.value}
                      </span>
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}

            {/* DEMAND FLOW TAB */}
            {activeTab === 'demand-flow' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                  <CardTitle>Amortization Demand Schedule</CardTitle>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Total EMIs: {emiSchedule.length}</span>
                </CardHeader>
                <div className="overflow-x-auto">
                  {emiSchedule.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No amortization schedule found.</div>
                  ) : (
                    <table className="data-table w-full">
                      <thead>
                        <tr>
                          <th>EMI #</th>
                          <th>Due Date</th>
                          <th>Principal</th>
                          <th>Interest</th>
                          <th>EMI Amount</th>
                          <th>Collected</th>
                          <th>Payment Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emiSchedule.map((item) => {
                          const isOverdue = (item.status === 'pending' || item.status === 'overdue') && dayjs(item.due_date).isBefore(dayjs(), 'day')
                          return (
                            <tr key={item.emi_number} className={cn(
                              item.status === 'paid' && 'bg-emerald-50/20',
                              isOverdue && 'bg-red-50/30'
                            )}>
                              <td className="font-bold text-slate-700">#{item.emi_number}</td>
                              <td className="text-xs text-slate-500">{formatDate(item.due_date)}</td>
                              <td className="font-mono text-xs">{formatCurrency(item.principal)}</td>
                              <td className="font-mono text-xs text-slate-500">{formatCurrency(item.interest)}</td>
                              <td className="font-mono text-xs font-bold text-slate-800">{formatCurrency(item.emi_amount)}</td>
                              <td className="font-mono text-xs text-emerald-600 font-bold">{formatCurrency(item.paid_amount || 0)}</td>
                              <td className="text-xs text-slate-500">{item.paid_date ? formatDate(item.paid_date) : '-'}</td>
                              <td>
                                <span className={cn(
                                  'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border',
                                  item.status === 'paid' && 'bg-emerald-50 text-emerald-700 border-emerald-250',
                                  item.status === 'partial' && 'bg-amber-50 text-amber-700 border-amber-250',
                                  item.status === 'pending' && !isOverdue && 'bg-blue-50 text-blue-700 border-blue-200',
                                  (item.status === 'overdue' || isOverdue) && 'bg-red-50 text-red-700 border-red-200'
                                )}>
                                  {isOverdue ? 'overdue' : item.status}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            )}

            {/* COLLECTIONS TAB */}
            {activeTab === 'collections' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                  <CardTitle>Collections & Receipts Log</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  {payments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No collections found.</div>
                  ) : (
                    <table className="data-table w-full">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Receipt No.</th>
                          <th>EMI No.</th>
                          <th>Payment Mode</th>
                          <th>Amount Collected</th>
                          <th>Penalty Charged</th>
                          <th>Collector</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id}>
                            <td className="text-xs text-slate-500">{formatDate(p.payment_date)}</td>
                            <td className="font-mono text-xs text-brand-600 font-bold">{p.receipt_number}</td>
                            <td className="font-bold text-slate-700">EMI #{p.emi_number}</td>
                            <td className="text-xs font-bold uppercase text-slate-600">{p.payment_mode}</td>
                            <td className="font-mono text-xs font-bold text-emerald-600">{formatCurrency(p.amount_paid)}</td>
                            <td className="font-mono text-xs text-red-500">{formatCurrency(p.penalty || 0)}</td>
                            <td className="text-xs text-slate-600 font-medium">{p.collected_by}</td>
                            <td>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-emerald-50 text-emerald-700 border-emerald-250">
                                success
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100">
                  <CardTitle>Internal Ledger Accounting</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      className="form-input text-xs h-9 py-1 px-3 w-40"
                    />
                    <Select
                      value={txTypeFilter}
                      onChange={(e) => setTxTypeFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'All Categories' },
                        { value: 'interest', label: 'Interest' },
                        { value: 'penalty', label: 'Penalty' }
                      ]}
                      className="w-32 h-9 border border-slate-200 text-xs rounded-xl"
                    />
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  {incomeRecords.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No transactions available.</div>
                  ) : (
                    <table className="data-table w-full">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Transaction ID</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th>Credit (IN)</th>
                          <th>Debit (OUT)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incomeRecords
                          .filter(r => {
                            const matchSearch = r.description.toLowerCase().includes(txSearch.toLowerCase()) || r.id.toLowerCase().includes(txSearch.toLowerCase())
                            const matchCategory = txTypeFilter === 'all' ? true : r.category === txTypeFilter
                            return matchSearch && matchCategory
                          })
                          .map((r) => (
                            <tr key={r.id}>
                              <td className="text-xs text-slate-500">{formatDate(r.date)}</td>
                              <td className="font-mono text-xs text-slate-500 truncate max-w-[120px]">{r.id}</td>
                              <td className="capitalize text-xs font-bold text-slate-600">{r.category}</td>
                              <td className="text-xs font-medium text-slate-700">{r.description}</td>
                              <td className="font-mono text-xs font-extrabold text-emerald-600">{formatCurrency(r.amount)}</td>
                              <td className="font-mono text-xs text-slate-400">-</td>
                              <td>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-emerald-50 text-emerald-700 border-emerald-250">
                                  posted
                                </span>
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle>Collateral security details</CardTitle>
                </CardHeader>
                <CardBody className="p-6">
                  <div className="flex flex-col items-center justify-center p-8 border border-slate-200 border-dashed rounded-2xl text-center">
                    <ShieldCheck className="h-10 w-10 text-slate-400 mb-3" />
                    <p className="text-sm font-bold text-slate-700">No security/collateral details recorded for this loan.</p>
                    <p className="text-xs text-slate-400 mt-1">To link properties, guarantees, or collateral, upload documents or add notes to the loan vault.</p>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === 'documents' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                  <CardTitle>Uploaded Verification Documents</CardTitle>
                  <Button variant="default" size="sm" onClick={() => setIsUploadDocOpen(true)}>
                    <Plus className="h-4 w-4" /> Upload Document
                  </Button>
                </CardHeader>
                <CardBody className="p-6 space-y-4">
                  {documents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No documents uploaded.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="border border-slate-150 rounded-2xl p-4 flex items-center justify-between bg-white hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <FileText className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{doc.document_name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{doc.document_type} · {doc.file_size} · V{doc.version}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Button variant="ghost" size="icon-sm" onClick={() => toast.success('Opening document preview...')}><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => toast.success('Document downloaded successfully.')}><Download className="h-3.5 w-3.5" /></Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this document?')) {
                                  await deleteDocument.mutateAsync({ customerId: loan.customer_id, documentId: doc.id })
                                  toast.success('Document deleted.')
                                  refetchDocs()
                                }
                              }}
                              className="text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

          </div>

        </div>

        {/* Right 1 Col: SIDE PANEL INFO */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* ==================================================
              5. ACCOUNT SNAPSHOT
              ================================================== */}
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150 pb-3 flex justify-between items-center">
                <span>Account Snapshot</span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-brand-600 bg-brand-50 border-brand-200">Summary</Badge>
              </h3>

              <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs font-semibold text-slate-600">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Loan Type</p>
                  <p className="text-slate-800 capitalize font-bold">{loan.loan_type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Repayment Mode</p>
                  <p className="text-slate-800 font-bold">UPI / Auto Debit</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Loan Start Date</p>
                  <p className="text-slate-800 font-bold">{formatDate(loan.loan_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Linked Bank Account</p>
                  <p className="text-slate-800 font-bold truncate">
                    {customer.bank_name ? `${customer.bank_name} - ****${customer.account_number?.slice(-4) || '5678'}` : 'HDFC Bank - ****5678'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Maturity Date</p>
                  <p className="text-slate-800 font-bold">{formatDate(dayjs(loan.loan_date).add(loan.duration_months, 'month').toDate())}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Mode of Collection</p>
                  <p className="text-slate-800 font-bold">UPI Mandate</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Sanctioned Amount</p>
                  <p className="text-slate-800 font-bold">{formatCurrency(loan.loan_amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">DPD</p>
                  <p className={cn('font-bold', dpd > 0 ? 'text-red-500 font-black' : 'text-slate-800')}>{dpd} Days</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Disbursement Date</p>
                  <p className="text-slate-800 font-bold">{formatDate(loan.loan_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Next Review Date</p>
                  <p className="text-slate-800 font-bold">{formatDate(dayjs(loan.loan_date).add(1, 'year').toDate())}</p>
                </div>
              </div>
            </Card>

            {/* ==================================================
              6. QUICK ACTIONS
              ================================================== */}
            <Card className="p-5 space-y-4 print:hidden">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150 pb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3.5 text-center">
                <button
                  onClick={() => setIsEmiModalOpen(true)}
                  disabled={loan.status === 'closed'}
                  className="bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl p-3.5 border border-brand-100 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Coins className="h-5 w-5" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">Collect EMI</span>
                </button>
                <button
                  onClick={() => setActiveTab('demand-flow')}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl p-3.5 border border-slate-200/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <CalendarDays className="h-5 w-5 text-purple-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">Schedule</span>
                </button>
                <button
                  onClick={() => setIsStatementModalOpen(true)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl p-3.5 border border-slate-200/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <FileText className="h-5 w-5 text-emerald-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">Statement</span>
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl p-3.5 border border-slate-200/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <SquarePen className="h-5 w-5 text-amber-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">Edit Account</span>
                </button>
              </div>
            </Card>

            {/* ==================================================
              7. ALERTS & REMINDERS
              ================================================== */}
            <div className="hidden lg:block">
              <Card className="p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150 pb-3 mb-4 flex justify-between items-center">
                  <span>Alerts & Reminders</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">Live</span>
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <div className="text-xs text-slate-400 italic text-center py-4 flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <span>No active alerts for this account</span>
                    </div>
                  ) : (
                    alerts.map(a => (
                      <div key={a.id} className={cn('p-3 rounded-xl border flex gap-2.5 text-xs', a.color)}>
                        <a.icon className="h-4.5 w-4.5 flex-shrink-0" />
                        <div>
                          <p className="font-extrabold">{a.type}</p>
                          <p className="font-medium mt-0.5 leading-snug">{a.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* ==================================================
              8. PAYMENT / COLLECTION SUMMARY
              ================================================== */}
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150 pb-3 flex justify-between items-center">
                <span>Collection Performance</span>
              </h3>

              <div className="space-y-3.5">
                {[
                  { label: 'Total Paid (Principal)', value: formatCurrency(paymentsRollup.totalPrincipalPaid), color: 'text-slate-800' },
                  { label: 'Total Paid (Interest)', value: formatCurrency(paymentsRollup.totalInterestPaid), color: 'text-slate-800' },
                  { label: 'Total Collected', value: formatCurrency(paymentsRollup.totalCollected), color: 'text-emerald-600 font-extrabold' },
                  { label: 'Interest Collected (YTD)', value: formatCurrency(paymentsRollup.interestYTD), color: 'text-brand-600' },
                  { label: 'Last Payment Date', value: paymentsRollup.lastPaymentDate !== 'N/A' ? formatDate(paymentsRollup.lastPaymentDate) : 'N/A', color: 'text-slate-700' },
                  { label: 'Last Payment Amount', value: paymentsRollup.lastPaymentAmount > 0 ? formatCurrency(paymentsRollup.lastPaymentAmount) : '-', color: 'text-slate-700' }
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500">{item.label}</span>
                    <span className={cn('font-mono font-bold', item.color)}>{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        )}

      </div>

      {/* Collect EMI payment Modal */}
      {isEmiModalOpen && nextEmi && (
        <CollectEmiModal
          customer={customer}
          loan={loan}
          nextPending={nextEmi}
          onClose={() => setIsEmiModalOpen(false)}
          onSubmit={handleCollectEmiSubmit}
        />
      )}

      {/* Edit Account Parameter Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Loan Account Parameters"
        size="md"
      >
        <form onSubmit={handleEditLoanSubmit} className="space-y-4">
          <Input
            label="Principal Amount (₹)"
            type="number"
            value={editForm.loan_amount}
            onChange={(e) => setEditForm({ ...editForm, loan_amount: e.target.value })}
            required
          />
          <Input
            label="Interest Rate (% p.a.)"
            type="number"
            step="0.01"
            value={editForm.interest_rate}
            onChange={(e) => setEditForm({ ...editForm, interest_rate: e.target.value })}
            required
          />
          <Input
            label="Duration (Months)"
            type="number"
            value={editForm.duration_months}
            onChange={(e) => setEditForm({ ...editForm, duration_months: e.target.value })}
            required
          />
          <Input
            label="Processing Fee (₹)"
            type="number"
            value={editForm.processing_fee}
            onChange={(e) => setEditForm({ ...editForm, processing_fee: e.target.value })}
          />
          <Input
            label="Loan Date"
            type="date"
            value={editForm.loan_date}
            onChange={(e) => setEditForm({ ...editForm, loan_date: e.target.value })}
            required
          />
          <Select
            label="Interest Type"
            value={editForm.interest_type}
            onChange={(e) => setEditForm({ ...editForm, interest_type: e.target.value as any })}
            options={[
              { value: 'reducing', label: 'Reducing Balance' },
              { value: 'flat', label: 'Flat Rate' }
            ]}
          />
          <Select
            label="Account Status"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'closed', label: 'Closed' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'pending', label: 'Pending' }
            ]}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={updateLoan.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Statement and Ledger printable view Modal */}
      <Modal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        title={`Account Statement - Loan #${loan.loan_number}`}
        size="xl"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">FinanceERP Accounting Statement</h2>
              <p className="text-xs text-slate-400">Statement Generated on: {formatDate(new Date())}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-700">Account Number: {loan.loan_number}</p>
              <p className="text-xs text-slate-500">Customer: {customer.name} ({customer.customer_id})</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase mb-0.5">Principal Sanctioned</p>
              <p className="text-sm font-bold text-slate-800">{formatCurrency(loan.loan_amount)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase mb-0.5">Total Recovered</p>
              <p className="text-sm font-bold text-emerald-600">{formatCurrency(paymentsRollup.totalCollected)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase mb-0.5">Outstanding Balance</p>
              <p className="text-sm font-bold text-red-500">{formatCurrency(loan.remaining_balance)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payments and Collections History</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-slate-600 text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Receipt ID</th>
                    <th className="p-3">EMI #</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Principal Component</th>
                    <th className="p-3">Interest Component</th>
                    <th className="p-3">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400 italic">No payments logged.</td>
                    </tr>
                  ) : (
                    payments.map(p => (
                      <tr key={p.id}>
                        <td className="p-3">{formatDate(p.payment_date)}</td>
                        <td className="p-3 font-mono font-bold text-brand-600">{p.receipt_number}</td>
                        <td className="p-3 font-semibold">EMI Collection #{p.emi_number}</td>
                        <td className="p-3 uppercase font-semibold">{p.payment_mode}</td>
                        <td className="p-3 font-mono">{formatCurrency(p.principal_paid)}</td>
                        <td className="p-3 font-mono text-slate-500">{formatCurrency(p.interest_paid)}</td>
                        <td className="p-3 font-mono font-bold text-emerald-600">{formatCurrency(p.amount_paid)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 print:hidden">
            <Button variant="outline" onClick={handlePrintStatement}><Printer className="h-4 w-4" /> Print Statement</Button>
            <Button variant="outline" onClick={handleExportStatement} className="border-slate-200 text-slate-700"><Download className="h-4 w-4" /> Export CSV</Button>
            <Button onClick={() => setIsStatementModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        title="Upload Verification Document"
        size="md"
      >
        <form onSubmit={handleAddDocument} className="space-y-4">
          <Input
            label="Document Name"
            value={docForm.name}
            onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
            placeholder="e.g. Loan Agreement Signature copy"
            required
          />
          <Select
            label="Document Category Type"
            value={docForm.type}
            onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
            options={[
              { value: 'Agreement', label: 'Loan Agreement Copy' },
              { value: 'Property Proof', label: 'Property / Asset security document' },
              { value: 'KYC Document', label: 'KYC Address Verification' },
              { value: 'Insurance Policy', label: 'Asset Insurance Copy' },
              { value: 'Other Proof', label: 'Other Supplemental Document' }
            ]}
          />
          <div className="border border-dashed border-slate-200 hover:border-brand-500 rounded-xl p-6 text-center cursor-pointer transition-colors" onClick={() => toast.info('File upload mock initialized')}>
            <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Click to select files from your computer</p>
            <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsUploadDocOpen(false)}>Cancel</Button>
            <Button type="submit">Upload Document</Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}

// Inline CollectEmiModal helper component
function CollectEmiModal({
  customer,
  loan,
  nextPending,
  onClose,
  onSubmit
}: {
  customer: any
  loan: any
  nextPending: any
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const { user } = useAuthStore()
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank' | 'cheque'>('cash')
  const [penalty, setPenalty] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [partial, setPartial] = useState(false)
  const [partialAmount, setPartialAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const emiAmountToPay = partial ? (parseFloat(partialAmount) || 0) : Number(nextPending.emi_amount)
  const totalAmount = emiAmountToPay + parseFloat(penalty || '0') - parseFloat(discount || '0')

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({
        loan_id: loan.id,
        customer_id: customer.id,
        emi_schedule_id: nextPending.id,
        emi_number: nextPending.emi_number,
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: paymentMode,
        amount_paid: totalAmount,
        penalty: parseFloat(penalty) || 0,
        discount: parseFloat(discount) || 0,
        collected_by: user?.full_name || 'Admin'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`EMI Payment Collection - EMI #${nextPending.emi_number}`}
      size="md"
    >
      <form onSubmit={handleCollectSubmit} className="space-y-4">
        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 border border-slate-150">
          <Avatar name={customer.name} size="md" />
          <div>
            <p className="font-bold text-slate-800 text-sm">{customer.name}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{loan.loan_number} — {loan.loan_type.toUpperCase()}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-black text-slate-900 font-mono">{formatCurrency(nextPending.emi_amount)}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Scheduled EMI</p>
          </div>
        </div>

        <div>
          <label className="form-label text-xs font-bold text-slate-500 uppercase mb-1.5 block">Payment Mode</label>
          <div className="flex gap-2">
            {(['cash', 'upi', 'bank', 'cheque'] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setPaymentMode(mode)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-bold border transition-all uppercase tracking-wider text-center',
                  paymentMode === mode
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Late Penalty (₹)"
            type="number"
            value={penalty}
            onChange={(e) => setPenalty(e.target.value)}
            placeholder="0"
          />
          <Input
            label="Discount / concession (₹)"
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="flex gap-4 pt-1.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={partial}
              onChange={(e) => setPartial(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
            />
            <span className="text-xs font-semibold text-slate-700">Record Partial Payment</span>
          </label>
        </div>

        {partial && (
          <Input
            label="Partial Collection Amount (₹)"
            type="number"
            value={partialAmount}
            onChange={(e) => setPartialAmount(e.target.value)}
            placeholder="Enter partial amount"
            required
          />
        )}

        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex justify-between items-center mt-2">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Collection Amount</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Base + Penalty - Discount</p>
          </div>
          <p className="text-xl font-black text-emerald-700 font-mono">{formatCurrency(totalAmount)}</p>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" loading={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
            Confirm Collection
          </Button>
        </div>
      </form>
    </Modal>
  )
}
