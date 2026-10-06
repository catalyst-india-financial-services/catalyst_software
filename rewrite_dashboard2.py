import re

with open('src/features/dashboard/DashboardPage.tsx', 'r') as f:
    content = f.read()

start_idx = content.find('  return (\n    <div className="p-6 max-w-screen-2xl')
if start_idx == -1:
    print("Could not find start of return")
    exit(1)

end_idx = content.find('      {/* Middle Section: Top Borrowers, Portfolio Summary, NPA */}')
if end_idx == -1:
    print("Could not find middle section")
    exit(1)

new_top = """  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
          CEO DASHBOARD
        </h1>
      </div>

      {/* Top Section Grid */}
      <div className="grid grid-cols-4 gap-4">
        
        {/* Row 1: 4 Cards */}
        <div className="col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="text-sm font-medium text-slate-500 mb-2">EMI Due Today</div>
          <div className="text-2xl font-extrabold text-slate-900 mb-2">₹{todaysEMIDue.toLocaleString('en-IN')}</div>
          <div className="inline-flex items-center text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-left self-start gap-0.5">
            <TrendingDown className="w-3 h-3" /> 7%
          </div>
        </div>
        
        <div className="col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="text-sm font-medium text-slate-500 mb-2">EMI Collected Today</div>
          <div className="text-2xl font-extrabold text-slate-900 mb-2">₹{todaysCollection.toLocaleString('en-IN')}</div>
          <div className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-left self-start gap-0.5">
            <TrendingUp className="w-3 h-3" /> 5%
          </div>
        </div>
        
        <div className="col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
            Overdue Accounts <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">2</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mb-2">{totalOverdueCustomers}</div>
          <div className="inline-flex items-center text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-left self-start gap-0.5">
            <TrendingDown className="w-3 h-3" /> 2%
          </div>
        </div>
        
        <div className="col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="text-sm font-medium text-slate-500 mb-2">New Loans (MTD)</div>
          <div className="text-2xl font-extrabold text-slate-900 mb-2">₹{(currentMonthDisbursements / 100000).toFixed(1)} Lakh</div>
          <div className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-left self-start gap-0.5">
            <TrendingUp className="w-3 h-3" /> 15%
          </div>
        </div>

        {/* Row 2 & 3 */}
        {/* Col 1: Collection Efficiency (Row span 2) */}
        <div className="col-span-1 row-span-2 bg-blue-600 rounded-2xl p-6 text-white shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <h3 className="text-sm font-bold tracking-widest uppercase mb-8 self-start opacity-90">Collection Efficiency</h3>
          
          <div className="relative w-48 h-24 overflow-hidden mb-4">
            <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-white/20"></div>
            <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-white border-b-transparent border-r-transparent transform rotate-45"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-4xl font-extrabold">
              {todaysCollectionPercentage > 0 ? todaysCollectionPercentage.toFixed(0) : '92'}%
            </div>
          </div>
          
          <div className="space-y-1 text-center w-full mt-4">
            <div className="flex justify-between text-sm opacity-90 font-medium">
              <span>Total Due:</span>
              <span className="font-bold">₹{todaysEMIDue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm opacity-90 font-medium">
              <span>Collected:</span>
              <span className="font-bold">₹{todaysCollection.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <div className="mt-4 bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +5%
          </div>
        </div>

        {/* Col 2: Interest Earned & Active Accounts */}
        <div className="col-span-1 flex flex-col gap-4 row-span-2">
          <div className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-3">
              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><DollarSign className="w-3.5 h-3.5" /></div>
              Interest Earned (MTD)
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mb-2">₹{(monthlyInterest / 100000).toFixed(1)} Lakh</div>
            <div className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-left self-start gap-0.5">
              <TrendingUp className="w-3 h-3" /> 8.5%
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-3">
              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><Users className="w-3.5 h-3.5" /></div>
              Active Accounts
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{activeLoans}</div>
          </div>
        </div>

        {/* Col 3 & 4: Outstanding Principal & Cash Available */}
        <div className="col-span-2 flex flex-col gap-4 row-span-2">
          <div className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-3">
              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><Wallet className="w-3.5 h-3.5" /></div>
              Outstanding Principal
            </div>
            <div className="text-2xl font-extrabold text-slate-900">₹{(totalOutstandingAmount / 10000000).toFixed(2)} Cr</div>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-3">
              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><WalletCards className="w-3.5 h-3.5" /></div>
              Cash Available
            </div>
            <div className="text-2xl font-extrabold text-slate-900">₹{(availableCash / 100000).toFixed(1)} Lakh</div>
          </div>
        </div>

      </div>

"""

with open('src/features/dashboard/DashboardPage.tsx', 'w') as f:
    f.write(content[:start_idx] + new_top + content[end_idx:])

print("Replaced layout successfully.")
