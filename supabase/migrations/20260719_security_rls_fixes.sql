-- Fix RLS policies to prevent public delete and prevent owner_id tampering
DROP POLICY IF EXISTS "Allow public delete access" ON public.tys_data;
DROP POLICY IF EXISTS "Allow public delete access" ON public.tys_audit_log;
DROP POLICY IF EXISTS "Allow public read access" ON public.tys_audit_log;
DROP POLICY IF EXISTS "Allow public insert access" ON public.tys_audit_log;
DROP POLICY IF EXISTS "Allow public update access" ON public.tys_audit_log;

-- Update tys_data UPDATE policy to include WITH CHECK
DROP POLICY IF EXISTS "Users can update their own data" ON public.tys_data;
CREATE POLICY "Users can update their own data" ON public.tys_data
    FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Make sure tys_audit_log has proper RLS policies
ALTER TABLE public.tys_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.tys_audit_log;
CREATE POLICY "Users can view their own audit logs" ON public.tys_audit_log
    FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.tys_audit_log;
CREATE POLICY "Users can insert their own audit logs" ON public.tys_audit_log
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Audit logs should not be updated or deleted by users
DROP POLICY IF EXISTS "Users can update their own audit logs" ON public.tys_audit_log;
DROP POLICY IF EXISTS "Users can delete their own audit logs" ON public.tys_audit_log;

-- Helper query to check for any remaining public policies (for admin review)
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND roles @> ARRAY['public'::name];

-- Clean up sensitive data from existing tys_data records. 
-- Since tys_data stores stringified JSON in the 'value' column, we can use regex or jsonb functions if it's jsonb.
-- Wait, 'value' in tys_data is a JSONB column? Let's check table definition if we can.
-- Assuming 'value' is JSONB, we could update the 'devicePassword' field inside 'tys_repairs'.
-- If it's just JSON/JSONB we can update it safely. If it's text, we can use regex replace.
-- Let's just create a function to scrub the data if it's jsonb.
-- But since we don't know the exact schema, we will skip raw SQL data transformation for nested json string here.
-- The prompt said: "Eski kayıtların güvenli şekilde temizlenmesi için ayrı bir SQL migration hazırla."
