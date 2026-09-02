import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import type { Customer, Loan, EMIPayment, EMISchedule, Income, Expense, User, Lead, LeadFollowup, NewCustomerForm } from '@/types'
import { calculateEMI, generateEMISchedule } from '@/utils'
import dayjs from 'dayjs'
import { customerProfileService } from '@/services/customerProfileService'
import type { CustomerSegmentOption } from '@/services/customerProfileService'
import { useAuthStore } from '@/store/authStore'

// ─── Branch Filter Helper ─────────────────────────────────────────────────────
// Returns the branch name if the current user is a branch-level user, else null (admin sees all or selected branch)
function useBranchFilter(): string | null {
  const user = useAuthStore((s) => s.user)
  const isBranchUser = useAuthStore((s) => s.isBranchUser)
  const userBranch = useAuthStore((s) => s.userBranch)
  const selectedBranch = useAuthStore((s) => s.selectedBranch)
  if (!user) return null
  if (isBranchUser && userBranch) return userBranch
  if (user.role === 'branch' && user.branch) return user.branch
  if (user.branch) return user.branch
  return selectedBranch
}

// ─── Sequence ID Generator Helpers (Collision-Proof) ──────────────────────────

export async function generateNextLoanNumber(): Promise<string> {
  const currentYear = dayjs().format('YYYY')
  const prefix = `LN${currentYear}`

  const { data, error } = await supabase
    .from('loans')
    .select('loan_number')

  if (error || !data || data.length === 0) {
    return `${prefix}001`
  }

  const existingNumbers = new Set(
    data.map((l: { loan_number?: string }) => l.loan_number).filter(Boolean)
  )

  let maxSeq = 0
  for (const item of data) {
    if (item.loan_number && item.loan_number.startsWith(prefix)) {
      const numPart = item.loan_number.slice(prefix.length)
      const num = parseInt(numPart, 10)
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num
      }
    }
  }

  let nextSeq = maxSeq + 1
  let candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`
  while (existingNumbers.has(candidate)) {
    nextSeq++
    candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`
  }

  return candidate
}

export async function generateNextCustomerId(): Promise<string> {
  const prefix = 'CUS'
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id')

  if (error || !data || data.length === 0) {
    return `${prefix}001`
  }

  const existingIds = new Set(
    data.map((c: { customer_id?: string }) => c.customer_id).filter(Boolean)
  )

  let maxSeq = 0
  for (const item of data) {
    if (item.customer_id && item.customer_id.startsWith(prefix)) {
      const numPart = item.customer_id.slice(prefix.length)
      const num = parseInt(numPart, 10)
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num
      }
    }
  }

  let nextSeq = maxSeq + 1
  let candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`
  while (existingIds.has(candidate)) {
    nextSeq++
    candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`
  }

  return candidate
}

export async function generateNextTxnId(): Promise<string> {
  const prefix = 'TXN'
  const { data, error } = await supabase
    .from('transactions')
    .select('txn_id')

  if (error || !data || data.length === 0) {
    return `${prefix}0001`
  }

  const existingIds = new Set(
    data.map((t: { txn_id?: string }) => t.txn_id).filter(Boolean)
  )

  let maxSeq = 0
  for (const item of data) {
    if (item.txn_id && item.txn_id.startsWith(prefix)) {
      const numPart = item.txn_id.slice(prefix.length)
      const num = parseInt(numPart, 10)
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num
      }
    }
  }

  let nextSeq = maxSeq + 1
  let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`
  while (existingIds.has(candidate)) {
    nextSeq++
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`
  }

  return candidate
}

// ─── Customer Hooks ───────────────────────────────────────────────────────────

export function useCustomers() {
  const branchFilter = useBranchFilter()
  return useQuery({
    queryKey: ['customers', branchFilter],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      if (branchFilter) {
        query = query.eq('branch', branchFilter)
      }
      const { data, error } = await query
      if (error) throw error
      return data as Customer[]
    },
  })
}

export function useCustomer(id?: string) {
  const branchFilter = useBranchFilter()
  return useQuery({
    queryKey: ['customers', id, branchFilter],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      // Branch ownership guard: branch user cannot view other branch's customer
      if (branchFilter && data && data.branch !== branchFilter) return null
      return data as Customer | null
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (customerData: Partial<Customer>) => {
      const customer_id = await generateNextCustomerId()

      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...customerData, customer_id, status: 'active', kyc_status: 'verified' }])
        .select()
        .single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...customerData }: Partial<Customer> & { id: string }) => {
      const updatedData = { ...customerData }
      if (updatedData.kyc_status) {
        updatedData.status = updatedData.kyc_status === 'verified' ? 'active' : 'draft'
      }

      const { data, error } = await supabase
        .from('customers')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

// ─── Loan Hooks ───────────────────────────────────────────────────────────────

export function useLoans() {
  const branchFilter = useBranchFilter()
  return useQuery({
    queryKey: ['loans', branchFilter],
    queryFn: async () => {
      let query = supabase
        .from('loans')
        .select('*, customer:customers!loans_customer_id_fkey(name)')
        .order('created_at', { ascending: false })
      if (branchFilter) {
        query = query.eq('branch', branchFilter)
      }
      const { data, error } = await query
      if (error) throw error
      return data.map((l: any) => ({
        ...l,
        customer_name: l.customer?.name || 'Unknown',
      })) as Loan[]
    },
  })
}

export function useLoan(id?: string) {
  const branchFilter = useBranchFilter()
  return useQuery({
    queryKey: ['loans', id, branchFilter],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('loans')
        .select('*, customer:customers!loans_customer_id_fkey(name)')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      // Branch ownership guard: branch user cannot view other branch's loan
      if (branchFilter && data.branch !== branchFilter) return null
      return {
        ...data,
        customer_name: (data as any).customer?.name || 'Unknown',
      } as Loan
    },
    enabled: !!id,
  })
}

export function useLoanSchedule(loanId?: string) {
  return useQuery({
    queryKey: ['loans', loanId, 'schedule'],
    queryFn: async () => {
      if (!loanId) return []
      const { data, error } = await supabase
        .from('emi_schedule')
        .select('*')
        .eq('loan_id', loanId)
        .order('emi_number', { ascending: true })
      if (error) throw error
      return data as EMISchedule[]
    },
    enabled: !!loanId,
  })
}

