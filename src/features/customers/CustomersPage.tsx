import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender, createColumnHelper, type SortingState
} from '@tanstack/react-table'
import { Plus, Download, Eye, SquarePen, Trash2, Phone, Upload, SlidersHorizontal, UserPlus } from 'lucide-react'
import { useCustomers, useCreateCustomer, useUpdateCustomer } from '@/hooks/useDb'
import type { Customer } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  Button, SearchInput, Pagination, Avatar, StatusBadge, Card, CardHeader, CardTitle,
  CardBody, Modal, Input, Select, Textarea, Badge, DropdownMenu, EmptyState, PageHeader
} from '@/components/ui'
import { formatDate, maskAadhaar, maskPAN, cn } from '@/utils'

const columnHelper = createColumnHelper<Customer>()

function CustomerForm({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()

  const prefillName = searchParams.get('prefillName') || ''
  const prefillPhone = searchParams.get('prefillPhone') || ''

  const [formData, setFormData] = useState({
    name: customer?.name ?? prefillName,
    mobile: customer?.mobile ?? prefillPhone,
    whatsapp: customer?.whatsapp ?? prefillPhone,
    address: customer?.address ?? '',
    city: customer?.city ?? '',
    state: customer?.state ?? '',
    pincode: customer?.pincode ?? '',
    occupation: customer?.occupation ?? '',
    company: customer?.company ?? '',
    monthly_income: customer?.monthly_income?.toString() ?? '',
    aadhaar: customer?.aadhaar ?? '',
    pan: customer?.pan ?? '',
    status: customer?.status ?? 'active',
  })

  const states = [
    'Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana',
    'Maharashtra', 'Gujarat', 'Rajasthan', 'Delhi', 'Uttar Pradesh',
  ].map((s) => ({ value: s, label: s }))

  const handleSubmit = async () => {
    if (!formData.name || !formData.mobile || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      alert('Please fill all required fields.')
      return
    }
    setLoading(true)
    const payload = {
      name: formData.name,
      mobile: formData.mobile,
      whatsapp: formData.whatsapp || formData.mobile,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      occupation: formData.occupation,
      company: formData.company,
      monthly_income: formData.monthly_income ? parseFloat(formData.monthly_income) : 0,
      aadhaar: formData.aadhaar,
      pan: formData.pan,
      status: formData.status as any,
    }

    try {
      if (customer) {
        await updateCustomer.mutateAsync({ id: customer.id, ...payload })
      } else {
        await createCustomer.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to save customer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Personal Info */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">1</span>
          Personal Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Full Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
            />
          </div>
          <Input
            label="Mobile Number *"
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            placeholder="10-digit mobile"
          />
          <Input
            label="WhatsApp Number"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            placeholder="Same as mobile"
          />
          <Input
            label="Occupation"
            value={formData.occupation}
            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            placeholder="e.g., Business, Service"
          />
          <Input
            label="Company / Employer"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Company name"
          />
          <Input
            label="Monthly Income (₹)"
            type="number"
            value={formData.monthly_income}
            onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
            placeholder="Monthly income"
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as Customer['status'] })}
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'blocked', label: 'Blocked' }]}
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">2</span>
          Address Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Textarea
              label="Address *"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Door no, Street, Area"
            />
          </div>
          <Input
            label="City *"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="City"
          />
          <Select
            label="State *"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            options={states}
            placeholder="Select state"
          />
          <Input
            label="Pincode *"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            placeholder="6-digit pincode"
          />
        </div>
      </div>

      {/* KYC */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">3</span>
          KYC Documents
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Aadhaar Number"
            value={formData.aadhaar}
            onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
            placeholder="XXXX XXXX XXXX"
          />
          <Input
            label="PAN Number"
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
            placeholder="ABCDE1234F"
            className="uppercase"
          />
        </div>
        <div className="mt-3 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-brand-400 hover:bg-brand-50/20 transition-all">
          <Upload className="h-7 w-7 text-slate-400" />
          <p className="text-xs font-bold text-slate-700">Upload Verification Documents</p>
          <p className="text-[11px] text-slate-400">Aadhaar, PAN, Photo — JPG, PNG, PDF up to 5MB</p>
          <Button variant="outline" size="sm" className="mt-1">Browse Files</Button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading}>{customer ? 'Update Customer' : 'Add Customer'}</Button>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sorting, setSorting] = useLocalStorage<SortingState>('customers_sorting', [])
  const [globalFilter, setGlobalFilter] = useLocalStorage<string>('customers_search', '')
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>()
  const [statusFilter, setStatusFilter] = useLocalStorage<string>('customers_status_filter', 'all')

  const prefillName = searchParams.get('prefillName')
  const prefillPhone = searchParams.get('prefillPhone')

  useEffect(() => {
    if (prefillName || prefillPhone) {
      setEditCustomer(undefined)
      setShowModal(true)
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('prefillName')
      nextParams.delete('prefillPhone')
      nextParams.delete('prefillEmail')
      setSearchParams(nextParams, { replace: true })
    }
  }, [prefillName, prefillPhone, searchParams, setSearchParams])

  const { data: customers = [], isLoading } = useCustomers()

  const filteredData = useMemo(() => {
    return customers.filter((c) => statusFilter === 'all' || c.status === statusFilter)
  }, [customers, statusFilter])

  const columns = useMemo(() => [
    columnHelper.accessor('customer_id', {
      header: 'ID',
      cell: (info) => (
        <button
          onClick={() => navigate(`/customers/${info.row.original.id}`)}
          className="text-xs font-mono font-semibold text-brand-600 hover:underline hover:text-brand-700 transition-colors cursor-pointer"
        >
          {info.getValue()}
        </button>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Customer Name',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <Avatar name={info.getValue()} size="sm" />
          <div>
            <p className="text-sm font-bold text-slate-800 tracking-tight">{info.getValue()}</p>
            <p className="text-xs text-slate-400 font-medium">{info.row.original.mobile}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('city', {
      header: 'City',
      cell: (info) => <span className="text-xs font-medium text-slate-600">{info.getValue()}</span>,
    }),
    columnHelper.accessor('occupation', {
      header: 'Occupation',
      cell: (info) => <span className="text-xs font-medium text-slate-600">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('monthly_income', {
      header: 'Monthly Income',
      cell: (info) => {
        const val = info.getValue()
        return <span className="text-xs font-bold text-slate-800 amount-display">₹{val?.toLocaleString('en-IN') ?? '—'}</span>
      },
    }),
    columnHelper.accessor('kyc_status', {
      header: 'KYC',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('created_at', {
      header: 'Joined',
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
            { label: 'View Profile', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/customers/${info.row.original.id}`) },
            { label: 'Edit Customer', icon: <SquarePen className="h-4 w-4" />, onClick: () => { setEditCustomer(info.row.original); setShowModal(true) } },
            { label: 'Call Phone', icon: <Phone className="h-4 w-4" />, onClick: () => { } },
            { separator: true, label: 'Delete Record', icon: <Trash2 className="h-4 w-4" />, variant: 'danger', onClick: () => { } },
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
      {/* Header */}
      <PageHeader
        title="Customer Directory"
        subtitle={`${customers.length} total borrowers registered in system`}
        action={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export Directory
            </Button>
            <Button onClick={() => { setEditCustomer(undefined); setShowModal(true) }}>
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        }
      />

      {/* Quick Stats Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Borrowers', value: customers.length, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Active Status', value: customers.filter((c) => c.status === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
          { label: 'KYC Verified', value: customers.filter((c) => c.kyc_status === 'verified').length, color: 'text-brand-600', bg: 'bg-brand-50/50' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-2xl border border-slate-200/80 px-5 py-4 flex items-center justify-between shadow-2xs', s.bg)}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
            <span className={cn('text-2xl font-extrabold amount-display', s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      <Card>
        {/* Filter Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <SearchInput
            className="w-72"
            placeholder="Search name, mobile, Aadhaar..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          <div className="flex gap-1.5 ml-auto bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            {['all', 'active', 'inactive', 'blocked'].map((s) => (
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        header.column.getCanSort() && 'cursor-pointer select-none hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && ' ↑'}
                        {header.column.getIsSorted() === 'desc' && ' ↓'}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="py-12"><EmptyState title="No customers found" description="Try adjusting your search filters" /></td></tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={table.getState().pagination.pageIndex + 1}
          total={filteredData.length}
          pageSize={table.getState().pagination.pageSize}
          onPageChange={(p) => table.setPageIndex(p - 1)}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editCustomer ? `Edit Profile — ${editCustomer.name}` : 'Add New Customer'}
        size="xl"
      >
        <CustomerForm customer={editCustomer} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
