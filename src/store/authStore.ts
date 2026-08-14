import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { supabase } from '@/services/supabase'

interface AuthState {
  user: User | null
  session: unknown
  activeSessionId: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setSession: (session: unknown) => void
  setActiveSessionId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      activeSessionId: null,
      isLoading: false,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setActiveSessionId: (id) => set({ activeSessionId: id }),
      setLoading: (isLoading) => set({ isLoading }),
      signOut: async () => {
        const { activeSessionId, user } = get()

        // 1. Update session record with logout time (non-blocking)
        if (activeSessionId) {
          try {
            await supabase
              .from('employee_sessions')
              .update({
                logout_at: new Date().toISOString(),
                status: 'offline',
                duration_secs: null, // will be computed by DB or left null
              })
              .eq('id', activeSessionId)
          } catch (err) {
            console.warn('Failed to update session logout time:', err)
          }
        }

        // 2. Update last_logout on users table (non-blocking)
        if (user?.id) {
          try {
            await supabase
              .from('users')
              .update({ last_logout: new Date().toISOString() })
              .eq('id', user.id)
          } catch (err) {
            console.warn('Failed to update last_logout:', err)
          }
        }

        // 3. Sign out from Supabase Auth (always runs)
        try {
          await supabase.auth.signOut()
        } catch (err) {
          console.warn('Supabase auth signOut error:', err)
        }

        // 4. Clear local state
        set({ user: null, session: null, isAuthenticated: false, activeSessionId: null })
        window.location.href = '/login'
      },
    }),
    {
      name: 'erp-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
)