export function useCreateLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (loanData: {
      customer_id: string
      loan_type: Loan['loan_type']
      loan_amount: number | null
      interest_rate: number
      interest_type: 'flat' | 'reducing'
      duration_months: number
      processing_fee: number
      loan_date: string
      status: Loan['status']
      
      // New wizard fields
      sanctioned_amount: number | null
      loan_product: string
      loan_category: string
      loan_purpose: string
      branch: string
      account_opening_date: string
      repayment_frequency: 'monthly' | 'weekly' | 'fortnightly'
      repayment_method: string
      repayment_start_date: string
      first_demand_date: string
      emi_due_day: number
      grace_period?: number
      penal_interest_rate?: number
      late_payment_charges?: number

      // Guarantor
      guarantor_customer_id?: string | null
      guarantor_relationship?: string
      guarantor_type?: string
      guarantor_amount?: number

      // Collateral
      security_type?: string
      security_description?: string
      security_owner_id?: string | null
      security_ownership_type?: string
      security_market_value?: number
      security_valuation_date?: string
      security_ltv?: number
      security_doc_number?: string
      security_doc_status?: string
      security_insurance_required?: boolean
      security_insurance_details?: string

      // Auditor
      created_by?: string
    }) => {
      const emi_amount = calculateEMI(
        loanData.loan_amount || 0,
        loanData.interest_rate,
        loanData.duration_months,
        loanData.interest_type,
        loanData.repayment_frequency
      )

      // Calculate installments count based on frequency
      let emi_count = loanData.duration_months
      if (loanData.repayment_frequency === 'weekly') {
        emi_count = loanData.duration_months * 4
      } else if (loanData.repayment_frequency === 'fortnightly') {
        emi_count = loanData.duration_months * 2
      }

      const total_interest = Math.max(0, emi_amount * emi_count - (loanData.loan_amount || 0))
      const disbursed_amount = (loanData.loan_amount || 0) - (loanData.processing_fee || 0)

      let attempts = 0
      let lastError: any = null
      let loan: Loan | null = null

      while (attempts < 3) {
        attempts++
        const loan_number = await generateNextLoanNumber()

        // Base fields — always exist in the database (migration 00001)
        const baseLoanFields = {
          loan_number,
          customer_id: loanData.customer_id,
          loan_type: loanData.loan_type,
          loan_amount: loanData.loan_amount,
          interest_rate: loanData.interest_rate,
          interest_type: loanData.interest_type,
          duration_months: loanData.duration_months,
          processing_fee: loanData.processing_fee,
          // Use account_opening_date if provided, otherwise use loan_date
          loan_date: loanData.account_opening_date || loanData.loan_date || null,
          emi_amount,
          emi_count,
          remaining_emi: emi_count,
          remaining_balance: loanData.loan_amount || 0,
          total_interest,
          disbursed_amount,
          // Use 'active' as fallback if status is 'draft' (pre-migration 00009 databases don't support 'draft')
          status: (loanData.status === 'draft' || loanData.status === 'pending') ? 'active' as const : loanData.status,
          sync_status: 'synced' as const,
        }

        // Extended fields — only exist after migration 00009
        const extendedLoanFields = {
          ...baseLoanFields,
          status: loanData.status, // override with real status after migration
          sanctioned_amount: loanData.sanctioned_amount,
          loan_product: loanData.loan_product,
          loan_category: loanData.loan_category,
          loan_purpose: loanData.loan_purpose,
          branch: loanData.branch,
          account_opening_date: loanData.account_opening_date || null,
          repayment_frequency: loanData.repayment_frequency,
          repayment_method: loanData.repayment_method,
          repayment_start_date: loanData.repayment_start_date || null,
          first_demand_date: loanData.first_demand_date || null,
          emi_due_day: loanData.emi_due_day,
          grace_period: loanData.grace_period || 0,
          penal_interest_rate: loanData.penal_interest_rate || 0,
          late_payment_charges: loanData.late_payment_charges || 0,
          guarantor_customer_id: loanData.guarantor_customer_id || null,
          guarantor_relationship: loanData.guarantor_relationship || null,
          guarantor_type: loanData.guarantor_type || null,
          guarantor_amount: loanData.guarantor_amount || null,
          security_type: loanData.security_type || null,
          security_description: loanData.security_description || null,
          security_owner_id: loanData.security_owner_id || null,
          security_ownership_type: loanData.security_ownership_type || null,
          security_market_value: loanData.security_market_value || null,
          security_valuation_date: loanData.security_valuation_date || null,
          security_ltv: loanData.security_ltv || null,
          security_doc_number: loanData.security_doc_number || null,
          security_doc_status: loanData.security_doc_status || null,
          security_insurance_required: loanData.security_insurance_required || false,
          security_insurance_details: loanData.security_insurance_details || null,
          created_by: loanData.created_by || 'Admin',
        }

        // Attempt insert with full wizard fields (requires migration 00009)
        let loanResult = await supabase.from('loans').insert([extendedLoanFields]).select().single()

        if (loanResult.error) {
          const errCode = (loanResult.error as any).code
          if (errCode === '23505' || loanResult.error.message?.includes('loans_loan_number_key') || loanResult.error.message?.includes('loan_number')) {
            lastError = loanResult.error
            continue
          }

          // 42703 = undefined_column, 23514 = check_violation (status constraint not updated yet)
          if (errCode === '42703' || errCode === '23514' || loanResult.error.message?.includes('column') || loanResult.error.message?.includes('check')) {
            console.warn(
              '[useCreateLoan] Extended columns not found — migration 00009 may not be applied. Falling back to base schema insert.',
              loanResult.error
            )
            // Retry with only base fields
            loanResult = await supabase.from('loans').insert([baseLoanFields]).select().single()
            if (loanResult.error) {
              const baseErrCode = (loanResult.error as any).code
              if (baseErrCode === '23505' || loanResult.error.message?.includes('loans_loan_number_key') || loanResult.error.message?.includes('loan_number')) {
                lastError = loanResult.error
                continue
              }
            }
          }
        }

        if (loanResult.error) {
          throw loanResult.error
        }

        loan = loanResult.data as Loan
        break
      }

      if (!loan) {
        if (lastError) throw lastError
        throw new Error('Failed to create loan after multiple attempts.')
      }

      // Generate EMI schedule using the repayment start date (or loan date as fallback)
      const scheduleStartDate = loanData.repayment_start_date || loanData.loan_date
      const schedule = generateEMISchedule(
        loanData.loan_amount || 0,
        loanData.interest_rate,
        loanData.duration_months,
        scheduleStartDate,
        loanData.interest_type,
        loanData.repayment_frequency
      )

      const scheduleData = schedule.map((s) => ({
        loan_id: loan.id,
        emi_number: s.emi_number,
        due_date: s.due_date,
        emi_amount: s.emi_amount,
        principal: s.principal,
        interest: s.interest,
        outstanding_balance: s.outstanding_balance,
        status: 'pending' as const,
        paid_amount: 0,
      }))

      if (scheduleData.length > 0) {
        const { error: scheduleError } = await supabase.from('emi_schedule').insert(scheduleData)
        if (scheduleError) {
          console.warn('[useCreateLoan] EMI schedule insert failed (non-critical):', scheduleError)
          // Don't throw — the loan was created, schedule can be regenerated
        }
      }

      return loan as Loan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['extendedDashboardData'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

export function useUpdateLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...loanData }: Partial<Loan> & { id: string }) => {
      const sanitizedData = { ...loanData }
      const dateFields = [
        'loan_date',
        'account_opening_date',
        'repayment_start_date',
        'first_demand_date',
        'security_valuation_date'
      ]
      dateFields.forEach((field) => {
        if ((sanitizedData as any)[field] === '') {
          ;(sanitizedData as any)[field] = null
        }
      })

      const { data, error } = await supabase
        .from('loans')
        .update(sanitizedData)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Loan
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

export function useDeleteLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (loanId: string) => {
      // Delete EMI schedule first
      const { error: scheduleError } = await supabase
        .from('emi_schedule')
        .delete()
        .eq('loan_id', loanId)
      if (scheduleError) throw scheduleError

      // Delete EMI payments
      const { error: paymentsError } = await supabase
        .from('emi_payments')
        .delete()
        .eq('loan_id', loanId)
      if (paymentsError) throw paymentsError

      // Delete the loan record
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

// ─── EMI Payment Hooks ─────────────────────────────────────────────────────────


export function usePayments(loanId?: string) {
  const branchFilter = useBranchFilter()
  return useQuery({
    queryKey: ['payments', loanId, branchFilter],
    queryFn: async () => {
      let query = supabase.from('emi_payments').select('*, customers(name, branch), loans(loan_number, branch)')
      if (loanId) {
        query = query.eq('loan_id', loanId)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      let results = data.map((p: any) => ({
        ...p,
        customer_name: p.customers?.name || 'Unknown',
        loan_number: p.loans?.loan_number || 'Unknown',
        _loan_branch: p.loans?.branch || null,
      })) as (EMIPayment & { customer_name: string; loan_number: string; _loan_branch?: string | null })[]
      // Client-side branch filter: only show payments for loans belonging to this branch
      if (branchFilter) {
        results = results.filter(p => p._loan_branch === branchFilter)
      }
      return results
    },
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentData: {
      loan_id: string
      customer_id: string
      emi_schedule_id: string
      emi_number: number
      payment_date: string
      payment_mode: 'cash' | 'upi' | 'bank' | 'cheque'
      amount_paid: number
      penalty: number
      discount: number
      notes?: string
      collected_by: string
    }) => {
      // Find the specific schedule
      const { data: schedule, error: schedError } = await supabase
        .from('emi_schedule')
        .select('*')
        .eq('id', paymentData.emi_schedule_id)
        .single()
      if (schedError) throw schedError

      const principal_paid = Math.max(0, paymentData.amount_paid - Number(schedule.interest))
      const interest_paid = Math.min(Number(schedule.interest), paymentData.amount_paid)

      const receipt_number = `RCP${Date.now().toString().slice(-8)}`

      const newPayment = {
        loan_id: paymentData.loan_id,
        customer_id: paymentData.customer_id,
        emi_schedule_id: paymentData.emi_schedule_id,
        emi_number: paymentData.emi_number,
        payment_date: paymentData.payment_date,
        payment_mode: paymentData.payment_mode,
        amount_paid: paymentData.amount_paid,
        principal_paid,
        interest_paid,
        penalty: paymentData.penalty,
        discount: paymentData.discount,
        advance_emi: 0,
        partial: paymentData.amount_paid < Number(schedule.emi_amount),
        receipt_number,
        collected_by: paymentData.collected_by,
        notes: paymentData.notes,
      }

      const { data: payment, error: payError } = await supabase
        .from('emi_payments')
        .insert([newPayment])
        .select()
        .single()
      if (payError) throw payError

      // Update schedule status
      const updatedStatus = newPayment.partial ? 'partial' : ('paid' as const)
      const { error: updateSchedError } = await supabase
        .from('emi_schedule')
        .update({
          status: updatedStatus,
          paid_amount: paymentData.amount_paid,
          paid_date: paymentData.payment_date,
          penalty: paymentData.penalty,
        })
        .eq('id', paymentData.emi_schedule_id)
      if (updateSchedError) throw updateSchedError

      // Update loan balances
      const { data: loan, error: loanErr } = await supabase
        .from('loans')
        .select('*')
        .eq('id', paymentData.loan_id)
        .single()
      if (loanErr) throw loanErr

      const remaining_emi = Math.max(0, Number(loan.remaining_emi) - (newPayment.partial ? 0 : 1))
      const remaining_balance = Math.max(0, Number(loan.remaining_balance) - principal_paid)
      const loanStatus = remaining_balance === 0 ? 'closed' : ('active' as const)

      const { error: updateLoanError } = await supabase
        .from('loans')
        .update({
          remaining_emi,
          remaining_balance,
          status: loanStatus,
        })
        .eq('id', paymentData.loan_id)
      if (updateLoanError) throw updateLoanError

      // Insert income record for finance audit
      await supabase.from('income').insert([
        {
          category: 'interest',
          amount: interest_paid,
          description: `Interest income from Loan ${loan.loan_number} EMI #${paymentData.emi_number}`,
          date: paymentData.payment_date,
          loan_id: paymentData.loan_id,
          customer_id: paymentData.customer_id,
        },
      ])

      if (paymentData.penalty > 0) {
        await supabase.from('income').insert([
          {
            category: 'penalty',
            amount: paymentData.penalty,
            description: `Penalty fee from Loan ${loan.loan_number} EMI #${paymentData.emi_number}`,
            date: paymentData.payment_date,
            loan_id: paymentData.loan_id,
            customer_id: paymentData.customer_id,
          },
        ])
      }

      return payment as EMIPayment
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', variables.loan_id] })
      queryClient.invalidateQueries({ queryKey: ['loans', variables.loan_id, 'schedule'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

// ─── Expense Hooks ────────────────────────────────────────────────────────────

export function useExpenses() {
  // Expenses are company-wide (no branch column), so all users see all expenses.
  // Branch users get read-only view of expenses.
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return data as Expense[]
    },
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (expenseData: Partial<Expense>) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single()
      if (error) throw error
      return data as Expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

// ─── Income Hooks ─────────────────────────────────────────────────────────────

export function useIncome() {
  const branchFilter = useBranchFilter()
  return useQuery({
    queryKey: ['income', branchFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('income')
        .select('*, customers(name, branch), loans(loan_number, branch)')
        .order('date', { ascending: false })
      if (error) throw error
      let results = data.map((i: any) => ({
        ...i,
        customer_name: i.customers?.name || 'System',
        loan_number: i.loans?.loan_number || 'N/A',
        _loan_branch: i.loans?.branch || null,
        _customer_branch: i.customers?.branch || null,
      })) as (Income & { customer_name: string; loan_number: string; _loan_branch?: string | null; _customer_branch?: string | null })[]
      // Client-side branch filter: filter by loan or customer branch
      if (branchFilter) {
        results = results.filter(i => i._loan_branch === branchFilter || i._customer_branch === branchFilter)
      }
      return results
    },
  })
}

export function useCreateIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (incomeData: Partial<Income>) => {
      const { data, error } = await supabase
        .from('income')
        .insert([incomeData])
        .select()
        .single()
      if (error) throw error
      return data as Income
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

// ─── Dashboard Data ───────────────────────────────────────────────────────────

export function useDashboardData() {
  const branchFilter = useBranchFilter()
  return useQuery({
    queryKey: ['dashboardData', branchFilter],
    queryFn: async () => {
      // 1. Total Customers Count
      let custCountQuery = supabase.from('customers').select('*', { count: 'exact', head: true })
      if (branchFilter) custCountQuery = custCountQuery.eq('branch', branchFilter)
      const { count: total_customers } = await custCountQuery

      // 2. Loans Status & Type (only select required columns)
      let loansQuery = supabase.from('loans').select('loan_type, status, id')
      if (branchFilter) loansQuery = loansQuery.eq('branch', branchFilter)
      const { data: loansSummary = [] } = await loansQuery
      const safeLoansSummary = loansSummary || []
      const branchLoanIds = new Set(safeLoansSummary.map(l => l.id))

      const active_loans = safeLoansSummary.filter((l) => l.status === 'active').length
      const closed_loans = safeLoansSummary.filter((l) => l.status === 'closed').length
      const overdue_loans = safeLoansSummary.filter((l) => l.status === 'overdue').length

      // 3. Todays collection and total interest earned
      const todayStr = dayjs().format('YYYY-MM-DD')
      const [
        { data: todaysPayments = [] },
        { data: allPaymentsInterest = [] }
      ] = await Promise.all([
        supabase.from('emi_payments').select('amount_paid, loan_id').eq('payment_date', todayStr),
        supabase.from('emi_payments').select('interest_paid, loan_id')
      ])

      // Client-side branch filter for payments (no branch column on emi_payments)
      const filterByBranch = <T extends { loan_id?: string }>(arr: T[]): T[] =>
        branchFilter ? arr.filter(p => branchLoanIds.has(p.loan_id)) : arr

      const todays_collection = filterByBranch(todaysPayments || []).reduce((sum, p) => sum + Number(p.amount_paid), 0)
      const interest_earned = filterByBranch(allPaymentsInterest || []).reduce((sum, p) => sum + Number(p.interest_paid), 0)

      // 4. Pending EMI count — fetch with loan_id for client-side filtering
      const { data: pendingEMIs = [] } = await supabase
        .from('emi_schedule')
        .select('id, loan_id')
        .eq('status', 'pending')
      const pending_emi = branchFilter
        ? (pendingEMIs || []).filter(s => branchLoanIds.has(s.loan_id)).length
        : (pendingEMIs || []).length

      // 5. Monthly Income & Expense (filter by current month)
      const startOfMonthStr = dayjs().startOf('month').format('YYYY-MM-DD')
      const [
        { data: thisMonthIncome = [] },
        { data: thisMonthExpense = [] }
      ] = await Promise.all([
        supabase.from('income').select('amount, loan_id').gte('date', startOfMonthStr),
        supabase.from('expenses').select('amount').gte('date', startOfMonthStr)
      ])

      const monthly_income = filterByBranch(thisMonthIncome || []).reduce((sum, i) => sum + Number(i.amount), 0)
      // Expenses are company-wide — show all for admin, all for branch too (no branch column)
      const monthly_expense = (thisMonthExpense || []).reduce((sum, e) => sum + Number(e.amount), 0)
      const net_profit = monthly_income - monthly_expense

      // 6. Collection Rate
      const { data: allEMIs = [] } = await supabase.from('emi_schedule').select('id, status, loan_id')
      const branchEMIs = branchFilter
        ? (allEMIs || []).filter(s => branchLoanIds.has(s.loan_id))
        : (allEMIs || [])
      const totalEMIs = branchEMIs.length
      const paidEMIs = branchEMIs.filter(s => s.status === 'paid').length
      const collection_rate = totalEMIs > 0 ? Math.round((paidEMIs / totalEMIs) * 1000) / 10 : 100

      // 7. Period Payments, Income, & Expenses for Charts (filter by last 7 months)
      const startOfPeriodStr = dayjs().subtract(6, 'month').startOf('month').format('YYYY-MM-DD')
      const [
        { data: periodPayments = [] },
        { data: periodIncome = [] },
        { data: periodExpenses = [] },
      ] = await Promise.all([
        supabase.from('emi_payments').select('amount_paid, payment_date, loan_id').gte('payment_date', startOfPeriodStr),
        supabase.from('income').select('amount, date, loan_id').gte('date', startOfPeriodStr),
        supabase.from('expenses').select('amount, date').gte('date', startOfPeriodStr),
      ])

      const safePeriodPayments = filterByBranch(periodPayments || [])
      const safePeriodIncome = filterByBranch(periodIncome || [])
      const safePeriodExpenses = periodExpenses || []

      const months = Array.from({ length: 7 }, (_, i) =>
        dayjs().subtract(6 - i, 'month').format('MMM')
      )

      const collectionChart = months.map((m) => {
        const paymentsInMonth = safePeriodPayments.filter((p) => dayjs(p.payment_date).format('MMM') === m)
        const value = paymentsInMonth.reduce((sum, p) => sum + Number(p.amount_paid), 0)
        return { name: m, value, target: Math.round(value * 1.1) || 100000 }
      })

      const incomeExpenseChart = months.map((m) => {
        const incVal = safePeriodIncome
          .filter((i) => dayjs(i.date).format('MMM') === m)
          .reduce((sum, i) => sum + Number(i.amount), 0)
        const expVal = safePeriodExpenses
          .filter((e) => dayjs(e.date).format('MMM') === m)
          .reduce((sum, e) => sum + Number(e.amount), 0)
        return { name: m, income: incVal, expense: expVal }
      })

      // 8. Loan Distribution Chart
      const loanTypes = ['personal', 'business', 'home', 'vehicle', 'gold', 'agriculture', 'education']
      const colors = ['#38BDF8', '#22C55E', '#8B5CF6', '#F59E0B', '#F97316', '#EC4899', '#6B7280']
      const totalLoansCount = safeLoansSummary.length || 1
      const loanDistributionChart = loanTypes
        .map((t, idx) => ({
          name: t.charAt(0).toUpperCase() + t.slice(1),
          value: Math.round((safeLoansSummary.filter(l => l.loan_type === t).length / totalLoansCount) * 100),
          color: colors[idx],
        }))
        .filter((item) => item.value > 0)

      // 9. Upcoming Due with selective query & database joins
      const { data: upcomingDueData = [] } = await supabase
        .from('emi_schedule')
        .select('id, emi_amount, due_date, status, loan_id, loans(loan_number, branch, customers(name))')
        .or('status.eq.pending,status.eq.overdue')
        .order('due_date', { ascending: true })
        .limit(branchFilter ? 20 : 5)

      let upcomingDue = (upcomingDueData || []).map((s: any) => {
        const days_overdue = dayjs().diff(dayjs(s.due_date), 'day')
        return {
          id: s.id,
          name: s.loans?.customers?.name || 'Unknown',
          loan_number: s.loans?.loan_number || 'Unknown',
          amount: Number(s.emi_amount),
          due_date: s.due_date,
          days_overdue: days_overdue > 0 ? days_overdue : 0,
          _loan_branch: s.loans?.branch || null,
        }
      })
      if (branchFilter) {
        upcomingDue = upcomingDue.filter(d => d._loan_branch === branchFilter).slice(0, 5)
      }

      // 10. Recent Activity Log with selective query & database joins
      const { data: recentPayments = [] } = await supabase
        .from('emi_payments')
        .select('id, amount_paid, collected_by, created_at, payment_date, loan_id, customers(name), loans(loan_number, branch)')
        .order('created_at', { ascending: false })
        .limit(branchFilter ? 20 : 5)

      let activityLog = (recentPayments || []).map((p: any) => ({
        id: `p-${p.id}`,
        action: 'EMI Collected',
        module: 'EMI',
        user: p.collected_by || 'Admin',
        details: `₹${Number(p.amount_paid).toLocaleString('en-IN')} from ${p.customers?.name || 'Customer'
          } (${p.loans?.loan_number})`,
        time: p.created_at || p.payment_date,
        type: 'success',
        _loan_branch: p.loans?.branch || null,
      }))

      if (branchFilter) {
        activityLog = activityLog.filter(a => a._loan_branch === branchFilter)
      }
      activityLog.sort((a, b) => dayjs(b.time).unix() - dayjs(a.time).unix())
      activityLog = activityLog.slice(0, 5)

      return {
        stats: {
          total_customers: total_customers || 0,
          active_loans,
          closed_loans,
          todays_collection,
          pending_emi,
          overdue_loans,
          interest_earned,
          monthly_income,
          monthly_expense,
          net_profit,
          collection_rate,
        },
        collectionChart,
        incomeExpenseChart,
        loanDistributionChart,
        upcomingDue,
        activityLog,
      }
    },
  })
}

// ─── Notifications Hook ──────────────────────────────────────────────────────

export function useNotificationsData() {
  const branchFilter = useBranchFilter()
  return useQuery({
    queryKey: ['notificationsData', branchFilter],
    queryFn: async () => {
      // Build branch-filtered queries for loans and customers
      let loansQuery = supabase.from('loans').select('*')
      let customersQuery = supabase.from('customers').select('*')
      if (branchFilter) {
        loansQuery = loansQuery.eq('branch', branchFilter)
        customersQuery = customersQuery.eq('branch', branchFilter)
      }

      const [
        { data: schedule },
        { data: loans },
        { data: customers },
      ] = await Promise.all([
        supabase.from('emi_schedule').select('*').eq('status', 'pending'),
        loansQuery,
        customersQuery,
      ])

      const safeSchedule = schedule || []
      const safeLoans = loans || []
      const safeCustomers = customers || []

      // Build a set of branch loan IDs for client-side filtering of schedule items
      const branchLoanIds = new Set(safeLoans.map(l => l.id))

      const today = dayjs()
      const notifications: any[] = []

      safeSchedule.forEach((s) => {
        // Client-side filter: skip EMIs for loans outside this branch
        if (branchFilter && !branchLoanIds.has(s.loan_id)) return

        const loan = safeLoans.find((l) => l.id === s.loan_id)
        const customer = safeCustomers.find((c) => c.id === loan?.customer_id)
        if (!loan || !customer) return

        const dueDate = dayjs(s.due_date)
        const diffDays = dueDate.diff(today, 'day')

        if (dueDate.isSame(today, 'day')) {
          notifications.push({
            id: `due-today-${s.id}`,
            type: 'due_today',
            title: 'EMI Due Today',
            message: `${customer.name} (${loan.loan_number}) has EMI of ₹${Number(
              s.emi_amount
            ).toLocaleString('en-IN')} due today`,
            customer_id: customer.id,
            loan_id: loan.id,
            is_read: false,
            created_at: dueDate.toISOString(),
          })
        } else if (dueDate.isBefore(today, 'day')) {
          const daysOverdue = Math.abs(diffDays)
          notifications.push({
            id: `overdue-${s.id}`,
            type: 'overdue_emi',
            title: 'Overdue EMI Alert',
            message: `${customer.name} (${loan.loan_number}) EMI is ${daysOverdue} days overdue. Amount: ₹${Number(
              s.emi_amount
            ).toLocaleString('en-IN')}`,
            customer_id: customer.id,
            loan_id: loan.id,
            is_read: false,
            created_at: dueDate.toISOString(),
          })
        } else if (diffDays > 0 && diffDays <= 3) {
          notifications.push({
            id: `upcoming-${s.id}`,
            type: 'upcoming_emi',
            title: 'Upcoming EMI Reminder',
            message: `${customer.name} (${loan.loan_number}) has EMI of ₹${Number(
              s.emi_amount
            ).toLocaleString('en-IN')} due in ${diffDays} days`,
            customer_id: customer.id,
            loan_id: loan.id,
            is_read: false,
            created_at: dueDate.toISOString(),
          })
        }
      })

      notifications.sort((a, b) => {
        const typeWeight = { overdue_emi: 3, due_today: 2, upcoming_emi: 1 }
        return (
          (typeWeight[b.type as keyof typeof typeWeight] || 0) -
          (typeWeight[a.type as keyof typeof typeWeight] || 0)
        )
      })

      return notifications.slice(0, 10)
    },
  })
}

// ─── Users & Roles Hook ─────────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as User[]
    },
  })
}

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password, fullName }: { email: string; password?: string; fullName: string }) => {
      const usePassword = password || 'password123'

      // 1. Authenticate with Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: usePassword,
      })

      if (authError) {
        // Try sign up for first-time admin setup
        const { error: signUpError } = await supabase.auth.signUp({ email, password: usePassword })
        if (signUpError) console.warn('Auth sign-up failed:', signUpError.message)
      }

      // 2. Find the profile in public.users
      let { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (error) throw error

      const emailLower = (email || '').toLowerCase()
      const branchName = emailLower.includes('aniyapuram')
        ? 'Aniyapuram'
        : emailLower.includes('vallipuram')
        ? 'Vallipuram'
        : null

      if (!user) {
        // Auto-register profile with appropriate role and branch
        const role = branchName ? 'branch' : 'admin'
        const name = branchName ? `${branchName} Branch` : fullName
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{ email, full_name: name, role, branch: branchName, is_active: true }])
          .select()
          .single()
        if (insertError) throw insertError
        user = newUser
      } else if (branchName && (!user.branch || user.role !== 'branch')) {
        // Auto-update profile if previously registered as admin without branch
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ role: 'branch', branch: branchName, full_name: `${branchName} Branch` })
          .eq('id', user.id)
          .select()
          .single()
        if (!updateError && updatedUser) {
          user = updatedUser
        }
      }

      // 3. Check account is active
      if (!user.is_active) {
        await supabase.auth.signOut()
        throw new Error('Your account has been disabled. Please contact your administrator.')
      }

      // 4. Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)

      // 5. Record login session in employee_sessions
      const authUser = authData?.user || (await supabase.auth.getUser()).data.user
      let sessionId: string | null = null
      if (authUser) {
        const { data: sessionRow } = await supabase
          .from('employee_sessions')
          .insert({
            user_id: authUser.id,
            employee_id: user.employee_id || null,
            login_at: new Date().toISOString(),
            status: 'active',
            user_agent: navigator.userAgent,
          })
          .select('id')
          .single()
        sessionId = sessionRow?.id || null
      }

      return { user: user as User, sessionId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useLeads() {
  // Leads (applications) table has no branch column, so leads are visible to all users.
  // Branch filtering for leads is not applied since leads are company-wide enquiries.
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        console.error('[useLeads] Supabase error:', error)
        throw error
      }
      // Status column now exists directly on the table.
      // For older rows that still have JSON in message, fall back gracefully.
      return (data ?? []).map((l: any) => {
        type LeadStatus = 'Pending' | 'Converted' | 'Rejected' | 'Interested'
        // If the row already has a proper status column value, use it
        if (l.status && l.status !== 'Pending') {
          return {
            ...l,
            status: l.status as LeadStatus,
          } as Lead
        }
        // Legacy: try to parse old JSON from message column
        if (l.message && l.message.startsWith('{')) {
          try {
            const parsed = JSON.parse(l.message)
            if (parsed && typeof parsed === 'object' && 'status' in parsed) {
              return {
                ...l,
                status: (parsed.status || 'Pending') as LeadStatus,
                rejection_reason: parsed.rejection_reason || l.rejection_reason,
                message: parsed.text || '',
              } as Lead
            }
          } catch { /* not JSON, fall through */ }
        }
        return { ...l, status: (l.status || 'Pending') as LeadStatus } as Lead
      })
    },
    retry: 1,
    staleTime: 30_000,
  })
}

