import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Users, UserPlus, Eye, EyeOff, Lock, Mail,
  CheckCircle2, XCircle, Clock, Wifi, WifiOff, Activity,
  KeyRound, Power, RefreshCw, X, User, Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import {
  Button, Card, CardHeader, CardTitle, CardBody, Input, Select
} from '@/components/ui'
import { cn } from '@/utils'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/services/supabase'
import {
  useEmployees, useCreateEmployee, useUpdateEmployee,
  useEmployeeSessions, useAdminPasswordChange, useSendPasswordReset
} from '@/hooks/useDb'

dayjs.extend(relativeTime)
dayjs.extend(duration)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(loginAt: string, logoutAt: string | null): string {
  if (!logoutAt) {
    const secs = dayjs().diff(dayjs(loginAt), 'second')
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return `${h}h ${m}m`
  }
  const secs = dayjs(logoutAt).diff(dayjs(loginAt), 'second')
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h ${m}m`
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    active: { icon: <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />, label: 'Online', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    offline: { icon: <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />, label: 'Offline', cls: 'text-slate-600 bg-slate-50 border-slate-200' },
    expired: { icon: <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />, label: 'Expired', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  }[status] ?? { icon: null, label: status, cls: 'text-slate-500' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border', cfg.cls)}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ─── Create Employee Modal ────────────────────────────────────────────────────

function CreateEmployeeModal({ onClose }: { onClose: () => void }) {
  const createEmployee = useCreateEmployee()
  const [form, setForm] = useState({
    full_name: '', employee_id: '', email: '',
    role: 'employee', password: '', confirmPassword: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.full_name || !form.employee_id || !form.email || !form.password)
      return toast.error('All fields are required')
    if (form.password.length < 8)
      return toast.error('Password must be at least 8 characters')
    if (form.password !== form.confirmPassword)
      return toast.error('Passwords do not match')

    setLoading(true)
    try {
      await createEmployee.mutateAsync(form)
      toast.success(`Employee ${form.full_name} created successfully!`)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create employee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Create Employee</h3>
            <p className="text-xs text-slate-500 mt-0.5">Set up a new employee account</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Full Name *" value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Kumar Rajan" />
            </div>
            <Input label="Employee ID *" value={form.employee_id}
              onChange={e => setForm({ ...form, employee_id: e.target.value.toUpperCase() })}
              placeholder="e.g. EMP001" />
            <Select label="Role *" value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              options={[
                { value: 'employee', label: 'Employee' },
                { value: 'manager', label: 'Manager' },
                { value: 'staff', label: 'Collection Staff' },
              ]} />
            <div className="col-span-2">
              <Input label="Email *" type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="kumar@company.com" />
            </div>
            <div className="relative">
              <Input label="Password *" type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 characters" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-8 text-slate-400">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input label="Confirm Password *" type="password" value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Re-enter password" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleSubmit} loading={loading}>
              <UserPlus className="h-4 w-4" /> Create Employee
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Activity Panel ───────────────────────────────────────────────────────────

function ActivityPanel({ employee, onClose }: { employee: any; onClose: () => void }) {
  const { data: sessions = [], isLoading } = useEmployeeSessions(employee.id)
  const activeSession = sessions.find((s: any) => s.status === 'active')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-white h-full w-full max-w-lg shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-slate-900">{employee.full_name}</h3>
            <p className="text-xs text-slate-500">{employee.employee_id} · {employee.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Current Status</p>
            <div className={cn('rounded-2xl p-4 border flex items-start gap-4',
              activeSession ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200')}>
              {activeSession
                ? <Wifi className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                : <WifiOff className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />}
              <div className="flex-1">
                <p className={cn('font-bold', activeSession ? 'text-emerald-800' : 'text-slate-600')}>
                  {activeSession ? '🟢 Online' : '⚪ Offline'}
                </p>
                {activeSession ? (
                  <>
                    <p className="text-xs text-emerald-700 mt-1">
                      Session started {dayjs(activeSession.login_at).fromNow()}
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Duration: {formatDuration(activeSession.login_at, null)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    Last login: {employee.last_login
                      ? dayjs(employee.last_login).format('DD MMM YYYY, hh:mm A')
                      : 'Never'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Session History */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Login History</p>
            {isLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading sessions…</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No session history</div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s: any) => (
                  <div key={s.id}
                    className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="mt-0.5">
                      {s.status === 'active'
                        ? <Activity className="h-4 w-4 text-emerald-500" />
                        : s.status === 'expired'
                          ? <Clock className="h-4 w-4 text-amber-500" />
                          : <CheckCircle2 className="h-4 w-4 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-700">
                          {dayjs(s.login_at).format('DD MMM YYYY')}
                        </p>
                        <StatusBadge status={s.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        <div>
                          <p className="text-[10px] text-slate-400">Login</p>
                          <p className="text-xs font-semibold text-slate-700">
                            {dayjs(s.login_at).format('hh:mm A')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Logout</p>
                          <p className="text-xs font-semibold text-slate-700">
                            {s.logout_at ? dayjs(s.logout_at).format('hh:mm A') : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Duration</p>
                          <p className="text-xs font-semibold text-slate-700">
                            {s.logout_at || s.status === 'expired'
                              ? formatDuration(s.login_at, s.logout_at)
                              : 'Active'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const changePassword = useAdminPasswordChange()
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showFields, setShowFields] = useState({ current: false, new: false, confirm: false })
  const [step, setStep] = useState<'form' | 'email_sent'>('form')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.current || !form.newPw || !form.confirm)
      return toast.error('All fields are required')
    if (form.newPw.length < 8)
      return toast.error('New password must be at least 8 characters')
    if (form.newPw !== form.confirm)
      return toast.error('Passwords do not match')

    setLoading(true)
    try {
      // Verify current password by re-authenticating
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user!.email, password: form.current
      })
      if (verifyError) throw new Error('Current password is incorrect')

      // Update password directly (Supabase will send confirmation email)
      await changePassword.mutateAsync(form.newPw)
      toast.success('Password updated successfully!')
      setStep('email_sent')
    } catch (err: any) {
      toast.error(err?.message || 'Password change failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-slate-100"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
            <p className="text-xs text-slate-500 mt-0.5">Update your admin password securely</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'email_sent' ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">Password Updated!</h4>
            <p className="text-sm text-slate-500">
              Your password has been changed successfully.
            </p>
            <Button className="mt-5 w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { key: 'current', label: 'Current Password', val: form.current, onChange: (v: string) => setForm({ ...form, current: v }), showKey: 'current' as const },
              { key: 'newPw', label: 'New Password', val: form.newPw, onChange: (v: string) => setForm({ ...form, newPw: v }), showKey: 'new' as const },
              { key: 'confirm', label: 'Confirm New Password', val: form.confirm, onChange: (v: string) => setForm({ ...form, confirm: v }), showKey: 'confirm' as const },
            ].map(f => (
              <div key={f.key} className="relative">
                <Input label={f.label} type={showFields[f.showKey] ? 'text' : 'password'}
                  value={f.val} onChange={e => f.onChange(e.target.value)} />
                <button type="button"
                  onClick={() => setShowFields(p => ({ ...p, [f.showKey]: !p[f.showKey] }))}
                  className="absolute right-3 top-8 text-slate-400">
                  {showFields[f.showKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            ))}

            <p className="text-[11px] text-slate-400">
              • Minimum 8 characters<br />
              • New and confirm password must match
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button onClick={handleSubmit} loading={loading}>
                <Lock className="h-4 w-4" /> Update Password
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Main Authentication Tab ──────────────────────────────────────────────────

export default function AuthenticationTab() {
  const { user, signOut } = useAuthStore()
  const { data: employees = [], isLoading: empLoading } = useEmployees()
  const { data: allSessions = [] } = useEmployeeSessions()
  const updateEmployee = useUpdateEmployee()
  const sendReset = useSendPasswordReset()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [activityEmployee, setActivityEmployee] = useState<any>(null)

  // Compute stats
  const nonAdminEmployees = employees.filter(e => e.role !== 'admin')
  const activeEmployees = nonAdminEmployees.filter(e => e.is_active)
  const onlineIds = new Set(allSessions.filter((s: any) => s.status === 'active').map((s: any) => s.user_id))
  const onlineCount = nonAdminEmployees.filter(e => onlineIds.has(e.id)).length

  const handleDisableToggle = async (emp: any) => {
    const action = emp.is_active ? 'disable' : 'enable'
    if (!confirm(`Are you sure you want to ${action} ${emp.full_name}'s account?`)) return
    try {
      await updateEmployee.mutateAsync({ user_id: emp.id, is_active: !emp.is_active })
      toast.success(`Account ${action}d successfully`)
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} account`)
    }
  }

  const handlePasswordReset = async (emp: any) => {
    if (!confirm(`Send a password reset email to ${emp.email}?`)) return
    try {
      await sendReset.mutateAsync(emp.email)
      toast.success(`Password reset email sent to ${emp.email}`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset email')
    }
  }

  const handleSignOutAll = async () => {
    if (!confirm('This will sign you out from all devices. Continue?')) return
    await signOut()
  }

  return (
    <div className="space-y-6">
      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && <CreateEmployeeModal onClose={() => setShowCreateModal(false)} />}
        {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
        {activityEmployee && <ActivityPanel employee={activityEmployee} onClose={() => setActivityEmployee(null)} />}
      </AnimatePresence>

      {/* ── Admin Security ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" /> Admin Security
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admin Profile */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-blue-600 flex items-center justify-center text-white text-xl font-extrabold shadow-lg">
                  {user?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{user?.full_name || 'Admin User'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-200 mt-1.5">
                    <ShieldCheck className="h-2.5 w-2.5" /> Administrator
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Current Status</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">🟢 Active Session</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>Last Login</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    {user?.last_login ? dayjs(user.last_login).format('DD MMM YYYY, hh:mm A') : 'This session'}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Actions */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Security Actions</p>

              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <KeyRound className="h-5 w-5 text-brand-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-800">Change Password</p>
                  <p className="text-xs text-slate-500 mt-0.5">Update your admin password</p>
                </div>
              </button>

              <button
                onClick={handleSignOutAll}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-red-100 hover:border-red-300 hover:bg-red-50/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <Power className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-800">Logout from All Devices</p>
                  <p className="text-xs text-slate-500 mt-0.5">Terminate all active sessions</p>
                </div>
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Employee Management ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-600" /> Employee Management
            </CardTitle>
            <Button onClick={() => setShowCreateModal(true)} size="sm">
              <UserPlus className="h-4 w-4" /> Create Employee
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total', value: nonAdminEmployees.length, color: 'bg-slate-50 border-slate-200', text: 'text-slate-800' },
              { label: 'Active', value: activeEmployees.length, color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800' },
              { label: 'Online Now', value: onlineCount, color: 'bg-brand-50 border-brand-200', text: 'text-brand-800' },
              { label: 'Offline', value: activeEmployees.length - onlineCount, color: 'bg-slate-50 border-slate-200', text: 'text-slate-600' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-2xl border p-4 text-center', s.color)}>
                <p className={cn('text-2xl font-extrabold', s.text)}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Employee Table */}
          {empLoading ? (
            <div className="text-center py-10 text-slate-400">Loading employees…</div>
          ) : nonAdminEmployees.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">No employees yet</p>
              <p className="text-xs text-slate-400 mt-1">Create your first employee to get started</p>
              <Button size="sm" className="mt-4" onClick={() => setShowCreateModal(true)}>
                <UserPlus className="h-4 w-4" /> Create Employee
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['ID', 'Name', 'Email', 'Role', 'Status', 'Last Login', 'Last Logout', 'Actions'].map(h => (
                      <th key={h} className="pb-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {nonAdminEmployees.map((emp) => {
                    const isOnline = onlineIds.has(emp.id)
                    return (
                      <motion.tr
                        key={emp.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700 font-bold">
                            {emp.employee_id || '—'}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {emp.full_name.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-800 truncate max-w-[120px]">{emp.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-500 text-xs truncate max-w-[160px]">{emp.email}</td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">{emp.role}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-col gap-1">
                            {emp.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
                                <XCircle className="h-3 w-3" /> Disabled
                              </span>
                            )}
                            {emp.is_active && (
                              <StatusBadge status={isOnline ? 'active' : 'offline'} />
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-500">
                          {emp.last_login ? dayjs(emp.last_login).format('DD MMM, hh:mm A') : '—'}
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-500">
                          {emp.last_logout ? dayjs(emp.last_logout).format('DD MMM, hh:mm A') : '—'}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setActivityEmployee(emp)}
                              className="p-1.5 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600 transition-colors"
                              title="View Activity"
                            >
                              <Activity className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handlePasswordReset(emp)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors"
                              title="Send Password Reset"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDisableToggle(emp)}
                              className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                emp.is_active
                                  ? 'hover:bg-red-50 text-slate-500 hover:text-red-600'
                                  : 'hover:bg-emerald-50 text-slate-500 hover:text-emerald-600'
                              )}
                              title={emp.is_active ? 'Disable Account' : 'Enable Account'}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
