import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Download, FileText } from 'lucide-react'
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  if (!loan || !customer) {
    return <div className="p-6 text-center text-slate-500">Loan or Customer not found.</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/loans')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Loans
      </button>

      {/* Loan Overview Header */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{loan.loan_number}</h1>
              <Badge variant="outline" className="uppercase">{loan.loan_type} loan</Badge>
              <StatusBadge status={loan.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Customer: <span className="font-semibold text-slate-800 cursor-pointer hover:underline" onClick={() => navigate(`/customers/${customer.id}`)}>{customer.name}</span> ({customer.mobile})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4" /> Agreement PDF
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('/emi-collection')}>
              <CreditCard className="h-4 w-4" /> Collect EMI
            </Button>
          </div>
        </div>

        {/* Loan Financial Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-sm">
          <div className="bg-slate-50 p-3 rounded-xl">
            <p className="text-xs text-slate-400">Principal Disbursed</p>
            <p className="text-lg font-bold text-slate-900 amount-display">{formatCurrency(loan.loan_amount)}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <p className="text-xs text-slate-400">Monthly EMI</p>
            <p className="text-lg font-bold text-brand-600 amount-display">{formatCurrency(loan.emi_amount)}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <p className="text-xs text-slate-400">Interest Rate</p>
            <p className="text-lg font-bold text-slate-900">{loan.interest_rate}% <span className="text-xs text-slate-400 font-normal">({loan.interest_type})</span></p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <p className="text-xs text-slate-400">Outstanding Balance</p>
            <p className="text-lg font-bold text-red-600 amount-display">{formatCurrency(loan.remaining_balance)}</p>
          </div>
        </div>
      </Card>

      {/* EMI Repayment Schedule */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>EMI Repayment Schedule ({loan.duration_months} Months)</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" /> Export Schedule
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['#', 'Due Date', 'EMI Amount', 'Principal', 'Interest', 'Outstanding Balance', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emiSchedule.map((item, idx) => {
                const isPaid = item.status === 'paid'
                const isOverdue = item.status === 'overdue'

                return (
                  <tr key={item.emi_number} className={cn('border-b border-slate-50', isPaid && 'bg-emerald-50/20')}>
                    <td className="px-4 py-3 font-semibold text-slate-600">#{item.emi_number}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.due_date)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 amount-display">{formatCurrency(item.emi_amount)}</td>
                    <td className="px-4 py-3 text-slate-600 amount-display">{formatCurrency(item.principal)}</td>
                    <td className="px-4 py-3 text-slate-500 amount-display">{formatCurrency(item.interest)}</td>
                    <td className="px-4 py-3 text-slate-700 amount-display">{formatCurrency(item.outstanding_balance)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
