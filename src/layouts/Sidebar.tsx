import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { Avatar, Tooltip } from '@/components/ui'
import {
  LayoutDashboard, Users, WalletCards, ArrowLeftRight, Settings2,
  LogOut, PanelLeftClose, PanelLeftOpen, DollarSign, X, UserPlus
} from 'lucide-react'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: UserPlus },
  { path: '/customers', label: 'Customer Profile', icon: Users },
  { path: '/loans', label: 'Accounts', icon: WalletCards },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/settings', label: 'Settings', icon: Settings2 },
]

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { user, signOut } = useAuthStore()
  const location = useLocation()
  const { toggleSidebar } = useUIStore()

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className={cn('px-4 py-4.5 border-b border-slate-800/80 flex items-center justify-between', collapsed && 'px-3 justify-center')}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30 text-white font-bold">
            <DollarSign className="h-5 w-5 stroke-[2.5]" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-white tracking-tight">FinanceERP</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">Enterprise SaaS 2026</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)

          const linkContent = (
            <NavLink
              to={item.path}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group',
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80',
                collapsed && 'justify-center px-2 py-2.5'
              )}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110', isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200')} />
              {!collapsed && (
                <span className="flex-1 truncate tracking-tight">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <motion.div
                  layoutId="sidebarActiveIndicator"
                  className="absolute right-0 top-2 bottom-2 w-1 bg-white rounded-l-full"
                />
              )}
            </NavLink>
          )

          if (collapsed) {
            return (
              <Tooltip key={item.path} content={item.label} side="right">
                {linkContent}
              </Tooltip>
            )
          }

          return <div key={item.path}>{linkContent}</div>
        })}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="px-3 py-2 border-t border-slate-800/80 flex items-center justify-between">
        <button
          onClick={toggleSidebar}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span>Collapse Sidebar</span>}
        </button>
      </div>

      {/* User Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
          <Avatar name={user?.full_name ?? 'Admin User'} size="sm" className="ring-2 ring-brand-500/30" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.full_name ?? 'Admin User'}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{user?.role ?? 'admin'}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => { signOut() }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed } = useUIStore()

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden lg:flex flex-col h-full bg-slate-900 border-r border-slate-800 shadow-sidebar relative flex-shrink-0 z-30"
      style={{ minWidth: sidebarCollapsed ? 72 : 260 }}
    >
      <SidebarContent collapsed={sidebarCollapsed} />
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
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-slate-900 shadow-2xl lg:hidden"
          >
            <div className="absolute right-3 top-3 z-10">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent collapsed={false} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
