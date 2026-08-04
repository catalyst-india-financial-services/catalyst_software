-- ============================================================
-- Migration: 00002_lead_followups.sql
-- Purpose  : Support 'Interested' lead status + follow-up notes
-- Run this in: Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

-- 1. Allow 'Interested' as a valid status on applications table
ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('Pending', 'Converted', 'Rejected', 'Interested'));

-- 2. Create lead_followups table
CREATE TABLE IF NOT EXISTS lead_followups (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  last_conversation_note text,
  next_followup_date     date,
  next_followup_time     time,
  reminder_status        text NOT NULL DEFAULT 'pending'
                           CHECK (reminder_status IN ('pending', 'completed', 'overdue')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id)
);

-- 3. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_lead_followups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_followups_updated_at ON lead_followups;
CREATE TRIGGER trg_lead_followups_updated_at
  BEFORE UPDATE ON lead_followups
  FOR EACH ROW EXECUTE FUNCTION update_lead_followups_updated_at();

-- 4. RLS: disable for this single-tenant ERP app
--    (same pattern as other tables in this project)
ALTER TABLE lead_followups DISABLE ROW LEVEL SECURITY;
