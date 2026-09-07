import dayjs from 'dayjs'

export type LoanStructureType = 'regular' | 'interest_only' | 'composite'

export interface CompositePhase {
  phase_number: number
  phase_name: string
  phase_type: 'interest_only' | 'regular'
  tenure_months: number
  monthly_roi: number
}

export interface CalculatedScheduleItem {
  emi_number: number
  phase?: string
  due_date: string
  principal: number        // Principal installment (EMI column in spreadsheet)
  interest: number         // Interest amount
  emi_amount: number       // Total demand = Principal + Interest
  outstanding_balance: number // Principal O/s before this installment
  status: 'pending'
}

export interface ScheduleCalculationResult {
  schedule: CalculatedScheduleItem[]
  totalPrincipal: number
  totalInterest: number
  totalDemand: number
  totalTenureMonths: number
  maturityDate: string
}

export const DEFAULT_COMPOSITE_PHASES: CompositePhase[] = [
  {
    phase_number: 1,
    phase_name: 'Phase 1',
    phase_type: 'interest_only',
    tenure_months: 5,
    monthly_roi: 2,
  },
  {
    phase_number: 2,
    phase_name: 'Phase 2',
    phase_type: 'regular',
    tenure_months: 25,
    monthly_roi: 1,
  },
]

/**
 * Calculates loan schedule matching the 3 structures from the specification spreadsheet:
 * 1. Regular Loan:
 *    - Given Loan Amount (e.g. 100,000), Tenure (e.g. 25), Monthly ROI (e.g. 1%).
 *    - Principal EMI per month = Loan Amount / Tenure (e.g. 4,000).
 *    - Interest per month = Loan Amount * (Monthly ROI / 100) (e.g. 1,000).
 *    - Total installment = 5,000.
 *    - Principal O/s starts at Loan Amount and decreases by Principal EMI each month.
 *
 * 2. Interest Loan:
 *    - Given Loan Amount (e.g. 100,000), Tenure (e.g. 25), Monthly ROI (e.g. 2%).
 *    - Principal EMI = 0 (bullet at maturity).
 *    - Interest per month = Loan Amount * (Monthly ROI / 100) (e.g. 2,000).
 *    - Principal O/s remains at Loan Amount (100,000) for all installments.
 *
 * 3. Composite Loan:
 *    - Phase 1 (e.g. 5 months @ 2% ROI): Interest-only (Principal O/s = 100,000, Interest = 2,000, Principal EMI = 0).
 *    - Phase 2 (e.g. 25 months @ 1% ROI): Regular Loan (Principal O/s starts at 100,000 reducing by 4,000 each month, Interest = 1,000, Principal EMI = 4,000).
 */
