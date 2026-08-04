import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Search, ChevronDown, Plus, Settings, LogOut } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { Avatar, CommandPalette } from '@/components/ui'

export function Header() {
  const { setSidebarOpen } = useUIStore()
  const { user, signOut } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const navigate = useNavigate()
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      <header className="glass sticky top-0 z-30 h-16 border-b border-slate-200/80 flex items-center gap-4 px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Spotlight Trigger */}
        <button
          onClick={() => setShowCommandPalette(true)}
          className="flex items-center gap-3 px-3.5 py-2 w-full max-w-sm sm:max-w-md bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/60 rounded-xl text-slate-500 transition-all text-xs font-medium group text-left"
        >
          <Search className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors flex-shrink-0" />
          <span className="flex-1 truncate">Search customers, loans, receipts...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-white rounded border border-slate-200 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Right Nav Options */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Quick Actions Dropdown */}
          <button
            onClick={() => navigate('/emi-collection')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl border border-brand-200/60 transition-colors shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Quick EMI
          </button>

          <div className="h-5 w-px bg-slate-200" />

          {/* User Menu Dropdown */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Avatar name={user?.full_name ?? 'Admin User'} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">{user?.full_name ?? 'Admin User'}</p>
                <p className="text-[10px] text-slate-400 capitalize font-medium">{user?.role ?? 'Admin'}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 p-1.5"
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-900">{user?.full_name ?? 'Admin User'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email ?? 'admin@financeApp.com'}</p>
                  </div>
                  <button
                    onClick={() => { navigate('/settings'); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-colors text-left"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Company Settings
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Command Palette Spotlight Search */}
      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
    </>
  )
}
