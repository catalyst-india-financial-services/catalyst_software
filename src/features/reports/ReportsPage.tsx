import { useState } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download, FileText, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardBody, StatsCard, StatusBadge } from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'
import { useDashboardData, usePayments, useCustomers, useLoans, useIncome, useExpenses } from '@/hooks/useDb'
import dayjs from 'dayjs'

const reportTabs = [
  { id: 'collection', label: 'Collection' },
  { id: 'loans', label: 'Loans' },
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'pnl', label: 'P&L' },
  { id: 'cashbook', label: 'Cash Book' },
]

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useLocalStorage<string>('reports_active_tab', 'collection')
  const [period, setPeriod] = useLocalStorage<'daily' | 'monthly' | 'yearly'>('reports_period', 'monthly')

  const { data: dashboardData, isLoading: isDashLoading } = useDashboardData()
  const { data: payments = [], isLoading: isPaymentsLoading } = usePayments()
  const { data: customers = [], isLoading: isCustLoading } = useCustomers()
  const { data: loans = [], isLoading: isLoansLoading } = useLoans()
  const { data: incomeList = [], isLoading: isIncomeLoading } = useIncome()
  const { data: expenseList = [], isLoading: isExpenseLoading } = useExpenses()

  if (isDashLoading || isPaymentsLoading || isCustLoading || isLoansLoading || isIncomeLoading || isExpenseLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  const incomeExpenseChart = dashboardData?.incomeExpenseChart || []
  const collectionChart = dashboardData?.collectionChart || []

  // Dynamic P&L calculation
  const interestIncome = incomeList.filter(i => i.category === 'interest').reduce((s, i) => s + Number(i.amount), 0)
  const processingFee = incomeList.filter(i => i.category === 'processing_fee').reduce((s, i) => s + Number(i.amount), 0)
  const penaltyCollection = incomeList.filter(i => i.category === 'penalty').reduce((s, i) => s + Number(i.amount), 0)
  const otherIncome = incomeList.filter(i => i.category === 'other').reduce((s, i) => s + Number(i.amount), 0)

  const rentExpense = expenseList.filter(e => e.category === 'rent').reduce((s, e) => s + Number(e.amount), 0)
  const salaryExpense = expenseList.filter(e => e.category === 'salary').reduce((s, e) => s + Number(e.amount), 0)
  const fuelExpense = expenseList.filter(e => e.category === 'fuel').reduce((s, e) => s + Number(e.amount), 0)
  const electricityExpense = expenseList.filter(e => e.category === 'electricity').reduce((s, e) => s + Number(e.amount), 0)
  const internetExpense = expenseList.filter(e => e.category === 'internet').reduce((s, e) => s + Number(e.amount), 0)
  const maintenanceExpense = expenseList.filter(e => e.category === 'maintenance').reduce((s, e) => s + Number(e.amount), 0)
  const otherExpense = expenseList.filter(e => e.category === 'other').reduce((s, e) => s + Number(e.amount), 0)

  const computedTotalIncome = interestIncome + processingFee + penaltyCollection + otherIncome
  const computedTotalExpense = rentExpense + salaryExpense + fuelExpense + electricityExpense + internetExpense + maintenanceExpense + otherExpense
  const computedNetProfit = computedTotalIncome - computedTotalExpense

  return (
    <div className="p-6 space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Comprehensive financial analytics and reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export Excel</Button>
          <Button variant="outline" size="sm"><FileText className="h-4 w-4" /> Export PDF</Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['daily', 'monthly', 'yearly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-all',
                period === p ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <input type="month" defaultValue="2025-07" className="form-input w-auto py-1.5 text-sm" />
      </div>

      {/* Report Navigation */}
      <div className="flex gap-1 border-b border-slate-200">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
              activeReport === tab.id
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeReport}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
        >
          {activeReport === 'pnl' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <StatsCard title="Total Income" value={formatCurrency(computedTotalIncome)} icon={<TrendingUp className="h-5 w-5" />} bgClass="kpi-green" iconBg="bg-emerald-500" />
                <StatsCard title="Total Expense" value={formatCurrency(computedTotalExpense)} icon={<TrendingDown className="h-5 w-5" />} bgClass="kpi-red" iconBg="bg-red-500" />
                <StatsCard title="Net Profit" value={formatCurrency(computedNetProfit)} icon={<DollarSign className="h-5 w-5" />} bgClass="kpi-blue" iconBg="bg-brand-500" trend={{ value: 11.2 }} />
              </div>

              <Card>
                <CardHeader><CardTitle>Profit & Loss Statement — {dayjs().format('MMM YYYY')}</CardTitle></CardHeader>
                <CardBody>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-2 text-left font-semibold text-slate-600">Description</th>
                        <th className="py-2 text-right font-semibold text-slate-600">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 bg-emerald-50/30">
                        <td className="py-2.5 font-bold text-emerald-700 uppercase text-xs tracking-wider" colSpan={2}>INCOME</td>
                      </tr>
                      {[
                        ['Interest Income', interestIncome],
                        ['Processing Fee', processingFee],
                        ['Penalty Collection', penaltyCollection],
                        ['Other Income', otherIncome]
                      ].map(([k, v]) => (
                        <tr key={k as string} className="border-b border-slate-50">
                          <td className="py-2 pl-4 text-slate-700">{k}</td>
                          <td className="py-2 text-right font-semibold text-slate-800 amount-display">{formatCurrency(v as number)}</td>
                        </tr>
                      ))}
                      <tr className="border-b-2 border-emerald-200 bg-emerald-50">
                        <td className="py-2.5 font-bold text-emerald-800">Total Income</td>
                        <td className="py-2.5 text-right font-bold text-emerald-800 amount-display">{formatCurrency(computedTotalIncome)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-red-50/30">
                        <td className="py-2.5 font-bold text-red-700 uppercase text-xs tracking-wider" colSpan={2}>EXPENSES</td>
                      </tr>
                      {[
                        ['Office Rent', rentExpense],
                        ['Salaries', salaryExpense],
                        ['Fuel & Transport', fuelExpense],
                        ['Electricity', electricityExpense],
                        ['Internet & Communication', internetExpense],
                        ['Maintenance', maintenanceExpense],
                        ['Other Expenses', otherExpense]
                      ].map(([k, v]) => (
                        <tr key={k as string} className="border-b border-slate-50">
                          <td className="py-2 pl-4 text-slate-700">{k}</td>
                          <td className="py-2 text-right font-semibold text-slate-800 amount-display">{formatCurrency(v as number)}</td>
                        </tr>
                      ))}
                      <tr className="border-b-2 border-red-200 bg-red-50">
                        <td className="py-2.5 font-bold text-red-800">Total Expenses</td>
                        <td className="py-2.5 text-right font-bold text-red-800 amount-display">{formatCurrency(computedTotalExpense)}</td>
                      </tr>
                      <tr className="bg-brand-50">
                        <td className="py-3 font-bold text-brand-800 text-base">NET PROFIT</td>
                        <td className="py-3 text-right font-bold text-brand-800 text-xl amount-display">{formatCurrency(computedNetProfit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            </>
          )}

          {activeReport === 'collection' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Today's Collection", value: formatCurrency(dashboardData?.stats?.todays_collection || 0), color: 'text-brand-600' },
                  { label: 'This Month', value: formatCurrency(computedTotalIncome), color: 'text-emerald-600' },
                  { label: 'Pending', value: `${dashboardData?.stats?.pending_emi || 0} EMIs`, color: 'text-amber-600' },
                  { label: 'Collection Rate', value: `${dashboardData?.stats?.collection_rate || 100}%`, color: 'text-violet-600' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
                    <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                    <p className={cn('text-xl font-bold amount-display', s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle>Monthly Collection Chart</CardTitle></CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={collectionChart}>
                      <defs>
                        <linearGradient id="collectGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" name="Collection" stroke="#38BDF8" fill="url(#collectGrad)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="target" name="Target" stroke="#22C55E" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <Card>
                <CardHeader><CardTitle>Daily Collection Details</CardTitle></CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Receipt No.', 'Customer', 'Loan No.', 'EMI #', 'Date', 'Mode', 'Amount'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 10).map((p) => {
                        const customer = customers.find((c) => c.id === p.customer_id)
                        const loan = loans.find((l) => l.id === p.loan_id)
                        return (
                          <tr key={p.id} className="border-b border-slate-50 hover:bg-blue-50/20">
                            <td className="px-4 py-3 text-xs font-mono text-brand-600 font-semibold">{p.receipt_number}</td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{customer?.name ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{loan?.loan_number ?? '—'}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">#{p.emi_number}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{formatDate(p.payment_date)}</td>
                            <td className="px-4 py-3">
                              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase',
                                p.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700' :
                                p.payment_mode === 'upi' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                              )}>{p.payment_mode}</span>
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-emerald-700 amount-display">{formatCurrency(Number(p.amount_paid))}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {(activeReport === 'loans' || activeReport === 'income' || activeReport === 'expenses' || activeReport === 'cashbook') && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{reportTabs.find((t) => t.id === activeReport)?.label} Report</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Excel</Button>
                    <Button variant="outline" size="sm"><FileText className="h-4 w-4" /> PDF</Button>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col items-center py-12 text-slate-400">
                  <FileText className="h-16 w-16 mb-3 opacity-20" />
                  <p className="text-sm font-semibold text-slate-500">Report Ready</p>
                  <p className="text-xs text-slate-400 mt-1">Select date range and export to view full {activeReport} report</p>
                  <div className="flex gap-3 mt-4">
                    <Button size="sm"><Download className="h-4 w-4" /> Download Excel</Button>
                    <Button variant="outline" size="sm"><FileText className="h-4 w-4" /> Download PDF</Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

