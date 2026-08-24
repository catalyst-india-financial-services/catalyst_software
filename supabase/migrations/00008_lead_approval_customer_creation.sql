-- Migration 00008: Lead Approval → Customer Creation Flow
-- Adds the two-step flow: Lead Approval (no customer) → Manual Customer Creation

-- ─── 1. Add 'Approved' to applications status CHECK ──────────────────────────
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('Pending', 'Interested', 'Approved', 'Converted', 'Rejected'));

-- ─── 2. Add approval tracking columns to applications ─────────────────────────
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS customer_conversion_status VARCHAR(20) DEFAULT 'Not Created'
    CHECK (customer_conversion_status IN ('Not Created', 'Converted')),
  ADD COLUMN IF NOT EXISTS customer_linked_id TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- ─── 3. Add 'draft' to customers status CHECK ─────────────────────────────────
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_status_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_status_check
  CHECK (status IN ('draft', 'active', 'inactive', 'blocked'));

-- ─── 4. Add lead linkage to customers table ───────────────────────────────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.applications(id) ON DELETE SET NULL;

-- ─── 5. Add new customer profile columns ─────────────────────────────────────
ALTER TABLE public.customers
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

-- ─── 6. Indexes for performance ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_applications_status_conversion
  ON public.applications (status, customer_conversion_status);

CREATE INDEX IF NOT EXISTS idx_customers_lead_id
  ON public.customers (lead_id);

CREATE INDEX IF NOT EXISTS idx_customers_status_draft
  ON public.customers (status);

-- ─── 7. RLS policies for applications table (if not already present) ──────────
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'applications' AND policyname = 'Allow authenticated read/write on applications'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read/write on applications" ON public.applications FOR ALL USING (auth.role() = ''authenticated'')';
  END IF;
END $$;
