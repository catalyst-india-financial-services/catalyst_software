import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, ArrowLeftRight, CheckCircle2, XCircle, Clock,
  ShieldCheck, AlertTriangle, UserCheck, Send, Check, X,
  FileText, IndianRupee, Phone, Calendar
} from 'lucide-react'
import {
  useInterBranchRequests,
  useApproveInterBranchRequest,
  useRejectInterBranchRequest
} from '@/hooks/useDb'
import { useAuthStore } from '@/store/authStore'
import { Modal, Button, Badge, Card, EmptyState, Input } from '@/components/ui'
import { formatCurrency, formatDate, cn } from '@/utils'
import { toast } from 'sonner'
import type { InterBranchRequest } from '@/types'

interface InterBranchRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'incoming' | 'outgoing'
}

export function InterBranchRequestsModal({
  isOpen,
  onClose,
  initialTab = 'incoming'
}: InterBranchRequestsModalProps) {
  const { user, isBranchUser, userBranch, selectedBranch } = useAuthStore()
  const activeBranch = isBranchUser ? userBranch : selectedBranch
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>(initialTab)

  const { data: allRequests = [], isLoading } = useInterBranchRequests()
  const approveReq = useApproveInterBranchRequest()
  const rejectReq = useRejectInterBranchRequest()

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const normalize = (s?: string | null) => (s || '').toLowerCase().replace(/\s+branch$/i, '').trim()
  const currentBranchNorm = normalize(activeBranch)

  // Incoming: where this branch is the base_branch (needs to grant permission)
  const incomingRequests = useMemo(() => {
    if (!currentBranchNorm) return allRequests
    return allRequests.filter(r => normalize(r.base_branch) === currentBranchNorm)
  }, [allRequests, currentBranchNorm])

  // Outgoing: where this branch is the requesting_branch (sent to other branches)
  const outgoingRequests = useMemo(() => {
    if (!currentBranchNorm) return allRequests
    return allRequests.filter(r => normalize(r.requesting_branch) === currentBranchNorm)
  }, [allRequests, currentBranchNorm])

  const pendingIncomingCount = incomingRequests.filter(r => r.status === 'pending').length
  const pendingOutgoingCount = outgoingRequests.filter(r => r.status === 'pending').length

  const handleApprove = async (req: InterBranchRequest) => {
    setActionLoadingId(req.id)
    try {
      await approveReq.mutateAsync({
        requestId: req.id,
        reviewedBy: user?.full_name || 'Branch Manager',
      })
      toast.success(`Access granted! Customer profile shared with ${req.requesting_branch} Branch.`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve request')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (req: InterBranchRequest) => {
    setActionLoadingId(req.id)
    try {
      await rejectReq.mutateAsync({
        requestId: req.id,
        reviewedBy: user?.full_name || 'Branch Manager',
        rejectionReason: rejectReason || 'Declined by base branch',
      })
      toast.success('Cross-branch request declined.')
      setRejectingId(null)
      setRejectReason('')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decline request')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Inter-Branch Account & Profile Access Requests"
      size="xl"
    >
      <div className="space-y-4">
        {/* Info Header */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-violet-950 uppercase tracking-wider">
              Cross-Branch Customer Authorization Policy
            </h4>
            <p className="text-xs text-violet-800/90 mt-1 leading-relaxed">
              When a customer existing in one branch applies for an account in another branch, the base branch must approve and authorize sharing the profile data before the new account is opened.
            </p>
            {activeBranch && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-violet-100/80 text-violet-800 border border-violet-200">
                <Building2 className="h-3 w-3" />
                Active Branch: {activeBranch} Branch
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={cn(
              'pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer',
              activeTab === 'incoming'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <span>📥 Incoming Requests (For Your Approval)</span>
            {pendingIncomingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                {pendingIncomingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            className={cn(
              'pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer',
              activeTab === 'outgoing'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <span>📤 Outgoing Requests (Sent to Other Branches)</span>
            {pendingOutgoingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                {pendingOutgoingCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Incoming Requests */}
        {activeTab === 'incoming' && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {incomingRequests.length === 0 ? (
              <EmptyState
                title="No Incoming Requests"
                description={
                  activeBranch
                    ? `No other branch has currently requested permission for ${activeBranch} Branch's customers.`
                    : 'No cross-branch account creation requests pending.'
                }
              />
            ) : (
              incomingRequests.map((req) => {
                const isPending = req.status === 'pending'
                const isApproved = req.status === 'approved'
                const isRejected = req.status === 'rejected'
                const isActioning = actionLoadingId === req.id

                return (
                  <Card
                    key={req.id}
                    className={cn(
                      'p-4 border transition-all',
                      isPending
                        ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                        : isApproved
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200 bg-slate-50/40 opacity-80'
                    )}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">
                            {req.customer_name}
                          </span>
                          {req.customer_custom_id && (
                            <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200/60">
                              {req.customer_custom_id}
                            </span>
                          )}
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {req.customer_mobile || 'No Mobile'}
                          </span>
                        </div>

                        {/* Route / Branch Transfer Info */}
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            Base: <strong>{req.base_branch} Branch</strong>
                          </span>
                          <span className="text-brand-600 font-bold">➔</span>
                          <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 border border-violet-200 font-bold">
                            Requesting Branch: <strong>{req.requesting_branch} Branch</strong>
                          </span>
                        </div>

                        {/* Loan details */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap pt-0.5">
                          {req.loan_product && (
                            <span>Product: <strong className="text-slate-800 capitalize">{req.loan_product}</strong></span>
                          )}
                          {req.sanctioned_amount && (
                            <span>• Amount: <strong className="text-emerald-700">{formatCurrency(req.sanctioned_amount)}</strong></span>
                          )}
                          {req.loan_purpose && (
                            <span>• Purpose: <strong className="text-slate-800">{req.loan_purpose}</strong></span>
                          )}
                          <span>• Requested by: <strong className="text-slate-700">{req.requested_by}</strong> on {formatDate(req.requested_at || req.created_at || new Date().toISOString())}</span>
                        </div>

                        {req.rejection_reason && isRejected && (
                          <p className="text-[11px] text-red-600 font-medium">
                            Reason for rejection: {req.rejection_reason}
                          </p>
                        )}
                      </div>

                      {/* Action status & buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          rejectingId === req.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Rejection reason..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="text-xs py-1 h-8 w-40"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(req)}
                                loading={isActioning}
                                className="border-red-300 text-red-600 hover:bg-red-50 text-xs px-2.5 h-8"
                              >
                                Confirm
                              </Button>
                              <button
                                type="button"
                                onClick={() => { setRejectingId(null); setRejectReason('') }}
                                className="text-slate-400 hover:text-slate-600 p-1 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectingId(req.id)}
                                disabled={isActioning}
                                className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
                              >
                                <X className="h-3.5 w-3.5" /> Decline
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(req)}
                                loading={isActioning}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                              >
                                <Check className="h-3.5 w-3.5" /> Accept & Share Profile
                              </Button>
                            </>
                          )
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Approved by {req.reviewed_by || 'Manager'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                            Declined
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        )}

        {/* Tab 2: Outgoing Requests */}
        {activeTab === 'outgoing' && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {outgoingRequests.length === 0 ? (
              <EmptyState
                title="No Outgoing Requests"
                description={
                  activeBranch
                    ? `${activeBranch} Branch has not sent any cross-branch account requests.`
                    : 'No outgoing inter-branch requests recorded.'
                }
              />
            ) : (
              outgoingRequests.map((req) => {
                const isPending = req.status === 'pending'
                const isApproved = req.status === 'approved'
                const isRejected = req.status === 'rejected'

                return (
                  <Card
                    key={req.id}
                    className={cn(
                      'p-4 border transition-all',
                      isApproved
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isPending
                        ? 'border-blue-200 bg-blue-50/20'
                        : 'border-red-200 bg-red-50/20'
                    )}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">
                            {req.customer_name}
                          </span>
                          {req.customer_custom_id && (
                            <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200/60">
                              {req.customer_custom_id}
                            </span>
                          )}
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 font-medium">
                            Target Branch: <strong>{req.requesting_branch} Branch</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                          <span>Base Branch: <strong>{req.base_branch} Branch</strong></span>
                          <span>• Sent on: {formatDate(req.requested_at || req.created_at || new Date().toISOString())}</span>
                          {req.sanctioned_amount && (
                            <span>• Amount: <strong className="text-emerald-700">{formatCurrency(req.sanctioned_amount)}</strong></span>
                          )}
                        </div>

                        {isApproved && (
                          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Customer profile shared! You can now create the account in {req.requesting_branch} Branch.
                          </p>
                        )}
                        {isRejected && (
                          <p className="text-[11px] text-red-600 font-medium">
                            Declined by {req.base_branch} Branch: {req.rejection_reason || 'No reason specified'}
                          </p>
                        )}
                      </div>

                      <div>
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            Awaiting {req.base_branch} Approval
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Approved & Profile Shared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                            Declined
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
