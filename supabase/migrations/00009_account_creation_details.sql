-- Migration 00009: Account Creation Flow Details
-- Adds columns to the loans table for advanced parameters: sanctioned amount, frequency, repayments, guarantor, and collateral.

-- 1. Alter status CHECK constraint on loans
ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_status_check;

ALTER TABLE public.loans
  ADD CONSTRAINT loans_status_check
  CHECK (status IN ('draft', 'active', 'closed', 'overdue', 'pending'));

-- 2. Add new fields to loans table
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS sanctioned_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS loan_product VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_purpose VARCHAR(255),
  ADD COLUMN IF NOT EXISTS branch VARCHAR(100),
  ADD COLUMN IF NOT EXISTS account_opening_date DATE,
  ADD COLUMN IF NOT EXISTS repayment_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (repayment_frequency IN ('monthly', 'weekly', 'fortnightly')),
  ADD COLUMN IF NOT EXISTS repayment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS repayment_start_date DATE,
  ADD COLUMN IF NOT EXISTS first_demand_date DATE,
  ADD COLUMN IF NOT EXISTS emi_due_day INTEGER,
  ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penal_interest_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_payment_charges NUMERIC(12,2) DEFAULT 0,
  
  -- Guarantor relation
  ADD COLUMN IF NOT EXISTS guarantor_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guarantor_relationship VARCHAR(100),
  ADD COLUMN IF NOT EXISTS guarantor_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS guarantor_amount NUMERIC(14,2),
  
  -- Security/Collateral
  ADD COLUMN IF NOT EXISTS security_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS security_description TEXT,
  ADD COLUMN IF NOT EXISTS security_owner_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS security_ownership_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS security_market_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS security_valuation_date DATE,
  ADD COLUMN IF NOT EXISTS security_ltv NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS security_doc_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS security_doc_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS security_insurance_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS security_insurance_details TEXT,

  -- Auditing
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- 3. Indexes for new search fields
CREATE INDEX IF NOT EXISTS idx_loans_guarantor ON public.loans (guarantor_customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_security_owner ON public.loans (security_owner_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans (status);
