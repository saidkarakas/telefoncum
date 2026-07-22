-- Migration: 20260722_unique_owner_key.sql
-- Description: Ensures unique constraint (owner_id, key) exists on tys_data for upsert conflict resolution.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_owner_key'
    ) THEN
        ALTER TABLE public.tys_data ADD CONSTRAINT unique_owner_key UNIQUE (owner_id, key);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tys_data_owner_key ON public.tys_data(owner_id, key);
