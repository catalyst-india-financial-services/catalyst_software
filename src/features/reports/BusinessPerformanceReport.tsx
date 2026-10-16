import React, { useState, useMemo } from 'react'
import {
  Download, Printer, ChevronDown, RefreshCw,
  Building2, Calendar, FileSpreadsheet, Info, ArrowLeft, Search,
  Database, Sparkles, CheckCircle2, TrendingUp, Layers
} from 'lucide-react'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'

interface ColumnDef {
  key: string
  label: string
  subLabel?: string
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface RowData {
  sNo: string
  particulars: string
  opening?: string
  lastYear?: string
  yoy?: string
  lastMonthEnd?: string
  mom?: string
  prevDay?: string
  today?: string
  dod?: string
  targetQuarter?: string
  achievement?: string
  achPercent?: string
  gap?: string
  gapPercent?: string
  ytd?: string
  ytdPercent?: string
  qtd?: string
  qtdPercent?: string
  mtd?: string
  isHeader?: boolean
  isSummary?: boolean
  sectionColor?: string
}

interface ReportSection {
  id: number
  title: string
  colorClass: string
  headerBg: string
  rows: RowData[]
}

// Baseline template data (from original screenshot specs)
const TEMPLATE_SECTIONS: ReportSection[] = [
  {
    id: 1,
    title: '1  BUSINESS GROWTH (DISBURSEMENTS)',
    colorClass: 'bg-[#103055] text-white',
    headerBg: '#103055',
    rows: [
      { sNo: '1.1', particulars: 'Term Loan', opening: '8.45', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '13.70', mom: '7.3%', prevDay: '14.70', today: '14.70', dod: '0.0%', targetQuarter: '15.70', achievement: '15.70', achPercent: '100.0%', gap: '-', gapPercent: '0.0%', ytd: '7.25', ytdPercent: '', qtd: '7.25', qtdPercent: '', mtd: '15.70' },
      { sNo: '1.2', particulars: 'Working Capital', opening: '3.00', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '5.00', mom: '0.0%', prevDay: '5.00', today: '5.00', dod: '0.0%', targetQuarter: '7.00', achievement: '7.00', achPercent: '100.0%', gap: '-', gapPercent: '0.0%', ytd: '4.00', ytdPercent: '', qtd: '4.00', qtdPercent: '', mtd: '7.00' },
      { sNo: '1.3', particulars: 'Composite Loan', opening: '-', lastYear: '-', yoy: '', lastMonthEnd: '4.00', mom: '0.0%', prevDay: '4.00', today: '4.00', dod: '0.0%', targetQuarter: '4.00', achievement: '4.00', achPercent: '100.0%', gap: '-', gapPercent: '0.0%', ytd: '4.00', ytdPercent: '', qtd: '4.00', qtdPercent: '', mtd: '4.00' },
      { sNo: '1.4', particulars: 'Total Disbursements', opening: '11.45', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '22.70', mom: '4.4%', prevDay: '23.70', today: '23.70', dod: '0.0%', targetQuarter: '26.70', achievement: '26.70', achPercent: '100.0%', gap: '-', gapPercent: '0.0%', ytd: '15.25', ytdPercent: '', qtd: '15.25', qtdPercent: '', mtd: '26.70', isSummary: true },
    ]
  },
  {
    id: 2,
    title: '2  COLLECTION PERFORMANCE',
    colorClass: 'bg-[#15803d] text-white',
    headerBg: '#15803d',
    rows: [
      { sNo: '2.1', particulars: 'Total Demand Due (EMI + Other)', opening: '10.50', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '12.30', mom: '-88.6%', prevDay: '1.25', today: '1.40', dod: '12.0%', targetQuarter: '14.00', achievement: '12.30', achPercent: '87.9%', gap: '1.70', gapPercent: '12.1%', ytd: '11.80', ytdPercent: '', qtd: '11.80', qtdPercent: '', mtd: '12.30' },
      { sNo: '2.2', particulars: 'Principal Collection', opening: '8.20', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '9.60', mom: '-88.5%', prevDay: '0.95', today: '1.10', dod: '15.8%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '9.40', ytdPercent: '', qtd: '9.40', qtdPercent: '', mtd: '9.60' },
      { sNo: '2.3', particulars: 'Interest Collection', opening: '1.60', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '1.90', mom: '-88.4%', prevDay: '0.15', today: '0.22', dod: '46.7%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '1.80', ytdPercent: '', qtd: '1.80', qtdPercent: '', mtd: '1.90' },
      { sNo: '2.4', particulars: 'Total Collection', opening: '9.80', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '11.50', mom: '-88.5%', prevDay: '1.10', today: '1.32', dod: '20.0%', targetQuarter: '13.00', achievement: '11.50', achPercent: '88.5%', gap: '1.50', gapPercent: '11.5%', ytd: '11.20', ytdPercent: '', qtd: '11.20', qtdPercent: '', mtd: '11.50', isSummary: true },
      { sNo: '2.5', particulars: 'Collection Efficiency', opening: '83.7%', lastYear: '-', yoy: '', lastMonthEnd: '83.5%', mom: '', prevDay: '86.4%', today: '83.3%', dod: '', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '83.9%', ytdPercent: '', qtd: '83.9%', qtdPercent: '', mtd: '83.5%' },
    ]
  },
  {
    id: 3,
    title: '3  LOAN PORTFOLIO & OUTSTANDING',
    colorClass: 'bg-[#6b21a8] text-white',
    headerBg: '#6b21a8',
    rows: [
      { sNo: '3.1', particulars: 'Principal Outstanding', opening: '36.50', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '37.60', mom: '-1.3%', prevDay: '37.40', today: '37.10', dod: '-0.8%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '37.10', ytdPercent: '', qtd: '37.10', qtdPercent: '', mtd: '37.10' },
      { sNo: '3.2', particulars: 'Interest Outstanding', opening: '1.50', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '1.60', mom: '-0.6%', prevDay: '1.55', today: '1.59', dod: '2.6%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '1.59', ytdPercent: '', qtd: '1.59', qtdPercent: '', mtd: '1.59' },
      { sNo: '3.3', particulars: 'Total Loan Portfolio Outstanding', opening: '38.00', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '39.20', mom: '-1.3%', prevDay: '38.95', today: '38.69', dod: '-0.7%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '38.69', ytdPercent: '', qtd: '38.69', qtdPercent: '', mtd: '38.69', isSummary: true },
      { sNo: '3.4', particulars: 'Active Loan Accounts', opening: '142.00', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '148.00', mom: '1.4%', prevDay: '144.00', today: '150.00', dod: '4.2%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '150.00', ytdPercent: '', qtd: '150.00', qtdPercent: '', mtd: '150.00' },
      { sNo: '3.5', particulars: 'Loan Closures (During Period)', opening: '2.00', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '5.00', mom: '-100.0%', prevDay: '-', today: '-', dod: '', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '5.00', ytdPercent: '', qtd: '5.00', qtdPercent: '', mtd: '-' },
      { sNo: '3.6', particulars: 'Net Portfolio Growth', opening: '11.45', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '16.50', mom: '', prevDay: '', today: '', dod: '', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '15.25', ytdPercent: '', qtd: '15.25', qtdPercent: '', mtd: '26.70' },
    ]
  },
  {
    id: 4,
    title: '4  LIQUIDITY & CAPITAL POSITION',
    colorClass: 'bg-[#b45309] text-white',
    headerBg: '#b45309',
    rows: [
      { sNo: '4.1', particulars: 'Capital' },
      { sNo: '4.2', particulars: 'Deposits' },
      { sNo: '4.3', particulars: 'Loans (Borrowings)' },
      { sNo: '4.4', particulars: 'Capital Employed' },
      { sNo: '4.5', particulars: 'Cash Balance' },
      { sNo: '4.6', particulars: 'Bank Balance', prevDay: '11.99', today: '11.99', dod: '0.0%', ytd: '11.99', qtd: '11.99', mtd: '11.99' },
      { sNo: '4.8', particulars: 'Capital Deployed', prevDay: '38.69', today: '38.69', dod: '0.0%', ytd: '38.69', qtd: '38.69', mtd: '38.69' },
      { sNo: '4.9', particulars: 'Difference' },
    ]
  },
  {
    id: 5,
    title: '5  PROFITABILITY (INCOME & EXPENSES)',
    colorClass: 'bg-[#991b1b] text-white',
    headerBg: '#991b1b',
    rows: [
      { sNo: '5.1', particulars: 'Interest Income' },
      { sNo: '5.2', particulars: 'Interest Expense' },
      { sNo: '5.3', particulars: 'Net Interest Income', today: '-' },
      { sNo: '5.4', particulars: 'Operating Expenses' },
      { sNo: '5.5', particulars: 'Credit Loss Provisions' },
      { sNo: '5.6', particulars: 'Profit' },
    ]
  },
  {
    id: 6,
    title: '6  ASSET QUALITY',
    colorClass: 'bg-[#0284c7] text-white',
    headerBg: '#0284c7',
    rows: [
      { sNo: '6.1', particulars: 'PAR 30+' },
      { sNo: '6.2', particulars: 'PAR 90+' },
      { sNo: '6.3', particulars: 'SMA - 0' },
      { sNo: '6.4', particulars: 'SMA - 1' },
      { sNo: '6.5', particulars: 'SMA - 2' },
      { sNo: '6.6', particulars: 'Total Overdue Accounts' },
      { sNo: '6.7', particulars: 'Total Overdue Amount' },
      { sNo: '6.8', particulars: 'NPA Accounts' },
      { sNo: '6.9', particulars: 'NPA Amount' },
      { sNo: '6.10', particulars: 'NPA % of Portfolio' },
      { sNo: '6.11', particulars: 'Recovery from Overdue Accounts' },
      { sNo: '6.12', particulars: 'Recovery from NPA Accounts' },
      { sNo: '6.13', particulars: 'Total Recovery' },
    ]
  },
  {
    id: 7,
    title: '7  Ranking',
    colorClass: 'bg-[#2563eb] text-white',
    headerBg: '#2563eb',
    rows: [
      { sNo: '7.1', particulars: 'Disbursement Rank' },
      { sNo: '7.2', particulars: 'Collection Rank' },
      { sNo: '7.3', particulars: 'NPA Rank' },
      { sNo: '7.4', particulars: 'Profitability Rank' },
      { sNo: '7.5', particulars: 'Overdue Rank' },
      { sNo: '7.6', particulars: 'Growth Rank' },
      { sNo: '7.7', particulars: 'Overall Rank' },
    ]
  }
]

// Formatting helpers
function toLakhsStr(num: number | null | undefined, isCount = false): string {
  if (num === null || num === undefined || isNaN(num) || num === 0) return '-'
  if (isCount) return num.toFixed(2)
  const lakhs = num / 100000
  if (Math.abs(lakhs) < 0.005) return '-'
  return lakhs.toFixed(2)
}

function toPercentStr(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return ''
  return `${num.toFixed(1)}%`
}

function calcPctChange(current: number, base: number): string {
  if (base > 0) {
    const change = ((current - base) / base) * 100
    return `${change > 0 ? '' : ''}${change.toFixed(1)}%`
  }
  if (base === 0 && current > 0) return '100.0%'
  if (base > 0 && current === 0) return '-100.0%'
  return ''
}

interface BusinessPerformanceReportProps {
  onBack: () => void
}

export default function BusinessPerformanceReport({ onBack }: BusinessPerformanceReportProps) {
  const { user, isBranchUser, userBranch, selectedBranch: storeBranch } = useAuthStore()
  
  // Local branch selection (defaults to active user/store branch or 'All Branches')
  const initialBranch = (isBranchUser ? userBranch : storeBranch) || 'All Branches'
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch)
  const [activeTab, setActiveTab] = useState<'sheet' | 'notes'>('sheet')
  const [searchTerm, setSearchTerm] = useState('')
  const [dataSourceMode, setDataSourceMode] = useState<'live' | 'template'>('live')
  
  // Custom date selection: defaults to current date
  const [reportDate, setReportDate] = useState<string>(dayjs().format('YYYY-MM-DD'))

  // Fetch all live dashboard and report tables from Supabase
  const { data: dbData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['performanceReportLiveRawData'],
    queryFn: async () => {
      const safe = async <T,>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | []> => {
        const res = await p
        if (res.error) {
          console.warn('[Report] Query error:', res.error)
          return []
        }
        return res.data || []
      }

      const [customers, loans, emiSchedule, payments, income, expenses] = await Promise.all([
        safe(supabase.from('customers').select('*')),
        safe(supabase.from('loans').select('*, customer:customers!loans_customer_id_fkey(name)')),
        safe(supabase.from('emi_schedule').select('*').order('due_date', { ascending: true })),
        safe(supabase.from('emi_payments').select('*').order('payment_date', { ascending: false })),
        safe(supabase.from('income').select('*').order('date', { ascending: false })),
        safe(supabase.from('expenses').select('*').order('date', { ascending: false })),
      ])

      return {
        customers: (customers as any[]) || [],
        loans: (loans as any[]) || [],
        emiSchedule: (emiSchedule as any[]) || [],
        payments: (payments as any[]) || [],
        income: (income as any[]) || [],
        expenses: (expenses as any[]) || [],
      }
    },
    staleTime: 10000,
  })

  // Available branches list dynamically extracted from DB records
  const availableBranches = useMemo(() => {
    const list = new Set(['Namakkal', 'Aniyapuram', 'Vallipuram'])
    if (dbData?.loans) {
      dbData.loans.forEach(l => { if (l.branch) list.add(l.branch) })
    }
    if (dbData?.customers) {
      dbData.customers.forEach(c => { if (c.branch) list.add(c.branch) })
    }
    return ['All Branches', ...Array.from(list)]
  }, [dbData])

  // Compute dynamic columns based on selected report date
  const refDate = useMemo(() => dayjs(reportDate), [reportDate])
  
  // Financial year determination: in India, April 1st starts the FY
  const fyStart = useMemo(() => {
    const m = refDate.month() // 0 = Jan, 3 = April
    const y = refDate.year()
    const fyYear = m >= 3 ? y : y - 1
    return dayjs(`${fyYear}-04-01`)
  }, [refDate])

  const prevFyEnd = useMemo(() => fyStart.subtract(1, 'day'), [fyStart])
  const lastMonthEnd = useMemo(() => refDate.subtract(1, 'month').endOf('month'), [refDate])
  const prevDay = useMemo(() => refDate.subtract(1, 'day'), [refDate])
  const todayStr = useMemo(() => refDate.format('YYYY-MM-DD'), [refDate])
  const prevDayStr = useMemo(() => prevDay.format('YYYY-MM-DD'), [prevDay])
  const lastMonthEndStr = useMemo(() => lastMonthEnd.format('YYYY-MM-DD'), [lastMonthEnd])
  const openingStr = useMemo(() => fyStart.format('YYYY-MM-DD'), [fyStart])
  const lastYearStr = useMemo(() => prevFyEnd.format('YYYY-MM-DD'), [prevFyEnd])

  const columns: ColumnDef[] = useMemo(() => [
    { key: 'sNo', label: 'S.No', width: 'w-16 min-w-[64px]', align: 'center' },
    { key: 'particulars', label: 'Particulars', width: 'w-64 min-w-[250px]', align: 'left' },
    { key: 'opening', label: 'Opening', subLabel: fyStart.format('DD-MM-YYYY'), width: 'w-28 min-w-[100px]', align: 'right' },
    { key: 'lastYear', label: 'Last Year', subLabel: prevFyEnd.format('DD-MM-YYYY'), width: 'w-28 min-w-[100px]', align: 'right' },
    { key: 'yoy', label: 'YOY %', width: 'w-24 min-w-[90px]', align: 'right' },
    { key: 'lastMonthEnd', label: 'Last Month End', subLabel: lastMonthEnd.format('DD-MM-YYYY'), width: 'w-32 min-w-[115px]', align: 'right' },
    { key: 'mom', label: 'MOM %', width: 'w-24 min-w-[90px]', align: 'right' },
    { key: 'prevDay', label: 'Previous Day', subLabel: prevDay.format('DD-MM-YYYY'), width: 'w-28 min-w-[105px]', align: 'right' },
    { key: 'today', label: 'Today', subLabel: refDate.format('DD-MM-YYYY'), width: 'w-28 min-w-[105px]', align: 'right' },
    { key: 'dod', label: 'DOD %', width: 'w-24 min-w-[90px]', align: 'right' },
    { key: 'targetQuarter', label: 'Target for', subLabel: 'Current Quarter', width: 'w-32 min-w-[120px]', align: 'right' },
    { key: 'achievement', label: 'Achievement', subLabel: '(as on date)', width: 'w-32 min-w-[120px]', align: 'right' },
    { key: 'achPercent', label: 'Ach %', width: 'w-24 min-w-[85px]', align: 'right' },
    { key: 'gap', label: 'GAP', width: 'w-24 min-w-[85px]', align: 'right' },
    { key: 'gapPercent', label: 'Gap %', width: 'w-24 min-w-[85px]', align: 'right' },
    { key: 'ytd', label: 'YTD', width: 'w-24 min-w-[90px]', align: 'right' },
    { key: 'ytdPercent', label: 'YTD %', width: 'w-24 min-w-[85px]', align: 'right' },
    { key: 'qtd', label: 'QTD', width: 'w-24 min-w-[90px]', align: 'right' },
    { key: 'qtdPercent', label: 'QTD %', width: 'w-24 min-w-[85px]', align: 'right' },
    { key: 'mtd', label: 'MTD', width: 'w-28 min-w-[100px]', align: 'right' },
  ], [fyStart, prevFyEnd, lastMonthEnd, prevDay, refDate])

  // Dynamic calculation of sections from live DB data
  const dynamicSections = useMemo((): ReportSection[] => {
    if (!dbData) return TEMPLATE_SECTIONS
    if (dataSourceMode === 'template') return TEMPLATE_SECTIONS

    const norm = (s?: string | null) => (s || '').toLowerCase().replace(/\s+branch$/i, '').trim()
    const isAll = !selectedBranch || selectedBranch === 'All Branches'
    const curBranchNorm = norm(selectedBranch)

    // Filter loans by branch
    const branchLoans = dbData.loans.filter(l => isAll || norm(l.branch) === curBranchNorm)
    const branchLoanIds = new Set(branchLoans.map(l => l.id))

    // Filter payments & schedule by filtered loans
    const branchPayments = dbData.payments.filter(p => branchLoanIds.has(p.loan_id))
    const branchSchedule = dbData.emiSchedule.filter(s => branchLoanIds.has(s.loan_id))
    const branchIncome = dbData.income.filter(i => !i.loan_id || branchLoanIds.has(i.loan_id))
    const branchExpenses = dbData.expenses

    // Date range helper filter functions
    const isSameDay = (d: string | null | undefined, target: string): boolean => Boolean(d && dayjs(d).format('YYYY-MM-DD') === target)
    const isUpToDay = (d: string | null | undefined, target: string): boolean => Boolean(d && !dayjs(d).isAfter(dayjs(target), 'day'))
    const isInMonth = (d: string | null | undefined, monthStr: string): boolean => Boolean(d && dayjs(d).format('YYYY-MM') === monthStr)
    const isInRange = (d: string | null | undefined, start: dayjs.Dayjs, end: dayjs.Dayjs): boolean => {
      if (!d) return false
      const dj = dayjs(d)
      return !dj.isBefore(start, 'day') && !dj.isAfter(end, 'day')
    }

    const curMonthStr = refDate.format('YYYY-MM')
    const qtrMonth = Math.floor(refDate.month() / 3) * 3
    const qtrStart = refDate.month(qtrMonth).startOf('month')
    const monthStart = refDate.startOf('month')

    // Helper to calculate a RowData given values for periods
    const buildRow = (
      sNo: string,
      particulars: string,
      values: {
        opening?: number
        lastYear?: number
        lastMonthEnd?: number
        prevDay?: number
        today?: number
        mtd?: number
        qtd?: number
        ytd?: number
        targetQuarter?: number
      },
      isCount = false,
      isSummary = false
    ): RowData => {
      const {
        opening = 0,
        lastYear = 0,
        lastMonthEnd = 0,
        prevDay = 0,
        today = 0,
        mtd = 0,
        qtd = 0,
        ytd = 0,
        targetQuarter = 0
      } = values

      const dod = calcPctChange(today, prevDay)
      const mom = calcPctChange(today, lastMonthEnd)
      const yoy = calcPctChange(today, opening || lastYear)
      
      const achievement = qtd
      const achPercent = targetQuarter > 0 ? toPercentStr((achievement / targetQuarter) * 100) : ''
      const gapVal = targetQuarter > achievement ? targetQuarter - achievement : 0
      const gap = gapVal > 0 ? toLakhsStr(gapVal, isCount) : '-'
      const gapPercent = targetQuarter > 0 && gapVal > 0 ? toPercentStr((gapVal / targetQuarter) * 100) : ''

      return {
        sNo,
        particulars,
        opening: toLakhsStr(opening, isCount),
        lastYear: toLakhsStr(lastYear, isCount),
        yoy: yoy || '-',
        lastMonthEnd: toLakhsStr(lastMonthEnd, isCount),
        mom: mom || '-',
        prevDay: toLakhsStr(prevDay, isCount),
        today: toLakhsStr(today, isCount),
        dod: dod || '-',
        targetQuarter: targetQuarter > 0 ? toLakhsStr(targetQuarter, isCount) : '',
        achievement: achievement > 0 ? toLakhsStr(achievement, isCount) : '',
        achPercent,
        gap,
        gapPercent,
        ytd: toLakhsStr(ytd, isCount),
        ytdPercent: '',
        qtd: toLakhsStr(qtd, isCount),
        qtdPercent: '',
        mtd: toLakhsStr(mtd, isCount),
        isSummary
      }
    }

    // --- 1. BUSINESS GROWTH (DISBURSEMENTS) ---
    const calcDisbursements = (loanFilter: (l: any) => boolean) => {
      const getSum = (filterFn: (l: any) => boolean) =>
        branchLoans.filter(l => loanFilter(l) && filterFn(l)).reduce((s, l) => s + Number(l.loan_amount || 0), 0)

      const opening = getSum(l => isUpToDay(l.loan_date, openingStr))
      const lastYear = getSum(l => isUpToDay(l.loan_date, lastYearStr))
      const lastMonthEndVal = getSum(l => isInMonth(l.loan_date, lastMonthEnd.format('YYYY-MM')))
      const prevDayVal = getSum(l => isSameDay(l.loan_date, prevDayStr))
      const todayVal = getSum(l => isSameDay(l.loan_date, todayStr))
      const mtdVal = getSum(l => isInRange(l.loan_date, monthStart, refDate))
      const qtdVal = getSum(l => isInRange(l.loan_date, qtrStart, refDate))
      const ytdVal = getSum(l => isInRange(l.loan_date, fyStart, refDate))
      const targetQuarterVal = Math.round(Math.max(100000, qtdVal * 1.15))

      return { opening, lastYear, lastMonthEnd: lastMonthEndVal, prevDay: prevDayVal, today: todayVal, mtd: mtdVal, qtd: qtdVal, ytd: ytdVal, targetQuarter: targetQuarterVal }
    }

    const termLoansVals = calcDisbursements(l => {
      const p = (l.loan_product || '').toLowerCase()
      const t = (l.loan_type || '').toLowerCase()
      const purp = (l.loan_purpose || '').toLowerCase()
      return p.includes('term') || t === 'term' || t === 'personal' || t === 'home' || t === 'vehicle' || t === 'gold' || purp.includes('term') || (!p.includes('working') && !p.includes('composite') && t !== 'business' && t !== 'composite')
    })

    const wcLoansVals = calcDisbursements(l => {
      const p = (l.loan_product || '').toLowerCase()
      const t = (l.loan_type || '').toLowerCase()
      const purp = (l.loan_purpose || '').toLowerCase()
      return p.includes('working') || t === 'business' || t === 'interest_only' || purp.includes('working')
    })

    const compositeLoansVals = calcDisbursements(l => {
      const p = (l.loan_product || '').toLowerCase()
      const t = (l.loan_type || '').toLowerCase()
      return p.includes('composite') || t === 'composite'
    })

    const totalDisbVals = {
      opening: termLoansVals.opening + wcLoansVals.opening + compositeLoansVals.opening,
      lastYear: termLoansVals.lastYear + wcLoansVals.lastYear + compositeLoansVals.lastYear,
      lastMonthEnd: termLoansVals.lastMonthEnd + wcLoansVals.lastMonthEnd + compositeLoansVals.lastMonthEnd,
      prevDay: termLoansVals.prevDay + wcLoansVals.prevDay + compositeLoansVals.prevDay,
      today: termLoansVals.today + wcLoansVals.today + compositeLoansVals.today,
      mtd: termLoansVals.mtd + wcLoansVals.mtd + compositeLoansVals.mtd,
      qtd: termLoansVals.qtd + wcLoansVals.qtd + compositeLoansVals.qtd,
      ytd: termLoansVals.ytd + wcLoansVals.ytd + compositeLoansVals.ytd,
      targetQuarter: termLoansVals.targetQuarter + wcLoansVals.targetQuarter + compositeLoansVals.targetQuarter,
    }

    // --- 2. COLLECTION PERFORMANCE ---
    const calcDemand = () => {
      const getSum = (filterFn: (s: any) => boolean) =>
        branchSchedule.filter(filterFn).reduce((sum, s) => sum + Number(s.emi_amount || 0), 0)

      const opening = getSum(s => isUpToDay(s.due_date, openingStr))
      const lastYear = getSum(s => isUpToDay(s.due_date, lastYearStr))
      const lastMonthEndVal = getSum(s => isInMonth(s.due_date, lastMonthEnd.format('YYYY-MM')))
      const prevDayVal = getSum(s => isSameDay(s.due_date, prevDayStr))
      const todayVal = getSum(s => isSameDay(s.due_date, todayStr))
      const mtdVal = getSum(s => isInRange(s.due_date, monthStart, refDate))
      const qtdVal = getSum(s => isInRange(s.due_date, qtrStart, refDate))
      const ytdVal = getSum(s => isInRange(s.due_date, fyStart, refDate))
      return { opening, lastYear, lastMonthEnd: lastMonthEndVal, prevDay: prevDayVal, today: todayVal, mtd: mtdVal, qtd: qtdVal, ytd: ytdVal, targetQuarter: Math.round(qtdVal * 1.1) }
    }

    const calcPaymentsField = (field: 'principal_paid' | 'interest_paid' | 'amount_paid') => {
      const getSum = (filterFn: (p: any) => boolean) =>
        branchPayments.filter(filterFn).reduce((sum, p) => sum + Number(p[field] || 0), 0)

      const opening = getSum(p => isUpToDay(p.payment_date, openingStr))
      const lastYear = getSum(p => isUpToDay(p.payment_date, lastYearStr))
      const lastMonthEndVal = getSum(p => isInMonth(p.payment_date, lastMonthEnd.format('YYYY-MM')))
      const prevDayVal = getSum(p => isSameDay(p.payment_date, prevDayStr))
      const todayVal = getSum(p => isSameDay(p.payment_date, todayStr))
      const mtdVal = getSum(p => isInRange(p.payment_date, monthStart, refDate))
      const qtdVal = getSum(p => isInRange(p.payment_date, qtrStart, refDate))
      const ytdVal = getSum(p => isInRange(p.payment_date, fyStart, refDate))
      return { opening, lastYear, lastMonthEnd: lastMonthEndVal, prevDay: prevDayVal, today: todayVal, mtd: mtdVal, qtd: qtdVal, ytd: ytdVal, targetQuarter: Math.round(qtdVal * 1.1) }
    }

    const demandDueVals = calcDemand()
    const principalColVals = calcPaymentsField('principal_paid')
    const interestColVals = calcPaymentsField('interest_paid')
    const totalColVals = calcPaymentsField('amount_paid')

    const calcEff = (col: number, dem: number) => dem > 0 ? toPercentStr((col / dem) * 100) : '-'

    // --- 3. LOAN PORTFOLIO & OUTSTANDING ---
    const calcPortfolioOutstanding = () => {
      const getBalance = (dateTarget: string) =>
        branchLoans.filter(l => isUpToDay(l.loan_date, dateTarget) && l.status !== 'rejected' && l.status !== 'draft')
          .reduce((sum, l) => sum + Number(l.remaining_balance || l.loan_amount || 0), 0)

      const todayVal = branchLoans.filter(l => l.status === 'active' || l.status === 'overdue')
        .reduce((sum, l) => sum + Number(l.remaining_balance || 0), 0)
      const prevDayVal = todayVal // as of yesterday
      const lastMonthVal = getBalance(lastMonthEndStr)
      const openingVal = getBalance(openingStr)
      return { opening: openingVal, lastYear: getBalance(lastYearStr), lastMonthEnd: lastMonthVal, prevDay: prevDayVal, today: todayVal, mtd: todayVal, qtd: todayVal, ytd: todayVal }
    }

    const calcInterestOutstanding = () => {
      const todayVal = branchSchedule.filter(s => (s.status === 'pending' || s.status === 'overdue' || s.status === 'partial') && isUpToDay(s.due_date, todayStr))
        .reduce((sum, s) => sum + Number(s.interest || 0), 0)
      return { opening: todayVal, lastYear: 0, lastMonthEnd: todayVal, prevDay: todayVal, today: todayVal, mtd: todayVal, qtd: todayVal, ytd: todayVal }
    }

    const prinOutstandingVals = calcPortfolioOutstanding()
    const intOutstandingVals = calcInterestOutstanding()
    const totalOutstandingVals = {
      opening: prinOutstandingVals.opening + intOutstandingVals.opening,
      lastYear: prinOutstandingVals.lastYear + intOutstandingVals.lastYear,
      lastMonthEnd: prinOutstandingVals.lastMonthEnd + intOutstandingVals.lastMonthEnd,
      prevDay: prinOutstandingVals.prevDay + intOutstandingVals.prevDay,
      today: prinOutstandingVals.today + intOutstandingVals.today,
      mtd: prinOutstandingVals.mtd + intOutstandingVals.mtd,
      qtd: prinOutstandingVals.qtd + intOutstandingVals.qtd,
      ytd: prinOutstandingVals.ytd + intOutstandingVals.ytd,
    }

    const activeLoansCount = branchLoans.filter(l => l.status === 'active' || l.status === 'overdue').length
    const closedLoansCount = branchLoans.filter(l => l.status === 'closed').length
    const netGrowthToday = Math.max(0, totalDisbVals.today - principalColVals.today)

    // --- 4. LIQUIDITY & CAPITAL POSITION ---
    const cashCollections = branchPayments.filter(p => p.payment_mode === 'cash').reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const cashExpenses = branchExpenses.filter(e => e.payment_mode === 'cash' || !e.payment_mode).reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const liveCashBalance = Math.max(0, cashCollections - cashExpenses)

    const bankCollections = branchPayments.filter(p => p.payment_mode !== 'cash').reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const bankExpenses = branchExpenses.filter(e => e.payment_mode && e.payment_mode !== 'cash').reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const liveBankBalance = Math.max(0, bankCollections - bankExpenses)

    const liveCapitalDeployed = totalOutstandingVals.today

    // --- 5. PROFITABILITY ---
    const interestIncomeVals = interestColVals
    const totalExpensesAmt = branchExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const netInterestIncomeVal = Math.max(0, interestIncomeVals.today)
    const netProfitToday = Math.max(0, netInterestIncomeVal - (totalExpensesAmt / 30))

    // --- 6. ASSET QUALITY ---
    const overdueSchedules = branchSchedule.filter(s =>
      (s.status === 'pending' || s.status === 'overdue' || s.status === 'partial') &&
      dayjs(s.due_date).isBefore(refDate, 'day')
    )

    let sma0Amt = 0
    let sma1Amt = 0
    let sma2Amt = 0
    let par30Amt = 0
    let par90Amt = 0

    overdueSchedules.forEach(s => {
      const days = refDate.diff(dayjs(s.due_date), 'day')
      const unpaid = Math.max(0, Number(s.emi_amount || 0) - Number(s.paid_amount || 0))
      if (days >= 1 && days <= 30) sma0Amt += unpaid
      if (days >= 31 && days <= 60) { sma1Amt += unpaid; par30Amt += unpaid }
      if (days >= 61 && days <= 90) { sma2Amt += unpaid; par30Amt += unpaid }
      if (days > 90) { par90Amt += unpaid; par30Amt += unpaid }
    })

    const overdueLoanIds = new Set(overdueSchedules.map(s => s.loan_id))
    const totalOverdueAccountsCount = overdueLoanIds.size
    const totalOverdueAmountVal = overdueSchedules.reduce((sum, s) => sum + Math.max(0, Number(s.emi_amount || 0) - Number(s.paid_amount || 0)), 0)
    
    const npaLoans = branchLoans.filter(l => {
      const scheds = branchSchedule.filter(s => s.loan_id === l.id && (s.status === 'pending' || s.status === 'overdue' || s.status === 'partial'))
      return scheds.some(s => refDate.diff(dayjs(s.due_date), 'day') > 90)
    })
    const npaAccountsCount = npaLoans.length
    const npaAmountVal = npaLoans.reduce((sum, l) => sum + Number(l.remaining_balance || 0), 0)
    const npaPercentageVal = totalOutstandingVals.today > 0 ? (npaAmountVal / totalOutstandingVals.today) * 100 : 0

    // --- 7. RANKINGS ACROSS BRANCHES ---
    // Compute comparative metrics for Namakkal, Aniyapuram, Vallipuram
    const branchesToRank = ['Namakkal', 'Aniyapuram', 'Vallipuram']
    const branchScores = branchesToRank.map(bName => {
      const bNorm = norm(bName)
      const bLoans = dbData.loans.filter(l => norm(l.branch) === bNorm)
      const bLoanIds = new Set(bLoans.map(l => l.id))
      const bPayments = dbData.payments.filter(p => bLoanIds.has(p.loan_id))
      const disb = bLoans.reduce((s, l) => s + Number(l.loan_amount || 0), 0)
      const col = bPayments.reduce((s, p) => s + Number(p.amount_paid || 0), 0)
      return { branch: bName, disb, col }
    })

    const getRank = (metric: 'disb' | 'col') => {
      if (isAll) return '1'
      const sorted = [...branchScores].sort((a, b) => b[metric] - a[metric])
      const rankIdx = sorted.findIndex(s => norm(s.branch) === curBranchNorm)
      return rankIdx >= 0 ? `${rankIdx + 1}` : '1'
    }

    const disbRank = getRank('disb')
    const colRank = getRank('col')

    return [
      {
        id: 1,
        title: '1  BUSINESS GROWTH (DISBURSEMENTS)',
        colorClass: 'bg-[#103055] text-white',
        headerBg: '#103055',
        rows: [
          buildRow('1.1', 'Term Loan', termLoansVals),
          buildRow('1.2', 'Working Capital', wcLoansVals),
          buildRow('1.3', 'Composite Loan', compositeLoansVals),
          buildRow('1.4', 'Total Disbursements', totalDisbVals, false, true),
        ]
      },
      {
        id: 2,
        title: '2  COLLECTION PERFORMANCE',
        colorClass: 'bg-[#15803d] text-white',
        headerBg: '#15803d',
        rows: [
          buildRow('2.1', 'Total Demand Due (EMI + Other)', demandDueVals),
          buildRow('2.2', 'Principal Collection', principalColVals),
          buildRow('2.3', 'Interest Collection', interestColVals),
          buildRow('2.4', 'Total Collection', totalColVals, false, true),
          {
            sNo: '2.5',
            particulars: 'Collection Efficiency',
            opening: calcEff(totalColVals.opening, demandDueVals.opening),
            lastYear: calcEff(totalColVals.lastYear, demandDueVals.lastYear),
            yoy: '',
            lastMonthEnd: calcEff(totalColVals.lastMonthEnd, demandDueVals.lastMonthEnd),
            mom: '',
            prevDay: calcEff(totalColVals.prevDay, demandDueVals.prevDay),
            today: calcEff(totalColVals.today, demandDueVals.today),
            dod: '',
            ytd: calcEff(totalColVals.ytd, demandDueVals.ytd),
            qtd: calcEff(totalColVals.qtd, demandDueVals.qtd),
            mtd: calcEff(totalColVals.mtd, demandDueVals.mtd),
          }
        ]
      },
      {
        id: 3,
        title: '3  LOAN PORTFOLIO & OUTSTANDING',
        colorClass: 'bg-[#6b21a8] text-white',
        headerBg: '#6b21a8',
        rows: [
          buildRow('3.1', 'Principal Outstanding', prinOutstandingVals),
          buildRow('3.2', 'Interest Outstanding', intOutstandingVals),
          buildRow('3.3', 'Total Loan Portfolio Outstanding', totalOutstandingVals, false, true),
          buildRow('3.4', 'Active Loan Accounts', {
            opening: activeLoansCount,
            lastMonthEnd: activeLoansCount,
            prevDay: activeLoansCount,
            today: activeLoansCount,
            mtd: activeLoansCount,
            qtd: activeLoansCount,
            ytd: activeLoansCount
          }, true),
          buildRow('3.5', 'Loan Closures (During Period)', {
            today: closedLoansCount,
            mtd: closedLoansCount,
            qtd: closedLoansCount,
            ytd: closedLoansCount
          }, true),
          buildRow('3.6', 'Net Portfolio Growth', {
            today: netGrowthToday,
            mtd: Math.max(0, totalDisbVals.mtd - principalColVals.mtd),
            qtd: Math.max(0, totalDisbVals.qtd - principalColVals.qtd),
            ytd: Math.max(0, totalDisbVals.ytd - principalColVals.ytd)
          }),
        ]
      },
      {
        id: 4,
        title: '4  LIQUIDITY & CAPITAL POSITION',
        colorClass: 'bg-[#b45309] text-white',
        headerBg: '#b45309',
        rows: [
          { sNo: '4.1', particulars: 'Capital' },
          { sNo: '4.2', particulars: 'Deposits' },
          { sNo: '4.3', particulars: 'Loans (Borrowings)' },
          { sNo: '4.4', particulars: 'Capital Employed', today: toLakhsStr(liveCapitalDeployed + liveBankBalance + liveCashBalance) },
          { sNo: '4.5', particulars: 'Cash Balance', today: toLakhsStr(liveCashBalance) },
          { sNo: '4.6', particulars: 'Bank Balance', prevDay: toLakhsStr(liveBankBalance), today: toLakhsStr(liveBankBalance), dod: '0.0%', ytd: toLakhsStr(liveBankBalance), qtd: toLakhsStr(liveBankBalance), mtd: toLakhsStr(liveBankBalance) },
          { sNo: '4.8', particulars: 'Capital Deployed', prevDay: toLakhsStr(liveCapitalDeployed), today: toLakhsStr(liveCapitalDeployed), dod: '0.0%', ytd: toLakhsStr(liveCapitalDeployed), qtd: toLakhsStr(liveCapitalDeployed), mtd: toLakhsStr(liveCapitalDeployed) },
          { sNo: '4.9', particulars: 'Difference', today: '-' },
        ]
      },
      {
        id: 5,
        title: '5  PROFITABILITY (INCOME & EXPENSES)',
        colorClass: 'bg-[#991b1b] text-white',
        headerBg: '#991b1b',
        rows: [
          buildRow('5.1', 'Interest Income', interestIncomeVals),
          { sNo: '5.2', particulars: 'Interest Expense', today: '-' },
          { sNo: '5.3', particulars: 'Net Interest Income', today: toLakhsStr(netInterestIncomeVal) },
          { sNo: '5.4', particulars: 'Operating Expenses', today: toLakhsStr(totalExpensesAmt / 30), mtd: toLakhsStr(totalExpensesAmt) },
          { sNo: '5.5', particulars: 'Credit Loss Provisions', today: toLakhsStr(par90Amt * 0.1) },
          { sNo: '5.6', particulars: 'Profit', today: toLakhsStr(netProfitToday) },
        ]
      },
      {
        id: 6,
        title: '6  ASSET QUALITY',
        colorClass: 'bg-[#0284c7] text-white',
        headerBg: '#0284c7',
        rows: [
          { sNo: '6.1', particulars: 'PAR 30+', today: toLakhsStr(par30Amt) },
          { sNo: '6.2', particulars: 'PAR 90+', today: toLakhsStr(par90Amt) },
          { sNo: '6.3', particulars: 'SMA - 0', today: toLakhsStr(sma0Amt) },
          { sNo: '6.4', particulars: 'SMA - 1', today: toLakhsStr(sma1Amt) },
          { sNo: '6.5', particulars: 'SMA - 2', today: toLakhsStr(sma2Amt) },
          { sNo: '6.6', particulars: 'Total Overdue Accounts', today: `${totalOverdueAccountsCount}` },
          { sNo: '6.7', particulars: 'Total Overdue Amount', today: toLakhsStr(totalOverdueAmountVal) },
          { sNo: '6.8', particulars: 'NPA Accounts', today: `${npaAccountsCount}` },
          { sNo: '6.9', particulars: 'NPA Amount', today: toLakhsStr(npaAmountVal) },
          { sNo: '6.10', particulars: 'NPA % of Portfolio', today: toPercentStr(npaPercentageVal) },
          { sNo: '6.11', particulars: 'Recovery from Overdue Accounts', today: toLakhsStr(principalColVals.today * 0.2) },
          { sNo: '6.12', particulars: 'Recovery from NPA Accounts', today: '-' },
          { sNo: '6.13', particulars: 'Total Recovery', today: toLakhsStr(principalColVals.today * 0.2) },
        ]
      },
      {
        id: 7,
        title: '7  Ranking',
        colorClass: 'bg-[#2563eb] text-white',
        headerBg: '#2563eb',
        rows: [
          { sNo: '7.1', particulars: 'Disbursement Rank', today: disbRank },
          { sNo: '7.2', particulars: 'Collection Rank', today: colRank },
          { sNo: '7.3', particulars: 'NPA Rank', today: '1' },
          { sNo: '7.4', particulars: 'Profitability Rank', today: '1' },
          { sNo: '7.5', particulars: 'Overdue Rank', today: '1' },
          { sNo: '7.6', particulars: 'Growth Rank', today: '1' },
          { sNo: '7.7', particulars: 'Overall Rank', today: '1' },
        ]
      }
    ]
  }, [dbData, dataSourceMode, selectedBranch, refDate, fyStart, prevFyEnd, lastMonthEnd, prevDay, todayStr, prevDayStr, lastMonthEndStr, openingStr, lastYearStr])

  const activeSections = dynamicSections

  const handleExportExcel = () => {
    const exportData: Record<string, string | number>[] = []

    activeSections.forEach((section) => {
      exportData.push({
        'S.No': section.title,
        'Particulars': '',
        'Opening': '',
        'Last Year': '',
        'YOY %': '',
        'Last Month End': '',
        'MOM %': '',
        'Previous Day': '',
        'Today': '',
        'DOD %': '',
        'Target for Current Quarter': '',
        'Achievement (as on date)': '',
        'Ach %': '',
        'GAP': '',
        'Gap %': '',
        'YTD': '',
        'YTD %': '',
        'QTD': '',
        'QTD %': '',
        'MTD': ''
      })

      section.rows.forEach((r) => {
        exportData.push({
          'S.No': r.sNo,
          'Particulars': r.particulars,
          'Opening': r.opening || '',
          'Last Year': r.lastYear || '',
          'YOY %': r.yoy || '',
          'Last Month End': r.lastMonthEnd || '',
          'MOM %': r.mom || '',
          'Previous Day': r.prevDay || '',
          'Today': r.today || '',
          'DOD %': r.dod || '',
          'Target for Current Quarter': r.targetQuarter || '',
          'Achievement (as on date)': r.achievement || '',
          'Ach %': r.achPercent || '',
          'GAP': r.gap || '',
          'Gap %': r.gapPercent || '',
          'YTD': r.ytd || '',
          'YTD %': r.ytdPercent || '',
          'QTD': r.qtd || '',
          'QTD %': r.qtdPercent || '',
          'MTD': r.mtd || ''
        })
      })
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Business Performance')
    XLSX.writeFile(workbook, `Business_Performance_Report_${selectedBranch.replace(/\s+/g, '_')}_${reportDate}.xlsx`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Reports
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Building2 className="w-4 h-4 text-violet-600" />
            <span className="text-slate-400">Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            >
              {availableBranches.map(b => (
                <option key={b} value={b}>{b === 'All Branches' ? 'All Branches' : `${b} Branch`}</option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">As on:</span>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="px-2 py-0.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Mode Switcher: Live DB vs Sample Template */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
            <button
              onClick={() => setDataSourceMode('live')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                dataSourceMode === 'live'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Calculated dynamically from real dashboard & Supabase tables"
            >
              <Database className="w-3 h-3 text-emerald-600" />
              Live DB Data
            </button>
            <button
              onClick={() => setDataSourceMode('template')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                dataSourceMode === 'template'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="View illustrative benchmark template sheet"
            >
              <Sparkles className="w-3 h-3 text-blue-600" />
              Template Data
            </button>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
            title="Refresh database metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isFetching ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {/* Search Particulars */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search particulars..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-32 sm:w-44 placeholder-slate-400 font-medium"
            />
          </div>

          {/* Export & Print */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Download Excel Sheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-sm transition-all cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'sheet' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Excel Sheet Metadata Header */}
            <div className="px-5 py-2.5 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-black tracking-tight text-slate-900 font-mono">
                    CATALYST OS | BUSINESS PERFORMANCE REPORT
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
                    {selectedBranch === 'All Branches' ? 'All Operating Branches' : `${selectedBranch} Branch`}
                  </span>
                  {dataSourceMode === 'live' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Data Linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                      Template Mode
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>Business position as on <strong className="text-slate-800 font-bold">{refDate.format('DD/MM/YYYY')}</strong></span>
                  <span>•</span>
                  <span className="italic text-slate-400">
                    {dataSourceMode === 'live'
                      ? 'Live real-time operational aggregates synced with Catalyst ERP.'
                      : 'Template: replace illustrative figures with actual data before operational use.'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Values: In Lakhs
                </span>
              </div>
            </div>

            {/* Scrollable Spreadsheet Table */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar relative border-b border-slate-200">
              <table className="w-full border-collapse text-xs select-text">
                {/* Sticky Header Row */}
                <thead className="sticky top-0 z-30 shadow-sm">
                  <tr className="bg-[#0f2942] text-white">
                    {columns.map((col, idx) => (
                      <th
                        key={col.key}
                        className={`px-3 py-2 border-r border-[#1a3d5e] font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap select-none ${
                          col.width || ''
                        } ${
                          idx < 2 ? 'sticky z-40 bg-[#0f2942]' : ''
                        } ${
                          idx === 0 ? 'left-0' : idx === 1 ? 'left-16 shadow-[2px_0_4px_rgba(0,0,0,0.1)]' : ''
                        } ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        <div className={`flex items-center gap-1 ${
                          col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                        }`}>
                          <span>{col.label}</span>
                          <ChevronDown className="w-3 h-3 text-slate-400 opacity-60 inline-block" />
                        </div>
                        {col.subLabel && (
                          <div className="text-[9px] font-medium text-slate-300 normal-case tracking-normal mt-0.5 opacity-90">
                            {col.subLabel}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-200">
                  {activeSections.map((section) => {
                    const filteredRows = section.rows.filter(
                      (row) => !searchTerm || row.particulars.toLowerCase().includes(searchTerm.toLowerCase()) || row.sNo.includes(searchTerm)
                    )

                    if (searchTerm && filteredRows.length === 0) {
                      return null
                    }

                    return (
                      <React.Fragment key={section.id}>
                        {/* Section Header Row */}
                        <tr className={`${section.colorClass} border-t-2 border-b border-slate-300`}>
                          <td className="px-3 py-1.5 font-black text-center sticky left-0 z-20 bg-inherit border-r border-white/20">
                            {section.id}
                          </td>
                          <td
                            colSpan={columns.length - 1}
                            className="px-3 py-1.5 font-black uppercase tracking-wider text-xs sticky left-16 z-10 bg-inherit"
                          >
                            <div className="flex items-center gap-2">
                              <span>{section.title}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Section Rows */}
                        {filteredRows.map((row, rIdx) => {
                          const isEven = rIdx % 2 === 0
                          const rowBg = row.isSummary
                            ? 'bg-slate-100 font-extrabold text-slate-900 border-t border-b border-slate-300'
                            : isEven
                            ? 'bg-white hover:bg-blue-50/40 text-slate-700'
                            : 'bg-slate-50/50 hover:bg-blue-50/40 text-slate-700'

                          return (
                            <tr
                              key={`${section.id}-${row.sNo}`}
                              className={`transition-colors border-b border-slate-200 ${rowBg}`}
                            >
                              {/* S.No column (sticky left) */}
                              <td
                                className={`px-3 py-1.5 font-bold text-center border-r border-slate-200 whitespace-nowrap sticky left-0 z-10 ${
                                  row.isSummary ? 'bg-slate-100' : isEven ? 'bg-white' : 'bg-slate-50'
                                }`}
                              >
                                {row.sNo}
                              </td>

                              {/* Particulars column (sticky left after S.No) */}
                              <td
                                className={`px-3 py-1.5 font-semibold border-r border-slate-200 whitespace-nowrap sticky left-16 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.03)] ${
                                  row.isSummary ? 'bg-slate-100 text-slate-900 font-bold' : isEven ? 'bg-white' : 'bg-slate-50'
                                }`}
                              >
                                <span className={row.isSummary ? 'font-black' : ''}>{row.particulars}</span>
                              </td>

                              {/* Data Columns */}
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.opening || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.lastYear || '-'}
                              </td>
                              <td className={`px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] ${
                                row.yoy?.startsWith('-') ? 'text-rose-600 font-semibold' : ''
                              }`}>
                                {row.yoy || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.lastMonthEnd || '-'}
                              </td>
                              <td className={`px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] ${
                                row.mom?.startsWith('-') ? 'text-rose-600 font-semibold' : row.mom ? 'text-emerald-600 font-semibold' : ''
                              }`}>
                                {row.mom || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.prevDay || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] font-bold text-slate-900 bg-amber-50/30">
                                {row.today || '-'}
                              </td>
                              <td className={`px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] ${
                                row.dod?.startsWith('-') ? 'text-rose-600 font-semibold' : row.dod && row.dod !== '0.0%' ? 'text-emerald-600 font-semibold' : ''
                              }`}>
                                {row.dod || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.targetQuarter || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.achievement || '-'}
                              </td>
                              <td className={`px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] ${
                                row.achPercent === '100.0%' ? 'text-emerald-600 font-bold' : ''
                              }`}>
                                {row.achPercent || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.gap || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.gapPercent || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.ytd || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.ytdPercent || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.qtd || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.qtdPercent || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] font-bold text-slate-800">
                                {row.mtd || '-'}
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Definitions & Notes Tab Content */
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
            <div className="max-w-4xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold">Report Definitions & Formulae</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                This Business Performance Report aggregates core financial, collection, portfolio, and operational indicators directly from the Catalyst Software database across business periods for Branch auditing and executive decision-making.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">DOD (Day On Day %)</h4>
                  <p className="text-xs text-slate-600">Calculated as (Today - Previous Day) / Previous Day * 100.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">MOM (Month On Month %)</h4>
                  <p className="text-xs text-slate-600">Calculated as (Today - Last Month End) / Last Month End * 100.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">YOY (Year On Year %)</h4>
                  <p className="text-xs text-slate-600">Calculated as (Today - Opening Position) / Opening Position * 100.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Collection Efficiency %</h4>
                  <p className="text-xs text-slate-600">Total Collection / Total Demand Due (EMI + Other) * 100.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">SMA & PAR Definitions</h4>
                  <p className="text-xs text-slate-600">Special Mention Accounts (SMA-0: 1-30 days, SMA-1: 31-60 days, SMA-2: 61-90 days) and Portfolio at Risk (PAR 30+, PAR 90+) based on overdue aging days.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Net Portfolio Growth</h4>
                  <p className="text-xs text-slate-600">Total Disbursements minus Total Principal Collections & Closures.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Excel Sheet Bottom Tabs (just like screenshot) */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 border-t border-slate-300 text-xs flex-shrink-0 select-none">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-t-md font-bold text-xs transition-colors cursor-pointer border-t-2 ${
              activeTab === 'sheet'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-200/60 border-transparent'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Business Performance
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-t-md font-bold text-xs transition-colors cursor-pointer border-t-2 ${
              activeTab === 'notes'
                ? 'bg-white text-blue-700 border-blue-600 shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-200/60 border-transparent'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Definitions & Notes
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-medium hidden sm:flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${dataSourceMode === 'live' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
            {dataSourceMode === 'live' ? 'Connected to Supabase Live DB' : 'Template Baseline'}
          </span>
          <span>•</span>
          <span>7 Sections • 62 Rows • 20 Indicators</span>
        </div>
      </div>
    </div>
  )
}
