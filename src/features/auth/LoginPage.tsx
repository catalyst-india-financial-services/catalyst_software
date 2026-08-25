import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { useSignIn } from '@/hooks/useDb'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const setActiveSessionId = useAuthStore((s) => s.setActiveSessionId)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
            <h1 className="text-2xl font-bold text-white tracking-tight">LVC Finance ERP</h1>
            <p className="text-xs text-slate-400 mt-1">Enterprise Finance &amp; Loan Management Suite</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              loading={isLoading}
              className="w-full py-3 mt-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-brand-600/30 text-sm"
            >
              Sign In to Portal <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Credential hints */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Login Accounts</p>
            <div className="space-y-2">
              {[
                { role: 'Admin', email: 'admin@financeApp.com', note: 'Full access — all branches' },
                { role: 'Aniyapuram', email: 'aniyapuram@catalyst.com', note: 'Branch access only' },
                { role: 'Vallipuram', email: 'vallipuram@catalyst.com', note: 'Branch access only' },
              ].map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => setEmail(a.email)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all group"
                >
                  <div className="text-left">
                    <p className="text-[11px] font-bold text-white group-hover:text-brand-300 transition-colors">{a.role}</p>
                    <p className="text-[10px] text-slate-500">{a.note}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-300 transition-colors">{a.email}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-center">Click any row to auto-fill email</p>
          </div>

          <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="h-4 w-4" /> SSL Encrypted
            </span>
            <span>2026 LVC Finance ERP</span>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
