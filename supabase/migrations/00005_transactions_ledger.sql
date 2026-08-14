-- Migration 00005: Transactions Ledger + Bank Accounts
-- Adds bank_accounts and transactions tables for the full accounting ledger module.

-- ─── Bank Accounts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'bank' CHECK (account_type IN ('cash', 'bank', 'current', 'savings')),
    account_number VARCHAR(100),
    bank_name VARCHAR(100),
    opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Transactions (Master Ledger) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    txn_id VARCHAR(50) UNIQUE NOT NULL,
    txn_type VARCHAR(30) NOT NULL CHECK (txn_type IN ('disbursement', 'repayment', 'expense', 'deposit')),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('debit', 'credit')),
    amount NUMERIC(14,2) NOT NULL,
    bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    reference_number VARCHAR(100),
    description TEXT,
    date DATE NOT NULL,
    -- Repayment breakdown
    principal NUMERIC(14,2),
    interest NUMERIC(14,2),
    other_charges NUMERIC(14,2),
    -- Expense specific
    category VARCHAR(100),
    -- Deposit specific
    deposit_type VARCHAR(100),
    -- Metadata
    created_by VARCHAR(255) NOT NULL DEFAULT 'Admin',
    is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    reversal_of UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions (txn_type, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions (bank_account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_loan ON public.transactions (loan_id);

-- RLS Policies
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read/write on bank_accounts"
    ON public.bank_accounts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read/write on transactions"
    ON public.transactions FOR ALL USING (auth.role() = 'authenticated');
