-- Clean up sensitive device passwords from existing tys_data records
-- Since the value column is jsonb, we can update the array elements for tys_repairs

-- First, let's update tys_audit_log to remove sensitive data from old_value and new_value
UPDATE public.tys_audit_log
SET 
  old_value = old_value - 'devicePassword' - 'password' - 'pin' - 'pattern' - 'screenPassword',
  new_value = new_value - 'devicePassword' - 'password' - 'pin' - 'pattern' - 'screenPassword'
WHERE 
  old_value ?| array['devicePassword', 'password', 'pin', 'pattern', 'screenPassword'] OR
  new_value ?| array['devicePassword', 'password', 'pin', 'pattern', 'screenPassword'];

-- Now update tys_data for the 'tys_repairs' key
-- We will replace 'devicePassword' with '[GİZLENDİ]' in the array elements.
-- In PostgreSQL, modifying an array of jsonb objects requires a subquery.

UPDATE public.tys_data
SET value = (
  SELECT jsonb_agg(
    elem - 'devicePassword' || jsonb_build_object('devicePassword', '[GİZLENDİ]')
  )
  FROM jsonb_array_elements(value) AS elem
)
WHERE key = 'tys_repairs' AND value @> '[{"devicePassword": ""}]' = false;
-- Note: the above query might be simplified. If a repair has a devicePassword, we mask it.
-- This migration might cause a slight data format shift if it's not array of jsonb.
-- Always take a backup before running data scrubbing migrations.
