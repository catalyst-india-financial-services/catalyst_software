import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import type { Customer, Loan, EMIPayment, EMISchedule, Income, Expense, User, Lead, LeadFollowup } from '@/types'
import { calculateEMI, generateEMISchedule } from '@/utils'
import dayjs from 'dayjs'
import { customerProfileService } from '@/services/customerProfileService'
import type { CustomerSegmentOption } from '@/services/customerProfileService'

// ─── Customer Hooks ───────────────────────────────────────────────────────────

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Customer[]
    },
  })
}

export function useCustomer(id?: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as Customer | null
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (customerData: Partial<Customer>) => {
      // Generate a customer_id like CUS001
      const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true })
      const prefix = 'CUS'
      const index = (count || 0) + 1
      const customer_id = `${prefix}${String(index).padStart(3, '0')}`

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
      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
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
  return useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map((l: any) => ({
        ...l,
        customer_name: l.customers?.name || 'Unknown',
      })) as Loan[]
    },
  })
}

export function useLoan(id?: string) {
  return useQuery({
    queryKey: ['loans', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('loans')
        .select('*, customers(name)')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        ...data,
        customer_name: (data as any).customers?.name || 'Unknown',
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
      loan_amount: number
      interest_rate: number
      interest_type: 'flat' | 'reducing'
      duration_months: number
      processing_fee: number
      loan_date: string
    }) => {
      const { count } = await supabase.from('loans').select('*', { count: 'exact', head: true })
      const loan_number = `LN${dayjs().format('YYYY')}${String((count || 0) + 1).padStart(3, '0')}`

      const emi_amount = calculateEMI(
        loanData.loan_amount,
        loanData.interest_rate,
        loanData.duration_months,
        loanData.interest_type
      )
      const total_interest = emi_amount * loanData.duration_months - loanData.loan_amount
      const disbursed_amount = loanData.loan_amount - loanData.processing_fee

      const newLoan = {
        loan_number,
        customer_id: loanData.customer_id,
        loan_type: loanData.loan_type,
        loan_amount: loanData.loan_amount,
        interest_rate: loanData.interest_rate,
        interest_type: loanData.interest_type,
        duration_months: loanData.duration_months,
        processing_fee: loanData.processing_fee,
        loan_date: loanData.loan_date,
        emi_amount,
        emi_count: loanData.duration_months,
        remaining_emi: loanData.duration_months,
        remaining_balance: loanData.loan_amount,
        total_interest,
        disbursed_amount,
        status: 'active' as const,
      }

      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .insert([newLoan])
        .select()
        .single()
      if (loanError) throw loanError

      // Generate schedule
      const schedule = generateEMISchedule(
        loanData.loan_amount,
        loanData.interest_rate,
        loanData.duration_months,
        loanData.loan_date,
        loanData.interest_type
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

      const { error: scheduleError } = await supabase.from('emi_schedule').insert(scheduleData)
      if (scheduleError) throw scheduleError

      return loan as Loan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })
}

// ─── EMI Payment Hooks ─────────────────────────────────────────────────────────

export function usePayments(loanId?: string) {
  return useQuery({
    queryKey: ['payments', loanId],
    queryFn: async () => {
      let query = supabase.from('emi_payments').select('*, customers(name), loans(loan_number)')
      if (loanId) {
        query = query.eq('loan_id', loanId)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return data.map((p: any) => ({
        ...p,
        customer_name: p.customers?.name || 'Unknown',
        loan_number: p.loans?.loan_number || 'Unknown',
      })) as (EMIPayment & { customer_name: string; loan_number: string })[]
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
  return useQuery({
    queryKey: ['income'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('income')
        .select('*, customers(name), loans(loan_number)')
        .order('date', { ascending: false })
      if (error) throw error
      return data.map((i: any) => ({
        ...i,
        customer_name: i.customers?.name || 'System',
        loan_number: i.loans?.loan_number || 'N/A',
      })) as (Income & { customer_name: string; loan_number: string })[]
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
  return useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      // 1. Total Customers Count (HEAD request)
      const { count: total_customers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      // 2. Loans Status & Type (only select required columns)
      const { data: loansSummary = [] } = await supabase
        .from('loans')
        .select('loan_type, status')
      const safeLoansSummary = loansSummary || []

      const active_loans = safeLoansSummary.filter((l) => l.status === 'active').length
      const closed_loans = safeLoansSummary.filter((l) => l.status === 'closed').length
      const overdue_loans = safeLoansSummary.filter((l) => l.status === 'overdue').length

      // 3. Todays collection and total interest earned
      const todayStr = dayjs().format('YYYY-MM-DD')
      const [
        { data: todaysPayments = [] },
        { data: allPaymentsInterest = [] }
      ] = await Promise.all([
        supabase.from('emi_payments').select('amount_paid').eq('payment_date', todayStr),
        supabase.from('emi_payments').select('interest_paid')
      ])

      const todays_collection = (todaysPayments || []).reduce((sum, p) => sum + Number(p.amount_paid), 0)
      const interest_earned = (allPaymentsInterest || []).reduce((sum, p) => sum + Number(p.interest_paid), 0)

      // 4. Pending EMI count (HEAD request)
      const { count: pending_emi } = await supabase
        .from('emi_schedule')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // 5. Monthly Income & Expense (filter by current month)
      const startOfMonthStr = dayjs().startOf('month').format('YYYY-MM-DD')
      const [
        { data: thisMonthIncome = [] },
        { data: thisMonthExpense = [] }
      ] = await Promise.all([
        supabase.from('income').select('amount').gte('date', startOfMonthStr),
        supabase.from('expenses').select('amount').gte('date', startOfMonthStr)
      ])

      const monthly_income = (thisMonthIncome || []).reduce((sum, i) => sum + Number(i.amount), 0)
      const monthly_expense = (thisMonthExpense || []).reduce((sum, e) => sum + Number(e.amount), 0)
      const net_profit = monthly_income - monthly_expense

      // 6. Collection Rate (HEAD requests)
      const [
        { count: totalEMIsCount },
        { count: paidEMIsCount }
      ] = await Promise.all([
        supabase.from('emi_schedule').select('*', { count: 'exact', head: true }),
        supabase.from('emi_schedule').select('*', { count: 'exact', head: true }).eq('status', 'paid')
      ])

      const totalEMIs = totalEMIsCount || 0
      const paidEMIs = paidEMIsCount || 0
      const collection_rate = totalEMIs > 0 ? Math.round((paidEMIs / totalEMIs) * 1000) / 10 : 100

      // 7. Period Payments, Income, & Expenses for Charts (filter by last 7 months)
      const startOfPeriodStr = dayjs().subtract(6, 'month').startOf('month').format('YYYY-MM-DD')
      const [
        { data: periodPayments = [] },
        { data: periodIncome = [] },
        { data: periodExpenses = [] },
      ] = await Promise.all([
        supabase.from('emi_payments').select('amount_paid, payment_date').gte('payment_date', startOfPeriodStr),
        supabase.from('income').select('amount, date').gte('date', startOfPeriodStr),
        supabase.from('expenses').select('amount, date').gte('date', startOfPeriodStr),
      ])

      const safePeriodPayments = periodPayments || []
      const safePeriodIncome = periodIncome || []
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
        .select('id, emi_amount, due_date, status, loans(loan_number, customers(name))')
        .or('status.eq.pending,status.eq.overdue')
        .order('due_date', { ascending: true })
        .limit(5)

      const upcomingDue = (upcomingDueData || []).map((s: any) => {
        const days_overdue = dayjs().diff(dayjs(s.due_date), 'day')
        return {
          id: s.id,
          name: s.loans?.customers?.name || 'Unknown',
          loan_number: s.loans?.loan_number || 'Unknown',
          amount: Number(s.emi_amount),
          due_date: s.due_date,
          days_overdue: days_overdue > 0 ? days_overdue : 0,
        }
      })

      // 10. Recent Activity Log with selective query & database joins
      const { data: recentPayments = [] } = await supabase
        .from('emi_payments')
        .select('id, amount_paid, collected_by, created_at, payment_date, customers(name), loans(loan_number)')
        .order('created_at', { ascending: false })
        .limit(5)

      const activityLog = (recentPayments || []).map((p: any) => ({
        id: `p-${p.id}`,
        action: 'EMI Collected',
        module: 'EMI',
        user: p.collected_by || 'Admin',
        details: `₹${Number(p.amount_paid).toLocaleString('en-IN')} from ${
          p.customers?.name || 'Customer'
        } (${p.loans?.loan_number})`,
        time: p.created_at || p.payment_date,
        type: 'success',
      }))

      activityLog.sort((a, b) => dayjs(b.time).unix() - dayjs(a.time).unix())

      return {
        stats: {
          total_customers: total_customers || 0,
          active_loans,
          closed_loans,
          todays_collection,
          pending_emi: pending_emi || 0,
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
  return useQuery({
    queryKey: ['notificationsData'],
    queryFn: async () => {
      const [
        { data: schedule },
        { data: loans },
        { data: customers },
      ] = await Promise.all([
        supabase.from('emi_schedule').select('*').eq('status', 'pending'),
        supabase.from('loans').select('*'),
        supabase.from('customers').select('*'),
      ])

      const safeSchedule = schedule || []
      const safeLoans = loans || []
      const safeCustomers = customers || []

      const today = dayjs()
      const notifications: any[] = []

      safeSchedule.forEach((s) => {
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
    mutationFn: async ({ email, fullName }: { email: string; fullName: string }) => {
      // Find the user first
      let { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (error) throw error

      if (!user) {
        // Automatically register default user
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              email,
              full_name: fullName,
              role: 'admin',
              is_active: true,
            },
          ])
          .select()
          .single()
        if (insertError) throw insertError
        user = newUser
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)

      return user as User
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useLeads() {
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
  'Business Loan':  'business',
  'Personal Loan':  'personal',
  'Gold Loan':      'gold',
  'Home Loan':      'home',
  'Vehicle Loan':   'vehicle',
  'Education Loan': 'education',
}

export function useConvertLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lead: Lead) => {
      const loanAmount   = isNaN(Number(lead.amount)) ? 50_000 : Math.max(1000, Number(lead.amount) || 50_000)
      const interestRate = 12
      const durationMo   = 12
      const intType      = 'reducing' as const
      const procFee      = 0
      const loanType     = (PRODUCT_TO_LOAN_TYPE[lead.product] || 'personal') as Loan['loan_type']
      const loanDate     = dayjs().format('YYYY-MM-DD')

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
      const { count: custCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
      const customer_id = `CUS${String((custCount || 0) + 1).padStart(3, '0')}`

      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert([{
          customer_id,
          name:           lead.name,
          mobile:         lead.phone,
          whatsapp:       lead.phone,
          address:        'Address not provided (Converted Lead)',
          city:           'Chennai',
          state:          'Tamil Nadu',
          pincode:        '600001',
          occupation:     'Service',
          company:        'N/A',
          monthly_income: loanAmount,
          aadhaar:        '',
          pan:            '',
          status:         'active',
          kyc_status:     'verified',
          sync_status:    'synced',
        }])
        .select()
        .single()
      if (custErr) throw custErr

      // ── 3. Insert loan ────────────────────────────────────────────────────────
      const emiAmount      = calculateEMI(loanAmount, interestRate, durationMo, intType)
      const totalInterest  = Math.round(emiAmount * durationMo - loanAmount)
      const disbursed      = loanAmount - procFee

      const { count: loanCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
      const loan_number = `LN${dayjs().format('YYYY')}${String((loanCount || 0) + 1).padStart(3, '0')}`

      const { data: loan, error: loanErr } = await supabase
        .from('loans')
        .insert([{
          loan_number,
          customer_id:      customer.id,
          loan_type:        loanType,
          loan_amount:      loanAmount,
          interest_rate:    interestRate,
          interest_type:    intType,
          duration_months:  durationMo,
          processing_fee:   procFee,
          loan_date:        loanDate,
          emi_amount:       emiAmount,
          emi_count:        durationMo,
          remaining_emi:    durationMo,
          remaining_balance: loanAmount,
          total_interest:   totalInterest,
          disbursed_amount: disbursed,
          status:           'active',
          sync_status:      'synced',
        }])
        .select()
        .single()
      if (loanErr) throw loanErr

      // ── 4. Insert EMI schedule ────────────────────────────────────────────────
      const schedule = generateEMISchedule(loanAmount, interestRate, durationMo, loanDate, intType)
      const scheduleRows = schedule.map(s => ({
        loan_id:             loan.id,
        emi_number:          s.emi_number,
        due_date:            s.due_date,
        emi_amount:          s.emi_amount,
        principal:           s.principal,
        interest:            s.interest,
        outstanding_balance: s.outstanding_balance,
        status:              'pending' as const,
        paid_amount:         0,
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
          status:           'Rejected',
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
              status:           'Rejected',
              rejection_reason: reason || '',
              text:             lead.message || '',
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
            lead_id:                payload.lead_id,
            last_conversation_note: payload.last_conversation_note ?? null,
            next_followup_date:     payload.next_followup_date ?? null,
            next_followup_time:     payload.next_followup_time ?? null,
            reminder_status:        payload.reminder_status ?? 'pending',
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
          reminder_status:    'completed',
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
    mutationFn: ({ customerId, payload }: { customerId: string; payload: any }) =>
      customerProfileService.updateProfile(customerId, payload),
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
