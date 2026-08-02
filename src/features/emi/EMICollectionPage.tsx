import { useState } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CheckCircle2, AlertTriangle, Printer, Download, Plus } from 'lucide-react'
import { useCustomers, useLoans, usePayments, useLoanSchedule, useCreatePayment } from '@/hooks/useDb'
import { useAuthStore } from '@/store/authStore'
import {
  Button, Input, Select, Card, CardHeader, CardTitle, CardBody,
  Modal, StatusBadge, Avatar
} from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'

function PaymentModal({
  customer,
  loan,
  onClose,
}: {
  customer: any
  loan: any
  onClose: () => void
}) {
  const { user } = useAuthStore()
  const { data: schedule = [] } = useLoanSchedule(loan.id)
  const nextPending = schedule.find((s) => s.status === 'pending' || s.status === 'overdue')
  const createPayment = useCreatePayment()

  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank' | 'cheque'>('cash')
  const [penalty, setPenalty] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [advance, setAdvance] = useState(false)
  const [partial, setPartial] = useState(false)
  const [partialAmount, setPartialAmount] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const emiAmountToPay = partial ? (parseFloat(partialAmount) || 0) : (nextPending ? Number(nextPending.emi_amount) : Number(loan.emi_amount))
  const totalAmount = emiAmountToPay + parseFloat(penalty || '0') - parseFloat(discount || '0')

  const handleCollect = async () => {
    if (!nextPending) {
      alert('No pending EMIs to collect.')
      return
    }
    setLoading(true)
    try {
      await createPayment.mutateAsync({
        loan_id: loan.id,
        customer_id: customer.id,
        emi_schedule_id: nextPending.id,
        emi_number: nextPending.emi_number,
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: paymentMode,
        amount_paid: totalAmount,
        penalty: parseFloat(penalty) || 0,
        discount: parseFloat(discount) || 0,
        collected_by: user?.full_name || 'Admin',
      })
      setDone(true)
    } catch (err) {
      console.error(err)
      alert('Failed to collect EMI payment.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-8 gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"
        >
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </motion.div>
        <h3 className="text-xl font-bold text-slate-900">Payment Collected!</h3>
        <div className="bg-slate-50 rounded-xl p-4 w-full space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Receipt No.</span><span className="font-semibold text-brand-600">RCP{Date.now().toString().slice(-6)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-semibold">{customer.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Loan No.</span><span className="font-semibold">{loan.loan_number}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-bold text-emerald-700 amount-display">{formatCurrency(totalAmount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Mode</span><span className="font-semibold capitalize">{paymentMode}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-semibold">{formatDate(new Date().toISOString())}</span></div>
        </div>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" size="sm"><Printer className="h-4 w-4" /> Print Receipt</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Download PDF</Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Customer & Loan Info */}
      <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
        <Avatar name={customer.name} size="lg" />
        <div>
          <p className="font-bold text-slate-900">{customer.name}</p>
          <p className="text-sm text-slate-500">{customer.mobile}</p>
          <p className="text-xs text-brand-600 font-semibold mt-0.5">{loan.loan_number} — {loan.loan_type.toUpperCase()} LOAN</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-slate-900 amount-display">{formatCurrency(loan.emi_amount)}</p>
          <p className="text-xs text-slate-500">EMI Amount</p>
          <StatusBadge status={loan.status} />
        </div>
      </div>

      {/* Loan Summary */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        {[
          { label: 'Remaining EMI', value: loan.remaining_emi.toString() },
          { label: 'Balance', value: formatCurrency(loan.remaining_balance) },
          { label: 'Overdue', value: loan.status === 'overdue' ? 'Yes' : 'No' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="font-bold text-slate-800 amount-display">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Payment Mode */}
      <div>
        <label className="form-label">Payment Mode</label>
        <div className="flex gap-2">
          {(['cash', 'upi', 'bank', 'cheque'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPaymentMode(mode)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all uppercase tracking-wide',
                paymentMode === mode
                  ? 'bg-brand-500 text-white border-brand-500 shadow-kpi'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Penalty Amount (₹)"
          type="number"
          value={penalty}
          onChange={(e) => setPenalty(e.target.value)}
          placeholder="0"
        />
        <Input
          label="Discount Amount (₹)"
          type="number"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          placeholder="0"
        />
      </div>

      {/* Special options */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={advance} onChange={(e) => setAdvance(e.target.checked)} className="w-4 h-4 accent-brand-500" />
          <span className="text-sm text-slate-700">Advance EMI</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} className="w-4 h-4 accent-brand-500" />
          <span className="text-sm text-slate-700">Partial Payment</span>
        </label>
      </div>

      {partial && (
        <Input
          label="Partial Amount (₹)"
          type="number"
          value={partialAmount}
          onChange={(e) => setPartialAmount(e.target.value)}
          placeholder="Enter partial amount"
        />
      )}

      {/* Total */}
      <div className="bg-gradient-to-r from-brand-50 to-emerald-50 rounded-xl p-4 border border-brand-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-600 font-medium">Total to Collect</p>
            <p className="text-xs text-slate-400 mt-0.5">EMI + Penalty - Discount</p>
          </div>
          <p className="text-3xl font-bold text-brand-600 amount-display">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleCollect} className="bg-emerald-600 hover:bg-emerald-700" loading={loading} disabled={!nextPending}>
          <CheckCircle2 className="h-4 w-4" />
          Collect Payment
        </Button>
      </div>
    </div>
  )
}

export default function EMICollectionPage() {
  const [searchQuery, setSearchQuery] = useLocalStorage<string>('emi_search_query', '')
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [activeTab, setActiveTab] = useLocalStorage<'collection' | 'history'>('emi_active_tab', 'collection')

  const { data: customers = [], isLoading: isCustLoading } = useCustomers()
  const { data: loans = [], isLoading: isLoansLoading } = useLoans()
  const { data: payments = [], isLoading: isPaymentsLoading } = usePayments()

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile.includes(searchQuery) ||
      c.customer_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const customerLoans = selectedCustomer
    ? loans.filter((l) => l.customer_id === selectedCustomer.id)
    : []

  return (
    <div className="p-6 space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">EMI Collection</h1>
          <p className="page-subtitle">Today's collection center — manage daily EMI payments</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <span className="font-medium text-slate-700">{formatDate(new Date().toISOString())}</span>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(['collection', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-6 py-2 text-sm font-semibold rounded-md capitalize transition-all',
              activeTab === tab ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'collection' ? 'Daily Collection' : 'Payment History'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'collection' ? (
          <motion.div
            key="collection"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Search Customer */}
            <Card>
              <CardHeader>
                <CardTitle>Search Customer</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    className="form-input pl-9"
                    placeholder="Search by name, mobile, customer ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {isCustLoading ? (
                    <div className="text-center py-4 text-slate-500">Loading...</div>
                  ) : filteredCustomers.map((customer) => {
                    const activeLoans = loans.filter((l) => l.customer_id === customer.id && l.status === 'active')
                    if (activeLoans.length === 0) return null
                    return (
                      <button
                        key={customer.id}
                        onClick={() => { setSelectedCustomer(customer); setSelectedLoan(null) }}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                          selectedCustomer?.id === customer.id
                            ? 'border-brand-300 bg-brand-50'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <Avatar name={customer.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{customer.name}</p>
                          <p className="text-xs text-slate-500">{customer.mobile} · {customer.customer_id}</p>
                          <p className="text-xs text-brand-600 font-medium mt-0.5">{activeLoans.length} active loan{activeLoans.length > 1 ? 's' : ''}</p>
                        </div>
                        {customer.status === 'active' ? (
                          <StatusBadge status="active" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardBody>
            </Card>

            {/* Select Loan & Collect */}
            <Card>
              <CardHeader>
                <CardTitle>{selectedCustomer ? `${selectedCustomer.name}'s Loans` : 'Select Customer First'}</CardTitle>
              </CardHeader>
              <CardBody>
                {!selectedCustomer ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Search className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Search & select a customer to collect EMI</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerLoans.filter((l) => l.status !== 'closed').map((loan) => (
                      <div
                        key={loan.id}
                        className={cn(
                          'rounded-xl border p-4 transition-all cursor-pointer',
                          selectedLoan?.id === loan.id
                            ? 'border-brand-300 bg-brand-50'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        )}
                        onClick={() => setSelectedLoan(loan)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{loan.loan_number}</p>
                            <p className="text-xs text-slate-500 capitalize">{loan.loan_type} Loan</p>
                          </div>
                          <StatusBadge status={loan.status} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><p className="text-slate-400">EMI</p><p className="font-bold text-emerald-700 amount-display">{formatCurrency(loan.emi_amount)}</p></div>
                          <div><p className="text-slate-400">Remaining</p><p className="font-semibold text-slate-700">{loan.remaining_emi} EMIs</p></div>
                          <div><p className="text-slate-400">Balance</p><p className="font-semibold amount-display text-slate-700">{formatCurrency(loan.remaining_balance)}</p></div>
                        </div>
                        {loan.status === 'overdue' && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Overdue — Penalty may apply</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {selectedLoan && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Button
                          className="w-full mt-2 py-3 text-base bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setShowPaymentModal(true)}
                        >
                          <Plus className="h-5 w-5" />
                          Collect EMI — {formatCurrency(selectedLoan.emi_amount)}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payment History</CardTitle>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Receipt No.', 'Customer', 'Loan', 'EMI#', 'Date', 'Amount', 'Penalty', 'Mode', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isPaymentsLoading ? (
                      <tr><td colSpan={9} className="text-center py-6 text-slate-500">Loading...</td></tr>
                    ) : payments.map((p) => {
                      const customer = customers.find((c) => c.id === p.customer_id)
                      const loan = loans.find((l) => l.id === p.loan_id)
                      return (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-brand-600 font-semibold">{p.receipt_number}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={customer?.name ?? ''} size="sm" />
                              <span className="text-sm font-medium text-slate-800">{customer?.name ?? '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{loan?.loan_number ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">#{p.emi_number}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(p.payment_date)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-emerald-700 amount-display">{formatCurrency(p.amount_paid)}</td>
                          <td className="px-4 py-3 text-sm text-red-600 amount-display">{p.penalty > 0 ? formatCurrency(p.penalty) : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase',
                              p.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700' :
                              p.payment_mode === 'upi' ? 'bg-purple-50 text-purple-700' :
                              'bg-blue-50 text-blue-700'
                            )}>
                              {p.payment_mode}
                            </span>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={p.partial ? 'partial' : 'paid'} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      {selectedCustomer && selectedLoan && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title="Collect EMI Payment"
          size="md"
        >
          <PaymentModal
            customer={selectedCustomer}
            loan={selectedLoan}
            onClose={() => setShowPaymentModal(false)}
          />
        </Modal>
      )}
    </div>
  )
}
