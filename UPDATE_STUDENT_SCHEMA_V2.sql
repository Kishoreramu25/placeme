-- Update Student Master schema with placement and specific academic details
ALTER TABLE public.students_master 
ADD COLUMN IF NOT EXISTS tenth_mark TEXT,
ADD COLUMN IF NOT EXISTS tenth_board TEXT,
ADD COLUMN IF NOT EXISTS twelfth_mark TEXT,
ADD COLUMN IF NOT EXISTS current_backlogs TEXT,
ADD COLUMN IF NOT EXISTS history_of_arrears_count TEXT,
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT,
ADD COLUMN IF NOT EXISTS internship_experience TEXT,
ADD COLUMN IF NOT EXISTS projects TEXT,
ADD COLUMN IF NOT EXISTS certifications TEXT,
ADD COLUMN IF NOT EXISTS preferred_job_role TEXT,
ADD COLUMN IF NOT EXISTS preferred_location TEXT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
