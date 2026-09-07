import dayjs from 'dayjs'
import { supabase } from './supabase'
import type { Loan, EMISchedule } from '../types/loan'
import { generateEMISchedule } from '../utils'

export interface ScheduleRevisionItem {
  id?: string
  emi_number: number
  due_date: string
  principal: number
  interest: number
  emi_amount: number
  outstanding_balance: number
  status: 'pending' | 'paid' | 'overdue' | 'partial'
  paid_amount?: number
  paid_date?: string | null
  penalty?: number
}

export interface ScheduleRevision {
  recordNumber: number
  title: string
  effectiveDate: string
  previousDate?: string
  createdAt: string
  createdBy: string
  reason?: string
  isCurrent: boolean
  totalEmis: number
  schedule: ScheduleRevisionItem[]
}

const STORAGE_PREFIX = 'catalyst_schedule_revisions_'

/**
 * Load schedule revisions from loan metadata or localStorage,
 * falling back to generating Record 1 from initial loan parameters.
 */
export function loadScheduleRevisions(loan: Loan, emiSchedule: EMISchedule[]): ScheduleRevision[] {
  if (!loan) return []

  // 1. Check if database stored revisions in security_insurance_details
  if (loan.security_insurance_details) {
    try {
      const parsed = JSON.parse(loan.security_insurance_details)
      if (Array.isArray(parsed?.schedule_revisions) && parsed.schedule_revisions.length > 0) {
        return parsed.schedule_revisions
      }
    } catch {
      // Ignore JSON parse errors for non-JSON content
    }
  }

  // 2. Check localStorage
  try {
    const cached = localStorage.getItem(STORAGE_PREFIX + loan.id)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('[scheduleRevisionService] Error reading from localStorage', err)
  }

  // 3. Fallback: Synthesize Record 1 (Original Created Date Schedule)
  const effectiveDate = loan.loan_date || loan.account_opening_date || loan.repayment_start_date || '2026-02-01'

  let scheduleItems: ScheduleRevisionItem[] = []

  if (emiSchedule && emiSchedule.length > 0) {
    scheduleItems = emiSchedule.map((s) => ({
      id: s.id,
      emi_number: s.emi_number,
      due_date: s.due_date,
      principal: s.principal,
      interest: s.interest,
      emi_amount: s.emi_amount,
      outstanding_balance: s.outstanding_balance,
      status: s.status,
      paid_amount: s.paid_amount,
      paid_date: s.paid_date,
      penalty: s.penalty,
    }))
  } else {
    // Generate fresh from loan data
    const gen = generateEMISchedule(
      loan.loan_amount || 0,
      loan.interest_rate || 0,
      loan.duration_months || 12,
      effectiveDate,
      loan.interest_type || 'reducing',
      loan.repayment_frequency || 'monthly'
    )
    scheduleItems = gen.map((s) => ({
      emi_number: s.emi_number,
      due_date: s.due_date,
      principal: s.principal,
      interest: s.interest,
      emi_amount: s.emi_amount,
      outstanding_balance: s.outstanding_balance,
      status: s.status,
      paid_amount: 0,
      paid_date: null,
      penalty: 0,
    }))
  }

  const record1: ScheduleRevision = {
    recordNumber: 1,
    title: 'Record 1',
    effectiveDate,
    createdAt: loan.created_at || new Date().toISOString(),
    createdBy: loan.created_by || 'Initial Account Creation',
    reason: 'Original created date details & amortization schedule',
    isCurrent: true,
    totalEmis: scheduleItems.length,
    schedule: scheduleItems,
  }

  // Cache record 1
  try {
    localStorage.setItem(STORAGE_PREFIX + loan.id, JSON.stringify([record1]))
  } catch {
    // Non-blocking
  }

  return [record1]
}

/**
 * Generate revised schedule records based on the new date.
 * Preserves payment details for already paid installments, and shifts due dates for pending EMIs.
 */
export function calculateRevisedSchedule(
  loan: Loan,
  baseSchedule: ScheduleRevisionItem[],
  newStartDate: string
): ScheduleRevisionItem[] {
  const frequency = loan.repayment_frequency || 'monthly'
  const newSchedule: ScheduleRevisionItem[] = []

  // Count how many paid vs pending
  let balance = loan.loan_amount || 0

  baseSchedule.forEach((item, index) => {
    const emiNum = index + 1
    let dueDate: string

    if (frequency === 'weekly') {
      dueDate = dayjs(newStartDate).add(emiNum, 'week').format('YYYY-MM-DD')
    } else if (frequency === 'fortnightly') {
      dueDate = dayjs(newStartDate).add(emiNum * 2, 'week').format('YYYY-MM-DD')
    } else {
      dueDate = dayjs(newStartDate).add(emiNum, 'month').format('YYYY-MM-DD')
    }

    if (item.status === 'paid') {
      // Keep paid records and payment details intact
      balance = Math.max(0, balance - (item.principal || 0))
      newSchedule.push({
        ...item,
        due_date: dueDate,
        outstanding_balance: Math.ceil(balance),
      })
    } else {
      // Pending / overdue / partial: apply new due date
      balance = Math.max(0, balance - (item.principal || 0))
      newSchedule.push({
        ...item,
        due_date: dueDate,
        outstanding_balance: Math.ceil(balance),
      })
    }
  })

  return newSchedule
}

