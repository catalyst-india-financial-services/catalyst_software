import { useState, useMemo } from 'react'
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  User,
  Phone,
  Calendar,
  AlertCircle,
  FileText,
  ShieldCheck,
  Ban,
  ArrowRight,
  Sparkles,
  Search,
  Filter
} from 'lucide-react'
import {
  useCustomerBranchAccess,
  useApproveBranchAccess,
  useRejectBranchAccess,
  useRevokeBranchAccess,
} from '@/hooks/useDb'
import { useAuthStore } from '@/store/authStore'
import type { CustomerBranchAccess } from '@/types'
import { Modal, Button, StatusBadge } from '@/components/ui'
import { formatDate, formatCurrency, cn } from '@/utils'
import { toast } from 'sonner'

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: allRequests = [], isLoading } = useCustomerBranchAccess()
  const approveReq = useApproveBranchAccess()
  const rejectReq = useRejectBranchAccess()
  const revokeReq = useRevokeBranchAccess()

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const normalize = (s?: string | null) => (s || '').toLowerCase().replace(/\s+branch$/i, '').trim()
  const currentBranchNorm = normalize(activeBranch)
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || !isBranchUser

  // Incoming: where this branch is the base_branch (needs to grant permission to other branches)
  const incomingRequests = useMemo(() => {
    if (!currentBranchNorm) return allRequests
    return allRequests.filter(r => normalize(r.base_branch) === currentBranchNorm)
  }, [allRequests, currentBranchNorm])

  // Outgoing: where this branch is the requesting branch (sent to other branches)
  const outgoingRequests = useMemo(() => {
    if (!currentBranchNorm) return allRequests
    return allRequests.filter(r => normalize(r.branch_id) === currentBranchNorm)
  }, [allRequests, currentBranchNorm])

  const currentList = activeTab === 'incoming' ? incomingRequests : outgoingRequests

  const filteredList = useMemo(() => {
    return currentList.filter(req => {
      // Status filter
      if (statusFilter !== 'ALL' && req.access_status !== statusFilter) {
        return false
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = req.customer_name?.toLowerCase().includes(q)
        const matchId = req.customer_custom_id?.toLowerCase().includes(q)
        const matchMobile = req.customer_mobile?.includes(q)
        const matchReqBranch = req.branch_id?.toLowerCase().includes(q)
        const matchBaseBranch = req.base_branch?.toLowerCase().includes(q)
        return !!(matchName || matchId || matchMobile || matchReqBranch || matchBaseBranch)
      }
      return true
    })
  }, [currentList, statusFilter, searchQuery])

  const pendingIncomingCount = incomingRequests.filter(r => r.access_status === 'PENDING').length
  const pendingOutgoingCount = outgoingRequests.filter(r => r.access_status === 'PENDING').length

  const handleApprove = async (req: CustomerBranchAccess) => {
    setActionLoadingId(req.id)
    try {
      await approveReq.mutateAsync({
        accessId: req.id,
        customerId: req.customer_id,
        branchId: req.branch_id,
        approvedBy: user?.full_name || 'Branch Manager',
        approvedByUserId: user?.id,
        userBranch: activeBranch,
        userRole: user?.role,
      })
      toast.success(`Access Approved! Customer profile shared with ${req.branch_id} Branch.`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve request')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (req: CustomerBranchAccess) => {
    setActionLoadingId(req.id)
    try {
      await rejectReq.mutateAsync({
        accessId: req.id,
        customerId: req.customer_id,
        branchId: req.branch_id,
        rejectedBy: user?.full_name || 'Branch Manager',
        rejectedByUserId: user?.id,
        rejectionReason: rejectReason || 'Declined by base branch',
        userBranch: activeBranch,
        userRole: user?.role,
      })
      toast.success('Cross-branch access request declined.')
      setRejectingId(null)
      setRejectReason('')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decline request')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRevoke = async (req: CustomerBranchAccess) => {
    setActionLoadingId(req.id)
    try {
      await revokeReq.mutateAsync({
        accessId: req.id,
        customerId: req.customer_id,
        branchId: req.branch_id,
      })
      toast.success(`Cross-branch access for ${req.branch_id} Branch revoked.`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke access')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cross-Branch Customer Account & Profile Access Requests"
      size="xl"
    >
      <div className="space-y-4">
        {/* Branch Context Info Header */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Operating Branch: <span className="text-violet-700">{activeBranch || 'All Branches (Admin)'}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Manage cross-branch permissions for sharing customer profiles without duplicating records.
              </p>
            </div>
          </div>
          {isAdmin && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Admin Access: All Branches
            </span>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('incoming'); setStatusFilter('ALL') }}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                activeTab === 'incoming'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <GitPullRequest className="h-4 w-4" />
              Incoming Requests (For Your Approval)
              {pendingIncomingCount > 0 && (
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  activeTab === 'incoming' ? 'bg-white text-violet-700' : 'bg-amber-500 text-white animate-pulse'
                )}>
                  {pendingIncomingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('outgoing'); setStatusFilter('ALL') }}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                activeTab === 'outgoing'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Building2 className="h-4 w-4" />
              Outgoing Requests (Sent by You)
              {pendingOutgoingCount > 0 && (
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  activeTab === 'outgoing' ? 'bg-white text-violet-700' : 'bg-blue-500 text-white'
                )}>
                  {pendingOutgoingCount}
                </span>
              )}
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors',
                  statusFilter === s
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                )}
              >
                {s === 'ALL' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by customer name, ID, phone, or branch..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Requests List */}
        <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
              Loading requests...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
              <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} requests found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeTab === 'incoming'
                  ? 'No pending access requests waiting for approval from other branches.'
                  : 'No outgoing access requests submitted to other branches.'}
              </p>
            </div>
          ) : (
            filteredList.map(req => {
              const isPending = req.access_status === 'PENDING'
              const isApproved = req.access_status === 'APPROVED'
              const isRejected = req.access_status === 'REJECTED'
              const isBaseBranchUser = activeBranch && normalize(activeBranch) === normalize(req.base_branch)
              const isRequestingBranch = activeBranch && normalize(activeBranch) === normalize(req.branch_id)
              const canApprove = isBaseBranchUser || (isAdmin && !isRequestingBranch)

              return (
                <div
                  key={req.id}
                  className={cn(
                    'p-4 rounded-2xl border transition-all space-y-3',
                    isPending && 'bg-amber-50/40 border-amber-200 hover:border-amber-300',
                    isApproved && 'bg-emerald-50/30 border-emerald-200',
                    isRejected && 'bg-red-50/30 border-red-200'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Top Header info */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                          {req.customer_custom_id || req.customer_id?.slice(0, 8)}
                        </span>
                        <span className="font-bold text-sm text-slate-900">
                          {req.customer_name || 'Customer'}
                        </span>
                        {req.customer_mobile && (
                          <span className="text-xs text-slate-500 font-medium">
                            📱 {req.customer_mobile}
                          </span>
                        )}
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                          isPending && 'bg-amber-100 text-amber-800 border-amber-300',
                          isApproved && 'bg-emerald-100 text-emerald-800 border-emerald-300',
                          isRejected && 'bg-red-100 text-red-800 border-red-300'
                        )}>
                          {req.access_status}
                        </span>
                      </div>

                      {/* Branch Route Summary */}
                      <div className="flex items-center gap-2 text-xs pt-1 flex-wrap">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          Base Branch: <strong className="text-slate-900">{req.base_branch || 'Head Office'}</strong>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          Requesting Branch: <strong className="text-violet-700">{req.branch_id} Branch</strong>
                        </span>
                      </div>

                      {/* Loan Product & Purpose details */}
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
                        <span>• Requested by: <strong className="text-slate-700">{req.requested_by || 'Staff'}</strong> on {formatDate(req.requested_at || req.created_at || new Date().toISOString())}</span>
                      </div>

                      {/* Rejection / Approval info */}
                      {isApproved && req.approved_by && (
                        <p className="text-[11px] text-emerald-700 font-medium">
                          ✅ Approved by {req.approved_by} on {formatDate(req.approved_at || new Date().toISOString())}. Profile is shared with {req.branch_id}.
                        </p>
                      )}
                      {isRejected && req.rejection_reason && (
                        <p className="text-[11px] text-red-600 font-medium">
                          ❌ Declined by {req.rejected_by || 'Base Branch'}: {req.rejection_reason}
                        </p>
                      )}
                    </div>

                    {/* Action buttons for pending incoming */}
                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0">
                        {canApprove ? (
                          rejectingId === req.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Rejection reason..."
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                className="text-xs border border-red-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400 w-44"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                loading={actionLoadingId === req.id}
                                onClick={() => handleReject(req)}
                                className="text-xs px-2.5"
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setRejectingId(null); setRejectReason('') }}
                                className="text-xs px-2"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectingId(req.id)}
                                className="border-red-200 text-red-700 hover:bg-red-50 text-xs"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Decline
                              </Button>
                              <Button
                                size="sm"
                                loading={actionLoadingId === req.id}
                                onClick={() => handleApprove(req)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Accept &amp; Share Profile
                              </Button>
                            </div>
                          )
                        ) : (
                          <div className="p-2 bg-slate-100 rounded-xl text-[10px] text-slate-500 font-medium text-right max-w-[180px]">
                            Waiting for approval by <strong>{req.base_branch} Branch</strong>.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action button for approved items: Revoke */}
                    {isApproved && (isBaseBranchUser || (isAdmin && !isRequestingBranch)) && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={actionLoadingId === req.id}
                          onClick={() => handleRevoke(req)}
                          className="border-slate-200 text-slate-600 hover:text-red-700 hover:bg-red-50 text-[11px] font-bold shrink-0"
                        >
                          <Ban className="h-3.5 w-3.5" /> Revoke Access
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Showing {filteredList.length} of {currentList.length} total request records
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
