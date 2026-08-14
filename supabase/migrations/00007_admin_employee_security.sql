-- Migration 00007: Admin Authentication & Employee Management System
-- Run in Supabase Dashboard → SQL Editor

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. Upgrade public.users table ────────────────────────────────────────────
-- Add 'employee' to role options (existing admin/manager/staff remain valid)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'manager', 'staff', 'employee'));

-- Add employee_id (unique identifier like EMP001)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE public.users ADD CONSTRAINT users_employee_id_unique UNIQUE (employee_id);

-- Add last_logout timestamp
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_logout TIMESTAMPTZ;

-- Add avatar_url if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ─── 2. Employee Sessions Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id   VARCHAR(50),
  login_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at     TIMESTAMPTZ,
  duration_secs INTEGER,
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'offline', 'expired')),
  session_token TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_sessions_user ON public.employee_sessions (user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_status ON public.employee_sessions (status, login_at DESC);

-- ─── 3. RLS: public.users ─────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own"     ON public.users;
DROP POLICY IF EXISTS "users_update_own"     ON public.users;
DROP POLICY IF EXISTS "users_admin_all"      ON public.users;
DROP POLICY IF EXISTS "users_insert_public"  ON public.users;

-- Everyone can read all users (for employee list display)
CREATE POLICY "users_select_all_authenticated"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can update their own non-sensitive fields
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (
    auth.uid() = (SELECT id FROM public.users u WHERE u.id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    auth.uid() = (SELECT id FROM public.users u WHERE u.id = auth.uid() LIMIT 1)
  );

-- Anyone authenticated can insert (for self-registration via signIn hook)
CREATE POLICY "users_insert_authenticated"
  ON public.users FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─── 4. Helper: is_admin() ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

-- ─── 5. RLS: employee_sessions ────────────────────────────────────────────────
ALTER TABLE public.employee_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_own"    ON public.employee_sessions;
DROP POLICY IF EXISTS "sessions_insert_own"    ON public.employee_sessions;
DROP POLICY IF EXISTS "sessions_update_own"    ON public.employee_sessions;
DROP POLICY IF EXISTS "sessions_admin_select"  ON public.employee_sessions;

-- Users can insert their own sessions
CREATE POLICY "sessions_insert_own"
  ON public.employee_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions (to set logout_at)
CREATE POLICY "sessions_update_own"
  ON public.employee_sessions FOR UPDATE
  USING (user_id = auth.uid());

-- Users can read their own sessions
CREATE POLICY "sessions_select_own"
  ON public.employee_sessions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- ─── 6. RPC: create_employee_user ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_employee_user(
  p_email        TEXT,
  p_full_name    TEXT,
  p_employee_id  TEXT,
  p_role         TEXT DEFAULT 'employee',
  p_password     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id  UUID;
  v_result   JSONB;
BEGIN
  -- Only admins can call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Validate role
  IF p_role NOT IN ('employee', 'manager', 'staff') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Check duplicate employee_id
  IF EXISTS (SELECT 1 FROM public.users WHERE employee_id = p_employee_id) THEN
    RAISE EXCEPTION 'Employee ID already exists: %', p_employee_id;
  END IF;

  -- Check duplicate email
  IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email already exists: %', p_email;
  END IF;

  -- Generate new UUID for this user
  v_user_id := gen_random_uuid();

  -- Insert into auth.users with hashed password
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    p_email,
    CASE WHEN p_password IS NOT NULL THEN crypt(p_password, gen_salt('bf')) ELSE '' END,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(), NOW(), '', '', '', ''
  );

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data,
    provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email', NOW(), NOW(), NOW()
  );

  -- Insert into public.users profile
  INSERT INTO public.users (
    id, email, full_name, employee_id, role, is_active, created_at, updated_at
  ) VALUES (
    v_user_id, p_email, p_full_name, p_employee_id, p_role, true, NOW(), NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'employee_id', p_employee_id,
    'role', p_role
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ─── 7. RPC: update_employee_user ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_employee_user(
  p_user_id    UUID,
  p_full_name  TEXT DEFAULT NULL,
  p_role       TEXT DEFAULT NULL,
  p_is_active  BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  UPDATE public.users SET
    full_name  = COALESCE(p_full_name, full_name),
    role       = COALESCE(p_role, role),
    is_active  = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 8. RPC: expire_old_sessions ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_old_sessions()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.employee_sessions
  SET
    status       = 'expired',
    logout_at    = NOW(),
    duration_secs = EXTRACT(EPOCH FROM (NOW() - login_at))::INTEGER
  WHERE status = 'active'
    AND login_at < NOW() - INTERVAL '12 hours';
END;
$$;

-- ─── 9. Seed: set employee_id for existing admin user ─────────────────────────
UPDATE public.users
SET employee_id = 'ADM001'
WHERE email = 'admin@financeApp.com'
  AND employee_id IS NULL;
