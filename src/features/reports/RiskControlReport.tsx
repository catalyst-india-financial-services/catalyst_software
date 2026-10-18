import React, { useState, useMemo } from 'react'
import {
  ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, XCircle,
  Download, Calendar, ChevronDown, Filter, FileSpreadsheet,
  Building2, Clock, Check, X, ShieldAlert
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell
} from 'recharts'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { Modal, Button } from '@/components/ui'

interface RiskControlReportProps {
  onBack: () => void
}

// Benchmark Portfolio Risk Breakdown
const BENCHMARK_RISK_DATA = {
  totalPortfolioCr: 12.48,
  standardCr: 11.60,
  standardPct: 93,
  overdue1_90Cr: 0.42,
  overdue1_90Pct: 3,
  overdue91_180Cr: 0.20,
  overdue91_180Pct: 2,
  npaOver180Cr: 0.26,
  npaOver180Pct: 2,
  overdueTotalPct: 5,
  overdueTotalCr: 0.62,
  npaTotalPct: 2,
  npaTotalCr: 0.26,
}

// 6-Month Overdue Trend (Stacked Bar Data in Lakhs)
const BENCHMARK_OVERDUE_TREND = [
  { month: 'Apr', d1_90: 8, d91_180: 4, over180: 2 },
  { month: 'May', d1_90: 11, d91_180: 5, over180: 4 },
  { month: 'Jun', d1_90: 15, d91_180: 7, over180: 6 },
  { month: 'Jul', d1_90: 18, d91_180: 9, over180: 8 },
  { month: 'Aug', d1_90: 22, d91_180: 12, over180: 11 },
  { month: 'Sep', d1_90: 28, d91_180: 18, over180: 16 },
]

// Top Overdue Accounts
const BENCHMARK_OVERDUE_ACCOUNTS = [
  { sNo: 1, customerName: 'Kumar Agro', loanType: 'Business Loan', overdueDays: 124, outstanding: 1250000, badgeBg: 'bg-[#fee2e2] text-[#b91c1c]' },
  { sNo: 2, customerName: 'Sri Venkatesh Traders', loanType: 'Working Capital', overdueDays: 98, outstanding: 840000, badgeBg: 'bg-[#ffedd5] text-[#c2410c]' },
  { sNo: 3, customerName: 'Ravi Transport', loanType: 'Vehicle Loan', overdueDays: 86, outstanding: 675000, badgeBg: 'bg-[#fef3c7] text-[#b45309]' },
  { sNo: 4, customerName: 'Selvi Enterprises', loanType: 'Business Loan', overdueDays: 72, outstanding: 560000, badgeBg: 'bg-[#fef3c7] text-[#b45309]' },
  { sNo: 5, customerName: 'Arun Poultry Farm', loanType: 'Agri Loan', overdueDays: 65, outstanding: 490000, badgeBg: 'bg-[#fef3c7] text-[#b45309]' },
]

// NPA Accounts
const BENCHMARK_NPA_ACCOUNTS = [
  { sNo: 1, customerName: 'Devi Associates', loanType: 'Business Loan', npaSince: '15 Mar 2026', outstanding: 850000 },
  { sNo: 2, customerName: 'Ganesh Traders', loanType: 'Working Capital', npaSince: '02 Apr 2026', outstanding: 620000 },
  { sNo: 3, customerName: 'Karthik Auto', loanType: 'Vehicle Loan', npaSince: '21 Apr 2026', outstanding: 580000 },
  { sNo: 4, customerName: 'Muthu Agro', loanType: 'Agri Loan', npaSince: '10 May 2026', outstanding: 490000 },
  { sNo: 5, customerName: 'Siva Enterprises', loanType: 'Business Loan', npaSince: '01 Jun 2026', outstanding: 350000 },
]

// Control & Compliance Status
const BENCHMARK_COMPLIANCE = [
  { sNo: 1, controlItem: 'KYC Document Verification', frequency: 'Daily', lastCompleted: '30 Sep 2026', status: 'Completed' },
  { sNo: 2, controlItem: 'CIBIL Score Check', frequency: 'Daily', lastCompleted: '30 Sep 2026', status: 'Completed' },
  { sNo: 3, controlItem: 'Sanction Limit Approval', frequency: 'Daily', lastCompleted: '29 Sep 2026', status: 'Pending' },
  { sNo: 4, controlItem: 'Insurance Coverage Check', frequency: 'Weekly', lastCompleted: '28 Sep 2026', status: 'Completed' },
  { sNo: 5, controlItem: 'NPA Review Meeting', frequency: 'Monthly', lastCompleted: '05 Sep 2026', status: 'Completed' },
]

