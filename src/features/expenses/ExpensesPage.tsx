import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Plus, Download } from 'lucide-react'
import { useExpenses, useCreateExpense } from '@/hooks/useDb'
import { Button, Card, CardHeader, CardTitle, CardBody, Modal, Input, Select } from '@/components/ui'
import { formatCurrency, formatDate } from '@/utils'
import dayjs from 'dayjs'

const expenseCategoryLabels: Record<string, string> = {
  rent: 'Office Rent', salary: 'Salary', fuel: 'Fuel',
  electricity: 'Electricity', internet: 'Internet', maintenance: 'Maintenance', other: 'Other',
}

// Categories and Colors
const categoryColors: Record<string, string> = {
  rent: '#38BDF8', salary: '#22C55E', fuel: '#F59E0B',
  electricity: '#8B5CF6', internet: '#F97316', maintenance: '#EC4899', other: '#6B7280',
}

function AddExpenseModal({ onClose }: { onClose: () => void }) {
  const createExpense = useCreateExpense()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ category: 'rent', amount: '', description: '', date: new Date().toISOString().split('T')[0] })

  const handleSubmit = async () => {
    if (!formData.amount || !formData.description || !formData.date) {
      alert('Please fill all required fields.')
      return
    }
    setLoading(true)
    try {
      await createExpense.mutateAsync({
        category: formData.category as any,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date
      })
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to add expense.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Select
        label="Expense Category *"
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        options={Object.entries(expenseCategoryLabels).map(([v, l]) => ({ value: v, label: l }))}
      />
      <Input label="Amount (₹) *" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="Enter amount" />
      <Input label="Description *" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" />
      <Input label="Date *" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-brand-300 transition-colors">
        <p className="text-sm text-slate-500">Upload Receipt (optional)</p>
        <p className="text-xs text-slate-400">JPG, PNG, PDF</p>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading}>Add Expense</Button>
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const [showModal, setShowModal] = useState(false)
  const { data: expenses = [], isLoading } = useExpenses()

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)

  const expenseByCategory = Object.entries(
    expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
      return acc
    }, {} as Record<string, number>)
  ).map(([cat, amount]) => ({
    name: expenseCategoryLabels[cat] ?? cat,
    value: amount,
    color: categoryColors[cat] ?? '#94a3b8',
  }))

  const months = Array.from({ length: 5 }, (_, i) => dayjs().subtract(4 - i, 'month').format('MMM'))
  const monthlyData = months.map((m) => {
    const amount = expenses
      .filter((e) => dayjs(e.date).format('MMM') === m)
      .reduce((sum, e) => sum + Number(e.amount), 0)
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
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Monitor and control operational expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
          <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Add Expense</Button>
        </div>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {expenseByCategory.map((cat) => (
          <div key={cat.name} className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
            <div className="w-3 h-3 rounded-full mb-2" style={{ background: cat.color }} />
            <p className="text-xl font-bold text-slate-900 amount-display">{formatCurrency(cat.value)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{cat.name}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Monthly Expense Trend</CardTitle></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip />
                <Bar dataKey="amount" name="Expense" fill="#FCA5A5" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {expenseByCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {expenseByCategory.map((cat) => (
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expense Records</CardTitle>
            <span className="text-sm font-semibold text-red-600 amount-display">Total: {formatCurrency(totalExpenses)}</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Date', 'Category', 'Description', 'Amount'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(exp.date)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{
                      background: `${categoryColors[exp.category]}20`,
                      color: categoryColors[exp.category],
                    }}>
                      {expenseCategoryLabels[exp.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{exp.description}</td>
                  <td className="px-4 py-3 text-sm font-bold text-red-600 amount-display">{formatCurrency(Number(exp.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Expense Entry" size="md">
        <AddExpenseModal onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
