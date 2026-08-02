import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender, createColumnHelper, type SortingState
} from '@tanstack/react-table'
import { Plus, Download, Eye, Edit2, Trash2, Phone, Upload, Filter } from 'lucide-react'
import { useCustomers, useCreateCustomer, useUpdateCustomer } from '@/hooks/useDb'
import type { Customer } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  Button, SearchInput, Pagination, Avatar, StatusBadge, Card, CardHeader, CardTitle,
  CardBody, Modal, Input, Select, Textarea, Badge, DropdownMenu, EmptyState
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
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
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
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">2</span>
          Address
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
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
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
        <div className="mt-3 border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all">
          <Upload className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500 font-medium">Upload KYC Documents</p>
          <p className="text-xs text-slate-400">Aadhaar, PAN, Photo — JPG, PNG, PDF up to 5MB</p>
          <Button variant="outline" size="sm" className="mt-1">Browse Files</Button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
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
      
      // Clear prefill query parameters from URL immediately to prevent stale states or infinite triggers
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
      cell: (info) => <span className="text-xs font-mono text-slate-500">{info.getValue()}</span>,
    }),
    columnHelper.accessor('name', {
      header: 'Customer',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <Avatar name={info.getValue()} size="sm" />
          <div>
            <p className="text-sm font-semibold text-slate-800">{info.getValue()}</p>
            <p className="text-xs text-slate-400">{info.row.original.mobile}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('city', {
      header: 'City',
      cell: (info) => <span className="text-sm text-slate-600">{info.getValue()}</span>,
    }),
    columnHelper.accessor('occupation', {
      header: 'Occupation',
      cell: (info) => <span className="text-sm text-slate-600">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('monthly_income', {
      header: 'Monthly Income',
      cell: (info) => {
        const val = info.getValue()
        return <span className="text-sm font-medium text-slate-700 amount-display">₹{val?.toLocaleString('en-IN') ?? '—'}</span>
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
            { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/customers/${info.row.original.id}`) },
            { label: 'Edit', icon: <Edit2 className="h-4 w-4" />, onClick: () => { setEditCustomer(info.row.original); setShowModal(true) } },
            { label: 'Call', icon: <Phone className="h-4 w-4" />, onClick: () => {} },
            { separator: true, label: 'Delete', icon: <Trash2 className="h-4 w-4" />, variant: 'danger', onClick: () => {} },
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} total customers registered</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => { setEditCustomer(undefined); setShowModal(true) }}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: customers.length, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Active', value: customers.filter((c) => c.status === 'active').length, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'KYC Verified', value: customers.filter((c) => c.kyc_status === 'verified').length, color: 'text-brand-700', bg: 'bg-brand-50' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-xl border border-white/60 px-4 py-3 flex items-center justify-between', s.bg)}>
            <span className="text-sm font-medium text-slate-500">{s.label}</span>
            <span className={cn('text-2xl font-bold', s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      <Card>
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <SearchInput
            className="w-64"
            placeholder="Search name, mobile, Aadhaar..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          <div className="flex gap-1.5 ml-auto">
            {['all', 'active', 'inactive', 'blocked'].map((s) => (
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
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider',
                        header.column.getCanSort() && 'cursor-pointer select-none hover:text-slate-700'
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
                    className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
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
        title={editCustomer ? `Edit Customer — ${editCustomer.name}` : 'Add New Customer'}
        size="xl"
      >
        <CustomerForm customer={editCustomer} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