/**
 * Create a new Schedule Revision (Record N), persist it locally and prepare it for DB sync.
 */
export async function createAndSaveScheduleRevision({
  loan,
  newDate,
  reason,
  changedBy,
  currentRevisions,
}: {
  loan: Loan
  newDate: string
  reason?: string
  changedBy: string
  currentRevisions: ScheduleRevision[]
}): Promise<{ updatedRevisions: ScheduleRevision[]; newRecord: ScheduleRevision }> {
  const activeRecord = currentRevisions.find((r) => r.isCurrent) || currentRevisions[currentRevisions.length - 1]
  const baseSchedule = activeRecord ? activeRecord.schedule : []

  // Generate new schedule for new date
  const newScheduleItems = calculateRevisedSchedule(loan, baseSchedule, newDate)

  const newRecordNumber = currentRevisions.length + 1
  const newRecord: ScheduleRevision = {
    recordNumber: newRecordNumber,
    title: `Record ${newRecordNumber}`,
    effectiveDate: newDate,
    previousDate: activeRecord?.effectiveDate || loan.loan_date,
    createdAt: new Date().toISOString(),
    createdBy: changedBy || 'Admin User',
    reason: reason || `Date changed from ${activeRecord?.effectiveDate || loan.loan_date} to ${newDate}`,
    isCurrent: true,
    totalEmis: newScheduleItems.length,
    schedule: newScheduleItems,
  }

  // Mark previous records as non-current
  const updatedRevisions = currentRevisions.map((r) => ({
    ...r,
    isCurrent: false,
  }))
  updatedRevisions.push(newRecord)

  // 1. Save to localStorage immediately
  try {
    localStorage.setItem(STORAGE_PREFIX + loan.id, JSON.stringify(updatedRevisions))
  } catch (err) {
    console.warn('[scheduleRevisionService] LocalStorage save error:', err)
  }

  // 2. Sync to Supabase in background
  try {
    await syncRevisionToDatabase(loan.id, updatedRevisions, newDate, newScheduleItems, loan.customer_id, newRecordNumber)
  } catch (err) {
    console.error('[scheduleRevisionService] Database sync error:', err)
    // Non-blocking: local cache preserves state
  }

  return { updatedRevisions, newRecord }
}

/**
 * Synchronize revisions and updated due dates to Supabase.
 */
export async function syncRevisionToDatabase(
  loanId: string,
  revisions: ScheduleRevision[],
  newDate: string,
  newScheduleItems: ScheduleRevisionItem[],
  customerId?: string,
  recordNumber?: number
) {
  // 1. Update loan date & serialized revisions in loans table
  const revisionPayload = JSON.stringify({ schedule_revisions: revisions })
  const { error: loanUpdateErr } = await supabase
    .from('loans')
    .update({
      loan_date: newDate,
      repayment_start_date: newDate,
      security_insurance_details: revisionPayload,
    })
    .eq('id', loanId)

  if (loanUpdateErr) {
    console.warn('[scheduleRevisionService] loans update error:', loanUpdateErr)
  }

  // 2. Update pending EMI due dates in emi_schedule table
  try {
    const { data: dbItems } = await supabase
      .from('emi_schedule')
      .select('id, emi_number, status')
      .eq('loan_id', loanId)

    if (dbItems && dbItems.length > 0) {
      for (const item of newScheduleItems) {
        const match = dbItems.find((d) => d.emi_number === item.emi_number)
        // Update due_date if pending / overdue
        if (match && match.status !== 'paid') {
          await supabase
            .from('emi_schedule')
            .update({
              due_date: item.due_date,
              outstanding_balance: item.outstanding_balance,
            })
            .eq('id', match.id)
        }
      }
    }
  } catch (err) {
    console.warn('[scheduleRevisionService] emi_schedule sync warning:', err)
  }

  // 3. Log an activity in customer_activities for audit trail
  if (customerId) {
    try {
      await supabase.from('customer_activities').insert([
        {
          customer_id: customerId,
          activity_type: 'loan_reschedule',
          description: `Amortization schedule date updated to ${newDate} (Record ${recordNumber || revisions.length})`,
          icon_color: 'text-brand-600',
        },
      ])
    } catch {
      // Non-blocking
    }
  }
}
