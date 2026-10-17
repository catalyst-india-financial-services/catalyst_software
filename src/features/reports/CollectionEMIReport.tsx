import React, { useState, useMemo } from 'react'
import {
  CalendarClock, Coins, AlertTriangle, ArrowLeft,
  ChevronRight, Calendar, Building2, Download, Printer,
  BarChart2, FileText, CheckCircle2, RefreshCw, X, Search, Users
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell, LabelList
} from 'recharts'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { Modal, Button } from '@/components/ui'

interface CollectionEMIReportProps {
  onBack: () => void
}

export default function CollectionEMIReport({ onBack }: CollectionEMIReportProps) {
  const { isBranchUser, userBranch, selectedBranch: storeBranch } = useAuthStore()
  const initialBranch = (isBranchUser ? userBranch : storeBranch) || 'Namakkal'
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch)
  const [fromDate, setFromDate] = useState<string>('2026-09-01')
  const [toDate, setToDate] = useState<string>('2026-09-30')
  const [selectedQuickReport, setSelectedQuickReport] = useState<string | null>(null)

  // Fetch live real data from Supabase
  const { data: dbData, isLoading, refetch } = useQuery({
    queryKey: ['collectionEmiReportLiveDb', selectedBranch],
    queryFn: async () => {
      const safe = async <T,>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | []> => {
        const res = await p
        if (res.error) {
          console.warn('[Report] Query error:', res.error)
          return []
        }
        return res.data || []
      }

      const [loans, emiSchedule, payments, customers] = await Promise.all([
        safe(supabase.from('loans').select('*')),
        safe(supabase.from('emi_schedule').select('*').order('due_date', { ascending: true })),
        safe(supabase.from('emi_payments').select('*').order('payment_date', { ascending: false })),
        safe(supabase.from('customers').select('*')),
      ])

      return {
        loans: (loans as any[]) || [],
        emiSchedule: (emiSchedule as any[]) || [],
        payments: (payments as any[]) || [],
        customers: (customers as any[]) || [],
      }
    },
    staleTime: 10000,
  })

  // Format currency helper (₹ 12,45,000)
  const formatINR = (amt: number) => {
    return `₹ ${Number(amt || 0).toLocaleString('en-IN')}`
  }

  // Dynamically extract branch list
  const branchList = useMemo(() => {
    const set = new Set<string>(['Namakkal', 'Aniyapuram', 'Vallipuram'])
    dbData?.loans?.forEach(l => { if (l.branch) set.add(l.branch) })
    dbData?.customers?.forEach(c => { if (c.branch) set.add(c.branch) })
    return ['All Branches', ...Array.from(set)]
  }, [dbData])

  // Map customers for quick lookup
  const customerMap = useMemo(() => {
    const map = new Map<string, any>()
    dbData?.customers?.forEach(c => map.set(c.id, c))
    return map
  }, [dbData?.customers])

  // Map loans for quick lookup
  const loanMap = useMemo(() => {
    const map = new Map<string, any>()
    dbData?.loans?.forEach(l => map.set(l.id, l))
    return map
  }, [dbData?.loans])

  // Compute all metrics dynamically linked from DB fields
  const reportData = useMemo(() => {
    const loans = dbData?.loans || []
    const emiSchedule = dbData?.emiSchedule || []
    const payments = dbData?.payments || []

    const norm = (s?: string | null) => (s || '').toLowerCase().replace(/\s+branch$/i, '').trim()
    const isAll = !selectedBranch || selectedBranch === 'All Branches'
    const curBranchNorm = norm(selectedBranch)

    // 1. Filter loans by selected branch
    const branchLoans = loans.filter(l => isAll || norm(l.branch) === curBranchNorm)
    const branchLoanIds = new Set(branchLoans.map(l => l.id))

    // Loan Product lookup map
    const loanProductMap = new Map<string, string>()
    branchLoans.forEach(l => {
      const prod = l.loan_product || (l.loan_type === 'interest_only' ? 'Gold Loan' : 'Personal Loan')
      loanProductMap.set(l.id, prod)
    })

    const fromDj = dayjs(fromDate).startOf('day')
    const toDj = dayjs(toDate).endOf('day')

    // 2. Filter schedules and payments by branch and period
    const periodSchedules = emiSchedule.filter(s => {
      if (!branchLoanIds.has(s.loan_id)) return false
      if (!s.due_date) return false
      const dj = dayjs(s.due_date)
      return !dj.isBefore(fromDj) && !dj.isAfter(toDj)
    })

    const periodPayments = payments.filter(p => {
      if (!branchLoanIds.has(p.loan_id)) return false
      if (!p.payment_date) return false
      const dj = dayjs(p.payment_date)
      return !dj.isBefore(fromDj) && !dj.isAfter(toDj)
    })

    // ─── Column A: EMI & Demand Reports ───
    const totalEmiDue = periodSchedules.reduce((sum, s) => sum + Number(s.emi_amount || 0), 0)
    const totalEmiCount = periodSchedules.length
    const principalDue = periodSchedules.reduce((sum, s) => sum + Number(s.principal || 0), 0)
    const interestDue = periodSchedules.reduce((sum, s) => sum + Number(s.interest || 0), 0)

    // Product Wise EMI Due
    const productDueMap: Record<string, number> = {
      'Housing Loan': 0,
      'Personal Loan': 0,
      'Gold Loan': 0,
      'Business Loan': 0,
      'Vehicle Loan': 0,
    }
    periodSchedules.forEach(s => {
      const prod = loanProductMap.get(s.loan_id) || 'Personal Loan'
      productDueMap[prod] = (productDueMap[prod] || 0) + Number(s.emi_amount || 0)
    })

    const productColors: Record<string, string> = {
      'Housing Loan': '#3B82F6',
      'Personal Loan': '#F97316',
      'Gold Loan': '#10B981',
      'Business Loan': '#F59E0B',
      'Vehicle Loan': '#8B5CF6',
    }

    const formatShortINR = (amt: number) => {
      if (amt >= 100000) return `₹ ${(amt / 100000).toFixed(1)}L`
      if (amt >= 1000) return `₹ ${(amt / 1000).toFixed(0)}k`
      return `₹ ${amt}`
    }

    const productWiseDue = Object.keys(productDueMap).map(prod => ({
      product: prod,
      amount: productDueMap[prod],
      color: productColors[prod] || '#64748b',
      label: formatShortINR(productDueMap[prod]),
    }))

    // Upcoming EMI – Next 7 Days (ending on toDate)
    const upcomingEmi7Days = []
    for (let i = 6; i >= 0; i--) {
      const day = toDj.subtract(i, 'day')
      const dayStr = day.format('YYYY-MM-DD')
      const dayLabel = day.format('DD-MMM')
      const dayScheds = emiSchedule.filter(s => branchLoanIds.has(s.loan_id) && s.due_date === dayStr)
      const amt = dayScheds.reduce((sum, s) => sum + Number(s.emi_amount || 0), 0)
      const label = amt >= 100000 ? `${(amt / 100000).toFixed(1)}L` : (amt > 0 ? `₹${(amt / 1000).toFixed(0)}k` : '₹0')
      upcomingEmi7Days.push({
        day: dayLabel,
        amount: amt,
        label,
      })
    }

    // ─── Column B: Collection Reports ───
    const totalCollection = periodPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const totalReceiptsCount = periodPayments.length

    const cashCol = periodPayments.filter(p => p.payment_mode === 'cash').reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const upiCol = periodPayments.filter(p => p.payment_mode === 'upi').reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const bankCol = periodPayments.filter(p => ['bank', 'cheque', 'neft', 'nach'].includes((p.payment_mode || '').toLowerCase())).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

    const cashPct = totalCollection > 0 ? Math.round((cashCol / totalCollection) * 100) : 0
    const upiPct = totalCollection > 0 ? Math.round((upiCol / totalCollection) * 100) : 0
    const bankPct = totalCollection > 0 ? Math.max(0, 100 - cashPct - upiPct) : 0

    const paymentModes = [
      { name: 'Cash', value: cashPct, amount: cashCol, color: '#3B82F6' },
      { name: 'UPI', value: upiPct, amount: upiCol, color: '#F97316' },
      { name: 'Bank Transfer', value: bankPct, amount: bankCol, color: '#8B5CF6' },
    ]

    // Collection Trend – Last 7 Days (Demand vs Collection)
    const collectionTrend7Days = []
    for (let i = 6; i >= 0; i--) {
      const day = toDj.subtract(i, 'day')
      const dayStr = day.format('YYYY-MM-DD')
      const dayLabel = day.format('DD-MMM')
      const dDemand = emiSchedule.filter(s => branchLoanIds.has(s.loan_id) && s.due_date === dayStr).reduce((sum, s) => sum + Number(s.emi_amount || 0), 0)
      const dCol = payments.filter(p => branchLoanIds.has(p.loan_id) && p.payment_date === dayStr).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

      const demandLabel = dDemand >= 100000 ? `${(dDemand / 100000).toFixed(1)}L` : (dDemand > 0 ? `₹${(dDemand / 1000).toFixed(0)}k` : '₹0')
      const colLabel = dCol >= 100000 ? `${(dCol / 100000).toFixed(1)}L` : (dCol > 0 ? `₹${(dCol / 1000).toFixed(0)}k` : '₹0')

      collectionTrend7Days.push({
        day: dayLabel,
        demand: dDemand,
        collection: dCol,
        demandLabel,
        colLabel,
      })
    }

    // ─── Column C: Recovery & Follow-up Reports ───
    const overdueSchedules = emiSchedule.filter(s => {
      if (!branchLoanIds.has(s.loan_id)) return false
      if (!s.due_date) return false
      const isPastDue = dayjs(s.due_date).isBefore(toDj) || s.status === 'overdue'
      const unpaid = Number(s.emi_amount || 0) - Number(s.paid_amount || 0)
      return isPastDue && unpaid > 0
    })

    const totalOverdue = overdueSchedules.reduce((sum, s) => sum + Math.max(0, Number(s.emi_amount || 0) - Number(s.paid_amount || 0)), 0)
    const overdueLoansSet = new Set(overdueSchedules.map(s => s.loan_id))
    const totalOverdueAccounts = overdueLoansSet.size

    // Bucket calculation
    let ov1to30Amt = 0
    const ov1to30Loans = new Set<string>()
    let ov31to60Amt = 0
    const ov31to60Loans = new Set<string>()
    let ov61PlusAmt = 0
    const ov61PlusLoans = new Set<string>()

    overdueSchedules.forEach(s => {
      const unpaid = Math.max(0, Number(s.emi_amount || 0) - Number(s.paid_amount || 0))
      const days = Math.max(1, toDj.diff(dayjs(s.due_date), 'day'))
      if (days <= 30) {
        ov1to30Amt += unpaid
        ov1to30Loans.add(s.loan_id)
      } else if (days <= 60) {
        ov31to60Amt += unpaid
        ov31to60Loans.add(s.loan_id)
      } else {
        ov61PlusAmt += unpaid
        ov61PlusLoans.add(s.loan_id)
      }
    })

    const overdueAgeingBuckets = [
      {
        bucket: `1 – 30 Days\n(${ov1to30Loans.size} Accounts)`,
        amount: ov1to30Amt,
        color: '#10B981',
        label: formatShortINR(ov1to30Amt),
      },
      {
        bucket: `31 – 60 Days\n(${ov31to60Loans.size} Accounts)`,
        amount: ov31to60Amt,
        color: '#F59E0B',
        label: formatShortINR(ov31to60Amt),
      },
      {
        bucket: `61+ Days\n(${ov61PlusLoans.size} Accounts)`,
        amount: ov61PlusAmt,
        color: '#EF4444',
        label: formatShortINR(ov61PlusAmt),
      },
    ]

    // Overdue by Product
    const ovProductMap: Record<string, number> = {
      'Housing Loan': 0,
      'Personal Loan': 0,
      'Gold Loan': 0,
      'Business Loan': 0,
      'Vehicle Loan': 0,
    }
    overdueSchedules.forEach(s => {
      const prod = loanProductMap.get(s.loan_id) || 'Personal Loan'
      const unpaid = Math.max(0, Number(s.emi_amount || 0) - Number(s.paid_amount || 0))
      ovProductMap[prod] = (ovProductMap[prod] || 0) + unpaid
    })

    const overdueByProduct = Object.keys(ovProductMap).map(prod => {
      const amt = ovProductMap[prod]
      const pct = totalOverdue > 0 ? Math.round((amt / totalOverdue) * 100) : 0
      return {
        name: prod,
        amount: amt,
        pct,
        color: productColors[prod] || '#64748b',
      }
    })

    // ─── Bottom Bar: Today's Snapshot ───
    const toDateStr = toDj.format('YYYY-MM-DD')
    const todayScheds = emiSchedule.filter(s => branchLoanIds.has(s.loan_id) && s.due_date === toDateStr)
    const todayPays = payments.filter(p => branchLoanIds.has(p.loan_id) && p.payment_date === toDateStr)

    const todayDemand = todayScheds.reduce((sum, s) => sum + Number(s.emi_amount || 0), 0)
    const todayCollection = todayPays.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const todayEfficiency = todayDemand > 0 ? Number(((todayCollection / todayDemand) * 100).toFixed(1)) : (todayCollection > 0 ? 100 : 0)
    const receiptsToday = todayPays.length
    const newOverdueAccounts = todayScheds.filter(s => s.status === 'overdue').length

    return {
      totalEmiDue,
      totalEmiCount,
      principalDue,
      interestDue,
      productWiseDue,
      upcomingEmi7Days,
      totalCollection,
      totalReceiptsCount,
      cashCollection: cashCol,
      cashPct,
      upiCollection: upiCol,
      upiPct,
      bankCollection: bankCol,
      bankPct,
      paymentModes,
      collectionTrend7Days,
      totalOverdue,
      totalOverdueAccounts,
      ov1to30Amt,
      ov1to30Count: ov1to30Loans.size,
      ov31to60Amt,
      ov31to60Count: ov31to60Loans.size,
      ov61PlusAmt,
      ov61PlusCount: ov61PlusLoans.size,
      overdueAgeingBuckets,
      overdueByProduct,
      snapshotDate: toDj.format('DD-MMM-YYYY'),
      todayDemand,
      todayCollection,
      todayEfficiency,
      receiptsToday,
      newOverdueAccounts,
      rawLoans: branchLoans,
      rawSchedules: periodSchedules,
      rawPayments: periodPayments,
    }
  }, [dbData, selectedBranch, fromDate, toDate])

  // Custom tick for Product chart
  const renderProductTick = ({ x, y, payload }: any) => {
    const words = (payload.value || '').split(' ')
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={8} textAnchor="middle" fill="#475569" fontSize={8} fontWeight={600}>
          {words[0]}
        </text>
        {words.slice(1).join(' ') && (
          <text x={0} y={0} dy={17} textAnchor="middle" fill="#475569" fontSize={8} fontWeight={600}>
            {words.slice(1).join(' ')}
          </text>
        )}
      </g>
    )
  }

  // Custom tick for Ageing chart
  const renderAgeingTick = ({ x, y, payload }: any) => {
    const parts = (payload.value || '').split('\n')
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={8} textAnchor="middle" fill="#475569" fontSize={8} fontWeight={600}>
          {parts[0]}
        </text>
        {parts[1] && (
          <text x={0} y={0} dy={18} textAnchor="middle" fill="#64748b" fontSize={7} fontWeight={500}>
            {parts[1]}
          </text>
        )}
      </g>
    )
  }

  // Custom label inside donut slices
  const renderCustomizedDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    if (percent < 0.08) return null
    return (
      <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // Excel Export
  const handleExportExcel = () => {
    const data = [
      { Metric: 'Total EMI Due', Value: reportData.totalEmiDue, Count: `${reportData.totalEmiCount} EMIs` },
      { Metric: 'Principal Due', Value: reportData.principalDue, Count: '' },
      { Metric: 'Interest Due', Value: reportData.interestDue, Count: '' },
      { Metric: 'Total Collection', Value: reportData.totalCollection, Count: `${reportData.totalReceiptsCount} Receipts` },
      { Metric: 'Cash Collection', Value: reportData.cashCollection, Count: `${reportData.cashPct}%` },
      { Metric: 'UPI Collection', Value: reportData.upiCollection, Count: `${reportData.upiPct}%` },
      { Metric: 'Bank Transfer', Value: reportData.bankCollection, Count: `${reportData.bankPct}%` },
      { Metric: 'Total Overdue', Value: reportData.totalOverdue, Count: `${reportData.totalOverdueAccounts} Accounts` },
      { Metric: '1 - 30 Days Overdue', Value: reportData.ov1to30Amt, Count: `${reportData.ov1to30Count} Accounts` },
      { Metric: '31 - 60 Days Overdue', Value: reportData.ov31to60Amt, Count: `${reportData.ov31to60Count} Accounts` },
      { Metric: '61+ Days Overdue', Value: reportData.ov61PlusAmt, Count: `${reportData.ov61PlusCount} Accounts` },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Collection & EMI')
    XLSX.writeFile(wb, `Collection_EMI_Report_${selectedBranch}_${dayjs().format('YYYYMMDD')}.xlsx`)
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-100 rounded-xl border border-slate-200 text-slate-800 shadow-sm">
      
      {/* ─── Top Header Bar (Fixed / Compact) ─── */}
      <div className="bg-white px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        {/* Brand Logo & Back */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 relative flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#0284c7" strokeWidth="12" strokeDasharray="60 180" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#0d9488" strokeWidth="12" strokeDasharray="60 180" strokeDashoffset="-60" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray="60 180" strokeDashoffset="-120" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#2563eb" strokeWidth="12" strokeDasharray="60 180" strokeDashoffset="-180" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-black tracking-wider text-slate-900 leading-tight">CATALYST OS</div>
              <div className="text-[8px] font-bold text-slate-500 tracking-widest uppercase">FINANCIAL SERVICES</div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">Collection & EMI Reports</h1>
          <p className="text-[10px] text-slate-500">Track Demand, Collections and Recovery – At a Glance</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Branch */}
          <div className="flex flex-col">
            <span className="text-[9px] font-medium text-slate-500 mb-0.5">Branch</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[95px]"
            >
              {branchList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="flex flex-col">
            <span className="text-[9px] font-medium text-slate-500 mb-0.5">From Date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col">
            <span className="text-[9px] font-medium text-slate-500 mb-0.5">To Date</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors self-end mb-0.5"
            title="Export Excel"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Main 3 Columns (Strictly Non-Scrollable & Height-Constrained) ─── */}
      <div className="flex-1 min-h-0 p-2 overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 h-full">

          {/* ════════ COLUMN A: A. EMI & DEMAND REPORTS ════════ */}
          <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden flex flex-col h-full">
            {/* Header Banner */}
            <div className="bg-[#0052cc] px-3 py-1.5 text-white flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-6 rounded bg-white/15 flex items-center justify-center flex-shrink-0">
                <CalendarClock className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h2 className="text-[11px] font-extrabold tracking-wide uppercase leading-tight">A. EMI & DEMAND REPORTS</h2>
                <p className="text-[9px] text-white/85 leading-tight">What should be collected?</p>
              </div>
            </div>

            <div className="p-2 flex-1 min-h-0 flex flex-col justify-between gap-1 overflow-hidden">
              {/* Metric Cards */}
              <div className="grid grid-cols-3 gap-1.5 text-center flex-shrink-0">
                <div className="bg-blue-50/80 border border-blue-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">Total EMI Due</div>
                  <div className="text-[11px] font-black text-blue-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.totalEmiDue)}</div>
                  <div className="text-[8px] text-slate-500">({reportData.totalEmiCount} EMIs)</div>
                </div>
                <div className="bg-emerald-50/80 border border-emerald-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">Principal Due</div>
                  <div className="text-[11px] font-black text-emerald-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.principalDue)}</div>
                  <div className="text-[8px] text-transparent">.</div>
                </div>
                <div className="bg-amber-50/80 border border-amber-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">Interest Due</div>
                  <div className="text-[11px] font-black text-amber-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.interestDue)}</div>
                  <div className="text-[8px] text-transparent">.</div>
                </div>
              </div>

              {/* Chart 1: EMI Due – Product Wise */}
              <div className="flex flex-col">
                <h3 className="text-[10px] font-extrabold text-slate-800 mb-0.5">EMI Due – Product Wise</h3>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={reportData.productWiseDue} margin={{ top: 12, right: 5, left: -15, bottom: 20 }}>
                      <XAxis
                        dataKey="product"
                        tick={renderProductTick}
                        interval={0}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        tick={{ fontSize: 8, fill: '#64748b' }}
                        tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(0)}L` : (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}`}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                      />
                      <Tooltip formatter={(value: any) => [formatINR(value), 'EMI Due']} />
                      <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
                        <LabelList
                          dataKey="label"
                          position="top"
                          style={{ fontSize: '7.5px', fontWeight: 'bold', fill: '#1e293b' }}
                        />
                        {reportData.productWiseDue.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Upcoming EMI – Next 7 Days */}
              <div className="flex flex-col">
                <h3 className="text-[10px] font-extrabold text-slate-800 mb-0.5">Upcoming EMI – Next 7 Days</h3>
                <div className="h-[110px] w-full">
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={reportData.upcomingEmi7Days} margin={{ top: 12, right: 5, left: -15, bottom: 5 }}>
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 8, fill: '#475569', fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        tick={{ fontSize: 8, fill: '#64748b' }}
                        tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(0)}L` : (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}`}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                      />
                      <Tooltip formatter={(value: any) => [formatINR(value), 'Upcoming Due']} />
                      <Bar dataKey="amount" fill="#3B82F6" radius={[2, 2, 0, 0]}>
                        <LabelList
                          dataKey="label"
                          position="top"
                          style={{ fontSize: '8px', fontWeight: 'bold', fill: '#1e293b' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Reports Section */}
              <div className="flex-shrink-0 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-800 mb-1">
                  <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center">
                    <FileText className="w-2.5 h-2.5" />
                  </div>
                  <span>Quick Reports – EMI & Demand</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    'EMI / Demand Due Report',
                    'Product Wise EMI Report',
                    'Upcoming EMI Report',
                    'Missed Instalment Report',
                    'Demand Schedule',
                    'Customer EMI Statement',
                  ].map((rpt) => (
                    <button
                      key={rpt}
                      onClick={() => setSelectedQuickReport(rpt)}
                      className="flex items-center justify-between px-2 py-1 rounded border border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-200 text-left transition-colors group cursor-pointer shadow-2xs"
                    >
                      <span className="text-[9.5px] font-semibold text-slate-700 group-hover:text-blue-700 truncate">{rpt}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ════════ COLUMN B: B. COLLECTION REPORTS ════════ */}
          <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden flex flex-col h-full">
            {/* Header Banner */}
            <div className="bg-[#15803d] px-3 py-1.5 text-white flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-6 rounded bg-white/15 flex items-center justify-center flex-shrink-0">
                <Coins className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h2 className="text-[11px] font-extrabold tracking-wide uppercase leading-tight">B. COLLECTION REPORTS</h2>
                <p className="text-[9px] text-white/85 leading-tight">What has actually been collected?</p>
              </div>
            </div>

            <div className="p-2 flex-1 min-h-0 flex flex-col justify-between gap-1 overflow-hidden">
              {/* Metric Cards */}
              <div className="grid grid-cols-4 gap-1 text-center flex-shrink-0">
                <div className="bg-emerald-50/80 border border-emerald-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">Total Collection</div>
                  <div className="text-[11px] font-black text-emerald-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.totalCollection)}</div>
                  <div className="text-[8px] text-slate-500">({reportData.totalReceiptsCount} Receipts)</div>
                </div>
                <div className="bg-blue-50/80 border border-blue-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">Cash</div>
                  <div className="text-[11px] font-black text-blue-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.cashCollection)}</div>
                  <div className="text-[8px] text-slate-500">({reportData.cashPct}%)</div>
                </div>
                <div className="bg-amber-50/80 border border-amber-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">UPI</div>
                  <div className="text-[11px] font-black text-amber-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.upiCollection)}</div>
                  <div className="text-[8px] text-slate-500">({reportData.upiPct}%)</div>
                </div>
                <div className="bg-purple-50/80 border border-purple-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">Bank Transfer</div>
                  <div className="text-[11px] font-black text-purple-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.bankCollection)}</div>
                  <div className="text-[8px] text-slate-500">({reportData.bankPct}%)</div>
                </div>
              </div>

              {/* Chart 1: Collection by Payment Mode Donut */}
              <div className="flex flex-col">
                <h3 className="text-[10px] font-extrabold text-slate-800 mb-0.5">Collection by Payment Mode</h3>
                <div className="h-[120px] flex items-center justify-between gap-1 w-full">
                  <div className="w-1/2 h-full relative">
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={reportData.paymentModes}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          label={renderCustomizedDonutLabel}
                          labelLine={false}
                        >
                          {reportData.paymentModes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any, name: any) => [`${value}%`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-[10px] font-black text-slate-900 leading-tight">
                        {formatINR(reportData.totalCollection)}
                      </div>
                      <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tighter">
                        Total
                      </div>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className="w-1/2 space-y-1.5 pr-1">
                    {reportData.paymentModes.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-[9.5px]">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold text-slate-700 truncate max-w-[65px]">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900 font-mono">{formatINR(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart 2: Collection Trend – Last 7 Days (Grouped Bar Chart) */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-[10px] font-extrabold text-slate-800">Collection Trend – Last 7 Days</h3>
                  <div className="flex items-center gap-2 text-[8px] font-bold">
                    <span className="flex items-center gap-0.5 text-slate-600">
                      <span className="w-1.5 h-1.5 rounded bg-[#3B82F6]" /> Demand
                    </span>
                    <span className="flex items-center gap-0.5 text-slate-600">
                      <span className="w-1.5 h-1.5 rounded bg-[#10B981]" /> Coll
                    </span>
                  </div>
                </div>
                <div className="h-[110px] w-full">
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={reportData.collectionTrend7Days} margin={{ top: 10, right: 5, left: -15, bottom: 5 }}>
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 8, fill: '#475569', fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        tick={{ fontSize: 8, fill: '#64748b' }}
                        tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(0)}L` : (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}`}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                      />
                      <Tooltip formatter={(value: any, name: any) => [formatINR(value), name === 'demand' ? 'Demand Due' : 'Collection']} />
                      <Bar dataKey="demand" fill="#3B82F6" radius={[2, 2, 0, 0]}>
                        <LabelList dataKey="demandLabel" position="top" style={{ fontSize: '7px', fontWeight: 'bold', fill: '#1e293b' }} />
                      </Bar>
                      <Bar dataKey="collection" fill="#10B981" radius={[2, 2, 0, 0]}>
                        <LabelList dataKey="colLabel" position="top" style={{ fontSize: '7px', fontWeight: 'bold', fill: '#1e293b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Reports Section */}
              <div className="flex-shrink-0 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-800 mb-1">
                  <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center">
                    <Coins className="w-2.5 h-2.5" />
                  </div>
                  <span>Quick Reports – Collection</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    'Daily Collection Register',
                    'Principal & Interest Report',
                    'Collection Summary – Branch',
                    'Payment Mode Report',
                    'Collection Efficiency Report',
                    'Unadjusted / Excess Collection',
                  ].map((rpt) => (
                    <button
                      key={rpt}
                      onClick={() => setSelectedQuickReport(rpt)}
                      className="flex items-center justify-between px-2 py-1 rounded border border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-200 text-left transition-colors group cursor-pointer shadow-2xs"
                    >
                      <span className="text-[9.5px] font-semibold text-slate-700 group-hover:text-emerald-700 truncate">{rpt}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ════════ COLUMN C: C. RECOVERY & FOLLOW-UP REPORTS ════════ */}
          <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden flex flex-col h-full">
            {/* Header Banner */}
            <div className="bg-[#c2410c] px-3 py-1.5 text-white flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-6 rounded bg-white/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h2 className="text-[11px] font-extrabold tracking-wide uppercase leading-tight">C. RECOVERY & FOLLOW-UP REPORTS</h2>
                <p className="text-[9px] text-white/85 leading-tight">What needs action?</p>
              </div>
            </div>

            <div className="p-2 flex-1 min-h-0 flex flex-col justify-between gap-1 overflow-hidden">
              {/* Metric Cards */}
              <div className="grid grid-cols-4 gap-1 text-center flex-shrink-0">
                <div className="bg-rose-50/80 border border-rose-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">Total Overdue</div>
                  <div className="text-[11px] font-black text-rose-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.totalOverdue)}</div>
                  <div className="text-[8px] text-slate-500">({reportData.totalOverdueAccounts} Accounts)</div>
                </div>
                <div className="bg-emerald-50/80 border border-emerald-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">1 – 30 Days</div>
                  <div className="text-[11px] font-black text-emerald-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.ov1to30Amt)}</div>
                  <div className="text-[8px] text-slate-500">({reportData.ov1to30Count} A/cs)</div>
                </div>
                <div className="bg-blue-50/80 border border-blue-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">31 – 60 Days</div>
                  <div className="text-[11px] font-black text-blue-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.ov31to60Amt)}</div>
                  <div className="text-[8px] text-slate-500">({reportData.ov31to60Count} A/cs)</div>
                </div>
                <div className="bg-purple-50/80 border border-purple-100 rounded-md p-1 flex flex-col justify-between">
                  <div className="text-[9px] font-semibold text-slate-600 leading-tight">61+ Days</div>
                  <div className="text-[11px] font-black text-purple-900 mt-0.5 whitespace-nowrap">{formatINR(reportData.ov61PlusAmt)}</div>
                  <div className="text-[8px] text-slate-500">({reportData.ov61PlusCount} A/cs)</div>
                </div>
              </div>

              {/* Chart 1: Overdue by Ageing Bucket */}
              <div className="flex flex-col">
                <h3 className="text-[10px] font-extrabold text-slate-800 mb-0.5">Overdue by Ageing Bucket</h3>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={reportData.overdueAgeingBuckets} margin={{ top: 12, right: 5, left: -15, bottom: 20 }}>
                      <XAxis
                        dataKey="bucket"
                        tick={renderAgeingTick}
                        interval={0}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        tick={{ fontSize: 8, fill: '#64748b' }}
                        tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(0)}L` : (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}`}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                      />
                      <Tooltip formatter={(value: any) => [formatINR(value), 'Overdue Amount']} />
                      <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
                        <LabelList
                          dataKey="label"
                          position="top"
                          style={{ fontSize: '7.5px', fontWeight: 'bold', fill: '#1e293b' }}
                        />
                        {reportData.overdueAgeingBuckets.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Overdue by Product Donut */}
              <div className="flex flex-col">
                <h3 className="text-[10px] font-extrabold text-slate-800 mb-0.5">Overdue by Product</h3>
                <div className="h-[120px] flex items-center justify-between gap-1 w-full">
                  <div className="w-1/2 h-full relative">
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={reportData.overdueByProduct}
                          dataKey="pct"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          label={renderCustomizedDonutLabel}
                          labelLine={false}
                        >
                          {reportData.overdueByProduct.map((entry, index) => (
                            <Cell key={`cell-ov-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any, name: any) => [`${value}%`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-[10px] font-black text-slate-900 leading-tight">
                        {formatINR(reportData.totalOverdue)}
                      </div>
                      <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tighter">
                        Overdue
                      </div>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className="w-1/2 space-y-1.5 pr-1">
                    {reportData.overdueByProduct.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-[9px]">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold text-slate-700 truncate max-w-[65px]">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900 font-mono">{formatINR(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Reports Section */}
              <div className="flex-shrink-0 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-800 mb-1">
                  <div className="w-4 h-4 rounded bg-[#c2410c] text-white flex items-center justify-center">
                    <Users className="w-2.5 h-2.5" />
                  </div>
                  <span>Quick Reports – Recovery & Follow-up</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    'Overdue Ageing Report',
                    'Promise-to-Pay Report',
                    'Customer Overdue List',
                    'Part-Payment / Short-Payment',
                    'Collection Follow-up Report',
                    'Recovery Staff Performance',
                  ].map((rpt) => (
                    <button
                      key={rpt}
                      onClick={() => setSelectedQuickReport(rpt)}
                      className="flex items-center justify-between px-2 py-1 rounded border border-slate-200 bg-white hover:bg-rose-50/50 hover:border-rose-200 text-left transition-colors group cursor-pointer shadow-2xs"
                    >
                      <span className="text-[9.5px] font-semibold text-slate-700 group-hover:text-rose-700 truncate">{rpt}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-rose-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Bottom Bar: Today's Snapshot (Fixed / Compact) ─── */}
      <div className="bg-white border-t border-slate-200 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[11px] font-black text-slate-900 tracking-tight leading-tight">Today's Snapshot</div>
            <div className="text-[9px] font-semibold text-slate-500">{reportData.snapshotDate}</div>
          </div>
        </div>

        {/* 5 Metric Badges */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-end max-w-4xl">
          <div className="bg-blue-50/80 border border-blue-100 rounded-md px-2.5 py-0.5 text-center min-w-[115px]">
            <div className="text-[11px] font-black text-blue-900">{formatINR(reportData.todayDemand)}</div>
            <div className="text-[8px] font-semibold text-slate-500">Today's Demand</div>
          </div>
          <div className="bg-emerald-50/80 border border-emerald-100 rounded-md px-2.5 py-0.5 text-center min-w-[115px]">
            <div className="text-[11px] font-black text-emerald-900">{formatINR(reportData.todayCollection)}</div>
            <div className="text-[8px] font-semibold text-slate-500">Today's Collection</div>
          </div>
          <div className="bg-amber-50/80 border border-amber-100 rounded-md px-2.5 py-0.5 text-center min-w-[130px]">
            <div className="text-[11px] font-black text-amber-900">{reportData.todayEfficiency}%</div>
            <div className="text-[8px] font-semibold text-slate-500">Collection Efficiency</div>
          </div>
          <div className="bg-purple-50/80 border border-purple-100 rounded-md px-2.5 py-0.5 text-center min-w-[95px]">
            <div className="text-[11px] font-black text-purple-900">{reportData.receiptsToday}</div>
            <div className="text-[8px] font-semibold text-slate-500">Receipts Today</div>
          </div>
          <div className="bg-rose-50/80 border border-rose-100 rounded-md px-2.5 py-0.5 text-center min-w-[115px]">
            <div className="text-[11px] font-black text-rose-900">{reportData.newOverdueAccounts}</div>
            <div className="text-[8px] font-semibold text-slate-500">New Overdue Accounts</div>
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
              <span>Branch: <strong>{selectedBranch}</strong> • Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong></span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">Live DB Linked</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[350px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Loan No</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">EMI Amount</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.rawLoans.length > 0 ? (
                    reportData.rawLoans.map((l: any, i: number) => {
                      const cust = customerMap.get(l.customer_id)
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-bold text-blue-600">{l.loan_number}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{cust?.name || 'Customer'}</td>
                          <td className="px-3 py-2 text-slate-600">{l.loan_product || l.loan_type}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">{formatINR(l.emi_amount)}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">{formatINR(l.remaining_balance)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              l.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {l.status}
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
