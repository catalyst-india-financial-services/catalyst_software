-- 1. Ensure pgcrypto is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Insert the user into auth.users and auth.identities if not exists
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  '85798bb6-3bb9-45a0-b322-f78cba7cb8ba',
  'authenticated',
  'authenticated',
  'admin@financeApp.com',
  crypt('password123', gen_salt('bf')),
  now(),
  null,
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@financeApp.com'
);

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  '85798bb6-3bb9-45a0-b322-f78cba7cb8ba',
  '85798bb6-3bb9-45a0-b322-f78cba7cb8ba',
  '85798bb6-3bb9-45a0-b322-f78cba7cb8ba',
  jsonb_build_object('sub', '85798bb6-3bb9-45a0-b322-f78cba7cb8ba', 'email', 'admin@financeApp.com'),
  'email',
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities WHERE user_id = '85798bb6-3bb9-45a0-b322-f78cba7cb8ba'
);

-- 3. Add user_id column to bank_accounts
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update any existing bank accounts to belong to the admin user
UPDATE public.bank_accounts SET user_id = '85798bb6-3bb9-45a0-b322-f78cba7cb8ba' WHERE user_id IS NULL;

-- 4. Enable RLS and setup policies
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read/write on bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can select their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON public.bank_accounts;

-- Create granular RLS policies enforcing auth.uid() = user_id
CREATE POLICY "Users can insert their own bank accounts"
    ON public.bank_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own bank accounts"
    ON public.bank_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
    ON public.bank_accounts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
    ON public.bank_accounts FOR DELETE
    USING (auth.uid() = user_id);
