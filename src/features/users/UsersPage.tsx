import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit2, Trash2, Shield } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardBody, Avatar, StatusBadge, Modal, Input, Select } from '@/components/ui'
import { formatDate, cn } from '@/utils'
import type { User } from '@/types'

const mockUsers: User[] = [
  { id: '1', email: 'admin@financeApp.com', full_name: 'Admin User', role: 'admin', is_active: true, mobile: '9876543210', last_login: new Date().toISOString(), created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '2', email: 'manager@financeApp.com', full_name: 'Ramesh Manager', role: 'manager', is_active: true, mobile: '9988776655', last_login: new Date(Date.now() - 86400000).toISOString(), created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
  { id: '3', email: 'staff1@financeApp.com', full_name: 'Murugan Staff', role: 'staff', is_active: true, mobile: '9123456789', last_login: new Date(Date.now() - 3600000).toISOString(), created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z' },
  { id: '4', email: 'staff2@financeApp.com', full_name: 'Priya Staff', role: 'staff', is_active: false, mobile: '9654321098', last_login: new Date(Date.now() - 604800000).toISOString(), created_at: '2024-04-01T00:00:00Z', updated_at: '2024-04-01T00:00:00Z' },
]

const rolePermissions: Record<User['role'], { label: string; color: string; desc: string; permissions: string[] }> = {
  admin: { label: 'Administrator', color: 'bg-violet-100 text-violet-700', desc: 'Full access to all modules and settings', permissions: ['All Modules', 'User Management', 'Settings', 'Reports', 'Delete Records', 'Export Data'] },
  manager: { label: 'Manager', color: 'bg-brand-100 text-brand-700', desc: 'Access to operations, reports and limited settings', permissions: ['Customers', 'Loans', 'EMI Collection', 'Income', 'Expenses', 'Reports', 'Export Data'] },
  staff: { label: 'Collection Staff', color: 'bg-emerald-100 text-emerald-700', desc: 'Limited to daily collection operations', permissions: ['EMI Collection', 'View Customers', 'View Loans', 'Receipts'] },
}

const modules = ['Dashboard', 'Customers', 'Loans', 'EMI Collection', 'Income', 'Expenses', 'Reports', 'User Management', 'Settings']
const roleAccess: Record<string, Record<User['role'], boolean>> = {
  Dashboard: { admin: true, manager: true, staff: true },
  Customers: { admin: true, manager: true, staff: false },
  Loans: { admin: true, manager: true, staff: false },
  'EMI Collection': { admin: true, manager: true, staff: true },
  Income: { admin: true, manager: true, staff: false },
  Expenses: { admin: true, manager: true, staff: false },
  Reports: { admin: true, manager: true, staff: false },
  'User Management': { admin: true, manager: false, staff: false },
  Settings: { admin: true, manager: false, staff: false },
}

function UserForm({ user, onClose }: { user?: User; onClose: () => void }) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name ?? '',
    email: user?.email ?? '',
    mobile: user?.mobile ?? '',
    role: user?.role ?? 'staff' as User['role'],
    password: '',
  })
  return (
    <div className="space-y-4">
      <Input label="Full Name *" value={formData.full_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, full_name: e.target.value }))} placeholder="Enter full name" />
      <Input label="Email Address *" type="email" value={formData.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
      <Input label="Mobile Number" value={formData.mobile} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, mobile: e.target.value }))} placeholder="10-digit mobile" />
      <Select
        label="Role *"
        value={formData.role}
        onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value as User['role'] }))}
        options={[
          { value: 'admin', label: 'Administrator' },
          { value: 'manager', label: 'Manager' },
          { value: 'staff', label: 'Collection Staff' },
        ]}
      />
      {!user && (
        <Input label="Password *" type="password" value={formData.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, password: e.target.value }))} placeholder="Set initial password" />
      )}

      {/* Role permissions preview */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Permissions for {rolePermissions[formData.role]?.label}</p>
        <div className="flex flex-wrap gap-2">
          {rolePermissions[formData.role]?.permissions.map((perm) => (
            <span key={perm} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-xs text-slate-600">{perm}</span>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onClose}>{user ? 'Update User' : 'Create User'}</Button>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | undefined>()

  return (
    <div className="p-6 space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage team members and access permissions</p>
        </div>
        <Button onClick={() => { setEditUser(undefined); setShowModal(true) }}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.entries(rolePermissions) as [User['role'], typeof rolePermissions.admin][]).map(([role, config]) => (
          <div key={role} className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
            <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-3', config.color)}>
              <Shield className="h-3 w-3" />
              {config.label}
            </div>
            <p className="text-xs text-slate-500 mb-3">{config.desc}</p>
            <p className="text-2xl font-bold text-slate-900 mb-1">
              {mockUsers.filter((u) => u.role === role).length}
            </p>
            <p className="text-xs text-slate-400">users with this role</p>
          </div>
        ))}
      </div>

      {/* User Table */}
      <Card>
        <CardHeader><CardTitle>Team Members ({mockUsers.length})</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['User', 'Email', 'Mobile', 'Role', 'Last Login', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user, idx) => {
                const roleConfig = rolePermissions[user.role]
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-slate-50 hover:bg-blue-50/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.full_name} size="sm" />
                        <span className="font-semibold text-slate-800">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{user.mobile ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold', roleConfig?.color)}>
                        <Shield className="h-3 w-3" />
                        {roleConfig?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{user.last_login ? formatDate(user.last_login) : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={user.is_active ? 'active' : 'inactive'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditUser(user); setShowModal(true) }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader><CardTitle>Permission Matrix</CardTitle></CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2 text-left text-xs font-semibold text-slate-600 w-48">Module</th>
                  {(Object.values(rolePermissions)).map((r) => (
                    <th key={r.label} className="py-2 text-center text-xs font-semibold text-slate-600">{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((module, idx) => (
                  <tr key={module} className={cn('border-b border-slate-50', idx % 2 === 0 ? '' : 'bg-slate-50/30')}>
                    <td className="py-2.5 font-medium text-slate-700">{module}</td>
                    {(['admin', 'manager', 'staff'] as User['role'][]).map((role) => (
                      <td key={role} className="py-2.5 text-center">
                        {roleAccess[module]?.[role] ? (
                          <svg className="h-4 w-4 text-emerald-500 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editUser ? `Edit User — ${editUser.full_name}` : 'Add New User'} size="md">
        <UserForm user={editUser} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
