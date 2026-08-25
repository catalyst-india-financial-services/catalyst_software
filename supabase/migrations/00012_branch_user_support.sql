-- ─── Migration 00012: Branch User Support ─────────────────────────────────────
-- Adds branch field to users table for branch-level login filtering.

-- 1. Add branch column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch VARCHAR(100);

-- 2. Update role check to include 'branch' role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'manager', 'staff', 'branch'));

-- 3. Ensure loans table has a branch column
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS branch VARCHAR(100);

-- 4. Ensure customers table has a branch column for filtering
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS branch VARCHAR(100);

-- 5. Insert the two branch user profiles
INSERT INTO public.users (email, full_name, role, branch, is_active)
VALUES
  ('aniyapuram@catalyst.com', 'Aniyapuram Branch', 'branch', 'Aniyapuram', true),
  ('vallipuram@catalyst.com', 'Vallipuram Branch', 'branch', 'Vallipuram', true)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  branch = EXCLUDED.branch,
  is_active = EXCLUDED.is_active;
