import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowDownLeft, ArrowUpRight, Landmark, Wallet, Plus, X,
  TrendingDown, TrendingUp, IndianRupee, LayoutDashboard, Banknote,
  ShoppingBag, ArrowLeftRight, ChevronDown, AlertCircle, RefreshCw,
  CalendarDays, FileText, Building2, Filter, Search, CheckCircle2
} from 'lucide-react'
import {
  useBankAccounts, useCreateBankAccount, useTransactions, useCreateTransaction,
  useLoans
} from '@/hooks/useDb'
import { useAuthStore } from '@/store/authStore'
import { Button, Card, Input, Select, Modal, EmptyState, Badge } from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'
import { toast } from 'sonner'
import type { BankAccount, Transaction, TxnType } from '@/types'

// ─── Constants ─────────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  'Office Expense', 'Salary', 'Transport', 'Electricity', 'Rent',
  'Maintenance', 'Marketing', 'Legal', 'Fuel', 'Internet', 'Other'
]

const DEPOSIT_TYPES = ['Cash Deposit', 'Bank Transfer', 'Cheque Deposit', 'Online Transfer', 'Other']

const TAB_ITEMS: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'disbursement', label: 'Disbursement', icon: ArrowUpRight },
  { id: 'repayment', label: 'Repayment', icon: ArrowDownLeft },
  { id: 'expenses', label: 'Expenses', icon: ShoppingBag },
  { id: 'deposit', label: 'Deposit', icon: Banknote },
  { id: 'ledger', label: 'Ledger', icon: FileText },
  { id: 'bank-accounts', label: 'Bank Accounts', icon: Landmark },
]

