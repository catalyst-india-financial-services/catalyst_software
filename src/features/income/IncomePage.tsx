import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Download, TrendingUp } from 'lucide-react'
import { useIncome, useCreateIncome } from '@/hooks/useDb'
import { Button, Card, CardHeader, CardTitle, CardBody, Modal, Input, Select, StatsCard, StatusBadge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/utils'
import dayjs from 'dayjs'

const incomeCategoryLabels: Record<string, string> = {
  interest: 'Interest Income',
  processing_fee: 'Processing Fee',
  penalty: 'Penalty Income',
  other: 'Other Income',
}

// Categories and Colors
const categoryColors = {
  interest: '#38BDF8',
  processing_fee: '#22C55E',
  penalty: '#F59E0B',
  other: '#8B5CF6',
}

function AddIncomeModal({ onClose }: { onClose: () => void }) {
  const createIncome = useCreateIncome()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ category: 'interest', amount: '', description: '', date: new Date().toISOString().split('T')[0], reference: '' })

  const handleSubmit = async () => {
    if (!formData.amount || !formData.description || !formData.date) {
      alert('Please fill all required fields.')
      return
    }
    setLoading(true)
    try {
      await createIncome.mutateAsync({
        category: formData.category as any,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        reference: formData.reference || undefined
      })
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to add income.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Select
        label="Income Category *"
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        options={Object.entries(incomeCategoryLabels).map(([v, l]) => ({ value: v, label: l }))}
      />
      <Input
        label="Amount (₹) *"
        type="number"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        placeholder="Enter amount"
      />
      <Input
        label="Description *"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Brief description"
      />
      <Input
        label="Date *"
        type="date"
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
      />
      <Input
        label="Reference (optional)"
        value={formData.reference}
        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
        placeholder="Invoice or reference number"
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading}>Add Income</Button>
      </div>
    </div>
  )
}

export default function IncomePage() {
  const [showModal, setShowModal] = useState(false)
  const { data: income = [], isLoading } = useIncome()

  const totalIncome = income.reduce((sum, i) => sum + Number(i.amount), 0)

  const incomeByCategory = Object.entries(
    income.reduce((acc, inc) => {
      acc[inc.category] = (acc[inc.category] || 0) + Number(inc.amount)
      return acc
    }, {} as Record<string, number>)
  ).map(([cat, amount]) => ({
    name: incomeCategoryLabels[cat] ?? cat,
    value: amount,
    color: categoryColors[cat as keyof typeof categoryColors] ?? '#94a3b8',
  }))

  const months = Array.from({ length: 5 }, (_, i) => dayjs().subtract(4 - i, 'month').format('MMM'))
  const monthlyIncome = months.map((m) => {
    const amount = income
      .filter((i) => dayjs(i.date).format('MMM') === m)
      .reduce((sum, i) => sum + Number(i.amount), 0)
    return { name: m, amount }
  })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Income</h1>
          <p className="page-subtitle">Track all income sources and financial inflows</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
          <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Add Income</Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {incomeByCategory.map((cat) => (
          <div key={cat.name} className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
            <div className="w-3 h-3 rounded-full mb-2" style={{ background: cat.color }} />
            <p className="text-xl font-bold text-slate-900 amount-display">{formatCurrency(cat.value)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{cat.name}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Chart */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Monthly Income Trend</CardTitle></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyIncome}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                <Tooltip />
                <Bar dataKey="amount" name="Income" fill="#38BDF8" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Distribution */}
        <Card>
          <CardHeader><CardTitle>Income Distribution</CardTitle></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={incomeByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {incomeByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {incomeByCategory.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                    <span className="text-slate-600">{cat.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800 amount-display">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Income Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Income Records</CardTitle>
            <span className="text-sm font-semibold text-emerald-700 amount-display">Total: {formatCurrency(totalIncome)}</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Date', 'Category', 'Description', 'Reference', 'Amount'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {income.map((inc) => (
                <tr key={inc.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(inc.date)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{
                      background: `${categoryColors[inc.category as keyof typeof categoryColors]}20`,
                      color: categoryColors[inc.category as keyof typeof categoryColors],
                    }}>
                      {incomeCategoryLabels[inc.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{inc.description}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{inc.reference ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-700 amount-display">{formatCurrency(Number(inc.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Income Entry" size="md">
        <AddIncomeModal onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