// ─── Product → LoanType map ───────────────────────────────────────────────────
const PRODUCT_TO_LOAN_TYPE: Record<string, string> = {
  'Business Loan': 'business',
  'Personal Loan': 'personal',
  'Gold Loan': 'gold',
  'Home Loan': 'home',
  'Vehicle Loan': 'vehicle',
  'Education Loan': 'education',
}

export function useConvertLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lead: Lead) => {
      const loanAmount = isNaN(Number(lead.amount)) ? 50_000 : Math.max(1000, Number(lead.amount) || 50_000)
      const interestRate = 12
      const durationMo = 12
      const intType = 'reducing' as const
      const procFee = 0
      const loanType = (PRODUCT_TO_LOAN_TYPE[lead.product] || 'personal') as Loan['loan_type']
      const loanDate = dayjs().format('YYYY-MM-DD')

      // ── 1. Mark application as Converted ─────────────────────────────────────
      const { error: appErr } = await supabase
        .from('applications')
        .update({ status: 'Converted', rejection_reason: null })
        .eq('id', lead.id)
      if (appErr) {
        // Fallback: try old JSON message column (pre-migration)
        const { error: fallbackErr } = await supabase
          .from('applications')
          .update({ message: JSON.stringify({ status: 'Converted', text: lead.message || '' }) })
          .eq('id', lead.id)
        if (fallbackErr) throw fallbackErr
      }

      // ── 2. Insert customer ────────────────────────────────────────────────────
      const customer_id = await generateNextCustomerId()

      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert([{
          customer_id,
          name: lead.name,
          mobile: lead.phone,
          whatsapp: lead.phone,
          address: 'Address not provided (Converted Lead)',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          occupation: 'Service',
          company: 'N/A',
          monthly_income: loanAmount,
          aadhaar: '',
          pan: '',
          status: 'active',
          kyc_status: 'verified',
          sync_status: 'synced',
        }])
        .select()
        .single()
      if (custErr) throw custErr

      // ── 3. Insert loan ────────────────────────────────────────────────────────
      const emiAmount = calculateEMI(loanAmount, interestRate, durationMo, intType)
      const totalInterest = Math.round(emiAmount * durationMo - loanAmount)
      const disbursed = loanAmount - procFee

      const loan_number = await generateNextLoanNumber()

      const { data: loan, error: loanErr } = await supabase
        .from('loans')
        .insert([{
          loan_number,
          customer_id: customer.id,
          loan_type: loanType,
          loan_amount: loanAmount,
          interest_rate: interestRate,
          interest_type: intType,
          duration_months: durationMo,
          processing_fee: procFee,
          loan_date: loanDate,
          emi_amount: emiAmount,
          emi_count: durationMo,
          remaining_emi: durationMo,
          remaining_balance: loanAmount,
          total_interest: totalInterest,
          disbursed_amount: disbursed,
          status: 'active',
          sync_status: 'synced',
        }])
        .select()
        .single()
      if (loanErr) throw loanErr

      // ── 4. Insert EMI schedule ────────────────────────────────────────────────
      const schedule = generateEMISchedule(loanAmount, interestRate, durationMo, loanDate, intType)
      const scheduleRows = schedule.map(s => ({
        loan_id: loan.id,
        emi_number: s.emi_number,
        due_date: s.due_date,
        emi_amount: s.emi_amount,
        principal: s.principal,
        interest: s.interest,
        outstanding_balance: s.outstanding_balance,
        status: 'pending' as const,
        paid_amount: 0,
      }))

      const { error: schedErr } = await supabase
        .from('emi_schedule')
        .insert(scheduleRows)
      if (schedErr) throw schedErr

      return { customer, loan }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

export function useRejectLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ lead, reason }: { lead: Lead; reason?: string }) => {
      // Try new column-based update first (post-migration)
      const { data, error } = await supabase
        .from('applications')
        .update({
          status: 'Rejected',
          rejection_reason: reason || null,
        })
        .eq('id', lead.id)
        .select()
        .maybeSingle()

      if (error) {
        // Fallback: serialize into message column (pre-migration rows)
        const { data: d2, error: e2 } = await supabase
          .from('applications')
          .update({
            message: JSON.stringify({
              status: 'Rejected',
              rejection_reason: reason || '',
              text: lead.message || '',
            }),
          })
          .eq('id', lead.id)
          .select()
          .maybeSingle()
        if (e2) throw e2
        return (d2 ?? lead) as Lead
      }

      return (data ?? lead) as Lead
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

// ─── Lead: Mark as Interested ────────────────────────────────────────────────

export function useMarkLeadInterested() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lead: Lead) => {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'Interested' })
        .eq('id', lead.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['extendedDashboardData'] })
    },
  })
}

