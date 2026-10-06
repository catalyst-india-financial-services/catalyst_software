import re

with open('src/features/dashboard/DashboardPage.tsx', 'r') as f:
    content = f.read()

# Find the start of the return statement
start_idx = content.find('  return (\n    <div className="relative p-6')
if start_idx == -1:
    start_idx = content.find('  return (\n    <div className="p-6')
    if start_idx == -1:
        print("Could not find start of return")
        exit(1)

# Find the end of the file (before the last closing brace of the function)
end_idx = content.rfind('}\n')

new_return = """  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
          CEO DASHBOARD
        </h1>
      </div>

      {/* Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left: Collection Efficiency (Span 1) */}
        <div className="lg:col-span-1 bg-blue-600 rounded-2xl p-6 text-white shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <h3 className="text-sm font-bold tracking-widest uppercase mb-8 self-start opacity-90">Collection Efficiency</h3>
          
          {/* Semi-circle gauge mock */}
          <div className="relative w-48 h-24 overflow-hidden mb-4">
            <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-white/20"></div>
            <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-white border-b-transparent border-r-transparent transform rotate-45"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-4xl font-extrabold">
              {collectionEfficiency > 0 ? collectionEfficiency.toFixed(0) : '92'}%
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

        {/* Right: 4x3 Grid (Span 3) */}
        <div className="lg:col-span-3 grid grid-cols-4 gap-4">
          
          {/* Row 1 */}
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

          {/* Row 2 */}
          <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-3">
              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><DollarSign className="w-3.5 h-3.5" /></div>
              Interest Earned (MTD)
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mb-2">₹{(monthlyInterest / 100000).toFixed(1)} Lakh</div>
            <div className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-left self-start gap-0.5">
              <TrendingUp className="w-3 h-3" /> 8.5%
            </div>
          </div>
          
          <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-3">
              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><Wallet className="w-3.5 h-3.5" /></div>
              Outstanding Principal
            </div>
            <div className="text-2xl font-extrabold text-slate-900">₹{(totalOutstandingAmount / 10000000).toFixed(2)} Cr</div>
          </div>

          {/* Row 3 */}
          <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-3">
              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><Users className="w-3.5 h-3.5" /></div>
              Active Accounts
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{activeLoans}</div>
          </div>
          
          <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-3">
              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><WalletCards className="w-3.5 h-3.5" /></div>
              Cash Available
            </div>
            <div className="text-2xl font-extrabold text-slate-900">₹{(availableCash / 100000).toFixed(1)} Lakh</div>
          </div>

        </div>
      </div>

      {/* Middle Section: Top Borrowers, Portfolio Summary, NPA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Top Borrowers */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Top Borrowers</h3>
            <button className="text-slate-400 hover:text-slate-600">...</button>
          </div>
          <div className="space-y-4">
            {[
              { init: 'RT', name: 'Ravi Traders', amount: 350000 },
              { init: 'SM', name: 'Suresh Motors', amount: 720000 },
              { init: 'KE', name: 'Kannan Ent.', amount: 199000 },
            ].map((b, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">
                    {b.init}
                  </div>
                  <div className="font-semibold text-slate-800 text-sm">{b.name}</div>
                </div>
                <div className="font-mono font-bold text-slate-900 text-sm">₹{b.amount.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Portfolio Summary</h3>
            <button className="text-slate-400 hover:text-slate-600">...</button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-sm font-semibold text-slate-500">Total Portfolio</span>
              <span className="text-sm font-mono font-bold text-slate-900">₹{(totalOutstandingAmount / 10000000).toFixed(2)} Cr</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-sm font-semibold text-slate-500">Active Accounts</span>
              <span className="text-sm font-mono font-bold text-slate-900">{activeLoans}</span>
            </div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-sm font-semibold text-slate-500">Closed Loans</span>
              <span className="text-sm font-mono font-bold text-slate-900">{closedLoans}</span>
            </div>
          </div>
        </div>

        {/* NPA & Risk Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">NPA & Risk Trend</h3>
            <button className="text-slate-400 hover:text-slate-600">...</button>
          </div>
          <div className="flex-1 min-h-[80px]">
             {/* Mock chart */}
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { value: 10 }, { value: 15 }, { value: 20 }, { value: 25 }, { value: 30 }, { value: 35 }, { value: 30 }
              ]}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Total High-Risk Exposures:</span>
            <span className="inline-flex items-center text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded gap-0.5">
              <TrendingDown className="w-3 h-3" /> 7
            </span>
          </div>
        </div>

      </div>

      {/* Bottom Section: Transactions, P&L, Balance Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Recent Transactions</h3>
            <button className="text-slate-400 hover:text-slate-600">...</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex flex-shrink-0 items-center justify-center">
                <WalletCards className="w-3 h-3 text-slate-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Loan Disbursed</div>
                <div className="font-bold text-sm text-slate-900">₹2,00,000</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex flex-shrink-0 items-center justify-center">
                <WalletCards className="w-3 h-3 text-slate-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Loan Disbursed</div>
                <div className="font-bold text-sm text-slate-900">₹2,00,000</div>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-2">
              <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex flex-shrink-0 items-center justify-center">
                <Check className="w-3 h-3" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">EMI Received</div>
                <div className="font-bold text-sm text-slate-900">₹15,000</div>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-2">
              <div className="w-6 h-6 rounded bg-amber-50 text-amber-600 flex flex-shrink-0 items-center justify-center">
                <AlertTriangle className="w-3 h-3" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Penalty Applied</div>
                <div className="font-bold text-sm text-slate-900">₹2,000</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profit & Loss (MTD) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-200 ring-2 ring-blue-50/50 relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Profit & Loss (MTD)</h3>
            <button className="text-slate-400 hover:text-slate-600">...</button>
          </div>
          
          <div className="space-y-3">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">INCOME</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Interest Income</span>
              <span className="text-sm font-mono font-bold text-slate-900">₹25,30,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Processing Fees</span>
              <span className="text-sm font-mono font-bold text-slate-900">₹1,20,000</span>
            </div>
            
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest pt-2">EXPENSES</div>
            <div className="flex items-center justify-between pb-3">
              <span className="text-sm font-semibold text-slate-700">Provisions</span>
              <span className="text-sm font-mono font-bold text-slate-900">₹3,50,000</span>
            </div>
            
            <div className="flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-lg">
              <span className="text-sm font-extrabold text-slate-900">Net Profit</span>
              <span className="text-sm font-mono font-extrabold text-emerald-600">₹23,00,000</span>
            </div>
          </div>
        </div>

        {/* Balance Sheet */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Balance Sheet (As of Date)</h3>
            <button className="text-slate-400 hover:text-slate-600">...</button>
          </div>
          
          <div className="space-y-3">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">ASSETS</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Loan Book</span>
              <span className="text-sm font-mono font-bold text-slate-900">₹1.82 Cr</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Cash & Bank</span>
              <span className="text-sm font-mono font-bold text-slate-900">₹28.4 Lakh</span>
            </div>
            
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest pt-2">LIABILITIES</div>
            <div className="flex items-center justify-between pb-3">
              <span className="text-sm font-semibold text-slate-700">Borrowings</span>
              <span className="text-sm font-mono font-bold text-slate-900">₹1.40 Cr</span>
            </div>
            
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
              <span className="text-sm font-extrabold text-slate-900">Net Worth</span>
              <span className="text-sm font-mono font-extrabold text-emerald-400">₹70.4 L</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
"""

with open('src/features/dashboard/DashboardPage.tsx', 'w') as f:
    f.write(content[:start_idx] + new_return + content[end_idx:])

print("Replaced return statement successfully.")
