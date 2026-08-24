import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num)
}

export function formatDate(date: string | Date, format = 'DD MMM YYYY'): string {
  return dayjs(date).format(format)
}

export function formatDateTime(date: string | Date): string {
  return dayjs(date).format('DD MMM YYYY, hh:mm A')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export function calculateEMI(
  principal: number,
  annualRate: number,
  months: number,
  type: 'flat' | 'reducing',
  frequency: 'monthly' | 'weekly' | 'fortnightly' = 'monthly'
): number {
  let N = months
  let ratePerPeriod = annualRate / (12 * 100)

  if (frequency === 'weekly') {
    N = months * 4
    ratePerPeriod = annualRate / (52 * 100)
  } else if (frequency === 'fortnightly') {
    N = months * 2
    ratePerPeriod = annualRate / (26 * 100)
  }

  if (type === 'flat') {
    const totalInterest = (principal * annualRate * months) / (12 * 100)
    return Math.ceil((principal + totalInterest) / N)
  }

  // Reducing balance
  if (ratePerPeriod === 0) return Math.ceil(principal / N)
  const emi =
    (principal * ratePerPeriod * Math.pow(1 + ratePerPeriod, N)) /
    (Math.pow(1 + ratePerPeriod, N) - 1)
  return Math.ceil(emi)
}

export function generateEMISchedule(
  principal: number,
  annualRate: number,
  months: number,
  startDate: string,
  type: 'flat' | 'reducing',
  frequency: 'monthly' | 'weekly' | 'fortnightly' = 'monthly'
) {
  const schedule = []
  const emi = calculateEMI(principal, annualRate, months, type, frequency)
  let balance = principal

  let N = months
  let ratePerPeriod = annualRate / (12 * 100)

  if (frequency === 'weekly') {
    N = months * 4
    ratePerPeriod = annualRate / (52 * 100)
  } else if (frequency === 'fortnightly') {
    N = months * 2
    ratePerPeriod = annualRate / (26 * 100)
  }

  for (let i = 1; i <= N; i++) {
    let dueDate: string
    if (frequency === 'weekly') {
      dueDate = dayjs(startDate).add(i, 'week').format('YYYY-MM-DD')
    } else if (frequency === 'fortnightly') {
      dueDate = dayjs(startDate).add(i * 2, 'week').format('YYYY-MM-DD')
    } else {
      dueDate = dayjs(startDate).add(i, 'month').format('YYYY-MM-DD')
    }

    let interest: number
    let principalPart: number

    if (type === 'flat') {
      interest = (principal * annualRate) / (12 * 100 * (frequency === 'weekly' ? 4.33 : frequency === 'fortnightly' ? 2.16 : 1)) // roughly distribute interest
      interest = (principal * annualRate * months) / (12 * 100 * N)
      principalPart = principal / N
    } else {
      interest = balance * ratePerPeriod
      principalPart = emi - interest
    }

    balance = Math.max(0, balance - principalPart)

    schedule.push({
      emi_number: i,
      due_date: dueDate,
      emi_amount: emi,
      principal: Math.ceil(principalPart),
      interest: Math.ceil(interest),
      outstanding_balance: Math.ceil(balance),
      status: 'pending' as const,
    })
  }

  return schedule
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'badge-active',
    closed: 'badge-closed',
    overdue: 'badge-overdue',
    pending: 'badge-pending',
    paid: 'badge-active',
    partial: 'badge-pending',
  }
  return map[status] ?? 'badge-closed'
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str
}

export function maskAadhaar(aadhaar: string): string {
  return 'XXXX XXXX ' + aadhaar.slice(-4)
}

export function maskPAN(pan: string): string {
  return pan.slice(0, 2) + 'XXXXXX' + pan.slice(-2)
}
