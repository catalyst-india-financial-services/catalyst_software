-- PostgreSQL Schema Migration: 00004_customer_risk_and_segment.sql
-- Purpose: Add customer risk level and segments configuration tables and fields.

-- 1. Extend Customers Table with compliance risk and customer segment fields
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50) DEFAULT 'LOW';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_segment TEXT DEFAULT 'Website';

-- 2. Add constraint for risk_level values
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS chk_customer_risk_level;
ALTER TABLE public.customers ADD CONSTRAINT chk_customer_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH'));

-- 3. Update existing records if null
UPDATE public.customers SET risk_level = 'LOW' WHERE risk_level IS NULL;
UPDATE public.customers SET customer_segment = 'Website' WHERE customer_segment IS NULL;

-- 4. Create Segment Options table
CREATE TABLE IF NOT EXISTS public.customer_segment_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security on the new table to match other tables in single-tenant ERP
ALTER TABLE public.customer_segment_options DISABLE ROW LEVEL SECURITY;

-- 5. Insert default segment options
INSERT INTO public.customer_segment_options (name) VALUES 
('Website'), 
('Social Media'), 
('Direct Customer') 
ON CONFLICT (name) DO NOTHING;
