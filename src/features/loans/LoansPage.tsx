import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender, createColumnHelper, type SortingState
} from '@tanstack/react-table'
import { Plus, Download, Eye, SquarePen, FileText, SlidersHorizontal, Calculator, WalletCards, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useLoans, useCustomers, useCreateLoan } from '@/hooks/useDb'
import type { Loan } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  Button, SearchInput, Pagination, StatusBadge, Card, CardHeader, CardTitle,
  CardBody, Modal, Input, Select, Badge, DropdownMenu, EmptyState, StatsCard, PageHeader
} from '@/components/ui'
import { formatCurrency, formatDate, calculateEMI, generateEMISchedule, cn } from '@/utils'

const columnHelper = createColumnHelper<Loan>()

const loanTypes = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'business', label: 'Business Loan' },
  { value: 'home', label: 'Home Loan' },
  { value: 'vehicle', label: 'Vehicle Loan' },
  { value: 'gold', label: 'Gold Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'agriculture', label: 'Agriculture Loan' },
]

function LoanForm({ loan, onClose }: { loan?: Loan; onClose: () => void }) {
  const { data: customers = [] } = useCustomers()
  const createLoan = useCreateLoan()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    customer_id: loan?.customer_id ?? '',
    loan_type: loan?.loan_type ?? 'personal',
    loan_amount: loan?.loan_amount?.toString() ?? '',
    interest_rate: loan?.interest_rate?.toString() ?? '18',
    interest_type: loan?.interest_type ?? 'reducing',
    duration_months: loan?.duration_months?.toString() ?? '12',
    processing_fee: loan?.processing_fee?.toString() ?? '0',
    loan_date: loan?.loan_date ?? new Date().toISOString().split('T')[0],
  })

  const emiAmount = useMemo(() => {
    const principal = parseFloat(formData.loan_amount) || 0
    const rate = parseFloat(formData.interest_rate) || 0
    const months = parseInt(formData.duration_months) || 0
    if (!principal || !rate || !months) return 0
    return calculateEMI(principal, rate, months, formData.interest_type as 'flat' | 'reducing')
  }, [formData.loan_amount, formData.interest_rate, formData.duration_months, formData.interest_type])

  const totalInterest = useMemo(() => {
    const principal = parseFloat(formData.loan_amount) || 0
    const months = parseInt(formData.duration_months) || 0
    return Math.max(0, emiAmount * months - principal)
  }, [emiAmount, formData.loan_amount, formData.duration_months])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Select
            label="Customer *"
            value={formData.customer_id}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            options={customers.map(c => ({ value: c.id, label: `${c.name} — ${c.customer_id}` }))}
            placeholder="Select customer"
          />
        </div>
        <Select
          label="Loan Category *"
          value={formData.loan_type}
          onChange={(e) => setFormData({ ...formData, loan_type: e.target.value as Loan['loan_type'] })}
          options={loanTypes}
        />
        <Input
          label="Disbursement Date *"
          type="date"
          value={formData.loan_date}
          onChange={(e) => setFormData({ ...formData, loan_date: e.target.value })}
        />
        <Input
          label="Loan Principal Amount (₹) *"
          type="number"
          value={formData.loan_amount}
          onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
          placeholder="e.g., 500000"
        />
        <Input
          label="Processing Fee (₹)"
          type="number"
          value={formData.processing_fee}
          onChange={(e) => setFormData({ ...formData, processing_fee: e.target.value })}
          placeholder="e.g., 5000"
        />
        <Input
          label="Interest Rate (% p.a.) *"
          type="number"
          step="0.5"
          value={formData.interest_rate}
          onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
          placeholder="e.g., 18"
        />
        <Select
          label="Interest Type *"
          value={formData.interest_type}
          onChange={(e) => setFormData({ ...formData, interest_type: e.target.value as 'flat' | 'reducing' })}
          options={[{ value: 'flat', label: 'Flat Rate' }, { value: 'reducing', label: 'Reducing Balance' }]}
        />
        <div className="col-span-2">
          <Input
            label="Tenure Duration (Months) *"
            type="number"
            value={formData.duration_months}
            onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
            placeholder="e.g., 24"
          />
        </div>
      </div>

      {/* EMI Calculator Live Preview Card */}
      {emiAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-r from-brand-50 to-blue-50/80 border border-brand-100 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-brand-600" />
            <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider">EMI Breakdown Calculation</h4>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Monthly EMI</p>
              <p className="text-lg font-extrabold text-brand-600 amount-display">{formatCurrency(emiAmount)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Total Interest</p>
              <p className="text-lg font-extrabold text-slate-800 amount-display">{formatCurrency(totalInterest)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Total Loan Repayment</p>
              <p className="text-lg font-extrabold text-slate-800 amount-display">{formatCurrency(emiAmount * parseInt(formData.duration_months || '0'))}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={async () => {
            if (!formData.customer_id || !formData.loan_amount || !formData.duration_months || !formData.loan_date) {
              alert('Please fill all required fields.')
              return
            }
            setLoading(true)
            try {
              await createLoan.mutateAsync({
                customer_id: formData.customer_id,
                loan_type: formData.loan_type as Loan['loan_type'],
                loan_amount: parseFloat(formData.loan_amount),
                interest_rate: parseFloat(formData.interest_rate),
                interest_type: formData.interest_type as 'flat' | 'reducing',
                duration_months: parseInt(formData.duration_months),
                processing_fee: parseFloat(formData.processing_fee) || 0,
                loan_date: formData.loan_date,
              })
              onClose()
            } catch (err) {
              console.error(err)
              alert('Failed to disburse loan.')
            } finally {
              setLoading(false)
            }
          }}
          loading={loading}
        >
          {loan ? 'Update Loan' : 'Disburse Loan & Build Schedule'}
        </Button>
      </div>
    </div>
  )
}

export default function LoansPage() {
  const navigate = useNavigate()
  const [sorting, setSorting] = useLocalStorage<SortingState>('loans_sorting', [])
  const [globalFilter, setGlobalFilter] = useLocalStorage<string>('loans_search', '')
  const [showModal, setShowModal] = useState(false)
  const [editLoan, setEditLoan] = useState<Loan | undefined>()
  const [statusFilter, setStatusFilter] = useLocalStorage<string>('loans_status_filter', 'all')

  const { data: loans = [], isLoading } = useLoans()

  const filteredData = useMemo(() =>
    loans.filter((l) => statusFilter === 'all' || l.status === statusFilter),
    [loans, statusFilter]
  )

  const columns = useMemo(() => [
    columnHelper.accessor('loan_number', {
      header: 'Loan No.',
      cell: (info) => <span className="text-xs font-mono text-brand-600 font-bold">{info.getValue()}</span>,
    }),
    columnHelper.accessor('customer_name', {
      header: 'Customer Name',
      cell: (info) => <span className="text-sm font-bold text-slate-800 tracking-tight">{info.getValue()}</span>,
    }),
    columnHelper.accessor('loan_type', {
      header: 'Category',
      cell: (info) => (
        <Badge variant="outline" className="capitalize text-[10px] font-bold">{info.getValue().replace('_', ' ')}</Badge>
      ),
    }),
    columnHelper.accessor('loan_amount', {
      header: 'Principal',
      cell: (info) => <span className="text-xs font-bold text-slate-800 amount-display">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('interest_rate', {
      header: 'Interest Rate',
      cell: (info) => (
        <span className="text-xs font-semibold text-slate-700">
          {info.getValue()}%{' '}
          <span className="text-[10px] text-slate-400 capitalize font-medium">({info.row.original.interest_type})</span>
        </span>
      ),
    }),
    columnHelper.accessor('emi_amount', {
      header: 'Monthly EMI',
      cell: (info) => <span className="text-xs font-extrabold amount-display text-emerald-600">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('remaining_emi', {
      header: 'Progress',
      cell: (info) => {
        const total = info.row.original.emi_count
        const remaining = info.getValue()
        const pct = ((total - remaining) / total) * 100
        return (
          <div className="min-w-[100px]">
            <div className="flex justify-between text-[11px] font-semibold mb-1">
              <span className="text-slate-700">{total - remaining}/{total}</span>
              <span className="text-slate-400">{remaining} left</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('remaining_balance', {
      header: 'Outstanding',
      cell: (info) => <span className="text-xs font-bold amount-display text-slate-800">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('loan_date', {
      header: 'Date',
      cell: (info) => <span className="text-xs text-slate-400 font-medium">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <DropdownMenu
          align="right"
          trigger={
            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          }
          items={[
            { label: 'View Schedule', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/loans/${info.row.original.id}`) },
            { label: 'Edit Loan', icon: <SquarePen className="h-4 w-4" />, onClick: () => { setEditLoan(info.row.original); setShowModal(true) } },
            { label: 'View Agreement', icon: <FileText className="h-4 w-4" />, onClick: () => {} },
          ]}
        />
      ),
    }),
  ], [navigate])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Loan Accounts"
        subtitle="Manage active loan disbursals, interest types, and EMI repayment plans."
        action={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export Accounts
            </Button>
            <Button onClick={() => { setEditLoan(undefined); setShowModal(true) }}>
              <Plus className="h-4 w-4" />
              Disburse Loan
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Loan Portfolio', value: loans.length, icon: <WalletCards className="h-5 w-5" />, bg: 'kpi-blue', iconBg: 'bg-brand-600' },
          { label: 'Active Disbursals', value: loans.filter((l) => l.status === 'active').length, icon: <TrendingUp className="h-5 w-5" />, bg: 'kpi-green', iconBg: 'bg-emerald-600' },
          { label: 'Closed Accounts', value: loans.filter((l) => l.status === 'closed').length, icon: <CheckCircle2 className="h-5 w-5" />, bg: 'kpi-purple', iconBg: 'bg-violet-600' },
          { label: 'Overdue Loans', value: loans.filter((l) => l.status === 'overdue').length, icon: <AlertTriangle className="h-5 w-5" />, bg: 'kpi-red', iconBg: 'bg-red-600' },
        ].map((s) => (
          <StatsCard key={s.label} title={s.label} value={s.value.toString()} icon={s.icon} bgClass={s.bg} iconBg={s.iconBg} />
        ))}
      </div>

      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <SearchInput
            className="w-72"
            placeholder="Search loan number, customer..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          <div className="flex gap-1.5 ml-auto bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            {['all', 'active', 'overdue', 'closed', 'pending'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all',
                  statusFilter === s ? 'bg-brand-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className={cn(
                        'whitespace-nowrap',
                        h.column.getCanSort() && 'cursor-pointer select-none hover:text-slate-900'
                      )}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === 'asc' && ' ↑'}
                      {h.column.getIsSorted() === 'desc' && ' ↓'}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length}><EmptyState title="No loans found" /></td></tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={table.getState().pagination.pageIndex + 1}
          total={filteredData.length}
          pageSize={10}
          onPageChange={(p) => table.setPageIndex(p - 1)}
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editLoan ? 'Edit Loan Account' : 'Disburse New Loan Account'}
        size="lg"
      >
        <LoanForm loan={editLoan} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