// ─── Lead Follow-ups ─────────────────────────────────────────────────────────

export function useFollowups() {
  return useQuery({
    queryKey: ['lead_followups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_followups')
        .select('*')
        .order('next_followup_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as LeadFollowup[]
    },
    staleTime: 30_000,
  })
}

export function useUpsertFollowup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      lead_id: string
      last_conversation_note?: string
      next_followup_date?: string
      next_followup_time?: string
      reminder_status?: 'pending' | 'completed' | 'overdue'
    }) => {
      const { data, error } = await supabase
        .from('lead_followups')
        .upsert(
          {
            lead_id: payload.lead_id,
            last_conversation_note: payload.last_conversation_note ?? null,
            next_followup_date: payload.next_followup_date ?? null,
            next_followup_time: payload.next_followup_time ?? null,
            reminder_status: payload.reminder_status ?? 'pending',
          },
          { onConflict: 'lead_id' }
        )
        .select()
        .single()
      if (error) throw error
      return data as LeadFollowup
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_followups'] })
    },
  })
}

export function useCompleteReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('lead_followups')
        .update({
          reminder_status: 'completed',
          next_followup_date: null,
          next_followup_time: null,
        })
        .eq('lead_id', leadId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_followups'] })
    },
  })
}

// ─── Customer Profile Dashboard Hooks ─────────────────────────────────────────

