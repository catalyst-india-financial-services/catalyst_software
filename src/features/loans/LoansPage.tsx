import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender, createColumnHelper, type SortingState
} from '@tanstack/react-table'
import { Plus, Download, Eye, Edit2, FileText, Filter, Calculator } from 'lucide-react'
import { useLoans, useCustomers, useCreateLoan } from '@/hooks/useDb'
import type { Loan } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  Button, SearchInput, Pagination, StatusBadge, Card, CardHeader, CardTitle,
  CardBody, Modal, Input, Select, Badge, DropdownMenu, EmptyState, StatsCard
} from '@/components/ui'
import { formatCurrency, formatDate, calculateEMI, generateEMISchedule, cn } from '@/utils'
import { CreditCard, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react'

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
          label="Loan Type *"
          value={formData.loan_type}
          onChange={(e) => setFormData({ ...formData, loan_type: e.target.value as Loan['loan_type'] })}
          options={loanTypes}
        />
        <Input
          label="Loan Date *"
          type="date"
          value={formData.loan_date}
          onChange={(e) => setFormData({ ...formData, loan_date: e.target.value })}
        />
        <Input
          label="Loan Amount (₹) *"
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
            label="Duration (Months) *"
            type="number"
            value={formData.duration_months}
            onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
            placeholder="e.g., 24"
          />
        </div>
      </div>

      {/* EMI Calculator Result */}
      {emiAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gradient-to-r from-brand-50 to-emerald-50 border border-brand-100 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-brand-600" />
            <h4 className="text-sm font-semibold text-brand-700">EMI Calculation</h4>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Monthly EMI</p>
              <p className="text-xl font-bold text-brand-600 amount-display">{formatCurrency(emiAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Interest</p>
              <p className="text-xl font-bold text-slate-700 amount-display">{formatCurrency(totalInterest)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Payable</p>
              <p className="text-xl font-bold text-slate-700 amount-display">{formatCurrency(emiAmount * parseInt(formData.duration_months || '0'))}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex justify-end gap-3 pt-2">
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
          {loan ? 'Update Loan' : 'Create Loan & Generate Schedule'}
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
      cell: (info) => <span className="text-xs font-mono text-brand-600 font-semibold">{info.getValue()}</span>,
    }),
    columnHelper.accessor('customer_name', {
      header: 'Customer',
      cell: (info) => <span className="text-sm font-semibold text-slate-800">{info.getValue()}</span>,
    }),
    columnHelper.accessor('loan_type', {
      header: 'Type',
      cell: (info) => (
        <Badge variant="outline" className="capitalize text-xs">{info.getValue().replace('_', ' ')}</Badge>
      ),
    }),
    columnHelper.accessor('loan_amount', {
      header: 'Amount',
      cell: (info) => <span className="text-sm font-semibold amount-display">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('interest_rate', {
      header: 'Rate',
      cell: (info) => (
        <span className="text-sm text-slate-600">
          {info.getValue()}%{' '}
          <span className="text-xs text-slate-400 capitalize">({info.row.original.interest_type})</span>
        </span>
      ),
    }),
    columnHelper.accessor('emi_amount', {
      header: 'EMI',
      cell: (info) => <span className="text-sm font-semibold amount-display text-emerald-700">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('remaining_emi', {
      header: 'Remaining',
      cell: (info) => {
        const total = info.row.original.emi_count
        const remaining = info.getValue()
        const pct = ((total - remaining) / total) * 100
        return (
          <div className="min-w-[100px]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600">{total - remaining}/{total}</span>
              <span className="text-slate-400">{remaining} left</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('remaining_balance', {
      header: 'Balance',
      cell: (info) => <span className="text-sm font-medium amount-display text-slate-700">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('loan_date', {
      header: 'Date',
      cell: (info) => <span className="text-sm text-slate-500">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <DropdownMenu
          align="right"
          trigger={
            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          }
          items={[
            { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/loans/${info.row.original.id}`) },
            { label: 'Edit Loan', icon: <Edit2 className="h-4 w-4" />, onClick: () => { setEditLoan(info.row.original); setShowModal(true) } },
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-subtitle">Manage all loan accounts and EMI schedules</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => { setEditLoan(undefined); setShowModal(true) }}>
            <Plus className="h-4 w-4" />
            New Loan
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Loans', value: loans.length, icon: <CreditCard className="h-5 w-5" />, bg: 'kpi-blue', iconBg: 'bg-brand-500' },
          { label: 'Active', value: loans.filter((l) => l.status === 'active').length, icon: <TrendingUp className="h-5 w-5" />, bg: 'kpi-green', iconBg: 'bg-emerald-500' },
          { label: 'Closed', value: loans.filter((l) => l.status === 'closed').length, icon: <CheckCircle2 className="h-5 w-5" />, bg: 'kpi-purple', iconBg: 'bg-violet-500' },
          { label: 'Overdue', value: loans.filter((l) => l.status === 'overdue').length, icon: <AlertTriangle className="h-5 w-5" />, bg: 'kpi-red', iconBg: 'bg-red-500' },
        ].map((s) => (
          <StatsCard key={s.label} title={s.label} value={s.value.toString()} icon={s.icon} bgClass={s.bg} iconBg={s.iconBg} />
        ))}
      </div>

      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <SearchInput
            className="w-64"
            placeholder="Search loan number, customer..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          <div className="flex gap-1.5 ml-auto">
            {['all', 'active', 'overdue', 'closed', 'pending'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors',
                  statusFilter === s ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
                        h.column.getCanSort() && 'cursor-pointer select-none hover:text-slate-700'
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
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
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
        title={editLoan ? 'Edit Loan' : 'Create New Loan'}
        size="lg"
      >
        <LoanForm loan={editLoan} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