// ─── Type colors / labels ──────────────────────────────────────────────────────
const TXN_CONFIG: Record<TxnType, { color: string; bg: string; border: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  disbursement: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Disbursement', icon: ArrowUpRight },
  repayment:    { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Repayment', icon: ArrowDownLeft },
  expense:      { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Expense', icon: TrendingDown },
  deposit:      { color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-200', label: 'Deposit', icon: TrendingUp },
}

// ─── Add Bank Account Modal ────────────────────────────────────────────────────
function AddBankAccountModal({ onClose }: { onClose: () => void }) {
  const createAccount = useCreateBankAccount()
  const [form, setForm] = useState({
    name: '',
    account_type: 'bank' as BankAccount['account_type'],
    account_number: '',
    bank_name: '',
    opening_balance: '0',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Account name is required'); return }
    setLoading(true)
    try {
      await createAccount.mutateAsync({
        name: form.name,
        account_type: form.account_type,
        account_number: form.account_number || undefined,
        bank_name: form.bank_name || undefined,
        opening_balance: parseFloat(form.opening_balance) || 0,
        is_active: true,
      })
      toast.success('Bank account added successfully')
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Account Name *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. SBI Current Account" />
        </div>
        <Select label="Account Type *" value={form.account_type}
          onChange={e => setForm({ ...form, account_type: e.target.value as any })}
          options={[
            { value: 'cash', label: 'Cash Account' },
            { value: 'bank', label: 'Bank Account' },
            { value: 'current', label: 'Current Account' },
            { value: 'savings', label: 'Savings Account' },
          ]} />
        <Input label="Opening Balance (₹)" type="number" value={form.opening_balance}
          onChange={e => setForm({ ...form, opening_balance: e.target.value })}
          placeholder="0" />
        {form.account_type !== 'cash' && <>
          <Input label="Bank Name" value={form.bank_name}
            onChange={e => setForm({ ...form, bank_name: e.target.value })}
            placeholder="e.g. State Bank of India" />
          <Input label="Account Number" value={form.account_number}
            onChange={e => setForm({ ...form, account_number: e.target.value })}
            placeholder="Optional" />
        </>}
      </div>
      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading}>Add Account</Button>
      </div>
    </div>
  )
}

// ─── Transaction Form Modal ────────────────────────────────────────────────────
function TxnFormModal({
  type,
  onClose,
  defaultCustomerId,
  defaultLoanId
}: {
  type: TxnType
  onClose: () => void
  defaultCustomerId?: string
  defaultLoanId?: string
}) {
  const { user, isBranchUser, userBranch, selectedBranch } = useAuthStore()
  const activeBranch = isBranchUser ? userBranch : selectedBranch
  const { data: bankAccounts = [] } = useBankAccounts()
  const { data: loans = [], isLoading: isLoansLoading } = useLoans(activeBranch)
  const createTxn = useCreateTransaction()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    bank_account_id: bankAccounts[0]?.id || '',
    customer_id: defaultCustomerId || '',
    loan_id: defaultLoanId || '',
    amount: '',
    principal: '',
    interest: '',
    other_charges: '',
    reference_number: '',
    description: '',
    category: EXPENSE_CATEGORIES[0],
    deposit_type: DEPOSIT_TYPES[0],
  })

  // Loan selector mode (dropdown list vs manual entry)
  const [loanSelectMode, setLoanSelectMode] = useState<'dropdown' | 'manual'>('dropdown')
  const [manualLoanInput, setManualLoanInput] = useState('')
  const [isManualLoanSuggestionsOpen, setIsManualLoanSuggestionsOpen] = useState(false)
  const manualLoanInputRef = useRef<HTMLInputElement>(null)
  const loanSuggestionsRef = useRef<HTMLDivElement>(null)

  // Filter loans strictly for active branch if set
  const branchLoans = useMemo(() => {
    if (!activeBranch) return loans
    const target = activeBranch.toLowerCase().replace(/\s+branch$/i, '').trim()
    return loans.filter(l => {
      const b = (l.branch || '').toLowerCase().replace(/\s+branch$/i, '').trim()
      return b === target
    })
  }, [loans, activeBranch])

  // Selected loan object
  const selectedLoan = useMemo(() => {
    if (!form.loan_id) return null
    return branchLoans.find(l => l.id === form.loan_id) || loans.find(l => l.id === form.loan_id) || null
  }, [branchLoans, loans, form.loan_id])

  // Sync manual input when a loan is selected
  useEffect(() => {
    if (selectedLoan?.loan_number && !manualLoanInput) {
      setManualLoanInput(selectedLoan.loan_number)
    }
  }, [selectedLoan?.loan_number])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        loanSuggestionsRef.current &&
        !loanSuggestionsRef.current.contains(e.target as Node) &&
        manualLoanInputRef.current &&
        !manualLoanInputRef.current.contains(e.target as Node)
      ) {
        setIsManualLoanSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Manual query matches for loan accounts
  const manualLoanMatches = useMemo(() => {
    const query = manualLoanInput.trim().toLowerCase()
    if (!query) return []
    return branchLoans
      .filter(l =>
        (l.loan_number && l.loan_number.toLowerCase().includes(query)) ||
        (l.customer_name && l.customer_name.toLowerCase().includes(query)) ||
        (l.customer_custom_id && l.customer_custom_id.toLowerCase().includes(query)) ||
        (l.customer_mobile && l.customer_mobile.includes(query))
      )
      .slice(0, 8)
  }, [branchLoans, manualLoanInput])

  const exactLoanMatch = useMemo(() => {
    const query = manualLoanInput.trim().toUpperCase()
    if (!query) return null
    return branchLoans.find(l => l.loan_number && l.loan_number.toUpperCase() === query) || null
  }, [branchLoans, manualLoanInput])

  // Disbursement stats calculation
  const disbursementStats = useMemo(() => {
    if (!selectedLoan || type !== 'disbursement') return null
    const sanctioned = Number(selectedLoan.loan_amount) || 0
    const disbursed = Number(selectedLoan.disbursed_amount) || 0
    const remaining = Math.max(0, sanctioned - disbursed)
    const isFullyDisbursed = remaining <= 0 && sanctioned > 0
    return { sanctioned, disbursed, remaining, isFullyDisbursed }
  }, [selectedLoan, type])

  // Auto-select first bank account when accounts load if not already set
  useEffect(() => {
    if (!form.bank_account_id && bankAccounts.length > 0) {
      setForm(prev => ({ ...prev, bank_account_id: bankAccounts[0].id }))
    }
  }, [bankAccounts, form.bank_account_id])

  // If defaultLoanId is provided or loans loaded, auto-select and auto-fill amount
  useEffect(() => {
    if (defaultLoanId && branchLoans.length > 0) {
      const matched = branchLoans.find(l => l.id === defaultLoanId)
      if (matched) {
        const sanctioned = Number(matched.loan_amount) || 0
        const disbursed = Number(matched.disbursed_amount) || 0
        const pendingAmt = Math.max(0, sanctioned - disbursed)
        setForm(prev => ({
          ...prev,
          loan_id: matched.id,
          customer_id: matched.customer_id,
          amount: type === 'disbursement' && pendingAmt > 0 ? pendingAmt.toString() : (type === 'repayment' && matched.emi_amount ? matched.emi_amount.toString() : prev.amount)
        }))
        setManualLoanInput(matched.loan_number || '')
      }
    }
  }, [defaultLoanId, branchLoans, type])

  const handleDisbursementLoanChange = (loanId: string) => {
    const sLoan = branchLoans.find(l => l.id === loanId)
    if (sLoan) {
      const sanctioned = Number(sLoan.loan_amount) || 0
      const disbursed = Number(sLoan.disbursed_amount) || 0
      const pendingAmt = Math.max(0, sanctioned - disbursed)
      setForm(prev => ({
        ...prev,
        loan_id: loanId,
        customer_id: sLoan.customer_id,
        amount: pendingAmt > 0 ? pendingAmt.toString() : ''
      }))
      setManualLoanInput(sLoan.loan_number || '')
    } else {
      setForm(prev => ({ ...prev, loan_id: loanId, customer_id: '', amount: '' }))
    }
  }

  const handleRepaymentLoanChange = (loanId: string) => {
    const sLoan = branchLoans.find(l => l.id === loanId)
    if (sLoan) {
      setForm(prev => ({
        ...prev,
        loan_id: loanId,
        customer_id: sLoan.customer_id,
        amount: sLoan.emi_amount ? sLoan.emi_amount.toString() : prev.amount
      }))
      setManualLoanInput(sLoan.loan_number || '')
    } else {
      setForm(prev => ({ ...prev, loan_id: loanId, customer_id: '' }))
    }
  }

  const isDisbursementOverLimit = useMemo(() => {
    if (type !== 'disbursement' || !disbursementStats) return false
    const amt = parseFloat(form.amount)
    return !isNaN(amt) && amt > disbursementStats.remaining
  }, [type, disbursementStats, form.amount])

  const cfg = TXN_CONFIG[type]
  const isDebit = type === 'disbursement' || type === 'expense'

  const handleSubmit = async () => {
    if (!form.bank_account_id) { toast.error('Please select a bank account'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Please enter a valid amount'); return }
    if (type === 'disbursement') {
      if (!form.loan_id) {
        toast.error('Please select a Loan / Account Number to disburse'); return
      }
      if (disbursementStats) {
        if (disbursementStats.isFullyDisbursed) {
          toast.error('This loan account is already 100% disbursed. No additional disbursements are permitted.')
          return
        }
        const enteredAmt = parseFloat(form.amount)
        if (enteredAmt > disbursementStats.remaining) {
          toast.error(`Disbursement amount (${formatCurrency(enteredAmt)}) cannot exceed remaining limit of ${formatCurrency(disbursementStats.remaining)}.`)
          return
        }
      }
    } else if (type === 'repayment') {
      if (!form.loan_id) {
        toast.error('Please select a Loan Account'); return
      }
    }
    setLoading(true)
    try {
      await createTxn.mutateAsync({
        txn_type: type,
        direction: isDebit ? 'debit' : 'credit',
        amount: parseFloat(form.amount),
        bank_account_id: form.bank_account_id,
        customer_id: form.customer_id || selectedLoan?.customer_id || undefined,
        loan_id: form.loan_id || undefined,
        date: form.date,
        reference_number: form.reference_number || undefined,
        description: form.description || undefined,
        principal: form.principal ? parseFloat(form.principal) : undefined,
        interest: form.interest ? parseFloat(form.interest) : undefined,
        other_charges: form.other_charges ? parseFloat(form.other_charges) : undefined,
        category: type === 'expense' ? form.category : undefined,
        deposit_type: type === 'deposit' ? form.deposit_type : undefined,
        created_by: user?.full_name || 'Admin',
        is_reversed: false,
      })
      toast.success(`${cfg.label} recorded successfully! Loan account has been updated.`)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || `Failed to record ${type}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Type indicator */}
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border', cfg.bg, cfg.border, cfg.color)}>
        <cfg.icon className="h-4 w-4" />
        Recording a {cfg.label} — {isDebit ? 'Money going OUT (Debit)' : 'Money coming IN (Credit)'}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date *"
          type="date"
          value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })}
        />
        <Select
          label="Bank / Cash Account *"
          value={form.bank_account_id}
          onChange={e => setForm({ ...form, bank_account_id: e.target.value })}
          options={bankAccounts.map(a => ({ value: a.id, label: a.name }))}
          placeholder="Select account"
        />

        {/* ─── DISBURSEMENT: Direct Branch Loan / Account Selector with Dropdown & Manual Entry ─── */}
        {type === 'disbursement' && (
          <div className="col-span-2 space-y-3">
            {activeBranch && (
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-violet-50/70 border border-violet-200/80 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-700">
                  <Building2 className="h-4 w-4 text-violet-600" />
                  <span>Branch: {activeBranch} Branch</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-violet-600 bg-white border-violet-200">
                  {branchLoans.length} Loan Accounts
                </Badge>
              </div>
            )}

            {/* Mode Switcher Header */}
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Loan / Account Number ({activeBranch ? `${activeBranch} Branch` : 'All Branches'}) *
              </label>
              <div className="flex items-center gap-1.5">
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setLoanSelectMode('dropdown')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer',
                      loanSelectMode === 'dropdown'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    Branch List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoanSelectMode('manual')
                      setTimeout(() => manualLoanInputRef.current?.focus(), 50)
                    }}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer',
                      loanSelectMode === 'manual'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    Manual Entry
                  </button>
                </div>
              </div>
            </div>

            {/* Option 1: Dropdown Selection */}
            {loanSelectMode === 'dropdown' ? (
              <div>
                <Select
                  value={form.loan_id}
                  onChange={e => {
                    const val = e.target.value
                    if (val === '__MANUAL__') {
                      setLoanSelectMode('manual')
                      setTimeout(() => manualLoanInputRef.current?.focus(), 50)
                      return
                    }
                    handleDisbursementLoanChange(val)
                  }}
                  options={[
                    ...branchLoans.map(l => {
                      const sanctioned = Number(l.loan_amount) || 0
                      const disbursed = Number(l.disbursed_amount) || 0
                      const pending = Math.max(0, sanctioned - disbursed)
                      let statusLabel = ''
                      if (disbursed <= 0) {
                        statusLabel = `Pending Full: ${formatCurrency(sanctioned)}`
                      } else if (pending > 0) {
                        statusLabel = `Partially Disbursed (${formatCurrency(pending)} remaining)`
                      } else {
                        statusLabel = `[Fully Disbursed - ${formatCurrency(sanctioned)}]`
                      }
                      return {
                        value: l.id,
                        label: `${l.loan_number} — ${l.customer_name || 'Customer'}${l.customer_custom_id ? ` (${l.customer_custom_id})` : ''} • ${statusLabel}`
                      }
                    }),
                    { value: '__MANUAL__', label: '✏️ Enter Account Number manually...' }
                  ]}
                  placeholder={isLoansLoading ? "Loading branch loan accounts..." : (branchLoans.length === 0 ? `No loan accounts found in ${activeBranch || 'this'} branch` : "Select branch loan account to disburse")}
                />
                <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Showing {activeBranch ? `${activeBranch} Branch` : 'all'} loan accounts ({branchLoans.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoanSelectMode('manual')
                      setTimeout(() => manualLoanInputRef.current?.focus(), 50)
                    }}
                    className="text-brand-600 hover:underline font-medium cursor-pointer"
                  >
                    Type Account ID manually
                  </button>
                </p>
              </div>
            ) : (
              /* Option 2: Manual Account Entry with Auto-Suggestions */
              <div className="relative">
                <div className="relative">
                  <input
                    ref={manualLoanInputRef}
                    type="text"
                    value={manualLoanInput}
                    onChange={e => {
                      const val = e.target.value
                      setManualLoanInput(val)
                      setIsManualLoanSuggestionsOpen(true)
                      const query = val.trim().toUpperCase()
                      const match = branchLoans.find(l => l.loan_number?.toUpperCase() === query)
                      if (match) {
                        handleDisbursementLoanChange(match.id)
                      } else if (form.loan_id) {
                        setForm(prev => ({ ...prev, loan_id: '', customer_id: '', amount: '' }))
                      }
                    }}
                    onFocus={() => {
                      if (manualLoanInput.trim()) {
                        setIsManualLoanSuggestionsOpen(true)
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (exactLoanMatch) {
                          handleDisbursementLoanChange(exactLoanMatch.id)
                          setIsManualLoanSuggestionsOpen(false)
                        } else if (manualLoanMatches.length > 0) {
                          const pick = manualLoanMatches[0]
                          handleDisbursementLoanChange(pick.id)
                          setIsManualLoanSuggestionsOpen(false)
                        }
                      } else if (e.key === 'Escape') {
                        setIsManualLoanSuggestionsOpen(false)
                      }
                    }}
                    placeholder="Type Loan Account No. (e.g. LN2026001) or Customer Name / Mobile"
                    className="w-full border rounded-xl pl-8 pr-8 py-2 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-800 placeholder:text-slate-400 bg-white border-slate-200 hover:border-slate-300"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  {manualLoanInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualLoanInput('')
                        setForm(prev => ({ ...prev, loan_id: '', customer_id: '', amount: '' }))
                        setIsManualLoanSuggestionsOpen(false)
                        manualLoanInputRef.current?.focus()
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions List */}
                {isManualLoanSuggestionsOpen && manualLoanMatches.length > 0 && (
                  <div
                    ref={loanSuggestionsRef}
                    className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 divide-y divide-slate-100"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 flex items-center justify-between">
                      <span>Matching Loan Accounts ({manualLoanMatches.length})</span>
                      <span className="font-normal lowercase text-[9px]">click to select</span>
                    </div>
                    {manualLoanMatches.map(l => {
                      const sanctioned = Number(l.loan_amount) || 0
                      const disbursed = Number(l.disbursed_amount) || 0
                      const pending = Math.max(0, sanctioned - disbursed)
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            handleDisbursementLoanChange(l.id)
                            setIsManualLoanSuggestionsOpen(false)
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-brand-50/60 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200/60">
                                {l.loan_number}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-semibold text-xs text-slate-800 truncate">{l.customer_name || 'Customer'}</span>
                              {l.customer_custom_id && (
                                <span className="text-[10px] text-slate-400 font-mono">({l.customer_custom_id})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                              <span>Sanctioned: <strong>{formatCurrency(sanctioned)}</strong></span>
                              <span>•</span>
                              <span className={pending > 0 ? "text-emerald-600 font-bold" : "text-slate-400 font-medium"}>
                                {pending > 0 ? `Remaining: ${formatCurrency(pending)}` : '[Fully Disbursed]'}
                              </span>
                              {l.customer_mobile && <span>• 📱 {l.customer_mobile}</span>}
                            </div>
                          </div>
                          {l.id === form.loan_id && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                              Selected
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Verified selected account card in manual mode */}
                {selectedLoan && (
                  <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-mono font-bold">{selectedLoan.loan_number}</span>
                        <span className="mx-1 text-emerald-400">•</span>
                        <span className="font-medium">{selectedLoan.customer_name || 'Customer'}</span>
                        {selectedLoan.branch && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                            {selectedLoan.branch} Branch
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, loan_id: '', customer_id: '', amount: '' }))
                        setManualLoanInput('')
                        manualLoanInputRef.current?.focus()
                      }}
                      className="text-[10px] text-emerald-700 hover:text-red-600 font-semibold ml-2 underline shrink-0 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {!selectedLoan && manualLoanInput.trim().length > 0 && manualLoanMatches.length === 0 && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1.5 text-xs text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>No loan account found matching "{manualLoanInput}". Check the Loan ID or switch to Branch List.</span>
                  </div>
                )}
              </div>
            )}

            {branchLoans.length === 0 && !isLoansLoading && (
              <p className="text-[11px] text-amber-600 font-medium">
                ⚠️ No loan accounts found in {activeBranch ? `${activeBranch} Branch` : 'this branch'}.
              </p>
            )}

            {/* Selected Loan Details & Disbursement Stats Box */}
            {selectedLoan && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 font-extrabold text-xs flex items-center justify-center shadow-2xs">
                      {selectedLoan.customer_name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">{selectedLoan.customer_name || 'Customer'}</p>
                        <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200/60">
                          {selectedLoan.loan_number}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {selectedLoan.customer_custom_id ? `ID: ${selectedLoan.customer_custom_id}` : ''}
                        {selectedLoan.customer_mobile ? ` • 📱 ${selectedLoan.customer_mobile}` : ''}
                      </p>
                    </div>
                  </div>
                  {selectedLoan.branch && (
                    <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200/80 px-2 py-0.5 rounded-lg">
                      {selectedLoan.branch} Branch
                    </span>
                  )}
                </div>

                {disbursementStats && (
                  <>
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-white border border-slate-200 rounded-xl text-xs shadow-2xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Sanctioned</span>
                        <span className="font-mono font-bold text-slate-800 text-xs">{formatCurrency(disbursementStats.sanctioned)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Disbursed</span>
                        <span className="font-mono font-bold text-amber-600 text-xs">{formatCurrency(disbursementStats.disbursed)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Remaining Limit</span>
                        <span className={cn("font-mono font-bold text-xs", disbursementStats.remaining > 0 ? "text-emerald-600" : "text-red-600")}>
                          {formatCurrency(disbursementStats.remaining)}
                        </span>
                      </div>
                    </div>

                    {disbursementStats.isFullyDisbursed ? (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                        <span>This loan account is already 100% disbursed. Additional disbursements are blocked.</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex items-center gap-1.5 font-medium">
                        <span>✓</span> {disbursementStats.disbursed > 0 ? `Recording part disbursement (Up to ${formatCurrency(disbursementStats.remaining)} available).` : 'Recording initial disbursement will disburse funds, activate the loan account, and record the Outstanding Principal.'}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── REPAYMENT: Select Branch Loan Account with Dropdown & Manual Entry ─── */}
        {type === 'repayment' && (
          <div className="col-span-2 space-y-3">
            {activeBranch && (
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-violet-50/70 border border-violet-200/80 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-700">
                  <Building2 className="h-4 w-4 text-violet-600" />
                  <span>Branch: {activeBranch} Branch</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-violet-600 bg-white border-violet-200">
                  {branchLoans.length} Loans
                </Badge>
              </div>
            )}

            {/* Mode Switcher Header */}
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Loan Account ({activeBranch ? `${activeBranch} Branch` : 'All Branches'}) *
              </label>
              <div className="flex items-center gap-1.5">
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setLoanSelectMode('dropdown')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer',
                      loanSelectMode === 'dropdown'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    Branch List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoanSelectMode('manual')
                      setTimeout(() => manualLoanInputRef.current?.focus(), 50)
                    }}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer',
                      loanSelectMode === 'manual'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    Manual Entry
                  </button>
                </div>
              </div>
            </div>

            {loanSelectMode === 'dropdown' ? (
              <div>
                <Select
                  value={form.loan_id}
                  onChange={e => {
                    const val = e.target.value
                    if (val === '__MANUAL__') {
                      setLoanSelectMode('manual')
                      setTimeout(() => manualLoanInputRef.current?.focus(), 50)
                      return
                    }
                    handleRepaymentLoanChange(val)
                  }}
                  options={[
                    ...branchLoans.map(l => ({
                      value: l.id,
                      label: `${l.loan_number} — ${l.customer_name || 'Customer'}${l.customer_custom_id ? ` (${l.customer_custom_id})` : ''} (EMI: ${formatCurrency(l.emi_amount || 0)})`
                    })),
                    { value: '__MANUAL__', label: '✏️ Enter Account Number manually...' }
                  ]}
                  placeholder={isLoansLoading ? "Loading branch loans..." : (branchLoans.length === 0 ? `No loans available in ${activeBranch || 'this'} branch` : "Select branch loan account")}
                />
                <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Showing {activeBranch ? `${activeBranch} Branch` : 'all'} loans ({branchLoans.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoanSelectMode('manual')
                      setTimeout(() => manualLoanInputRef.current?.focus(), 50)
                    }}
                    className="text-brand-600 hover:underline font-medium cursor-pointer"
                  >
                    Type Account ID manually
                  </button>
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <input
                    ref={manualLoanInputRef}
                    type="text"
                    value={manualLoanInput}
                    onChange={e => {
                      const val = e.target.value
                      setManualLoanInput(val)
                      setIsManualLoanSuggestionsOpen(true)
                      const query = val.trim().toUpperCase()
                      const match = branchLoans.find(l => l.loan_number?.toUpperCase() === query)
                      if (match) {
                        handleRepaymentLoanChange(match.id)
                      } else if (form.loan_id) {
                        setForm(prev => ({ ...prev, loan_id: '', customer_id: '' }))
                      }
                    }}
                    onFocus={() => {
                      if (manualLoanInput.trim()) {
                        setIsManualLoanSuggestionsOpen(true)
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (exactLoanMatch) {
                          handleRepaymentLoanChange(exactLoanMatch.id)
                          setIsManualLoanSuggestionsOpen(false)
                        } else if (manualLoanMatches.length > 0) {
                          const pick = manualLoanMatches[0]
                          handleRepaymentLoanChange(pick.id)
                          setIsManualLoanSuggestionsOpen(false)
                        }
                      } else if (e.key === 'Escape') {
                        setIsManualLoanSuggestionsOpen(false)
                      }
                    }}
                    placeholder="Type Loan Account No. (e.g. LN2026001) or Customer Name / Mobile"
                    className="w-full border rounded-xl pl-8 pr-8 py-2 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-800 placeholder:text-slate-400 bg-white border-slate-200 hover:border-slate-300"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  {manualLoanInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualLoanInput('')
                        setForm(prev => ({ ...prev, loan_id: '', customer_id: '' }))
                        setIsManualLoanSuggestionsOpen(false)
                        manualLoanInputRef.current?.focus()
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {isManualLoanSuggestionsOpen && manualLoanMatches.length > 0 && (
                  <div
                    ref={loanSuggestionsRef}
                    className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 divide-y divide-slate-100"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 flex items-center justify-between">
                      <span>Matching Loan Accounts ({manualLoanMatches.length})</span>
                      <span className="font-normal lowercase text-[9px]">click to select</span>
                    </div>
                    {manualLoanMatches.map(l => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          handleRepaymentLoanChange(l.id)
                          setIsManualLoanSuggestionsOpen(false)
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-brand-50/60 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200/60">
                              {l.loan_number}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-semibold text-xs text-slate-800 truncate">{l.customer_name || 'Customer'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                            <span>EMI: <strong>{formatCurrency(l.emi_amount || 0)}</strong></span>
                            {l.customer_mobile && <span>• 📱 {l.customer_mobile}</span>}
                          </div>
                        </div>
                        {l.id === form.loan_id && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                            Selected
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {selectedLoan && (
                  <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-mono font-bold">{selectedLoan.loan_number}</span>
                        <span className="mx-1 text-emerald-400">•</span>
                        <span className="font-medium">{selectedLoan.customer_name || 'Customer'}</span>
                        <span className="ml-2 font-mono font-bold text-emerald-700">EMI: {formatCurrency(selectedLoan.emi_amount || 0)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, loan_id: '', customer_id: '' }))
                        setManualLoanInput('')
                        manualLoanInputRef.current?.focus()
                      }}
                      className="text-[10px] text-emerald-700 hover:text-red-600 font-semibold ml-2 underline shrink-0 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {!selectedLoan && manualLoanInput.trim().length > 0 && manualLoanMatches.length === 0 && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1.5 text-xs text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>No loan account found matching "{manualLoanInput}". Check the Loan ID or switch to Branch List.</span>
                  </div>
                )}
              </div>
            )}

            {selectedLoan && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center shadow-2xs">
                      {selectedLoan.customer_name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{selectedLoan.customer_name || 'Customer'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {selectedLoan.customer_custom_id ? `ID: ${selectedLoan.customer_custom_id}` : ''}
                        {selectedLoan.customer_mobile ? ` • 📱 ${selectedLoan.customer_mobile}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">EMI Amount</span>
                    <p className="text-xs font-black font-mono text-emerald-600">
                      {formatCurrency(selectedLoan.emi_amount || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {type === 'expense' && (
          <div className="col-span-2">
            <Select label="Expense Category *" value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} />
          </div>
        )}

        {type === 'deposit' && (
          <div className="col-span-2">
            <Select label="Deposit Type *" value={form.deposit_type}
              onChange={e => setForm({ ...form, deposit_type: e.target.value })}
              options={DEPOSIT_TYPES.map(d => ({ value: d, label: d }))} />
          </div>
        )}

        <div className="col-span-2">
          <Input
            label={type === 'disbursement' ? `Disbursement Amount (₹) *` : "Total Amount (₹) *"}
            type="number"
            value={form.amount}
            disabled={type === 'disbursement' && !!disbursementStats?.isFullyDisbursed}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            placeholder={type === 'disbursement' && disbursementStats ? `Max ${formatCurrency(disbursementStats.remaining)}` : "Enter amount"}
          />
          {isDisbursementOverLimit && (
            <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Disbursement cannot exceed remaining limit of {formatCurrency(disbursementStats?.remaining || 0)}.
            </p>
          )}
        </div>

        {type === 'repayment' && (
          <>
            <Input label="Principal Component (₹)" type="number" value={form.principal}
              onChange={e => setForm({ ...form, principal: e.target.value })}
              placeholder="Optional breakdown" />
            <Input label="Interest Component (₹)" type="number" value={form.interest}
              onChange={e => setForm({ ...form, interest: e.target.value })}
              placeholder="Optional breakdown" />
            <div className="col-span-2">
              <Input label="Other Charges (₹)" type="number" value={form.other_charges}
                onChange={e => setForm({ ...form, other_charges: e.target.value })}
                placeholder="Penalty, late fee, etc." />
            </div>
          </>
        )}

        <Input label="Reference Number" value={form.reference_number}
          onChange={e => setForm({ ...form, reference_number: e.target.value })}
          placeholder="UTR / Cheque / Receipt no." />
        <Input label="Description / Notes" value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Optional notes" />
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={loading || (type === 'disbursement' && (!form.loan_id || !!disbursementStats?.isFullyDisbursed || isDisbursementOverLimit))}
        >
          Record {cfg.label}
        </Button>
      </div>
    </div>
  )
}

// ─── Transaction Table ─────────────────────────────────────────────────────────
function TxnTable({ txns, emptyLabel }: { txns: Transaction[]; emptyLabel: string }) {
  if (txns.length === 0) return (
    <EmptyState title={emptyLabel} description="No records found. Use the button above to record a new transaction." />
  )
  return (
    <div className="overflow-x-auto">
      <table className="data-table w-full">
        <thead>
          <tr>
            <th>Txn ID</th>
            <th>Date</th>
            <th>Type</th>
            <th>Customer / Category</th>
            <th>Loan / Ref</th>
            <th>Account</th>
            <th>Reference</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {txns.map(t => {
            const cfg = TXN_CONFIG[t.txn_type]
            return (
              <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                <td><span className="text-xs font-mono font-bold text-brand-600">{t.txn_id}</span></td>
                <td><span className="text-xs text-slate-500">{formatDate(t.date)}</span></td>
                <td>
                  <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-lg border', cfg.bg, cfg.border, cfg.color)}>
                    <cfg.icon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                </td>
                <td>
                  <span className="text-xs font-semibold text-slate-700">
                    {t.customer_name || t.category || t.deposit_type || '—'}
                  </span>
                </td>
                <td><span className="text-xs font-mono text-slate-500">{t.loan_number || '—'}</span></td>
                <td><span className="text-xs text-slate-600">{t.bank_account_name}</span></td>
                <td><span className="text-xs text-slate-400 font-mono">{t.reference_number || '—'}</span></td>
                <td className="text-right">
                  <span className={cn('text-sm font-extrabold font-mono', t.direction === 'credit' ? 'text-emerald-600' : 'text-red-600')}>
                    {t.direction === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Ledger View ───────────────────────────────────────────────────────────────
function LedgerView({ txns, bankAccounts }: { txns: Transaction[]; bankAccounts: BankAccount[] }) {
  const [selectedAccount, setSelectedAccount] = useState<string>('all')

  const filtered = selectedAccount === 'all'
    ? txns
    : txns.filter(t => t.bank_account_id === selectedAccount)

  // Sort chronologically for running balance
  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.created_at.localeCompare(b.created_at)
  })

  const openingBalance = selectedAccount === 'all'
    ? bankAccounts.reduce((s, a) => s + a.opening_balance, 0)
    : (bankAccounts.find(a => a.id === selectedAccount)?.opening_balance ?? 0)

  let runningBalance = openingBalance
  const rows = sorted.map(t => {
    const credit = t.direction === 'credit' ? t.amount : 0
    const debit = t.direction === 'debit' ? t.amount : 0
    runningBalance = runningBalance + credit - debit
    return { ...t, credit, debit, balance: runningBalance }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          label=""
          value={selectedAccount}
          onChange={e => setSelectedAccount(e.target.value)}
          options={[
            { value: 'all', label: 'All Accounts' },
            ...bankAccounts.map(a => ({ value: a.id, label: a.name }))
          ]}
        />
        <div className="text-xs text-slate-500 ml-auto">
          Opening Balance: <span className="font-bold text-slate-800">{formatCurrency(openingBalance)}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No transactions" description="Record your first transaction to see the ledger." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Txn ID</th>
                <th>Transaction</th>
                <th>Reference</th>
                <th>Account</th>
                <th className="text-right text-emerald-700">Credit (+)</th>
                <th className="text-right text-red-600">Debit (−)</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance Row */}
              <tr className="bg-brand-50/60">
                <td><span className="text-xs text-slate-500">—</span></td>
                <td><span className="text-xs font-mono font-bold text-slate-400">OB</span></td>
                <td><span className="text-xs font-bold text-slate-600">Opening Balance</span></td>
                <td>—</td>
                <td>—</td>
                <td className="text-right"><span className="text-xs font-mono text-emerald-600">{formatCurrency(openingBalance)}</span></td>
                <td className="text-right">—</td>
                <td className="text-right"><span className="text-xs font-mono font-extrabold text-slate-800">{formatCurrency(openingBalance)}</span></td>
              </tr>
              {rows.map(r => {
                const cfg = TXN_CONFIG[r.txn_type]
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td><span className="text-xs text-slate-500">{formatDate(r.date)}</span></td>
                    <td><span className="text-xs font-mono font-bold text-brand-600">{r.txn_id}</span></td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className={cn('text-[11px] font-bold', cfg.color)}>{cfg.label}</span>
                        {r.description && <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{r.description}</span>}
                      </div>
                    </td>
                    <td><span className="text-xs font-mono text-slate-400">{r.reference_number || '—'}</span></td>
                    <td><span className="text-xs text-slate-500">{r.bank_account_name}</span></td>
                    <td className="text-right">
                      {r.credit > 0
                        ? <span className="text-xs font-mono font-bold text-emerald-600">{formatCurrency(r.credit)}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="text-right">
                      {r.debit > 0
                        ? <span className="text-xs font-mono font-bold text-red-600">{formatCurrency(r.debit)}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="text-right">
                      <span className={cn('text-xs font-mono font-extrabold', r.balance >= 0 ? 'text-slate-800' : 'text-red-600')}>
                        {formatCurrency(r.balance)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Bank Accounts Tab ─────────────────────────────────────────────────────────
function BankAccountsTab({ accounts, onAdd, txns }: { accounts: BankAccount[]; onAdd: () => void; txns: Transaction[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onAdd} size="sm">
          <Plus className="h-4 w-4" /> Add Bank Account
        </Button>
      </div>
      {accounts.length === 0 ? (
        <EmptyState title="No bank accounts" description="Add your first bank or cash account to start tracking balances." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => {
            const accTxns = txns.filter(t => t.bank_account_id === acc.id)
            const balance = accTxns.reduce((sum, t) => {
              return t.direction === 'credit' ? sum + t.amount : sum - t.amount
            }, acc.opening_balance)
            const credits = accTxns.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0)
            const debits = accTxns.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0)
            return (
              <Card key={acc.id} className="p-5 space-y-3 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                      {acc.account_type === 'cash'
                        ? <Wallet className="h-5 w-5 text-brand-600" />
                        : <Landmark className="h-5 w-5 text-brand-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{acc.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{acc.account_type}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border-emerald-200">Active</Badge>
                </div>
                {acc.bank_name && <p className="text-xs text-slate-500">{acc.bank_name} {acc.account_number && `• ****${acc.account_number.slice(-4)}`}</p>}
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Current Balance</p>
                  <p className={cn('text-xl font-black font-mono', balance >= 0 ? 'text-slate-900' : 'text-red-600')}>
                    {formatCurrency(balance)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="text-emerald-600 font-bold uppercase">Total In</p>
                    <p className="font-mono font-extrabold text-emerald-700">{formatCurrency(credits)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-red-500 font-bold uppercase">Total Out</p>
                    <p className="font-mono font-extrabold text-red-600">{formatCurrency(debits)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">Opening: {formatCurrency(acc.opening_balance)}</p>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const { isBranchUser, userBranch, selectedBranch } = useAuthStore()
  const activeBranch = isBranchUser ? userBranch : selectedBranch
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('action') === 'disburse' ? 'disbursement' : 'overview')
  const [modal, setModal] = useState<null | 'disbursement' | 'repayment' | 'expense' | 'deposit' | 'bank-account'>(
    searchParams.get('action') === 'disburse' ? 'disbursement' : null
  )
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const paramCustomerId = searchParams.get('customer') || undefined
  const paramLoanId = searchParams.get('loan') || undefined

  const { data: bankAccounts = [], isError: acctError } = useBankAccounts()
  const { data: rawTxns = [], isError: txnError, isLoading: txnLoading } = useTransactions({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    branch: activeBranch,
  })

  // Branch-scoped transactions: strict isolation for the active branch
  const allTxns = useMemo(() => {
    if (!activeBranch) return rawTxns
    const normalize = (s?: string | null) => (s || '').toLowerCase().replace(/\s+branch$/i, '').trim()
    const target = normalize(activeBranch)
    return rawTxns.filter((t: any) => {
      const loanB = normalize(t._loan_branch)
      const custB = normalize(t._customer_branch)

      // 1. Authoritative: Loan branch determines where the transaction happened
      if (loanB) {
        return loanB === target
      }

      // 2. Disbursement without a resolved loan branch
      if (t.txn_type === 'disbursement') {
        return custB ? custB === target : false
      }

      // 3. Repayment or customer-level transaction without loan branch
      if (t.txn_type === 'repayment' || t.customer_id) {
        return custB === target
      }

      // 4. Expense or deposit with customer branch
      if (custB) {
        return custB === target
      }

      // 5. General branch-agnostic operational records
      return true
    })
  }, [rawTxns, activeBranch])

  const dbMissing = acctError || txnError

  // Summary metrics
  const metrics = useMemo(() => {
    const totalDisb = allTxns.filter(t => t.txn_type === 'disbursement').reduce((s, t) => s + t.amount, 0)
    const totalRepay = allTxns.filter(t => t.txn_type === 'repayment').reduce((s, t) => s + t.amount, 0)
    const totalExp = allTxns.filter(t => t.txn_type === 'expense').reduce((s, t) => s + t.amount, 0)
    const totalDep = allTxns.filter(t => t.txn_type === 'deposit').reduce((s, t) => s + t.amount, 0)
    const openingTotal = bankAccounts.reduce((s, a) => s + a.opening_balance, 0)
    const netBalance = openingTotal + totalRepay + totalDep - totalDisb - totalExp
    return { totalDisb, totalRepay, totalExp, totalDep, netBalance, openingTotal }
  }, [allTxns, bankAccounts])

  const byType = (type: TxnType) => allTxns.filter(t => t.txn_type === type)

  const KPI_CARDS = [
    { label: 'Total Disbursement', value: metrics.totalDisb, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: ArrowUpRight },
    { label: 'Total Repayment', value: metrics.totalRepay, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: ArrowDownLeft },
    { label: 'Total Expenses', value: metrics.totalExp, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: ShoppingBag },
    { label: 'Total Deposits', value: metrics.totalDep, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100', icon: Banknote },
    { label: 'Net Balance', value: metrics.netBalance, color: metrics.netBalance >= 0 ? 'text-slate-900' : 'text-red-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: IndianRupee },
  ]

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Transaction Ledger</h1>
            {activeBranch && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200/80 shadow-2xs">
                <Building2 className="h-3.5 w-3.5 text-violet-600" />
                {activeBranch} Branch
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeBranch
              ? `Ledger records for ${activeBranch} Branch — Disbursement, Repayment, Expenses & Deposits`
              : 'Complete accounting ledger — Disbursement, Repayment, Expenses & Deposits'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setModal('disbursement')} className="border-red-200 text-red-600 hover:bg-red-50">
            <ArrowUpRight className="h-4 w-4" /> Disbursement
          </Button>
          <Button variant="outline" size="sm" onClick={() => setModal('repayment')} className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">
            <ArrowDownLeft className="h-4 w-4" /> Repayment
          </Button>
          <Button variant="outline" size="sm" onClick={() => setModal('expense')} className="border-amber-200 text-amber-600 hover:bg-amber-50">
            <ShoppingBag className="h-4 w-4" /> Expense
          </Button>
          <Button size="sm" onClick={() => setModal('deposit')}>
            <Banknote className="h-4 w-4" /> Deposit
          </Button>
        </div>
      </div>

      {/* Migration Warning */}
      {dbMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Database setup required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Please apply the migration file <code className="font-mono bg-amber-100 px-1 rounded">supabase/migrations/00005_transactions_ledger.sql</code> via your{' '}
              <a href="https://supabase.com/dashboard/project/dawnjgihxnffxfvdpald/sql/new" target="_blank" rel="noreferrer" className="underline font-bold">Supabase Dashboard SQL Editor</a>.
            </p>
          </div>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {KPI_CARDS.map(c => (
          <Card key={c.label} className={cn('p-4 border', c.border)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{c.label}</span>
              <c.icon className={cn('h-4 w-4', c.color)} />
            </div>
            <p className={cn('text-lg font-black font-mono', c.color)}>{formatCurrency(c.value)}</p>
          </Card>
        ))}
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <CalendarDays className="h-3.5 w-3.5" /> From
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
        <span className="text-xs text-slate-400">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{allTxns.length} records</span>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-2 flex gap-1 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
        {TAB_ITEMS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                isActive ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.id !== 'overview' && tab.id !== 'ledger' && tab.id !== 'bank-accounts' && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-extrabold', isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                  {byType(tab.id as TxnType).length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <Card className="p-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Recent Transactions</h3>
                <TxnTable txns={allTxns.slice(0, 20)} emptyLabel="No transactions yet" />
              </div>
            )}

            {/* Disbursement */}
            {activeTab === 'disbursement' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Disbursements</h3>
                  <Button size="sm" variant="outline" onClick={() => setModal('disbursement')} className="border-red-200 text-red-600 hover:bg-red-50">
                    <Plus className="h-4 w-4" /> Add Disbursement
                  </Button>
                </div>
                <TxnTable txns={byType('disbursement')} emptyLabel="No disbursements recorded" />
              </div>
            )}

            {/* Repayment */}
            {activeTab === 'repayment' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Repayments</h3>
                  <Button size="sm" variant="outline" onClick={() => setModal('repayment')} className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                    <Plus className="h-4 w-4" /> Add Repayment
                  </Button>
                </div>
                <TxnTable txns={byType('repayment')} emptyLabel="No repayments recorded" />
              </div>
            )}

            {/* Expenses */}
            {activeTab === 'expenses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Expenses</h3>
                  <Button size="sm" variant="outline" onClick={() => setModal('expense')} className="border-amber-200 text-amber-600 hover:bg-amber-50">
                    <Plus className="h-4 w-4" /> Add Expense
                  </Button>
                </div>
                <TxnTable txns={byType('expense')} emptyLabel="No expenses recorded" />
              </div>
            )}

            {/* Deposit */}
            {activeTab === 'deposit' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Deposits</h3>
                  <Button size="sm" onClick={() => setModal('deposit')}>
                    <Plus className="h-4 w-4" /> Add Deposit
                  </Button>
                </div>
                <TxnTable txns={byType('deposit')} emptyLabel="No deposits recorded" />
              </div>
            )}

            {/* Ledger */}
            {activeTab === 'ledger' && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Running Balance Ledger</h3>
                <LedgerView txns={allTxns} bankAccounts={bankAccounts} />
              </div>
            )}

            {/* Bank Accounts */}
            {activeTab === 'bank-accounts' && (
              <BankAccountsTab
                accounts={bankAccounts}
                txns={allTxns}
                onAdd={() => setModal('bank-account')}
              />
            )}

          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Modals */}
      <Modal isOpen={modal === 'bank-account'} onClose={() => setModal(null)} title="Add Bank / Cash Account" size="md">
        <AddBankAccountModal onClose={() => setModal(null)} />
      </Modal>
      <Modal isOpen={modal === 'disbursement'} onClose={() => setModal(null)} title="Record Disbursement" size="lg">
        <TxnFormModal
          type="disbursement"
          onClose={() => setModal(null)}
          defaultCustomerId={paramCustomerId}
          defaultLoanId={paramLoanId}
        />
      </Modal>
      <Modal isOpen={modal === 'repayment'} onClose={() => setModal(null)} title="Record Repayment" size="lg">
        <TxnFormModal type="repayment" onClose={() => setModal(null)} />
      </Modal>
      <Modal isOpen={modal === 'expense'} onClose={() => setModal(null)} title="Record Expense" size="lg">
        <TxnFormModal type="expense" onClose={() => setModal(null)} />
      </Modal>
      <Modal isOpen={modal === 'deposit'} onClose={() => setModal(null)} title="Record Deposit" size="lg">
        <TxnFormModal type="deposit" onClose={() => setModal(null)} />
      </Modal>
    </div>
  )
}
