import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Save, Upload, Percent, AlertCircle, Palette, Database, Download } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardBody, Input, Select, Toggle } from '@/components/ui'
import { cn } from '@/utils'

const settingsTabs = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'interest', label: 'Interest & Penalty', icon: Percent },
  { id: 'receipt', label: 'Receipt', icon: AlertCircle },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'backup', label: 'Backup', icon: Database },
]

interface CompanyState {
  name: string; address: string; city: string; state: string;
  pincode: string; phone: string; email: string; gst: string; pan: string;
}
interface InterestState { default_rate: string; default_type: string; penalty_rate: string; grace_days: string }
interface ReceiptState { prefix: string; loan_prefix: string; customer_prefix: string; show_logo: boolean; show_terms: boolean }

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [company, setCompany] = useState<CompanyState>({
    name: 'Sri Lakshmi Finance', address: '45, MG Road, Anna Nagar', city: 'Chennai', state: 'Tamil Nadu',
    pincode: '600040', phone: '044-28888888', email: 'info@srilakshmifinance.com', gst: '33AABCS1234F1ZB', pan: 'AABCS1234F',
  })
  const [interest, setInterest] = useState<InterestState>({
    default_rate: '18', default_type: 'reducing', penalty_rate: '2', grace_days: '5',
  })
  const [receipt, setReceipt] = useState<ReceiptState>({
    prefix: 'RCP', loan_prefix: 'LN', customer_prefix: 'CUS', show_logo: true, show_terms: true,
  })

  const updateCompany = (key: keyof CompanyState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCompany((prev) => ({ ...prev, [key]: e.target.value }))

  const updateInterest = (key: keyof InterestState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setInterest((prev) => ({ ...prev, [key]: e.target.value }))

  const updateReceipt = (key: keyof ReceiptState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setReceipt((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <div className="p-6 space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your Finance ERP system</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-52 flex-shrink-0 space-y-1">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  activeTab === tab.id ? 'bg-brand-500 text-white shadow-kpi' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
            {activeTab === 'company' && (
              <Card>
                <CardHeader><CardTitle>Company Profile</CardTitle></CardHeader>
                <CardBody className="space-y-5">
                  {/* Logo Upload */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-2xl font-bold shadow-kpi">
                      SL
                    </div>
                    <div>
                      <Button variant="outline" size="sm" className="mb-1">
                        <Upload className="h-4 w-4" /> Upload Logo
                      </Button>
                      <p className="text-xs text-slate-400">PNG, JPG up to 2MB. 200×200px recommended.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Input label="Company Name *" value={company.name} onChange={updateCompany('name')} />
                    </div>
                    <div className="col-span-2">
                      <Input label="Address *" value={company.address} onChange={updateCompany('address')} />
                    </div>
                    <Input label="City" value={company.city} onChange={updateCompany('city')} />
                    <Input label="State" value={company.state} onChange={updateCompany('state')} />
                    <Input label="Pincode" value={company.pincode} onChange={updateCompany('pincode')} />
                    <Input label="Phone" value={company.phone} onChange={updateCompany('phone')} />
                    <Input label="Email" value={company.email} onChange={updateCompany('email')} />
                    <Input label="GST Number" value={company.gst} onChange={updateCompany('gst')} />
                    <Input label="PAN Number" value={company.pan} onChange={updateCompany('pan')} />
                  </div>

                  <div className="flex justify-end">
                    <Button><Save className="h-4 w-4" /> Save Changes</Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {activeTab === 'interest' && (
              <Card>
                <CardHeader><CardTitle>Interest & Penalty Settings</CardTitle></CardHeader>
                <CardBody className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Default Loan Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Default Interest Rate (% p.a.)"
                        type="number"
                        step="0.5"
                        value={interest.default_rate}
                        onChange={updateInterest('default_rate')}
                      />
                      <Select
                        label="Default Interest Type"
                        value={interest.default_type}
                        onChange={(e) => setInterest((prev) => ({ ...prev, default_type: e.target.value }))}
                        options={[{ value: 'reducing', label: 'Reducing Balance' }, { value: 'flat', label: 'Flat Rate' }]}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Penalty Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Penalty Rate (% per month)"
                        type="number"
                        step="0.5"
                        value={interest.penalty_rate}
                        onChange={updateInterest('penalty_rate')}
                      />
                      <Input
                        label="Grace Period (days)"
                        type="number"
                        value={interest.grace_days}
                        onChange={updateInterest('grace_days')}
                      />
                    </div>
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                      <p className="font-semibold mb-1">Penalty Calculation Formula</p>
                      <p className="font-mono text-xs bg-white rounded p-2 mt-2">
                        Penalty = (Outstanding EMI × Penalty Rate × Overdue Days) ÷ 30
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button><Save className="h-4 w-4" /> Save Settings</Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {activeTab === 'receipt' && (
              <Card>
                <CardHeader><CardTitle>Receipt & Numbering Settings</CardTitle></CardHeader>
                <CardBody className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="Receipt Prefix" value={receipt.prefix} onChange={updateReceipt('prefix')} />
                    <Input label="Loan Number Prefix" value={receipt.loan_prefix} onChange={updateReceipt('loan_prefix')} />
                    <Input label="Customer ID Prefix" value={receipt.customer_prefix} onChange={updateReceipt('customer_prefix')} />
                  </div>
                  <div className="space-y-3">
                    <Toggle checked={receipt.show_logo} onChange={(v) => setReceipt((prev) => ({ ...prev, show_logo: v }))} label="Show company logo on receipts" />
                    <Toggle checked={receipt.show_terms} onChange={(v) => setReceipt((prev) => ({ ...prev, show_terms: v }))} label="Show terms & conditions on receipts" />
                  </div>

                  {/* Receipt Preview */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Receipt Preview</p>
                    <div className="bg-white rounded-lg p-4 border border-slate-100 text-sm">
                      <div className="text-center border-b border-slate-100 pb-3 mb-3">
                        <p className="font-bold text-slate-900">{company.name}</p>
                        <p className="text-xs text-slate-400">{company.city}</p>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Receipt No.</span>
                        <span className="font-semibold">{receipt.prefix}2025001</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-slate-500">Date</span>
                        <span className="font-semibold">30 Jul 2025</span>
                      </div>
                      <div className="border-t border-dashed border-slate-200 my-2" />
                      <div className="flex justify-between text-sm font-bold">
                        <span>Amount Paid</span>
                        <span>₹24,986</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button><Save className="h-4 w-4" /> Save Settings</Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {activeTab === 'theme' && (
              <Card>
                <CardHeader><CardTitle>Theme & Appearance</CardTitle></CardHeader>
                <CardBody className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">Color Scheme</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { name: 'Ocean Blue', primary: '#38BDF8', secondary: '#22C55E', active: true },
                        { name: 'Royal Purple', primary: '#8B5CF6', secondary: '#EC4899', active: false },
                        { name: 'Forest Green', primary: '#16A34A', secondary: '#0EA5E9', active: false },
                        { name: 'Sunset Orange', primary: '#F97316', secondary: '#EF4444', active: false },
                        { name: 'Midnight', primary: '#1E293B', secondary: '#38BDF8', active: false },
                        { name: 'Rose Gold', primary: '#F43F5E', secondary: '#F59E0B', active: false },
                      ].map((theme) => (
                        <button
                          key={theme.name}
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                            theme.active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <div className="flex gap-1">
                            <div className="w-6 h-6 rounded-full" style={{ background: theme.primary }} />
                            <div className="w-6 h-6 rounded-full" style={{ background: theme.secondary }} />
                          </div>
                          <span className="text-xs font-medium text-slate-700">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-5">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Display Options</p>
                    <div className="space-y-3">
                      <Toggle checked={false} onChange={() => {}} label="Dark Mode (Coming Soon)" />
                      <Toggle checked={true} onChange={() => {}} label="Show animations" />
                      <Toggle checked={true} onChange={() => {}} label="Compact table rows" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button><Save className="h-4 w-4" /> Apply Theme</Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {activeTab === 'backup' && (
              <Card>
                <CardHeader><CardTitle>Backup & Restore</CardTitle></CardHeader>
                <CardBody className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-emerald-800 mb-1">Last Backup</p>
                    <p className="text-xs text-emerald-600">30 Jul 2025 at 10:30 AM — Cloud Sync Active</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-xl p-4">
                      <Database className="h-8 w-8 text-brand-500 mb-3" />
                      <h4 className="text-sm font-semibold text-slate-800 mb-1">Create Backup</h4>
                      <p className="text-xs text-slate-500 mb-3">Export all data to a secure file</p>
                      <Button size="sm" variant="outline" className="w-full">
                        <Download className="h-4 w-4" /> Backup Now
                      </Button>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4">
                      <Upload className="h-8 w-8 text-emerald-500 mb-3" />
                      <h4 className="text-sm font-semibold text-slate-800 mb-1">Restore Data</h4>
                      <p className="text-xs text-slate-500 mb-3">Restore from a previous backup file</p>
                      <Button size="sm" variant="outline" className="w-full">
                        <Upload className="h-4 w-4" /> Restore
                      </Button>
                    </div>
                  </div>

                  <div className="border border-red-100 rounded-xl p-4 bg-red-50">
                    <p className="text-sm font-semibold text-red-800 mb-1">⚠ Danger Zone</p>
                    <p className="text-xs text-red-600 mb-3">These actions are irreversible. Please back up your data first.</p>
                    <Button variant="destructive" size="sm">Reset All Data</Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
