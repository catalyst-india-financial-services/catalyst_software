import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar, MobileSidebar } from './Sidebar'
import { Header } from './Header'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/services/supabase'

export function AppLayout() {
  const location = useLocation()
  const { user, signOut } = useAuthStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll every 30 seconds to check if this user's account has been disabled by admin
  useEffect(() => {
    if (!user?.id) return

    const check = async () => {
      const { data } = await supabase
        .from('users')
        .select('is_active')
        .eq('id', user.id)
        .single()

      if (data && data.is_active === false) {
        // Account was disabled — force sign-out
        await signOut()
      }
    }

    intervalRef.current = setInterval(check, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user?.id, signOut])

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar */}
      <MobileSidebar />

      {/* Main content viewport */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
