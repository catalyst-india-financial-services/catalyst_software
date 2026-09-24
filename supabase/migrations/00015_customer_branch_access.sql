-- ─── Migration 00015: Customer Branch Access (Cross-Branch Profile & Account Sharing) ───
-- Table for explicit branch-level access control to customer profiles.
-- Every customer has a permanent base branch in public.customers.branch.
-- Access from other branches is requested and approved via this table without duplicating customer profiles.

CREATE TABLE IF NOT EXISTS public.customer_branch_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    branch_id VARCHAR(100) NOT NULL,
    access_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (access_status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'OWNER')),
    requested_by VARCHAR(255),
    requested_by_user_id UUID,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by VARCHAR(255),
    approved_by_user_id UUID,
    approved_at TIMESTAMPTZ,
    rejected_by VARCHAR(255),
    rejected_by_user_id UUID,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    loan_product VARCHAR(100),
    sanctioned_amount NUMERIC(14,2),
    loan_purpose TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_customer_branch_access UNIQUE (customer_id, branch_id)
);

-- Index for speedy lookups by customer_id and branch_id
CREATE INDEX IF NOT EXISTS idx_cba_customer_id ON public.customer_branch_access(customer_id);
CREATE INDEX IF NOT EXISTS idx_cba_branch_id ON public.customer_branch_access(branch_id);
CREATE INDEX IF NOT EXISTS idx_cba_status ON public.customer_branch_access(access_status);

-- Enable RLS
ALTER TABLE public.customer_branch_access ENABLE ROW LEVEL SECURITY;

-- Allow read/write access for authenticated / service role users
CREATE POLICY "Allow authenticated read customer_branch_access"
    ON public.customer_branch_access FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow authenticated insert customer_branch_access"
    ON public.customer_branch_access FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update customer_branch_access"
    ON public.customer_branch_access FOR UPDATE
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow authenticated delete customer_branch_access"
    ON public.customer_branch_access FOR DELETE
    TO authenticated, anon
    USING (true);