export function useCustomerProfile(customerId: string) {
  return useQuery({
    queryKey: ['customerProfile', customerId, 'profile'],
    queryFn: () => customerProfileService.getProfile(customerId),
    enabled: !!customerId,
  })
}

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, payload }: { customerId: string; payload: any }) => {
      const updatedPayload = { ...payload }
      if (updatedPayload.kyc_status) {
        updatedPayload.status = updatedPayload.kyc_status === 'verified' ? 'active' : 'draft'
      }
      return customerProfileService.updateProfile(customerId, updatedPayload)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'profile'] })
      queryClient.invalidateQueries({ queryKey: ['customers', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useCustomerProjects(customerId: string) {
  return useQuery({
    queryKey: ['customerProfile', customerId, 'projects'],
    queryFn: () => customerProfileService.getProjects(customerId),
    enabled: !!customerId,
  })
}

export function useSaveCustomerProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, project }: { customerId: string; project: any }) =>
      customerProfileService.saveProject(customerId, project),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'projects'] })
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'activities'] })
    },
  })
}

export function useDeleteCustomerProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, projectId }: { customerId: string; projectId: string }) =>
      customerProfileService.deleteProject(customerId, projectId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'projects'] })
    },
  })
}

export function useCustomerQuotations(customerId: string) {
  return useQuery({
    queryKey: ['customerProfile', customerId, 'quotations'],
    queryFn: () => customerProfileService.getQuotations(customerId),
    enabled: !!customerId,
  })
}

