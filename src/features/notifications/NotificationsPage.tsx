import { useState } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { motion } from 'framer-motion'
import { Bell, AlertTriangle, Clock, CheckCircle2, DollarSign, Filter } from 'lucide-react'
import { useNotificationsData } from '@/hooks/useDb'
import { Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui'
import { formatDateTime, cn } from '@/utils'
import type { Notification } from '@/types'

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  overdue_emi: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-100' },
  due_today: { icon: <Clock className="h-4 w-4" />, color: 'text-amber-600', bg: 'bg-amber-100' },
  upcoming_emi: { icon: <Bell className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-100' },
  payment_received: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  new_loan: { icon: <DollarSign className="h-4 w-4" />, color: 'text-violet-600', bg: 'bg-violet-100' },
  system: { icon: <Bell className="h-4 w-4" />, color: 'text-slate-600', bg: 'bg-slate-100' },
}

export default function NotificationsPage() {
  const [filter, setFilter] = useLocalStorage<'all' | 'unread'>('notifications_filter', 'all')
  const { data: dbNotifications = [], isLoading } = useNotificationsData()
  const [localReads, setLocalReads] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('read_notifications')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const notifications = dbNotifications.map(n => ({
    ...n,
    is_read: localReads[n.id] ?? n.is_read
  }))

  const filtered = notifications.filter((n) => filter === 'all' || !n.is_read)
  const unread = notifications.filter((n) => !n.is_read).length

  const markAllRead = () => {
    const nextReads: Record<string, boolean> = {}
    dbNotifications.forEach((n) => {
      nextReads[n.id] = true
    })
    setLocalReads(nextReads)
    try {
      localStorage.setItem('read_notifications', JSON.stringify(nextReads))
    } catch (e) {
      console.error(e)
    }
  }

  const markAsRead = (id: string) => {
    const next = { ...localReads, [id]: true }
    setLocalReads(next)
    try {
      localStorage.setItem('read_notifications', JSON.stringify(next))
    } catch (e) {
      console.error(e)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unread} unread notifications</p>
        </div>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCircle2 className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-5 py-1.5 text-sm font-medium rounded-md capitalize transition-all',
              filter === f ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {f} {f === 'unread' && unread > 0 && `(${unread})`}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardBody>
              <div className="flex flex-col items-center py-12 text-slate-400">
                <Bell className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-semibold text-slate-500">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No new notifications</p>
              </div>
            </CardBody>
          </Card>
        ) : (
          filtered.map((notif, idx) => {
            const type = typeConfig[notif.type] ?? typeConfig.system
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer',
                  !notif.is_read ? 'bg-blue-50/60 border-blue-100' : 'bg-white border-slate-100',
                  'hover:shadow-card'
                )}
                onClick={() => markAsRead(notif.id)}
              >
                <div className={cn('p-2 rounded-xl flex-shrink-0', type.bg, type.color)}>
                  {type.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-semibold', !notif.is_read ? 'text-slate-900' : 'text-slate-700')}>
                       {notif.title}
                    </p>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{notif.message}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{formatDateTime(notif.created_at)}</p>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Notification Settings Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {[
              { label: 'EMI Due Today', desc: 'Get notified when EMIs are due today', enabled: true },
              { label: 'Overdue Reminders', desc: 'Alert when EMIs become overdue', enabled: true },
              { label: 'Payment Received', desc: 'Confirmation when payment is collected', enabled: true },
              { label: 'New Loan Alerts', desc: 'Notify when new loans are disbursed', enabled: false },
              { label: 'WhatsApp Notifications', desc: 'Send WhatsApp messages to customers', enabled: false },
              { label: 'SMS Notifications', desc: 'Send SMS reminders to customers', enabled: false },
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{setting.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{setting.desc}</p>
                </div>
                <div
                  className={cn(
                    'relative w-10 h-6 rounded-full transition-colors cursor-pointer',
                    setting.enabled ? 'bg-brand-500' : 'bg-slate-200'
                  )}
                >
                  <div className={cn(
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    setting.enabled ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
