import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Users, Phone, Mail, TrendingUp, Clock, RefreshCw,
  UserPlus, Search, MessageCircle, IndianRupee,
  ChevronDown, ChevronUp, ArrowUpRight, Briefcase, Star,
  CalendarDays, Inbox, Ban, XCircle, CheckCircle2,
  ChevronRight, Bell, BellRing, CalendarClock, NotebookPen,
  Check, RotateCcw, AlertCircle, Pencil, Sparkles, X
} from 'lucide-react'
import {
  useLeads, useConvertLead, useRejectLead,
  useMarkLeadInterested, useFollowups, useUpsertFollowup, useCompleteReminder
} from '@/hooks/useDb'
import { Card, CardHeader, CardTitle, CardBody, Avatar, Button, Modal, Textarea, PageHeader } from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'
import type { Lead, LeadFollowup } from '@/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { toast } from 'sonner'
dayjs.extend(relativeTime)

// ─── Config ─────────────────────────────────────────────────────────────────

const PRODUCT_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  'Business Loan':  { bg: 'bg-blue-50 border-blue-100',    text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'Personal Loan':  { bg: 'bg-violet-50 border-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  'Gold Loan':      { bg: 'bg-amber-50 border-amber-100',   text: 'text-amber-700',  dot: 'bg-amber-500'  },
  'Home Loan':      { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Vehicle Loan':   { bg: 'bg-orange-50 border-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Education Loan': { bg: 'bg-cyan-50 border-cyan-100',     text: 'text-cyan-700',   dot: 'bg-cyan-500'   },
}
const DEFAULT_CONFIG = { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' }
const getProductConfig = (product: string) => PRODUCT_CONFIG[product] ?? DEFAULT_CONFIG

function StatBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl py-1.5 px-3.5 min-w-[90px]', color)}>
      <span className="text-lg font-bold amount-display leading-tight">{count}</span>
      <span className="text-[10px] font-semibold opacity-80 leading-none mt-0.5">{label}</span>
    </div>
  )
}

// ─── Status Badge Helper ──────────────────────────────────────────────────────

function LeadStatusBadge({ status }: { status?: string }) {
  if (status === 'Converted') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
    </span>
  )
  if (status === 'Rejected') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Rejected
    </span>
  )
  if (status === 'Interested') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Interested
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
    </span>
  )
}

// ─── Follow-up Panel ─────────────────────────────────────────────────────────

