-- !!! CRITICAL: YOU MUST RUN THIS IN SUPABASE SQL EDITOR TO FIX THE ERROR !!!

-- 1. Create the table 'student_placements'
-- This table DOES NOT EXIST yet, which is why you see the error.
CREATE TABLE IF NOT EXISTS public.student_placements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Company Details
    company_name text,
    company_mail text,
    company_address text,
    hr_name text,
    hr_mail text,

    -- Student Details
    student_name text,
    student_id text,
    student_mail text,
    student_mobile text,
    student_address text,
    department text,
    
    -- Offer Details
    offer_type text,
    salary numeric,
    package_lpa numeric,
    current_year integer,
    semester integer,
    join_date date,
    ref_no text,
    
    -- Dynamic Columns (Required for custom columns)
    other_details jsonb default '{}'::jsonb,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Allow Access (Security Policies)
ALTER TABLE public.student_placements ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (TPO, HOD) to access this table
CREATE POLICY "Enable all access for authenticated users"
ON public.student_placements
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
