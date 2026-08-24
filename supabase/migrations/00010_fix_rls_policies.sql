-- Migration 00010: Fix Missing RLS Policies + Apply 00008/00009 Changes Safely
-- Run this in Supabase SQL Editor to fix the Dashboard error and Account Creation.
-- This migration is safe to run multiple times (idempotent).

-- ─── 1. INCOME TABLE: Add authenticated read/write policy ─────────────────────
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'income' AND policyname = 'Allow authenticated read/write on income'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read/write on income" ON public.income FOR ALL USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

-- ─── 2. EXPENSES TABLE: Add authenticated read/write policy ───────────────────
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Allow authenticated read/write on expenses'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read/write on expenses" ON public.expenses FOR ALL USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

-- ─── 3. EMI_SCHEDULE TABLE: Add authenticated read/write policy ───────────────
ALTER TABLE public.emi_schedule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'emi_schedule' AND policyname = 'Allow authenticated read/write on emi_schedule'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read/write on emi_schedule" ON public.emi_schedule FOR ALL USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

-- ─── 4. APPLICATIONS TABLE (LEADS): RLS + Policy ─────────────────────────────
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'applications' AND policyname = 'Allow authenticated read/write on applications'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read/write on applications" ON public.applications FOR ALL USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

-- ─── 6. LOANS TABLE: Allow 'draft' and 'pending' status values ────────────────
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE public.loans
  ADD CONSTRAINT loans_status_check
  CHECK (status IN ('draft', 'active', 'closed', 'overdue', 'pending'));

-- ─── 7. CUSTOMERS TABLE: Allow 'draft' status ─────────────────────────────────
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_status_check
  CHECK (status IN ('draft', 'active', 'inactive', 'blocked'));

-- ─── 8. LOANS TABLE: Add wizard columns (safe / idempotent) ──────────────────
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS sanctioned_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS loan_product VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_purpose VARCHAR(255),
  ADD COLUMN IF NOT EXISTS branch VARCHAR(100),
  ADD COLUMN IF NOT EXISTS account_opening_date DATE,
  ADD COLUMN IF NOT EXISTS repayment_frequency VARCHAR(20) DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS repayment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS repayment_start_date DATE,
  ADD COLUMN IF NOT EXISTS first_demand_date DATE,
  ADD COLUMN IF NOT EXISTS emi_due_day INT,
  ADD COLUMN IF NOT EXISTS grace_period INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS penal_interest_rate NUMERIC(5,2) DEFAULT 2,
  ADD COLUMN IF NOT EXISTS late_payment_charges NUMERIC(10,2) DEFAULT 500,
  ADD COLUMN IF NOT EXISTS guarantor_customer_id UUID,
  ADD COLUMN IF NOT EXISTS guarantor_relationship VARCHAR(100),
  ADD COLUMN IF NOT EXISTS guarantor_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS guarantor_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS security_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS security_description TEXT,
  ADD COLUMN IF NOT EXISTS security_owner_id UUID,
  ADD COLUMN IF NOT EXISTS security_ownership_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS security_market_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS security_valuation_date DATE,
  ADD COLUMN IF NOT EXISTS security_ltv NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS security_doc_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS security_doc_status VARCHAR(100),
  ADD COLUMN IF NOT EXISTS security_insurance_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS security_insurance_details TEXT,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- Add repayment_frequency check constraint (safely)
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_repayment_frequency_check;
ALTER TABLE public.loans
  ADD CONSTRAINT loans_repayment_frequency_check
  CHECK (repayment_frequency IN ('monthly', 'weekly', 'fortnightly'));

-- ─── 9. APPLICATIONS TABLE: Add approval tracking columns ────────────────────
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('Pending', 'Interested', 'Approved', 'Converted', 'Rejected'));

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS customer_conversion_status VARCHAR(20) DEFAULT 'Not Created',
  ADD COLUMN IF NOT EXISTS customer_linked_id TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- ─── 10. CUSTOMERS TABLE: Add profile columns ─────────────────────────────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS lead_id UUID,
  ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kyc_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS kyc_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kyc_verified_date DATE,
  ADD COLUMN IF NOT EXISTS income NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS income_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cibil_score INTEGER,
  ADD COLUMN IF NOT EXISTS cibil_score_date DATE,
  ADD COLUMN IF NOT EXISTS customer_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS branch VARCHAR(100);

-- ─── 11. Performance Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_applications_status_conversion
  ON public.applications (status, customer_conversion_status);

CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON public.customers (lead_id);
CREATE INDEX IF NOT EXISTS idx_loans_repayment_freq ON public.loans (repayment_frequency);

-- All done! Refresh the browser after running this script.
