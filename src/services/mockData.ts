import type { Customer, Loan, EMIPayment, Income, Expense, Notification, DashboardStats, ChartDataPoint } from '@/types'
import dayjs from 'dayjs'

// ─── Customers ────────────────────────────────────────────────────────────────
export const mockCustomers: Customer[] = [
  { id: '1', customer_id: 'CUS001', name: 'Rajesh Kumar', mobile: '9876543210', whatsapp: '9876543210', address: '45, MG Road', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', occupation: 'Business', company: 'Kumar Traders', monthly_income: 85000, aadhaar: '1234 5678 9012', pan: 'ABCDE1234F', status: 'active', kyc_status: 'verified', created_at: '2024-01-15T10:30:00Z', updated_at: '2024-06-20T10:30:00Z', sync_status: 'synced' },
  { id: '2', customer_id: 'CUS002', name: 'Priya Sharma', mobile: '9988776655', whatsapp: '9988776655', address: '12, Anna Nagar', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001', occupation: 'Service', company: 'TCS Ltd', monthly_income: 60000, aadhaar: '9876 5432 1098', pan: 'FGHIJ5678K', status: 'active', kyc_status: 'verified', created_at: '2024-02-10T09:00:00Z', updated_at: '2024-07-01T09:00:00Z', sync_status: 'synced' },
  { id: '3', customer_id: 'CUS003', name: 'Mohammed Ali', mobile: '9123456789', whatsapp: '9123456789', address: '7, Park Street', city: 'Madurai', state: 'Tamil Nadu', pincode: '625001', occupation: 'Business', company: 'Ali Fabrics', monthly_income: 120000, aadhaar: '4567 8901 2345', pan: 'KLMNO9012P', status: 'active', kyc_status: 'verified', created_at: '2024-03-05T11:00:00Z', updated_at: '2024-07-10T11:00:00Z', sync_status: 'synced' },
  { id: '4', customer_id: 'CUS004', name: 'Lakshmi Devi', mobile: '9654321098', whatsapp: '9654321098', address: '23, Gandhi Street', city: 'Trichy', state: 'Tamil Nadu', pincode: '620001', occupation: 'Agriculture', company: '', monthly_income: 45000, aadhaar: '3456 7890 1234', pan: 'PQRST3456U', status: 'active', kyc_status: 'verified', created_at: '2024-04-12T08:30:00Z', updated_at: '2024-07-12T08:30:00Z', sync_status: 'synced' },
  { id: '5', customer_id: 'CUS005', name: 'Suresh Babu', mobile: '9741852963', whatsapp: '9741852963', address: '56, Nehru Street', city: 'Salem', state: 'Tamil Nadu', pincode: '636001', occupation: 'Service', company: 'Government', monthly_income: 55000, aadhaar: '2345 6789 0123', pan: 'UVWXY7890Z', status: 'active', kyc_status: 'verified', created_at: '2024-05-08T14:00:00Z', updated_at: '2024-07-15T14:00:00Z', sync_status: 'synced' },
  { id: '6', customer_id: 'CUS006', name: 'Kavitha Rajan', mobile: '9852147036', whatsapp: '9852147036', address: '8, Rose Garden', city: 'Chennai', state: 'Tamil Nadu', pincode: '600020', occupation: 'Business', company: 'Rajan Enterprises', monthly_income: 75000, aadhaar: '5678 9012 3456', pan: 'ABCIJ1234F', status: 'active', kyc_status: 'pending', created_at: '2024-06-01T10:00:00Z', updated_at: '2024-07-20T10:00:00Z', sync_status: 'synced' },
  { id: '7', customer_id: 'CUS007', name: 'Vijay Anand', mobile: '9963258741', whatsapp: '9963258741', address: '34, Lake View', city: 'Erode', state: 'Tamil Nadu', pincode: '638001', occupation: 'Business', company: 'Anand Textiles', monthly_income: 95000, aadhaar: '6789 0123 4567', pan: 'QRSTU5678V', status: 'inactive', kyc_status: 'verified', created_at: '2024-01-20T09:30:00Z', updated_at: '2024-07-18T09:30:00Z', sync_status: 'synced' },
  { id: '8', customer_id: 'CUS008', name: 'Radha Krishnan', mobile: '9874563210', whatsapp: '9874563210', address: '15, Flower Road', city: 'Vellore', state: 'Tamil Nadu', pincode: '632001', occupation: 'Service', company: 'Apollo Hospital', monthly_income: 65000, aadhaar: '7890 1234 5678', pan: 'EFGHI9012J', status: 'active', kyc_status: 'verified', created_at: '2024-07-01T12:00:00Z', updated_at: '2024-07-25T12:00:00Z', sync_status: 'synced' },
]

// ─── Loans ─────────────────────────────────────────────────────────────────────
export const mockLoans: Loan[] = [
  { id: 'L1', loan_number: 'LN2024001', customer_id: '1', customer_name: 'Rajesh Kumar', loan_type: 'business', loan_amount: 500000, interest_rate: 18, interest_type: 'reducing', duration_months: 24, processing_fee: 5000, loan_date: '2024-01-20', emi_amount: 24986, emi_count: 24, remaining_emi: 6, remaining_balance: 132000, total_interest: 99000, status: 'active', disbursed_amount: 495000, created_at: '2024-01-20T10:00:00Z', updated_at: '2024-07-20T10:00:00Z', sync_status: 'synced' },
  { id: 'L2', loan_number: 'LN2024002', customer_id: '2', customer_name: 'Priya Sharma', loan_type: 'personal', loan_amount: 200000, interest_rate: 15, interest_type: 'flat', duration_months: 18, processing_fee: 2000, loan_date: '2024-02-15', emi_amount: 13611, emi_count: 18, remaining_emi: 7, remaining_balance: 95000, total_interest: 45000, status: 'active', disbursed_amount: 198000, created_at: '2024-02-15T09:00:00Z', updated_at: '2024-07-15T09:00:00Z', sync_status: 'synced' },
  { id: 'L3', loan_number: 'LN2024003', customer_id: '3', customer_name: 'Mohammed Ali', loan_type: 'gold', loan_amount: 300000, interest_rate: 12, interest_type: 'reducing', duration_months: 12, processing_fee: 3000, loan_date: '2024-03-10', emi_amount: 26645, emi_count: 12, remaining_emi: 0, remaining_balance: 0, total_interest: 19740, status: 'closed', disbursed_amount: 297000, created_at: '2024-03-10T11:00:00Z', updated_at: '2024-07-10T11:00:00Z', sync_status: 'synced' },
  { id: 'L4', loan_number: 'LN2024004', customer_id: '4', customer_name: 'Lakshmi Devi', loan_type: 'agriculture', loan_amount: 150000, interest_rate: 10, interest_type: 'flat', duration_months: 12, processing_fee: 1500, loan_date: '2024-04-01', emi_amount: 13750, emi_count: 12, remaining_emi: 8, remaining_balance: 110000, total_interest: 15000, status: 'overdue', disbursed_amount: 148500, created_at: '2024-04-01T08:00:00Z', updated_at: '2024-07-01T08:00:00Z', sync_status: 'synced' },
  { id: 'L5', loan_number: 'LN2024005', customer_id: '5', customer_name: 'Suresh Babu', loan_type: 'vehicle', loan_amount: 400000, interest_rate: 16, interest_type: 'reducing', duration_months: 36, processing_fee: 4000, loan_date: '2024-05-10', emi_amount: 14080, emi_count: 36, remaining_emi: 26, remaining_balance: 366000, total_interest: 106880, status: 'active', disbursed_amount: 396000, created_at: '2024-05-10T14:00:00Z', updated_at: '2024-07-10T14:00:00Z', sync_status: 'synced' },
  { id: 'L6', loan_number: 'LN2024006', customer_id: '6', customer_name: 'Kavitha Rajan', loan_type: 'home', loan_amount: 1000000, interest_rate: 10.5, interest_type: 'reducing', duration_months: 120, processing_fee: 10000, loan_date: '2024-06-05', emi_amount: 13493, emi_count: 120, remaining_emi: 114, remaining_balance: 985000, total_interest: 619160, status: 'active', disbursed_amount: 990000, created_at: '2024-06-05T10:00:00Z', updated_at: '2024-07-05T10:00:00Z', sync_status: 'synced' },
]

// ─── EMI Payments ───────────────────────────────────────────────────────────────
export const mockPayments: EMIPayment[] = [
  { id: 'P1', loan_id: 'L1', customer_id: '1', emi_schedule_id: 'ES1', emi_number: 18, payment_date: '2025-07-28', payment_mode: 'cash', amount_paid: 24986, principal_paid: 23400, interest_paid: 1586, penalty: 0, discount: 0, advance_emi: 0, partial: false, receipt_number: 'RCP2025001', collected_by: 'Admin', created_at: '2025-07-28T10:00:00Z', updated_at: '2025-07-28T10:00:00Z', sync_status: 'synced' },
  { id: 'P2', loan_id: 'L2', customer_id: '2', emi_schedule_id: 'ES2', emi_number: 11, payment_date: '2025-07-27', payment_mode: 'upi', amount_paid: 13611, principal_paid: 11111, interest_paid: 2500, penalty: 0, discount: 0, advance_emi: 0, partial: false, receipt_number: 'RCP2025002', collected_by: 'Manager', created_at: '2025-07-27T11:00:00Z', updated_at: '2025-07-27T11:00:00Z', sync_status: 'synced' },
  { id: 'P3', loan_id: 'L5', customer_id: '5', emi_schedule_id: 'ES5', emi_number: 10, payment_date: '2025-07-26', payment_mode: 'bank', amount_paid: 14080, principal_paid: 8680, interest_paid: 5400, penalty: 0, discount: 0, advance_emi: 0, partial: false, receipt_number: 'RCP2025003', collected_by: 'Staff', created_at: '2025-07-26T09:30:00Z', updated_at: '2025-07-26T09:30:00Z', sync_status: 'synced' },
  { id: 'P4', loan_id: 'L4', customer_id: '4', emi_schedule_id: 'ES4', emi_number: 4, payment_date: '2025-07-25', payment_mode: 'cash', amount_paid: 15380, principal_paid: 12500, interest_paid: 1250, penalty: 1630, discount: 0, advance_emi: 0, partial: false, receipt_number: 'RCP2025004', collected_by: 'Admin', created_at: '2025-07-25T14:00:00Z', updated_at: '2025-07-25T14:00:00Z', sync_status: 'synced' },
  { id: 'P5', loan_id: 'L6', customer_id: '6', emi_schedule_id: 'ES6', emi_number: 2, payment_date: '2025-07-24', payment_mode: 'upi', amount_paid: 13493, principal_paid: 4743, interest_paid: 8750, penalty: 0, discount: 0, advance_emi: 0, partial: false, receipt_number: 'RCP2025005', collected_by: 'Manager', created_at: '2025-07-24T16:00:00Z', updated_at: '2025-07-24T16:00:00Z', sync_status: 'synced' },
]

// ─── Income ─────────────────────────────────────────────────────────────────────
export const mockIncome: Income[] = [
  { id: 'I1', category: 'interest', amount: 85000, description: 'Monthly interest income', date: '2025-07-01', created_at: '2025-07-01T00:00:00Z', updated_at: '2025-07-01T00:00:00Z', sync_status: 'synced' },
  { id: 'I2', category: 'processing_fee', amount: 15000, description: 'Processing fees from new loans', date: '2025-07-05', created_at: '2025-07-05T00:00:00Z', updated_at: '2025-07-05T00:00:00Z', sync_status: 'synced' },
  { id: 'I3', category: 'penalty', amount: 8500, description: 'Late payment penalties', date: '2025-07-10', created_at: '2025-07-10T00:00:00Z', updated_at: '2025-07-10T00:00:00Z', sync_status: 'synced' },
  { id: 'I4', category: 'other', amount: 5000, description: 'Miscellaneous income', date: '2025-07-15', created_at: '2025-07-15T00:00:00Z', updated_at: '2025-07-15T00:00:00Z', sync_status: 'synced' },
  { id: 'I5', category: 'interest', amount: 92000, description: 'Monthly interest income', date: '2025-06-01', created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z', sync_status: 'synced' },
]

// ─── Expenses ───────────────────────────────────────────────────────────────────
export const mockExpenses: Expense[] = [
  { id: 'E1', category: 'rent', amount: 25000, description: 'Office rent - July 2025', date: '2025-07-01', created_at: '2025-07-01T00:00:00Z', updated_at: '2025-07-01T00:00:00Z', sync_status: 'synced' },
  { id: 'E2', category: 'salary', amount: 85000, description: 'Staff salaries - July 2025', date: '2025-07-01', created_at: '2025-07-01T00:00:00Z', updated_at: '2025-07-01T00:00:00Z', sync_status: 'synced' },
  { id: 'E3', category: 'electricity', amount: 5000, description: 'Electricity bill', date: '2025-07-05', created_at: '2025-07-05T00:00:00Z', updated_at: '2025-07-05T00:00:00Z', sync_status: 'synced' },
  { id: 'E4', category: 'internet', amount: 2000, description: 'Internet & broadband', date: '2025-07-05', created_at: '2025-07-05T00:00:00Z', updated_at: '2025-07-05T00:00:00Z', sync_status: 'synced' },
  { id: 'E5', category: 'fuel', amount: 8000, description: 'Collection vehicle fuel', date: '2025-07-10', created_at: '2025-07-10T00:00:00Z', updated_at: '2025-07-10T00:00:00Z', sync_status: 'synced' },
  { id: 'E6', category: 'maintenance', amount: 3500, description: 'Office maintenance', date: '2025-07-15', created_at: '2025-07-15T00:00:00Z', updated_at: '2025-07-15T00:00:00Z', sync_status: 'synced' },
]

// ─── Notifications ───────────────────────────────────────────────────────────────
export const mockNotifications: Notification[] = [
  { id: 'N1', type: 'due_today', title: 'EMI Due Today', message: 'Rajesh Kumar (LN2024001) has EMI of ₹24,986 due today', customer_id: '1', loan_id: 'L1', is_read: false, created_at: dayjs().toISOString() },
  { id: 'N2', type: 'overdue_emi', title: 'Overdue EMI Alert', message: 'Lakshmi Devi (LN2024004) EMI is 15 days overdue. Amount: ₹13,750', customer_id: '4', loan_id: 'L4', is_read: false, created_at: dayjs().subtract(2, 'hour').toISOString() },
  { id: 'N3', type: 'upcoming_emi', title: 'Upcoming EMI Reminder', message: 'Priya Sharma (LN2024002) has EMI of ₹13,611 due in 3 days', customer_id: '2', loan_id: 'L2', is_read: false, created_at: dayjs().subtract(5, 'hour').toISOString() },
  { id: 'N4', type: 'payment_received', title: 'Payment Received', message: 'Mohammed Ali paid ₹26,645 for LN2024003. Loan closed!', customer_id: '3', loan_id: 'L3', is_read: true, created_at: dayjs().subtract(1, 'day').toISOString() },
  { id: 'N5', type: 'upcoming_emi', title: 'Upcoming EMI Reminder', message: 'Suresh Babu (LN2024005) has EMI of ₹14,080 due in 5 days', customer_id: '5', loan_id: 'L5', is_read: true, created_at: dayjs().subtract(2, 'day').toISOString() },
  { id: 'N6', type: 'new_loan', title: 'New Loan Disbursed', message: 'Home loan of ₹10,00,000 disbursed to Kavitha Rajan', customer_id: '6', loan_id: 'L6', is_read: true, created_at: dayjs().subtract(3, 'day').toISOString() },
]

// ─── Dashboard Stats ─────────────────────────────────────────────────────────────
export const mockDashboardStats: DashboardStats = {
  total_customers: 248,
  active_loans: 186,
  closed_loans: 62,
  todays_collection: 128540,
  pending_emi: 34,
  overdue_loans: 12,
  interest_earned: 385000,
  monthly_income: 485000,
  monthly_expense: 128500,
  net_profit: 356500,
  collection_rate: 94.2,
}

// ─── Chart Data ──────────────────────────────────────────────────────────────────
export const mockCollectionChart: ChartDataPoint[] = [
  { name: 'Jan', value: 380000, target: 400000 },
  { name: 'Feb', value: 420000, target: 400000 },
  { name: 'Mar', value: 395000, target: 420000 },
  { name: 'Apr', value: 445000, target: 430000 },
  { name: 'May', value: 460000, target: 450000 },
  { name: 'Jun', value: 485000, target: 470000 },
  { name: 'Jul', value: 520000, target: 490000 },
]

export const mockIncomeExpenseChart: ChartDataPoint[] = [
  { name: 'Jan', income: 420000, expense: 110000 },
  { name: 'Feb', income: 465000, expense: 118000 },
  { name: 'Mar', income: 435000, expense: 125000 },
  { name: 'Apr', income: 490000, expense: 120000 },
  { name: 'May', income: 510000, expense: 130000 },
  { name: 'Jun', income: 540000, expense: 128000 },
  { name: 'Jul', income: 520000, expense: 128500 },
]

export const mockLoanDistributionChart = [
  { name: 'Personal', value: 35, color: '#38BDF8' },
  { name: 'Business', value: 28, color: '#22C55E' },
  { name: 'Home', value: 15, color: '#8B5CF6' },
  { name: 'Vehicle', value: 12, color: '#F59E0B' },
  { name: 'Gold', value: 7, color: '#F97316' },
  { name: 'Others', value: 3, color: '#EC4899' },
]

export const mockEMIStatusChart = [
  { name: 'Week 1', paid: 88, pending: 12, overdue: 5 },
  { name: 'Week 2', paid: 75, pending: 20, overdue: 8 },
  { name: 'Week 3', paid: 92, pending: 10, overdue: 4 },
  { name: 'Week 4', paid: 84, pending: 15, overdue: 6 },
]

export const mockUpcomingDue = [
  { id: '1', name: 'Rajesh Kumar', loan_number: 'LN2024001', amount: 24986, due_date: dayjs().format('YYYY-MM-DD'), days_overdue: 0 },
  { id: '4', name: 'Lakshmi Devi', loan_number: 'LN2024004', amount: 13750, due_date: dayjs().subtract(15, 'day').format('YYYY-MM-DD'), days_overdue: 15 },
  { id: '2', name: 'Priya Sharma', loan_number: 'LN2024002', amount: 13611, due_date: dayjs().add(3, 'day').format('YYYY-MM-DD'), days_overdue: -3 },
  { id: '5', name: 'Suresh Babu', loan_number: 'LN2024005', amount: 14080, due_date: dayjs().add(5, 'day').format('YYYY-MM-DD'), days_overdue: -5 },
  { id: '6', name: 'Kavitha Rajan', loan_number: 'LN2024006', amount: 13493, due_date: dayjs().add(8, 'day').format('YYYY-MM-DD'), days_overdue: -8 },
]

export const mockActivityLog = [
  { id: '1', action: 'EMI Collected', module: 'EMI', user: 'Admin', details: '₹24,986 from Rajesh Kumar (LN2024001)', time: dayjs().subtract(30, 'minute').toISOString(), type: 'success' },
  { id: '2', action: 'New Customer Added', module: 'Customer', user: 'Manager', details: 'Radha Krishnan (CUS008) registered', time: dayjs().subtract(2, 'hour').toISOString(), type: 'info' },
  { id: '3', action: 'Loan Disbursed', module: 'Loan', user: 'Admin', details: '₹10,00,000 home loan to Kavitha Rajan', time: dayjs().subtract(1, 'day').toISOString(), type: 'info' },
  { id: '4', action: 'Overdue Alert', module: 'EMI', user: 'System', details: 'Lakshmi Devi EMI overdue by 15 days', time: dayjs().subtract(1, 'day').toISOString(), type: 'warning' },
  { id: '5', action: 'Loan Closed', module: 'Loan', user: 'Admin', details: 'LN2024003 - Mohammed Ali loan fully repaid', time: dayjs().subtract(2, 'day').toISOString(), type: 'success' },
  { id: '6', action: 'Expense Added', module: 'Expense', user: 'Manager', details: 'Office rent ₹25,000 recorded', time: dayjs().subtract(3, 'day').toISOString(), type: 'info' },
]
