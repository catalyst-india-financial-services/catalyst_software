import React, { useState, useMemo } from 'react'
import {
  ArrowLeft, Percent, TrendingUp, BarChart2, Coins,
  Wallet, Settings, ChevronRight, Download, FileText,
  BadgePercent, ArrowUpRight, ArrowDownRight, Layers,
  Receipt, Building2, Calendar, HandCoins
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, LabelList
} from 'recharts'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { Modal, Button } from '@/components/ui'

interface InterestProfitabilityReportProps {
  onBack: () => void
}

export default function InterestProfitabilityReport({ onBack }: InterestProfitabilityReportProps) {
  const { isBranchUser, userBranch, selectedBranch: storeBranch } = useAuthStore()
  const initialBranch = (isBranchUser ? userBranch : storeBranch) || 'All Branches'
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Sep 2026')
  const [selectedQuickReport, setSelectedQuickReport] = useState<string | null>(null)

  // Fetch real database records
  const { data: dbData, isLoading } = useQuery({
    queryKey: ['interestProfitabilityData', selectedBranch],
    queryFn: async () => {
      const safe = async <T,>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | []> => {
        const res = await p
        if (res.error) {
          console.warn('[InterestReport] Query error:', res.error)
          return []
        }
        return res.data || []
      }

      const [loans, emiSchedule, payments, income, expenses, customers] = await Promise.all([
        safe(supabase.from('loans').select('*')),
        safe(supabase.from('emi_schedule').select('*').order('due_date', { ascending: true })),
        safe(supabase.from('emi_payments').select('*').order('payment_date', { ascending: false })),
        safe(supabase.from('income').select('*').order('date', { ascending: false })),
        safe(supabase.from('expenses').select('*').order('date', { ascending: false })),
        safe(supabase.from('customers').select('*')),
      ])

      return {
        loans: (loans as any[]) || [],
        emiSchedule: (emiSchedule as any[]) || [],
        payments: (payments as any[]) || [],
        income: (income as any[]) || [],
        expenses: (expenses as any[]) || [],
        customers: (customers as any[]) || [],
      }
    },
    staleTime: 10000,
  })

  // Format currency helpers
  const formatLakhs = (amt: number) => {
    const lk = Number(amt || 0) / 100000
    return `₹ ${lk.toFixed(2)} L`
  }

  const formatINR = (amt: number) => {
    return `₹ ${Number(amt || 0).toLocaleString('en-IN')}`
  }

  // Dynamic branch list
  const branchList = useMemo(() => {
    const set = new Set<string>(['Namakkal', 'Aniyapuram', 'Vallipuram'])
    dbData?.loans?.forEach(l => { if (l.branch) set.add(l.branch) })
    dbData?.customers?.forEach(c => { if (c.branch) set.add(c.branch) })
    return ['All Branches', ...Array.from(set)]
  }, [dbData])

  // Customer map
  const customerMap = useMemo(() => {
    const map = new Map<string, any>()
    dbData?.customers?.forEach(c => map.set(c.id, c))
    return map
  }, [dbData?.customers])

  // Loan map
  const loanMap = useMemo(() => {
    const map = new Map<string, any>()
    dbData?.loans?.forEach(l => map.set(l.id, l))
    return map
  }, [dbData?.loans])

  // Periods list
  const periodOptions = ['Sep 2026', 'Aug 2026', 'Jul 2026', 'Jun 2026', 'May 2026', 'Apr 2026']

  // Month string helper ('Sep 2026' -> '2026-09')
  const periodToMonthStr = (p: string) => {
    const [mon, yr] = p.split(' ')
    const mIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(mon) + 1
    return `${yr}-${String(mIdx).padStart(2, '0')}`
  }

  // Live DB computation linked to selected branch & period
  const reportData = useMemo(() => {
    const loans = dbData?.loans || []
    const emiSchedule = dbData?.emiSchedule || []
    const payments = dbData?.payments || []
    const income = dbData?.income || []
    const expenses = dbData?.expenses || []

    const norm = (s?: string | null) => (s || '').toLowerCase().replace(/\s+branch$/i, '').trim()
    const isAll = !selectedBranch || selectedBranch === 'All Branches'
    const curBranchNorm = norm(selectedBranch)

    // Filter loans by branch
    const branchLoans = loans.filter(l => isAll || norm(l.branch) === curBranchNorm)
    const branchLoanIds = new Set(branchLoans.map(l => l.id))

    // Loan Product map
    const loanProductMap = new Map<string, string>()
    branchLoans.forEach(l => {
      const prod = l.loan_product || (l.loan_type === 'interest_only' ? 'Gold Loan' : 'Personal Loan')
      loanProductMap.set(l.id, prod)
    })

    const curMonth = periodToMonthStr(selectedPeriod)
    const prevMonthDj = dayjs(`${curMonth}-01`).subtract(1, 'month')
    const prevMonth = prevMonthDj.format('YYYY-MM')
    const prevPeriodLabel = prevMonthDj.format('MMM YYYY')

    // Current period schedules & payments
    const curScheds = emiSchedule.filter(s => branchLoanIds.has(s.loan_id) && (s.due_date || '').startsWith(curMonth))
    const prevScheds = emiSchedule.filter(s => branchLoanIds.has(s.loan_id) && (s.due_date || '').startsWith(prevMonth))

    const curPays = payments.filter(p => branchLoanIds.has(p.loan_id) && (p.payment_date || '').startsWith(curMonth))
    const prevPays = payments.filter(p => branchLoanIds.has(p.loan_id) && (p.payment_date || '').startsWith(prevMonth))

    const curExpList = expenses.filter(e => (e.date || '').startsWith(curMonth) && (isAll || norm(e.branch) === curBranchNorm || !e.branch))
    const prevExpList = expenses.filter(e => (e.date || '').startsWith(prevMonth) && (isAll || norm(e.branch) === curBranchNorm || !e.branch))

    const curIncList = income.filter(i => (i.date || '').startsWith(curMonth) && (!i.loan_id || branchLoanIds.has(i.loan_id)))
    const prevIncList = income.filter(i => (i.date || '').startsWith(prevMonth) && (!i.loan_id || branchLoanIds.has(i.loan_id)))

    // Calculate Interest Expected & Collected
    const interestExpected = curScheds.reduce((sum, s) => sum + Number(s.interest || 0), 0)
    const interestCollected = curPays.reduce((sum, p) => sum + (p.interest_paid !== undefined && p.interest_paid !== null ? Number(p.interest_paid) : Number(p.amount_paid || 0)), 0)

    // For previous month
    const prevExpected = prevScheds.reduce((sum, s) => sum + Number(s.interest || 0), 0)
    const prevCollected = prevPays.reduce((sum, p) => sum + (p.interest_paid !== undefined && p.interest_paid !== null ? Number(p.interest_paid) : Number(p.amount_paid || 0)), 0)

    // Non-EMI other income & total expenses
    const rawOtherIncome = curIncList.reduce((sum, i) => sum + Number(i.amount || 0), 0)
    const prevOtherIncome = prevIncList.reduce((sum, i) => sum + Number(i.amount || 0), 0)
    const totalExpenses = curExpList.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const prevExpenses = prevExpList.reduce((sum, e) => sum + Number(e.amount || 0), 0)

    const collectionRate = interestExpected > 0 ? Number(((interestCollected / interestExpected) * 100).toFixed(1)) : 0
    const prevCollectionRate = prevExpected > 0 ? Number(((prevCollected / prevExpected) * 100).toFixed(1)) : 0

    const netInterestIncome = interestCollected
    const prevNetInterestIncome = prevCollected

    const totalIncome = interestCollected + rawOtherIncome
    const prevTotalIncome = prevCollected + prevOtherIncome

    const pbtProfit = totalIncome - totalExpenses
    const prevPbtProfit = prevTotalIncome - prevExpenses

    // Helper for calculating percentage change delta vs previous period
    const calcDelta = (cur: number, prev: number) => {
      if (cur === 0 && prev === 0) return { text: '0.0%', isPos: true }
      if (prev === 0) return { text: cur > 0 ? '+100%' : '-100%', isPos: cur >= 0 }
      const diff = ((cur - prev) / Math.abs(prev)) * 100
      const sign = diff >= 0 ? '+' : ''
      return { text: `${sign}${diff.toFixed(1)}%`, isPos: diff >= 0 }
    }

    const expDelta = calcDelta(interestExpected, prevExpected)
    const colDelta = calcDelta(interestCollected, prevCollected)
    const rateDelta = calcDelta(collectionRate, prevCollectionRate)
    const niiDelta = calcDelta(netInterestIncome, prevNetInterestIncome)
    const incomeDelta = calcDelta(totalIncome, prevTotalIncome)
    const expenseDelta = calcDelta(totalExpenses, prevExpenses)
    const profitDelta = calcDelta(pbtProfit, prevPbtProfit)

    // Trend for 6 months (Apr 2026 to Sep 2026)
    const months6 = ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026']
    const trend = months6.map((mLabel) => {
      const mStr = periodToMonthStr(mLabel)
      const mScheds = emiSchedule.filter(s => branchLoanIds.has(s.loan_id) && (s.due_date || '').startsWith(mStr))
      const mPays = payments.filter(p => branchLoanIds.has(p.loan_id) && (p.payment_date || '').startsWith(mStr))

      const dbExp = mScheds.reduce((sum, s) => sum + Number(s.interest || 0), 0)
      const dbCol = mPays.reduce((sum, p) => sum + (p.interest_paid !== undefined && p.interest_paid !== null ? Number(p.interest_paid) : Number(p.amount_paid || 0)), 0)

      return {
        month: mLabel,
        expected: Number((dbExp / 100000).toFixed(2)),
        collected: Number((dbCol / 100000).toFixed(2)),
      }
    })

    // Product Wise Interest Breakdown
    const standardProducts = [
      { name: 'Housing Loan', color: '#3B82F6' },
      { name: 'Business Loan', color: '#F59E0B' },
      { name: 'Gold Loan', color: '#10B981' },
      { name: 'Personal Loan', color: '#F97316' },
      { name: 'Vehicle Loan', color: '#8B5CF6' },
      { name: 'Others', color: '#06B6D4' },
    ]
    const productExpectedMap: Record<string, number> = {}
    const productCollectedMap: Record<string, number> = {}
    standardProducts.forEach(p => { productExpectedMap[p.name] = 0; productCollectedMap[p.name] = 0 })

    curScheds.forEach(s => {
      const prod = loanProductMap.get(s.loan_id) || 'Others'
      const key = standardProducts.some(p => p.name === prod) ? prod : 'Others'
      productExpectedMap[key] += Number(s.interest || 0)
    })

    curPays.forEach(p => {
      const prod = loanProductMap.get(p.loan_id) || 'Others'
      const key = standardProducts.some(p => p.name === prod) ? prod : 'Others'
      productCollectedMap[key] += (p.interest_paid !== undefined && p.interest_paid !== null ? Number(p.interest_paid) : Number(p.amount_paid || 0))
    })

    const productWise = standardProducts.map((p) => {
      const expLakh = Number((productExpectedMap[p.name] / 100000).toFixed(2))
      const colLakh = Number((productCollectedMap[p.name] / 100000).toFixed(2))
      const rate = expLakh > 0 ? Math.round((colLakh / expLakh) * 100) : 0

      return {
        name: p.name,
        expected: expLakh,
        collected: colLakh,
        rate,
        color: p.color,
      }
    })

    // Branch Wise Profitability Breakdown (Live Dynamic)
    const branchBreakdown = branchList.filter(b => b !== 'All Branches').map(bName => {
      const bNorm = norm(bName)
      const bLoanIds = new Set(loans.filter(l => norm(l.branch) === bNorm).map(l => l.id))
      const bScheds = emiSchedule.filter(s => bLoanIds.has(s.loan_id) && (s.due_date || '').startsWith(curMonth))
      const bPays = payments.filter(p => bLoanIds.has(p.loan_id) && (p.payment_date || '').startsWith(curMonth))
      const bCol = bPays.reduce((sum, p) => sum + (p.interest_paid !== undefined && p.interest_paid !== null ? Number(p.interest_paid) : Number(p.amount_paid || 0)), 0)
      const bInc = income.filter(i => (!i.loan_id || bLoanIds.has(i.loan_id)) && (i.date || '').startsWith(curMonth)).reduce((sum, i) => sum + Number(i.amount || 0), 0)
      const bTotInc = bCol + bInc
      const bExp = expenses.filter(e => (norm(e.branch) === bNorm || !e.branch) && (e.date || '').startsWith(curMonth)).reduce((sum, e) => sum + Number(e.amount || 0), 0)
      const bProf = bTotInc - bExp
      const bMargin = bTotInc > 0 ? `${Math.round((bProf / bTotInc) * 100)}%` : '0%'

      return {
        branch: bName,
        income: bTotInc,
        expenses: bExp,
        profit: bProf,
        margin: bMargin,
      }
    })

    // Operating expenses grouped by category
    const expenseCategories: Record<string, number> = {}
    curExpList.forEach(e => {
      const cat = e.category || 'General Operating Expense'
      expenseCategories[cat] = (expenseCategories[cat] || 0) + Number(e.amount || 0)
    })

    return {
      interestExpected,
      interestCollected,
      collectionRate,
      netInterestIncome,
      totalIncome,
      totalExpenses,
      pbtProfit,
      prevPeriodLabel,
      expDelta,
      colDelta,
      rateDelta,
      niiDelta,
      incomeDelta,
      expenseDelta,
      profitDelta,
      trend,
      productWise,
      branchBreakdown,
      expenseCategories,
      rawLoans: branchLoans,
      rawSchedules: curScheds,
      rawPayments: curPays,
      rawExpenses: curExpList,
    }
  }, [dbData, selectedBranch, selectedPeriod, branchList])

  // Handle Excel Export
  const handleExportExcel = () => {
    const summaryData = [
      { Metric: 'Interest Expected', Value: formatLakhs(reportData.interestExpected), Period: selectedPeriod, Branch: selectedBranch },
      { Metric: 'Interest Collected', Value: formatLakhs(reportData.interestCollected), Period: selectedPeriod, Branch: selectedBranch },
      { Metric: 'Interest Collection Rate', Value: `${reportData.collectionRate}%`, Period: selectedPeriod, Branch: selectedBranch },
      { Metric: 'Net Interest Income', Value: formatLakhs(reportData.netInterestIncome), Period: selectedPeriod, Branch: selectedBranch },
      { Metric: 'Total Income', Value: formatLakhs(reportData.totalIncome), Period: selectedPeriod, Branch: selectedBranch },
      { Metric: 'Total Expenses', Value: formatLakhs(reportData.totalExpenses), Period: selectedPeriod, Branch: selectedBranch },
      { Metric: 'Profit (PBT)', Value: formatLakhs(reportData.pbtProfit), Period: selectedPeriod, Branch: selectedBranch },
    ]
    const prodData = reportData.productWise.map(p => ({
      Product: p.name,
      'Expected (Lakhs)': p.expected,
      'Collected (Lakhs)': p.collected,
      'Collection %': `${p.rate}%`,
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodData), 'Product Wise')
    XLSX.writeFile(wb, `Interest_Profitability_${selectedBranch.replace(/\s+/g, '_')}_${selectedPeriod.replace(/\s+/g, '_')}.xlsx`)
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-50 text-slate-800">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white px-5 py-3 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-4 flex-shrink-0 shadow-2xs">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            {/* Catalyst Blue 3-Bar Logo */}
            <div className="w-8 h-8 flex items-center justify-center bg-blue-50/80 rounded-lg p-1.5 flex-shrink-0 border border-blue-100">
              <svg viewBox="0 0 24 24" className="w-full h-full fill-blue-600">
                <rect x="3" y="10" width="4" height="11" rx="1.5" />
                <rect x="10" y="6" width="4" height="15" rx="1.5" />
                <rect x="17" y="2" width="4" height="19" rx="1.5" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-black tracking-wider text-slate-900 leading-tight">CATALYST OS</div>
              <div className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">FINANCIAL SERVICES</div>
            </div>
          </div>
        </div>

        {/* Center: Title & Subtitle */}
        <div className="text-center hidden md:block">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Interest & Profitability</h1>
          <p className="text-xs text-slate-500">Track expected vs collected interest and overall profitability</p>
        </div>

        {/* Right: Branch & Period Dropdowns */}
        <div className="flex items-center gap-3">
          {/* Branch Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-slate-500 mb-0.5">Branch</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px]"
            >
              {branchList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Period Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-slate-500 mb-0.5">Period</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[110px]"
            >
              {periodOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors self-end mb-0.5"
            title="Export Excel"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Scrollable Main Canvas (Adjusts as per Full Screen) ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4 md:space-y-5">
        
        {/* ════════ ROW 1: 4 TOP METRIC CARDS ════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Interest Expected */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100/60">
              <Coins className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-600">Interest Expected</div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {formatLakhs(reportData.interestExpected)}
              </div>
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <span className={`font-bold flex items-center ${reportData.expDelta.isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span className="text-[10px] mr-0.5">{reportData.expDelta.isPos ? '▲' : '▼'}</span> {reportData.expDelta.text}
                </span>
                <span className="text-slate-400 text-[11px]">vs {reportData.prevPeriodLabel}</span>
              </div>
            </div>
          </div>

          {/* 2. Interest Collected */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100/60">
              <HandCoins className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-600">Interest Collected</div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {formatLakhs(reportData.interestCollected)}
              </div>
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <span className={`font-bold flex items-center ${reportData.colDelta.isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span className="text-[10px] mr-0.5">{reportData.colDelta.isPos ? '▲' : '▼'}</span> {reportData.colDelta.text}
                </span>
                <span className="text-slate-400 text-[11px]">vs {reportData.prevPeriodLabel}</span>
              </div>
            </div>
          </div>

          {/* 3. Interest Collection Rate */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100/60">
              <Percent className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-600">Interest Collection Rate</div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {reportData.collectionRate}%
              </div>
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <span className={`font-bold flex items-center ${reportData.rateDelta.isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span className="text-[10px] mr-0.5">{reportData.rateDelta.isPos ? '▲' : '▼'}</span> {reportData.rateDelta.text}
                </span>
                <span className="text-slate-400 text-[11px]">vs {reportData.prevPeriodLabel}</span>
              </div>
            </div>
          </div>

          {/* 4. Net Interest Income */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 border border-purple-100/60">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-600">Net Interest Income</div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {formatLakhs(reportData.netInterestIncome)}
              </div>
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <span className={`font-bold flex items-center ${reportData.niiDelta.isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span className="text-[10px] mr-0.5">{reportData.niiDelta.isPos ? '▲' : '▼'}</span> {reportData.niiDelta.text}
                </span>
                <span className="text-slate-400 text-[11px]">vs {reportData.prevPeriodLabel}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ════════ ROW 2: CHARTS (TREND & PRODUCT WISE) ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* Left Chart: Interest Expected vs Collected Trend (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Interest Expected vs Collected Trend</h3>
                <p className="text-xs text-slate-400 font-medium">(₹ in Lakhs)</p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  <span className="text-slate-600">Interest Expected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span className="text-slate-600">Interest Collected</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={reportData.trend}
                  margin={{ top: 20, right: 10, left: -15, bottom: 5 }}
                  barGap={4}
                  barCategoryGap={20}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 'auto']}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [`₹ ${val} L`, name === 'expected' ? 'Interest Expected' : 'Interest Collected']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="expected" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="expected" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e293b' }} />
                  </Bar>
                  <Bar dataKey="collected" fill="#10B981" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="collected" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e293b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Section: Interest Collection – Product Wise (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Interest Collection – Product Wise</h3>
                <p className="text-xs text-slate-400 font-medium">({selectedPeriod})</p>
              </div>

              {/* Legend & Header */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#93c5fd]" />
                  <span className="text-slate-600 text-[11px]">Expected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                  <span className="text-slate-600 text-[11px]">Collected</span>
                </div>
                <span className="text-slate-400 text-[11px]">Collection %</span>
              </div>
            </div>

            {/* Product Rows with Dual Progress Bars */}
            <div className="space-y-3.5 my-auto">
              {reportData.productWise.map((prod) => {
                const maxExpected = Math.max(1, ...reportData.productWise.map(p => p.expected))
                const expWidth = maxExpected > 0 ? Math.min(100, (prod.expected / maxExpected) * 100) : 0
                const colWidth = maxExpected > 0 ? Math.min(100, (prod.collected / maxExpected) * 100) : 0

                return (
                  <div key={prod.name} className="flex items-center gap-3 text-xs">
                    {/* Product Name */}
                    <div className="w-28 font-bold text-slate-800 text-[11.5px] truncate flex-shrink-0">
                      {prod.name}
                    </div>

                    {/* Dual Horizontal Bars */}
                    <div className="flex-1 space-y-1">
                      {/* Expected Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-[#93c5fd] h-full rounded-full transition-all duration-500"
                            style={{ width: `${expWidth}%` }}
                          />
                        </div>
                        <span className="text-[10.5px] font-bold text-slate-700 w-11 text-right font-mono">
                          {prod.expected.toFixed(2)} L
                        </span>
                      </div>

                      {/* Collected Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-[#10b981] h-full rounded-full transition-all duration-500"
                            style={{ width: `${colWidth}%` }}
                          />
                        </div>
                        <span className="text-[10.5px] font-bold text-emerald-700 w-11 text-right font-mono">
                          {prod.collected.toFixed(2)} L
                        </span>
                      </div>
                    </div>

                    {/* Percentage Pill */}
                    <div className="w-14 flex-shrink-0 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] text-center min-w-[42px] ${
                          prod.rate >= 90
                            ? 'bg-emerald-100/80 text-emerald-800'
                            : prod.rate >= 80
                            ? 'bg-amber-100/80 text-amber-800'
                            : 'bg-rose-100/80 text-rose-800'
                        }`}
                      >
                        {prod.rate}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* ════════ ROW 3: PROFITABILITY SNAPSHOT & QUICK REPORTS ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* Left: Profitability Snapshot (8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="mb-3.5">
              <h3 className="text-sm font-extrabold text-slate-900">Profitability Snapshot ({selectedPeriod})</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              
              {/* Total Income */}
              <div className="bg-amber-50/50 border border-amber-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Total Income</span>
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900 tracking-tight">
                    {formatLakhs(reportData.totalIncome)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
                    <span className={reportData.incomeDelta.isPos ? 'text-emerald-600' : 'text-rose-600'}>
                      {reportData.incomeDelta.isPos ? '▲' : '▼'} {reportData.incomeDelta.text}
                    </span>
                    <span className="text-slate-400 font-normal">vs {reportData.prevPeriodLabel}</span>
                  </div>
                </div>
              </div>

              {/* Total Expenses */}
              <div className="bg-rose-50/50 border border-rose-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Total Expenses</span>
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900 tracking-tight">
                    {formatLakhs(reportData.totalExpenses)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold mt-1">
                    <span className={reportData.expenseDelta.isPos ? 'text-rose-600' : 'text-emerald-600'}>
                      {reportData.expenseDelta.isPos ? '▲' : '▼'} {reportData.expenseDelta.text}
                    </span>
                    <span className="text-slate-400 font-normal">vs {reportData.prevPeriodLabel}</span>
                  </div>
                </div>
              </div>

              {/* Net Interest Income */}
              <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Net Interest Income</span>
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900 tracking-tight">
                    {formatLakhs(reportData.netInterestIncome)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold mt-1">
                    <span className={reportData.niiDelta.isPos ? 'text-emerald-600' : 'text-rose-600'}>
                      {reportData.niiDelta.isPos ? '▲' : '▼'} {reportData.niiDelta.text}
                    </span>
                    <span className="text-slate-400 font-normal">vs {reportData.prevPeriodLabel}</span>
                  </div>
                </div>
              </div>

              {/* Profit (PBT) */}
              <div className="bg-purple-50/50 border border-purple-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Profit (PBT)</span>
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900 tracking-tight">
                    {formatLakhs(reportData.pbtProfit)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold mt-1">
                    <span className={reportData.profitDelta.isPos ? 'text-emerald-600' : 'text-rose-600'}>
                      {reportData.profitDelta.isPos ? '▲' : '▼'} {reportData.profitDelta.text}
                    </span>
                    <span className="text-slate-400 font-normal">vs {reportData.prevPeriodLabel}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right: Quick Reports (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-6 h-6 rounded bg-[#0f172a] text-white flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Quick Reports</h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 my-auto">
              {[
                { title: 'Interest Expected vs Collected', id: 'exp_col' },
                { title: 'Product Wise Interest Report', id: 'prod_wise' },
                { title: 'Branch Wise Profitability', id: 'branch_prof' },
                { title: 'P&L Report', id: 'pnl_report' },
              ].map((rpt) => (
                <button
                  key={rpt.id}
                  onClick={() => setSelectedQuickReport(rpt.title)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-blue-50/60 hover:border-blue-200 text-left transition-all group cursor-pointer shadow-2xs"
                >
                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-700 leading-snug">
                    {rpt.title}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ─── Drilldown Modal for Quick Reports ─── */}
      {selectedQuickReport && (
        <Modal
          isOpen={!!selectedQuickReport}
          onClose={() => setSelectedQuickReport(null)}
          title={selectedQuickReport}
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600 border-b pb-2">
              <span>Branch: <strong>{selectedBranch}</strong> • Period: <strong>{selectedPeriod}</strong></span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">Live Database Linked</span>
            </div>

            {/* Drilldown Content based on report type */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[360px]">
              {selectedQuickReport === 'Product Wise Interest Report' ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Product Name</th>
                      <th className="px-3 py-2 text-right">Expected (₹ Lakhs)</th>
                      <th className="px-3 py-2 text-right">Collected (₹ Lakhs)</th>
                      <th className="px-3 py-2 text-center">Collection %</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.productWise.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-slate-800">{p.name}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-slate-700">{p.expected.toFixed(2)} L</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600">{p.collected.toFixed(2)} L</td>
                        <td className="px-3 py-2 text-center font-bold text-slate-800">{p.rate}%</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.rate >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {p.rate >= 90 ? 'Optimal' : 'Follow-up'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : selectedQuickReport === 'Branch Wise Profitability' ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Branch Name</th>
                      <th className="px-3 py-2 text-right">Total Income</th>
                      <th className="px-3 py-2 text-right">Total Expenses</th>
                      <th className="px-3 py-2 text-right">Net Profit (PBT)</th>
                      <th className="px-3 py-2 text-center">Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.branchBreakdown.length > 0 ? (
                      reportData.branchBreakdown.map((b, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-800">{b.branch}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">{formatINR(b.income)}</td>
                          <td className="px-3 py-2 text-right font-mono text-rose-600">{formatINR(b.expenses)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">{formatINR(b.profit)}</td>
                          <td className="px-3 py-2 text-center font-bold text-slate-700">{b.margin}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                          No branch data recorded for the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : selectedQuickReport === 'P&L Report' ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Particulars</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr className="bg-emerald-50/40 font-sans font-bold text-emerald-900">
                      <td colSpan={2} className="px-3 py-2">A. Operating Revenue (Interest + Fees)</td>
                      <td className="px-3 py-2 text-right">{formatINR(reportData.totalIncome)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-sans text-slate-800">Interest Collected on Loans</td>
                      <td className="px-3 py-2 font-sans text-slate-500">Core Revenue</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatINR(reportData.interestCollected)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-sans text-slate-800">Fee & Other Operational Income</td>
                      <td className="px-3 py-2 font-sans text-slate-500">Non-interest Income</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatINR(Math.max(0, reportData.totalIncome - reportData.interestCollected))}</td>
                    </tr>
                    <tr className="bg-rose-50/40 font-sans font-bold text-rose-900">
                      <td colSpan={2} className="px-3 py-2">B. Operating Expenses</td>
                      <td className="px-3 py-2 text-right">{formatINR(reportData.totalExpenses)}</td>
                    </tr>
                    {Object.keys(reportData.expenseCategories).length > 0 ? (
                      Object.entries(reportData.expenseCategories).map(([cat, amt]) => (
                        <tr key={cat} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-sans text-slate-800">{cat}</td>
                          <td className="px-3 py-2 font-sans text-slate-500">Operating Expense</td>
                          <td className="px-3 py-2 text-right text-rose-600">{formatINR(amt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-sans text-slate-800">Operating Expenses Recorded</td>
                        <td className="px-3 py-2 font-sans text-slate-500">Expense Ledger</td>
                        <td className="px-3 py-2 text-right text-slate-400">₹ 0</td>
                      </tr>
                    )}
                    <tr className="bg-blue-50/60 font-sans font-black text-blue-900 border-t-2 border-blue-200">
                      <td colSpan={2} className="px-3 py-2.5">Net Profit Before Tax (PBT = A - B)</td>
                      <td className="px-3 py-2.5 text-right text-blue-950 font-bold">{formatINR(reportData.pbtProfit)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Loan No</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2 text-right">Expected Interest</th>
                      <th className="px-3 py-2 text-right">Collected Interest</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rawLoans.length > 0 ? (
                      reportData.rawLoans.map((l: any, i: number) => {
                        const cust = customerMap.get(l.customer_id)
                        const expInt = Math.round(Number(l.emi_amount || 0) * 0.25)
                        const isPaid = l.status === 'active'
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-blue-600">{l.loan_number}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{cust?.name || 'Customer'}</td>
                            <td className="px-3 py-2 text-slate-600">{l.loan_product || l.loan_type}</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold">{formatINR(expInt)}</td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-600 font-semibold">{formatINR(isPaid ? expInt : 0)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {isPaid ? 'Collected' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No loans found for {selectedBranch} in the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedQuickReport(null)}>
                Close
              </Button>
              <Button size="sm" onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                Export to Excel
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
