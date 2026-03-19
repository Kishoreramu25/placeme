-- ==============================================================================
-- UNIFIED MIGRATION SCRIPT: FULL STUDENT PROFILE OVERHAUL
-- ==============================================================================
-- Execute this entirely in your Supabase SQL Editor. 
-- It safely adds all the new Personal, Academic, and Placement fields 
-- constructed during the current upgrade session.
-- ==============================================================================

ALTER TABLE public.students_master
-- 1. Personal & Demographics
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS alternate_email TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS pan_number TEXT,
ADD COLUMN IF NOT EXISTS passport_available TEXT,
ADD COLUMN IF NOT EXISTS passport_number TEXT,

-- 2. College & Accommodation
ADD COLUMN IF NOT EXISTS hostel_name TEXT,

-- 3. Academic Records (Schooling & Diploma)
ADD COLUMN IF NOT EXISTS tenth_percentage TEXT,
ADD COLUMN IF NOT EXISTS tenth_school_name TEXT,
ADD COLUMN IF NOT EXISTS twelfth_percentage TEXT,
ADD COLUMN IF NOT EXISTS diploma_studied TEXT,
ADD COLUMN IF NOT EXISTS diploma_institute_name TEXT,
ADD COLUMN IF NOT EXISTS diploma_stream TEXT,
ADD COLUMN IF NOT EXISTS work_experience TEXT,

-- 4. Academic Records (College CGPA Tracker)
ADD COLUMN IF NOT EXISTS current_year TEXT,
ADD COLUMN IF NOT EXISTS sem_1_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_2_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_3_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_4_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_5_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_6_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_7_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_8_cgpa TEXT,
ADD COLUMN IF NOT EXISTS overall_cgpa TEXT,

-- 5. Placement & Professional Info
ADD COLUMN IF NOT EXISTS interested_in_placement TEXT,
ADD COLUMN IF NOT EXISTS placement_opt_out_reason TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS programming_languages TEXT,

-- 6. Social & Portfolio Links
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS hackerrank_url TEXT,
ADD COLUMN IF NOT EXISTS leetcode_url TEXT,

-- 7. Other Details
ADD COLUMN IF NOT EXISTS is_first_graduate TEXT,
ADD COLUMN IF NOT EXISTS is_single_parent TEXT;

-- Refresh the PostgREST cache so APIs instantly reflect exactly these new columns
NOTIFY pgrst, 'reload schema';
