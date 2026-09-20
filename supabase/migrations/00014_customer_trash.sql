-- Migration: Customer Trash Table
-- Purpose: Stores soft-deleted customer records as JSON snapshots
-- Run this in the Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.customer_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  snapshot JSONB NOT NULL,
  deleted_by VARCHAR(255),
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customer_trash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access on customer_trash"
  ON public.customer_trash
  FOR ALL
  USING (auth.role() = 'authenticated');
