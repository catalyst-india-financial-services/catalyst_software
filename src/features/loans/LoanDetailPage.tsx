import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, WalletCards, Download, FileText, CheckCircle2, Calendar, Percent, TrendingDown, Building2, User } from 'lucide-react'
import { useLoan, useCustomer, useLoanSchedule } from '@/hooks/useDb'
import { Button, Card, CardHeader, CardTitle, CardBody, StatusBadge, Badge } from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'

export default function LoanDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: loan, isLoading: isLoanLoading } = useLoan(id)
  const { data: customer, isLoading: isCustomerLoading } = useCustomer(loan?.customer_id)
  const { data: emiSchedule = [], isLoading: isScheduleLoading } = useLoanSchedule(id)

  if (isLoanLoading || isCustomerLoading || isScheduleLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!loan || !customer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
          <Building2 className="h-7 w-7" />
        </div>
        <p className="text-sm font-bold text-slate-700">Loan record not found</p>
        <p className="text-xs text-slate-400 mt-1">The requested loan or customer does not exist.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/loans')}>
          <ArrowLeft className="h-4 w-4" /> Back to Loans
        </Button>
      </div>
    )
  }

  const paidCount = emiSchedule.filter(e => e.status === 'paid').length
  const progress = emiSchedule.length > 0 ? Math.round((paidCount / emiSchedule.length) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/loans')}
        className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-wider"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Loans
      </button>

      {/* Loan Overview Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          {/* Hero stripe */}
          <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 px-6 py-5">
            <div className="flex flex-col lg:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-extrabold text-white font-mono tracking-tight">{loan.loan_number}</h1>
                  <span className="px-2.5 py-0.5 bg-white/20 text-white/90 text-xs font-bold rounded-full uppercase">{loan.loan_type}</span>
                  <StatusBadge status={loan.status} />
                </div>
                <p className="text-xs text-brand-200 mt-1 flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Borrower:&nbsp;
                  <button
                    className="font-bold text-white hover:underline"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    {customer.name}
                  </button>
                  &nbsp;·&nbsp;{customer.mobile}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                  <FileText className="h-4 w-4" /> Agreement
                </Button>
                <Button size="sm" className="bg-white text-brand-700 hover:bg-brand-50 font-bold" onClick={() => navigate('/emi-collection')}>
                  <WalletCards className="h-4 w-4" /> Collect EMI
                </Button>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-slate-100 border-t border-slate-100">
            {[
              { label: 'Principal', value: formatCurrency(loan.loan_amount), sub: 'Disbursed amount', color: 'text-slate-900' },
              { label: 'Monthly EMI', value: formatCurrency(loan.emi_amount), sub: `${loan.duration_months} months tenure`, color: 'text-brand-600' },
              { label: 'Interest Rate', value: `${loan.interest_rate}%`, sub: loan.interest_type ?? 'per annum', color: 'text-amber-600' },
              { label: 'Outstanding', value: formatCurrency(loan.remaining_balance), sub: 'Remaining balance', color: 'text-red-600' },
            ].map((m, i) => (
              <div key={i} className="p-5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{m.label}</p>
                <p className={cn('text-xl font-extrabold amount-display', m.color)}>{m.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="px-6 pb-5 border-t border-slate-50 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-600">Repayment Progress</span>
              <span className="text-xs font-extrabold text-brand-600">{paidCount} / {emiSchedule.length} EMIs paid ({progress}%)</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* EMI Schedule Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle>Amortization Schedule — {loan.duration_months} Months</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" /> Export Schedule
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {['EMI #', 'Due Date', 'EMI Amount', 'Principal', 'Interest', 'Balance', 'Status'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emiSchedule.map((item, idx) => {
                  const isPaid = item.status === 'paid'
                  const isOverdue = item.status === 'overdue'
                  return (
                    <motion.tr
                      key={item.emi_number}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={cn(
                        'transition-colors hover:bg-slate-50/60',
                        isPaid && 'bg-emerald-50/40',
                        isOverdue && 'bg-red-50/40'
                      )}
                    >
                      <td>
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-700">#{item.emi_number}</span>
                          {isPaid && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                        </span>
                      </td>
                      <td className="text-xs font-medium text-slate-600">{formatDate(item.due_date)}</td>
                      <td className="text-xs font-extrabold text-slate-900 amount-display">{formatCurrency(item.emi_amount)}</td>
                      <td className="text-xs font-bold text-brand-600 amount-display">{formatCurrency(item.principal)}</td>
                      <td className="text-xs text-amber-600 font-bold amount-display">{formatCurrency(item.interest)}</td>
                      <td className="text-xs font-bold text-slate-700 amount-display">{formatCurrency(item.outstanding_balance)}</td>
                      <td><StatusBadge status={item.status} /></td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
