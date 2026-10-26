import React, { useState, useMemo } from 'react'
import {
  ArrowLeft, CreditCard, TrendingUp, FileSpreadsheet, Receipt,
  Building2, Calendar, Download, Printer, RefreshCw, Search,
  Edit3, Check, Plus, Filter, Info, ShieldAlert, DollarSign,
  ChevronRight, ArrowUpDown, Sparkles, CheckCircle2
} from 'lucide-react'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button, Badge } from '@/components/ui'

interface DailyReportsReportProps {
  onBack: () => void
  initialCard?: 'emi' | 'earnings_expenses' | 'daily_master' | 'voucher'
}

type CardType = 'emi' | 'earnings_expenses' | 'daily_master' | 'voucher'

export default function DailyReportsReport({ onBack, initialCard = 'emi' }: DailyReportsReportProps) {
  const { isBranchUser, userBranch, selectedBranch: storeBranch } = useAuthStore()
  const initialBranch = (isBranchUser ? userBranch : storeBranch) || 'All Branches'
  
  // Controls & Filters
  const [activeCard, setActiveCard] = useState<CardType>(initialCard)
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch)
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [selectedFy, setSelectedFy] = useState<string>('2026-2027')
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dualViewMode, setDualViewMode] = useState<'both' | 'left' | 'right'>('both')

  // Fetch real database data from Supabase
  const { data: dbData, isLoading, refetch } = useQuery({
    queryKey: ['dailyReportsDbData', selectedBranch],
    queryFn: async () => {
      const safe = async <T,>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | []> => {
        const res = await p
        if (res.error) {
          console.warn('[DailyReports] Query error:', res.error)
          return []
        }
        return res.data || []
      }

      const [loans, emiSchedule, payments, customers, expenses, bankAccounts, transactions] = await Promise.all([
        safe(supabase.from('loans').select('*')),
        safe(supabase.from('emi_schedule').select('*').order('due_date', { ascending: true })),
        safe(supabase.from('emi_payments').select('*').order('payment_date', { ascending: false })),
        safe(supabase.from('customers').select('*')),
        safe(supabase.from('expenses').select('*').order('date', { ascending: false })),
        safe(supabase.from('bank_accounts').select('*')),
        safe(supabase.from('transactions').select('*').order('date', { ascending: false })),
      ])

      return {
        loans: (loans as any[]) || [],
        emiSchedule: (emiSchedule as any[]) || [],
        payments: (payments as any[]) || [],
        customers: (customers as any[]) || [],
        expenses: (expenses as any[]) || [],
        bankAccounts: (bankAccounts as any[]) || [],
        transactions: (transactions as any[]) || [],
      }
    },
    staleTime: 10000,
  })

  // Format INR Helper
  const formatINR = (amt: number | string | null | undefined): string => {
    if (amt === null || amt === undefined || amt === '') return ''
    const num = typeof amt === 'string' ? parseFloat(amt) : amt
    if (isNaN(num)) return ''
    return `₹ ${num.toLocaleString('en-IN')}`
  }

  // Raw number formatter for table cells
  const formatCellNum = (amt: number | string | null | undefined): string => {
    if (amt === null || amt === undefined || amt === '') return ''
    const num = typeof amt === 'string' ? parseFloat(amt) : amt
    if (isNaN(num)) return ''
    return num.toLocaleString('en-IN')
  }

  // Dynamic Branch list
  const branchList = useMemo(() => {
    const set = new Set<string>(['Namakkal', 'Aniyapuram', 'Vallipuram'])
    dbData?.loans?.forEach(l => { if (l.branch) set.add(l.branch) })
    dbData?.customers?.forEach(c => { if (c.branch) set.add(c.branch) })
    return ['All Branches', ...Array.from(set)]
  }, [dbData])

  // Map customers by ID
  const customerMap = useMemo(() => {
    const map = new Map<string, any>()
    dbData?.customers?.forEach(c => {
      map.set(c.id, c)
      if (c.customer_id) map.set(c.customer_id, c)
    })
    return map
  }, [dbData?.customers])

  // Filtered Loans based on branch
  const filteredLoans = useMemo(() => {
    const loans = dbData?.loans || []
    const norm = (s?: string | null) => (s || '').toLowerCase().replace(/\s+branch$/i, '').trim()
    const isAll = !selectedBranch || selectedBranch === 'All Branches'
    const curBranchNorm = norm(selectedBranch)
    return loans.filter(l => isAll || norm(l.branch) === curBranchNorm)
  }, [dbData?.loans, selectedBranch])

  // Filtered Payments based on branch
  const filteredPayments = useMemo(() => {
    const branchLoanIds = new Set(filteredLoans.map(l => l.id))
    const payments = dbData?.payments || []
    return payments.filter(p => branchLoanIds.has(p.loan_id))
  }, [dbData?.payments, filteredLoans])

  // Filtered Expenses based on branch
  const filteredExpenses = useMemo(() => {
    const expenses = dbData?.expenses || []
    const norm = (s?: string | null) => (s || '').toLowerCase().replace(/\s+branch$/i, '').trim()
    const isAll = !selectedBranch || selectedBranch === 'All Branches'
    const curBranchNorm = norm(selectedBranch)
    return expenses.filter(e => isAll || norm(e.branch) === curBranchNorm)
  }, [dbData?.expenses, selectedBranch])

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DATA PREPARATION FOR CARD 1: EMI (Image 1)
  // Columns: Sr No, Apr, May, June, July, August, September, October, November,
  //          December, January, February, March, Initial, Initial, Remarks
  // Rows: 1 to 40
  // ─────────────────────────────────────────────────────────────────────────────
  const months = useMemo(() => [
    'Apr', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December', 'January', 'February', 'March'
  ], [])

  // Local state for editable EMI Rows (40 rows)
  const [emiRows, setEmiRows] = useState<any[]>(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      srNo: i + 1,
      accountNo: '',
      customerName: '',
      apr: '', may: '', june: '', july: '', august: '', september: '',
      october: '', november: '', december: '', january: '', february: '', march: '',
      initial1: '',
      initial2: '',
      remarks: ''
    }))
  })

  // Populate EMI rows when dbData arrives if rows are empty
  React.useEffect(() => {
    if (filteredLoans.length > 0) {
      const monthMap: Record<number, string> = {
        3: 'apr', 4: 'may', 5: 'june', 6: 'july', 7: 'august', 8: 'september',
        9: 'october', 10: 'november', 11: 'december', 0: 'january', 1: 'february', 2: 'march'
      }

      setEmiRows(prev => {
        const updated = Array.from({ length: 40 }).map((_, i) => {
          const loan = filteredLoans[i]
          const existing = prev[i] || {}
          if (!loan) {
            return {
              srNo: i + 1,
              accountNo: existing.accountNo || '',
              customerName: existing.customerName || '',
              apr: existing.apr || '', may: existing.may || '', june: existing.june || '',
              july: existing.july || '', august: existing.august || '', september: existing.september || '',
              october: existing.october || '', november: existing.november || '', december: existing.december || '',
              january: existing.january || '', february: existing.february || '', march: existing.march || '',
              initial1: existing.initial1 || '', initial2: existing.initial2 || '', remarks: existing.remarks || ''
            }
          }

          const cust = customerMap.get(loan.customer_id)
          const custName = cust?.name || loan.customer_name || `Cust #${loan.loan_number}`

          // Collect actual payments for this loan by month
          const loanPayments = (filteredPayments || []).filter(p => p.loan_id === loan.id)
          const paidPerMonth: Record<string, number> = {}
          loanPayments.forEach(p => {
            const dt = p.payment_date || p.created_at
            if (dt) {
              const m = dayjs(dt).month()
              const key = monthMap[m]
              if (key) {
                paidPerMonth[key] = (paidPerMonth[key] || 0) + Number(p.amount || 0)
              }
            }
          })

          return {
            srNo: i + 1,
            accountNo: loan.loan_number || '',
            customerName: custName,
            apr: existing.apr || (paidPerMonth['apr'] ? paidPerMonth['apr'].toString() : ''),
            may: existing.may || (paidPerMonth['may'] ? paidPerMonth['may'].toString() : ''),
            june: existing.june || (paidPerMonth['june'] ? paidPerMonth['june'].toString() : ''),
            july: existing.july || (paidPerMonth['july'] ? paidPerMonth['july'].toString() : ''),
            august: existing.august || (paidPerMonth['august'] ? paidPerMonth['august'].toString() : ''),
            september: existing.september || (paidPerMonth['september'] ? paidPerMonth['september'].toString() : ''),
            october: existing.october || (paidPerMonth['october'] ? paidPerMonth['october'].toString() : ''),
            november: existing.november || (paidPerMonth['november'] ? paidPerMonth['november'].toString() : ''),
            december: existing.december || (paidPerMonth['december'] ? paidPerMonth['december'].toString() : ''),
            january: existing.january || (paidPerMonth['january'] ? paidPerMonth['january'].toString() : ''),
            february: existing.february || (paidPerMonth['february'] ? paidPerMonth['february'].toString() : ''),
            march: existing.march || (paidPerMonth['march'] ? paidPerMonth['march'].toString() : ''),
            initial1: existing.initial1 || '',
            initial2: existing.initial2 || '',
            remarks: existing.remarks || loan.status || ''
          }
        })
        return updated
      })
    }
  }, [filteredLoans, filteredPayments, customerMap])

  // Calculate monthly totals for EMI sheet
  const emiTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    months.forEach(m => {
      const key = m.toLowerCase()
      totals[key] = emiRows.reduce((acc, row) => {
        const val = parseFloat(row[key]) || 0
        return acc + val
      }, 0)
    })
    return totals
  }, [emiRows, months])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DATA PREPARATION FOR CARD 2: EARNINGS & EXPENSES (Image 2)
  // Left Table: Sr No, Loan Number, Particulars, Interest, Principal, Total, Cumulative
  // Right Table: Sr No, Loan Number, Particulars, Interest, Principal, Total, Expenses, Cumulative
  // Both have Row 91 Total + Rows 92-98 Reconciliation Box
  // ─────────────────────────────────────────────────────────────────────────────
  const [leftLedgerRows, setLeftLedgerRows] = useState<any[]>(() => {
    return Array.from({ length: 90 }).map((_, i) => ({
      srNo: i + 1,
      loanNumber: '',
      particulars: '',
      interest: '',
      principal: '',
      total: '',
      cumulative: ''
    }))
  })

  const [rightLedgerRows, setRightLedgerRows] = useState<any[]>(() => {
    return Array.from({ length: 90 }).map((_, i) => ({
      srNo: i + 1,
      loanNumber: '',
      particulars: '',
      interest: '',
      principal: '',
      total: '',
      expenses: '',
      cumulative: ''
    }))
  })

  // Populate Earnings & Expenses rows from filtered payments and expenses if available
  React.useEffect(() => {
    setLeftLedgerRows(prev => {
      let runLeft = 0
      return prev.map((row, i) => {
        const pmt = filteredPayments[i]
        if (pmt) {
          const loan = filteredLoans.find(l => l.id === pmt.loan_id)
          const cust = loan ? customerMap.get(loan.customer_id) : null
          const interest = Math.round(Number(pmt.interest_amount || 0))
          const principal = Math.round(Number(pmt.principal_amount || (interest > 0 ? (Number(pmt.amount || 0) - interest) : Number(pmt.amount || 0))))
          const total = Math.round(Number(pmt.amount || (interest + principal)))
          if (total > 0) runLeft += total
          return {
            ...row,
            loanNumber: loan?.loan_number || '',
            particulars: cust?.name || loan?.customer_name || 'Collection',
            interest: interest > 0 ? interest.toString() : '',
            principal: principal > 0 ? principal.toString() : '',
            total: total > 0 ? total.toString() : '',
            cumulative: runLeft > 0 ? runLeft.toString() : ''
          }
        }
        if (row.total) {
          runLeft += parseFloat(row.total) || 0
          return { ...row, cumulative: runLeft > 0 ? runLeft.toString() : '' }
        }
        return row
      })
    })

    setRightLedgerRows(prev => {
      let runRight = 0
      return prev.map((row, i) => {
        const exp = filteredExpenses[i]
        if (exp) {
          const expAmt = Math.round(Number(exp.amount || 0))
          if (expAmt > 0) runRight += expAmt
          return {
            ...row,
            loanNumber: exp.category ? exp.category.toUpperCase().slice(0, 8) : '',
            particulars: exp.description || exp.category || 'Expense',
            interest: '',
            principal: '',
            total: expAmt > 0 ? expAmt.toString() : '',
            expenses: expAmt > 0 ? expAmt.toString() : '',
            cumulative: runRight > 0 ? runRight.toString() : ''
          }
        }
        if (row.total || row.expenses) {
          runRight += parseFloat(row.total || row.expenses) || 0
          return { ...row, cumulative: runRight > 0 ? runRight.toString() : '' }
        }
        return row
      })
    })
  }, [filteredPayments, filteredLoans, filteredExpenses, customerMap])

  // Calculations for Earnings & Expenses summary boxes
  const leftTotals = useMemo(() => {
    let intSum = 0, prinSum = 0, totSum = 0
    leftLedgerRows.forEach(r => {
      intSum += parseFloat(r.interest) || 0
      prinSum += parseFloat(r.principal) || 0
      totSum += parseFloat(r.total) || 0
    })
    return { interest: intSum, principal: prinSum, total: totSum, cumulative: totSum }
  }, [leftLedgerRows])

  const rightTotals = useMemo(() => {
    let intSum = 0, prinSum = 0, totSum = 0, expSum = 0
    rightLedgerRows.forEach(r => {
      intSum += parseFloat(r.interest) || 0
      prinSum += parseFloat(r.principal) || 0
      totSum += parseFloat(r.total) || 0
      expSum += parseFloat(r.expenses) || 0
    })
    return { interest: intSum, principal: prinSum, total: totSum, expenses: expSum, cumulative: totSum }
  }, [rightLedgerRows])

  // Overall Reconciliation Values
  const reconData = useMemo(() => {
    const rawOutstanding = filteredLoans.reduce((acc, l) => acc + Number(l.remaining_balance || l.loan_amount || 0), 0)
    const rawDisbursement = filteredLoans.reduce((acc, l) => acc + Number(l.disbursed_amount || 0), 0)
    const rawReceipts = leftTotals.total || 0
    const rawExpenses = rightTotals.expenses || 0
    const openingOs = rawOutstanding
    const closingOs = Math.max(0, openingOs + rawDisbursement - rawReceipts)
    return {
      openingOs,
      totalReceipts: rawReceipts,
      disbursement: rawDisbursement,
      expenses: rawExpenses,
      closingOs,
      maker: '',
      checker: '',
      date: dayjs(selectedDate).format('DD/MM/YYYY')
    }
  }, [filteredLoans, leftTotals, rightTotals, selectedDate])

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. DATA PREPARATION FOR CARD 3: DAILY MASTER (Image 3)
  // Headers: Sr No, Date, Opening O/s, Disbursement, Collection, Interest, Expenses,
  //          Closing O/s, Cash in Hand, Bank Balance, I wish, Deposits, Net O/s, Net,
  //          Initial, Initial
  // Rows: 1 to 55, Row 56 Closing Figures
  // ─────────────────────────────────────────────────────────────────────────────
  const [masterRows, setMasterRows] = useState<any[]>(() => {
    return Array.from({ length: 55 }).map((_, i) => ({
      srNo: i + 1,
      date: dayjs().subtract(55 - i, 'day').format('DD/MM/YYYY'),
      openingOs: '',
      disbursement: '',
      collection: '',
      interest: '',
      expenses: '',
      closingOs: '',
      cashInHand: '',
      bankBalance: '',
      iWish: '',
      deposits: '',
      netOs: '',
      net: '',
      initial1: '',
      initial2: ''
    }))
  })

  // Populate Daily Master rows based on real movements
  React.useEffect(() => {
    // Group payments by date
    const paymentsByDate = new Map<string, { coll: number; int: number }>()
    filteredPayments.forEach(p => {
      const dtStr = p.payment_date ? dayjs(p.payment_date).format('YYYY-MM-DD') : (p.created_at ? dayjs(p.created_at).format('YYYY-MM-DD') : null)
      if (dtStr) {
        const cur = paymentsByDate.get(dtStr) || { coll: 0, int: 0 }
        cur.coll += Number(p.amount || 0)
        cur.int += Number(p.interest_amount || 0)
        paymentsByDate.set(dtStr, cur)
      }
    })

    // Group disbursements by date
    const disbByDate = new Map<string, number>()
    filteredLoans.forEach(l => {
      const dtStr = l.disbursal_date ? dayjs(l.disbursal_date).format('YYYY-MM-DD') : (l.created_at ? dayjs(l.created_at).format('YYYY-MM-DD') : null)
      if (dtStr) {
        disbByDate.set(dtStr, (disbByDate.get(dtStr) || 0) + Number(l.disbursed_amount || l.loan_amount || 0))
      }
    })

    // Group expenses by date
    const expByDate = new Map<string, number>()
    filteredExpenses.forEach(e => {
      const dtStr = e.date ? dayjs(e.date).format('YYYY-MM-DD') : (e.expense_date ? dayjs(e.expense_date).format('YYYY-MM-DD') : (e.created_at ? dayjs(e.created_at).format('YYYY-MM-DD') : null))
      if (dtStr) {
        expByDate.set(dtStr, (expByDate.get(dtStr) || 0) + Number(e.amount || 0))
      }
    })

    const updated = Array.from({ length: 55 }).map((_, i) => {
      const dt = dayjs(selectedDate).subtract(54 - i, 'day')
      const dtStr = dt.format('YYYY-MM-DD')

      const pmt = paymentsByDate.get(dtStr)
      const disb = disbByDate.get(dtStr) || 0
      const coll = pmt?.coll || 0
      const interest = pmt?.int || 0
      const exp = expByDate.get(dtStr) || 0

      return {
        srNo: i + 1,
        date: dt.format('DD/MM/YYYY'),
        openingOs: '',
        disbursement: disb > 0 ? disb.toString() : '',
        collection: coll > 0 ? coll.toString() : '',
        interest: interest > 0 ? interest.toString() : '',
        expenses: exp > 0 ? exp.toString() : '',
        closingOs: '',
        cashInHand: '',
        bankBalance: '',
        iWish: '',
        deposits: '',
        netOs: '',
        net: '',
        initial1: '',
        initial2: ''
      }
    })
    setMasterRows(updated)
  }, [selectedDate, filteredLoans, filteredPayments, filteredExpenses])

  // Closing Figures (Row 56) calculation
  const masterClosingFigures = useMemo(() => {
    let totDisb = 0, totColl = 0, totInt = 0, totExp = 0, totDep = 0, totIWish = 0
    masterRows.forEach(r => {
      totDisb += parseFloat(r.disbursement) || 0
      totColl += parseFloat(r.collection) || 0
      totInt += parseFloat(r.interest) || 0
      totExp += parseFloat(r.expenses) || 0
      totDep += parseFloat(r.deposits) || 0
      totIWish += parseFloat(r.iWish) || 0
    })

    const lastRow = masterRows[masterRows.length - 1] || {}
    return {
      openingOs: masterRows[0]?.openingOs || '',
      disbursement: totDisb > 0 ? totDisb.toString() : '',
      collection: totColl > 0 ? totColl.toString() : '',
      interest: totInt > 0 ? totInt.toString() : '',
      expenses: totExp > 0 ? totExp.toString() : '',
      closingOs: lastRow.closingOs || '',
      cashInHand: lastRow.cashInHand || '',
      bankBalance: lastRow.bankBalance || '',
      iWish: totIWish > 0 ? totIWish.toString() : '',
      deposits: totDep > 0 ? totDep.toString() : '',
      netOs: lastRow.netOs || '',
      net: lastRow.net || ''
    }
  }, [masterRows])

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DATA PREPARATION FOR CARD 4: VOUCHER (Image 4)
  // Top: Branch | Actual | Date
  // Table: Sr No 1-16, Name, Loan No, Particulars, Debit, Credit, Initial, Initial
  // Row 17: Total, Debit sum, Credit sum, Net
  // Section A: Particulars | Opening Balance | Closing Balance | Inc/Dec
  //            (Cash, Bank Balance, O/s, Expenses, Net Inc/Dec)
  // Section B: SMA | SMA-0 | SMA-1 | SMA-2 | NPA
  //            (No, Amt)
  // ─────────────────────────────────────────────────────────────────────────────
  const [voucherRows, setVoucherRows] = useState<any[]>(() => {
    return Array.from({ length: 16 }).map((_, i) => ({
      srNo: i + 1,
      name: '',
      loanNo: '',
      particulars: '',
      debit: '',
      credit: '',
      initial1: '',
      initial2: ''
    }))
  })

  // Dynamic SMA & Overdue calculations from live schedules
  const smaAnalysis = useMemo(() => {
    const schedules = dbData?.emiSchedule || []
    const loans = filteredLoans
    const branchLoanIds = new Set(loans.map(l => l.id))
    const today = dayjs(selectedDate)

    let sma0Count = 0, sma0Amt = 0
    let sma1Count = 0, sma1Amt = 0
    let sma2Count = 0, sma2Amt = 0
    let npaCount = 0, npaAmt = 0

    const overdueByLoan = new Map<string, { maxDays: number; unpaid: number }>()

    schedules.forEach(s => {
      if (!branchLoanIds.has(s.loan_id)) return
      if (!s.due_date || s.status === 'paid') return
      const due = dayjs(s.due_date)
      if (due.isBefore(today)) {
        const days = today.diff(due, 'day')
        const unpaid = Number(s.unpaid_amount || s.amount || 0)
        const cur = overdueByLoan.get(s.loan_id) || { maxDays: 0, unpaid: 0 }
        overdueByLoan.set(s.loan_id, {
          maxDays: Math.max(cur.maxDays, days),
          unpaid: cur.unpaid + unpaid
        })
      }
    })

    overdueByLoan.forEach(({ maxDays, unpaid }) => {
      if (maxDays >= 1 && maxDays <= 30) {
        sma0Count++
        sma0Amt += unpaid
      } else if (maxDays >= 31 && maxDays <= 60) {
        sma1Count++
        sma1Amt += unpaid
      } else if (maxDays >= 61 && maxDays <= 90) {
        sma2Count++
        sma2Amt += unpaid
      } else if (maxDays > 90) {
        npaCount++
        npaAmt += unpaid
      }
    })

    return {
      sma0: { no: sma0Count, amt: sma0Amt },
      sma1: { no: sma1Count, amt: sma1Amt },
      sma2: { no: sma2Count, amt: sma2Amt },
      npa: { no: npaCount, amt: npaAmt }
    }
  }, [dbData?.emiSchedule, filteredLoans, selectedDate])

  // Populate Voucher rows from real payments & expenses if available
  React.useEffect(() => {
    setVoucherRows(prev => {
      return prev.map((row, i) => {
        if (i < 8 && filteredPayments[i]) {
          const pmt = filteredPayments[i]
          const loan = filteredLoans.find(l => l.id === pmt.loan_id)
          const cust = loan ? customerMap.get(loan.customer_id) : null
          const amt = Math.round(Number(pmt.amount || 0))
          return {
            ...row,
            name: cust?.name || loan?.customer_name || 'Customer',
            loanNo: loan?.loan_number || '',
            particulars: 'EMI Collection / Cash Receipt',
            debit: '',
            credit: amt > 0 ? amt.toString() : '',
            initial1: '',
            initial2: ''
          }
        } else if (i >= 8 && i < 16 && filteredExpenses[i - 8]) {
          const exp = filteredExpenses[i - 8]
          const amt = Math.round(Number(exp.amount || 0))
          return {
            ...row,
            name: exp.vendor_name || 'Branch Expense',
            loanNo: exp.category ? exp.category.toUpperCase().slice(0, 8) : '',
            particulars: exp.description || exp.category || 'Office Expense',
            debit: amt > 0 ? amt.toString() : '',
            credit: '',
            initial1: '',
            initial2: ''
          }
        }
        return row
      })
    })
  }, [filteredPayments, filteredExpenses, filteredLoans, customerMap])

  // Voucher Totals & Net (Row 17)
  const voucherTotals = useMemo(() => {
    let totDebit = 0
    let totCredit = 0
    voucherRows.forEach(r => {
      totDebit += parseFloat(r.debit) || 0
      totCredit += parseFloat(r.credit) || 0
    })
    const net = totDebit - totCredit
    return {
      debit: totDebit,
      credit: totCredit,
      net
    }
  }, [voucherRows])

  // Voucher Balance Reconciliation Table (Cash, Bank, O/s, Expenses, Net)
  const voucherReconciliation = useMemo(() => {
    const bankAccounts = dbData?.bankAccounts || []
    const totalBankBal = bankAccounts.reduce((acc: number, b: any) => acc + Number(b.balance || b.current_balance || 0), 0)
    const totalOs = filteredLoans.reduce((acc: number, l: any) => acc + Number(l.remaining_balance || l.loan_amount || 0), 0)
    const totalExp = filteredExpenses.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0)

    const cashOpen = 0
    const cashClose = cashOpen + voucherTotals.credit - voucherTotals.debit
    const cashDiff = cashClose - cashOpen

    const bankOpen = totalBankBal
    const bankClose = bankOpen
    const bankDiff = bankClose - bankOpen

    const osOpen = totalOs
    const osClose = Math.max(0, osOpen - voucherTotals.credit)
    const osDiff = osClose - osOpen

    const expOpen = totalExp
    const expClose = expOpen + voucherTotals.debit
    const expDiff = expClose - expOpen

    const netIncDec = cashDiff + bankDiff + osDiff

    return [
      { particulars: 'Cash', open: cashOpen > 0 ? cashOpen : null, close: cashClose !== 0 ? cashClose : null, diff: cashDiff !== 0 ? cashDiff : null },
      { particulars: 'Bank Balance', open: bankOpen > 0 ? bankOpen : null, close: bankClose > 0 ? bankClose : null, diff: bankDiff !== 0 ? bankDiff : null },
      { particulars: 'O/s', open: osOpen > 0 ? osOpen : null, close: osClose > 0 ? osClose : null, diff: osDiff !== 0 ? osDiff : null },
      { particulars: 'Expenses', open: expOpen > 0 ? expOpen : null, close: expClose > 0 ? expClose : null, diff: expDiff !== 0 ? expDiff : null },
      { particulars: 'Net Inc/Dec', open: null, close: null, diff: netIncDec !== 0 ? netIncDec : null },
    ]
  }, [dbData?.bankAccounts, filteredLoans, filteredExpenses, voucherTotals])

  // ─────────────────────────────────────────────────────────────────────────────
  // CELL EDITING HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCellEdit = (
    type: 'emi' | 'left' | 'right' | 'master' | 'voucher',
    index: number,
    field: string,
    value: string
  ) => {
    if (type === 'emi') {
      setEmiRows(prev => {
        const copy = [...prev]
        copy[index] = { ...copy[index], [field]: value }
        return copy
      })
    } else if (type === 'left') {
      setLeftLedgerRows(prev => {
        const copy = [...prev]
        copy[index] = { ...copy[index], [field]: value }
        // recompute total if interest or principal changed
        if (field === 'interest' || field === 'principal') {
          const intVal = parseFloat(field === 'interest' ? value : copy[index].interest) || 0
          const prinVal = parseFloat(field === 'principal' ? value : copy[index].principal) || 0
          copy[index].total = (intVal + prinVal > 0) ? (intVal + prinVal).toString() : ''
        }
        return copy
      })
    } else if (type === 'right') {
      setRightLedgerRows(prev => {
        const copy = [...prev]
        copy[index] = { ...copy[index], [field]: value }
        return copy
      })
    } else if (type === 'master') {
      setMasterRows(prev => {
        const copy = [...prev]
        copy[index] = { ...copy[index], [field]: value }
        return copy
      })
    } else if (type === 'voucher') {
      setVoucherRows(prev => {
        const copy = [...prev]
        copy[index] = { ...copy[index], [field]: value }
        return copy
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORT TO EXCEL
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    // 1. EMI Sheet
    const emiExport = emiRows.map(r => ({
      'Sr No': r.srNo,
      'Account / Loan': r.accountNo,
      'Customer Name': r.customerName,
      'Apr': r.apr,
      'May': r.may,
      'June': r.june,
      'July': r.july,
      'August': r.august,
      'September': r.september,
      'October': r.october,
      'November': r.november,
      'December': r.december,
      'January': r.january,
      'February': r.february,
      'March': r.march,
      'Initial 1': r.initial1,
      'Initial 2': r.initial2,
      'Remarks': r.remarks
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(emiExport), '1. EMI')

    // 2. Earnings & Expenses Sheet
    const earnExpExport = leftLedgerRows.map((r, i) => {
      const right = rightLedgerRows[i] || {}
      return {
        'Sr No': r.srNo,
        'Left Loan No': r.loanNumber,
        'Left Particulars': r.particulars,
        'Left Interest': r.interest,
        'Left Principal': r.principal,
        'Left Total': r.total,
        'Left Cumulative': r.cumulative,
        '|': '|',
        'Right Loan No': right.loanNumber || '',
        'Right Particulars': right.particulars || '',
        'Right Interest': right.interest || '',
        'Right Principal': right.principal || '',
        'Right Total': right.total || '',
        'Right Expenses': right.expenses || '',
        'Right Cumulative': right.cumulative || ''
      }
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(earnExpExport), '2. Earnings & Expenses')

    // 3. Daily Master Sheet
    const masterExport = masterRows.map(r => ({
      'Sr No': r.srNo,
      'Date': r.date,
      'Opening O/s': r.openingOs,
      'Disbursement': r.disbursement,
      'Collection': r.collection,
      'Interest': r.interest,
      'Expenses': r.expenses,
      'Closing O/s': r.closingOs,
      'Cash in Hand': r.cashInHand,
      'Bank Balance': r.bankBalance,
      'I wish': r.iWish,
      'Deposits': r.deposits,
      'Net O/s': r.netOs,
      'Net': r.net,
      'Initial 1': r.initial1,
      'Initial 2': r.initial2
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(masterExport), '3. Daily Master')

    // 4. Voucher Sheet
    const voucherExport = voucherRows.map(r => ({
      'Sr No': r.srNo,
      'Name': r.name,
      'Loan No': r.loanNo,
      'Particulars': r.particulars,
      'Debit': r.debit,
      'Credit': r.credit,
      'Initial 1': r.initial1,
      'Initial 2': r.initial2
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(voucherExport), '4. Voucher')

    const fileName = `Daily_Reports_${selectedBranch.replace(/\s+/g, '_')}_${dayjs().format('YYYY-MM-DD')}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Print Handler
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="h-full w-full flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* ─────────────────────────────────────────────────────────────────────────────
          TOP CONTROL BAR & HEADER
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title and Back */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Return to Reports Center"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Daily Reports</h1>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-pink-50 text-pink-700 border-pink-200">
                  Daily Registers
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Four official daily reports: EMI Register, Earnings & Expenses, Daily Master, and Actual Voucher
              </p>
            </div>
          </div>

          {/* Action Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {branchList.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Edit Mode Toggle */}
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`text-xs gap-1.5 font-bold h-8 ${isEditMode ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-slate-700'}`}
              title="Toggle inline cell editing"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditMode ? 'Editing Active' : 'Edit Cells'}
            </Button>

            {/* Print */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1.5 font-bold text-slate-700 h-8"
              title="Print Current Sheet"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print
            </Button>

            {/* Export Excel */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs gap-1.5 font-bold h-8"
              title="Download all 4 reports in Excel"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          THE 4 CARDS (Requested by User in Exact Order)
          Card 1: EMI
          Card 2: earnings & expenses
          Card 3: daily master
          Card 4: voucher
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 flex-shrink-0 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* CARD 1: EMI */}
          <div
            onClick={() => setActiveCard('emi')}
            className={`cursor-pointer rounded-xl p-3 border transition-all text-left relative overflow-hidden group shadow-2xs ${
              activeCard === 'emi'
                ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                : 'bg-white/80 hover:bg-white border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                activeCard === 'emi' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                Card 1
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                activeCard === 'emi' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 group-hover:text-blue-500'
              }`}>
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-0.5">EMI</h3>
            <p className="text-[11px] text-slate-500 line-clamp-1">12-Month Financial Year Register (Apr - Mar)</p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-600">40 Ledger Rows</span>
              <span className={`font-extrabold ${activeCard === 'emi' ? 'text-blue-600' : 'text-slate-400'}`}>
                {activeCard === 'emi' ? 'Active View' : 'Click to View'}
              </span>
            </div>
            {activeCard === 'emi' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </div>

          {/* CARD 2: EARNINGS & EXPENSES */}
          <div
            onClick={() => setActiveCard('earnings_expenses')}
            className={`cursor-pointer rounded-xl p-3 border transition-all text-left relative overflow-hidden group shadow-2xs ${
              activeCard === 'earnings_expenses'
                ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white/80 hover:bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                activeCard === 'earnings_expenses' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                Card 2
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                activeCard === 'earnings_expenses' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:text-emerald-500'
              }`}>
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-0.5">earnings & expenses</h3>
            <p className="text-[11px] text-slate-500 line-clamp-1">Dual-Ledger Collections, Disbursals & Expenses</p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-600">90 Rows Dual Sheet</span>
              <span className={`font-extrabold ${activeCard === 'earnings_expenses' ? 'text-emerald-600' : 'text-slate-400'}`}>
                {activeCard === 'earnings_expenses' ? 'Active View' : 'Click to View'}
              </span>
            </div>
            {activeCard === 'earnings_expenses' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-600" />
            )}
          </div>

          {/* CARD 3: DAILY MASTER */}
          <div
            onClick={() => setActiveCard('daily_master')}
            className={`cursor-pointer rounded-xl p-3 border transition-all text-left relative overflow-hidden group shadow-2xs ${
              activeCard === 'daily_master'
                ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                : 'bg-white/80 hover:bg-white border-slate-200 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                activeCard === 'daily_master' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                Card 3
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                activeCard === 'daily_master' ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-400 group-hover:text-purple-500'
              }`}>
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-0.5">daily master</h3>
            <p className="text-[11px] text-slate-500 line-clamp-1">Day Movements, Cash, Bank, Deposits & Closing</p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-600">55 Cycle Days</span>
              <span className={`font-extrabold ${activeCard === 'daily_master' ? 'text-purple-600' : 'text-slate-400'}`}>
                {activeCard === 'daily_master' ? 'Active View' : 'Click to View'}
              </span>
            </div>
            {activeCard === 'daily_master' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-600" />
            )}
          </div>

          {/* CARD 4: VOUCHER */}
          <div
            onClick={() => setActiveCard('voucher')}
            className={`cursor-pointer rounded-xl p-3 border transition-all text-left relative overflow-hidden group shadow-2xs ${
              activeCard === 'voucher'
                ? 'bg-white border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
                : 'bg-white/80 hover:bg-white border-slate-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                activeCard === 'voucher' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                Card 4
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                activeCard === 'voucher' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400 group-hover:text-rose-500'
              }`}>
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-0.5">voucher</h3>
            <p className="text-[11px] text-slate-500 line-clamp-1">Actual Day-End Voucher, Reconciliation & SMA</p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-600">17 Items + SMA</span>
              <span className={`font-extrabold ${activeCard === 'voucher' ? 'text-rose-600' : 'text-slate-400'}`}>
                {activeCard === 'voucher' ? 'Active View' : 'Click to View'}
              </span>
            </div>
            {activeCard === 'voucher' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-600" />
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CARD UI CONTENT AREA (FAITHFUL TO IMAGES 1, 2, 3, 4)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
        {/* =========================================================================
            VIEW 1: CARD 1 -> EMI (Image 1)
        ========================================================================= */}
        {activeCard === 'emi' && (
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
            {/* Table Header Bar */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
                  Card 1: EMI Ledger (12-Month Financial Year Grid)
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">| {selectedBranch} | FY {selectedFy}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <span>Financial Year:</span>
                  <select
                    value={selectedFy}
                    onChange={e => setSelectedFy(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-0.5 text-xs bg-white focus:outline-none"
                  >
                    <option value="2026-2027">FY 2026-27</option>
                    <option value="2025-2026">FY 2025-26</option>
                    <option value="2024-2025">FY 2024-25</option>
                  </select>
                </div>
                {isEditMode && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Click any cell to edit
                  </span>
                )}
              </div>
            </div>

            {/* Table Matching Image 1 */}
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-white border-b-2 border-black divide-x divide-black text-slate-900 font-bold">
                    <th className="py-2 px-2 w-14 text-center">Sr No</th>
                    {months.map(m => (
                      <th key={m} className="py-2 px-2 min-w-[70px] text-center font-bold">
                        {m}
                      </th>
                    ))}
                    <th className="py-2 px-2 w-20 text-center">Initial</th>
                    <th className="py-2 px-2 w-20 text-center">Initial</th>
                    <th className="py-2 px-3 min-w-[130px] text-center">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/80">
                  {emiRows.map((row, idx) => (
                    <tr
                      key={row.srNo}
                      className={`divide-x divide-black/80 hover:bg-blue-50/40 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      {/* Sr No */}
                      <td className="py-1 px-1.5 text-center font-bold text-slate-800 bg-slate-100/30">
                        {row.srNo}
                      </td>

                      {/* 12 Months: Apr to Mar */}
                      {months.map(m => {
                        const key = m.toLowerCase()
                        const val = row[key]
                        return (
                          <td key={m} className="p-0 text-center">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={val}
                                onChange={e => handleCellEdit('emi', idx, key, e.target.value)}
                                className="w-full h-7 px-1 text-center bg-amber-50/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 text-xs"
                              />
                            ) : (
                              <div className="h-7 px-1 flex items-center justify-center font-medium text-slate-800">
                                {formatCellNum(val)}
                              </div>
                            )}
                          </td>
                        )
                      })}

                      {/* Initial 1 */}
                      <td className="p-0 text-center">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.initial1}
                            onChange={e => handleCellEdit('emi', idx, 'initial1', e.target.value)}
                            className="w-full h-7 px-1 text-center bg-amber-50/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs uppercase"
                          />
                        ) : (
                          <div className="h-7 px-1 flex items-center justify-center font-bold text-slate-600 text-[11px]">
                            {row.initial1}
                          </div>
                        )}
                      </td>

                      {/* Initial 2 */}
                      <td className="p-0 text-center">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.initial2}
                            onChange={e => handleCellEdit('emi', idx, 'initial2', e.target.value)}
                            className="w-full h-7 px-1 text-center bg-amber-50/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs uppercase"
                          />
                        ) : (
                          <div className="h-7 px-1 flex items-center justify-center font-bold text-slate-600 text-[11px]">
                            {row.initial2}
                          </div>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="p-0 text-left">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={e => handleCellEdit('emi', idx, 'remarks', e.target.value)}
                            className="w-full h-7 px-2 text-left bg-amber-50/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-700"
                          />
                        ) : (
                          <div className="h-7 px-2 flex items-center text-slate-600 text-[11px] truncate">
                            {row.remarks}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Summary / Totals Row */}
                  <tr className="bg-slate-100 border-t-2 border-black divide-x divide-black font-extrabold text-slate-900">
                    <td className="py-2 px-2 text-center text-xs">Total</td>
                    {months.map(m => {
                      const key = m.toLowerCase()
                      const tot = emiTotals[key]
                      return (
                        <td key={m} className="py-2 px-1 text-center text-xs text-blue-700 font-extrabold">
                          {tot > 0 ? formatCellNum(tot) : '—'}
                        </td>
                      )
                    })}
                    <td className="py-2 px-2 text-center text-[10px] text-slate-500">—</td>
                    <td className="py-2 px-2 text-center text-[10px] text-slate-500">—</td>
                    <td className="py-2 px-3 text-left text-xs font-bold text-slate-700">
                      Total Annual: {formatINR(Object.values(emiTotals).reduce((a, b) => a + b, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 2: CARD 2 -> EARNINGS & EXPENSES (Image 2)
            Two tables side-by-side with 90 rows each, totals at row 91,
            reconciliation box at rows 92-98.
        ========================================================================= */}
        {activeCard === 'earnings_expenses' && (
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden flex flex-col space-y-4">
            {/* Table Control Header */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
                  Card 2: earnings & expenses (Dual-Ledger Collections & Expenses)
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">| {selectedBranch} | Date: {dayjs(selectedDate).format('DD/MM/YYYY')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold">View:</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
                  <button
                    onClick={() => setDualViewMode('both')}
                    className={`px-2 py-0.5 rounded ${dualViewMode === 'both' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Both Side-by-Side
                  </button>
                  <button
                    onClick={() => setDualViewMode('left')}
                    className={`px-2 py-0.5 rounded ${dualViewMode === 'left' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Left Only (Collections)
                  </button>
                  <button
                    onClick={() => setDualViewMode('right')}
                    className={`px-2 py-0.5 rounded ${dualViewMode === 'right' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Right Only (Expenses)
                  </button>
                </div>
              </div>
            </div>

            {/* Dual Ledger Container Matching Image 2 */}
            <div className={`grid gap-4 px-2 pb-4 ${
              dualViewMode === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}>
              {/* LEFT TABLE: Collections / Receipts */}
              {(dualViewMode === 'both' || dualViewMode === 'left') && (
                <div className="border border-black overflow-hidden flex flex-col bg-white">
                  <div className="bg-slate-100 py-1 px-3 border-b border-black text-center font-bold text-xs text-slate-800">
                    Collections & Receipts Ledger (Left Page)
                  </div>
                  <div className="overflow-x-auto max-h-[700px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse text-xs select-none">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="bg-white border-b border-black divide-x divide-black text-slate-900 font-bold">
                          <th className="py-1 px-1.5 w-12 text-center">Sr No</th>
                          <th className="py-1 px-2 min-w-[90px] text-center">Loan Number</th>
                          <th className="py-1 px-2 min-w-[120px] text-left">Particulars</th>
                          <th className="py-1 px-2 min-w-[65px] text-right">Interest</th>
                          <th className="py-1 px-2 min-w-[65px] text-right">Principal</th>
                          <th className="py-1 px-2 min-w-[70px] text-right">Total</th>
                          <th className="py-1 px-2 min-w-[75px] text-right">Cumulative</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/80">
                        {leftLedgerRows.map((row, idx) => (
                          <tr key={row.srNo} className="divide-x divide-black/80 hover:bg-emerald-50/30">
                            <td className="py-0.5 px-1 text-center font-bold text-slate-700 bg-slate-50/50">{row.srNo}</td>
                            <td className="p-0 text-center font-mono text-[11px]">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.loanNumber}
                                  onChange={e => handleCellEdit('left', idx, 'loanNumber', e.target.value)}
                                  className="w-full h-6 px-1 text-center bg-amber-50/30 text-xs"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center justify-center">{row.loanNumber}</div>
                              )}
                            </td>
                            <td className="p-0 text-left">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.particulars}
                                  onChange={e => handleCellEdit('left', idx, 'particulars', e.target.value)}
                                  className="w-full h-6 px-1 text-left bg-amber-50/30 text-xs"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center text-left truncate text-slate-800">{row.particulars}</div>
                              )}
                            </td>
                            <td className="p-0 text-right">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.interest}
                                  onChange={e => handleCellEdit('left', idx, 'interest', e.target.value)}
                                  className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center justify-end font-medium">{formatCellNum(row.interest)}</div>
                              )}
                            </td>
                            <td className="p-0 text-right">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.principal}
                                  onChange={e => handleCellEdit('left', idx, 'principal', e.target.value)}
                                  className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center justify-end font-medium">{formatCellNum(row.principal)}</div>
                              )}
                            </td>
                            <td className="p-0 text-right font-bold text-slate-900">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.total}
                                  onChange={e => handleCellEdit('left', idx, 'total', e.target.value)}
                                  className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs font-bold"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center justify-end font-bold">{formatCellNum(row.total)}</div>
                              )}
                            </td>
                            <td className="p-0 text-right text-slate-700 bg-slate-50/30">
                              <div className="h-6 px-1 flex items-center justify-end">{formatCellNum(row.cumulative)}</div>
                            </td>
                          </tr>
                        ))}

                        {/* Row 91: Total */}
                        <tr className="bg-slate-100 border-t-2 border-black divide-x divide-black font-extrabold text-slate-900">
                          <td className="py-1 px-1 text-center">91</td>
                          <td colSpan={2} className="py-1 px-2 text-center text-xs font-extrabold uppercase">Total</td>
                          <td className="py-1 px-1.5 text-right font-bold">{formatCellNum(leftTotals.interest)}</td>
                          <td className="py-1 px-1.5 text-right font-bold">{formatCellNum(leftTotals.principal)}</td>
                          <td className="py-1 px-1.5 text-right font-extrabold text-emerald-700">{formatCellNum(leftTotals.total)}</td>
                          <td className="py-1 px-1.5 text-right font-bold">{formatCellNum(leftTotals.cumulative)}</td>
                        </tr>

                        {/* Reconciliation Box Rows 92-98 matching Image 2 */}
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">92</td>
                          <td colSpan={3} className="py-1 px-2 text-left font-bold text-slate-800">Opening O/s</td>
                          <td colSpan={3} className="py-1 px-2 text-right font-extrabold text-slate-900">{formatINR(reconData.openingOs)}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">93</td>
                          <td colSpan={3} className="py-1 px-2 text-left font-bold text-slate-800">Total Receipts</td>
                          <td colSpan={3} className="py-1 px-2 text-right font-extrabold text-emerald-700">{formatINR(reconData.totalReceipts)}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">94</td>
                          <td colSpan={3} className="py-1 px-2 text-left font-bold text-slate-800">Disbursement</td>
                          <td colSpan={3} className="py-1 px-2 text-right font-extrabold text-blue-700">{formatINR(reconData.disbursement)}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">95</td>
                          <td colSpan={3} className="py-1 px-2 text-left font-bold text-slate-800">Expenses</td>
                          <td colSpan={3} className="py-1 px-2 text-right font-extrabold text-rose-700">{formatINR(reconData.expenses)}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">96</td>
                          <td colSpan={3} className="py-1 px-2 text-left font-extrabold text-slate-900">Closing O/s</td>
                          <td colSpan={3} className="py-1 px-2 text-right font-extrabold text-purple-700">{formatINR(reconData.closingOs)}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-slate-50">
                          <td className="py-1 px-1 text-center font-bold">97</td>
                          <td colSpan={3} className="py-1 px-2 text-center font-bold text-slate-700">Maker: {reconData.maker}</td>
                          <td colSpan={3} className="py-1 px-2 text-center font-bold text-slate-700">Checker: {reconData.checker}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">98</td>
                          <td colSpan={2} className="py-1 px-2 text-center font-bold text-slate-800">Date</td>
                          <td colSpan={4} className="py-1 px-2 text-center font-semibold text-slate-700">{reconData.date}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-slate-50/30">
                          <td className="py-1 px-1 text-center font-bold">99</td>
                          <td colSpan={6} className="py-1 px-2 text-center text-slate-400"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* RIGHT TABLE: Expenses / Outflows */}
              {(dualViewMode === 'both' || dualViewMode === 'right') && (
                <div className="border border-black overflow-hidden flex flex-col bg-white">
                  <div className="bg-slate-100 py-1 px-3 border-b border-black text-center font-bold text-xs text-slate-800">
                    Expenses & Outflow Ledger (Right Page)
                  </div>
                  <div className="overflow-x-auto max-h-[700px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse text-xs select-none">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="bg-white border-b border-black divide-x divide-black text-slate-900 font-bold">
                          <th className="py-1 px-1.5 w-12 text-center">Sr No</th>
                          <th className="py-1 px-2 min-w-[85px] text-center">Loan Number</th>
                          <th className="py-1 px-2 min-w-[110px] text-left">Particulars</th>
                          <th className="py-1 px-2 min-w-[55px] text-right">Interest</th>
                          <th className="py-1 px-2 min-w-[55px] text-right">Principal</th>
                          <th className="py-1 px-2 min-w-[65px] text-right">Total</th>
                          <th className="py-1 px-2 min-w-[65px] text-right">Expenses</th>
                          <th className="py-1 px-2 min-w-[70px] text-right">Cumulative</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/80">
                        {rightLedgerRows.map((row, idx) => (
                          <tr key={row.srNo} className="divide-x divide-black/80 hover:bg-emerald-50/30">
                            <td className="py-0.5 px-1 text-center font-bold text-slate-700 bg-slate-50/50">{row.srNo}</td>
                            <td className="p-0 text-center font-mono text-[11px]">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.loanNumber}
                                  onChange={e => handleCellEdit('right', idx, 'loanNumber', e.target.value)}
                                  className="w-full h-6 px-1 text-center bg-amber-50/30 text-xs"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center justify-center">{row.loanNumber}</div>
                              )}
                            </td>
                            <td className="p-0 text-left">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.particulars}
                                  onChange={e => handleCellEdit('right', idx, 'particulars', e.target.value)}
                                  className="w-full h-6 px-1 text-left bg-amber-50/30 text-xs"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center text-left truncate text-slate-800">{row.particulars}</div>
                              )}
                            </td>
                            <td className="p-0 text-right">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.interest}
                                  onChange={e => handleCellEdit('right', idx, 'interest', e.target.value)}
                                  className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center justify-end font-medium">{formatCellNum(row.interest)}</div>
                              )}
                            </td>
                            <td className="p-0 text-right">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.principal}
                                  onChange={e => handleCellEdit('right', idx, 'principal', e.target.value)}
                                  className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center justify-end font-medium">{formatCellNum(row.principal)}</div>
                              )}
                            </td>
                            <td className="p-0 text-right font-bold text-slate-900">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.total}
                                  onChange={e => handleCellEdit('right', idx, 'total', e.target.value)}
                                  className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs font-bold"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center justify-end font-bold">{formatCellNum(row.total)}</div>
                              )}
                            </td>
                            <td className="p-0 text-right font-bold text-rose-700 bg-rose-50/20">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={row.expenses}
                                  onChange={e => handleCellEdit('right', idx, 'expenses', e.target.value)}
                                  className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs font-bold text-rose-700"
                                />
                              ) : (
                                <div className="h-6 px-1 flex items-center justify-end font-bold text-rose-700">{formatCellNum(row.expenses)}</div>
                              )}
                            </td>
                            <td className="p-0 text-right text-slate-700 bg-slate-50/30">
                              <div className="h-6 px-1 flex items-center justify-end">{formatCellNum(row.cumulative)}</div>
                            </td>
                          </tr>
                        ))}

                        {/* Row 91: Total */}
                        <tr className="bg-slate-100 border-t-2 border-black divide-x divide-black font-extrabold text-slate-900">
                          <td className="py-1 px-1 text-center">91</td>
                          <td colSpan={2} className="py-1 px-2 text-center text-xs font-extrabold uppercase">Total</td>
                          <td className="py-1 px-1.5 text-right font-bold">{formatCellNum(rightTotals.interest)}</td>
                          <td className="py-1 px-1.5 text-right font-bold">{formatCellNum(rightTotals.principal)}</td>
                          <td className="py-1 px-1.5 text-right font-bold">{formatCellNum(rightTotals.total)}</td>
                          <td className="py-1 px-1.5 text-right font-extrabold text-rose-700">{formatCellNum(rightTotals.expenses)}</td>
                          <td className="py-1 px-1.5 text-right font-bold">{formatCellNum(rightTotals.cumulative)}</td>
                        </tr>

                        {/* Reconciliation Box Rows 92-98 matching Image 2 */}
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">92</td>
                          <td colSpan={3} className="py-1 px-2 text-left font-bold text-slate-800">Opening O/s</td>
                          <td colSpan={4} className="py-1 px-2 text-right font-extrabold text-slate-900">{formatINR(reconData.openingOs)}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">93</td>
                          <td colSpan={3} className="py-1 px-2 text-left font-bold text-slate-800">Total Receipts</td>
                          <td colSpan={4} className="py-1 px-2 text-right font-extrabold text-emerald-700">{formatINR(reconData.totalReceipts)}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">94</td>
                          <td colSpan={3} className="py-1 px-2 text-left font-bold text-slate-800">Disbursement</td>
                          <td colSpan={4} className="py-1 px-2 text-right font-extrabold text-blue-700">{formatINR(reconData.disbursement)}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">95</td>
                          <td colSpan={3} className="py-1 px-2 text-left font-bold text-slate-800">Expenses</td>
                          <td colSpan={4} className="py-1 px-2 text-right font-extrabold text-rose-700">{formatINR(reconData.expenses)}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">96</td>
                          <td colSpan={3} className="py-1 px-2 text-left font-extrabold text-slate-900">Closing O/s</td>
                          <td colSpan={4} className="py-1 px-2 text-right font-extrabold text-purple-700">{formatINR(reconData.closingOs)}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-slate-50">
                          <td className="py-1 px-1 text-center font-bold">97</td>
                          <td colSpan={3} className="py-1 px-2 text-center font-bold text-slate-700">Maker: {reconData.maker}</td>
                          <td colSpan={4} className="py-1 px-2 text-center font-bold text-slate-700">Checker: {reconData.checker}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-white">
                          <td className="py-1 px-1 text-center font-bold">98</td>
                          <td colSpan={3} className="py-1 px-2 text-center font-bold text-slate-800">Date</td>
                          <td colSpan={4} className="py-1 px-2 text-center font-semibold text-slate-700">{reconData.date}</td>
                        </tr>
                        <tr className="border-t border-black divide-x divide-black bg-slate-50/30">
                          <td className="py-1 px-1 text-center font-bold">99</td>
                          <td colSpan={7} className="py-1 px-2 text-center text-slate-400"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 3: CARD 3 -> DAILY MASTER (Image 3)
            Headers: Sr No, Date, Opening O/s, Disbursement, Collection, Interest,
            Expenses, Closing O/s, Cash in Hand, Bank Balance, I wish, Deposits,
            Net O/s, Net, Initial, Initial
            Rows 1 to 55, Row 56 Closing Figures
        ========================================================================= */}
        {activeCard === 'daily_master' && (
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
            {/* Table Control Bar */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
                  Card 3: daily master (Daily Movements & Cash Register)
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">| {selectedBranch} | 55 Cycle Sheet</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500 font-medium">Auto computes Net O/s and Cash Position</span>
              </div>
            </div>

            {/* Table Matching Image 3 */}
            <div className="overflow-x-auto max-h-[750px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-center border-collapse text-xs select-none">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-white border-b-2 border-black divide-x divide-black text-slate-900 font-bold">
                    <th className="py-2 px-1 w-12 text-center">Sr No</th>
                    <th className="py-2 px-2 min-w-[90px] text-center">Date</th>
                    <th className="py-2 px-2 min-w-[95px] text-right">Opening O/s</th>
                    <th className="py-2 px-2 min-w-[90px] text-right">Disbursement</th>
                    <th className="py-2 px-2 min-w-[85px] text-right">Collection</th>
                    <th className="py-2 px-2 min-w-[75px] text-right">Interest</th>
                    <th className="py-2 px-2 min-w-[75px] text-right">Expenses</th>
                    <th className="py-2 px-2 min-w-[95px] text-right">Closing O/s</th>
                    <th className="py-2 px-2 min-w-[90px] text-right">Cash in Hand</th>
                    <th className="py-2 px-2 min-w-[95px] text-right">Bank Balance</th>
                    <th className="py-2 px-2 min-w-[75px] text-right">I wish</th>
                    <th className="py-2 px-2 min-w-[80px] text-right">Deposits</th>
                    <th className="py-2 px-2 min-w-[95px] text-right">Net O/s</th>
                    <th className="py-2 px-2 min-w-[95px] text-right">Net</th>
                    <th className="py-2 px-1 w-14 text-center">Initial</th>
                    <th className="py-2 px-1 w-14 text-center">Initial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/80">
                  {masterRows.map((row, idx) => (
                    <tr
                      key={row.srNo}
                      className={`divide-x divide-black/80 hover:bg-purple-50/30 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                      }`}
                    >
                      {/* Sr No */}
                      <td className="py-1 px-1 text-center font-bold text-slate-800 bg-slate-50/50">{row.srNo}</td>

                      {/* Date */}
                      <td className="p-0 text-center font-medium text-slate-700">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.date}
                            onChange={e => handleCellEdit('master', idx, 'date', e.target.value)}
                            className="w-full h-6 px-1 text-center bg-amber-50/30 text-xs"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-center">{row.date}</div>
                        )}
                      </td>

                      {/* Opening O/s */}
                      <td className="p-0 text-right">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.openingOs}
                            onChange={e => handleCellEdit('master', idx, 'openingOs', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end font-medium">{formatCellNum(row.openingOs)}</div>
                        )}
                      </td>

                      {/* Disbursement */}
                      <td className="p-0 text-right text-blue-700">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.disbursement}
                            onChange={e => handleCellEdit('master', idx, 'disbursement', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs text-blue-700 font-medium"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end font-medium text-blue-700">{formatCellNum(row.disbursement)}</div>
                        )}
                      </td>

                      {/* Collection */}
                      <td className="p-0 text-right text-emerald-700">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.collection}
                            onChange={e => handleCellEdit('master', idx, 'collection', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs text-emerald-700 font-medium"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end font-medium text-emerald-700">{formatCellNum(row.collection)}</div>
                        )}
                      </td>

                      {/* Interest */}
                      <td className="p-0 text-right">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.interest}
                            onChange={e => handleCellEdit('master', idx, 'interest', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end">{formatCellNum(row.interest)}</div>
                        )}
                      </td>

                      {/* Expenses */}
                      <td className="p-0 text-right text-rose-700">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.expenses}
                            onChange={e => handleCellEdit('master', idx, 'expenses', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs text-rose-700 font-medium"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end font-medium text-rose-700">{formatCellNum(row.expenses)}</div>
                        )}
                      </td>

                      {/* Closing O/s */}
                      <td className="p-0 text-right font-bold text-slate-900 bg-slate-50/20">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.closingOs}
                            onChange={e => handleCellEdit('master', idx, 'closingOs', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs font-bold"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end font-bold">{formatCellNum(row.closingOs)}</div>
                        )}
                      </td>

                      {/* Cash in Hand */}
                      <td className="p-0 text-right font-medium">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.cashInHand}
                            onChange={e => handleCellEdit('master', idx, 'cashInHand', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs font-medium"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end font-medium">{formatCellNum(row.cashInHand)}</div>
                        )}
                      </td>

                      {/* Bank Balance */}
                      <td className="p-0 text-right font-medium">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.bankBalance}
                            onChange={e => handleCellEdit('master', idx, 'bankBalance', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs font-medium"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end font-medium">{formatCellNum(row.bankBalance)}</div>
                        )}
                      </td>

                      {/* I wish */}
                      <td className="p-0 text-right">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.iWish}
                            onChange={e => handleCellEdit('master', idx, 'iWish', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end">{formatCellNum(row.iWish)}</div>
                        )}
                      </td>

                      {/* Deposits */}
                      <td className="p-0 text-right font-medium text-emerald-800">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.deposits}
                            onChange={e => handleCellEdit('master', idx, 'deposits', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs font-medium"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end font-medium">{formatCellNum(row.deposits)}</div>
                        )}
                      </td>

                      {/* Net O/s */}
                      <td className="p-0 text-right font-bold text-slate-800 bg-slate-50/30">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.netOs}
                            onChange={e => handleCellEdit('master', idx, 'netOs', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs font-bold"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end font-bold">{formatCellNum(row.netOs)}</div>
                        )}
                      </td>

                      {/* Net */}
                      <td className="p-0 text-right font-extrabold text-blue-900 bg-blue-50/20">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.net}
                            onChange={e => handleCellEdit('master', idx, 'net', e.target.value)}
                            className="w-full h-6 px-1 text-right bg-amber-50/30 text-xs font-extrabold text-blue-900"
                          />
                        ) : (
                          <div className="h-6 px-1 flex items-center justify-end font-extrabold text-blue-900">{formatCellNum(row.net)}</div>
                        )}
                      </td>

                      {/* Initial 1 */}
                      <td className="p-0 text-center font-bold text-slate-600">
                        <div className="h-6 px-1 flex items-center justify-center text-[10px]">{row.initial1}</div>
                      </td>

                      {/* Initial 2 */}
                      <td className="p-0 text-center font-bold text-slate-600">
                        <div className="h-6 px-1 flex items-center justify-center text-[10px]">{row.initial2}</div>
                      </td>
                    </tr>
                  ))}

                  {/* Row 56: Closing Figures Matching Image 3 */}
                  <tr className="bg-slate-100 border-t-2 border-black divide-x divide-black font-extrabold text-slate-900">
                    <td className="py-2 px-1 text-center text-xs">56</td>
                    <td className="py-2 px-2 text-center text-xs font-extrabold uppercase">Closing Figures</td>
                    <td className="py-2 px-1.5 text-right font-bold">{formatCellNum(masterClosingFigures.openingOs)}</td>
                    <td className="py-2 px-1.5 text-right font-bold text-blue-700">{formatCellNum(masterClosingFigures.disbursement)}</td>
                    <td className="py-2 px-1.5 text-right font-bold text-emerald-700">{formatCellNum(masterClosingFigures.collection)}</td>
                    <td className="py-2 px-1.5 text-right font-bold">{formatCellNum(masterClosingFigures.interest)}</td>
                    <td className="py-2 px-1.5 text-right font-bold text-rose-700">{formatCellNum(masterClosingFigures.expenses)}</td>
                    <td className="py-2 px-1.5 text-right font-extrabold">{formatCellNum(masterClosingFigures.closingOs)}</td>
                    <td className="py-2 px-1.5 text-right font-bold">{formatCellNum(masterClosingFigures.cashInHand)}</td>
                    <td className="py-2 px-1.5 text-right font-bold">{formatCellNum(masterClosingFigures.bankBalance)}</td>
                    <td className="py-2 px-1.5 text-right font-bold">{formatCellNum(masterClosingFigures.iWish)}</td>
                    <td className="py-2 px-1.5 text-right font-bold text-emerald-800">{formatCellNum(masterClosingFigures.deposits)}</td>
                    <td className="py-2 px-1.5 text-right font-extrabold text-slate-900">{formatCellNum(masterClosingFigures.netOs)}</td>
                    <td className="py-2 px-1.5 text-right font-extrabold text-blue-900">{formatCellNum(masterClosingFigures.net)}</td>
                    <td className="py-2 px-1 text-center text-[10px] text-slate-500">—</td>
                    <td className="py-2 px-1 text-center text-[10px] text-slate-500">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 4: CARD 4 -> VOUCHER (Image 4)
            Top header: Branch | Actual | Date
            Main Table: Sr No 1-16, Name, Loan No, Particulars, Debit, Credit, Initial, Initial
            Row 17: Total, Debit, Credit, Net
            Bottom Summary A: Particulars | Opening Balance | Closing Balance | Inc/Dec
                              (Cash, Bank Balance, O/s, Expenses, Net Inc/Dec)
            Bottom Summary B: SMA | SMA-0 | SMA-1 | SMA-2 | NPA
                              (No, Amt)
        ========================================================================= */}
        {activeCard === 'voucher' && (
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden flex flex-col space-y-4">
            {/* Table Control Header */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 print:hidden">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
                  Card 4: voucher (Actual Cash & SMA Portfolio Voucher)
                </h2>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Official Day-End Reconciliation Voucher
              </div>
            </div>

            {/* Voucher Sheet Matching Image 4 */}
            <div className="px-4 pb-4">
              <div className="border border-black overflow-hidden flex flex-col bg-white">
                {/* Top Banner Matching Image 4 */}
                <div className="grid grid-cols-3 border-b-2 border-black divide-x divide-black py-2.5 px-4 items-center bg-white">
                  {/* Left: Branch */}
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">Branch:</span>
                    <span className="font-bold text-sm text-blue-900 border-b border-dotted border-slate-400 px-2 py-0.5">
                      {selectedBranch}
                    </span>
                  </div>

                  {/* Center: Actual */}
                  <div className="text-center">
                    <span className="text-lg font-black tracking-wider text-slate-950 uppercase">
                      Actual
                    </span>
                  </div>

                  {/* Right: Date */}
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-extrabold text-sm text-slate-900">Date:</span>
                    <span className="font-bold text-sm text-slate-900 border-b border-dotted border-slate-400 px-2 py-0.5">
                      {dayjs(selectedDate).format('DD/MM/YYYY')}
                    </span>
                  </div>
                </div>

                {/* Main Voucher Table Matching Image 4 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-xs select-none">
                    <thead>
                      <tr className="bg-white border-b-2 border-black divide-x divide-black text-slate-900 font-bold">
                        <th className="py-2 px-1.5 w-12 text-center">Sr No</th>
                        <th className="py-2 px-3 min-w-[150px] text-left">Name</th>
                        <th className="py-2 px-2 min-w-[100px] text-center">Loan No</th>
                        <th className="py-2 px-3 min-w-[170px] text-left">Particulars</th>
                        <th className="py-2 px-2 min-w-[90px] text-right">Debit</th>
                        <th className="py-2 px-2 min-w-[90px] text-right">Credit</th>
                        <th className="py-2 px-1 w-16 text-center">Initial</th>
                        <th className="py-2 px-1 w-16 text-center">Initial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/80">
                      {voucherRows.map((row, idx) => (
                        <tr key={row.srNo} className="divide-x divide-black/80 hover:bg-rose-50/20">
                          {/* Sr No */}
                          <td className="py-1 px-1.5 text-center font-bold text-slate-700 bg-slate-50/50">
                            {row.srNo}
                          </td>

                          {/* Name */}
                          <td className="p-0 text-left">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={row.name}
                                onChange={e => handleCellEdit('voucher', idx, 'name', e.target.value)}
                                className="w-full h-7 px-2 text-left bg-amber-50/30 text-xs font-medium"
                              />
                            ) : (
                              <div className="h-7 px-2 flex items-center font-medium text-slate-900 truncate">
                                {row.name}
                              </div>
                            )}
                          </td>

                          {/* Loan No */}
                          <td className="p-0 text-center font-mono">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={row.loanNo}
                                onChange={e => handleCellEdit('voucher', idx, 'loanNo', e.target.value)}
                                className="w-full h-7 px-1 text-center bg-amber-50/30 text-xs"
                              />
                            ) : (
                              <div className="h-7 px-1 flex items-center justify-center text-slate-700">
                                {row.loanNo}
                              </div>
                            )}
                          </td>

                          {/* Particulars */}
                          <td className="p-0 text-left">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={row.particulars}
                                onChange={e => handleCellEdit('voucher', idx, 'particulars', e.target.value)}
                                className="w-full h-7 px-2 text-left bg-amber-50/30 text-xs"
                              />
                            ) : (
                              <div className="h-7 px-2 flex items-center text-slate-800 truncate">
                                {row.particulars}
                              </div>
                            )}
                          </td>

                          {/* Debit */}
                          <td className="p-0 text-right text-rose-700">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={row.debit}
                                onChange={e => handleCellEdit('voucher', idx, 'debit', e.target.value)}
                                className="w-full h-7 px-2 text-right bg-amber-50/30 text-xs font-semibold text-rose-700"
                              />
                            ) : (
                              <div className="h-7 px-2 flex items-center justify-end font-semibold text-rose-700">
                                {formatCellNum(row.debit)}
                              </div>
                            )}
                          </td>

                          {/* Credit */}
                          <td className="p-0 text-right text-emerald-700">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={row.credit}
                                onChange={e => handleCellEdit('voucher', idx, 'credit', e.target.value)}
                                className="w-full h-7 px-2 text-right bg-amber-50/30 text-xs font-semibold text-emerald-700"
                              />
                            ) : (
                              <div className="h-7 px-2 flex items-center justify-end font-semibold text-emerald-700">
                                {formatCellNum(row.credit)}
                              </div>
                            )}
                          </td>

                          {/* Initial 1 */}
                          <td className="p-0 text-center font-bold text-slate-600">
                            <div className="h-7 px-1 flex items-center justify-center text-[10px]">
                              {row.initial1}
                            </div>
                          </td>

                          {/* Initial 2 */}
                          <td className="p-0 text-center font-bold text-slate-600">
                            <div className="h-7 px-1 flex items-center justify-center text-[10px]">
                              {row.initial2}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Row 17: Total & Net Matching Image 4 */}
                      <tr className="bg-slate-100 border-t-2 border-black divide-x divide-black font-extrabold text-slate-900">
                        <td className="py-2 px-1 text-center">17</td>
                        <td colSpan={3} className="py-2 px-3 text-center uppercase font-black tracking-wider text-xs">
                          Total
                        </td>
                        <td className="py-2 px-2 text-right font-black text-rose-800 text-xs">
                          {formatCellNum(voucherTotals.debit)}
                        </td>
                        <td className="py-2 px-2 text-right font-black text-emerald-800 text-xs">
                          {formatCellNum(voucherTotals.credit)}
                        </td>
                        <td colSpan={2} className="py-2 px-2 text-center bg-blue-50/70 font-black text-blue-900 text-xs">
                          Net: {formatCellNum(voucherTotals.net)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    BOTTOM SUMMARY SECTION MATCHING IMAGE 4
                    Table A: Particulars | Opening Balance | Closing Balance | Inc/Dec
                             (Cash, Bank Balance, O/s, Expenses, Net Inc/Dec)
                    Table B: SMA | SMA-0 | SMA-1 | SMA-2 | NPA
                             (No, Amt)
                ───────────────────────────────────────────────────────────── */}
                <div className="border-t-2 border-black bg-white">
                  {/* Table A: Balance Reconciliation */}
                  <div className="overflow-x-auto border-b-2 border-black">
                    <table className="w-full text-center border-collapse text-xs select-none">
                      <thead>
                        <tr className="bg-slate-50 border-b border-black divide-x divide-black text-slate-900 font-bold">
                          <th className="py-2 px-4 text-left w-1/4">Particulars</th>
                          <th className="py-2 px-4 text-right w-1/4">Opening Balance</th>
                          <th className="py-2 px-4 text-right w-1/4">Closing Balance</th>
                          <th className="py-2 px-4 text-right w-1/4">Inc/Dec</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/80 font-medium">
                        {voucherReconciliation.map(item => {
                          const isNetRow = item.particulars === 'Net Inc/Dec'
                          return (
                            <tr
                              key={item.particulars}
                              className={`divide-x divide-black/80 ${isNetRow ? 'bg-slate-100 font-extrabold' : 'hover:bg-slate-50/40'}`}
                            >
                              <td className="py-1.5 px-4 text-left font-bold text-slate-800">
                                {item.particulars}
                              </td>
                              <td className="py-1.5 px-4 text-right">
                                {item.open !== null ? formatINR(item.open) : ''}
                              </td>
                              <td className="py-1.5 px-4 text-right">
                                {item.close !== null ? formatINR(item.close) : ''}
                              </td>
                              <td className={`py-1.5 px-4 text-right font-bold ${
                                (item.diff ?? 0) > 0 ? 'text-emerald-700' : (item.diff ?? 0) < 0 ? 'text-rose-700' : 'text-slate-700'
                              }`}>
                                {item.diff === null || item.diff === 0 ? '' : item.diff > 0 ? `+${formatINR(item.diff)}` : `-${formatINR(Math.abs(item.diff))}`}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table B: SMA & NPA Analysis Matching Image 4 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs select-none">
                      <thead>
                        <tr className="bg-slate-50 border-b border-black divide-x divide-black text-slate-900 font-extrabold">
                          <th className="py-2 px-4 text-center w-1/5">SMA</th>
                          <th className="py-2 px-4 text-center w-1/5">SMA - 0 (1-30 DPD)</th>
                          <th className="py-2 px-4 text-center w-1/5">SMA - 1 (31-60 DPD)</th>
                          <th className="py-2 px-4 text-center w-1/5">SMA - 2 (61-90 DPD)</th>
                          <th className="py-2 px-4 text-center w-1/5 text-rose-700">NPA (&gt;90 DPD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/80 font-bold">
                        {/* Row: No (Count) */}
                        <tr className="divide-x divide-black/80 hover:bg-slate-50/30">
                          <td className="py-2 px-4 text-center font-black text-slate-800 bg-slate-50/40">No</td>
                          <td className="py-2 px-4 text-center text-slate-900">{smaAnalysis.sma0.no}</td>
                          <td className="py-2 px-4 text-center text-slate-900">{smaAnalysis.sma1.no}</td>
                          <td className="py-2 px-4 text-center text-slate-900">{smaAnalysis.sma2.no}</td>
                          <td className="py-2 px-4 text-center font-extrabold text-rose-700">{smaAnalysis.npa.no}</td>
                        </tr>

                        {/* Row: Amt (Amount) */}
                        <tr className="divide-x divide-black/80 hover:bg-slate-50/30">
                          <td className="py-2 px-4 text-center font-black text-slate-800 bg-slate-50/40">Amt</td>
                          <td className="py-2 px-4 text-center font-bold text-slate-900">{formatINR(smaAnalysis.sma0.amt)}</td>
                          <td className="py-2 px-4 text-center font-bold text-slate-900">{formatINR(smaAnalysis.sma1.amt)}</td>
                          <td className="py-2 px-4 text-center font-bold text-slate-900">{formatINR(smaAnalysis.sma2.amt)}</td>
                          <td className="py-2 px-4 text-center font-black text-rose-700">{formatINR(smaAnalysis.npa.amt)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
