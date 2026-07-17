-- Add owner_id column to tys_data
ALTER TABLE public.tys_data ADD COLUMN IF NOT EXISTS owner_id uuid references auth.users(id) default auth.uid();

-- Enable RLS on the table
ALTER TABLE public.tys_data ENABLE ROW LEVEL SECURITY;

-- Drop existing public policies if any (from our previous setup)
DROP POLICY IF EXISTS "Allow public read access" ON public.tys_data;
DROP POLICY IF EXISTS "Allow public insert access" ON public.tys_data;
DROP POLICY IF EXISTS "Allow public update access" ON public.tys_data;

-- Create secure policies based on owner_id
CREATE POLICY "Users can view their own data" ON public.tys_data
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own data" ON public.tys_data
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own data" ON public.tys_data
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own data" ON public.tys_data
    FOR DELETE USING (auth.uid() = owner_id);