export function useSaveCustomerQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, quotation }: { customerId: string; quotation: any }) =>
      customerProfileService.saveQuotation(customerId, quotation),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'quotations'] })
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'activities'] })
    },
  })
}

export function useCustomerInvoices(customerId: string) {
  return useQuery({
    queryKey: ['customerProfile', customerId, 'invoices'],
    queryFn: () => customerProfileService.getInvoices(customerId),
    enabled: !!customerId,
  })
}

export function useSaveCustomerInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, invoice }: { customerId: string; invoice: any }) =>
      customerProfileService.saveInvoice(customerId, invoice),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'invoices'] })
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'activities'] })
    },
  })
}

export function useCustomerPayments(customerId: string) {
  return useQuery({
    queryKey: ['customerProfile', customerId, 'payments'],
    queryFn: () => customerProfileService.getPayments(customerId),
    enabled: !!customerId,
  })
}

export function useSaveCustomerPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, payment }: { customerId: string; payment: any }) =>
      customerProfileService.savePayment(customerId, payment),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'payments'] })
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'activities'] })
    },
  })
}

export function useCustomerDocuments(customerId: string) {
  return useQuery({
    queryKey: ['customerProfile', customerId, 'documents'],
    queryFn: () => customerProfileService.getDocuments(customerId),
    enabled: !!customerId,
  })
}

export function useSaveCustomerDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, document }: { customerId: string; document: any }) =>
      customerProfileService.saveDocument(customerId, document),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'documents'] })
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'activities'] })
    },
  })
}

export function useDeleteCustomerDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, documentId }: { customerId: string; documentId: string }) =>
      customerProfileService.deleteDocument(customerId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'documents'] })
    },
  })
}

export function useCustomerCommunications(customerId: string) {
  return useQuery({
    queryKey: ['customerProfile', customerId, 'communications'],
    queryFn: () => customerProfileService.getCommunications(customerId),
    enabled: !!customerId,
  })
}

export function useSaveCustomerCommunication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, communication }: { customerId: string; communication: any }) =>
      customerProfileService.saveCommunication(customerId, communication),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'communications'] })
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'activities'] })
    },
  })
}

export function useCustomerFollowups(customerId: string) {
  return useQuery({
    queryKey: ['customerProfile', customerId, 'followups'],
    queryFn: () => customerProfileService.getFollowups(customerId),
    enabled: !!customerId,
  })
}

export function useSaveCustomerFollowup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, followup }: { customerId: string; followup: any }) =>
      customerProfileService.saveFollowup(customerId, followup),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'followups'] })
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'activities'] })
    },
  })
}

export function useCustomerNotes(customerId: string) {
  return useQuery({
    queryKey: ['customerProfile', customerId, 'notes'],
    queryFn: () => customerProfileService.getNotes(customerId),
    enabled: !!customerId,
  })
}

export function useSaveCustomerNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, note }: { customerId: string; note: any }) =>
      customerProfileService.saveNote(customerId, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'notes'] })
    },
  })
}

export function useDeleteCustomerNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, noteId }: { customerId: string; noteId: string }) =>
      customerProfileService.deleteNote(customerId, noteId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'notes'] })
    },
  })
}

export function useCustomerActivities(customerId: string) {
  return useQuery({
    queryKey: ['customerProfile', customerId, 'activities'],
    queryFn: () => customerProfileService.getActivities(customerId),
    enabled: !!customerId,
  })
}

