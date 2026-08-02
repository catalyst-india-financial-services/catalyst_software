import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, MapPin, Building, CreditCard, CheckCircle2 } from 'lucide-react'
import { useCustomer, useLoans, usePayments } from '@/hooks/useDb'
import { Button, Card, CardHeader, CardTitle, CardBody, Avatar, StatusBadge, Badge } from '@/components/ui'
import { formatCurrency, formatDate, maskAadhaar, maskPAN } from '@/utils'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const { data: customer, isLoading: isCustLoading } = useCustomer(id)
  const { data: allLoans = [], isLoading: isLoansLoading } = useLoans()
  const { data: allPayments = [], isLoading: isPaymentsLoading } = usePayments()

  if (isCustLoading || isLoansLoading || isPaymentsLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  if (!customer) {
    return <div className="p-6 text-center text-slate-500">Customer not found.</div>
  }

  const loans = allLoans.filter((l) => l.customer_id === customer.id)
  const payments = allPayments.filter((p) => p.customer_id === customer.id)

  const [activeTab, setActiveTab] = useState<'loans' | 'kyc' | 'payments' | 'guarantor'>('loans')

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </button>

      {/* Customer Header Card */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-xl overflow-hidden relative border-0">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-500/20 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <Avatar name={customer.name} size="xl" className="ring-4 ring-white/20 shadow-lg text-slate-900" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
                <StatusBadge status={customer.status} />
              </div>
              <p className="text-sm text-slate-300 font-mono mt-0.5">ID: {customer.customer_id}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-brand-400" />{customer.mobile}</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-400" />{customer.city}, {customer.state}</span>
                <span className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-amber-400" />{customer.occupation || 'Self-Employed'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/emi-collection')}>
              <CreditCard className="h-4 w-4" /> Collect EMI
            </Button>
            <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Edit Profile
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'loans', label: `Loans (${loans.length})` },
          { id: 'kyc', label: 'KYC & Verification' },
          { id: 'payments', label: `Payment History (${payments.length})` },
          { id: 'guarantor', label: 'Guarantor Details' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {loans.length === 0 ? (
            <Card className="p-8 text-center text-slate-400">No active or past loans found.</Card>
          ) : (
            loans.map((loan) => (
              <Card key={loan.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-lg">{loan.loan_number}</span>
                      <Badge variant="outline" className="uppercase text-xs">{loan.loan_type} loan</Badge>
                      <StatusBadge status={loan.status} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Disbursed on {formatDate(loan.loan_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/loans/${loan.id}`)}>
                      View Schedule
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Loan Amount</p>
                    <p className="font-bold text-slate-800 amount-display">{formatCurrency(loan.loan_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Monthly EMI</p>
                    <p className="font-bold text-emerald-700 amount-display">{formatCurrency(loan.emi_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Remaining Balance</p>
                    <p className="font-bold text-slate-800 amount-display">{formatCurrency(loan.remaining_balance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">EMIs Left</p>
                    <p className="font-semibold text-slate-700">{loan.remaining_emi} of {loan.emi_count} months</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'kyc' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">KYC Status</h3>
            <StatusBadge status={customer.kyc_status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Aadhaar Card</p>
              <p className="text-lg font-mono font-semibold text-slate-800">{customer.aadhaar ? maskAadhaar(customer.aadhaar) : 'Not provided'}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-4 w-4" /> Verified</span>
                <button className="text-brand-600 hover:underline">View Document</button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">PAN Card</p>
              <p className="text-lg font-mono font-semibold text-slate-800">{customer.pan ? maskPAN(customer.pan) : 'Not provided'}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-4 w-4" /> Verified</span>
                <button className="text-brand-600 hover:underline">View Document</button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Receipt No.', 'EMI #', 'Date', 'Amount Paid', 'Mode', 'Collected By'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-600 font-semibold">{p.receipt_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">#{p.emi_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-700 amount-display">{formatCurrency(p.amount_paid)}</td>
                    <td className="px-4 py-3 text-xs uppercase font-semibold text-slate-600">{p.payment_mode}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.collected_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'guarantor' && (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Guarantor Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-slate-400">Guarantor Name</p><p className="font-semibold text-slate-800">Senthil Kumar</p></div>
            <div><p className="text-xs text-slate-400">Relationship</p><p className="font-semibold text-slate-800">Brother</p></div>
            <div><p className="text-xs text-slate-400">Mobile</p><p className="font-semibold text-slate-800">9876501234</p></div>
            <div><p className="text-xs text-slate-400">Address</p><p className="font-semibold text-slate-800">46, MG Road, Chennai</p></div>
          </div>
        </Card>
      )}
    </div>
  )
}
