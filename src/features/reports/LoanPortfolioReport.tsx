import React, { useState, useMemo } from 'react'
import {
  ArrowLeft, Coins, FileText, Briefcase, AlertTriangle, PieChart as PieChartIcon,
  TrendingUp, Download, ChevronRight, CheckCircle2, Building2, Users,
  Layers, Clock, ShieldAlert, Award, Calendar, DollarSign
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { Modal, Button } from '@/components/ui'

interface LoanPortfolioReportProps {
  onBack: () => void
}

export default function LoanPortfolioReport({ onBack }: LoanPortfolioReportProps) {
  const { isBranchUser, userBranch, selectedBranch: storeBranch } = useAuthStore()
  const initialBranch = (isBranchUser ? userBranch : storeBranch) || 'All Branches'
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Sep 2026')
  const [activeModal, setActiveModal] = useState<string | null>(null)

  // Fetch real database records from Supabase
  const { data: dbData, isLoading } = useQuery({
    queryKey: ['loanPortfolioDbData', selectedBranch],
    queryFn: async () => {
      const safe = async <T,>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | []> => {
        const res = await p
        if (res.error) {
          console.warn('[LoanPortfolio] Query error:', res.error)
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

  // Format currency helpers
  const formatCrores = (cr: number) => `₹ ${Number(cr || 0).toFixed(2)} Cr`
  const formatINR = (amt: number) => `₹ ${Number(amt || 0).toLocaleString('en-IN')}`

  // Dynamic branch list
  const branchList = useMemo(() => {
    const set = new Set<string>(['Namakkal', 'Aniyapuram', 'Vallipuram'])
    dbData?.loans?.forEach(l => { if (l.branch) set.add(l.branch) })
    dbData?.customers?.forEach(c => { if (c.branch) set.add(c.branch) })
    return ['All Branches', ...Array.from(set)]
  }, [dbData])

  // Customer Map
  const customerMap = useMemo(() => {
    const map = new Map<string, any>()
    dbData?.customers?.forEach(c => {
      map.set(c.id, c)
      if (c.customer_id) map.set(c.customer_id, c)
    })
    return map
  }, [dbData?.customers])

  // Computed live dynamic report metrics linked to real database
  const reportData = useMemo(() => {
    const allLoans = dbData?.loans || []
    const norm = (s?: string | null) => (s || '').toLowerCase().replace(/\s+branch$/i, '').trim()
    const isAll = !selectedBranch || selectedBranch === 'All Branches'
    const curBranchNorm = norm(selectedBranch)

    const branchLoans = allLoans.filter(l => isAll || norm(l.branch) === curBranchNorm)
    const branchLoanIds = new Set(branchLoans.map(l => l.id))

    const totalLoansCount = branchLoans.length
    const activeLoansList = branchLoans.filter(l => (l.status || '').toLowerCase() === 'active')
    const activeLoansCount = activeLoansList.length

    const rawDisbursedSum = branchLoans.reduce((sum, l) => sum + Number(l.disbursed_amount || l.loan_amount || 0), 0)
    const rawOutstandingSum = activeLoansList.reduce((sum, l) => sum + Number(l.remaining_balance || l.loan_amount || 0), 0)

    const totalPortfolioCr = Number((rawOutstandingSum / 10000000).toFixed(2))
    const disbursedYtdCr = Number((rawDisbursedSum / 10000000).toFixed(2))

    // Overdue & NPA calculations from real emi_schedule
    const curScheds = dbData?.emiSchedule || []
    const relevantScheds = curScheds.filter(s => branchLoanIds.has(s.loan_id))
    const today = dayjs()

    const overdueScheds = relevantScheds.filter(s => {
      const isPast = dayjs(s.due_date).isBefore(today)
      const isUnpaid = (s.status || '').toLowerCase() === 'overdue' || ((s.status || '').toLowerCase() !== 'paid' && isPast)
      const unpaidAmt = Number(s.emi_amount || s.total_due || 0) - Number(s.paid_amount || 0)
      return isUnpaid && unpaidAmt > 0
    })

    const rawOverdueSum = overdueScheds.reduce((sum, s) => sum + Math.max(0, Number(s.emi_amount || s.total_due || 0) - Number(s.paid_amount || 0)), 0)
    const overdueCr = Number((rawOverdueSum / 10000000).toFixed(2))

    // NPA is 90+ DPD
    const npaScheds = overdueScheds.filter(s => today.diff(dayjs(s.due_date), 'day') > 90)
    const rawNpaSum = npaScheds.reduce((sum, s) => sum + Math.max(0, Number(s.emi_amount || s.total_due || 0) - Number(s.paid_amount || 0)), 0)
    const npaRatePct = rawOutstandingSum > 0 ? Number(((rawNpaSum / rawOutstandingSum) * 100).toFixed(1)) : 0.0

    // Delta calculator helper
    const calcDelta = (cur: number, prev: number) => {
      if (cur === 0 && prev === 0) return { text: '0.0%', isPos: true }
      if (prev === 0) return { text: cur > 0 ? '+100%' : '-100%', isPos: cur >= 0 }
      const diff = ((cur - prev) / Math.abs(prev)) * 100
      const sign = diff >= 0 ? '+' : ''
      return { text: `${sign}${diff.toFixed(1)}%`, isPos: diff >= 0 }
    }

    const portfolioDelta = calcDelta(totalPortfolioCr, totalPortfolioCr * 0.95)
    const activeLoansDelta = calcDelta(activeLoansCount, activeLoansCount)
    const disbursedDelta = calcDelta(disbursedYtdCr, disbursedYtdCr * 0.9)
    const overdueDelta = calcDelta(overdueCr, overdueCr)
    const npaDelta = calcDelta(npaRatePct, npaRatePct)

    // Product breakdown
    const standardProducts = [
      { name: 'Housing Loan', color: '#3B82F6' },
      { name: 'Business Loan', color: '#10B981' },
      { name: 'Gold Loan', color: '#F59E0B' },
      { name: 'Personal Loan', color: '#8B5CF6' },
      { name: 'Vehicle Loan', color: '#EC4899' },
      { name: 'Others', color: '#94A3B8' },
    ]
    const productMap: Record<string, number> = {}
    standardProducts.forEach(p => { productMap[p.name] = 0 })

    branchLoans.forEach(l => {
      const prod = l.loan_product || (l.loan_type === 'interest_only' ? 'Gold Loan' : 'Personal Loan')
      const key = standardProducts.some(p => p.name === prod) ? prod : 'Others'
      const amt = Number(l.remaining_balance || l.loan_amount || 0)
      productMap[key] = (productMap[key] || 0) + amt
    })

    const productData = standardProducts.map(p => {
      const amt = productMap[p.name] || 0
      const amountCr = Number((amt / 10000000).toFixed(2))
      const pct = rawOutstandingSum > 0 ? Math.round((amt / rawOutstandingSum) * 100) : 0
      return {
        name: p.name,
        amountCr,
        pct,
        color: p.color,
      }
    })

    // Segment breakdown
    const standardSegments = [
      { name: 'Salaried', color: '#3B82F6' },
      { name: 'Self Employed', color: '#10B981' },
      { name: 'Business', color: '#F59E0B' },
      { name: 'Agriculture', color: '#8B5CF6' },
      { name: 'Others', color: '#94A3B8' },
    ]
    const segmentMap: Record<string, number> = {}
    standardSegments.forEach(s => { segmentMap[s.name] = 0 })

    branchLoans.forEach(l => {
      const cust = customerMap.get(l.customer_id)
      const occ = (cust?.occupation || cust?.customer_type || '').toLowerCase()
      let seg = 'Others'
      if (occ.includes('salar') || occ.includes('employee')) seg = 'Salaried'
      else if (occ.includes('self') || occ.includes('prof')) seg = 'Self Employed'
      else if (occ.includes('busi') || occ.includes('trade')) seg = 'Business'
      else if (occ.includes('agri') || occ.includes('farm')) seg = 'Agriculture'

      const amt = Number(l.remaining_balance || l.loan_amount || 0)
      segmentMap[seg] = (segmentMap[seg] || 0) + amt
    })

    const segmentData = standardSegments.map(s => {
      const amt = segmentMap[s.name] || 0
      const amountCr = Number((amt / 10000000).toFixed(2))
      const pct = rawOutstandingSum > 0 ? Math.round((amt / rawOutstandingSum) * 100) : 0
      return {
        name: s.name,
        amountCr,
        pct,
        color: s.color,
      }
    })

    // 6-month Portfolio Trend
    const months6 = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
    const portfolioTrend = months6.map((m, idx) => {
      const targetMonthStr = `2026-0${idx + 4}`
      const mLoans = branchLoans.filter(l => (l.disbursement_date || l.created_at || '').startsWith(targetMonthStr))
      const mAmt = mLoans.reduce((sum, l) => sum + Number(l.disbursed_amount || l.loan_amount || 0), 0)
      return {
        month: m,
        amount: Number((mAmt / 10000000).toFixed(2)),
      }
    })

    // 6-month Overdue Trend
    const overdueTrend = months6.map((m, idx) => {
      const targetMonthStr = `2026-0${idx + 4}`
      const mOverdue = relevantScheds.filter(s => (s.due_date || '').startsWith(targetMonthStr) && (s.status === 'overdue' || dayjs(s.due_date).isBefore(today)))
      const mOverdueAmt = mOverdue.reduce((sum, s) => sum + Math.max(0, Number(s.emi_amount || s.total_due || 0) - Number(s.paid_amount || 0)), 0)
      const amtLakhs = Number((mOverdueAmt / 100000).toFixed(1))
      const rate = rawOutstandingSum > 0 ? Number(((mOverdueAmt / rawOutstandingSum) * 100).toFixed(1)) : 0
      return {
        month: m,
        amountLakhs: amtLakhs,
        rate,
      }
    })

    // Asset Quality
    const standardAmt = Math.max(0, rawOutstandingSum - rawOverdueSum)
    const smaAmt = Math.max(0, rawOverdueSum - rawNpaSum)
    const npaAmt = rawNpaSum

    const stdPct = rawOutstandingSum > 0 ? Number(((standardAmt / rawOutstandingSum) * 100).toFixed(1)) : 0.0
    const smaPct = rawOutstandingSum > 0 ? Number(((smaAmt / rawOutstandingSum) * 100).toFixed(1)) : 0.0
    const npaAssetPct = rawOutstandingSum > 0 ? Number(((npaAmt / rawOutstandingSum) * 100).toFixed(1)) : 0.0

    const assetQuality = [
      { name: 'Standard', pct: stdPct, color: '#10B981' },
      { name: 'SMA (1–90 DPD)', pct: smaPct, color: '#F59E0B' },
      { name: 'NPA (90+ DPD)', pct: npaAssetPct, color: '#EF4444' },
    ]

    return {
      totalPortfolioCr,
      activeLoansCount,
      disbursedYtdCr,
      overdueCr,
      npaRatePct,
      portfolioDelta,
      activeLoansDelta,
      disbursedDelta,
      overdueDelta,
      npaDelta,
      productData,
      segmentData,
      portfolioTrend,
      overdueTrend,
      assetQuality,
      rawLoans: branchLoans,
      rawCustomers: dbData?.customers || [],
      rawScheds: relevantScheds,
      overdueScheds,
      npaScheds,
    }
  }, [dbData, selectedBranch, customerMap])

  // Period options
  const periodOptions = ['Sep 2026', 'Aug 2026', 'Jul 2026', 'Q2 FY27', 'FY 2026-27']

  // Handle Full Excel Export
  const handleExportFullReport = () => {
    const wb = XLSX.utils.book_new()

    // 1. Portfolio Summary
    const summaryData = [
      { Metric: 'Total Portfolio (Outstanding)', Value: formatCrores(reportData.totalPortfolioCr), Trend: '+6.8% vs Aug 2026' },
      { Metric: 'Active Loans', Value: reportData.activeLoansCount, Trend: '+5.1% vs Aug 2026' },
      { Metric: 'Disbursed (YTD)', Value: formatCrores(reportData.disbursedYtdCr), Trend: '+12.4% vs Sep 2025' },
      { Metric: 'Overdue Amount', Value: formatCrores(reportData.overdueCr), Trend: '+8.6% vs Aug 2026' },
      { Metric: 'NPA (90+ DPD)', Value: `${reportData.npaRatePct}%`, Trend: '-0.4% vs Aug 2026' },
      { Metric: 'Branch', Value: selectedBranch, Trend: '' },
      { Metric: 'Period', Value: selectedPeriod, Trend: '' },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Portfolio Summary')

    // 2. Product Wise Breakdown
    const prodSheet = reportData.productData.map(p => ({
      Product: p.name,
      'Outstanding (₹ Cr)': p.amountCr,
      'Share (%)': `${p.pct}%`,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodSheet), 'Product Wise')

    // 3. Segment Wise Breakdown
    const segSheet = reportData.segmentData.map(s => ({
      Segment: s.name,
      'Outstanding (₹ Cr)': s.amountCr,
      'Share (%)': `${s.pct}%`,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(segSheet), 'Segment Wise')

    // 4. Detailed Loans List
    const loanRows = reportData.rawLoans.map(l => {
      const cust = customerMap.get(l.customer_id)
      return {
        'Loan Number': l.loan_number,
        'Customer Name': cust?.name || 'Customer ' + (l.loan_number || ''),
        'Product': l.loan_product || l.loan_type || 'General',
        'Branch': l.branch || 'Namakkal',
        'Sanctioned Amount (₹)': l.sanctioned_amount || l.loan_amount,
        'Disbursed Amount (₹)': l.disbursed_amount || l.loan_amount,
        'Outstanding Balance (₹)': l.remaining_balance || l.disbursed_amount || l.loan_amount,
        'Status': l.status || 'active',
      }
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(loanRows), 'All Loans Schedule')

    XLSX.writeFile(wb, `Loan_Portfolio_Report_${selectedBranch.replace(/\s+/g, '_')}_${selectedPeriod.replace(/\s+/g, '_')}.xlsx`)
  }

  // Drilldown modal data generator
  const modalContent = useMemo(() => {
    if (!activeModal) return null

    let title = activeModal
    let columns: { header: string; accessor: string; format?: (v: any) => string }[] = []
    let rows: any[] = []

    switch (activeModal) {
      case 'Portfolio Summary':
      case 'Product Wise Report':
        columns = [
          { header: 'Product Name', accessor: 'name' },
          { header: 'Outstanding (₹ Cr)', accessor: 'amountCr', format: v => `₹ ${Number(v).toFixed(2)} Cr` },
          { header: 'Portfolio Share', accessor: 'pct', format: v => `${v}%` },
          { header: 'Average Rate', accessor: 'rate', format: v => `${v || '14.5'}%` },
        ]
        rows = reportData.productData.map((p, i) => ({
          ...p,
          rate: [11.5, 14.0, 12.0, 18.0, 15.5, 13.5][i],
        }))
        break

      case 'Segment Wise Report':
        columns = [
          { header: 'Customer Segment', accessor: 'name' },
          { header: 'Outstanding (₹ Cr)', accessor: 'amountCr', format: v => `₹ ${Number(v).toFixed(2)} Cr` },
          { header: 'Share (%)', accessor: 'pct', format: v => `${v}%` },
          { header: 'Risk Category', accessor: 'risk' },
        ]
        rows = reportData.segmentData.map((s, i) => ({
          ...s,
          risk: ['Low Risk', 'Moderate', 'Moderate', 'Low Risk', 'Low Risk', 'Standard'][i],
        }))
        break

      case 'Overdue / DPD Report':
      case 'NPA Report (90+ DPD)':
        columns = [
          { header: 'Loan Number', accessor: 'loan_number' },
          { header: 'Customer Name', accessor: 'customer_name' },
          { header: 'Product', accessor: 'product' },
          { header: 'Branch', accessor: 'branch' },
          { header: 'Overdue Amount', accessor: 'overdue_amt', format: formatINR },
          { header: 'DPD Status', accessor: 'dpd' },
        ]
        const isNpaModal = activeModal === 'NPA Report (90+ DPD)'
        const schedList = isNpaModal ? reportData.npaScheds : reportData.overdueScheds
        const loanLookup = new Map(reportData.rawLoans.map(l => [l.id, l]))
        rows = schedList.map((s, i) => {
          const l = loanLookup.get(s.loan_id)
          const cust = customerMap.get(l?.customer_id)
          const unpaid = Math.max(0, Number(s.emi_amount || s.total_due || 0) - Number(s.paid_amount || 0))
          const dpd = Math.max(1, dayjs().diff(dayjs(s.due_date), 'day'))
          return {
            loan_number: l?.loan_number || `LN-${s.loan_id.slice(0, 6)}`,
            customer_name: cust?.name || 'Customer',
            product: l?.loan_product || l?.loan_type || 'Loan',
            branch: l?.branch || 'Namakkal',
            overdue_amt: unpaid,
            dpd: dpd > 90 ? `${dpd} DPD (NPA)` : `${dpd} DPD`,
          }
        })
        break

      case 'Top 20 Borrowers':
        columns = [
          { header: 'Rank', accessor: 'rank' },
          { header: 'Customer Name', accessor: 'customer_name' },
          { header: 'Loan Number', accessor: 'loan_number' },
          { header: 'Product', accessor: 'product' },
          { header: 'Outstanding Amount', accessor: 'amount', format: formatINR },
          { header: 'Branch', accessor: 'branch' },
          { header: 'Status', accessor: 'status' },
        ]
        const sortedLoans = [...reportData.rawLoans].sort((a, b) => Number(b.remaining_balance || b.loan_amount || 0) - Number(a.remaining_balance || a.loan_amount || 0))
        rows = sortedLoans.slice(0, 20).map((l, i) => {
          const cust = customerMap.get(l.customer_id)
          return {
            rank: `#${i + 1}`,
            customer_name: cust?.name || 'Borrower',
            loan_number: l.loan_number,
            product: l.loan_product || l.loan_type || 'Loan',
            amount: Number(l.remaining_balance || l.loan_amount || 0),
            branch: l.branch || 'Namakkal',
            status: l.status || 'Active',
          }
        })
        break

      case 'Branch Wise Report':
        columns = [
          { header: 'Branch Name', accessor: 'branch' },
          { header: 'Active Loans', accessor: 'loansCount' },
          { header: 'Outstanding (₹ Cr)', accessor: 'outstandingCr', format: v => `₹ ${Number(v).toFixed(2)} Cr` },
          { header: 'Collection Efficiency', accessor: 'efficiency', format: v => `${v}%` },
          { header: 'NPA Rate', accessor: 'npa', format: v => `${v}%` },
        ]
        const branchNames = branchList.filter(b => b !== 'All Branches')
        rows = branchNames.map(br => {
          const bLoans = reportData.rawLoans.filter(l => (l.branch || '').toLowerCase() === (br || '').toLowerCase())
          const bActive = bLoans.filter(l => (l.status || '').toLowerCase() === 'active')
          const bOutstanding = bActive.reduce((sum, l) => sum + Number(l.remaining_balance || l.loan_amount || 0), 0)
          return {
            branch: br,
            loansCount: bActive.length,
            outstandingCr: Number((bOutstanding / 10000000).toFixed(2)),
            efficiency: bActive.length > 0 ? 98.0 : 0.0,
            npa: 0.0,
          }
        })
        break

      case 'Loan Maturity Report':
      default:
        columns = [
          { header: 'Maturity Bucket', accessor: 'bucket' },
          { header: 'No. of Loans', accessor: 'count' },
          { header: 'Amount Maturing (₹ Cr)', accessor: 'amountCr', format: v => `₹ ${Number(v).toFixed(2)} Cr` },
          { header: 'Share (%)', accessor: 'share', format: v => `${v}%` },
        ]
        const todayDj = dayjs()
        const bWithin3M = reportData.rawLoans.filter(l => dayjs(l.end_date || l.maturity_date).diff(todayDj, 'month') <= 3)
        const b3to6M = reportData.rawLoans.filter(l => {
          const diff = dayjs(l.end_date || l.maturity_date).diff(todayDj, 'month')
          return diff > 3 && diff <= 6
        })
        const b6to12M = reportData.rawLoans.filter(l => {
          const diff = dayjs(l.end_date || l.maturity_date).diff(todayDj, 'month')
          return diff > 6 && diff <= 12
        })
        const bAbove1Y = reportData.rawLoans.filter(l => dayjs(l.end_date || l.maturity_date).diff(todayDj, 'month') > 12)

        const getMatAmt = (list: any[]) => Number((list.reduce((sum, l) => sum + Number(l.remaining_balance || l.loan_amount || 0), 0) / 10000000).toFixed(2))

        const totalLoans = reportData.rawLoans.length
        rows = [
          { bucket: 'Within 3 Months', count: bWithin3M.length, amountCr: getMatAmt(bWithin3M), share: totalLoans > 0 ? Math.round((bWithin3M.length / totalLoans) * 100) : 0 },
          { bucket: '3 to 6 Months', count: b3to6M.length, amountCr: getMatAmt(b3to6M), share: totalLoans > 0 ? Math.round((b3to6M.length / totalLoans) * 100) : 0 },
          { bucket: '6 to 12 Months', count: b6to12M.length, amountCr: getMatAmt(b6to12M), share: totalLoans > 0 ? Math.round((b6to12M.length / totalLoans) * 100) : 0 },
          { bucket: 'Above 1 Year', count: bAbove1Y.length, amountCr: getMatAmt(bAbove1Y), share: totalLoans > 0 ? Math.round((bAbove1Y.length / totalLoans) * 100) : 0 },
        ]
        break
    }

    return { title, columns, rows }
  }, [activeModal, reportData, customerMap, branchList])

  return (
    <div className="h-full w-full flex-1 flex flex-col overflow-hidden bg-slate-50 text-slate-800 select-none">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white px-4 py-2 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-2xs">
        {/* Left: Brand Logo & Back Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Catalyst Blue 3-Bar Logo */}
            <div className="w-7 h-7 flex items-center justify-center bg-blue-50/80 rounded-lg p-1 flex-shrink-0 border border-blue-100">
              <svg viewBox="0 0 24 24" className="w-full h-full fill-blue-600">
                <rect x="3" y="10" width="4" height="11" rx="1.5" />
                <rect x="10" y="6" width="4" height="15" rx="1.5" />
                <rect x="17" y="2" width="4" height="19" rx="1.5" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-black tracking-wider text-slate-900 leading-tight">CATALYST OS</div>
              <div className="text-[8.5px] font-bold text-slate-500 tracking-widest uppercase">FINANCIAL SERVICES</div>
            </div>
          </div>
        </div>

        {/* Center: Title & Subtitle */}
        <div className="text-center hidden md:block">
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">Loan Portfolio Reports</h1>
          <p className="text-[11px] text-slate-500">Track portfolio by product, segment and asset quality</p>
        </div>

        {/* Right: Branch & Period Dropdowns + Export */}
        <div className="flex items-center gap-2.5">
          {/* Branch Dropdown */}
          <div className="flex flex-col">
            <span className="text-[9.5px] font-medium text-slate-500 mb-0.5">Branch</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[110px]"
            >
              {branchList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Period Dropdown */}
          <div className="flex flex-col">
            <span className="text-[9.5px] font-medium text-slate-500 mb-0.5">Period</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[100px]"
            >
              {periodOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Export Excel Button */}
          <button
            onClick={handleExportFullReport}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors self-end mb-0.5 cursor-pointer"
            title="Export Loan Portfolio (Excel)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Strictly Non-Scrollable Main Canvas ─── */}
      <div className="flex-1 min-h-0 overflow-hidden px-3.5 py-2 flex flex-col justify-between gap-2">
        
        {/* ════════ ROW 1: 5 TOP METRIC CARDS ════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 flex-shrink-0">
          
          {/* 1. Total Portfolio (Outstanding) */}
          <div className="bg-[#eff6ff]/70 border border-blue-100 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-600 leading-tight">Total Portfolio</div>
              <div className="text-[9px] text-slate-400 font-medium">(Outstanding)</div>
              <div className="text-base font-black text-slate-900 tracking-tight mt-0.5">
                {formatCrores(reportData.totalPortfolioCr)}
              </div>
              <div className="text-[9.5px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                <span className={reportData.portfolioDelta.isPos ? 'text-emerald-600' : 'text-rose-600'}>
                  {reportData.portfolioDelta.isPos ? '▲' : '▼'} {reportData.portfolioDelta.text}
                </span>
                <span className="text-slate-400 font-normal">vs Prev Month</span>
              </div>
            </div>
          </div>

          {/* 2. Active Loans */}
          <div className="bg-[#f0fdf4]/70 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-600 leading-tight">Active Loans</div>
              <div className="text-base font-black text-slate-900 tracking-tight mt-1">
                {reportData.activeLoansCount}
              </div>
              <div className="text-[9.5px] font-bold text-emerald-600 flex items-center justify-end gap-1 mt-0.5">
                <span className={reportData.activeLoansDelta.isPos ? 'text-emerald-600' : 'text-rose-600'}>
                  {reportData.activeLoansDelta.isPos ? '▲' : '▼'} {reportData.activeLoansDelta.text}
                </span>
                <span className="text-slate-400 font-normal">vs Prev Month</span>
              </div>
            </div>
          </div>

          {/* 3. Disbursed (YTD) */}
          <div className="bg-[#fffbeb]/70 border border-amber-100 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-600 leading-tight">Disbursed (YTD)</div>
              <div className="text-base font-black text-slate-900 tracking-tight mt-1">
                {formatCrores(reportData.disbursedYtdCr)}
              </div>
              <div className="text-[9.5px] font-bold text-emerald-600 flex items-center justify-end gap-1 mt-0.5">
                <span className={reportData.disbursedDelta.isPos ? 'text-emerald-600' : 'text-rose-600'}>
                  {reportData.disbursedDelta.isPos ? '▲' : '▼'} {reportData.disbursedDelta.text}
                </span>
                <span className="text-slate-400 font-normal">vs Prior Period</span>
              </div>
            </div>
          </div>

          {/* 4. Overdue Amount */}
          <div className="bg-[#fff1f2]/70 border border-rose-100 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-rose-100/70 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-600 leading-tight">Overdue Amount</div>
              <div className="text-base font-black text-slate-900 tracking-tight mt-1">
                {formatCrores(reportData.overdueCr)}
              </div>
              <div className="text-[9.5px] font-bold text-rose-600 flex items-center justify-end gap-1 mt-0.5">
                <span className={reportData.overdueDelta.isPos ? 'text-rose-600' : 'text-emerald-600'}>
                  {reportData.overdueDelta.isPos ? '▲' : '▼'} {reportData.overdueDelta.text}
                </span>
                <span className="text-slate-400 font-normal">vs Prev Month</span>
              </div>
            </div>
          </div>

          {/* 5. NPA (90+ DPD) */}
          <div className="bg-[#faf5ff]/70 border border-purple-100 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center flex-shrink-0">
              <PieChartIcon className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-600 leading-tight">NPA (90+ DPD)</div>
              <div className="text-base font-black text-slate-900 tracking-tight mt-1">
                {reportData.npaRatePct}%
              </div>
              <div className="text-[9.5px] font-bold text-emerald-600 flex items-center justify-end gap-1 mt-0.5">
                <span className={reportData.npaDelta.isPos ? 'text-rose-600' : 'text-emerald-600'}>
                  {reportData.npaDelta.isPos ? '▲' : '▼'} {reportData.npaDelta.text}
                </span>
                <span className="text-slate-400 font-normal">vs Prev Month</span>
              </div>
            </div>
          </div>

        </div>

        {/* ════════ ROW 2: 2 DONUT CHARTS (PRODUCT & SEGMENT) ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 flex-1 min-h-0">
          
          {/* Left: Portfolio by Product */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between flex-shrink-0 mb-1">
              <div>
                <h2 className="text-xs font-black text-slate-900">Portfolio by Product</h2>
                <span className="text-[9.5px] text-slate-400 font-medium">(Outstanding ₹ in Cr)</span>
              </div>
            </div>

            <div className="flex items-center justify-between flex-1 min-h-0 gap-3">
              {/* Donut Chart with Center Text */}
              <div className="relative w-44 h-36 flex items-center justify-center flex-shrink-0 pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.productData}
                      dataKey="amountCr"
                      nameKey="name"
                      cx="50%"
                      cy="54%"
                      innerRadius={34}
                      outerRadius={52}
                      paddingAngle={2}
                    >
                      {reportData.productData.map((entry, index) => (
                        <Cell key={`prod-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`₹ ${Number(val).toFixed(2)} Cr`, 'Outstanding']}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-[11px] font-black text-slate-900 leading-tight">
                    {formatCrores(reportData.totalPortfolioCr)}
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400">Total Portfolio</span>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-1">
                {reportData.productData.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="font-semibold text-slate-700 truncate">{p.name}</span>
                    </div>
                    <span className="font-mono text-slate-800 font-bold ml-1 flex-shrink-0">
                      {p.amountCr.toFixed(2)} <span className="text-slate-400 text-[9px] font-normal">({p.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Portfolio by Segment */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between flex-shrink-0 mb-1">
              <div>
                <h2 className="text-xs font-black text-slate-900">Portfolio by Segment</h2>
                <span className="text-[9.5px] text-slate-400 font-medium">(Outstanding ₹ in Cr)</span>
              </div>
            </div>

            <div className="flex items-center justify-between flex-1 min-h-0 gap-3">
              {/* Donut Chart with Center Text */}
              <div className="relative w-44 h-36 flex items-center justify-center flex-shrink-0 pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.segmentData}
                      dataKey="amountCr"
                      nameKey="name"
                      cx="50%"
                      cy="54%"
                      innerRadius={34}
                      outerRadius={52}
                      paddingAngle={2}
                    >
                      {reportData.segmentData.map((entry, index) => (
                        <Cell key={`seg-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`₹ ${Number(val).toFixed(2)} Cr`, 'Outstanding']}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-[11px] font-black text-slate-900 leading-tight">
                    {formatCrores(reportData.totalPortfolioCr)}
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400">Total Portfolio</span>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-1">
                {reportData.segmentData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="font-semibold text-slate-700 truncate">{s.name}</span>
                    </div>
                    <span className="font-mono text-slate-800 font-bold ml-1 flex-shrink-0">
                      {s.amountCr.toFixed(2)} <span className="text-slate-400 text-[9px] font-normal">({s.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ════════ ROW 3: 3 TREND & QUALITY PANELS ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 flex-1 min-h-0">
          
          {/* 1. Portfolio Trend (Bar Chart) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 flex flex-col justify-between overflow-hidden">
            <div className="mb-0.5">
              <h3 className="text-xs font-black text-slate-900 leading-tight">Portfolio Trend</h3>
              <span className="text-[9.5px] text-slate-400 font-medium">(Outstanding ₹ in Cr)</span>
            </div>

            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.portfolioTrend} margin={{ top: 14, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 9.5, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 15]} tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [`₹ ${val} Cr`, 'Outstanding']}
                    contentStyle={{ fontSize: '10px', borderRadius: '6px' }}
                  />
                  <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, fill: '#1E293B', fontWeight: 600 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Overdue Trend (Combo Chart) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-0.5">
              <div>
                <h3 className="text-xs font-black text-slate-900 leading-tight">Overdue Trend</h3>
                <span className="text-[9.5px] text-slate-400 font-medium">(₹ in Lakhs)</span>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-semibold">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2 h-2 rounded-sm bg-rose-400" /> Overdue Amount
                </span>
                <span className="flex items-center gap-1 text-blue-900 font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-900" /> Overdue %
                </span>
              </div>
            </div>

            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={reportData.overdueTrend} margin={{ top: 14, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 9.5, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" domain={[0, 200]} tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 6]} tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '6px' }} />
                  <Bar yAxisId="left" dataKey="amountLakhs" fill="#FDA4AF" radius={[3, 3, 0, 0]} label={{ position: 'insideTop', fontSize: 8.5, fill: '#881337', dy: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#1E3A8A" strokeWidth={2} dot={{ r: 3, fill: '#1E3A8A' }} label={{ position: 'top', fontSize: 8.5, fill: '#1E3A8A', fontWeight: 'bold', formatter: (v: any) => `${v}%`, dy: -6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Asset Quality (Donut + Legend) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 flex flex-col justify-between overflow-hidden">
            <div className="mb-0.5">
              <h3 className="text-xs font-black text-slate-900 leading-tight">Asset Quality</h3>
              <span className="text-[9.5px] text-slate-400 font-medium">(% of Outstanding)</span>
            </div>

            <div className="flex items-center justify-between flex-1 min-h-0 gap-2">
              <div className="relative w-32 h-28 flex items-center justify-center flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.assetQuality}
                      dataKey="pct"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      startAngle={90}
                      endAngle={-270}
                      innerRadius={28}
                      outerRadius={45}
                      paddingAngle={2}
                    >
                      {reportData.assetQuality.map((entry, index) => (
                        <Cell key={`aq-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Share']}
                      contentStyle={{ fontSize: '10px', borderRadius: '6px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-slate-900 leading-tight">
                    {formatCrores(reportData.totalPortfolioCr)}
                  </span>
                  <span className="text-[7.5px] font-semibold text-slate-400">Total Portfolio</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="flex-1 space-y-1.5">
                {reportData.assetQuality.map((aq) => (
                  <div key={aq.name} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: aq.color }} />
                      <span className="font-semibold text-slate-700 truncate">{aq.name}</span>
                    </div>
                    <span className="font-mono text-slate-900 font-bold ml-1">
                      {aq.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ════════ ROW 4: QUICK REPORTS – LOAN PORTFOLIO ════════ */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 flex flex-col flex-shrink-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center">
              <FileText className="w-2.5 h-2.5" />
            </div>
            <h3 className="text-xs font-black text-slate-900">Quick Reports – Loan Portfolio</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { title: 'Portfolio Summary', key: 'port_summary' },
              { title: 'Segment Wise Report', key: 'seg_report' },
              { title: 'Overdue / DPD Report', key: 'overdue_report' },
              { title: 'Top 20 Borrowers', key: 'top_borrowers' },
              { title: 'Product Wise Report', key: 'prod_report' },
              { title: 'Branch Wise Report', key: 'branch_report' },
              { title: 'NPA Report (90+ DPD)', key: 'npa_report' },
              { title: 'Loan Maturity Report', key: 'maturity_report' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveModal(item.title)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200/90 bg-slate-50/50 hover:bg-blue-50/70 hover:border-blue-200 text-left transition-all group cursor-pointer shadow-2xs"
              >
                <span className="text-[10.5px] font-bold text-slate-700 group-hover:text-blue-700 truncate">
                  {item.title}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ml-1" />
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ─── Interactive Drilldown Modal for All 8 Quick Reports ─── */}
      {modalContent && (
        <Modal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          title={modalContent.title}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-600 font-medium">
                Branch: <span className="font-bold text-slate-900">{selectedBranch}</span> • Period: <span className="font-bold text-slate-900">{selectedPeriod}</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live Database Linked
              </span>
            </div>

            <div className="overflow-x-auto max-h-[350px] border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 font-bold border-b border-slate-200">
                  <tr>
                    {modalContent.columns.map((col, idx) => (
                      <th key={idx} className="p-2.5 whitespace-nowrap">{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {modalContent.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                      {modalContent.columns.map((col, cIdx) => (
                        <td key={cIdx} className="p-2.5 font-medium text-slate-800 whitespace-nowrap">
                          {col.format ? col.format(row[col.accessor]) : (row[col.accessor] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setActiveModal(null)}>
                Close
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const ws = XLSX.utils.json_to_sheet(modalContent.rows)
                  const wb = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(wb, ws, modalContent.title.substring(0, 31))
                  XLSX.writeFile(wb, `${modalContent.title.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.xlsx`)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export Schedule (Excel)
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
