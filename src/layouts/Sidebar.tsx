import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { Avatar } from '@/components/ui'
import {
  LayoutDashboard, Users, CreditCard, Wallet, TrendingUp, TrendingDown,
  BarChart3, Bell, UserCog, Settings, LogOut, ChevronLeft,
  DollarSign, X, UserPlus
} from 'lucide-react'

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: UserPlus },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/loans', label: 'Loans', icon: CreditCard },
  { path: '/emi-collection', label: 'EMI Collection', icon: Wallet },
  { path: '/income', label: 'Income', icon: TrendingUp },
  { path: '/expenses', label: 'Expenses', icon: TrendingDown },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/users', label: 'User Management', icon: UserCog },
  { path: '/settings', label: 'Settings', icon: Settings },
]

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { user, signOut } = useAuthStore()
  const location = useLocation()

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('px-4 py-5 border-b border-slate-100 flex items-center gap-3', collapsed && 'justify-center px-2')}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-kpi">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="text-sm font-bold text-slate-900 whitespace-nowrap leading-tight">FinanceERP</div>
              <div className="text-xs text-slate-400 whitespace-nowrap">Enterprise Suite</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-3 px-2 space-y-0.5 no-scrollbar')}>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'sidebar-item',
                isActive && 'active',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          )
        })}
      </nav>

      {/* User section */}
      <div className={cn('border-t border-slate-100 p-3', collapsed ? 'items-center' : '')}>
        <div className={cn('flex items-center gap-2.5 mb-2', collapsed && 'justify-center')}>
          <Avatar name={user?.full_name ?? 'Admin User'} size="sm" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name ?? 'Admin User'}</p>
                <p className="text-xs text-slate-400 capitalize truncate">{user?.role ?? 'admin'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={signOut}
          className={cn(
            'sidebar-item w-full text-red-500 hover:bg-red-50 hover:text-red-600',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut style={{ width: 18, height: 18 }} className="flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden lg:flex flex-col h-full bg-white border-r border-slate-100 shadow-sidebar relative flex-shrink-0"
      style={{ minWidth: sidebarCollapsed ? 72 : 260 }}
    >
      <SidebarContent collapsed={sidebarCollapsed} />
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors"
      >
        <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
        </motion.div>
      </button>
    </motion.aside>
  )
}

export function MobileSidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-white shadow-2xl lg:hidden"
          >
            <div className="absolute right-3 top-3">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent collapsed={false} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
