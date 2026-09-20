import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, RefreshCw, AlertTriangle, RotateCcw, X } from 'lucide-react'
import { useCustomerTrash, useRestoreFromTrash, usePermanentlyDeleteFromTrash } from '@/hooks/useDb'
import type { CustomerTrashRecord } from '@/services/customerProfileService'
import { Avatar } from '@/components/ui'
import { formatDate } from '@/utils'
import { toast } from 'sonner'

export default function TrashPage() {
  const { data: trashRecords = [], isLoading } = useCustomerTrash()
  const restore = useRestoreFromTrash()
  const permanentlyDelete = usePermanentlyDeleteFromTrash()

  // Permanent delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleRestore = (record: CustomerTrashRecord) => {
    restore.mutate(record.id, {
      onSuccess: () => {
        toast.success(`"${record.snapshot.name}" has been restored to Customer Profile.`)
      },
      onError: (err: any) => {
        toast.error(err?.message ?? 'Failed to restore customer. Please try again.')
      },
    })
  }

  const handlePermanentDelete = (record: CustomerTrashRecord) => {
    permanentlyDelete.mutate(record.id, {
      onSuccess: () => {
        setConfirmDeleteId(null)
        toast.success(`"${record.snapshot.name}" has been permanently deleted.`)
      },
      onError: (err: any) => {
        toast.error(err?.message ?? 'Failed to permanently delete. Please try again.')
      },
    })
  }

  const confirmingRecord = confirmDeleteId
    ? trashRecords.find((r) => r.id === confirmDeleteId)
    : null

  return (
    <div className="p-6 space-y-6">
      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Trash</h1>
            <p className="text-xs text-slate-500 font-medium">
              {trashRecords.length} deleted record{trashRecords.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Info Banner ─── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs font-bold text-amber-800">
          Records in Trash can be <span className="text-amber-900">restored</span> to Customer Profile or{' '}
          <span className="text-red-700">permanently deleted</span>. Restoring will make them fully active again.
        </p>
      </div>

      {/* ─── Loading ─── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* ─── Empty State ─── */}
      {!isLoading && trashRecords.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Trash2 className="h-7 w-7 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">Trash is empty</p>
          <p className="text-xs text-slate-400 mt-1">Deleted customer records will appear here</p>
        </div>
      )}

      {/* ─── Trash Records Grid ─── */}
      {!isLoading && trashRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trashRecords.map((record) => {
            const snap = record.snapshot
            const isRestoring = restore.isPending && restore.variables === record.id
            const isDeleting = permanentlyDelete.isPending && permanentlyDelete.variables === record.id

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Card header */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-50 bg-slate-50/60">
                  <Avatar name={snap.name} size="sm" className="ring-2 ring-slate-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 truncate">{snap.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono font-bold">{snap.customer_id}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wide">
                    Deleted
                  </span>
                </div>

                {/* Card body */}
                <div className="px-4 py-3 space-y-1.5">
                  {snap.mobile && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Mobile</span>
                      <span className="font-bold text-slate-700">{snap.mobile}</span>
                    </div>
                  )}
                  {snap.branch && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Branch</span>
                      <span className="font-bold text-slate-700">{snap.branch}</span>
                    </div>
                  )}
                  {snap.city && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">City</span>
                      <span className="font-bold text-slate-700">{snap.city}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Deleted At</span>
                    <span className="font-bold text-slate-500">{formatDate(record.deleted_at)}</span>
                  </div>
                  {record.deleted_by && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Deleted By</span>
                      <span className="font-bold text-slate-700">{record.deleted_by}</span>
                    </div>
                  )}
                </div>

                {/* Card footer — actions */}
                <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-50 bg-slate-50/40">
                  <button
                    onClick={() => handleRestore(record)}
                    disabled={isRestoring || isDeleting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isRestoring ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(record.id)}
                    disabled={isRestoring || isDeleting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete Forever
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ─── Permanent Delete Confirmation Modal ─── */}
      {confirmingRecord && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-red-50">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-extrabold text-slate-900">Permanent Delete</h2>
                <p className="text-[11px] text-slate-500 font-medium">This cannot be undone</p>
              </div>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Are you sure you want to <span className="font-bold text-red-600">permanently delete</span> the
                record for <span className="font-bold text-slate-900">"{confirmingRecord.snapshot.name}"</span>?
                This action <span className="font-bold">cannot be reversed</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(confirmingRecord)}
                disabled={permanentlyDelete.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {permanentlyDelete.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Yes, Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
