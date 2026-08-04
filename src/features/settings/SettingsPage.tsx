import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Save, Upload, Percent, AlertCircle, Palette, Database, Download, CheckCircle2 } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardBody, Input, Select, Toggle, PageHeader } from '@/components/ui'
import { cn } from '@/utils'

const settingsTabs = [
  { id: 'company', label: 'Company', icon: Building2, desc: 'Business info & logo' },
  { id: 'interest', label: 'Interest & Penalty', icon: Percent, desc: 'Rates & grace period' },
  { id: 'receipt', label: 'Receipt', icon: AlertCircle, desc: 'Numbering & layout' },
  { id: 'theme', label: 'Appearance', icon: Palette, desc: 'Colors & display' },
  { id: 'backup', label: 'Backup & Data', icon: Database, desc: 'Export & restore' },
]

interface CompanyState {
  name: string; address: string; city: string; state: string;
  pincode: string; phone: string; email: string; gst: string; pan: string;
}
interface InterestState { default_rate: string; default_type: string; penalty_rate: string; grace_days: string }
interface ReceiptState { prefix: string; loan_prefix: string; customer_prefix: string; show_logo: boolean; show_terms: boolean }

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [savedFeedback, setSavedFeedback] = useState(false)
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

  const handleSave = () => {
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Configure your Finance ERP — company profile, interest rates, and receipts."
        action={
          <Button onClick={handleSave} className={cn('transition-all', savedFeedback && 'bg-emerald-600 hover:bg-emerald-700')}>
            {savedFeedback ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {savedFeedback ? 'Saved!' : 'Save Changes'}
          </Button>
        }
      />

      <div className="flex gap-6 items-start">
        {/* Sidebar nav */}
        <div className="w-56 flex-shrink-0 space-y-1">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left',
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="leading-none">{tab.label}</p>
                  {activeTab !== tab.id && (
                    <p className={cn('text-[10px] mt-0.5 font-normal', activeTab === tab.id ? 'text-brand-200' : 'text-slate-400')}>
                      {tab.desc}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Content Panel */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {/* ── Company ── */}
              {activeTab === 'company' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Company Profile</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    {/* Logo Upload */}
                    <div className="flex items-center gap-5 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg select-none">
                        SL
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 mb-1">Company Logo</p>
                        <Button variant="outline" size="sm" className="mb-2">
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
                      <Button onClick={handleSave}><Save className="h-4 w-4" /> Save Company Info</Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* ── Interest & Penalty ── */}
              {activeTab === 'interest' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Interest & Penalty Settings</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Default Loan Configuration</p>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Default Interest Rate (% p.a.)"
                          type="number" step="0.5"
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
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Penalty & Grace Period</p>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Penalty Rate (% per month)"
                          type="number" step="0.5"
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
                      <div className="mt-4 bg-amber-50 border border-amber-200/80 rounded-2xl p-4">
                        <p className="text-xs font-bold text-amber-800 mb-2">📐 Penalty Calculation Formula</p>
                        <code className="block text-xs font-mono bg-white/70 text-amber-900 rounded-xl px-3 py-2 border border-amber-100">
                          Penalty = (Outstanding EMI × Penalty Rate × Overdue Days) ÷ 30
                        </code>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSave}><Save className="h-4 w-4" /> Save Settings</Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* ── Receipt ── */}
              {activeTab === 'receipt' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Receipt & Numbering Settings</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">ID Prefixes</p>
                      <div className="grid grid-cols-3 gap-4">
                        <Input label="Receipt Prefix" value={receipt.prefix} onChange={updateReceipt('prefix')} />
                        <Input label="Loan Number Prefix" value={receipt.loan_prefix} onChange={updateReceipt('loan_prefix')} />
                        <Input label="Customer ID Prefix" value={receipt.customer_prefix} onChange={updateReceipt('customer_prefix')} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Toggle checked={receipt.show_logo} onChange={(v) => setReceipt((prev) => ({ ...prev, show_logo: v }))} label="Show company logo on receipts" />
                      <Toggle checked={receipt.show_terms} onChange={(v) => setReceipt((prev) => ({ ...prev, show_terms: v }))} label="Show terms & conditions on receipts" />
                    </div>

                    {/* Receipt Preview */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Live Preview</p>
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
                        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm max-w-xs mx-auto">
                          {receipt.show_logo && (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center text-white text-sm font-extrabold mb-3">SL</div>
                          )}
                          <div className="border-b border-slate-100 pb-3 mb-3">
                            <p className="text-sm font-extrabold text-slate-900">{company.name}</p>
                            <p className="text-[10px] text-slate-400">{company.city}</p>
                          </div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Receipt No.</span>
                            <span className="font-bold">{receipt.prefix}2025001</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Date</span>
                            <span className="font-bold">30 Jul 2025</span>
                          </div>
                          <div className="border-t border-dashed border-slate-200 my-3" />
                          <div className="flex justify-between text-sm font-extrabold">
                            <span>Amount Paid</span>
                            <span className="text-emerald-600 amount-display">₹24,986</span>
                          </div>
                          {receipt.show_terms && (
                            <p className="text-[9px] text-slate-300 mt-3 italic border-t border-slate-100 pt-2">
                              Subject to terms & conditions. E&OE.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSave}><Save className="h-4 w-4" /> Save Settings</Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* ── Appearance ── */}
              {activeTab === 'theme' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Theme & Appearance</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Color Accent</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { name: 'Ocean Blue', primary: '#2563EB', secondary: '#22C55E', active: true },
                          { name: 'Royal Violet', primary: '#7C3AED', secondary: '#EC4899', active: false },
                          { name: 'Forest Green', primary: '#16A34A', secondary: '#0EA5E9', active: false },
                          { name: 'Sunset Orange', primary: '#EA580C', secondary: '#EF4444', active: false },
                          { name: 'Midnight Slate', primary: '#1E293B', secondary: '#38BDF8', active: false },
                          { name: 'Rose Gold', primary: '#E11D48', secondary: '#F59E0B', active: false },
                        ].map((theme) => (
                          <button
                            key={theme.name}
                            className={cn(
                              'flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all hover:shadow-md',
                              theme.active ? 'border-brand-600 bg-brand-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
                            )}
                          >
                            <div className="flex gap-1.5">
                              <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{ background: theme.primary }} />
                              <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{ background: theme.secondary }} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700">{theme.name}</span>
                            {theme.active && <span className="text-[9px] font-bold text-brand-600 uppercase tracking-wider">Active</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Display Preferences</p>
                      <div className="space-y-3">
                        <Toggle checked={false} onChange={() => {}} label="Dark Mode (Coming Soon)" />
                        <Toggle checked={true} onChange={() => {}} label="Enable smooth animations" />
                        <Toggle checked={true} onChange={() => {}} label="Compact table density" />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSave}><Save className="h-4 w-4" /> Apply Theme</Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* ── Backup ── */}
              {activeTab === 'backup' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Backup & Data Management</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-5">
                    {/* Status */}
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-emerald-800">Last Backup: 30 Jul 2025 at 10:30 AM</p>
                        <p className="text-xs text-emerald-600">Cloud Sync Active · 100% complete</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition-shadow">
                        <Database className="h-8 w-8 text-brand-600 mb-3" />
                        <h4 className="text-sm font-bold text-slate-800 mb-1">Create Backup</h4>
                        <p className="text-xs text-slate-500 mb-4">Export all data to a secure encrypted file.</p>
                        <Button size="sm" variant="outline" className="w-full">
                          <Download className="h-4 w-4" /> Backup Now
                        </Button>
                      </div>
                      <div className="border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition-shadow">
                        <Upload className="h-8 w-8 text-emerald-600 mb-3" />
                        <h4 className="text-sm font-bold text-slate-800 mb-1">Restore Data</h4>
                        <p className="text-xs text-slate-500 mb-4">Restore from a previously created backup file.</p>
                        <Button size="sm" variant="outline" className="w-full">
                          <Upload className="h-4 w-4" /> Restore
                        </Button>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="border-2 border-red-200 rounded-2xl p-5 bg-red-50/50">
                      <p className="text-sm font-extrabold text-red-800 mb-1">⚠ Danger Zone</p>
                      <p className="text-xs text-red-600 mb-4">These actions are permanent and irreversible. Ensure you have a recent backup before proceeding.</p>
                      <Button variant="destructive" size="sm">Reset All Data</Button>
                    </div>
                  </CardBody>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
