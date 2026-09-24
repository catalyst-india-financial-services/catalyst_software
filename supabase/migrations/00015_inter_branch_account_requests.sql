-- Migration 00015: Inter-Branch Account Creation & Profile Sharing Requests
-- Enables cross-branch customer account creation with mandatory permission workflow.

-- 1. Ensure customers table has shared_branches array for multi-branch access
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shared_branches TEXT[] DEFAULT '{}';

-- 2. Create inter_branch_requests table
CREATE TABLE IF NOT EXISTS public.inter_branch_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_custom_id VARCHAR(50),
    customer_name VARCHAR(255) NOT NULL,
    customer_mobile VARCHAR(50),
    base_branch VARCHAR(100) NOT NULL,
    requesting_branch VARCHAR(100) NOT NULL,
    loan_product VARCHAR(100),
    sanctioned_amount NUMERIC(14,2),
    loan_purpose VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by VARCHAR(255) NOT NULL,
    requested_by_email VARCHAR(255),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast filtering by branch and status
CREATE INDEX IF NOT EXISTS idx_ibr_base_branch ON public.inter_branch_requests (base_branch, status);
CREATE INDEX IF NOT EXISTS idx_ibr_requesting_branch ON public.inter_branch_requests (requesting_branch, status);
CREATE INDEX IF NOT EXISTS idx_ibr_customer ON public.inter_branch_requests (customer_id, requesting_branch);

-- 4. Enable RLS
ALTER TABLE public.inter_branch_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read/write on inter_branch_requests"
    ON public.inter_branch_requests FOR ALL USING (auth.role() = 'authenticated');
