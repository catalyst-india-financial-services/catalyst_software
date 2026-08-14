import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { useSignIn } from '@/hooks/useDb'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const setActiveSessionId = useAuthStore((s) => s.setActiveSessionId)
  const [email, setEmail] = useState('admin@financeApp.com')
  const [password, setPassword] = useState('password123')

  const signInMutation = useSignIn()
  const isLoading = signInMutation.isPending

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    signInMutation.mutate(
      { email, password, fullName: 'Admin User' },
      {
        onSuccess: (data) => {
          setUser(data.user)
          setActiveSessionId(data.sessionId)
          navigate('/dashboard')
        },
      }
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Grid line background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 border-slate-800 bg-slate-900/90 backdrop-blur-2xl text-white shadow-2xl rounded-3xl">
          {/* Logo & Title */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-3 text-white">
              <DollarSign className="h-8 w-8 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              FinanceERP <Sparkles className="h-4 w-4 text-brand-400" />
            </h1>
            <p className="text-xs text-slate-400 mt-1">Enterprise Finance & Loan Management Suite</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              loading={isLoading}
              className="w-full py-3 mt-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-brand-600/30 text-sm"
            >
              Sign In to Enterprise Portal <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="h-4 w-4" /> SSL Encrypted
            </span>
            <span>2026 Enterprise SaaS</span>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
