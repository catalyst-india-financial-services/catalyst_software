import React, { useState, useMemo } from 'react'
import {
  ArrowLeft, Landmark, Banknote, ArrowDown, ArrowUp,
  Download, Calendar, ChevronDown, MoreVertical, Building2,
  CreditCard, ExternalLink, RefreshCw, Filter, Eye, CheckCircle2
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { Modal, Button } from '@/components/ui'

interface BankCashReportProps {
  onBack: () => void
}

// Benchmark Accounts Registry
const BENCHMARK_ACCOUNTS = [
  {
    id: 'BA-1',
    bankName: 'HDFC Bank',
    accountNo: 'XXXX 1234',
    fullAccountNo: '502000412891234',
    accountType: 'Current',
    balance: 1824500,
    sharePct: 43,
    color: '#004c8f',
    logoBg: 'bg-[#004c8f]',
    initial: 'H',
    branch: 'Namakkal',
    ifsc: 'HDFC0000245',
  },
  {
    id: 'BA-2',
    bankName: 'IDFC FIRST',
    accountNo: 'XXXX 5678',
    fullAccountNo: '100458925678',
    accountType: 'Collection',
    balance: 985000,
    sharePct: 23,
    color: '#9d1d27',
    logoBg: 'bg-[#9d1d27]',
    initial: 'I',
    branch: 'Namakkal',
    ifsc: 'IDFB0040101',
  },
  {
    id: 'BA-3',
    bankName: 'Bank of Baroda',
    accountNo: 'XXXX 9012',
    fullAccountNo: '24560100009012',
    accountType: 'OD',
    balance: 762300,
    sharePct: 18,
    color: '#f36f21',
    logoBg: 'bg-[#f36f21]',
    initial: 'B',
    branch: 'Namakkal',
    ifsc: 'BARB0NAMAKK',
  },
  {
    id: 'BA-4',
    bankName: 'Axis Bank',
    accountNo: 'XXXX 3456',
    fullAccountNo: '918020034567890',
    accountType: 'Operating',
    balance: 412200,
    sharePct: 10,
    color: '#97144d',
    logoBg: 'bg-[#97144d]',
    initial: 'A',
    branch: 'Namakkal',
    ifsc: 'UTIB0000120',
  },
  {
    id: 'BA-5',
    bankName: 'Others',
    accountNo: '-',
    fullAccountNo: 'Multiple Accounts',
    accountType: '-',
    balance: 271320,
    sharePct: 6,
    color: '#64748b',
    logoBg: 'bg-slate-600',
    initial: 'O',
    branch: 'All Branches',
    ifsc: '-',
  },
]

// Benchmark Receipts vs Payments trend (₹ in Lakhs)
const BENCHMARK_CASH_FLOW = [
  { date: '1 Sep', receipts: 12.5, payments: 8.0 },
  { date: '5 Sep', receipts: 16.0, payments: 10.5 },
  { date: '10 Sep', receipts: 18.2, payments: 11.0 },
  { date: '15 Sep', receipts: 20.0, payments: 14.5 },
  { date: '20 Sep', receipts: 26.5, payments: 16.8 },
  { date: '25 Sep', receipts: 16.0, payments: 11.0 },
  { date: '30 Sep', receipts: 16.8, payments: 11.2 },
]

// Benchmark Recent Bank Transactions
const BENCHMARK_TRANSACTIONS = [
  {
    id: 'TXN-01',
    date: '30 Sep 2026',
    description: 'Loan EMI - Customer',
    type: 'Credit',
    amount: 25000,
    balance: 1824500,
    account: 'HDFC Bank (XXXX 1234)',
    refNo: 'TXN2026093001',
  },
  {
    id: 'TXN-02',
    date: '29 Sep 2026',
    description: 'Office Rent',
    type: 'Debit',
    amount: 50000,
    balance: 1799500,
    account: 'HDFC Bank (XXXX 1234)',
    refNo: 'TXN2026092901',
  },
  {
    id: 'TXN-03',
    date: '29 Sep 2026',
    description: 'Collection Transfer',
    type: 'Credit',
    amount: 120000,
    balance: 1849500,
    account: 'IDFC FIRST (XXXX 5678)',
    refNo: 'TXN2026092902',
  },
  {
    id: 'TXN-04',
    date: '28 Sep 2026',
    description: 'Staff Salary',
    type: 'Debit',
    amount: 320000,
    balance: 1729500,
    account: 'Bank of Baroda (XXXX 9012)',
    refNo: 'TXN2026092801',
  },
  {
    id: 'TXN-05',
    date: '28 Sep 2026',
    description: 'Vendor Payment',
    type: 'Debit',
    amount: 75000,
    balance: 1779500,
    account: 'Axis Bank (XXXX 3456)',
    refNo: 'TXN2026092802',
  },
]

// Donut Chart Slice Colors matching screenshot
const DONUT_COLORS = ['#1890ff', '#8b5cf6', '#f59e0b', '#94a3b8']

export default function BankCashReport({ onBack }: BankCashReportProps) {
  const { isBranchUser, userBranch, selectedBranch: storeBranch } = useAuthStore()
  const initialBranch = (isBranchUser ? userBranch : storeBranch) || 'Namakkal'
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Sep 2026')
  const [activeModal, setActiveModal] = useState<'accounts' | 'transactions' | 'accountDetail' | null>(null)
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<typeof BENCHMARK_ACCOUNTS[0] | null>(null)

  // Fetch real database records from Supabase
  const { data: dbData } = useQuery({
    queryKey: ['bankCashDbData', selectedBranch],
    queryFn: async () => {
      const safe = async <T,>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | []> => {
        const res = await p
        if (res.error) {
          console.warn('[BankCash] Query error:', res.error)
          return []
        }
        return res.data || []
      }

      const [bankAccounts, transactions, income, expenses, emiPayments, loans] = await Promise.all([
        safe(supabase.from('bank_accounts').select('*')),
        safe(supabase.from('transactions').select('*').order('date', { ascending: false })),
        safe(supabase.from('income').select('*').order('date', { ascending: false })),
        safe(supabase.from('expenses').select('*').order('date', { ascending: false })),
        safe(supabase.from('emi_payments').select('*').order('payment_date', { ascending: false })),
        safe(supabase.from('loans').select('id, branch')),
      ])

      return {
        bankAccounts: (bankAccounts as any[]) || [],
        transactions: (transactions as any[]) || [],
        income: (income as any[]) || [],
        expenses: (expenses as any[]) || [],
        emiPayments: (emiPayments as any[]) || [],
        loans: (loans as any[]) || [],
      }
    },
    staleTime: 10000,
  })

  // Extract dynamic branches
  const availableBranches = useMemo(() => {
    const list = new Set<string>()
    list.add('Namakkal')
    list.add('All Branches')
    if (dbData?.loans) {
      dbData.loans.forEach((l) => { if (l.branch) list.add(l.branch) })
    }
    return Array.from(list)
  }, [dbData])

  // Donut chart dataset for Balance by Bank Account
  const donutChartData = useMemo(() => {
    return [
      { name: 'HDFC Bank', value: 1824500, amountFormatted: '₹ 18,24,500', pct: '43%', color: '#1890ff' },
      { name: 'IDFC FIRST', value: 985000, amountFormatted: '₹ 9,85,000', pct: '23%', color: '#8b5cf6' },
      { name: 'Bank of Baroda', value: 762300, amountFormatted: '₹ 7,62,300', pct: '18%', color: '#f59e0b' },
      { name: 'Others', value: 684520, amountFormatted: '₹ 6,84,520', pct: '16%', color: '#94a3b8' },
    ]
  }, [])

  // Export tables to Excel
  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    XLSX.writeFile(wb, `${fileName}_${dayjs().format('YYYY-MM-DD')}.xlsx`)
  }

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden bg-[#f4f7fb] p-2 text-slate-800 select-none">
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-row items-center justify-between pb-1 flex-shrink-0">
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
            <h1 className="text-[17px] font-black text-[#0f2444] tracking-tight leading-none">Bank & Cash Reports</h1>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-none">
              Track bank balances, cash position, receipts and payments
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
            onClick={() => exportToExcel(BENCHMARK_TRANSACTIONS, 'Bank_Cash_Summary')}
            title="Export Report to Excel"
            className="mt-2.5 p-1 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-2xs hover:border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
          </button>
        </div>
      </div>

      {/* ─── ROW 1: TOP 4 KPI CARDS ─── */}
      <div className="grid grid-cols-4 gap-2.5 flex-shrink-0 my-0.5">
        
        {/* Card 1: Total Bank Balance */}
        <div className="bg-[#eef7ff] border border-[#d8ebff] rounded-xl p-2.5 flex items-center gap-3 shadow-2xs">
          <div className="w-11 h-11 rounded-full bg-[#d0e7ff] text-[#1890ff] flex items-center justify-center shadow-xs flex-shrink-0">
            <Landmark className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[11px] font-semibold text-slate-500">Total Bank Balance</span>
            <span className="text-[22px] font-black text-slate-900 leading-tight mt-0.5 tracking-tight">₹ 42,56,320</span>
          </div>
        </div>

        {/* Card 2: Cash in Hand */}
        <div className="bg-[#effaf3] border border-[#d6f4e1] rounded-xl p-2.5 flex items-center gap-3 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-[#cbf2d8] text-[#10b981] flex items-center justify-center shadow-xs flex-shrink-0">
            <Banknote className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[11px] font-semibold text-slate-500">Cash in Hand</span>
            <span className="text-[22px] font-black text-slate-900 leading-tight mt-0.5 tracking-tight">₹ 1,35,400</span>
          </div>
        </div>

        {/* Card 3: Receipts (MTD) */}
        <div className="bg-[#effaf3] border border-[#d6f4e1] rounded-xl p-2.5 flex items-center gap-3 shadow-2xs">
          <div className="w-11 h-11 rounded-full bg-[#cbf2d8] text-[#10b981] flex items-center justify-center shadow-xs flex-shrink-0">
            <ArrowDown className="w-5.5 h-5.5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[11px] font-semibold text-slate-500">Receipts (MTD)</span>
            <span className="text-[22px] font-black text-slate-900 leading-tight mt-0.5 tracking-tight">₹ 18,76,500</span>
          </div>
        </div>

        {/* Card 4: Payments (MTD) */}
        <div className="bg-[#fff6ee] border border-[#ffecd9] rounded-xl p-2.5 flex items-center gap-3 shadow-2xs">
          <div className="w-11 h-11 rounded-full bg-[#ffe4cc] text-[#f97316] flex items-center justify-center shadow-xs flex-shrink-0">
            <ArrowUp className="w-5.5 h-5.5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[11px] font-semibold text-slate-500">Payments (MTD)</span>
            <span className="text-[22px] font-black text-slate-900 leading-tight mt-0.5 tracking-tight">₹ 12,54,300</span>
          </div>
        </div>

      </div>

      {/* ─── ROW 2: MIDDLE CHARTS SECTION (FLEX-[1.15]) ─── */}
      <div className="grid grid-cols-12 gap-2.5 flex-[1.15] min-h-0 my-0.5">
        
        {/* Panel 1: Receipts vs Payments (Col span 8) */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200/90 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs overflow-hidden">
          {/* Header with Title, Dropdown & Legend */}
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold text-slate-900">Receipts vs Payments</h3>
            
            <div className="flex items-center gap-4">
              {/* Custom Legend */}
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span className="text-slate-600 font-medium">Receipts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                  <span className="text-slate-600 font-medium">Payments</span>
                </div>
              </div>

              {/* Filter dropdown */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-700 shadow-2xs cursor-pointer hover:border-slate-300">
                <span>This Month</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Clustered Bar Chart */}
          <div className="flex-1 min-h-0 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={BENCHMARK_CASH_FLOW}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                barGap={3}
                barCategoryGap={20}
              >
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  ticks={[0, 10, 20, 30]}
                  label={{
                    value: '₹ (Lakhs)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 14,
                    style: { fontSize: 10, fill: '#94a3b8', fontWeight: 500 }
                  }}
                />
                <Tooltip
                  formatter={(value: any) => [`₹ ${value} Lakhs`]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                />
                <Bar dataKey="receipts" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="payments" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 2: Balance by Bank Account (Col span 4) */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200/90 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs overflow-hidden">
          <h3 className="text-xs font-bold text-slate-900 leading-none">Balance by Bank Account</h3>

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
                  <Tooltip formatter={(value: any) => [`₹ ${Number(value).toLocaleString('en-IN')}`]} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-black text-slate-900 leading-none">₹ 42.56</span>
                <span className="text-[9px] text-slate-500 font-semibold mt-0.5 leading-none">Lakhs</span>
              </div>
            </div>

            {/* Legend with exact values and percentages */}
            <div className="space-y-1.5 text-xs pr-1 flex-1">
              {donutChartData.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-[10.5px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600 truncate">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-1">
                    <strong className="text-slate-800 font-bold text-[10.5px]">{entry.amountFormatted}</strong>
                    <span className="text-slate-400 text-[9.5px] w-6 text-right">{entry.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ─── ROW 3: BOTTOM TABLES SECTION (FLEX-[1.1]) ─── */}
      <div className="grid grid-cols-12 gap-2.5 flex-[1.1] min-h-0 my-0.5">
        
        {/* Panel 3: Bank Account Balances (Col span 6) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">Bank Account Balances</h3>
              <button
                onClick={() => setActiveModal('accounts')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-2 py-0.5 rounded-md transition-colors"
              >
                View All
              </button>
            </div>

            <table className="w-full text-left mt-0.5 table-fixed">
              <thead>
                <tr className="border-b border-slate-100 text-[9.5px] font-semibold text-slate-400 uppercase">
                  <th className="w-[30%] pb-0.5 font-semibold">Bank Name</th>
                  <th className="w-[22%] pb-0.5 font-semibold">Account No.</th>
                  <th className="w-[22%] pb-0.5 font-semibold">Account Type</th>
                  <th className="w-[20%] pb-0.5 text-right font-semibold">Balance (₹)</th>
                  <th className="w-[6%] pb-0.5 text-center font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {BENCHMARK_ACCOUNTS.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80 text-xs">
                    <td className="py-1 pr-1 truncate font-semibold text-slate-800 text-[10.5px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-4 h-4 rounded text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 ${acc.logoBg}`}>
                          {acc.initial}
                        </span>
                        <span className="truncate">{acc.bankName}</span>
                      </div>
                    </td>
                    <td className="py-1 px-1 text-[10px] text-slate-600 font-mono truncate">{acc.accountNo}</td>
                    <td className="py-1 px-1 text-[10px] text-slate-500 truncate">{acc.accountType}</td>
                    <td className="py-1 text-[10.5px] font-bold text-slate-900 text-right font-mono">
                      {acc.balance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-1 text-center">
                      <button
                        onClick={() => {
                          setSelectedAccountForDetail(acc)
                          setActiveModal('accountDetail')
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Row: Total */}
          <div className="pt-1 border-t border-slate-200/90 flex items-center justify-between text-xs font-bold text-slate-900">
            <span>Total</span>
            <span className="font-mono text-sm tracking-tight">42,56,320</span>
          </div>
        </div>

        {/* Panel 4: Recent Bank Transactions (Col span 6) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">Recent Bank Transactions</h3>
              <button
                onClick={() => setActiveModal('transactions')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-2 py-0.5 rounded-md transition-colors"
              >
                View All
              </button>
            </div>

            <table className="w-full text-left mt-0.5 table-fixed">
              <thead>
                <tr className="border-b border-slate-100 text-[9.5px] font-semibold text-slate-400 uppercase">
                  <th className="w-[18%] pb-0.5 font-semibold">Date</th>
                  <th className="w-[34%] pb-0.5 font-semibold">Description</th>
                  <th className="w-[14%] pb-0.5 text-center font-semibold">Type</th>
                  <th className="w-[17%] pb-0.5 text-right font-semibold">Amount (₹)</th>
                  <th className="w-[17%] pb-0.5 text-right font-semibold">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {BENCHMARK_TRANSACTIONS.map((txn) => {
                  const isCredit = txn.type === 'Credit'
                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/80 text-xs">
                      <td className="py-1 pr-1 text-[10px] text-slate-500 font-mono truncate">{txn.date}</td>
                      <td className="py-1 px-1 font-medium text-slate-800 text-[10.5px] truncate">{txn.description}</td>
                      <td className="py-1 text-center">
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                          isCredit ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'
                        }`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className={`py-1 text-[10.5px] font-bold text-right font-mono ${
                        isCredit ? 'text-emerald-600' : 'text-slate-800'
                      }`}>
                        {txn.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-1 pl-1 text-[10.5px] text-slate-600 text-right font-mono">
                        {txn.balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Real-time Bank Statement Feed Active</span>
            <span className="text-emerald-600 font-bold">100% Reconciled</span>
          </div>
        </div>

      </div>

      {/* ─── MODALS ─── */}

      {/* 1. Modal: View All Bank Accounts */}
      <Modal
        isOpen={activeModal === 'accounts'}
        onClose={() => setActiveModal(null)}
        title="Complete Bank Account Portfolio & Limits"
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Operational & Collection Accounts</p>
              <p className="text-[11px] text-slate-500">Branch: {selectedBranch} • Period: {selectedPeriod}</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
              Live Bank Sync Active
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2">Bank</th>
                  <th className="p-2">Account Number</th>
                  <th className="p-2">IFSC Code</th>
                  <th className="p-2">Type</th>
                  <th className="p-2 text-right">Balance (₹)</th>
                  <th className="p-2 text-center">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {BENCHMARK_ACCOUNTS.map((acc, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className={`w-5 h-5 rounded text-white text-[9px] font-bold flex items-center justify-center ${acc.logoBg}`}>
                        {acc.initial}
                      </span>
                      {acc.bankName}
                    </td>
                    <td className="p-2 font-mono text-slate-600">{acc.fullAccountNo}</td>
                    <td className="p-2 font-mono text-slate-600">{acc.ifsc}</td>
                    <td className="p-2 text-slate-700">{acc.accountType}</td>
                    <td className="p-2 font-bold font-mono text-right text-slate-900">
                      ₹ {acc.balance.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-center">
                      <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                        {acc.sharePct}%
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
              onClick={() => exportToExcel(BENCHMARK_ACCOUNTS, 'Bank_Account_Portfolio')}
            >
              <Download className="w-3.5 h-3.5" />
              Export Accounts (Excel)
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Modal: View All Transactions */}
      <Modal
        isOpen={activeModal === 'transactions'}
        onClose={() => setActiveModal(null)}
        title="Complete Bank & Cash Statement Ledger"
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Transactions Ledger & Reconciliation</p>
              <p className="text-[11px] text-slate-500">Showing credits, debits, transfers, and closing balance</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
              Full Statement View
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Reference</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Account</th>
                  <th className="p-2 text-center">Type</th>
                  <th className="p-2 text-right">Amount (₹)</th>
                  <th className="p-2 text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {BENCHMARK_TRANSACTIONS.concat([
                  {
                    id: 'TXN-06',
                    date: '27 Sep 2026',
                    description: 'Electricity & Utility Bills',
                    type: 'Debit',
                    amount: 14200,
                    balance: 1765300,
                    account: 'HDFC Bank (XXXX 1234)',
                    refNo: 'TXN2026092701',
                  },
                  {
                    id: 'TXN-07',
                    date: '26 Sep 2026',
                    description: 'Loan Processing Fee Collection',
                    type: 'Credit',
                    amount: 45000,
                    balance: 1810300,
                    account: 'IDFC FIRST (XXXX 5678)',
                    refNo: 'TXN2026092601',
                  },
                  {
                    id: 'TXN-08',
                    date: '25 Sep 2026',
                    description: 'Cash Deposit to Bank',
                    type: 'Credit',
                    amount: 100000,
                    balance: 1910300,
                    account: 'HDFC Bank (XXXX 1234)',
                    refNo: 'TXN2026092501',
                  },
                ]).map((txn, i) => {
                  const isCredit = txn.type === 'Credit'
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-mono text-slate-600">{txn.date}</td>
                      <td className="p-2 font-mono text-slate-500 text-[10px]">{txn.refNo}</td>
                      <td className="p-2 font-semibold text-slate-800">{txn.description}</td>
                      <td className="p-2 text-slate-600">{txn.account}</td>
                      <td className="p-2 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className={`p-2 font-mono font-bold text-right ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                        ₹ {txn.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 font-mono text-slate-700 text-right">
                        ₹ {txn.balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setActiveModal(null)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              onClick={() => exportToExcel(BENCHMARK_TRANSACTIONS, 'Bank_Transactions_Ledger')}
            >
              <Download className="w-3.5 h-3.5" />
              Export Statement (Excel)
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Modal: Single Account Detail */}
      <Modal
        isOpen={activeModal === 'accountDetail'}
        onClose={() => {
          setActiveModal(null)
          setSelectedAccountForDetail(null)
        }}
        title={`Account Details: ${selectedAccountForDetail?.bankName || ''}`}
        size="md"
      >
        {selectedAccountForDetail && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Available Balance</span>
                <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                  ₹ {selectedAccountForDetail.balance.toLocaleString('en-IN')}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-white text-xs font-bold ${selectedAccountForDetail.logoBg}`}>
                {selectedAccountForDetail.accountType} Account
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 border border-slate-100 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bank Name</span>
                <strong className="text-slate-800 text-sm">{selectedAccountForDetail.bankName}</strong>
              </div>
              <div className="p-2 border border-slate-100 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Account Number</span>
                <strong className="text-slate-800 font-mono text-xs">{selectedAccountForDetail.fullAccountNo}</strong>
              </div>
              <div className="p-2 border border-slate-100 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">IFSC Code</span>
                <strong className="text-slate-800 font-mono text-xs">{selectedAccountForDetail.ifsc}</strong>
              </div>
              <div className="p-2 border border-slate-100 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Branch</span>
                <strong className="text-slate-800 text-sm">{selectedAccountForDetail.branch}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="outline" onClick={() => setActiveModal(null)}>Close</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                onClick={() => {
                  setActiveModal('transactions')
                }}
              >
                View Transactions
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
