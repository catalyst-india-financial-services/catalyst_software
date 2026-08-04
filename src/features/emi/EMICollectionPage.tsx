import { useState } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CheckCircle2, AlertTriangle, Printer, Download, Plus, Coins, WalletCards } from 'lucide-react'
import { useCustomers, useLoans, usePayments, useLoanSchedule, useCreatePayment } from '@/hooks/useDb'
import { useAuthStore } from '@/store/authStore'
import {
  Button, Input, Select, Card, CardHeader, CardTitle, CardBody,
  Modal, StatusBadge, Avatar, PageHeader
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
          className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xl"
        >
          <CheckCircle2 className="h-10 w-10" />
        </motion.div>
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Payment Successfully Collected!</h3>
        <div className="bg-slate-50 rounded-2xl p-4 w-full space-y-2 text-xs border border-slate-200/80">
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Receipt No.</span><span className="font-bold text-brand-600 font-mono">RCP{Date.now().toString().slice(-6)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Customer</span><span className="font-bold text-slate-800">{customer.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Loan No.</span><span className="font-bold text-slate-800 font-mono">{loan.loan_number}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Amount Collected</span><span className="font-extrabold text-emerald-600 text-sm amount-display">{formatCurrency(totalAmount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Payment Mode</span><span className="font-bold uppercase text-slate-800">{paymentMode}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Collection Date</span><span className="font-bold text-slate-800">{formatDate(new Date().toISOString())}</span></div>
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
      {/* Customer & Loan Header */}
      <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-200/80">
        <Avatar name={customer.name} size="lg" />
        <div>
          <p className="font-bold text-slate-900 text-sm">{customer.name}</p>
          <p className="text-xs text-slate-500">{customer.mobile}</p>
          <p className="text-xs text-brand-600 font-bold font-mono mt-0.5">{loan.loan_number} — {loan.loan_type.toUpperCase()} LOAN</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xl font-extrabold text-slate-900 amount-display">{formatCurrency(loan.emi_amount)}</p>
          <p className="text-[11px] text-slate-400 font-medium">Base Monthly EMI</p>
          <StatusBadge status={loan.status} />
        </div>
      </div>

      {/* Loan Summary Strip */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        {[
          { label: 'EMIs Remaining', value: `${loan.remaining_emi} Left` },
          { label: 'Balance Principal', value: formatCurrency(loan.remaining_balance) },
          { label: 'Overdue Status', value: loan.status === 'overdue' ? 'Yes (Overdue)' : 'Normal' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200/80 rounded-xl p-3 text-center">
            <p className="text-[11px] text-slate-400 font-medium mb-1">{s.label}</p>
            <p className="font-bold text-slate-800 amount-display">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Payment Mode Selector */}
      <div>
        <label className="form-label">Select Payment Mode</label>
        <div className="flex gap-2">
          {(['cash', 'upi', 'bank', 'cheque'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPaymentMode(mode)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all uppercase tracking-wider',
                paymentMode === mode
                  ? 'bg-brand-600 text-white border-brand-600 shadow-kpi'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Adjustments */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Late Penalty Charge (₹)"
          type="number"
          value={penalty}
          onChange={(e) => setPenalty(e.target.value)}
          placeholder="0"
        />
        <Input
          label="Discount Concession (₹)"
          type="number"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          placeholder="0"
        />
      </div>

      {/* Advance / Partial Checkboxes */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={advance} onChange={(e) => setAdvance(e.target.checked)} className="w-4 h-4 rounded accent-brand-600" />
          <span className="text-xs font-semibold text-slate-700">Advance EMI Collection</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} className="w-4 h-4 rounded accent-brand-600" />
          <span className="text-xs font-semibold text-slate-700">Partial Payment</span>
        </label>
      </div>

      {partial && (
        <Input
          label="Partial Amount to Collect (₹)"
          type="number"
          value={partialAmount}
          onChange={(e) => setPartialAmount(e.target.value)}
          placeholder="Enter partial amount"
        />
      )}

      {/* Total Display */}
      <div className="bg-gradient-to-r from-brand-50 to-emerald-50 rounded-2xl p-4 border border-brand-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Collection Amount</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Base EMI + Penalty - Concession</p>
          </div>
          <p className="text-2xl font-extrabold text-brand-600 amount-display">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleCollect} className="bg-emerald-600 hover:bg-emerald-700" loading={loading} disabled={!nextPending}>
          <CheckCircle2 className="h-4 w-4" />
          Confirm Collection
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
      <PageHeader
        title="EMI Collection Desk"
        subtitle="Process daily EMI payments, issue digital receipts, and record penalties."
        action={
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-2xs">
            <Coins className="h-4 w-4 text-brand-600" />
            <span>{formatDate(new Date().toISOString())}</span>
          </div>
        }
      />

      {/* Tab Controls */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/50">
        {(['collection', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-5 py-2 text-xs font-bold rounded-lg capitalize transition-all',
              activeTab === tab ? 'bg-white text-brand-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            {tab === 'collection' ? 'Daily Collection Desk' : 'Collection History & Receipts'}
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
            {/* Search Customer Card */}
            <Card>
              <CardHeader>
                <CardTitle>1. Select Borrower Account</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    className="form-input pl-9.5"
                    placeholder="Search borrower by name, mobile, customer ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-84 overflow-y-auto pr-1">
                  {isCustLoading ? (
                    <div className="text-center py-6 text-slate-400 font-medium">Loading customers...</div>
                  ) : filteredCustomers.map((customer) => {
                    const activeLoans = loans.filter((l) => l.customer_id === customer.id && l.status === 'active')
                    if (activeLoans.length === 0) return null
                    return (
                      <button
                        key={customer.id}
                        onClick={() => { setSelectedCustomer(customer); setSelectedLoan(null) }}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left',
                          selectedCustomer?.id === customer.id
                            ? 'border-brand-300 bg-brand-50/50 shadow-2xs'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <Avatar name={customer.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{customer.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{customer.mobile} · {customer.customer_id}</p>
                          <p className="text-[11px] text-brand-600 font-bold mt-0.5">{activeLoans.length} active loan account{activeLoans.length > 1 ? 's' : ''}</p>
                        </div>
                        <StatusBadge status={customer.status} />
                      </button>
                    )
                  })}
                </div>
              </CardBody>
            </Card>

            {/* Select Loan & Collect Card */}
            <Card>
              <CardHeader>
                <CardTitle>{selectedCustomer ? `2. Choose ${selectedCustomer.name}'s Loan Account` : '2. Select Loan Account'}</CardTitle>
              </CardHeader>
              <CardBody>
                {!selectedCustomer ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
                    <Search className="h-10 w-10 mb-3 opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-600">Select a borrower from the left panel</p>
                    <p className="text-[11px] text-slate-400 mt-1">Their active loan accounts will populate here for collection</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerLoans.filter((l) => l.status !== 'closed').map((loan) => (
                      <div
                        key={loan.id}
                        className={cn(
                          'rounded-2xl border p-4 transition-all cursor-pointer',
                          selectedLoan?.id === loan.id
                            ? 'border-brand-300 bg-brand-50/50 shadow-2xs'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        )}
                        onClick={() => setSelectedLoan(loan)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-xs font-extrabold text-slate-900 font-mono">{loan.loan_number}</p>
                            <p className="text-[11px] text-slate-400 capitalize font-medium">{loan.loan_type} Loan Account</p>
                          </div>
                          <StatusBadge status={loan.status} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><p className="text-slate-400 font-medium">Monthly EMI</p><p className="font-bold text-emerald-600 amount-display">{formatCurrency(loan.emi_amount)}</p></div>
                          <div><p className="text-slate-400 font-medium">Remaining</p><p className="font-bold text-slate-800">{loan.remaining_emi} EMIs</p></div>
                          <div><p className="text-slate-400 font-medium">Balance Principal</p><p className="font-bold amount-display text-slate-800">{formatCurrency(loan.remaining_balance)}</p></div>
                        </div>
                        {loan.status === 'overdue' && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 font-bold bg-red-50 p-2 rounded-xl border border-red-100">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Overdue EMIs — Late penalty applies</span>
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
                          className="w-full mt-3 py-3 text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                          onClick={() => setShowPaymentModal(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Collect EMI Payment — {formatCurrency(selectedLoan.emi_amount)}
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
                <CardTitle>Collection History Log</CardTitle>
                <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export Receipts</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      {['Receipt No.', 'Customer Name', 'Loan No.', 'EMI#', 'Collection Date', 'Amount Paid', 'Penalty', 'Payment Mode', 'Status'].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isPaymentsLoading ? (
                      <tr><td colSpan={9} className="text-center py-6 text-slate-400">Loading collection records...</td></tr>
                    ) : payments.map((p) => {
                      const customer = customers.find((c) => c.id === p.customer_id)
                      const loan = loans.find((l) => l.id === p.loan_id)
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="text-xs font-mono text-brand-600 font-bold">{p.receipt_number}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <Avatar name={customer?.name ?? ''} size="sm" />
                              <span className="text-xs font-bold text-slate-800">{customer?.name ?? '—'}</span>
                            </div>
                          </td>
                          <td className="text-xs text-slate-500 font-mono">{loan?.loan_number ?? '—'}</td>
                          <td className="text-xs font-bold text-slate-700">#{p.emi_number}</td>
                          <td className="text-xs text-slate-500">{formatDate(p.payment_date)}</td>
                          <td className="text-xs font-bold text-emerald-600 amount-display">{formatCurrency(p.amount_paid)}</td>
                          <td className="text-xs text-red-600 amount-display font-semibold">{p.penalty > 0 ? formatCurrency(p.penalty) : '—'}</td>
                          <td>
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                              p.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              p.payment_mode === 'upi' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                              'bg-blue-50 text-blue-700 border border-blue-100'
                            )}>
                              {p.payment_mode}
                            </span>
                          </td>
                          <td><StatusBadge status={p.partial ? 'partial' : 'paid'} /></td>
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
          title="Collect EMI Payment Receipt"
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
