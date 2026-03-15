-- !!! EXECUTE THIS SCRIPT IN SUPABASE SQL EDITOR !!!
-- This will FIX the "Could not find table" error and ADD your test data.

-- 1. Create the 'student_placements' table
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
    
    -- Dynamic Columns
    other_details jsonb default '{}'::jsonb,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Security (Allow Access)
ALTER TABLE public.student_placements ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Clear old ones first if needed to avoid conflicts, but 'create if not exists' logic is complex in simple SQL scripts, so we just add)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.student_placements;

CREATE POLICY "Enable all access for authenticated users"
ON public.student_placements
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. INSERT TEST DATA (The data you provided)
INSERT INTO public.student_placements (
    company_name, 
    company_mail, 
    company_address, 
    hr_name, 
    hr_mail,
    student_name, 
    student_id, -- Added a dummy ID since it was missing in your text list
    department, 
    offer_type, 
    salary, 
    package_lpa,
    student_mail, 
    student_address, 
    current_year, 
    semester, 
    join_date, 
    ref_no
) VALUES (
    'Zenetive Infotech', 
    'hr@zenetive.com', 
    'Chennai, Tamil Nadu', 
    'Anita R', 
    'anita@zenetive.com',
    'Kishore R', 
    'REG_001', 
    'CSE', 
    'Internship', 
    8000, 
    2,
    'kishore@gmail.com', 
    'Erode, Tamil Nadu', 
    2025, 
    6, 
    CURRENT_DATE, 
    'Rahul M'
);
