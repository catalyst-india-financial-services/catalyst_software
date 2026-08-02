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
  type: 'flat' | 'reducing'
): number {
  if (type === 'flat') {
    const totalInterest = (principal * annualRate * months) / (12 * 100)
    return Math.ceil((principal + totalInterest) / months)
  }
  // Reducing balance
  const monthlyRate = annualRate / (12 * 100)
  if (monthlyRate === 0) return Math.ceil(principal / months)
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  return Math.ceil(emi)
}

export function generateEMISchedule(
  principal: number,
  annualRate: number,
  months: number,
  startDate: string,
  type: 'flat' | 'reducing'
) {
  const schedule = []
  const emi = calculateEMI(principal, annualRate, months, type)
  let balance = principal

  for (let i = 1; i <= months; i++) {
    const dueDate = dayjs(startDate).add(i, 'month').format('YYYY-MM-DD')
    let interest: number
    let principalPart: number

    if (type === 'flat') {
      interest = (principal * annualRate) / (12 * 100)
      principalPart = principal / months
    } else {
      const monthlyRate = annualRate / (12 * 100)
      interest = balance * monthlyRate
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