// Audit & Exception Report
const BENCHMARK_EXCEPTIONS = [
  { sNo: 1, date: '28 Sep 2026', issue: 'Missing income proof', status: 'Open', badgeBg: 'bg-[#fee2e2] text-[#b91c1c]' },
  { sNo: 2, date: '26 Sep 2026', issue: 'KYC document expiry (3 accounts)', status: 'Resolved', badgeBg: 'bg-[#dcfce7] text-[#15803d]' },
  { sNo: 3, date: '24 Sep 2026', issue: 'Cheque bounce – EMI', status: 'Open', badgeBg: 'bg-[#fee2e2] text-[#b91c1c]' },
  { sNo: 4, date: '20 Sep 2026', issue: 'High overdue risk customer', status: 'Under Review', badgeBg: 'bg-[#fef3c7] text-[#b45309]' },
  { sNo: 5, date: '18 Sep 2026', issue: 'Insurance not updated', status: 'Resolved', badgeBg: 'bg-[#dcfce7] text-[#15803d]' },
]

export default function RiskControlReport({ onBack }: RiskControlReportProps) {
  const { isBranchUser, userBranch, selectedBranch: storeBranch } = useAuthStore()
  const initialBranch = (isBranchUser ? userBranch : storeBranch) || 'All Branches'
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Sep 2026')
  const [activeModal, setActiveModal] = useState<'overdue' | 'npa' | 'compliance' | 'exceptions' | null>(null)

  // Fetch real database records from Supabase
  const { data: dbData } = useQuery({
    queryKey: ['riskControlDbData', selectedBranch],
    queryFn: async () => {
      const safe = async <T,>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | []> => {
        const res = await p
        if (res.error) {
          console.warn('[RiskControl] Query error:', res.error)
          return []
        }
        return res.data || []
      }

      const [loans, emiSchedule, customers] = await Promise.all([
        safe(supabase.from('loans').select('*')),
        safe(supabase.from('emi_schedule').select('*').order('due_date', { ascending: true })),
        safe(supabase.from('customers').select('*')),
      ])

      return {
        loans: (loans as any[]) || [],
        emiSchedule: (emiSchedule as any[]) || [],
        customers: (customers as any[]) || [],
      }
    },
    staleTime: 10000,
  })

  // Dynamic Branches
  const availableBranches = useMemo(() => {
    const list = new Set<string>()
    list.add('All Branches')
    if (dbData?.loans) {
      dbData.loans.forEach((l) => { if (l.branch) list.add(l.branch) })
    }
    return Array.from(list)
  }, [dbData])

  // Donut chart dataset for Portfolio Risk Classification
  const donutChartData = useMemo(() => {
    return [
      { name: 'Standard', value: 11.60, amountFormatted: '₹ 11.60 Cr', pct: '93%', color: '#10b981' },
      { name: 'Overdue (1–90 days)', value: 0.42, amountFormatted: '₹ 0.42 Cr', pct: '3%', color: '#eab308' },
      { name: 'Overdue (91–180 days)', value: 0.20, amountFormatted: '₹ 0.20 Cr', pct: '2%', color: '#f97316' },
      { name: 'NPA (>180 days)', value: 0.26, amountFormatted: '₹ 0.26 Cr', pct: '2%', color: '#ef4444' },
    ]
  }, [])

  // Export to Excel helper
  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    XLSX.writeFile(wb, `${fileName}_${dayjs().format('YYYY-MM-DD')}.xlsx`)
  }

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden bg-[#f4f7fb] p-2 text-slate-800 select-none">
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-row items-center justify-between pb-0.5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            Back
          </button>

          {/* CATALYST OS 3-Bar Brand Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-[3px] h-6 px-0.5">
              <span className="w-1.5 h-3 bg-blue-500 rounded-xs"></span>
              <span className="w-1.5 h-4.5 bg-blue-600 rounded-xs"></span>
              <span className="w-1.5 h-6 bg-blue-700 rounded-xs"></span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-black tracking-tight text-[#0a2540] font-sans whitespace-nowrap">CATALYST OS</span>
              <span className="text-[8px] tracking-[0.14em] font-bold text-slate-400 uppercase -mt-0.5 whitespace-nowrap">Financial Services</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          <div>
            <h1 className="text-[17px] font-black text-[#0f2444] tracking-tight leading-none">Risk & Control Reports</h1>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-none">
              Monitor credit risk, overdue, NPA, compliance and operational controls
            </p>
          </div>
        </div>

        {/* Controls: Branch, Period & Profile/Export */}
        <div className="flex items-center gap-2">
          {/* Branch Dropdown */}
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider leading-none mb-0.5">Branch</span>
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={isBranchUser}
                className="appearance-none bg-white border border-slate-200 rounded-md pl-2 pr-6 py-0.5 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:bg-slate-100"
              >
                {availableBranches.map((br) => (
                  <option key={br} value={br}>{br}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Period Dropdown */}
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider leading-none mb-0.5">Period</span>
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-md pl-6 pr-6 py-0.5 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Sep 2026">Sep 2026</option>
                <option value="Aug 2026">Aug 2026</option>
                <option value="Jul 2026">Jul 2026</option>
                <option value="Q2 2026">Q2 2026</option>
                <option value="FY 2026-27">FY 2026-27</option>
              </select>
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* SR Avatar Badge */}
          <div className="w-7 h-7 rounded-full bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs flex items-center justify-center mt-2.5 shadow-2xs">
            SR
          </div>

          {/* Excel Export Button */}
          <button
            onClick={() => exportToExcel(BENCHMARK_OVERDUE_ACCOUNTS, 'Risk_Control_Summary')}
            title="Export Summary to Excel"
            className="mt-2.5 p-1 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-2xs hover:border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
          </button>
        </div>
      </div>

      {/* ─── ROW 1: TOP 4 KPI CARDS ─── */}
      <div className="grid grid-cols-4 gap-2 flex-shrink-0 my-0.5">
        
        {/* Card 1: Total Portfolio */}
        <div className="bg-[#eef7ff] border border-[#d8ebff] rounded-xl p-2 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-[#1890ff] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10.5px] font-semibold text-slate-600">Total Portfolio</span>
            <span className="text-xl font-black text-slate-900 leading-tight mt-0.5 tracking-tight">₹ 12.48 Cr</span>
          </div>
        </div>

        {/* Card 2: Standard Accounts */}
        <div className="bg-[#effaf3] border border-[#d6f4e1] rounded-xl p-2 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-[#22c55e] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10.5px] font-semibold text-slate-600">Standard Accounts</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-slate-900 leading-tight">93%</span>
              <span className="text-[11px] font-bold text-slate-500">₹ 11.60 Cr</span>
            </div>
          </div>
        </div>

        {/* Card 3: Overdue Accounts */}
        <div className="bg-[#fef9ee] border border-[#fdecd0] rounded-xl p-2 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#f59e0b] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10.5px] font-semibold text-slate-600">Overdue Accounts</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-slate-900 leading-tight">5%</span>
              <span className="text-[11px] font-bold text-slate-500">₹ 0.62 Cr</span>
            </div>
          </div>
        </div>

        {/* Card 4: NPA Accounts */}
        <div className="bg-[#fff1f0] border border-[#fed7d7] rounded-xl p-2 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-[#f43f5e] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <X className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10.5px] font-semibold text-slate-600">NPA Accounts</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-slate-900 leading-tight">2%</span>
              <span className="text-[11px] font-bold text-slate-500">₹ 0.26 Cr</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── ROW 2: MIDDLE CHARTS SECTION (FLEX-[1.1]) ─── */}
      <div className="grid grid-cols-12 gap-2 flex-[1.1] min-h-0 my-0.5">
        
        {/* Panel 1: Portfolio Risk Classification (Col span 6) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
          <h3 className="text-xs font-bold text-slate-900 leading-none">Portfolio Risk Classification</h3>

          <div className="flex items-center justify-between gap-2 my-auto">
            {/* Donut Chart with center value */}
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={50}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    {donutChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`₹ ${value} Cr`]} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-black text-slate-900 leading-none">₹ 12.48 Cr</span>
                <span className="text-[8.5px] text-slate-500 font-semibold mt-0.5 leading-none">Total Portfolio</span>
              </div>
            </div>

            {/* Legend with exact values and percentages */}
            <div className="space-y-1.5 text-xs pr-2 flex-1">
              {donutChartData.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-[10.5px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600 truncate">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-1">
                    <strong className="text-slate-800 font-bold text-[10.5px]">{entry.amountFormatted}</strong>
                    <span className="text-slate-400 text-[10px] w-6 text-right">{entry.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: Overdue Trend (Col span 6) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between pb-0.5">
            <h3 className="text-xs font-bold text-slate-900">Overdue Trend</h3>
            
            <div className="flex items-center gap-3">
              {/* Custom Legend */}
              <div className="flex items-center gap-2 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#eab308]" />
                  <span className="text-slate-600">1–90 Days</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                  <span className="text-slate-600">91–180 Days</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <span className="text-slate-600">&gt;180 Days</span>
                </div>
              </div>

              {/* Filter dropdown */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-700 shadow-2xs cursor-pointer hover:border-slate-300">
                <span>Last 6 Months</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="flex-1 min-h-0 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={BENCHMARK_OVERDUE_TREND}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                barGap={0}
                barCategoryGap={30}
              >
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9.5, fill: '#64748b' }}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  label={{
                    value: '₹ (Lakhs)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 14,
                    style: { fontSize: 9.5, fill: '#94a3b8', fontWeight: 500 }
                  }}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [`₹ ${value} Lakhs`, name]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                />
                <Bar dataKey="d1_90" stackId="a" fill="#eab308" maxBarSize={22} />
                <Bar dataKey="d91_180" stackId="a" fill="#f97316" maxBarSize={22} />
                <Bar dataKey="over180" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ─── ROW 3: MIDDLE-BOTTOM TABLES (FLEX-[1.0]) ─── */}
      <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 my-0.5">
        
        {/* Table 1: Top Overdue Accounts (Col span 6) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-0.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">Top Overdue Accounts</h3>
              <button
                onClick={() => setActiveModal('overdue')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-2 py-0.2 rounded-md transition-colors"
              >
                View All
              </button>
            </div>

            <table className="w-full text-left mt-0.5 table-fixed">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-semibold text-slate-400 uppercase">
                  <th className="w-[8%] pb-0.5 font-semibold">S.No</th>
                  <th className="w-[34%] pb-0.5 font-semibold">Customer Name</th>
                  <th className="w-[24%] pb-0.5 font-semibold">Loan Type</th>
                  <th className="w-[16%] pb-0.5 text-center font-semibold">Overdue Days</th>
                  <th className="w-[18%] pb-0.5 text-right font-semibold">Outstanding (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {BENCHMARK_OVERDUE_ACCOUNTS.map((acc) => (
                  <tr key={acc.sNo} className="hover:bg-slate-50/80 text-xs">
                    <td className="py-0.5 text-[9.5px] text-slate-400 font-mono">{acc.sNo}</td>
                    <td className="py-0.5 pr-1 font-semibold text-slate-800 text-[10px] truncate">{acc.customerName}</td>
                    <td className="py-0.5 px-1 text-[9.5px] text-slate-500 truncate">{acc.loanType}</td>
                    <td className="py-0.5 text-center">
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md ${acc.badgeBg}`}>
                        {acc.overdueDays}
                      </span>
                    </td>
                    <td className="py-0.5 pl-1 text-[10px] font-bold text-slate-900 text-right font-mono">
                      {acc.outstanding.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: NPA Accounts (Col span 6) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-0.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">NPA Accounts</h3>
              <button
                onClick={() => setActiveModal('npa')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-2 py-0.2 rounded-md transition-colors"
              >
                View All
              </button>
            </div>

            <table className="w-full text-left mt-0.5 table-fixed">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-semibold text-slate-400 uppercase">
                  <th className="w-[8%] pb-0.5 font-semibold">S.No</th>
                  <th className="w-[34%] pb-0.5 font-semibold">Customer Name</th>
                  <th className="w-[24%] pb-0.5 font-semibold">Loan Type</th>
                  <th className="w-[16%] pb-0.5 text-center font-semibold">NPA Since</th>
                  <th className="w-[18%] pb-0.5 text-right font-semibold">Outstanding (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {BENCHMARK_NPA_ACCOUNTS.map((npa) => (
                  <tr key={npa.sNo} className="hover:bg-slate-50/80 text-xs">
                    <td className="py-0.5 text-[9.5px] text-slate-400 font-mono">{npa.sNo}</td>
                    <td className="py-0.5 pr-1 font-semibold text-slate-800 text-[10px] truncate">{npa.customerName}</td>
                    <td className="py-0.5 px-1 text-[9.5px] text-slate-500 truncate">{npa.loanType}</td>
                    <td className="py-0.5 text-[9.5px] text-slate-600 text-center font-mono">{npa.npaSince}</td>
                    <td className="py-0.5 pl-1 text-[10px] font-bold text-slate-900 text-right font-mono">
                      {npa.outstanding.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── ROW 4: BOTTOM TABLES (FLEX-[1.0]) ─── */}
      <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 my-0.5">
        
        {/* Table 3: Control & Compliance Status (Col span 6) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-0.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">Control & Compliance Status</h3>
              <button
                onClick={() => setActiveModal('compliance')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-2 py-0.2 rounded-md transition-colors"
              >
                View All
              </button>
            </div>

            <table className="w-full text-left mt-0.5 table-fixed">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-semibold text-slate-400 uppercase">
                  <th className="w-[8%] pb-0.5 font-semibold">S.No</th>
                  <th className="w-[42%] pb-0.5 font-semibold">Control Item</th>
                  <th className="w-[18%] pb-0.5 font-semibold">Frequency</th>
                  <th className="w-[18%] pb-0.5 text-center font-semibold">Last Completed</th>
                  <th className="w-[14%] pb-0.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {BENCHMARK_COMPLIANCE.map((item) => {
                  const isCompleted = item.status === 'Completed'
                  return (
                    <tr key={item.sNo} className="hover:bg-slate-50/80 text-xs">
                      <td className="py-0.5 text-[9.5px] text-slate-400 font-mono">{item.sNo}</td>
                      <td className="py-0.5 pr-1 font-medium text-slate-800 text-[10px] truncate">{item.controlItem}</td>
                      <td className="py-0.5 px-1 text-[9.5px] text-slate-500 truncate">{item.frequency}</td>
                      <td className="py-0.5 text-[9.5px] text-slate-600 text-center font-mono">{item.lastCompleted}</td>
                      <td className="py-0.5 pl-1 text-right">
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                          isCompleted ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fef3c7] text-[#b45309]'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 4: Audit & Exception Report (Col span 6) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-0.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">Audit & Exception Report</h3>
              <button
                onClick={() => setActiveModal('exceptions')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-2 py-0.2 rounded-md transition-colors"
              >
                View All
              </button>
            </div>

            <table className="w-full text-left mt-0.5 table-fixed">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-semibold text-slate-400 uppercase">
                  <th className="w-[8%] pb-0.5 font-semibold">S.No</th>
                  <th className="w-[20%] pb-0.5 font-semibold">Date</th>
                  <th className="w-[52%] pb-0.5 font-semibold">Issue / Exception</th>
                  <th className="w-[20%] pb-0.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {BENCHMARK_EXCEPTIONS.map((exc) => (
                  <tr key={exc.sNo} className="hover:bg-slate-50/80 text-xs">
                    <td className="py-0.5 text-[9.5px] text-slate-400 font-mono">{exc.sNo}</td>
                    <td className="py-0.5 pr-1 text-[9.5px] text-slate-500 font-mono truncate">{exc.date}</td>
                    <td className="py-0.5 px-1 font-medium text-slate-800 text-[10px] truncate">{exc.issue}</td>
                    <td className="py-0.5 pl-1 text-right">
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md ${exc.badgeBg}`}>
                        {exc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── MODALS ─── */}

      {/* 1. Modal: View All Overdue Accounts */}
      <Modal
        isOpen={activeModal === 'overdue'}
        onClose={() => setActiveModal(null)}
        title="Complete Portfolio Overdue Accounts Register"
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Delinquency Aging & DPD Classification</p>
              <p className="text-[11px] text-slate-500">Branch: {selectedBranch} • Period: {selectedPeriod}</p>
            </div>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full">
              SMA-1 & SMA-2 Delinquency
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2">S.No</th>
                  <th className="p-2">Borrower</th>
                  <th className="p-2">Loan Product</th>
                  <th className="p-2">DPD</th>
                  <th className="p-2 text-right">Outstanding (₹)</th>
                  <th className="p-2">Recovery Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {BENCHMARK_OVERDUE_ACCOUNTS.map((acc, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 font-mono text-slate-400">{acc.sNo}</td>
                    <td className="p-2 font-semibold text-slate-800">{acc.customerName}</td>
                    <td className="p-2 text-slate-600">{acc.loanType}</td>
                    <td className="p-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${acc.badgeBg}`}>
                        {acc.overdueDays} Days
                      </span>
                    </td>
                    <td className="p-2 font-bold font-mono text-right text-slate-900">
                      ₹ {acc.outstanding.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-slate-600">
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        Field Notice Issued
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setActiveModal(null)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              onClick={() => exportToExcel(BENCHMARK_OVERDUE_ACCOUNTS, 'Overdue_Accounts_Register')}
            >
              <Download className="w-3.5 h-3.5" />
              Export Overdue (Excel)
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Modal: View All NPA Accounts */}
      <Modal
        isOpen={activeModal === 'npa'}
        onClose={() => setActiveModal(null)}
        title="Complete NPA (90+ DPD) Portfolio & Provisions"
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            <div>
              <p className="text-xs font-bold text-rose-900">Non-Performing Asset Classification & SARFAESI</p>
              <p className="text-[11px] text-rose-700">Total NPA Ratio: 2.0% • RBI Provisioning Applied</p>
            </div>
            <span className="text-xs bg-rose-600 text-white font-bold px-2.5 py-1 rounded-full">
              Legal Recovery Active
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2">S.No</th>
                  <th className="p-2">Borrower</th>
                  <th className="p-2">Loan Product</th>
                  <th className="p-2">NPA Classification Date</th>
                  <th className="p-2 text-right">Outstanding (₹)</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {BENCHMARK_NPA_ACCOUNTS.map((npa, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 font-mono text-slate-400">{npa.sNo}</td>
                    <td className="p-2 font-semibold text-slate-800">{npa.customerName}</td>
                    <td className="p-2 text-slate-600">{npa.loanType}</td>
                    <td className="p-2 font-mono text-slate-700">{npa.npaSince}</td>
                    <td className="p-2 font-bold font-mono text-right text-rose-700">
                      ₹ {npa.outstanding.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                        Under Legal Notice
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setActiveModal(null)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              onClick={() => exportToExcel(BENCHMARK_NPA_ACCOUNTS, 'NPA_Accounts_Register')}
            >
              <Download className="w-3.5 h-3.5" />
              Export NPA List (Excel)
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Modal: View All Control & Compliance */}
      <Modal
        isOpen={activeModal === 'compliance'}
        onClose={() => setActiveModal(null)}
        title="Internal Controls & Regulatory Compliance Matrix"
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Operational Risk & Compliance Checklist</p>
              <p className="text-[11px] text-slate-500">RBI Master Directions & Internal Audit Mandates</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
              96% Audit Score
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2">S.No</th>
                  <th className="p-2">Control Mandate</th>
                  <th className="p-2">Frequency</th>
                  <th className="p-2">Last Audit Execution</th>
                  <th className="p-2">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {BENCHMARK_COMPLIANCE.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 font-mono text-slate-400">{item.sNo}</td>
                    <td className="p-2 font-semibold text-slate-800">{item.controlItem}</td>
                    <td className="p-2 text-slate-600">{item.frequency}</td>
                    <td className="p-2 font-mono text-slate-700">{item.lastCompleted}</td>
                    <td className="p-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setActiveModal(null)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              onClick={() => exportToExcel(BENCHMARK_COMPLIANCE, 'Compliance_Audit_Matrix')}
            >
              <Download className="w-3.5 h-3.5" />
              Export Matrix (Excel)
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. Modal: View All Exceptions */}
      <Modal
        isOpen={activeModal === 'exceptions'}
        onClose={() => setActiveModal(null)}
        title="Audit Findings & Operational Exception Log"
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Credit, Documentation & Operational Exceptions</p>
              <p className="text-[11px] text-slate-500">Tracking open remediation tickets</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
              Automated Exception Engine
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2">S.No</th>
                  <th className="p-2">Date Logged</th>
                  <th className="p-2">Exception Description</th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Resolution Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {BENCHMARK_EXCEPTIONS.map((exc, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 font-mono text-slate-400">{exc.sNo}</td>
                    <td className="p-2 font-mono text-slate-600">{exc.date}</td>
                    <td className="p-2 font-semibold text-slate-800">{exc.issue}</td>
                    <td className="p-2">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Medium
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${exc.badgeBg}`}>
                        {exc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setActiveModal(null)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              onClick={() => exportToExcel(BENCHMARK_EXCEPTIONS, 'Audit_Exceptions_Log')}
            >
              <Download className="w-3.5 h-3.5" />
              Export Exceptions (Excel)
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
