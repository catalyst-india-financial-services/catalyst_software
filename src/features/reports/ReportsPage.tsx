import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Wallet, Percent, FileText, Briefcase,
  Users, ClipboardCheck, Building2, ShieldAlert,
  ChevronRight, Search, FileSearch, Clock, ChevronDown
} from 'lucide-react'
import { Modal, Button } from '@/components/ui'

const REPORTS = [
  { 
    id: 1, 
    title: 'KYC & Compliance', 
    desc: 'Audit customer profiles, Aadhaar/PAN verification, and KYC statuses.', 
    icon: ShieldAlert, 
    iconColor: 'text-blue-600', iconBg: 'bg-blue-50', badgeBg: 'bg-blue-600',
    subReports: [
      { id: 'KYC_01', name: 'Pending KYC Approvals', desc: 'Customers awaiting manual KYC verification.', freq: 'Real-time' },
      { id: 'KYC_02', name: 'Rejected KYC Log', desc: 'History of rejected profiles with reasons.', freq: 'Daily' },
      { id: 'KYC_03', name: 'Fraud Check Watchlist', desc: 'Profiles flagged by the internal fraud database check.', freq: 'Real-time' }
    ]
  },
  { 
    id: 2, 
    title: 'Loan Portfolio', 
    desc: 'Track active loans, pending approvals, and total principal disbursed.', 
    icon: Briefcase, 
    iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', badgeBg: 'bg-emerald-600',
    subReports: [
      { id: 'LOAN_01', name: 'Active Accounts Ledger', desc: 'All active loans with outstanding balances.', freq: 'Daily' },
      { id: 'LOAN_02', name: 'Pending Disbursals', desc: 'Approved loans waiting for fund disbursement.', freq: 'Real-time' },
      { id: 'LOAN_03', name: 'Draft Loans Aging', desc: 'Incomplete loan setups that have been abandoned.', freq: 'Weekly' }
    ]
  },
  { 
    id: 3, 
    title: 'Collections & EMI', 
    desc: 'Monitor daily collections, bounced payments, and overdue EMIs.', 
    icon: Wallet, 
    iconColor: 'text-orange-600', iconBg: 'bg-orange-50', badgeBg: 'bg-orange-600',
    subReports: [
      { id: 'EMI_01', name: 'Daily Collection Report', desc: 'Total EMI collections recorded today across all branches.', freq: 'Daily' },
      { id: 'EMI_02', name: 'Overdue EMI Aging', desc: 'Accounts missing EMI payments categorized by 30/60/90 days.', freq: 'Weekly' },
      { id: 'EMI_03', name: 'Upcoming EMI Reminders', desc: 'Customers with EMIs due in the next 3 days.', freq: 'Daily' }
    ]
  },
  { 
    id: 4, 
    title: 'Branch Performance', 
    desc: 'Compare Vallipuram, Namakkal, and Aniyapuram branch metrics.', 
    icon: Building2, 
    iconColor: 'text-purple-600', iconBg: 'bg-purple-50', badgeBg: 'bg-purple-600',
    subReports: [
      { id: 'BR_01', name: 'Branch Disbursement Stats', desc: 'Total loans and principal disbursed per branch.', freq: 'Monthly' },
      { id: 'BR_02', name: 'Cross-Branch Requests', desc: 'Log of customers shared between Base and Operating branches.', freq: 'Real-time' },
      { id: 'BR_03', name: 'Branch Recovery Rate', desc: 'Percentage of expected collections recovered per branch.', freq: 'Monthly' }
    ]
  },
  { 
    id: 5, 
    title: 'Lead Management', 
    desc: 'Pipeline of leads, follow-ups, and conversion metrics.', 
    icon: Users, 
    iconColor: 'text-pink-600', iconBg: 'bg-pink-50', badgeBg: 'bg-pink-600',
    subReports: [
      { id: 'LEAD_01', name: 'Pending Follow-ups', desc: 'Leads scheduled for follow-up today or overdue.', freq: 'Real-time' },
      { id: 'LEAD_02', name: 'Lead Conversion Ratio', desc: 'Number of leads converted into active customers.', freq: 'Monthly' },
      { id: 'LEAD_03', name: 'Rejected Leads Log', desc: 'Leads declined categorized by rejection reason.', freq: 'Weekly' }
    ]
  },
  { 
    id: 6, 
    title: 'Transactions Ledger', 
    desc: 'Full audit trail of receipts, payments, and system ledger entries.', 
    icon: FileText, 
    iconColor: 'text-teal-600', iconBg: 'bg-teal-50', badgeBg: 'bg-teal-600',
    subReports: [
      { id: 'TXN_01', name: 'Daily Cash Book', desc: 'All cash in and cash out transactions for the day.', freq: 'Daily' },
      { id: 'TXN_02', name: 'Reversed Transactions', desc: 'Audit log of payments or disbursals that were deleted/reversed.', freq: 'Real-time' },
      { id: 'TXN_03', name: 'Bank Transfer Reconciliation', desc: 'NEFT/IMPS/UPI payments pending bank clearing.', freq: 'Daily' }
    ]
  },
  { 
    id: 7, 
    title: 'Risk & Segmentation', 
    desc: 'Customer risk categorization, occupational stability, and NPAs.', 
    icon: TrendingUp, 
    iconColor: 'text-rose-600', iconBg: 'bg-rose-50', badgeBg: 'bg-rose-600',
    subReports: [
      { id: 'RISK_01', name: 'High Risk Customers', desc: 'Customers flagged with Category C or high-risk segments.', freq: 'Real-time' },
      { id: 'RISK_02', name: 'NPA Prediction', desc: 'Accounts showing early signs of becoming Non-Performing Assets.', freq: 'Weekly' },
      { id: 'RISK_03', name: 'Customer Demographics', desc: 'Distribution by occupation, location, and income bracket.', freq: 'Monthly' }
    ]
  },
  { 
    id: 8, 
    title: 'Staff Activity', 
    desc: 'System logs for loan officers, managers, and admins.', 
    icon: ClipboardCheck, 
    iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50', badgeBg: 'bg-indigo-600',
    subReports: [
      { id: 'STAFF_01', name: 'Customer Creation Log', desc: 'Count of new profiles created by each staff member.', freq: 'Weekly' },
      { id: 'STAFF_02', name: 'Approval Turnaround Time', desc: 'Average time taken by managers to approve branch requests.', freq: 'Monthly' },
      { id: 'STAFF_03', name: 'System Access Log', desc: 'Audit trail of staff logins and sensitive data access.', freq: 'Real-time' }
    ]
  },
  { 
    id: 9, 
    title: 'Financial Statements', 
    desc: 'Profit & Loss, balance sheets, and interest revenue recognition.', 
    icon: Percent, 
    iconColor: 'text-amber-600', iconBg: 'bg-amber-50', badgeBg: 'bg-amber-600',
    subReports: [
      { id: 'FIN_01', name: 'Interest Realized', desc: 'Total interest collected vs accrued.', freq: 'Monthly' },
      { id: 'FIN_02', name: 'Principal Outstanding', desc: 'Total capital currently deployed in the market.', freq: 'Daily' },
      { id: 'FIN_03', name: 'Processing Fees Revenue', desc: 'Revenue generated strictly from loan processing and document fees.', freq: 'Monthly' }
    ]
  },
]

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState<typeof REPORTS[0] | null>(null)

  return (
    <div className="p-4 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 flex-shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Reports Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">Access all business reports in one place</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          Recently Viewed
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </motion.button>
      </div>

      {/* Grid */}
      <motion.div layout className={selectedReport ? "flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar space-y-4" : "flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar"}>
        {REPORTS.map((report, idx) => {
          const Icon = report.icon
          const isSelected = selectedReport?.id === report.id
          
          if (selectedReport && !isSelected) return null // Hide others when one is selected
          
          return (
            <motion.div
              layout
              key={report.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={!isSelected ? { scale: 1.02, y: -2 } : {}}
              whileTap={!isSelected ? { scale: 0.98 } : {}}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className={`bg-white rounded-xl border transition-all overflow-hidden flex flex-col group ${
                isSelected 
                  ? 'border-blue-400 shadow-md ring-2 ring-blue-50/50 z-10' 
                  : 'border-slate-200 shadow-sm hover:shadow hover:border-blue-200 cursor-pointer'
              }`}
            >
              <div 
                className="p-4 flex flex-col sm:flex-row sm:items-start gap-3 flex-1 cursor-pointer"
                onClick={() => setSelectedReport(isSelected ? null : report)}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${report.iconBg} ${report.iconColor}`}>
                  <Icon className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white ${report.badgeBg}`}>
                        {report.id}
                      </span>
                      <h3 className="font-extrabold text-slate-800 text-sm leading-tight">{report.title}</h3>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {report.subReports.length} Reports
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2 max-w-3xl line-clamp-2">
                    {report.desc}
                  </p>
                  {!isSelected && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      {report.subReports.length} Reports
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Inline Table */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="border-t border-slate-100 bg-slate-50/50 flex flex-col flex-1"
                  >
                    <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-4 py-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Report Identifier</th>
                              <th className="px-4 py-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Data Points Included</th>
                              <th className="px-4 py-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Frequency</th>
                              <th className="px-4 py-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Last Run</th>
                              <th className="px-4 py-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {report.subReports.map((sub, i) => (
                              <tr key={sub.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                    <span className="text-xs font-extrabold text-slate-800">{sub.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[200px] truncate">
                                  {sub.desc}
                                </td>
                                <td className="px-4 py-2.5 text-xs font-semibold text-slate-600">
                                  {sub.freq}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">
                                  {sub.freq === 'Real-time' ? 'Just now' : `${Math.floor(Math.random() * 8) + 1} hrs ago`}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button className="px-3 py-1.5 rounded bg-white border border-slate-200 text-[10px] font-extrabold text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                                    Export
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)} className="font-bold text-xs px-3 py-1.5 h-auto">
                          Back to Reports
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* View Reports Footer (only visible when collapsed) */}
              {!isSelected && (
                <div 
                  className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <span className="text-xs font-bold text-blue-600">View Breakups</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              )}
            </motion.div>
          )
        })}
      </motion.div>

      {/* Footer Search */}
      {!selectedReport && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-center text-blue-600 flex-shrink-0">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Can't find what you need?</h4>
              <p className="text-xs text-slate-500">Use search to find reports.</p>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm bg-white font-medium placeholder-slate-400"
            />
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </motion.div>
      )}
    </div>
  )
}
