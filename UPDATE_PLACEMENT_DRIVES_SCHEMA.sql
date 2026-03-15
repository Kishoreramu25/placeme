-- Add missing columns to placement_drives table
ALTER TABLE public.placement_drives 
ADD COLUMN IF NOT EXISTS job_description TEXT,
ADD COLUMN IF NOT EXISTS bond_details TEXT,
ADD COLUMN IF NOT EXISTS work_location TEXT,
ADD COLUMN IF NOT EXISTS min_cgpa NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_backlogs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_history_arrears INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS eligible_batches TEXT,
ADD COLUMN IF NOT EXISTS min_10th_mark NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_12th_mark NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP WITH TIME ZONE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