function FollowUpPanel({
  lead,
  followup,
  onSave,
  isSaving,
}: {
  lead: Lead
  followup?: LeadFollowup
  onSave: (payload: { lead_id: string; last_conversation_note?: string; next_followup_date?: string; next_followup_time?: string }) => void
  isSaving: boolean
}) {
  const [note, setNote] = useState(followup?.last_conversation_note ?? '')
  const [date, setDate] = useState(followup?.next_followup_date ?? '')
  const [time, setTime] = useState(followup?.next_followup_time ?? '')
  const [expanded, setExpanded] = useState(false)

  // Sync with DB data when it arrives
  useEffect(() => {
    setNote(followup?.last_conversation_note ?? '')
    setDate(followup?.next_followup_date ?? '')
    setTime(followup?.next_followup_time?.slice(0, 5) ?? '')
  }, [followup])

  const hasSchedule = !!(followup?.next_followup_date)
  const isOverdue = hasSchedule && dayjs(`${followup!.next_followup_date}T${followup!.next_followup_time || '00:00'}`).isBefore(dayjs())

  const handleSave = () => {
    onSave({ lead_id: lead.id, last_conversation_note: note, next_followup_date: date || undefined, next_followup_time: time || undefined })
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors group"
      >
        <span className="flex items-center gap-1.5">
          <NotebookPen className="h-3.5 w-3.5" />
          Follow-up Notes
          {hasSchedule && (
            <span className={cn(
              'ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border',
              isOverdue
                ? 'bg-red-50 text-red-600 border-red-100'
                : 'bg-blue-50 text-blue-600 border-blue-100'
            )}>
              {isOverdue ? 'Overdue' : formatDate(followup!.next_followup_date!, 'DD MMM')}
            </span>
          )}
        </span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Last Conversation Note</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="What was discussed with the customer?"
                  rows={3}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 text-slate-700 bg-slate-50/50 placeholder:text-slate-300 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={date}
                    min={dayjs().format('YYYY-MM-DD')}
                    onChange={e => setDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 bg-slate-50/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 bg-slate-50/50 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
              >
                {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save Follow-up
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  followup,
  onApprove,
  onReject,
  onInterested,
  onSaveFollowup,
  isSavingFollowup,
  processingLeadId
}: {
  lead: Lead
  followup?: LeadFollowup
  onApprove: (l: Lead) => void
  onReject: (l: Lead) => void
  onInterested: (l: Lead) => void
  onSaveFollowup: (p: any) => void
  isSavingFollowup: boolean
  processingLeadId: string | null
}) {
  const cfg = getProductConfig(lead.product)
  const ago = dayjs(lead.created_at).fromNow()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all p-5 flex flex-col gap-3 group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={lead.name} size="md" />
          <div>
            <p className="font-bold text-slate-900 text-sm tracking-tight">{lead.name}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {ago}
            </p>
          </div>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5', cfg.bg, cfg.text)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {lead.product}
        </span>
      </div>

      {/* Status badge */}
      <div className="flex justify-between items-center">
        <LeadStatusBadge status={lead.status} />
      </div>

      {/* Contact */}
      <div className="flex flex-col gap-1">
        <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-xs text-slate-700 hover:text-brand-600 transition-colors font-semibold">
          <Phone className="h-3.5 w-3.5 text-slate-400" />
          {lead.phone}
        </a>
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-brand-600 transition-colors truncate">
            <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </a>
        )}
      </div>

      {/* Amount + Message */}
      <div className="flex flex-col gap-1.5">
        {lead.amount && (
          <div className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 amount-display">
            <IndianRupee className="h-3.5 w-3.5" />
            {isNaN(Number(lead.amount)) ? lead.amount : formatCurrency(Number(lead.amount))}
          </div>
        )}
        {lead.message && (
          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 line-clamp-2 border border-slate-100 italic">
            "{lead.message}"
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-auto flex-wrap">
        {lead.status === 'Pending' || lead.status === 'Interested' ? (
          <>
            <a
              href={`tel:${lead.phone}`}
              className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors border border-slate-200/60"
              title="Call Phone"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={`https://wa.me/91${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100"
              title="WhatsApp Chat"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            {lead.status !== 'Interested' && (
              <button
                onClick={() => onInterested(lead)}
                disabled={!!processingLeadId}
                className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors text-xs font-bold border border-blue-100"
              >
                <Sparkles className="h-3.5 w-3.5" /> Interested
              </button>
            )}
            <button
              onClick={() => onReject(lead)}
              disabled={!!processingLeadId}
              className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors text-xs font-bold border border-red-100"
            >
              <Ban className="h-3.5 w-3.5" /> Reject
            </button>
            <button
              onClick={() => onApprove(lead)}
              disabled={!!processingLeadId}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors text-xs font-bold shadow-xs"
            >
              {processingLeadId === lead.id ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              Approval
            </button>
          </>
        ) : lead.status === 'Converted' ? (
          <div className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200/60">
            <CheckCircle2 className="h-4 w-4" /> Approved Borrower Account
          </div>
        ) : (
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-red-700 bg-red-50 rounded-xl border border-red-200/60">
              <XCircle className="h-4 w-4" /> Rejected Application
            </div>
            {lead.rejection_reason && (
              <p className="text-[11px] text-red-500 bg-red-50/40 rounded-xl px-3 py-1.5 border border-red-100 italic line-clamp-2" title={lead.rejection_reason}>
                Reason: "{lead.rejection_reason}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Follow-up Panel */}
      <FollowUpPanel
        lead={lead}
        followup={followup}
        onSave={onSaveFollowup}
        isSaving={isSavingFollowup}
      />
    </motion.div>
  )
}

// ─── Lead Table Row ───────────────────────────────────────────────────────────

function LeadTableRow({
  lead,
  idx,
  followup,
  onApprove,
  onReject,
  onInterested,
  onSaveFollowup,
  isSavingFollowup,
  processingLeadId
}: {
  lead: Lead
  idx: number
  followup?: LeadFollowup
  onApprove: (l: Lead) => void
  onReject: (l: Lead) => void
  onInterested: (l: Lead) => void
  onSaveFollowup: (p: any) => void
  isSavingFollowup: boolean
  processingLeadId: string | null
}) {
  const cfg = getProductConfig(lead.product)
  const [showFollowup, setShowFollowup] = useState(false)

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.02 }}
        className="hover:bg-slate-50/80 transition-colors group"
      >
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Avatar name={lead.name} size="sm" />
            <div>
              <p className="text-xs font-bold text-slate-800 tracking-tight">{lead.name}</p>
              <p className="text-[10px] text-slate-400 font-medium">{dayjs(lead.created_at).fromNow()}</p>
            </div>
          </div>
        </td>
        <td className="px-5 py-3.5">
          <div className="flex flex-col gap-0.5">
            <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-brand-600 transition-colors">
              <Phone className="h-3 w-3 text-slate-400" /> {lead.phone}
            </a>
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-brand-600 transition-colors">
                <Mail className="h-3 w-3" /> {lead.email}
              </a>
            )}
          </div>
        </td>
        <td className="px-5 py-3.5">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border', cfg.bg, cfg.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
            {lead.product}
          </span>
        </td>
        <td className="px-5 py-3.5 text-right">
          <span className="font-bold text-slate-800 text-xs amount-display">
            {lead.amount ? (isNaN(Number(lead.amount)) ? lead.amount : formatCurrency(Number(lead.amount))) : <span className="text-slate-300 font-normal">—</span>}
          </span>
        </td>
        <td className="px-5 py-3.5 max-w-[180px]">
          <p className="text-xs text-slate-500 truncate" title={lead.message ?? undefined}>
            {lead.message || <span className="text-slate-300">—</span>}
          </p>
        </td>
        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400 font-medium">
          {formatDate(lead.created_at, 'DD MMM YYYY')}
        </td>
        <td className="px-5 py-3.5 whitespace-nowrap">
          <LeadStatusBadge status={lead.status} />
        </td>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href={`tel:${lead.phone}`}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
              title="Call Phone"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
            <a
              href={`https://wa.me/91${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              title="WhatsApp Chat"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => setShowFollowup(v => !v)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                followup?.next_followup_date
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              )}
              title="Follow-up Notes"
            >
              <NotebookPen className="h-3.5 w-3.5" />
            </button>
            {(lead.status === 'Pending' || lead.status === 'Interested') && (
              <>
                {lead.status !== 'Interested' && (
                  <button
                    onClick={() => onInterested(lead)}
                    disabled={!!processingLeadId}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                    title="Mark as Interested"
                  >
                    <Sparkles className="h-3 w-3" /> Interested
                  </button>
                )}
                <button
                  onClick={() => onReject(lead)}
                  disabled={!!processingLeadId}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                  title="Reject Application"
                >
                  <Ban className="h-3 w-3" /> Reject
                </button>
                <button
                  onClick={() => onApprove(lead)}
                  disabled={!!processingLeadId}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors disabled:opacity-50"
                  title="Approval"
                >
                  {processingLeadId === lead.id ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserPlus className="h-3 w-3" />
                  )}
                  Approval
                </button>
              </>
            )}
          </div>
        </td>
      </motion.tr>
      {showFollowup && (
        <tr className="bg-slate-50/50 border-b border-slate-100">
          <td colSpan={8} className="px-6 py-4">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <NotebookPen className="h-3 w-3" /> Follow-up Notes — {lead.name}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Last Conversation Note</label>
                  <InlineFollowupEditor lead={lead} followup={followup} onSave={onSaveFollowup} isSaving={isSavingFollowup} />
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Inline Followup Editor (for table row expansion) ────────────────────────

function InlineFollowupEditor({ lead, followup, onSave, isSaving }: {
  lead: Lead
  followup?: LeadFollowup
  onSave: (p: any) => void
  isSaving: boolean
}) {
  const [note, setNote] = useState(followup?.last_conversation_note ?? '')
  const [date, setDate] = useState(followup?.next_followup_date ?? '')
  const [time, setTime] = useState(followup?.next_followup_time?.slice(0, 5) ?? '')

  useEffect(() => {
    setNote(followup?.last_conversation_note ?? '')
    setDate(followup?.next_followup_date ?? '')
    setTime(followup?.next_followup_time?.slice(0, 5) ?? '')
  }, [followup])

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="What was discussed with the customer?"
        rows={2}
        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 text-slate-700 bg-white placeholder:text-slate-300 transition-all"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            min={dayjs().format('YYYY-MM-DD')}
            onChange={e => setDate(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white transition-all"
          />
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white transition-all"
          />
        </div>
        <button
          onClick={() => onSave({ lead_id: lead.id, last_conversation_note: note, next_followup_date: date || undefined, next_followup_time: time || undefined })}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
    </div>
  )
}

// ─── Reminder Dashboard ───────────────────────────────────────────────────────

function ReminderDashboard({
  followups,
  leads,
  onComplete,
  onReschedule,
}: {
  followups: LeadFollowup[]
  leads: Lead[]
  onComplete: (leadId: string) => void
  onReschedule: (followup: LeadFollowup, lead: Lead) => void
}) {
  const now = dayjs()
  const active = followups.filter(f =>
    f.next_followup_date &&
    f.reminder_status !== 'completed'
  )

  if (active.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <BellRing className="h-4 w-4 text-amber-400 flex-shrink-0" />
        <h3 className="text-sm font-bold">Upcoming Follow-up Reminders</h3>
        <span className="ml-auto bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {active.length} active
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {active.map(f => {
          const lead = leads.find(l => l.id === f.lead_id)
          if (!lead) return null
          const schedDt = dayjs(`${f.next_followup_date}T${f.next_followup_time || '00:00'}`)
          const isOverdue = schedDt.isBefore(now)
          const isDueToday = schedDt.isSame(now, 'day')

          return (
            <div
              key={f.id}
              className={cn(
                'flex items-start gap-4 px-5 py-4 transition-colors',
                isOverdue ? 'bg-red-50/40' : isDueToday ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                isOverdue ? 'bg-red-100 text-red-600' : isDueToday ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'
              )}>
                {isOverdue ? <AlertCircle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold text-slate-800">{lead.name}</p>
                  <span className="text-[10px] text-slate-400">·</span>
                  <p className="text-[10px] text-slate-500">{lead.product}</p>
                  {isOverdue ? (
                    <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Overdue</span>
                  ) : isDueToday ? (
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Due Today</span>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {schedDt.format('DD MMM YYYY, hh:mm A')}
                </p>
                {f.last_conversation_note && (
                  <p className="text-[11px] text-slate-400 mt-1 italic line-clamp-1">
                    "{f.last_conversation_note}"
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => lead && onReschedule(f, lead)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  title="Reschedule"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onComplete(f.lead_id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                  title="Mark Complete"
                >
                  <Check className="h-3 w-3" /> Done
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── View/Sort types ──────────────────────────────────────────────────────────
type ViewMode = 'table' | 'grid'
type SortKey = 'created_at' | 'name' | 'amount'

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { data: leads = [], isLoading, isError, error, refetch, isFetching } = useLeads()
  const { data: followups = [] } = useFollowups()
  const convertLead = useConvertLead()
  const rejectLeadMutation = useRejectLead()
  const markInterested = useMarkLeadInterested()
  const upsertFollowup = useUpsertFollowup()
  const completeReminder = useCompleteReminder()

  const [search, setSearch] = useLocalStorage<string>('leads_search', '')
  const [productFilter, setProductFilter] = useLocalStorage<string>('leads_product_filter', 'all')
  const [statusFilter, setStatusFilter] = useLocalStorage<string>('leads_status_filter', 'Pending')
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('leads_view_mode', 'table')
  const [sortKey, setSortKey] = useLocalStorage<SortKey>('leads_sort_key', 'created_at')
  const [sortAsc, setSortAsc] = useLocalStorage<boolean>('leads_sort_asc', false)

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingLead, setRejectingLead] = useState<Lead | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const [rescheduleFollowup, setRescheduleFollowup] = useState<{ followup: LeadFollowup; lead: Lead } | null>(null)

  // ─── Reminder polling ─────────────────────────────────────────────────────
  const firedRemindersRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const check = () => {
      const now = dayjs()
      followups.forEach(f => {
        if (!f.next_followup_date || f.reminder_status === 'completed') return
        const lead = leads.find(l => l.id === f.lead_id)
        if (!lead) return
        const schedDt = dayjs(`${f.next_followup_date}T${f.next_followup_time || '00:00'}`)
        const key = `${f.lead_id}-${f.next_followup_date}-${f.next_followup_time}`
        if (schedDt.isBefore(now) || schedDt.isSame(now, 'minute')) {
          if (!firedRemindersRef.current.has(key)) {
            firedRemindersRef.current.add(key)
            toast(
              <div className="space-y-1">
                <p className="font-bold text-slate-900 flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-amber-500" /> Follow-up Reminder
                </p>
                <p className="text-xs text-slate-700"><strong>{lead.name}</strong> — {lead.product}</p>
                <p className="text-xs text-slate-500">Scheduled: {schedDt.format('DD MMM, hh:mm A')}</p>
                {f.last_conversation_note && (
                  <p className="text-[11px] text-slate-400 italic">"{f.last_conversation_note}"</p>
                )}
              </div>,
              { duration: 10000 }
            )
          }
        }
      })
    }
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [followups, leads])

  // ─── Derived counts ───────────────────────────────────────────────────────
  const products = useMemo(
    () => ['all', ...Array.from(new Set(leads.map(l => l.product)))],
    [leads]
  )

  const totalCount = leads.length
  const pendingCount = leads.filter(l => l.status === 'Pending').length
  const convertedCount = leads.filter(l => l.status === 'Converted').length
  const rejectedCount = leads.filter(l => l.status === 'Rejected').length
  const interestedCount = leads.filter(l => l.status === 'Interested').length

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
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      return sortAsc
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return result
  }, [leads, search, productFilter, statusFilter, sortKey, sortAsc])

  const todayLeads = leads.filter(l => dayjs(l.created_at).isSame(dayjs(), 'day')).length
  const thisWeekLeads = leads.filter(l => dayjs(l.created_at).isSame(dayjs(), 'week')).length

  const processingLeadId =
    (convertLead.isPending && convertLead.variables ? convertLead.variables.id : null) ||
    (rejectLeadMutation.isPending && rejectLeadMutation.variables ? rejectLeadMutation.variables.lead.id : null) ||
    (markInterested.isPending && markInterested.variables ? markInterested.variables.id : null) ||
    null

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleApproveDirect = async (lead: Lead) => {
    try {
      toast.promise(convertLead.mutateAsync(lead), {
        loading: `Converting ${lead.name} to borrower account...`,
        success: `Lead ${lead.name} successfully approved as customer!`,
        error: (err: any) => `Failed to approve: ${err.message || 'Unknown error'}`
      })
    } catch (err) { console.error(err) }
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
    } catch (err) { console.error(err) }
  }

  const handleInterested = async (lead: Lead) => {
    try {
      toast.promise(markInterested.mutateAsync(lead), {
        loading: `Marking ${lead.name} as Interested...`,
        success: `${lead.name} marked as Interested.`,
        error: (err: any) => `Failed: ${err.message || 'Unknown error'}`
      })
    } catch (err) { console.error(err) }
  }

  const handleSaveFollowup = async (payload: any) => {
    try {
      toast.promise(upsertFollowup.mutateAsync(payload), {
        loading: 'Saving follow-up...',
        success: 'Follow-up saved! Reminder is set.',
        error: (err: any) => `Failed to save: ${err.message || 'Unknown error'}`
      })
    } catch (err) { console.error(err) }
  }

  const handleCompleteReminder = async (leadId: string) => {
    try {
      toast.promise(completeReminder.mutateAsync(leadId), {
        loading: 'Marking reminder complete...',
        success: 'Reminder marked as completed.',
        error: (err: any) => `Failed: ${err.message || 'Unknown error'}`
      })
    } catch (err) { console.error(err) }
  }

  const handleReschedule = (followup: LeadFollowup, lead: Lead) => {
    setRescheduleFollowup({ followup, lead })
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
    : <ChevronDown className="h-3 w-3 opacity-30" />

  const getFollowup = (leadId: string) => followups.find(f => f.lead_id === leadId)

  return (
    <div className="p-6 space-y-6">

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-blue-600 py-3.5 px-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Inbox className="h-4.5 w-4.5 opacity-80" />
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Website Borrowing Applications</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">Leads & Inbound Inquiries</h1>
            <p className="text-xs opacity-75 mt-0.5 font-medium">
              Real-time loan applications from website visitors — approve directly to active customers.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <StatBadge count={leads.length}    label="Total Leads" color="bg-white/10 text-white" />
            <StatBadge count={todayLeads}       label="Today"       color="bg-white/10 text-white" />
            <StatBadge count={thisWeekLeads}    label="This Week"   color="bg-white/10 text-white" />
          </div>
        </div>
      </div>

      {/* Reminder Dashboard */}
      <ReminderDashboard
        followups={followups}
        leads={leads}
        onComplete={handleCompleteReminder}
        onReschedule={handleReschedule}
      />

      {/* Status Filter Tabs */}
      <div className="flex gap-2 bg-slate-100 rounded-2xl p-2 w-fit border border-slate-200/60 shadow-xs flex-wrap items-center">
        {[
          { id: 'all',        label: 'All Leads',  count: totalCount,     activeColor: 'bg-white text-slate-900 shadow-sm border border-slate-200/30' },
          { id: 'Pending',    label: 'Pending',    count: pendingCount,   activeColor: 'bg-amber-500 text-white shadow-sm shadow-amber-500/25 border border-amber-600/10' },
          { id: 'Interested', label: 'Interested', count: interestedCount, activeColor: 'bg-blue-600 text-white shadow-sm shadow-blue-600/25 border border-blue-700/10' },
          { id: 'Converted',  label: 'Approved',   count: convertedCount, activeColor: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 border border-emerald-700/10' },
          { id: 'Rejected',   label: 'Rejected',   count: rejectedCount,  activeColor: 'bg-red-500 text-white shadow-sm shadow-red-500/25 border border-red-600/10' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(s.id)}
            className={cn(
              'h-12 px-6 text-[15px] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2',
              statusFilter === s.id ? s.activeColor : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            )}
          >
            {s.label}
            <span className={cn(
              'px-2 py-0.5 rounded-full text-[11px] font-mono font-bold transition-all duration-200',
              statusFilter === s.id ? 'bg-black/10 text-inherit' : 'bg-slate-200 text-slate-600'
            )}>
              {s.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters + Controls Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9.5 w-full"
          />
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap border border-slate-200/50">
          {products.map(p => {
            const cfg = p !== 'all' ? getProductConfig(p) : null
            return (
              <button
                key={p}
                onClick={() => setProductFilter(p)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
                  productFilter === p ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {cfg && <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />}
                {p === 'all' ? 'All Loan Types' : p}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200/50">
            {(['table', 'grid'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all',
                  viewMode === v ? 'bg-white text-brand-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {v === 'table' ? 'Table' : 'Grid'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
          <p className="text-xs font-semibold">Loading applications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Inbox className="h-7 w-7 opacity-40" />
          </div>
          <p className="text-sm font-bold text-slate-800">No applications match filter criteria</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting search filters to see all incoming website leads</p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              followup={getFollowup(lead.id)}
              onApprove={handleApproveDirect}
              onReject={handleRejectClick}
              onInterested={handleInterested}
              onSaveFollowup={handleSaveFollowup}
              isSavingFollowup={upsertFollowup.isPending}
              processingLeadId={processingLeadId}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{statusFilter === 'all' ? 'All' : statusFilter === 'Converted' ? 'Approved' : statusFilter} Applications</CardTitle>
            <span className="text-xs text-slate-400 font-medium">Showing {filtered.length} leads</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="cursor-pointer hover:text-brand-600 select-none" onClick={() => toggleSort('name')}>
                    Applicant <SortIcon k="name" />
                  </th>
                  <th>Contact Details</th>
                  <th>Loan Product</th>
                  <th className="text-right cursor-pointer hover:text-brand-600 select-none" onClick={() => toggleSort('amount')}>
                    Req. Amount <SortIcon k="amount" />
                  </th>
                  <th>Notes</th>
                  <th className="cursor-pointer hover:text-brand-600 select-none" onClick={() => toggleSort('created_at')}>
                    Submitted <SortIcon k="created_at" />
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, idx) => (
                  <LeadTableRow
                    key={lead.id}
                    lead={lead}
                    idx={idx}
                    followup={getFollowup(lead.id)}
                    onApprove={handleApproveDirect}
                    onReject={handleRejectClick}
                    onInterested={handleInterested}
                    onSaveFollowup={handleSaveFollowup}
                    isSavingFollowup={upsertFollowup.isPending}
                    processingLeadId={processingLeadId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={rejectingLead ? `Reject Application — ${rejectingLead.name}` : 'Reject Lead'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>Confirm Rejection</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs font-medium text-slate-600">
            Provide an audit reason for rejecting <strong>{rejectingLead?.name}</strong>'s loan application.
          </p>
          <Textarea
            label="Rejection Audit Reason"
            placeholder="e.g. Credit score threshold not met, incomplete documentation..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Reschedule Modal */}
      {rescheduleFollowup && (
        <Modal
          isOpen={!!rescheduleFollowup}
          onClose={() => setRescheduleFollowup(null)}
          title={`Reschedule Follow-up — ${rescheduleFollowup.lead.name}`}
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setRescheduleFollowup(null)}>Cancel</Button>
            </>
          }
        >
          <InlineFollowupEditor
            lead={rescheduleFollowup.lead}
            followup={rescheduleFollowup.followup}
            onSave={(payload) => {
              handleSaveFollowup(payload)
              setRescheduleFollowup(null)
            }}
            isSaving={upsertFollowup.isPending}
          />
        </Modal>
      )}

    </div>
  )
}
