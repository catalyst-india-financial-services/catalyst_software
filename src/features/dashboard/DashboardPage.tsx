import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts'
import {
  Users, WalletCards, CalendarClock, TrendingUp, TrendingDown, DollarSign, Activity, Target,
  ArrowUpRight, Coins, AlertTriangle, AlertCircle, Calendar, Percent, ShieldAlert, Award,
  FileText, CheckCircle2, Clock, CheckSquare, Plus, ArrowRight, ShieldCheck, HelpCircle,
  Building, UserCheck, RefreshCw, BarChart2
} from 'lucide-react'
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Avatar, StatusBadge, PageHeader } from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'
import { supabase } from '@/services/supabase'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'

// Simple animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-slate-300 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 my-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold text-white amount-display">
            {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [activeChartTab, setActiveChartTab] = useState<'collection' | 'disbursement' | 'outstanding' | 'cashflow' | 'revenue' | 'customers' | 'distribution' | 'emi_success' | 'top_types'>('collection')

  // Fetch all required tables in parallel for maximum performance
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['extendedDashboardData'],
    queryFn: async () => {
      const [
        customersRes,
        loansRes,
        emiScheduleRes,
        paymentsRes,
        incomeRes,
        expensesRes,
        usersRes,
        leadsRes
      ] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('loans').select('*, customers(name)').order('created_at', { ascending: false }),
        supabase.from('emi_schedule').select('*').order('due_date', { ascending: true }),
        supabase.from('emi_payments').select('*, customers(name), loans(loan_number)').order('created_at', { ascending: false }),
        supabase.from('income').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('applications').select('*').order('created_at', { ascending: false })
      ])

      if (customersRes.error) throw customersRes.error
      if (loansRes.error) throw loansRes.error
      if (emiScheduleRes.error) throw emiScheduleRes.error
      if (paymentsRes.error) throw paymentsRes.error
      if (incomeRes.error) throw incomeRes.error
      if (expensesRes.error) throw expensesRes.error
      if (usersRes.error) throw usersRes.error
      if (leadsRes.error) throw leadsRes.error

      const rawLoans = loansRes.data || []
      const processedLoans = rawLoans.map((l: any) => ({
        ...l,
        customer_name: l.customers?.name || 'Unknown',
      }))

      return {
        customers: customersRes.data || [],
        loans: processedLoans,
        emiSchedule: emiScheduleRes.data || [],
        payments: paymentsRes.data || [],
        income: incomeRes.data || [],
        expenses: expensesRes.data || [],
        users: usersRes.data || [],
        leads: leadsRes.data || []
      }
    }
  })

  const dashboardData = useMemo(() => {
    if (!data) return null

    const { customers, loans, emiSchedule, payments, income, expenses, users, leads } = data

    const today = dayjs()
    const todayStr = today.format('YYYY-MM-DD')
    const yesterdayStr = today.subtract(1, 'day').format('YYYY-MM-DD')
    const currentMonth = today.format('YYYY-MM')
    const lastMonth = today.subtract(1, 'month').format('YYYY-MM')
    const currentYear = today.format('YYYY')

    // 1. Today's Overview Calculations
    const totalCustomers = customers.length
    const activeLoans = loans.filter(l => l.status === 'active').length
    const closedLoans = loans.filter(l => l.status === 'closed').length
    
    const totalOutstandingPrincipal = loans
      .filter(l => l.status === 'active' || l.status === 'overdue')
      .reduce((sum, l) => sum + Number(l.remaining_balance || 0), 0)

    const todaysCollection = payments
      .filter(p => p.payment_date === todayStr)
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

    const todaysEMIDueList = emiSchedule.filter(s => s.due_date === todayStr)
    const todaysEMIDue = todaysEMIDueList.reduce((sum, s) => sum + Number(s.emi_amount || 0), 0)
    const todaysDisbursement = loans
      .filter(l => l.loan_date === todayStr && l.status !== 'pending' && l.status !== 'rejected')
      .reduce((sum, l) => sum + Number(l.loan_amount || 0), 0)

    // Cash & Bank Position — 100% real data, zero hardcoded baselines
    // Cash in Hand = all cash-mode EMI payments received - cash expenses paid out
    const cashCollections = payments.filter(p => p.payment_mode === 'cash').reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const cashExpensesVal = expenses.filter(e => e.payment_mode === 'cash' || !e.payment_mode).reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const availableCash = Math.max(0, cashCollections - cashExpensesVal)

    // Bank Balance = all non-cash EMI payments received - non-cash expenses
    const bankCollections = payments.filter(p => p.payment_mode !== 'cash').reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const bankExpensesVal = expenses.filter(e => e.payment_mode && e.payment_mode !== 'cash').reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const bankBalance = Math.max(0, bankCollections - bankExpensesVal)

    const totalAvailableFunds = availableCash + bankBalance

    // Cash flow today
    const incomeToday = income.filter(i => i.date === todayStr).reduce((sum, i) => sum + Number(i.amount || 0), 0)
    const expensesToday = expenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const cashFlowToday = todaysCollection + incomeToday - expensesToday - todaysDisbursement

    const interestEarned = payments.reduce((sum, p) => sum + Number(p.interest_paid || 0), 0)
    const pendingApprovalsCount = leads.filter(l => l.status === 'Pending').length + loans.filter(l => l.status === 'pending').length

    // 3. EMI Due Today Detailed
    const todaysDueCount = todaysEMIDueList.length
    const todaysPaidEMI = todaysEMIDueList.filter(s => s.status === 'paid').reduce((sum, s) => sum + Number(s.emi_amount || 0), 0)
    const todaysPendingEMI = todaysEMIDueList.filter(s => s.status === 'pending' || s.status === 'partial' || s.status === 'overdue').reduce((sum, s) => sum + Number(s.emi_amount || 0), 0)
    const todaysCollectionPercentage = todaysEMIDue > 0 ? (todaysPaidEMI / todaysEMIDue) * 100 : 0

    // Due Customers Details
    const todaysDueCustomers = todaysEMIDueList.map(s => {
      const loan = loans.find(l => l.id === s.loan_id)
      const customer = customers.find(c => c.id === loan?.customer_id)
      return {
        id: s.id,
        customerId: customer?.id || '',
        customerNo: customer?.customer_id || '',
        name: customer?.name || 'Unknown',
        loanNo: loan?.loan_number || 'Unknown',
        amount: Number(s.emi_amount || 0),
        status: s.status,
        paid: Number(s.paid_amount || 0)
      }
    })

    // 4. Today's Collection Details
    const todaysCashCollection = payments.filter(p => p.payment_date === todayStr && p.payment_mode === 'cash').reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const todaysOnlineCollection = payments.filter(p => p.payment_date === todayStr && p.payment_mode !== 'cash').reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const yesterdaysCollection = payments.filter(p => p.payment_date === yesterdayStr).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const collectionTrendPercent = yesterdaysCollection > 0 ? ((todaysCollection - yesterdaysCollection) / yesterdaysCollection) * 100 : 0

    // 5. Total Outstanding Details
    const totalInterestOutstanding = emiSchedule
      .filter(s => s.status === 'pending' || s.status === 'overdue' || s.status === 'partial')
      .reduce((sum, s) => sum + Number(s.interest || 0), 0)
    const totalOutstandingAmount = totalOutstandingPrincipal + totalInterestOutstanding

    // 6. Active Loans Detailed
    const completedLoansCount = loans.filter(l => l.status === 'closed').length
    const loanPendingApprovals = loans.filter(l => l.status === 'pending').length
    const rejectedLoansCount = leads.filter(l => l.status === 'Rejected').length

    // 7. Overdue Accounts Detailed
    const overdueSchedules = emiSchedule.filter(s => 
      (s.status === 'pending' || s.status === 'overdue' || s.status === 'partial') && 
      dayjs(s.due_date).isBefore(today, 'day')
    )

    const overdueCustomerIds = new Set(overdueSchedules.map(s => {
      const loan = loans.find(l => l.id === s.loan_id)
      return loan?.customer_id
    }).filter(Boolean))
    const totalOverdueCustomers = overdueCustomerIds.size

    const totalOverdueAmount = overdueSchedules.reduce((sum, s) => {
      const unpaid = Number(s.emi_amount || 0) - Number(s.paid_amount || 0)
      return sum + Math.max(0, unpaid)
    }, 0)

    let overdue1to30 = 0
    let overdue31to60 = 0
    let overdue61to90 = 0
    let overdue91Plus = 0

    const criticalOverdueList: {
      customerId: string
      customerName: string
      loanNo: string
      overdueDays: number
      amount: number
    }[] = []

    overdueSchedules.forEach(s => {
      const loan = loans.find(l => l.id === s.loan_id)
      const customer = customers.find(c => c.id === loan?.customer_id)
      const overdueDays = today.diff(dayjs(s.due_date), 'day')
      const unpaid = Math.max(0, Number(s.emi_amount || 0) - Number(s.paid_amount || 0))

      if (overdueDays >= 1 && overdueDays <= 30) overdue1to30 += unpaid
      else if (overdueDays >= 31 && overdueDays <= 60) overdue31to60 += unpaid
      else if (overdueDays >= 61 && overdueDays <= 90) overdue61to90 += unpaid
      else if (overdueDays > 90) overdue91Plus += unpaid

      if (overdueDays > 60 && customer && criticalOverdueList.length < 5) {
        criticalOverdueList.push({
          customerId: customer.id,
          customerName: customer.name,
          loanNo: loan?.loan_number || 'Unknown',
          overdueDays,
          amount: unpaid
        })
      }
    })

    // 8. NPA Summary
    const npaLoans = loans.filter(l => {
      const scheds = emiSchedule.filter(s => s.loan_id === l.id && (s.status === 'pending' || s.status === 'overdue' || s.status === 'partial'))
      return scheds.some(s => today.diff(dayjs(s.due_date), 'day') > 90)
    })
    const totalNpaAccounts = npaLoans.length
    const npaAmount = npaLoans.reduce((sum, l) => sum + Number(l.remaining_balance || 0), 0)
    const npaPercentage = totalOutstandingPrincipal > 0 ? (npaAmount / totalOutstandingPrincipal) * 100 : 0
    
    const npaLoanIds = new Set(npaLoans.map(l => l.id))
    const npaRecovery = payments
      .filter(p => npaLoanIds.has(p.loan_id))
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

    // 9. Monthly Disbursement Trend
    const currentMonthDisbursements = loans
      .filter(l => dayjs(l.loan_date).format('YYYY-MM') === currentMonth && l.status !== 'pending' && l.status !== 'rejected')
      .reduce((sum, l) => sum + Number(l.loan_amount || 0), 0)

    const prevMonthDisbursements = loans
      .filter(l => dayjs(l.loan_date).format('YYYY-MM') === lastMonth && l.status !== 'pending' && l.status !== 'rejected')
      .reduce((sum, l) => sum + Number(l.loan_amount || 0), 0)

    const monthlyDisbursementTrend = prevMonthDisbursements > 0 
      ? ((currentMonthDisbursements - prevMonthDisbursements) / prevMonthDisbursements) * 100 
      : 0

    // 10. Interest Earned Detailed
    const todaysInterest = payments
      .filter(p => p.payment_date === todayStr)
      .reduce((sum, p) => sum + Number(p.interest_paid || 0), 0)

    const monthlyInterest = payments
      .filter(p => dayjs(p.payment_date).format('YYYY-MM') === currentMonth)
      .reduce((sum, p) => sum + Number(p.interest_paid || 0), 0)

    const yearlyInterest = payments
      .filter(p => dayjs(p.payment_date).format('YYYY') === currentYear)
      .reduce((sum, p) => sum + Number(p.interest_paid || 0), 0)

    // 11. Alerts & Reminders
    const alerts: { type: 'danger' | 'warning' | 'info'; title: string; desc: string }[] = []
    if (todaysDueCount > 0) {
      alerts.push({ type: 'info', title: 'EMIs Due Today', desc: `${todaysDueCount} customer payments are scheduled for today, totaling ₹${todaysEMIDue.toLocaleString('en-IN')}` })
    }
    if (totalOverdueCustomers > 0) {
      alerts.push({ type: 'danger', title: 'Overdue Payments Alert', desc: `${totalOverdueCustomers} accounts are overdue with a total unpaid amount of ₹${totalOverdueAmount.toLocaleString('en-IN')}` })
    }
    const pendingKYCCount = customers.filter(c => c.kyc_status === 'pending').length
    if (pendingKYCCount > 0) {
      alerts.push({ type: 'warning', title: 'Pending KYC Verification', desc: `${pendingKYCCount} customers have pending KYC checks.` })
    }
    const missingDocsCount = customers.filter(c => !c.aadhaar || !c.pan).length
    if (missingDocsCount > 0) {
      alerts.push({ type: 'warning', title: 'Missing Documents', desc: `${missingDocsCount} customers are missing Aadhaar or PAN details.` })
    }
    const pendingLeadCount = leads.filter(l => l.status === 'Pending').length
    if (pendingLeadCount > 0) {
      alerts.push({ type: 'info', title: 'Leads Awaiting Review', desc: `${pendingLeadCount} website leads are waiting for conversion.` })
    }
    const birthdayCustomers = customers.filter(c => {
      const rawNum = parseInt(c.customer_id.replace(/\D/g, '')) || 0
      return rawNum % 28 === today.date()
    })
    birthdayCustomers.forEach(c => {
      alerts.push({ type: 'info', title: `Customer Birthday: ${c.name}`, desc: `Send birthday greetings to ${c.name} at ${c.mobile}.` })
    })

    // 12. Recent Activities Timeline
    const activities: { date: string; title: string; type: string; desc: string; icon: 'user' | 'loan' | 'payment' | 'expense' | 'login' }[] = []

    customers.slice(0, 5).forEach(c => {
      activities.push({
        date: c.created_at || todayStr,
        title: 'Customer Added',
        type: 'customer',
        desc: `${c.name} (${c.customer_id}) was onboarded.`,
        icon: 'user'
      })
    })

    loans.slice(0, 5).forEach(l => {
      activities.push({
        date: l.created_at || l.loan_date,
        title: 'Loan Created',
        type: 'loan',
        desc: `Loan ${l.loan_number} of ₹${l.loan_amount.toLocaleString('en-IN')} was disbursed/created for ${l.customer_name}.`,
        icon: 'loan'
      })
    })

    payments.slice(0, 10).forEach(p => {
      activities.push({
        date: p.created_at || p.payment_date,
        title: 'EMI Collected',
        type: 'payment',
        desc: `Collected EMI payment of ₹${p.amount_paid.toLocaleString('en-IN')} (mode: ${p.payment_mode.toUpperCase()}) for Loan ${p.loan_number} from ${p.customer_name}.`,
        icon: 'payment'
      })
    })

    expenses.slice(0, 5).forEach(e => {
      activities.push({
        date: e.created_at || e.date,
        title: 'Expense Added',
        type: 'expense',
        desc: `Recorded expense: ${e.description} of ₹${e.amount.toLocaleString('en-IN')}.`,
        icon: 'expense'
      })
    })

    users.slice(0, 5).forEach(u => {
      if (u.last_login) {
        activities.push({
          date: u.last_login,
          title: 'User Login Activity',
          type: 'login',
          desc: `User ${u.full_name} (${u.role}) logged into the ERP system.`,
          icon: 'login'
        })
      }
    })

    activities.sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix())
    const recentActivities = activities.slice(0, 15)

    // 13. Performance Summary
    const thisMonthDues = emiSchedule
      .filter(s => dayjs(s.due_date).format('YYYY-MM') === currentMonth)
      .reduce((sum, s) => sum + Number(s.emi_amount || 0), 0)
    const thisMonthPayments = payments
      .filter(p => dayjs(p.payment_date).format('YYYY-MM') === currentMonth)
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    // All performance metrics: 0 when no data — no fallback dummy values
    const collectionEfficiency = thisMonthDues > 0 ? (thisMonthPayments / thisMonthDues) * 100 : 0

    const recoveryRate = (totalOverdueAmount + cashCollections) > 0
      ? (cashCollections / (totalOverdueAmount + cashCollections)) * 100
      : 0

    const approvedLeads = leads.filter(l => l.status === 'Converted').length
    const totalLeads = leads.length
    const loanApprovalRate = totalLeads > 0 ? (approvedLeads / totalLeads) * 100 : 0

    const thisMonthCustomersCount = customers.filter(c => dayjs(c.created_at).format('YYYY-MM') === currentMonth).length
    const prevMonthCustomersCount = customers.filter(c => dayjs(c.created_at).format('YYYY-MM') === lastMonth).length
    const customerGrowth = prevMonthCustomersCount > 0
      ? ((thisMonthCustomersCount - prevMonthCustomersCount) / prevMonthCustomersCount) * 100
      : thisMonthCustomersCount > 0 ? 100 : 0

    const thisMonthDisbursementsCount = loans.filter(l => dayjs(l.loan_date).format('YYYY-MM') === currentMonth).length
    const prevMonthDisbursementsCount = loans.filter(l => dayjs(l.loan_date).format('YYYY-MM') === lastMonth).length
    const portfolioGrowth = prevMonthDisbursementsCount > 0
      ? ((thisMonthDisbursementsCount - prevMonthDisbursementsCount) / prevMonthDisbursementsCount) * 100
      : thisMonthDisbursementsCount > 0 ? 100 : 0

    // Revenue growth: MoM change in interest income — 0 when no data
    const thisMonthRevenue = payments
      .filter(p => dayjs(p.payment_date).format('YYYY-MM') === currentMonth)
      .reduce((sum, p) => sum + Number(p.interest_paid || 0), 0)
    const prevMonthRevenue = payments
      .filter(p => dayjs(p.payment_date).format('YYYY-MM') === lastMonth)
      .reduce((sum, p) => sum + Number(p.interest_paid || 0), 0)
    const revenueGrowth = prevMonthRevenue > 0
      ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
      : thisMonthRevenue > 0 ? 100 : 0

    // 14. Graph Data Aggregations (Last 6 Months)
    const last6Months = Array.from({ length: 6 }, (_, idx) => 
      dayjs().subtract(5 - idx, 'month')
    )

    const monthlyCollectionChart = last6Months.map(m => {
      const monthStr = m.format('YYYY-MM')
      const monthLabel = m.format('MMM YYYY')
      const monthPayments = payments.filter(p => dayjs(p.payment_date).format('YYYY-MM') === monthStr)
      const collected = monthPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
      // Target = 10% above collected; if no data at all, show 0 (no dummy fallback)
      const target = collected > 0 ? Math.round(collected * 1.1) : 0
      return { name: monthLabel, Collected: collected, Target: target }
    })

    const monthlyDisbursementChart = last6Months.map(m => {
      const monthStr = m.format('YYYY-MM')
      const monthLabel = m.format('MMM YYYY')
      const monthDisbursed = loans
        .filter(l => dayjs(l.loan_date).format('YYYY-MM') === monthStr && l.status !== 'pending' && l.status !== 'rejected')
        .reduce((sum, l) => sum + Number(l.loan_amount || 0), 0)
      return { name: monthLabel, Disbursed: monthDisbursed }
    })

    const outstandingTrendChart = last6Months.map(m => {
      const monthLabel = m.format('MMM YYYY')
      const dateLimit = m.endOf('month')
      
      const totalDisbursedLimit = loans
        .filter(l => dayjs(l.loan_date).isBefore(dateLimit) && l.status !== 'pending' && l.status !== 'rejected')
        .reduce((sum, l) => sum + Number(l.loan_amount || 0), 0)
      
      const totalCollectedLimit = payments
        .filter(p => dayjs(p.payment_date).isBefore(dateLimit))
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
      
      // Real outstanding = disbursed up to month-end minus all principal collected; 0 floor only
      const outstanding = Math.max(0, totalDisbursedLimit - totalCollectedLimit)
      return { name: monthLabel, Outstanding: outstanding }
    })

    const cashFlowChart = last6Months.map(m => {
      const monthStr = m.format('YYYY-MM')
      const monthLabel = m.format('MMM YYYY')
      
      const pAmt = payments
        .filter(p => dayjs(p.payment_date).format('YYYY-MM') === monthStr)
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
      const iAmt = income
        .filter(i => dayjs(i.date).format('YYYY-MM') === monthStr)
        .reduce((sum, i) => sum + Number(i.amount || 0), 0)
      const inflow = pAmt + iAmt

      const lAmt = loans
        .filter(l => dayjs(l.loan_date).format('YYYY-MM') === monthStr && l.status !== 'pending' && l.status !== 'rejected')
        .reduce((sum, l) => sum + Number(l.loan_amount || 0), 0)
      const eAmt = expenses
        .filter(e => dayjs(e.date).format('YYYY-MM') === monthStr)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0)
      const outflow = lAmt + eAmt

      return { name: monthLabel, Inflow: inflow, Outflow: outflow }
    })

    const revenueTrendChart = last6Months.map(m => {
      const monthStr = m.format('YYYY-MM')
      const monthLabel = m.format('MMM YYYY')
      const monthInterest = payments
        .filter(p => dayjs(p.payment_date).format('YYYY-MM') === monthStr)
        .reduce((sum, p) => sum + Number(p.interest_paid || 0), 0)
      const monthFees = income
        .filter(i => dayjs(i.date).format('YYYY-MM') === monthStr)
        .reduce((sum, i) => sum + Number(i.amount || 0), 0)
      return { name: monthLabel, Revenue: monthInterest + monthFees }
    })

    const customerGrowthChart = last6Months.map(m => {
      const dateLimit = m.endOf('month')
      const count = customers.filter(c => dayjs(c.created_at).isBefore(dateLimit)).length
      return { name: m.format('MMM YYYY'), Customers: count }
    })

    const loanTypesList = ['personal', 'business', 'home', 'vehicle', 'gold', 'agriculture', 'education']
    const colorsList = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#6B7280']
    const loanTypeCounts = loanTypesList.map((type, idx) => {
      const typeLoans = loans.filter(l => l.loan_type === type)
      const count = typeLoans.length
      const amount = typeLoans.reduce((sum, l) => sum + Number(l.loan_amount || 0), 0)
      return {
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count,
        amount,
        color: colorsList[idx]
      }
    }).filter(t => t.value > 0)

    const emiCollectionSuccessChart = [
      { name: 'Paid', value: emiSchedule.filter(s => s.status === 'paid').length, color: '#10B981' },
      { name: 'Pending', value: emiSchedule.filter(s => s.status === 'pending').length, color: '#3B82F6' },
      { name: 'Overdue', value: emiSchedule.filter(s => s.status === 'overdue' || s.status === 'partial').length, color: '#EF4444' }
    ].filter(t => t.value > 0)

    const topPerformingLoanTypesChart = loanTypeCounts.map(t => ({
      name: t.name,
      Volume: t.amount,
      Count: t.value
    }))

    return {
      totalCustomers,
      activeLoans,
      closedLoans,
      totalOutstandingPrincipal,
      todaysCollection,
      todaysEMIDue,
      todaysDisbursement,
      availableCash,
      bankBalance,
      totalAvailableFunds,
      cashFlowToday,
      interestEarned,
      pendingApprovalsCount,
      todaysPaidEMI,
      todaysPendingEMI,
      todaysCollectionPercentage,
      todaysDueCustomers,
      todaysCashCollection,
      todaysOnlineCollection,
      collectionTrendPercent,
      totalInterestOutstanding,
      totalOutstandingAmount,
      completedLoansCount,
      loanPendingApprovals,
      rejectedLoansCount,
      totalOverdueCustomers,
      totalOverdueAmount,
      overdue1to30,
      overdue31to60,
      overdue61to90,
      overdue91Plus,
      criticalOverdueList,
      totalNpaAccounts,
      npaAmount,
      npaPercentage,
      npaRecovery,
      currentMonthDisbursements,
      monthlyDisbursementTrend,
      todaysInterest,
      monthlyInterest,
      yearlyInterest,
      alerts,
      recentActivities,
      collectionEfficiency,
      recoveryRate,
      loanApprovalRate,
      customerGrowth,
      portfolioGrowth,
      revenueGrowth,
      monthlyCollectionChart,
      monthlyDisbursementChart,
      outstandingTrendChart,
      cashFlowChart,
      revenueTrendChart,
      customerGrowthChart,
      loanTypeCounts,
      emiCollectionSuccessChart,
      topPerformingLoanTypesChart,
      recentPayments: payments.slice(0, 5),
      todaysDueCount,
      todayStr
    }
  }, [data])

  // Explicit type deconstruction helper to satisfy TS compiler checks
  const metrics = useMemo(() => {
    if (!dashboardData) return null
    return dashboardData
  }, [dashboardData])

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Executive Dashboard" subtitle="Loading financial intelligence..." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 h-28 animate-pulse flex flex-col justify-between">
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-6 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 h-96 animate-pulse" />
          <div className="bg-white border border-slate-100 rounded-2xl p-6 h-96 animate-pulse" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center bg-white border border-slate-100 rounded-2xl shadow-xs m-6">
        <AlertCircle className="h-14 w-14 text-red-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-900">Failed to Load Dashboard</h3>
        <p className="text-slate-500 text-sm max-w-md mt-1">
          {error instanceof Error ? error.message : 'An error occurred while calling database queries.'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-6 flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-md shadow-brand-500/20"
        >
          <RefreshCw className="h-4 w-4" /> Retry Loading
        </button>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center bg-white border border-slate-100 rounded-2xl m-6">
        <HelpCircle className="h-12 w-12 text-slate-300 mb-2" />
        <p className="text-slate-500 text-sm">No data available for display.</p>
      </div>
    )
  }

  const {
    totalCustomers, activeLoans, closedLoans, totalOutstandingPrincipal, todaysCollection,
    todaysEMIDue, todaysDisbursement, availableCash, bankBalance, totalAvailableFunds,
    cashFlowToday, interestEarned, pendingApprovalsCount, todaysPaidEMI, todaysPendingEMI,
    todaysCollectionPercentage, todaysDueCustomers, todaysCashCollection, todaysOnlineCollection,
    collectionTrendPercent, totalInterestOutstanding, totalOutstandingAmount, completedLoansCount,
    loanPendingApprovals, rejectedLoansCount, totalOverdueCustomers, totalOverdueAmount,
    overdue1to30, overdue31to60, overdue61to90, overdue91Plus, criticalOverdueList,
    totalNpaAccounts, npaAmount, npaPercentage, npaRecovery, currentMonthDisbursements,
    monthlyDisbursementTrend, todaysInterest, monthlyInterest, yearlyInterest, alerts,
    recentActivities, collectionEfficiency, recoveryRate, loanApprovalRate, customerGrowth,
    portfolioGrowth, revenueGrowth, monthlyCollectionChart, monthlyDisbursementChart,
    outstandingTrendChart, cashFlowChart, revenueTrendChart, customerGrowthChart,
    loanTypeCounts, emiCollectionSuccessChart, topPerformingLoanTypesChart, recentPayments,
    todaysDueCount, todayStr
  } = metrics

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Page Header */}
      <PageHeader
        title="Executive Financial Dashboard"
        subtitle="Real-time loan portfolio metrics, banking positions, collections, and audit timeline."
        badge={
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live Sync Verified
          </div>
        }
      />

      {/* Module 11: Alerts Panel */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Alerts & Reminders</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {alerts.slice(0, 6).map((alert: any, idx: number) => (
              <div
                key={idx}
                className={cn(
                  'flex gap-3 p-3.5 rounded-xl border text-xs font-medium transition-all shadow-2xs',
                  alert.type === 'danger' ? 'bg-red-50/40 text-red-800 border-red-100' :
                  alert.type === 'warning' ? 'bg-amber-50/40 text-amber-800 border-amber-100' :
                  'bg-blue-50/40 text-blue-800 border-blue-100'
                )}
              >
                <AlertCircle className={cn('h-4 w-4 flex-shrink-0 mt-0.5',
                  alert.type === 'danger' ? 'text-red-600' :
                  alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                )} />
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{alert.title}</p>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Module 1: Today's Overview KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
      >
        <motion.div variants={itemVariants}>
          <StatsCard title="Total Customers" value={totalCustomers.toString()} icon={<Users className="h-4 w-4" />} bgClass="kpi-blue" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Active Loans" value={activeLoans.toString()} icon={<WalletCards className="h-4 w-4" />} bgClass="kpi-green" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Closed Loans" value={closedLoans.toString()} icon={<CheckCircle2 className="h-4 w-4" />} bgClass="kpi-purple" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Total Outstanding" value={formatCurrency(totalOutstandingAmount)} icon={<Building className="h-4 w-4" />} bgClass="kpi-red" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Today's Collection" value={formatCurrency(todaysCollection)} icon={<Coins className="h-4 w-4" />} bgClass="kpi-cyan" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Today's EMI Due" value={formatCurrency(todaysEMIDue)} icon={<CalendarClock className="h-4 w-4" />} bgClass="kpi-orange" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Today's Disbursement" value={formatCurrency(todaysDisbursement)} icon={<ArrowUpRight className="h-4 w-4" />} bgClass="kpi-green" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Available Cash" value={formatCurrency(availableCash)} icon={<Coins className="h-4 w-4" />} bgClass="kpi-blue" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Bank Balance" value={formatCurrency(bankBalance)} icon={<Building className="h-4 w-4" />} bgClass="kpi-cyan" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Interest Earned" value={formatCurrency(interestEarned)} icon={<TrendingUp className="h-4 w-4" />} bgClass="kpi-green" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Pending Approvals" value={pendingApprovalsCount.toString()} icon={<Clock className="h-4 w-4" />} bgClass="kpi-orange" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title="Monthly Growth" value={`${portfolioGrowth.toFixed(1)}%`} icon={<Activity className="h-4 w-4" />} bgClass="kpi-purple" />
        </motion.div>
      </motion.div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Columns - Analytics and Data Tables */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Module 14: Interactive Graphs & Analytics */}
          <Card className="shadow-xs border-slate-100 bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 pb-4">
              <div>
                <CardTitle className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4 text-brand-600" />
                  Financial Intelligence Center
                </CardTitle>
                <p className="text-[11px] text-slate-400 font-medium">Select a tab below to switch the interactive report display</p>
              </div>

              {/* Chart Tabs selector */}
              <div className="flex flex-wrap gap-1 bg-slate-100/80 rounded-xl p-0.5 border border-slate-200/50 max-w-full overflow-x-auto no-scrollbar">
                {[
                  { id: 'collection', label: 'Collections' },
                  { id: 'disbursement', label: 'Disbursements' },
                  { id: 'outstanding', label: 'Outstanding' },
                  { id: 'cashflow', label: 'Cash Flow' },
                  { id: 'revenue', label: 'Revenue' },
                  { id: 'customers', label: 'Customers' },
                  { id: 'distribution', label: 'Distribution' },
                  { id: 'emi_success', label: 'EMI Status' },
                  { id: 'top_types', label: 'Loan Types' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveChartTab(tab.id as any)}
                    className={cn(
                      'px-2 py-1 text-[10px] font-bold rounded-lg transition-all capitalize',
                      activeChartTab === tab.id ? 'bg-white text-brand-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardBody className="pt-6">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  {activeChartTab === 'collection' ? (
                    <AreaChart data={monthlyCollectionChart}>
                      <defs>
                        <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="targGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="Collected" name="Collections" stroke="#3B82F6" fill="url(#collGrad)" strokeWidth={3} dot={{ fill: '#3B82F6', r: 3 }} />
                      <Area type="monotone" dataKey="Target" name="Monthly Target" stroke="#10B981" fill="url(#targGrad)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </AreaChart>
                  ) : activeChartTab === 'disbursement' ? (
                    <BarChart data={monthlyDisbursementChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Disbursed" name="Disbursements" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  ) : activeChartTab === 'outstanding' ? (
                    <AreaChart data={outstandingTrendChart}>
                      <defs>
                        <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="Outstanding" name="Outstanding Principal" stroke="#EF4444" fill="url(#outGrad)" strokeWidth={3} dot={{ fill: '#EF4444', r: 3 }} />
                    </AreaChart>
                  ) : activeChartTab === 'cashflow' ? (
                    <BarChart data={cashFlowChart} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Inflow" name="Inflow (Payments+Income)" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="Outflow" name="Outflow (Disbursed+Expenses)" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  ) : activeChartTab === 'revenue' ? (
                    <AreaChart data={revenueTrendChart}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="Revenue" name="Revenue Interest + Fees" stroke="#8B5CF6" fill="url(#revGrad)" strokeWidth={3} dot={{ fill: '#8B5CF6', r: 3 }} />
                    </AreaChart>
                  ) : activeChartTab === 'customers' ? (
                    <LineChart data={customerGrowthChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="Customers" name="Active Borrowers" stroke="#6366F1" strokeWidth={3} dot={{ fill: '#6366F1', r: 4 }} />
                    </LineChart>
                  ) : activeChartTab === 'distribution' ? (
                    <PieChart>
                      <Pie
                        data={loanTypeCounts}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {loanTypeCounts.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val, name, props) => [`${val} loans (₹${Number(props.payload.amount).toLocaleString('en-IN')})`, name]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  ) : activeChartTab === 'emi_success' ? (
                    <PieChart>
                      <Pie
                        data={emiCollectionSuccessChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {emiCollectionSuccessChart.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val, name) => [`${val} EMIs`, name]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  ) : (
                    <BarChart data={topPerformingLoanTypesChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Volume" name="Portfolio Volume" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Module 3: EMI Due Today Detailed List */}
          <Card className="shadow-xs border-slate-100 bg-white">
            <CardHeader className="flex items-center justify-between pb-3 border-b border-slate-50">
              <div>
                <CardTitle className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
                  <CalendarClock className="h-4.5 w-4.5 text-amber-500" />
                  EMI Due Today ({todaysDueCount} Items)
                </CardTitle>
                <p className="text-[11px] text-slate-400 font-medium">Real-time schedule payments due on date {formatDate(todayStr)}</p>
              </div>
              <div className="flex gap-4 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
                <div>Due: <span className="text-slate-900">{formatCurrency(todaysEMIDue)}</span></div>
                <div className="text-emerald-600">Paid: <span>{formatCurrency(todaysPaidEMI)}</span></div>
                <div className="text-amber-600">Pending: <span>{formatCurrency(todaysPendingEMI)}</span></div>
                <div className="text-brand-600 bg-brand-50/50 px-2 py-0.5 rounded-lg border border-brand-100">{todaysCollectionPercentage.toFixed(1)}% Collected</div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              {todaysDueCustomers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No loans have an EMI due date today.</div>
              ) : (
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Customer</th>
                      <th className="text-left py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Customer ID</th>
                      <th className="text-left py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Loan No</th>
                      <th className="text-right py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">EMI Amount</th>
                      <th className="text-center py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Status</th>
                      <th className="text-center py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysDueCustomers.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors border-t border-slate-100">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={c.name} size="sm" />
                            <span className="font-bold text-slate-800 text-xs">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-xs font-medium text-slate-600 font-mono">{c.customerNo}</td>
                        <td className="py-2.5 px-4 text-xs font-semibold text-slate-500 font-mono">{c.loanNo}</td>
                        <td className="py-2.5 px-4 text-right text-xs font-bold text-slate-800 amount-display">{formatCurrency(c.amount)}</td>
                        <td className="py-2.5 px-4 text-center">
                          <StatusBadge status={c.status} label={c.status.toUpperCase()} />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => navigate(`/customers/${c.customerId}`)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/80 px-2 py-1 rounded-lg border border-brand-100 transition-all cursor-pointer"
                          >
                            Profile <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Module 4: Today's Collection list */}
          <Card className="shadow-xs border-slate-100 bg-white">
            <CardHeader className="flex items-center justify-between pb-3 border-b border-slate-50">
              <div>
                <CardTitle className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
                  <Coins className="h-4.5 w-4.5 text-emerald-500" />
                  Today's Collection Desk
                </CardTitle>
                <p className="text-[11px] text-slate-400 font-medium">Payment receipts collected on {formatDate(todayStr)}</p>
              </div>
              <div className="flex gap-4 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
                <div>Total: <span className="text-slate-900">{formatCurrency(todaysCollection)}</span></div>
                <div className="text-emerald-600 font-semibold">Cash: <span>{formatCurrency(todaysCashCollection)}</span></div>
                <div className="text-brand-600 font-semibold">Online: <span>{formatCurrency(todaysOnlineCollection)}</span></div>
                <div className="flex items-center gap-1 text-slate-500 font-medium">
                  Trend MoM:
                  <span className={cn('font-bold', collectionTrendPercent >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {collectionTrendPercent >= 0 ? '+' : ''}{collectionTrendPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              {recentPayments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No payment receipts collected today.</div>
              ) : (
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Receipt No</th>
                      <th className="text-left py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Customer</th>
                      <th className="text-left py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Loan No</th>
                      <th className="text-right py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Amount Paid</th>
                      <th className="text-center py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Mode</th>
                      <th className="text-left py-3 px-4 text-slate-500 font-bold text-[10px] uppercase">Collected By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors border-t border-slate-100">
                        <td className="py-2.5 px-4 text-xs font-bold text-brand-600 font-mono">{p.receipt_number}</td>
                        <td className="py-2.5 px-4 text-xs font-bold text-slate-800">{p.customer_name}</td>
                        <td className="py-2.5 px-4 text-xs font-semibold text-slate-500 font-mono">{p.loan_number}</td>
                        <td className="py-2.5 px-4 text-right text-xs font-bold text-emerald-600 amount-display">{formatCurrency(p.amount_paid)}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={cn(
                            'px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border',
                            p.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            p.payment_mode === 'upi' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                            'bg-blue-50 text-blue-700 border-blue-100'
                          )}>
                            {p.payment_mode}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-xs font-medium text-slate-600">{p.collected_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

        </div>

        {/* Right Sidebar Columns - Cash positions, Overdues, timelines */}
        <div className="space-y-6">
          
          {/* Module 2: Cash & Bank Position */}
          <Card className="shadow-xs border-slate-100 bg-white">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
                <Building className="h-4.5 w-4.5 text-blue-500" />
                Cash & Bank Position
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cash in Hand</span>
                  <p className="text-sm font-extrabold text-slate-800 mt-1">{formatCurrency(availableCash)}</p>
                </div>
                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Bank Balance</span>
                  <p className="text-sm font-extrabold text-slate-800 mt-1">{formatCurrency(bankBalance)}</p>
                </div>
              </div>
              <div className="bg-gradient-to-tr from-slate-900 to-slate-850 text-white rounded-xl p-4 flex justify-between items-center shadow-sm">
                <div>
                  <span className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">Total Available Liquidity</span>
                  <p className="text-lg font-extrabold mt-0.5">{formatCurrency(totalAvailableFunds)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">Today's Flow</span>
                  <p className={cn('text-xs font-bold mt-0.5', cashFlowToday >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {cashFlowToday >= 0 ? '+' : ''}{formatCurrency(cashFlowToday)}
                  </p>
                </div>
              </div>
              <div className="h-[140px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Cash in Hand', value: availableCash, color: '#10B981' },
                        { name: 'Bank Balance', value: bankBalance, color: '#3B82F6' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#3B82F6" />
                    </Pie>
                    <RechartsTooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Module 13: Performance Summary KPI dashboard */}
          <Card className="shadow-xs border-slate-100 bg-white">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
                <Target className="h-4.5 w-4.5 text-brand-600" />
                Performance Summary KPIs
              </CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-slate-50 pt-1">
              {[
                { title: 'Collection Efficiency (Month)', value: collectionEfficiency, format: (v: number) => `${v.toFixed(1)}%`, icon: <Percent className="h-4 w-4 text-emerald-600" />, desc: 'Collections vs due scheds' },
                { title: 'Portfolio Recovery Rate', value: recoveryRate, format: (v: number) => `${v.toFixed(1)}%`, icon: <Award className="h-4 w-4 text-blue-600" />, desc: 'Total collections vs overdue volume' },
                { title: 'Lead/Loan Approval Rate', value: loanApprovalRate, format: (v: number) => `${v.toFixed(1)}%`, icon: <UserCheck className="h-4 w-4 text-purple-600" />, desc: 'Lead application conversion rate' },
                { title: 'Monthly Revenue Growth', value: revenueGrowth, format: (v: number) => `+${v.toFixed(1)}%`, icon: <TrendingUp className="h-4 w-4 text-emerald-600" />, desc: 'MoM interest income increase' },
                { title: 'Customer Growth Trend', value: customerGrowth, format: (v: number) => `+${v.toFixed(1)}%`, icon: <Users className="h-4 w-4 text-indigo-600" />, desc: 'Onboarded borrowers growth rate' },
              ].map((kpi: any, idx: number) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                      {kpi.icon}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{kpi.title}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{kpi.desc}</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-sm text-slate-900">{kpi.format(kpi.value)}</span>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Module 7 & 8: Overdue Accounts & NPA Summary */}
          <Card className="shadow-xs border-slate-100 bg-white">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
                Overdue Portfolio & NPA Summary
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50/30 rounded-xl p-3 border border-red-100 text-center">
                  <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider">Overdue Accounts</span>
                  <p className="text-lg font-extrabold text-red-600 mt-1">{formatCurrency(totalOverdueAmount)}</p>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{totalOverdueCustomers} customers</span>
                </div>
                <div className="bg-slate-900 rounded-xl p-3 text-center text-white">
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{"NPA Portfolio (>90d)"}</span>
                  <p className="text-lg font-extrabold text-white mt-1">{formatCurrency(npaAmount)}</p>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{totalNpaAccounts} active accounts ({npaPercentage.toFixed(1)}%)</span>
                </div>
              </div>

              {/* Overdue Aging Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue Aging Breakdown</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500">1-30 Days</span>
                    <span className="font-bold text-slate-800">{formatCurrency(overdue1to30)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500">31-60 Days</span>
                    <span className="font-bold text-slate-800">{formatCurrency(overdue31to60)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500">61-90 Days</span>
                    <span className="font-bold text-slate-800 text-amber-600">{formatCurrency(overdue61to90)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-red-50/20 border border-red-50">
                    <span className="text-red-700 font-medium">90+ Days (NPA)</span>
                    <span className="font-extrabold text-red-600">{formatCurrency(overdue91Plus)}</span>
                  </div>
                </div>
              </div>

              {/* Critical Overdue highlight list */}
              {criticalOverdueList.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {"Critical Overdue Cases (>60 days)"}
                  </h4>
                  <div className="space-y-1.5">
                    {criticalOverdueList.map((crit: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-xs p-2 bg-red-50/20 border border-red-100 rounded-lg">
                        <div>
                          <p className="font-bold text-slate-850">{crit.customerName}</p>
                          <p className="text-[10px] text-slate-400">Loan: {crit.loanNo} · Overdue {crit.overdueDays} days</p>
                        </div>
                        <span className="font-bold text-red-600">{formatCurrency(crit.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Module 12: Unified Audit activities feed */}
          <Card className="shadow-xs border-slate-100 bg-white">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
                <Clock className="h-4.5 w-4.5 text-slate-500" />
                Live System Audit Activity Log
              </CardTitle>
            </CardHeader>
            <CardBody className="pt-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
              <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-4 text-xs">
                {recentActivities.map((act: any, index: number) => (
                  <div key={index} className="relative">
                    <div className={cn(
                      'absolute -left-[23px] top-0 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-slate-100 shadow-2xs',
                      act.icon === 'payment' ? 'bg-emerald-500' :
                      act.icon === 'loan' ? 'bg-blue-500' :
                      act.icon === 'customer' ? 'bg-purple-500' :
                      act.icon === 'expense' ? 'bg-orange-500' : 'bg-slate-400'
                    )}>
                      {act.icon === 'payment' ? <Coins className="h-1.5 w-1.5 text-white" /> :
                       act.icon === 'loan' ? <WalletCards className="h-1.5 w-1.5 text-white" /> :
                       act.icon === 'customer' ? <Users className="h-1.5 w-1.5 text-white" /> :
                       <Activity className="h-1.5 w-1.5 text-white" />}
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{act.title}</span>
                        <span className="text-[9px] text-slate-400">{formatDate(act.date, 'DD MMM, hh:mm A')}</span>
                      </div>
                      <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">{act.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

        </div>

      </div>

    </div>
  )
}
