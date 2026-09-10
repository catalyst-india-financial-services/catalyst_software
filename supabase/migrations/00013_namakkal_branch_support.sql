-- ─── Migration 00013: Namakkal Branch User Support ──────────────────────────
-- Inserts the Namakkal branch user profiles into public.users.

INSERT INTO public.users (email, full_name, role, branch, is_active)
VALUES
  ('namakkalcatalyst@gmail.com', 'Namakkal Branch', 'branch', 'Namakkal', true),
  ('namakkal@catalyst.com', 'Namakkal Branch', 'branch', 'Namakkal', true)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  branch = EXCLUDED.branch,
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;
