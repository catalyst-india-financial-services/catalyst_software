import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  FileText, ShieldCheck, Landmark, Users, Search, Filter,
  Building, ChevronDown, CheckCircle2, AlertCircle, Clock,
  ArrowRight, Download, RefreshCw, BarChart2
} from 'lucide-react'
import {
  useCustomers, useLoans
} from '@/hooks/useDb'
import { useAuthStore } from '@/store/authStore'
import { Card, CardHeader, CardTitle, CardBody, Badge, StatusBadge } from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'

// Tabs
const TAB_ITEMS = [
  { id: 'kyc', label: 'KYC Compliance Audit', icon: ShieldCheck },
  { id: 'loans', label: 'Loan Account Status Audit', icon: Landmark },
  { id: 'branches', label: 'Branch Performance Audit', icon: Building },
]

export default function ReportsPage() {
  const { isBranchUser, userBranch, selectedBranch } = useAuthStore()
  const activeBranch = isBranchUser ? userBranch : selectedBranch

  const [activeTab, setActiveTab] = useState<'kyc' | 'loans' | 'branches'>('kyc')
  const [searchQuery, setSearchQuery] = useState('')
  const [kycFilter, setKycFilter] = useState('all')
  const [loanStatusFilter, setLoanStatusFilter] = useState('all')

  // Fetch Database Data
  const { data: customers = [], isLoading: isCustLoading, refetch: refetchCustomers } = useCustomers()
  const { data: loans = [], isLoading: isLoansLoading, refetch: refetchLoans } = useLoans()

  const handleRefresh = () => {
    refetchCustomers()
    refetchLoans()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. KYC Compliance Audit Calculations & Filtering
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Branch filter
      if (activeBranch && c.branch !== activeBranch) return false
      // KYC filter
      if (kycFilter !== 'all' && c.kyc_status !== kycFilter) return false
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          c.name.toLowerCase().includes(query) ||
          c.mobile.includes(query) ||
          c.customer_id.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [customers, kycFilter, searchQuery, activeBranch])

  const kycSummary = useMemo(() => {
    const total = filteredCustomers.length
    const verified = filteredCustomers.filter(c => c.kyc_status === 'verified').length
    const pending = filteredCustomers.filter(c => c.kyc_status === 'pending').length
    const rejected = filteredCustomers.filter(c => c.kyc_status === 'rejected').length
    const pct = total ? Math.round((verified / total) * 100) : 0

    return { total, verified, pending, rejected, pct }
  }, [filteredCustomers])

  const kycChartData = useMemo(() => {
    return [
      { name: 'Verified', value: kycSummary.verified, color: '#10b981' },
      { name: 'Pending', value: kycSummary.pending, color: '#f59e0b' },
      { name: 'Rejected', value: kycSummary.rejected, color: '#ef4444' },
    ].filter(item => item.value > 0)
  }, [kycSummary])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Loan Account Status Audit Calculations & Filtering
  // ─────────────────────────────────────────────────────────────────────────────
  const parsedLoans = useMemo(() => {
    return loans.map(l => {
      const customer = customers.find(c => c.id === l.customer_id)
      const isKycVerified = customer ? (customer.kyc_status === 'verified' || customer.status === 'active') : false
      const computedKycStatus = isKycVerified ? 'verified' : 'pending'
      const displayStatus = isKycVerified && l.status !== 'draft' ? 'active' : l.status

      return {
        ...l,
        computedKycStatus,
        displayStatus
      }
    })
  }, [loans, customers])

  const filteredLoans = useMemo(() => {
    return parsedLoans.filter((l) => {
      // Branch filter
      if (activeBranch && l.branch !== activeBranch) return false
      // Status filter
      if (loanStatusFilter !== 'all' && l.displayStatus !== loanStatusFilter) return false
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          l.loan_number.toLowerCase().includes(query) ||
          l.customer_name?.toLowerCase().includes(query) ||
          l.loan_type.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [parsedLoans, loanStatusFilter, searchQuery, activeBranch])

  const loansSummary = useMemo(() => {
    const total = filteredLoans.length
    const active = filteredLoans.filter(l => l.displayStatus === 'active').length
    const pending = filteredLoans.filter(l => l.displayStatus === 'pending').length
    const draft = filteredLoans.filter(l => l.displayStatus === 'draft').length
    const overdue = filteredLoans.filter(l => l.displayStatus === 'overdue').length
    
    // Sum loan amounts safely
    const totalPrincipalDisbursed = filteredLoans.reduce((sum, l) => sum + (l.loan_amount || 0), 0)

    return { total, active, pending, draft, overdue, totalPrincipalDisbursed }
  }, [filteredLoans])

  const loansChartData = useMemo(() => {
    return [
      { name: 'Active', count: loansSummary.active, color: '#10b981' },
      { name: 'Pending', count: loansSummary.pending, color: '#f59e0b' },
      { name: 'Draft', count: loansSummary.draft, color: '#64748b' },
      { name: 'Overdue', count: loansSummary.overdue, color: '#ef4444' },
    ]
  }, [loansSummary])

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Branch Performance Audit Calculations
  // ─────────────────────────────────────────────────────────────────────────────
  const branchPerformance = useMemo(() => {
    const branches = ['Head Office', 'Aniyapuram', 'Vallipuram', 'Namakkal']
    return branches.map(b => {
      const branchCustomers = customers.filter(c => c.branch === b)
      const branchLoans = parsedLoans.filter(l => l.branch === b)

      const totalCust = branchCustomers.length
      const totalLns = branchLoans.length
      const activeLns = branchLoans.filter(l => l.displayStatus === 'active').length
      const totalDisbursed = branchLoans.reduce((sum, l) => sum + (l.loan_amount || 0), 0)
      const outstandingBal = branchLoans.reduce((sum, l) => sum + (l.remaining_balance || 0), 0)

      return {
        branchName: b,
        totalCustomers: totalCust,
        totalLoans: totalLns,
        activeLoans: activeLns,
        totalDisbursed,
        outstandingBalance: outstandingBal
      }
    })
  }, [customers, parsedLoans])

  // Export to CSV Helper
  const handleExport = () => {
    let headers: string[] = []
    let rows: string[][] = []
    let filename = 'audit-report.csv'

    if (activeTab === 'kyc') {
      headers = ['Customer ID', 'Full Name', 'Mobile', 'KYC Status', 'Profile Status', 'Verification Date']
      rows = filteredCustomers.map(c => [
        c.customer_id,
        c.name,
        c.mobile,
        c.kyc_status.toUpperCase(),
        (c.kyc_status === 'verified' ? 'active' : c.status).toUpperCase(),
        c.kyc_verified_date ? formatDate(c.kyc_verified_date) : '-'
      ])
      filename = 'kyc-compliance-report.csv'
    } else if (activeTab === 'loans') {
      headers = ['Loan Number', 'Borrower', 'Category', 'Principal', 'Status', 'KYC Status']
      rows = filteredLoans.map(l => [
        l.loan_number,
        l.customer_name || 'Unknown',
        l.loan_type.toUpperCase(),
        (l.loan_amount || 0).toString(),
        l.displayStatus.toUpperCase(),
        l.computedKycStatus.toUpperCase()
      ])
      filename = 'loan-accounts-status-report.csv'
    } else {
      headers = ['Branch Name', 'Total Customers', 'Total Loans', 'Active Loans', 'Total Disbursed', 'Outstanding Balance']
      rows = branchPerformance.map(b => [
        b.branchName,
        b.totalCustomers.toString(),
        b.totalLoans.toString(),
        b.activeLoans.toString(),
        b.totalDisbursed.toString(),
        b.outstandingBalance.toString()
      ])
      filename = 'branch-performance-report.csv'
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isLoadingData = isCustLoading || isLoansLoading

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-600" />
            Financial & Audit Reports
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Review audit parameters, KYC compliance status, and branch loan performance tables.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-350 transition-all flex items-center justify-center"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 rounded-xl shadow-md shadow-brand-600/10 flex items-center gap-2 transition-all"
          >
            <Download className="h-4 w-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any)
                setSearchQuery('')
              }}
              className={cn(
                'pb-3 text-xs font-bold transition-all relative flex items-center gap-2',
                isActive ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-400 hover:text-slate-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {isLoadingData ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* ─────────────────────────────────────────────────────────────────
                TAB 1: KYC Compliance Audit
                ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'kyc' && (
              <>
                {/* KYC Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className="p-4 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Records</span>
                    <span className="text-xl font-extrabold text-slate-800 mt-2">{kycSummary.total}</span>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-emerald-500">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Verified KYC</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-xl font-extrabold text-slate-800">{kycSummary.verified}</span>
                      <span className="text-xs text-emerald-600 font-bold">Active</span>
                    </div>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-amber-500">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Pending KYC</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-xl font-extrabold text-slate-800">{kycSummary.pending}</span>
                      <span className="text-xs text-amber-600 font-bold">Draft</span>
                    </div>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-rose-500">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Rejected KYC</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-xl font-extrabold text-slate-800">{kycSummary.rejected}</span>
                      <span className="text-xs text-rose-600 font-bold">Draft</span>
                    </div>
                  </Card>
                  <Card className="p-4 bg-brand-50/20 border-brand-100 flex flex-col justify-between col-span-2 lg:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Compliance Rate</span>
                    <span className="text-xl font-extrabold text-brand-600 mt-2">{kycSummary.pct}%</span>
                  </Card>
                </div>

                {/* Audit Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Table List */}
                  <Card className="lg:col-span-2 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                      <h3 className="text-sm font-extrabold text-slate-800">Compliance Audit Ledger</h3>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-56">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search Name or Mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 hover:border-slate-300"
                          />
                        </div>
                        <div className="relative">
                          <select
                            value={kycFilter}
                            onChange={(e) => setKycFilter(e.target.value)}
                            className="appearance-none pr-8 pl-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-slate-600"
                          >
                            <option value="all">All KYC Status</option>
                            <option value="verified">Verified</option>
                            <option value="pending">Pending</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-55/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                            <th className="px-4 py-2.5">Customer ID</th>
                            <th className="px-4 py-2.5">Customer Name</th>
                            <th className="px-4 py-2.5">KYC Status</th>
                            <th className="px-4 py-2.5">Profile Status</th>
                            <th className="px-4 py-2.5">Verified Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 text-xs">
                          {filteredCustomers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-slate-400">No compliant records found.</td>
                            </tr>
                          ) : (
                            filteredCustomers.map((c) => {
                              const isKycDone = c.kyc_status === 'verified'
                              return (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 font-mono text-[11px] text-brand-600 font-bold">{c.customer_id}</td>
                                  <td className="px-4 py-3">
                                    <p className="font-bold text-slate-800 leading-tight">{c.name}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{c.mobile}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <StatusBadge status={c.kyc_status} />
                                  </td>
                                  <td className="px-4 py-3">
                                    <StatusBadge status={isKycDone ? 'active' : c.status} />
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 font-medium">
                                    {c.kyc_verified_date ? formatDate(c.kyc_verified_date) : '-'}
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Right Column: Chart View */}
                  <Card className="p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Compliance Audit Distribution</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Summary of verified and pending KYC compliance across branch customer databases.</p>
                    </div>

                    <div className="h-56 mt-4 flex items-center justify-center">
                      {kycChartData.length === 0 ? (
                        <p className="text-xs text-slate-400">No chart data available.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={kycChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {kycChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip formatter={(val) => [`${val} Records`, 'Count']} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Card>
                </div>
              </>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                TAB 2: Loan Account Status Audit
                ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'loans' && (
              <>
                {/* Loan Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className="p-4 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Accounts</span>
                    <span className="text-xl font-extrabold text-slate-800 mt-2">{loansSummary.total}</span>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-emerald-500">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Active Accounts</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-xl font-extrabold text-slate-800">{loansSummary.active}</span>
                      <span className="text-xs text-emerald-600 font-bold">Verified</span>
                    </div>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-amber-500">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Pending Activation</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-xl font-extrabold text-slate-800">{loansSummary.pending}</span>
                      <span className="text-xs text-amber-600 font-bold">Awaiting Verification</span>
                    </div>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-slate-500">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Draft Status</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-xl font-extrabold text-slate-800">{loansSummary.draft}</span>
                      <span className="text-xs text-slate-500 font-bold">Incomplete</span>
                    </div>
                  </Card>
                  <Card className="p-4 bg-brand-50/20 border-brand-100 flex flex-col justify-between col-span-2 lg:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Disbursed</span>
                    <span className="text-base font-extrabold text-brand-600 mt-2 amount-display">{formatCurrency(loansSummary.totalPrincipalDisbursed)}</span>
                  </Card>
                </div>

                {/* Audit Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Visual Audit (Matching screenshot) */}
                  <Card className="lg:col-span-2 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-800">Visual Status Matrix Audit</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Audit account status against KYC compliance verification side-by-side.</p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-48">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search Borrower..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 hover:border-slate-300"
                          />
                        </div>
                        <div className="relative">
                          <select
                            value={loanStatusFilter}
                            onChange={(e) => setLoanStatusFilter(e.target.value)}
                            className="appearance-none pr-8 pl-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-slate-600"
                          >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="draft">Draft</option>
                            <option value="overdue">Overdue</option>
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Visual Status List (Screenshot Layout) */}
                    <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-2 no-scrollbar">
                      {filteredLoans.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">No records matching the filter.</div>
                      ) : (
                        filteredLoans.map((l) => (
                          <div key={l.id} className="flex justify-between items-center py-4.5 hover:bg-slate-50/20 px-2 rounded-xl transition-colors">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] font-bold text-slate-800">{l.customer_name || 'Unknown Borrower'}</span>
                              <span className="text-[9px] font-mono text-slate-400">{l.loan_number} • {l.loan_type}</span>
                            </div>
                            <div className="flex items-center gap-12 sm:gap-20">
                              <div className="w-24 flex justify-start">
                                <StatusBadge status={l.displayStatus} />
                              </div>
                              <div className="w-24 flex justify-end">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  l.computedKycStatus === 'verified'
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : 'bg-amber-50 border-amber-100 text-amber-700'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    l.computedKycStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-400'
                                  }`} />
                                  {l.computedKycStatus === 'verified' ? 'Verified' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  {/* Right Column: Chart View */}
                  <Card className="p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Portfolio Status Chart</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Quantity of loan accounts classified by system lifecycle and KYC validation status.</p>
                    </div>

                    <div className="h-56 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={loansChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(val) => [`${val} Accounts`, 'Count']} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {loansChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                TAB 3: Branch Performance Audit
                ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'branches' && (
              <div className="space-y-6">
                {/* Branch Wise Grid Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {branchPerformance.map((bp) => {
                    const isActiveBranch = activeBranch === bp.branchName
                    const activePercentage = bp.totalLoans ? Math.round((bp.activeLoans / bp.totalLoans) * 100) : 0
                    return (
                      <Card
                        key={bp.branchName}
                        className={cn(
                          'p-6 relative overflow-hidden transition-all',
                          isActiveBranch && 'ring-2 ring-brand-500 bg-brand-50/5 border-brand-200'
                        )}
                      >
                        {isActiveBranch && (
                          <div className="absolute top-0 right-0 bg-brand-600 text-white font-bold text-[8px] uppercase tracking-wider px-2.5 py-0.5 rounded-bl-lg">
                            Active filter
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                            <Building className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800">{bp.branchName}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Operating branch statistics</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-100/80 pt-4">
                          <div>
                            <p className="text-[9px] uppercase font-bold text-slate-400">Total Customers</p>
                            <p className="text-base font-extrabold text-slate-700 mt-0.5">{bp.totalCustomers}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase font-bold text-slate-400">Total Accounts</p>
                            <p className="text-base font-extrabold text-slate-700 mt-0.5">
                              {bp.totalLoans}{' '}
                              <span className="text-[10px] font-bold text-slate-400">({bp.activeLoans} Active)</span>
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[9px] uppercase font-bold text-slate-400">Total Principal Disbursed</p>
                            <p className="text-lg font-extrabold text-brand-600 mt-0.5 amount-display">{formatCurrency(bp.totalDisbursed)}</p>
                          </div>
                          <div className="col-span-2 border-t border-slate-100/50 pt-3">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                              <span>Active Account Share</span>
                              <span>{activePercentage}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-600 rounded-full transition-all"
                                style={{ width: `${activePercentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>

                {/* Audit summary table of all branches */}
                <Card className="p-5 space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-800">Branch Performance Comparison Matrix</h3>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-55/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-4 py-3">Branch Location</th>
                          <th className="px-4 py-3 text-right">Total Customers</th>
                          <th className="px-4 py-3 text-right">Total Accounts</th>
                          <th className="px-4 py-3 text-right">Active Accounts</th>
                          <th className="px-4 py-3 text-right">Total Disbursed</th>
                          <th className="px-4 py-3 text-right">Outstanding Principal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50 text-xs">
                        {branchPerformance.map((bp) => (
                          <tr key={bp.branchName} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-800">{bp.branchName}</td>
                            <td className="px-4 py-3 text-right text-slate-600 font-semibold">{bp.totalCustomers}</td>
                            <td className="px-4 py-3 text-right text-slate-600 font-semibold">{bp.totalLoans}</td>
                            <td className="px-4 py-3 text-right text-slate-600 font-semibold">{bp.activeLoans}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 amount-display">{formatCurrency(bp.totalDisbursed)}</td>
                            <td className="px-4 py-3 text-right font-bold text-brand-600 amount-display">{formatCurrency(bp.outstandingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