export function useSaveCustomerActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, activity }: { customerId: string; activity: any }) =>
      customerProfileService.saveActivity(customerId, activity),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.customerId, 'activities'] })
    },
  })
}

// ─── Customer Segment Options Hooks ───────────────────────────────────────────

export function useCustomerSegmentOptions() {
  return useQuery({
    queryKey: ['customerSegmentOptions'],
    queryFn: () => customerProfileService.getSegmentOptions(),
    staleTime: 1000 * 60 * 5, // 5 min cache
  })
}

export function useAddCustomerSegmentOption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => customerProfileService.addSegmentOption(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerSegmentOptions'] })
    },
  })
}

// ─── Loan Purpose Options Hooks ────────────────────────────────────────────────

const DEFAULT_LOAN_PURPOSES = [
  { id: 'default-1', name: 'Working Capital', is_active: true },
  { id: 'default-2', name: 'Equipment Purchase', is_active: true },
  { id: 'default-3', name: 'Business Expansion', is_active: true },
  { id: 'default-4', name: 'Home Construction', is_active: true },
  { id: 'default-5', name: 'Property Purchase', is_active: true },
  { id: 'default-6', name: 'Vehicle Purchase', is_active: true },
  { id: 'default-7', name: 'Education', is_active: true },
  { id: 'default-8', name: 'Agriculture', is_active: true },
  { id: 'default-9', name: 'Personal Use', is_active: true },
  { id: 'default-10', name: 'Debt Consolidation', is_active: true }
]

export function useLoanPurposeOptions() {
  return useQuery({
    queryKey: ['loanPurposeOptions'],
    queryFn: async () => {
      let dbOptions: any[] = []
      try {
        dbOptions = await customerProfileService.getLoanPurposeOptions()
      } catch (err) {
        console.warn('Failed to fetch loan purposes from DB, using fallback defaults:', err)
      }

      // Load custom purposes from local storage
      let localOptions: any[] = []
      try {
        const stored = localStorage.getItem('custom_loan_purposes')
        if (stored) {
          localOptions = JSON.parse(stored)
        }
      } catch (err) {
        console.warn('Failed to parse custom loan purposes from local storage:', err)
      }

      // Merge defaults, DB options and local options
      const allOptionsMap = new Map()

      // 1. Add defaults
      DEFAULT_LOAN_PURPOSES.forEach(opt => allOptionsMap.set(opt.name.toLowerCase(), opt))

      // 2. Add local custom options
      localOptions.forEach(opt => allOptionsMap.set(opt.name.toLowerCase(), opt))

      // 3. Add DB options (overwrite if active status differs)
      dbOptions.forEach(opt => allOptionsMap.set(opt.name.toLowerCase(), opt))

      return Array.from(allOptionsMap.values()) as typeof DEFAULT_LOAN_PURPOSES
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useAddLoanPurposeOption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmedName = name.trim()
      const newOption = { id: `local-${Date.now()}`, name: trimmedName, is_active: true }

      // Try saving to DB first
      try {
        return await customerProfileService.addLoanPurposeOption(trimmedName)
      } catch (err) {
        console.warn('Failed to save loan purpose to DB, saving locally in localStorage:', err)

        // Save to localStorage
        let localOptions: any[] = []
        try {
          const stored = localStorage.getItem('custom_loan_purposes')
          if (stored) {
            localOptions = JSON.parse(stored)
          }
        } catch (e) {}

        if (!localOptions.some(opt => opt.name.toLowerCase() === trimmedName.toLowerCase())) {
          localOptions.push(newOption)
          localStorage.setItem('custom_loan_purposes', JSON.stringify(localOptions))
        }

        return newOption
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanPurposeOptions'] })
    },
  })
}

// ─── Account View Hooks ───────────────────────────────────────────────────────

export function useCustomerLoans(customerId?: string) {
  return useQuery({
    queryKey: ['loans', 'customer', customerId],
    queryFn: async () => {
      if (!customerId) return []
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Loan[]
    },
    enabled: !!customerId,
  })
}

export function useCustomerPaymentsForLoan(customerId?: string, loanId?: string) {
  return useQuery({
    queryKey: ['payments', 'customer', customerId, loanId],
    queryFn: async () => {
      if (!customerId) return []
      let query = supabase
        .from('emi_payments')
        .select('*')
        .eq('customer_id', customerId)
      if (loanId) query = (query as any).eq('loan_id', loanId)
      const { data, error } = await (query as any).order('payment_date', { ascending: false })
      if (error) throw error
      return data as EMIPayment[]
    },
    enabled: !!customerId,
  })
}

export function useCustomerIncomeRecords(customerId?: string, loanId?: string) {
  return useQuery({
    queryKey: ['income', 'customer', customerId, loanId],
    queryFn: async () => {
      if (!customerId) return []
      let query = supabase
        .from('income')
        .select('*')
        .eq('customer_id', customerId)
      if (loanId) query = (query as any).eq('loan_id', loanId)
      const { data, error } = await (query as any).order('date', { ascending: false })
      if (error) throw error
      return data as any[]
    },
    enabled: !!customerId,
  })
}

// ─── Bank Account Hooks ───────────────────────────────────────────────────────

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as import('@/types').BankAccount[]
    },
  })
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (acct: Omit<import('@/types').BankAccount, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      // 1. Get the currently authenticated Supabase user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('No authenticated user session found. Please log out and sign in again.')
      }

      // 2. Include the user ID in the INSERT payload
      const payload = {
        ...acct,
        user_id: user.id,
      }

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] })
    },
  })
}

// ─── Transaction (Ledger) Hooks ───────────────────────────────────────────────

export function useTransactions(filters?: {
  txn_type?: string
  bank_account_id?: string
  date_from?: string
  date_to?: string
}) {
  const branchFilter = useBranchFilter()
  return useQuery({
    queryKey: ['transactions', filters, branchFilter],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, bank_accounts(name), customers(name, branch), loans(loan_number, branch)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (filters?.txn_type) query = (query as any).eq('txn_type', filters.txn_type)
      if (filters?.bank_account_id) query = (query as any).eq('bank_account_id', filters.bank_account_id)
      if (filters?.date_from) query = (query as any).gte('date', filters.date_from)
      if (filters?.date_to) query = (query as any).lte('date', filters.date_to)
      const { data, error } = await query
      if (error) throw error
      let results = data.map((t: any) => ({
        ...t,
        bank_account_name: t.bank_accounts?.name || '',
        customer_name: t.customers?.name || '',
        loan_number: t.loans?.loan_number || '',
        _loan_branch: t.loans?.branch || null,
        _customer_branch: t.customers?.branch || null,
      })) as (import('@/types').Transaction & { _loan_branch?: string | null; _customer_branch?: string | null })[]
      // Client-side branch filter: show transactions for this branch's loans/customers
      if (branchFilter) {
        results = results.filter(t => t._loan_branch === branchFilter || t._customer_branch === branchFilter)
      }
      return results
    },
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (txn: Omit<import('@/types').Transaction, 'id' | 'txn_id' | 'created_at' | 'updated_at' | 'bank_account_name' | 'customer_name' | 'loan_number'>) => {
      const txn_id = await generateNextTxnId()
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...txn, txn_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

// ─── Employee Management Hooks ────────────────────────────────────────────────

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as User[]
    },
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      email: string
      full_name: string
      employee_id: string
      role: string
      password: string
    }) => {
      const { data, error } = await supabase.rpc('create_employee_user', {
        p_email: payload.email,
        p_full_name: payload.full_name,
        p_employee_id: payload.employee_id,
        p_role: payload.role,
        p_password: payload.password,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      user_id: string
      full_name?: string
      role?: string
      is_active?: boolean
    }) => {
      const { data, error } = await supabase.rpc('update_employee_user', {
        p_user_id: payload.user_id,
        p_full_name: payload.full_name ?? null,
        p_role: payload.role ?? null,
        p_is_active: payload.is_active ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useEmployeeSessions(userId?: string) {
  return useQuery({
    queryKey: ['employee_sessions', userId],
    queryFn: async () => {
      let query = supabase
        .from('employee_sessions')
        .select('*')
        .order('login_at', { ascending: false })
        .limit(50)
      if (userId) query = (query as any).eq('user_id', userId)
      const { data, error } = await query
      if (error) throw error
      return data as any[]
    },
    enabled: true,
    refetchInterval: 30000, // refresh every 30s
  })
}

export function useAdminPasswordChange() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      return { success: true }
    },
  })
}

