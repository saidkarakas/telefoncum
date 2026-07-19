BEGIN;

-- 1. Identify Unowned Records (Quarantine Strategy)
-- Do NOT bind to a fake user. Leave for manual assignment.
-- The following view or query can be run to identify them:
-- SELECT * FROM public.tys_data WHERE owner_id IS NULL;
-- SELECT * FROM public.tys_audit_log WHERE owner_id IS NULL;

-- 2. Clean up tys_audit_log sensitive data
UPDATE public.tys_audit_log
SET 
  old_value = old_value - 'devicePassword' - 'password' - 'pin' - 'pattern' - 'screenPassword',
  new_value = new_value - 'devicePassword' - 'password' - 'pin' - 'pattern' - 'screenPassword'
WHERE 
  old_value ?| array['devicePassword', 'password', 'pin', 'pattern', 'screenPassword'] OR
  new_value ?| array['devicePassword', 'password', 'pin', 'pattern', 'screenPassword'];

-- 3. Clean up tys_data sensitive data
-- Safely mask devicePassword inside the JSONB array for tys_repairs
UPDATE public.tys_data
SET value = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem ? 'devicePassword' THEN elem || jsonb_build_object('devicePassword', '[GİZLENDİ]')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(value) AS elem
)
WHERE key = 'tys_repairs';

-- 4. Enforce STRICT Row Level Security (RLS)
-- Drop unsafe public policies
DROP POLICY IF EXISTS "Allow public delete access" ON public.tys_data;
DROP POLICY IF EXISTS "Allow public delete access" ON public.tys_audit_log;
DROP POLICY IF EXISTS "Allow public read access" ON public.tys_audit_log;
DROP POLICY IF EXISTS "Allow public insert access" ON public.tys_audit_log;
DROP POLICY IF EXISTS "Allow public update access" ON public.tys_audit_log;

-- Fix tys_data UPDATE policy to prevent changing owner_id
DROP POLICY IF EXISTS "Users can update their own data" ON public.tys_data;
CREATE POLICY "Users can update their own data" ON public.tys_data
    FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Enforce RLS on audit logs
ALTER TABLE public.tys_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.tys_audit_log;
CREATE POLICY "Users can view their own audit logs" ON public.tys_audit_log
    FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.tys_audit_log;
CREATE POLICY "Users can insert their own audit logs" ON public.tys_audit_log
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Prevent UPDATE/DELETE on audit logs
DROP POLICY IF EXISTS "Users can update their own audit logs" ON public.tys_audit_log;
DROP POLICY IF EXISTS "Users can delete their own audit logs" ON public.tys_audit_log;

COMMIT;
