import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, Lock, Mail, ArrowRight } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { useSignIn } from '@/hooks/useDb'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [email, setEmail] = useState('admin@financeApp.com')
  const [password, setPassword] = useState('password123')

  const signInMutation = useSignIn()
  const isLoading = signInMutation.isPending

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    signInMutation.mutate(
      { email, fullName: 'Admin User' },
      {
        onSuccess: (data) => {
          setUser(data)
          navigate('/dashboard')
        },
      }
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 border-slate-800 bg-slate-900/80 backdrop-blur-xl text-white shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-emerald-400 flex items-center justify-center shadow-lg mb-3">
              <DollarSign className="h-7 w-7 text-slate-900" />
            </div>
            <h1 className="text-2xl font-bold text-white">FinanceERP</h1>
            <p className="text-sm text-slate-400 mt-1">Enterprise Finance Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              loading={isLoading}
              className="w-full py-3 bg-gradient-to-r from-brand-500 to-emerald-500 hover:from-brand-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg"
            >
              Sign In to Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
            <p>Demo Mode: Click Sign In to access the portal</p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