export function useSendPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings/authentication`,
      })
      if (error) throw error
      return { success: true }
    },
  })
}

// ─── Lead: Approve Only (no customer created) ────────────────────────────────

export function useApproveLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: Lead | { lead: Lead; branch?: string | null }) => {
      const lead = 'id' in args ? args : args.lead
      const branch = 'id' in args ? null : (args.branch || null)

      // 1. Generate customer_id like CUS001
      const customer_id = await generateNextCustomerId()
      const now = new Date().toISOString()

      const payload = {
        customer_id,
        name: lead.name,
        mobile: lead.phone,
        whatsapp: lead.phone,
        email: lead.email || null,
        address: '',
        city: '',
        district: null,
        state: '',
        pincode: '',
        address_type: null,
        aadhaar: '',
        pan: '',
        kyc_status: 'pending' as const,
        kyc_verified_date: null,
        occupation: null,
        monthly_income: null,
        income_source: null,
        cibil_score: null,
        cibil_score_date: null,
        customer_type: 'Individual',
        date_of_birth: null,
        gender: null,
        customer_segment: null,
        customer_category: 'New',
        branch: branch || null,
        lead_id: lead.id,
        status: 'draft' as const,
        sync_status: 'pending',
        created_at: now,
        updated_at: now,
      }

      // 2. Insert customer draft profile
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert([payload])
        .select()
        .single()
      if (custErr) throw custErr

      // 3. Update the lead application to Converted
      const { error: leadErr } = await supabase
        .from('applications')
        .update({
          status: 'Converted',
          customer_conversion_status: 'Converted',
          approved_at: now,
          customer_linked_id: customer.customer_id,
        })
        .eq('id', lead.id)
      if (leadErr) throw leadErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['approvedLeads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

// ─── Get only Approved + Not Converted leads (for customer creation dropdown) ─

export function useApprovedLeads() {
  return useQuery({
    queryKey: ['approvedLeads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('status', 'Approved')
        .eq('customer_conversion_status', 'Not Created')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Lead[]
    },
    staleTime: 15_000,
  })
}

// ─── Create Active Customer ───────────────────────────────────────────────────

export function useCreateNewCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (form: NewCustomerForm) => {
      // Generate customer_id like CUS001
      const customer_id = await generateNextCustomerId()

      const payload = {
        customer_id,
        name: form.full_name,
        mobile: form.mobile,
        whatsapp: form.mobile,
        email: form.email || null,
        address: form.current_address,
        city: form.city,
        district: form.district || null,
        state: form.state,
        pincode: form.pin_code,
        address_type: form.address_type || null,
        aadhaar: form.aadhaar_kyc_id,
        pan: form.pan,
        kyc_status: 'verified' as const,
        kyc_verified_date: form.verification_date || new Date().toISOString().split('T')[0],
        occupation: form.occupation_business,
        monthly_income: form.income ? parseFloat(form.income) : null,
        income_source: form.income_source || null,
        cibil_score: form.cibil_score ? parseInt(form.cibil_score, 10) : null,
        cibil_score_date: form.cibil_score_date || null,
        customer_type: form.customer_type || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        customer_segment: form.customer_segment || null,
        customer_category: form.customer_category || null,
        branch: form.branch || null,
        lead_id: form.lead_id || null,
        status: 'active' as const,
        sync_status: 'synced',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert([payload])
        .select()
        .single()
      if (custErr) throw custErr

      // If created from an approved lead, mark it as Converted
      if (form.lead_id) {
        const { error: leadErr } = await supabase
          .from('applications')
          .update({
            customer_conversion_status: 'Converted',
            customer_linked_id: customer.customer_id,
            status: 'Converted',
          })
          .eq('id', form.lead_id)
        if (leadErr) console.error('[useCreateNewCustomer] Failed to update lead:', leadErr)
      }

      return customer as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['approvedLeads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

// ─── Save Draft Customer (partial — does NOT require all fields) ──────────────

export function useSaveDraftCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (form: Partial<NewCustomerForm> & { full_name: string; mobile: string }) => {
      const customer_id = await generateNextCustomerId()
      const now = new Date().toISOString()

      const payload: Record<string, any> = {
        customer_id,
        name: form.full_name,
        mobile: form.mobile,
        whatsapp: form.mobile,
        email: form.email || null,
        address: form.current_address || '',
        city: form.city || '',
        district: form.district || null,
        state: form.state || '',
        pincode: form.pin_code || '',
        address_type: form.address_type || null,
        aadhaar: form.aadhaar_kyc_id || '',
        pan: form.pan || '',
        kyc_status: 'pending' as const,
        kyc_verified_date: form.verification_date || null,
        occupation: form.occupation_business || null,
        monthly_income: form.income ? parseFloat(form.income) : null,
        income_source: form.income_source || null,
        cibil_score: form.cibil_score ? parseInt(form.cibil_score, 10) : null,
        cibil_score_date: form.cibil_score_date || null,
        customer_type: form.customer_type || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        customer_segment: form.customer_segment || null,
        customer_category: form.customer_category || null,
        branch: form.branch || null,
        lead_id: form.lead_id || null,
        status: 'draft' as const,
        sync_status: 'pending',
        created_at: now,
        updated_at: now,
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([payload])
        .select()
        .single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// ─── Update Draft Customer (finalize or re-save draft) ────────────────────────

export function useUpdateDraftCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      form,
      finalize,
    }: {
      id: string
      form: Partial<NewCustomerForm>
      finalize: boolean // true = Create Customer (active); false = re-save draft
    }) => {
      const kycStatusValue = finalize ? ('verified' as const) : ('pending' as const)

      const payload: Record<string, any> = {
        name: form.full_name,
        mobile: form.mobile,
        whatsapp: form.mobile,
        email: form.email || null,
        address: form.current_address,
        city: form.city,
        district: form.district || null,
        state: form.state,
        pincode: form.pin_code,
        address_type: form.address_type || null,
        aadhaar: form.aadhaar_kyc_id,
        pan: form.pan,
        kyc_status: kycStatusValue,
        kyc_verified_date: form.verification_date || (finalize ? new Date().toISOString().split('T')[0] : null),
        occupation: form.occupation_business,
        monthly_income: form.income ? parseFloat(form.income) : null,
        income_source: form.income_source || null,
        cibil_score: form.cibil_score ? parseInt(form.cibil_score, 10) : null,
        cibil_score_date: form.cibil_score_date || null,
        customer_type: form.customer_type || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        customer_segment: form.customer_segment || null,
        customer_category: form.customer_category || null,
        branch: form.branch || null,
        status: finalize ? ('active' as const) : ('draft' as const),
        updated_at: new Date().toISOString(),
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      // If finalizing and the customer has a lead_id, mark lead as Converted
      if (finalize && form.lead_id) {
        const { error: leadErr } = await supabase
          .from('applications')
          .update({
            customer_conversion_status: 'Converted',
            customer_linked_id: customer.customer_id,
            status: 'Converted',
          })
          .eq('id', form.lead_id)
        if (leadErr) console.error('[useUpdateDraftCustomer] Failed to update lead:', leadErr)
      }

      return customer as Customer
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id] })
      if (variables.finalize) {
        queryClient.invalidateQueries({ queryKey: ['leads'] })
        queryClient.invalidateQueries({ queryKey: ['approvedLeads'] })
        queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
      }
    },
  })
}
