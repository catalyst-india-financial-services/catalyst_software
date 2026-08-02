import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, CreditCard, CheckCircle2, Wallet, Clock, AlertTriangle,
  TrendingUp, DollarSign, TrendingDown, Activity, Target, ArrowUpRight
} from 'lucide-react'
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Avatar, StatusBadge } from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'
import { useDashboardData, usePayments } from '@/hooks/useDb'
import { useLocalStorage } from '@/hooks/useLocalStorage'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const kpiCards = [
  { key: 'total_customers', title: 'Total Customers', icon: <Users className="h-5 w-5" />, bg: 'kpi-blue', iconBg: 'bg-brand-500', trend: { value: 8.2 }, format: (v: number) => v.toString() },
  { key: 'active_loans', title: 'Active Loans', icon: <CreditCard className="h-5 w-5" />, bg: 'kpi-green', iconBg: 'bg-emerald-500', trend: { value: 5.1 }, format: (v: number) => v.toString() },
  { key: 'todays_collection', title: "Today's Collection", icon: <Wallet className="h-5 w-5" />, bg: 'kpi-cyan', iconBg: 'bg-cyan-500', trend: { value: 12.4 }, format: formatCurrency },
  { key: 'pending_emi', title: 'Pending EMI', icon: <Clock className="h-5 w-5" />, bg: 'kpi-orange', iconBg: 'bg-amber-500', trend: { value: -2.1 }, format: (v: number) => v.toString() },
  { key: 'overdue_loans', title: 'Overdue Loans', icon: <AlertTriangle className="h-5 w-5" />, bg: 'kpi-red', iconBg: 'bg-red-500', trend: { value: -4.5 }, format: (v: number) => v.toString() },
  { key: 'interest_earned', title: 'Interest Earned', icon: <TrendingUp className="h-5 w-5" />, bg: 'kpi-green', iconBg: 'bg-emerald-600', trend: { value: 9.8 }, format: formatCurrency },
  { key: 'monthly_income', title: 'Monthly Income', icon: <DollarSign className="h-5 w-5" />, bg: 'kpi-blue', iconBg: 'bg-brand-600', trend: { value: 7.3 }, format: formatCurrency },
  { key: 'monthly_expense', title: 'Monthly Expense', icon: <TrendingDown className="h-5 w-5" />, bg: 'kpi-orange', iconBg: 'bg-orange-500', trend: { value: 2.1 }, format: formatCurrency },
  { key: 'net_profit', title: 'Net Profit', icon: <Activity className="h-5 w-5" />, bg: 'kpi-purple', iconBg: 'bg-violet-500', trend: { value: 11.2 }, format: formatCurrency },
  { key: 'collection_rate', title: 'Collection Rate', icon: <Target className="h-5 w-5" />, bg: 'kpi-green', iconBg: 'bg-teal-500', trend: { value: 1.4 }, format: (v: number) => `${v}%` },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [collectionPeriod, setCollectionPeriod] = useLocalStorage<'weekly' | 'monthly' | 'yearly'>('dashboard_collection_period', 'monthly')
  const { data: dashboardData, isLoading } = useDashboardData()
  const { data: payments = [] } = usePayments()

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  const stats = dashboardData?.stats || {
    total_customers: 0,
    active_loans: 0,
    closed_loans: 0,
    todays_collection: 0,
    pending_emi: 0,
    overdue_loans: 0,
    interest_earned: 0,
    monthly_income: 0,
    monthly_expense: 0,
    net_profit: 0,
    collection_rate: 100,
  }

  const collectionChart = dashboardData?.collectionChart || []
  const loanDistributionChart = dashboardData?.loanDistributionChart || []
  const incomeExpenseChart = dashboardData?.incomeExpenseChart || []
  const upcomingDue = dashboardData?.upcomingDue || []
  const activityLog = dashboardData?.activityLog || []
  const latestPayments = payments.slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening with your finance portfolio.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Activity className="h-4 w-4 text-brand-500" />
          <span className="font-medium text-slate-700">Live Data</span>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-soft" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        {kpiCards.map((card) => {
          const value = stats[card.key as keyof typeof stats] as number
          return (
            <motion.div key={card.key} variants={item}>
              <StatsCard
                title={card.title}
                value={card.format(value)}
                icon={card.icon}
                trend={card.trend}
                bgClass={card.bg}
                iconBg={card.iconBg}
              />
            </motion.div>
          )
        })}
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Monthly Collection</CardTitle>
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCollectionPeriod(p)}
                      className={cn(
                        'px-3 py-1 text-xs font-medium rounded-md transition-all capitalize',
                        collectionPeriod === p ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={collectionChart}>
                  <defs>
                    <linearGradient id="collectionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" name="Collection" stroke="#38BDF8" fill="url(#collectionGrad)" strokeWidth={2.5} dot={{ fill: '#38BDF8', r: 4 }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="target" name="Target" stroke="#22C55E" fill="url(#targetGrad)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </motion.div>

        {/* Loan Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Loan Distribution</CardTitle>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={loanDistributionChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {loanDistributionChart.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {loanDistributionChart.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-slate-600 truncate">{entry.name}</span>
                    <span className="font-semibold text-slate-800 ml-auto">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Income vs Expense</CardTitle>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded-full bg-brand-500" /><span className="text-slate-500">Income</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded-full bg-red-400" /><span className="text-slate-500">Expense</span></div>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={incomeExpenseChart} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="Income" fill="#38BDF8" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" name="Expense" fill="#FCA5A5" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <span className="text-xs text-brand-600 cursor-pointer hover:underline">View all</span>
              </div>
            </CardHeader>
            <CardBody className="px-4 py-3">
              <div className="space-y-3">
                {activityLog.map((log, idx) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                      log.type === 'success' ? 'bg-emerald-500' :
                      log.type === 'warning' ? 'bg-amber-500' : 'bg-brand-500'
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800">{log.action}</p>
                      <p className="text-xs text-slate-500 truncate">{log.details}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(log.time, 'DD MMM, hh:mm A')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Due */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upcoming & Overdue</CardTitle>
                <span className="text-xs text-brand-600 cursor-pointer hover:underline">View all</span>
              </div>
            </CardHeader>
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-y border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Loan</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">EMI</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingDue.map((due) => (
                    <tr key={due.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={due.name} size="sm" />
                          <span className="font-medium text-slate-800 text-xs">{due.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{due.loan_number}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-800 amount-display">{formatCurrency(due.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        {due.days_overdue > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700">
                            <AlertTriangle className="h-3 w-3" />
                            {due.days_overdue}d overdue
                          </span>
                        ) : due.days_overdue === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">Due Today</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                            in {Math.abs(due.days_overdue)} days
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Latest Payments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Latest Payments</CardTitle>
                <span className="text-xs text-brand-600 cursor-pointer hover:underline">View all</span>
              </div>
            </CardHeader>
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-y border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {latestPayments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs font-semibold text-brand-600">{p.receipt_number}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.payment_date)}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-800 amount-display">{formatCurrency(p.amount_paid)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase',
                            p.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700' :
                            p.payment_mode === 'upi' ? 'bg-purple-50 text-purple-700' :
                            'bg-blue-50 text-blue-700'
                          )}>
                            {p.payment_mode}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
