import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, CreditCard, WalletCards, UserPlus, ArrowRight, X } from 'lucide-react'
import { useCustomers, useLoans, useLeads } from '@/hooks/useDb'
import { formatCurrency } from '@/utils'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = React.useState('')
  const navigate = useNavigate()

  const { data: customers = [] } = useCustomers()
  const { data: loans = [] } = useLoans()
  const { data: leads = [] } = useLeads()

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else setQuery('')
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const trimmed = query.trim().toLowerCase()

  const filteredCustomers = trimmed
    ? customers.filter(c => c.name.toLowerCase().includes(trimmed) || c.mobile.includes(trimmed) || c.customer_id.toLowerCase().includes(trimmed)).slice(0, 4)
    : customers.slice(0, 3)

  const filteredLoans = trimmed
    ? loans.filter(l => l.loan_number.toLowerCase().includes(trimmed) || (l.customer_name || '').toLowerCase().includes(trimmed)).slice(0, 4)
    : loans.slice(0, 3)

  const filteredLeads = trimmed
    ? leads.filter(l => l.name.toLowerCase().includes(trimmed) || l.phone.includes(trimmed) || l.product.toLowerCase().includes(trimmed)).slice(0, 3)
    : leads.slice(0, 2)

  const quickNavs = [
    { label: 'Go to Dashboard', icon: Search, path: '/dashboard' },
    { label: 'Collect EMI Payment', icon: WalletCards, path: '/emi-collection' },
    { label: 'Add New Customer', icon: Users, path: '/customers' },
    { label: 'Manage Website Leads', icon: UserPlus, path: '/leads' },
  ]

  const handleSelect = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[80vh]"
        >
          {/* Search bar header */}
          <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
            <Search className="h-5 w-5 text-brand-600 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Type a command or search customers, loans, leads..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 rounded border border-slate-200">
              ESC
            </kbd>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Results list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
            {/* Quick Actions */}
            {!trimmed && (
              <div>
                <p className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Quick Actions</p>
                <div className="space-y-0.5 mt-1">
                  {quickNavs.map(item => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleSelect(item.path)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-50 hover:text-brand-600 text-slate-700 font-medium transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-brand-100 group-hover:text-brand-600 flex items-center justify-center text-slate-500">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm flex-1">{item.label}</span>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-brand-600" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Customers Section */}
            {filteredCustomers.length > 0 && (
              <div>
                <p className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Customers</p>
                <div className="space-y-0.5 mt-1">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(`/customers/${c.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors text-left group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                        <p className="text-slate-400 text-[11px] truncate">{c.mobile} · {c.city}</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-500">{c.customer_id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loans Section */}
            {filteredLoans.length > 0 && (
              <div>
                <p className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Loans</p>
                <div className="space-y-0.5 mt-1">
                  {filteredLoans.map(l => (
                    <button
                      key={l.id}
                      onClick={() => handleSelect(`/loans/${l.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors text-left group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{l.loan_number} — {l.customer_name}</p>
                        <p className="text-slate-400 text-[11px] truncate">{l.loan_type.toUpperCase()} LOAN · EMI {formatCurrency(l.emi_amount)}</p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 amount-display">{formatCurrency(l.loan_amount)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Leads Section */}
            {filteredLeads.length > 0 && (
              <div>
                <p className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Website Leads</p>
                <div className="space-y-0.5 mt-1">
                  {filteredLeads.map(l => (
                    <button
                      key={l.id}
                      onClick={() => handleSelect('/leads')}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors text-left group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{l.name}</p>
                        <p className="text-slate-400 text-[11px] truncate">{l.product} · {l.phone}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 font-semibold rounded-full">{l.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer keyboard guide */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-mono">↵</kbd> to select</span>
              <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-mono">ESC</kbd> to exit</span>
            </div>
            <span className="font-medium text-brand-600">Enterprise Command Center</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
