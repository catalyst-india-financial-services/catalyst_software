import { useState, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Users, Phone, Mail, TrendingUp, Clock, RefreshCw,
  UserPlus, Search, Filter, MessageCircle, IndianRupee,
  ChevronDown, ChevronUp, ArrowUpRight, Briefcase, Star,
  CalendarDays, Inbox, Ban, XCircle, CheckCircle2
} from 'lucide-react'
import { useLeads, useConvertLead, useRejectLead } from '@/hooks/useDb'
import { Card, CardHeader, CardTitle, CardBody, Avatar, Button, Modal, Textarea } from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'
import type { Lead } from '@/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { toast } from 'sonner'
dayjs.extend(relativeTime)

// ─── Config ─────────────────────────────────────────────────────────────────

const PRODUCT_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  'Business Loan':  { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'Personal Loan':  { bg: 'bg-violet-50',  text: 'text-violet-700', dot: 'bg-violet-500' },
  'Gold Loan':      { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500'  },
  'Home Loan':      { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500'},
  'Vehicle Loan':   { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500' },
  'Education Loan': { bg: 'bg-cyan-50',    text: 'text-cyan-700',   dot: 'bg-cyan-500'   },
}
const DEFAULT_CONFIG = { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400' }

const getProductConfig = (product: string) =>
  PRODUCT_CONFIG[product] ?? DEFAULT_CONFIG

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl p-4 min-w-[120px]', color)}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs font-medium mt-0.5 opacity-80">{label}</span>
    </div>
  )
}

function LeadCard({
  lead,
  onConvert,
  onReject,
  processingLeadId
}: {
  lead: Lead
  onConvert: (l: Lead) => void
  onReject: (l: Lead) => void
  processingLeadId: string | null
}) {
  const cfg = getProductConfig(lead.product)
  const ago = dayjs(lead.created_at).fromNow()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3 group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={lead.name} size="md" />
          <div>
            <p className="font-semibold text-slate-900 text-sm">{lead.name}</p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {ago}
            </p>
          </div>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5', cfg.bg, cfg.text)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {lead.product}
        </span>
      </div>

      {/* Contact */}
      <div className="flex flex-col gap-1">
        <a
          href={`tel:${lead.phone}`}
          className="flex items-center gap-2 text-sm text-slate-700 hover:text-brand-600 transition-colors font-medium"
        >
          <Phone className="h-3.5 w-3.5 text-slate-400" />
          {lead.phone}
        </a>
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-brand-600 transition-colors truncate"
          >
            <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </a>
        )}
      </div>

      {/* Amount + Message */}
      <div className="flex flex-col gap-1.5">
        {lead.amount && (
          <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 amount-display">
            <IndianRupee className="h-3.5 w-3.5" />
            {isNaN(Number(lead.amount)) ? lead.amount : formatCurrency(Number(lead.amount))}
          </div>
        )}
        {lead.message && (
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 line-clamp-2">
            "{lead.message}"
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 mt-auto">
        {lead.status === 'Pending' ? (
          <>
            <a
              href={`tel:${lead.phone}`}
              className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-brand-50 hover:text-brand-700 transition-colors border border-slate-100"
              title="Call"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={`https://wa.me/91${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100/50"
              title="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <button
              onClick={() => onReject(lead)}
              disabled={!!processingLeadId}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold border border-red-100/30"
            >
              <Ban className="h-3.5 w-3.5" /> Reject
            </button>
            <button
              onClick={() => onConvert(lead)}
              disabled={!!processingLeadId}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
            >
              {processingLeadId === lead.id ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              Convert
            </button>
          </>
        ) : lead.status === 'Converted' ? (
          <div className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100/50">
            <CheckCircle2 className="h-4 w-4" /> Converted to Customer
          </div>
        ) : (
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-700 bg-red-50 rounded-lg border border-red-100/50">
              <XCircle className="h-4 w-4" /> Rejected Application
            </div>
            {lead.rejection_reason && (
              <p className="text-[11px] text-red-500 bg-red-50/30 rounded-lg px-3 py-1.5 border border-red-100/20 italic line-clamp-2" title={lead.rejection_reason}>
                Reason: "{lead.rejection_reason}"
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function LeadTableRow({
  lead,
  idx,
  onConvert,
  onReject,
  processingLeadId
}: {
  lead: Lead
  idx: number
  onConvert: (l: Lead) => void
  onReject: (l: Lead) => void
  processingLeadId: string | null
}) {
  const cfg = getProductConfig(lead.product)

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.03 }}
      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group animate-none"
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={lead.name} size="sm" />
          <div>
            <p className="text-sm font-semibold text-slate-800">{lead.name}</p>
            <p className="text-[11px] text-slate-400">{dayjs(lead.created_at).fromNow()}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-brand-600 transition-colors">
            <Phone className="h-3 w-3 text-slate-400" /> {lead.phone}
          </a>
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600 transition-colors">
              <Mail className="h-3 w-3" /> {lead.email}
            </a>
          )}
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.bg, cfg.text)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {lead.product}
        </span>
      </td>
      <td className="px-5 py-4 text-right">
        <span className="font-bold text-slate-800 text-sm amount-display">
          {lead.amount ? (isNaN(Number(lead.amount)) ? lead.amount : formatCurrency(Number(lead.amount))) : <span className="text-slate-300 font-normal">—</span>}
        </span>
      </td>
      <td className="px-5 py-4 max-w-[180px]">
        <p className="text-xs text-slate-500 truncate" title={lead.message ?? undefined}>
          {lead.message || <span className="text-slate-300">—</span>}
        </p>
      </td>
      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-400">
        {formatDate(lead.created_at, 'DD MMM YYYY')}<br />
        <span className="text-[10px]">{formatDate(lead.created_at, 'hh:mm A')}</span>
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {lead.status === 'Converted' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Converted
          </span>
        ) : lead.status === 'Rejected' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100/50" title={lead.rejection_reason}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Rejected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        )}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={`tel:${lead.phone}`}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            title="Call"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
          <a
            href={`https://wa.me/91${lead.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
          {lead.status === 'Pending' && (
            <>
              <button
                onClick={() => onReject(lead)}
                disabled={!!processingLeadId}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                title="Reject Lead"
              >
                <Ban className="h-3 w-3" /> Reject
              </button>
              <button
                onClick={() => onConvert(lead)}
                disabled={!!processingLeadId}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
                title="Convert Lead"
              >
                {processingLeadId === lead.id ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <UserPlus className="h-3 w-3" />
                )}
                Convert
              </button>
            </>
          )}
        </div>
      </td>
    </motion.tr>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'grid'
type SortKey = 'created_at' | 'name' | 'amount'

export default function LeadsPage() {
  const { data: leads = [], isLoading, isError, error, refetch, isFetching } = useLeads()
  const convertLead = useConvertLead()
  const rejectLeadMutation = useRejectLead()

  const [search, setSearch] = useLocalStorage<string>('leads_search', '')
  const [productFilter, setProductFilter] = useLocalStorage<string>('leads_product_filter', 'all')
  const [statusFilter, setStatusFilter] = useLocalStorage<string>('leads_status_filter', 'Pending')
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('leads_view_mode', 'table')
  const [sortKey, setSortKey] = useLocalStorage<SortKey>('leads_sort_key', 'created_at')
  const [sortAsc, setSortAsc] = useLocalStorage<boolean>('leads_sort_asc', false)

  // Rejection modal states
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingLead, setRejectingLead] = useState<Lead | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const products = useMemo(
    () => ['all', ...Array.from(new Set(leads.map(l => l.product)))],
    [leads]
  )

  // Counts for tabs
  const totalCount = leads.length
  const pendingCount = leads.filter(l => l.status === 'Pending').length
  const convertedCount = leads.filter(l => l.status === 'Converted').length
  const rejectedCount = leads.filter(l => l.status === 'Rejected').length

  const filtered = useMemo(() => {
    let result = leads.filter(l => {
      const q = search.toLowerCase()
      const matchSearch =
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.email ?? '').toLowerCase().includes(q) ||
        l.product.toLowerCase().includes(q)
      const matchProduct = productFilter === 'all' || l.product === productFilter
      const matchStatus = statusFilter === 'all' || l.status === statusFilter
      return matchSearch && matchProduct && matchStatus
    })
    result = [...result].sort((a, b) => {
      if (sortKey === 'amount') {
        const amtA = isNaN(Number(a.amount)) ? 0 : Number(a.amount || 0)
        const amtB = isNaN(Number(b.amount)) ? 0 : Number(b.amount || 0)
        return sortAsc ? amtA - amtB : amtB - amtA
      }
      if (sortKey === 'name') {
        return sortAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      }
      return sortAsc
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return result
  }, [leads, search, productFilter, statusFilter, sortKey, sortAsc])

  const totalAmount = leads.reduce((s, l) => s + (isNaN(Number(l.amount)) ? 0 : Number(l.amount || 0)), 0)
  const todayLeads = leads.filter(l => dayjs(l.created_at).isSame(dayjs(), 'day')).length
  const thisWeekLeads = leads.filter(l => dayjs(l.created_at).isSame(dayjs(), 'week')).length

  const processingLeadId =
    (convertLead.isPending && convertLead.variables ? convertLead.variables.id : null) ||
    (rejectLeadMutation.isPending && rejectLeadMutation.variables ? rejectLeadMutation.variables.lead.id : null) ||
    null

  const handleConvertDirect = async (lead: Lead) => {
    try {
      toast.promise(convertLead.mutateAsync(lead), {
        loading: `Converting ${lead.name} to customer...`,
        success: `Lead ${lead.name} successfully converted to customer!`,
        error: (err: any) => `Failed to convert: ${err.message || 'Unknown error'}`
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleRejectClick = (lead: Lead) => {
    setRejectingLead(lead)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const handleRejectSubmit = async () => {
    if (!rejectingLead) return
    setShowRejectModal(false)
    try {
      toast.promise(
        rejectLeadMutation.mutateAsync({ lead: rejectingLead, reason: rejectionReason }),
        {
          loading: `Rejecting application for ${rejectingLead.name}...`,
          success: `Lead ${rejectingLead.name} marked as rejected.`,
          error: (err: any) => `Failed to reject: ${err.message || 'Unknown error'}`
        }
      )
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
    : <ChevronDown className="h-3 w-3 opacity-30" />

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500 p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Inbox className="h-5 w-5 opacity-80" />
              <span className="text-sm font-medium opacity-80">Website Applications</span>
            </div>
            <h1 className="text-2xl font-bold">Leads Management</h1>
            <p className="text-sm opacity-70 mt-1">
              Real-time leads from your website — track, engage & convert
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <StatBadge count={leads.length}     label="Total"     color="bg-white/10 text-white" />
              <StatBadge count={todayLeads}        label="Today"     color="bg-white/10 text-white" />
              <StatBadge count={thisWeekLeads}     label="This Week" color="bg-white/10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Total Leads',
            value: leads.length,
            icon: <Users className="h-5 w-5" />,
            color: 'bg-brand-50 text-brand-700',
            iconColor: 'bg-brand-500 text-white',
            sub: `+${todayLeads} today`,
          },
          {
            label: 'Total Requested',
            value: formatCurrency(totalAmount),
            icon: <TrendingUp className="h-5 w-5" />,
            color: 'bg-emerald-50 text-emerald-700',
            iconColor: 'bg-emerald-500 text-white',
            sub: 'Loan amount sought',
          },
          {
            label: 'This Week',
            value: thisWeekLeads,
            icon: <CalendarDays className="h-5 w-5" />,
            color: 'bg-violet-50 text-violet-700',
            iconColor: 'bg-violet-500 text-white',
            sub: 'New applications',
          },
          {
            label: 'Products',
            value: products.length - 1,
            icon: <Briefcase className="h-5 w-5" />,
            color: 'bg-amber-50 text-amber-700',
            iconColor: 'bg-amber-500 text-white',
            sub: 'Loan categories',
          },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 animate-none"
          >
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', s.iconColor)}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={cn('text-xl font-bold amount-display', s.color.split(' ')[1])}>{s.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Error Banner (RLS / Network issue) ── */}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-xl">⚠</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-700 text-sm">Cannot load leads from database</p>
            <p className="text-xs text-red-600 mt-1">
              {(error as any)?.message ?? 'Unknown error'}
            </p>
            <div className="mt-3 p-3 bg-red-100 rounded-xl text-xs text-red-700 font-mono space-y-1">
              <p className="font-semibold">Most likely cause: Supabase RLS is blocking SELECT</p>
              <p>Run this SQL in your Supabase Dashboard → SQL Editor:</p>
              <pre className="mt-2 bg-white/60 rounded-lg p-2 overflow-x-auto text-[11px]">{`CREATE POLICY "Allow anon select on applications"\nON public.applications\nFOR SELECT TO anon\nUSING (true);`}</pre>
              <a
                href="https://supabase.com/dashboard/project/dawnjgihxnffxfvdpald/editor"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-red-800 underline font-semibold"
              >
                Open Supabase SQL Editor ↗
              </a>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Status filter tabs (Permanent Filter section) */}
      <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1.5 w-fit border border-slate-200/50">
        {[
          { id: 'all', label: 'All Leads', count: totalCount, activeColor: 'bg-white text-slate-800 shadow-sm border border-slate-200/20' },
          { id: 'Pending', label: 'Pending', count: pendingCount, activeColor: 'bg-amber-500 text-white shadow-md' },
          { id: 'Converted', label: 'Converted', count: convertedCount, activeColor: 'bg-emerald-600 text-white shadow-md' },
          { id: 'Rejected', label: 'Rejected', count: rejectedCount, activeColor: 'bg-red-500 text-white shadow-md' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(s.id)}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2',
              statusFilter === s.id
                ? s.activeColor
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            )}
          >
            {s.label}
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              statusFilter === s.id
                ? 'bg-black/10 text-inherit'
                : 'bg-slate-200 text-slate-600'
            )}>
              {s.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filters + Controls ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>

        {/* Product filter tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap border border-slate-200/30">
          {products.map(p => {
            const cfg = p !== 'all' ? getProductConfig(p) : null
            return (
              <button
                key={p}
                onClick={() => setProductFilter(p)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5',
                  productFilter === p
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {cfg && <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />}
                {p === 'all' ? 'All Products' : p}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200/30">
            {(['table', 'grid'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all',
                  viewMode === v ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {v === 'table' ? '☰ Table' : '⊞ Grid'}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
          <p className="text-sm">Loading leads from Supabase…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Inbox className="h-8 w-8 opacity-40" />
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {search || productFilter !== 'all' || statusFilter !== 'all' ? 'No leads match your filters' : 'No leads yet'}
          </p>
          <p className="text-xs text-center max-w-xs text-slate-400">
            {search || productFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'When visitors fill the application form on your website, their details will appear here automatically.'}
          </p>
          {(search || productFilter !== 'all' || statusFilter !== 'all') && (
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setProductFilter('all'); setStatusFilter('all') }}>
              Clear filters
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onConvert={handleConvertDirect}
              onReject={handleRejectClick}
              processingLeadId={processingLeadId}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{statusFilter === 'all' ? 'All' : statusFilter} Applications</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {filtered.length} of {leads.length} leads · Sorted by{' '}
                  <span className="font-medium text-slate-600">{sortKey}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                Hover a row to see actions
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-50/50 border-y border-slate-100">
                <tr>
                  <th
                    className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-brand-600 select-none"
                    onClick={() => toggleSort('name')}
                  >
                    <span className="flex items-center gap-1">Applicant <SortIcon k="name" /></span>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th
                    className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-brand-600 select-none"
                    onClick={() => toggleSort('amount')}
                  >
                    <span className="flex items-center justify-end gap-1">Req. Amount <SortIcon k="amount" /></span>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</th>
                  <th
                    className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-brand-600 select-none"
                    onClick={() => toggleSort('created_at')}
                  >
                    <span className="flex items-center gap-1">Submitted <SortIcon k="created_at" /></span>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((lead, idx) => (
                    <LeadTableRow
                      key={lead.id}
                      lead={lead}
                      idx={idx}
                      onConvert={handleConvertDirect}
                      onReject={handleRejectClick}
                      processingLeadId={processingLeadId}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400 rounded-b-2xl">
            <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            <span>Total requested: <strong className="text-slate-600 amount-display">{formatCurrency(filtered.reduce((s, l) => s + (isNaN(Number(l.amount)) ? 0 : Number(l.amount || 0)), 0))}</strong></span>
          </div>
        </Card>
      )}

      {/* Reject Reason Dialog Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={rejectingLead ? `Reject Lead — ${rejectingLead.name}` : 'Reject Lead'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>
              Reject Application
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Please enter a reason for rejecting the loan application of <strong>{rejectingLead?.name}</strong>.
            This reason will be stored permanently alongside the record.
          </p>
          <Textarea
            label="Rejection Reason (Optional)"
            placeholder="e.g. Credit score too low, incomplete application details, etc..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}