export function calculateLoanSchedule(params: {
  loanAmount: number
  loanStructureType: LoanStructureType
  tenureMonths: number
  monthlyRoi: number
  startDate: string
  frequency?: 'monthly' | 'weekly' | 'fortnightly'
  phases?: CompositePhase[]
}): ScheduleCalculationResult {
  const {
    loanAmount,
    loanStructureType,
    tenureMonths,
    monthlyRoi,
    startDate,
    phases = DEFAULT_COMPOSITE_PHASES,
  } = params

  const principal = Math.max(0, loanAmount || 0)
  const schedule: CalculatedScheduleItem[] = []
  const startDay = dayjs(startDate || dayjs().format('YYYY-MM-DD'))

  if (principal <= 0) {
    return {
      schedule: [],
      totalPrincipal: 0,
      totalInterest: 0,
      totalDemand: 0,
      totalTenureMonths: tenureMonths || 0,
      maturityDate: '',
    }
  }

  // 1. REGULAR LOAN
  if (loanStructureType === 'regular') {
    const N = Math.max(1, tenureMonths || 1)
    const basePrincipalEMI = Math.floor(principal / N)
    const remainder = principal - (basePrincipalEMI * N)
    const interestPerMonth = Math.round(principal * (monthlyRoi / 100))

    let currentOutstanding = principal
    for (let i = 1; i <= N; i++) {
      const isLast = i === N
      // Add remainder to last installment so total principal matches exactly
      const principalEMI = isLast ? basePrincipalEMI + remainder : basePrincipalEMI
      const dueDate = startDay.add(i, 'month').format('YYYY-MM-DD')

      schedule.push({
        emi_number: i,
        due_date: dueDate,
        principal: principalEMI,
        interest: interestPerMonth,
        emi_amount: principalEMI + interestPerMonth,
        outstanding_balance: currentOutstanding,
        status: 'pending',
      })

      currentOutstanding = Math.max(0, currentOutstanding - principalEMI)
    }

    const totalPrincipal = schedule.reduce((sum, item) => sum + item.principal, 0)
    const totalInterest = schedule.reduce((sum, item) => sum + item.interest, 0)

    return {
      schedule,
      totalPrincipal,
      totalInterest,
      totalDemand: totalPrincipal + totalInterest,
      totalTenureMonths: N,
      maturityDate: schedule[schedule.length - 1]?.due_date || '',
    }
  }

  // 2. INTEREST LOAN
  if (loanStructureType === 'interest_only') {
    const N = Math.max(1, tenureMonths || 1)
    const interestPerMonth = Math.round(principal * (monthlyRoi / 100))

    for (let i = 1; i <= N; i++) {
      const dueDate = startDay.add(i, 'month').format('YYYY-MM-DD')
      schedule.push({
        emi_number: i,
        due_date: dueDate,
        principal: 0,
        interest: interestPerMonth,
        emi_amount: interestPerMonth,
        outstanding_balance: principal, // Remains full principal for every installment
        status: 'pending',
      })
    }

    const totalInterest = schedule.reduce((sum, item) => sum + item.interest, 0)

    return {
      schedule,
      totalPrincipal: principal,
      totalInterest,
      totalDemand: principal + totalInterest,
      totalTenureMonths: N,
      maturityDate: schedule[schedule.length - 1]?.due_date || '',
    }
  }

  // 3. COMPOSITE LOAN
  const activePhases = phases.length > 0 ? phases : DEFAULT_COMPOSITE_PHASES
  let overallEmiNumber = 0
  let cumulativeMonthOffset = 0
  let currentOutstanding = principal

  activePhases.forEach((phase) => {
    const phaseTenure = Math.max(1, phase.tenure_months || 1)
    const phaseRoi = phase.monthly_roi ?? 1
    const phaseInterest = Math.round(principal * (phaseRoi / 100))

    if (phase.phase_type === 'interest_only') {
      // Interest-only phase
      for (let p = 1; p <= phaseTenure; p++) {
        overallEmiNumber++
        cumulativeMonthOffset++
        const dueDate = startDay.add(cumulativeMonthOffset, 'month').format('YYYY-MM-DD')

        schedule.push({
          emi_number: overallEmiNumber,
          phase: phase.phase_name || `Phase ${phase.phase_number}`,
          due_date: dueDate,
          principal: 0,
          interest: phaseInterest,
          emi_amount: phaseInterest,
          outstanding_balance: currentOutstanding,
          status: 'pending',
        })
      }
    } else {
      // Regular amortization phase
      const basePrincipalEMI = Math.floor(currentOutstanding / phaseTenure)
      const remainder = currentOutstanding - (basePrincipalEMI * phaseTenure)

      for (let p = 1; p <= phaseTenure; p++) {
        overallEmiNumber++
        cumulativeMonthOffset++
        const isLast = p === phaseTenure
        const principalEMI = isLast ? basePrincipalEMI + remainder : basePrincipalEMI
        const dueDate = startDay.add(cumulativeMonthOffset, 'month').format('YYYY-MM-DD')

        schedule.push({
          emi_number: overallEmiNumber,
          phase: phase.phase_name || `Phase ${phase.phase_number}`,
          due_date: dueDate,
          principal: principalEMI,
          interest: phaseInterest,
          emi_amount: principalEMI + phaseInterest,
          outstanding_balance: currentOutstanding,
          status: 'pending',
        })

        currentOutstanding = Math.max(0, currentOutstanding - principalEMI)
      }
    }
  })

  const totalPrincipal = schedule.reduce((sum, item) => sum + item.principal, 0)
  const totalInterest = schedule.reduce((sum, item) => sum + item.interest, 0)

  return {
    schedule,
    totalPrincipal: totalPrincipal > 0 ? totalPrincipal : principal,
    totalInterest,
    totalDemand: (totalPrincipal > 0 ? totalPrincipal : principal) + totalInterest,
    totalTenureMonths: cumulativeMonthOffset,
    maturityDate: schedule[schedule.length - 1]?.due_date || '',
  }
}
