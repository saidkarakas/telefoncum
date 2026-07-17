-- Create tys_audit_log table
CREATE TABLE IF NOT EXISTS public.tys_audit_log (
    id uuid default gen_random_uuid() primary key,
    owner_id uuid references auth.users(id) default auth.uid(),
    action text not null,          -- e.g. 'CREATE', 'UPDATE', 'DELETE'
    entity_type text not null,     -- e.g. 'PHONE', 'REPAIR', 'EXPENSE'
    entity_id text,                -- ID of the affected entity
    old_value jsonb,               -- Previous state
    new_value jsonb,               -- New state
    created_at timestamp with time zone default now()
);

-- Enable RLS
ALTER TABLE public.tys_audit_log ENABLE ROW LEVEL SECURITY;

-- Create secure policies
CREATE POLICY "Users can view their own audit logs" ON public.tys_audit_log
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own audit logs" ON public.tys_audit_log
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- We explicitly do not allow UPDATE or DELETE on audit logs to preserve integrity.
