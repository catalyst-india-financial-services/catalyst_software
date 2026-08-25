-- Migration 00011: Loan Purpose Options Configuration Table
-- Purpose: Add loan purpose options table to manage loan portfolio categories
-- Run this in Supabase SQL Editor after running previous migrations.
-- This migration is safe to run multiple times (idempotent).

-- 1. Create Loan Purpose Options table
CREATE TABLE IF NOT EXISTS public.loan_purpose_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Disable Row Level Security to match other config tables in single-tenant ERP
ALTER TABLE public.loan_purpose_options DISABLE ROW LEVEL SECURITY;

-- 3. Insert default loan purpose options
INSERT INTO public.loan_purpose_options (name) VALUES 
('Working Capital'),
('Equipment Purchase'),
('Business Expansion'),
('Home Construction'),
('Property Purchase'),
('Vehicle Purchase'),
('Education'),
('Agriculture'),
('Personal Use'),
('Debt Consolidation')
ON CONFLICT (name) DO NOTHING;

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_loan_purpose_options_active 
ON public.loan_purpose_options (is_active, name);
