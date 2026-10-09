import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, CreditCard, Percent, FileText, Briefcase,
  Users, ClipboardCheck, Landmark, ShieldAlert,
  ChevronRight, Search, FileSearch, Clock, ChevronDown
} from 'lucide-react'
import { Modal, Button } from '@/components/ui'

const REPORTS = [
  { 
    id: 1, 
    title: 'Performance Reports', 
    desc: 'Track business performance over time (DOD, MOM, YTD, YOY).', 
    icon: TrendingUp, 
    iconColor: 'text-blue-600', iconBg: 'bg-blue-50', badgeBg: 'bg-blue-600',
    subReports: Array.from({ length: 4 }).map((_, i) => ({ id: `PERF_0${i+1}`, name: `Performance Report ${i+1}`, desc: 'Detailed performance metrics.', freq: 'Daily' }))
  },
  { 
    id: 2, 
    title: 'Collection & EMI Reports', 
    desc: 'Monitor collections, EMI status, efficiency and overdue aging.', 
    icon: CreditCard, 
    iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', badgeBg: 'bg-emerald-600',
    subReports: Array.from({ length: 6 }).map((_, i) => ({ id: `COL_0${i+1}`, name: `Collection Report ${i+1}`, desc: 'EMI and collection details.', freq: 'Daily' }))
  },
  { 
    id: 3, 
    title: 'Interest & Profitability', 
    desc: 'Analyze interest performance and profitability metrics.', 
    icon: Percent, 
    iconColor: 'text-orange-600', iconBg: 'bg-orange-50', badgeBg: 'bg-orange-600',
    subReports: Array.from({ length: 5 }).map((_, i) => ({ id: `INT_0${i+1}`, name: `Interest Report ${i+1}`, desc: 'Profitability analysis.', freq: 'Monthly' }))
  },
  { 
    id: 4, 
    title: 'Financial Reports (Accounts)', 
    desc: 'Core financial statements and accounting reports.', 
    icon: FileText, 
    iconColor: 'text-purple-600', iconBg: 'bg-purple-50', badgeBg: 'bg-purple-600',
    subReports: Array.from({ length: 7 }).map((_, i) => ({ id: `FIN_0${i+1}`, name: `Financial Report ${i+1}`, desc: 'Core accounting statements.', freq: 'Monthly' }))
  },
  { 
    id: 5, 
    title: 'Loan Portfolio Reports', 
    desc: 'View loan portfolio status and aging analysis.', 
    icon: Briefcase, 
    iconColor: 'text-teal-600', iconBg: 'bg-teal-50', badgeBg: 'bg-teal-600',
    subReports: Array.from({ length: 5 }).map((_, i) => ({ id: `LOAN_0${i+1}`, name: `Portfolio Report ${i+1}`, desc: 'Loan status analysis.', freq: 'Weekly' }))
  },
  { 
    id: 6, 
    title: 'Staff Performance Reports', 
    desc: 'Track staff targets, productivity and recovery performance.', 
    icon: Users, 
    iconColor: 'text-pink-600', iconBg: 'bg-pink-50', badgeBg: 'bg-pink-600',
    subReports: Array.from({ length: 5 }).map((_, i) => ({ id: `STAFF_0${i+1}`, name: `Staff Report ${i+1}`, desc: 'Staff productivity metrics.', freq: 'Daily' }))
  },
  { 
    id: 7, 
    title: 'Task & Operations Reports', 
    desc: 'Daily tasks, activities, calls and operational reports.', 
    icon: ClipboardCheck, 
    iconColor: 'text-amber-500', iconBg: 'bg-amber-50', badgeBg: 'bg-amber-500',
    subReports: Array.from({ length: 4 }).map((_, i) => ({ id: `TASK_0${i+1}`, name: `Operations Report ${i+1}`, desc: 'Daily operational tasks.', freq: 'Real-time' }))
  },
  { 
    id: 8, 
    title: 'Bank & Cash Reports', 
    desc: 'Banking, reconciliation, cash book and fund flow reports.', 
    icon: Landmark, 
    iconColor: 'text-blue-600', iconBg: 'bg-blue-50', badgeBg: 'bg-blue-600',
    subReports: Array.from({ length: 4 }).map((_, i) => ({ id: `BANK_0${i+1}`, name: `Bank Report ${i+1}`, desc: 'Fund flow and reconciliation.', freq: 'Daily' }))
  },
  { 
    id: 9, 
    title: 'Risk & Control Reports', 
    desc: 'Monitor risk, NPAs, defaults and recovery efficiency.', 
    icon: ShieldAlert, 
    iconColor: 'text-rose-600', iconBg: 'bg-rose-50', badgeBg: 'bg-rose-600',
    subReports: Array.from({ length: 4 }).map((_, i) => ({ id: `RISK_0${i+1}`, name: `Risk Report ${i+1}`, desc: 'NPA and default tracking.', freq: 'Monthly' }))
  }
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
              <p className="text-xs text-slate-500">Use search to find the right report or explore categories.</p>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search any report..."
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
