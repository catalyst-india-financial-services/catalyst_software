import { useState } from 'react'
import {
  Building2,
  Clock,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  Sparkles,
  ArrowRight,
  GitPullRequest,
  ExternalLink,
  RefreshCw,
  Plus
} from 'lucide-react'
import type { CustomerBranchAccess } from '@/types'
import { Modal, Button, Badge } from '@/components/ui'
import { formatDate, formatCurrency, cn } from '@/utils'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useApproveBranchAccess, useRejectBranchAccess } from '@/hooks/useDb'
import { toast } from 'sonner'

interface CrossBranchRequestDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  request: CustomerBranchAccess | null
  onCompleteSetup?: (customerId: string) => void
}

export function CrossBranchRequestDetailsModal({
  isOpen,
  onClose,
  request,
  onCompleteSetup
}: CrossBranchRequestDetailsModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { user, isBranchUser, userBranch, selectedBranch } = useAuthStore()
  const activeBranch = isBranchUser ? userBranch : selectedBranch
  const approveReq = useApproveBranchAccess()
  const rejectReq = useRejectBranchAccess()

  if (!request) return null

  const isPending = request.access_status === 'PENDING'
  const isApproved = request.access_status === 'APPROVED'
  const isRejected = request.access_status === 'REJECTED'

  const normalize = (s?: string | null) => (s || '').toLowerCase().replace(/\s+branch$/i, '').trim()
  const isBaseBranchUser = activeBranch && normalize(activeBranch) === normalize(request.base_branch)
  const isRequestingBranch = activeBranch && normalize(activeBranch) === normalize(request.branch_id)
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || !isBranchUser
  const isAuthorizedViewer = isBaseBranchUser || isRequestingBranch || isAdmin || !activeBranch
  // Strictly: ONLY the Base / Home Branch can approve (never the request sending branch)
  const canApprove = isBaseBranchUser && !isRequestingBranch

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await approveReq.mutateAsync({
        accessId: request.id,
        customerId: request.customer_id,
        branchId: request.branch_id,
        approvedBy: user?.full_name || (isAdmin ? 'System Administrator' : `${request.base_branch} Branch Manager`),
        approvedByUserId: user?.id,
        userBranch: activeBranch,
        userRole: user?.role,
      })
      toast.success(`Access Approved! Customer profile shared with ${request.branch_id} Branch.`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve request')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await rejectReq.mutateAsync({
        accessId: request.id,
        customerId: request.customer_id,
        branchId: request.branch_id,
        rejectedBy: user?.full_name || (isAdmin ? 'System Administrator' : `${request.base_branch} Branch Manager`),
        rejectedByUserId: user?.id,
        rejectionReason: rejectReason || 'Declined by base branch authority',
        userBranch: activeBranch,
        userRole: user?.role,
      })
      toast.success('Cross-branch access request declined.')
      setShowRejectInput(false)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decline request')
    } finally {
      setIsRejecting(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ['customerBranchAccess'] })
      await queryClient.invalidateQueries({ queryKey: ['loans'] })
      toast.success('Refreshed request status!')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleProceedToCreate = () => {
    onClose()
    if (onCompleteSetup) {
      onCompleteSetup(request.customer_id)
    }
  }

  const handleViewCustomerProfile = () => {
    onClose()
    navigate(`/customers/${request.customer_id}`)
  }

  if (!isAuthorizedViewer) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Access Restricted" size="md">
        <div className="p-6 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">Branch Access Restricted</h4>
          <p className="text-xs text-slate-500">
            This cross-branch request was created between <strong>{request.branch_id} Branch</strong> and <strong>{request.base_branch} Branch</strong>. It is not accessible from <strong>{activeBranch} Branch</strong>.
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="mt-2">
            Close
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cross-Branch Account Request Details"
      size="lg"
    >
      <div className="space-y-5">
        {/* Status Highlight Banner */}
        {isPending && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-300/80 p-4.5 text-amber-900 flex items-start gap-3.5 shadow-2xs">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 flex-shrink-0 mt-0.5">
              <Clock className="h-5 w-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-amber-950">
                  Waiting for Permission from {request.base_branch || 'Base'} Branch
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed">
                This account request was dispatched to <strong className="font-bold text-amber-950">{request.base_branch || 'Base'} Branch</strong>. Only the base branch manager or an All-Branch Administrator can authorize profile sharing. All account parameters remain locked until approval is granted.
              </p>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-300/80 p-4.5 text-emerald-900 flex items-start gap-3.5 shadow-2xs">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-700 flex-shrink-0 mt-0.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="font-extrabold text-sm text-emerald-950 block">
                Permission Approved by {request.base_branch || 'Base'} Branch
              </span>
              <p className="text-xs text-emerald-800/90 leading-relaxed">
                Authorized by <strong className="font-bold text-emerald-950">{request.approved_by || 'Base Branch Manager'}</strong> on {formatDate(request.approved_at || request.updated_at || '')}. The customer profile is now shared with <strong className="font-bold text-emerald-950">{request.branch_id} Branch</strong>. You may proceed to finalize the loan parameters and create the account.
              </p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-300/80 p-4.5 text-rose-900 flex items-start gap-3.5 shadow-2xs">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-700 flex-shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="font-extrabold text-sm text-rose-950 block">
                Request Declined by {request.base_branch || 'Base'} Branch
              </span>
              <p className="text-xs text-rose-800/90 leading-relaxed">
                Declined by <strong className="font-bold text-rose-950">{request.rejected_by || 'Base Branch Manager'}</strong> on {formatDate(request.rejected_at || request.updated_at || '')}.
              </p>
              {request.rejection_reason && (
                <div className="mt-2 p-2.5 rounded-xl bg-rose-100/80 text-rose-950 text-xs border border-rose-200">
                  <span className="font-bold">Reason: </span>
                  {request.rejection_reason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Profile Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Customer Identity & Home Branch
            </span>
            <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">
              {request.customer_custom_id || 'ID Pending'}
            </span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-base">
                {request.customer_name?.charAt(0) || 'C'}
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">{request.customer_name || 'Customer'}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  {request.customer_mobile && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {request.customer_mobile}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Base / Home Branch</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Building2 className="h-3.5 w-3.5 text-amber-600" />
                {request.base_branch || 'Base'} Branch
              </span>
            </div>
          </div>
        </div>

        {/* Request Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Requested Operating Branch
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Building2 className="h-4 w-4 text-violet-600" />
              <span>{request.branch_id} Branch</span>
            </div>
            <p className="text-[11px] text-slate-500">Branch where loan account will be opened</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Requested Date & Time
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>{dayjs(request.requested_at || request.created_at).format('DD MMM YYYY, hh:mm A')}</span>
            </div>
            <p className="text-[11px] text-slate-500">Sent by: {request.requested_by || 'Loan Officer'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Requested Loan Product
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <FileText className="h-4 w-4 text-brand-600" />
              <span>{request.loan_product || 'Personal Loan'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Requested Sanction Amount
            </span>
            <div className="text-xs font-extrabold text-emerald-700 font-mono">
              {request.sanctioned_amount ? formatCurrency(request.sanctioned_amount) : 'Not specified'}
            </div>
          </div>
        </div>

        {/* Loan Purpose & Remarks */}
        {(request.loan_purpose || request.notes) && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
            {request.loan_purpose && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Loan Purpose:</span>
                <p className="text-xs text-slate-700 mt-0.5">{request.loan_purpose}</p>
              </div>
            )}
            {request.notes && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Officer Notes:</span>
                <p className="text-xs text-slate-600 mt-0.5">{request.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Workflow Stepper */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Authorization & Lifecycle Stepper
          </span>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                ✓
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-800">Step 1: Request Dispatched from {request.branch_id} Branch</p>
                <p className="text-[11px] text-slate-500">Initiated on {formatDate(request.requested_at || request.created_at || '')} by {request.requested_by || 'Officer'}.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5',
                isApproved ? 'bg-emerald-100 text-emerald-700' : isRejected ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
              )}>
                {isApproved ? '✓' : isRejected ? '✗' : '2'}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-800">
                  Step 2: Authorization by {request.base_branch || 'Base'} Branch Authority
                </p>
                <p className="text-[11px] text-slate-500">
                  {isApproved
                    ? `Approved by ${request.approved_by || 'Manager'} on ${formatDate(request.approved_at || request.updated_at || '')}.`
                    : isRejected
                    ? `Declined by ${request.rejected_by || 'Manager'} on ${formatDate(request.rejected_at || request.updated_at || '')}.`
                    : `Currently in review at ${request.base_branch || 'Base'} Branch. Requesting branch staff cannot self-approve.`}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5',
                isApproved ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'
              )}>
                3
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-800">
                  Step 3: Account Creation & Profile Sharing in {request.branch_id} Branch
                </p>
                <p className="text-[11px] text-slate-500">
                  {isApproved
                    ? 'Ready! You can now complete the account setup with zero duplicate customer profiles.'
                    : 'Locked until Step 2 is approved.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-xs text-slate-600"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isRefreshing && 'animate-spin')} />
              Refresh Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewCustomerProfile}
              className="text-xs text-slate-600"
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Customer Profile
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isPending && canApprove && (
              showRejectInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Decline reason..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="text-xs border border-rose-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-400 w-48"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    loading={isRejecting}
                    onClick={handleReject}
                    className="text-xs px-2.5 font-bold"
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowRejectInput(false); setRejectReason('') }}
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
                    onClick={() => setShowRejectInput(true)}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    loading={isApproving}
                    onClick={handleApprove}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Accept &amp; Authorize
                  </Button>
                </div>
              )
            )}

            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            {isApproved && (
              <Button
                size="sm"
                onClick={handleProceedToCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Plus className="h-4 w-4 mr-1" />
                Complete Account Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
