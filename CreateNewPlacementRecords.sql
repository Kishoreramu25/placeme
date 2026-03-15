-- SQL for creating or updating the placement_records table
CREATE TABLE IF NOT EXISTS public.placement_records (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist (in case table was partially created)
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_visit_type TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS date_of_visit TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_name TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_address TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_location TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_contact_person TEXT;
-- ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_designation TEXT; -- Removed as requested
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_contact_number TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_mail_id TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS company_type TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS salary_package TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS reference_faculty TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS register_no TEXT;

-- Enable RLS
ALTER TABLE public.placement_records ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy (Allow all for simplicity)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.placement_records;
CREATE POLICY "Enable all access for authenticated users"
ON public.placement_records
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- FORCE SCHEMA RELOAD (Run this to fix schema cache error)
NOTIFY pgrst, 'reload schema';
