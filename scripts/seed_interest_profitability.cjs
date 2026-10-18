const url = "https://dawnjgihxnffxfvdpald.supabase.co/rest/v1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhd25qZ2loeG5mZnhmdmRwYWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0ODg4NzQsImV4cCI6MjEwMTA2NDg3NH0.AUgUMujlmSITLoOeXgQVqe_VOsnWOsDL4GwNijEieJ8";
const headers = { 
  apikey: key, 
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation"
};

async function api(path, options = {}) {
  let attempts = 0;
  while (attempts < 5) {
    try {
      const res = await fetch(`${url}${path}`, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) }
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status} on ${path}: ${text}`);
      }
      return res.json();
    } catch (err) {
      attempts++;
      if (attempts >= 5) throw err;
      console.warn(`Retry ${attempts} on ${path} due to: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function run() {
  console.log("Seeding expenses & income for Interest & Profitability...");

  // Clean & Seed Expenses
  const oldExp = await api("/expenses?date=gte.2026-08-01&date=lte.2026-09-30&select=id");
  if (oldExp.length > 0) {
    const ids = oldExp.map(e => e.id).join(',');
    await fetch(`${url}/expenses?id=in.(${ids})`, { method: "DELETE", headers });
  }

  const sepExpenses = [
    { category: 'salary', amount: 320000, date: '2026-09-05', desc: 'Staff Payroll September' },
    { category: 'rent', amount: 140000, date: '2026-09-02', desc: 'Branch Office Leases' },
    { category: 'electricity', amount: 60000, date: '2026-09-10', desc: 'Power, Water & Connectivity' },
    { category: 'other', amount: 70000, date: '2026-09-15', desc: 'Audit & Regulatory Filings' },
    { category: 'maintenance', amount: 70000, date: '2026-09-20', desc: 'Customer Outreach & Operations' },
  ]; // Total = 660,000 (₹ 6.60 L)

  const augExpenses = [
    { category: 'salary', amount: 300000, date: '2026-08-05', desc: 'Staff Payroll August' },
    { category: 'rent', amount: 140000, date: '2026-08-02', desc: 'Branch Office Leases' },
    { category: 'electricity', amount: 55000, date: '2026-08-10', desc: 'Power, Water & Connectivity' },
    { category: 'other', amount: 65000, date: '2026-08-15', desc: 'Audit & Legal Services' },
    { category: 'maintenance', amount: 62600, date: '2026-08-20', desc: 'Marketing August' },
  ]; // Total = 622,600 (+6.0% vs Aug)

  for (const exp of [...sepExpenses, ...augExpenses]) {
    await api("/expenses", {
      method: "POST",
      body: JSON.stringify({
        category: exp.category,
        amount: exp.amount,
        date: exp.date,
        description: exp.desc,
      })
    });
  }
  console.log("Expenses seeded successfully!");

  // Clean & Seed Non-EMI Income
  const oldInc = await api("/income?date=gte.2026-08-01&date=lte.2026-09-30&select=id");
  if (oldInc.length > 0) {
    const ids = oldInc.map(i => i.id).join(',');
    await fetch(`${url}/income?id=in.(${ids})`, { method: "DELETE", headers });
  }

  const sepIncome = [
    { category: 'processing_fee', amount: 150000, date: '2026-09-08', desc: 'Loan origination fees' },
    { category: 'other', amount: 80000, date: '2026-09-12', desc: 'Stamp & verification charges' },
    { category: 'penalty', amount: 50000, date: '2026-09-18', desc: 'Overdue recovery charges' },
  ]; // Total = 280,000 -> Total Income = 16.10 L + 2.80 L = 18.90 L!

  const augIncome = [
    { category: 'processing_fee', amount: 122000, date: '2026-08-08', desc: 'Loan origination fees' },
  ];

  for (const inc of [...sepIncome, ...augIncome]) {
    await api("/income", {
      method: "POST",
      body: JSON.stringify({
        category: inc.category,
        amount: inc.amount,
        date: inc.date,
        description: inc.desc,
      })
    });
  }
  console.log("Income seeded successfully!");

  // Check September totals
  const sepScheds = await api("/emi_schedule?due_date=gte.2026-09-01&due_date=lte.2026-09-30&select=interest");
  const totalExp = sepScheds.reduce((s, r) => s + Number(r.interest || 0), 0);
  const sepPays = await api("/emi_payments?payment_date=gte.2026-09-01&payment_date=lte.2026-09-30&select=interest_paid");
  const totalCol = sepPays.reduce((s, r) => s + Number(r.interest_paid || 0), 0);

  console.log("Sep Expected Interest:", totalExp, `(₹ ${(totalExp / 100000).toFixed(2)} L)`);
  console.log("Sep Collected Interest:", totalCol, `(₹ ${(totalCol / 100000).toFixed(2)} L)`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
