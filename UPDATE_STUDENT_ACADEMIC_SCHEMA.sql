-- Create a new script to add the new academic details columns if they don't already exist.

ALTER TABLE public.students_master
ADD COLUMN IF NOT EXISTS tenth_percentage TEXT,
ADD COLUMN IF NOT EXISTS tenth_school_name TEXT,
ADD COLUMN IF NOT EXISTS twelfth_percentage TEXT,
ADD COLUMN IF NOT EXISTS diploma_studied TEXT,
ADD COLUMN IF NOT EXISTS diploma_institute_name TEXT,
ADD COLUMN IF NOT EXISTS diploma_stream TEXT,
ADD COLUMN IF NOT EXISTS work_experience TEXT,
ADD COLUMN IF NOT EXISTS current_year TEXT,
ADD COLUMN IF NOT EXISTS sem_1_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_2_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_3_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_4_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_5_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_6_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_7_cgpa TEXT,
ADD COLUMN IF NOT EXISTS sem_8_cgpa TEXT,
ADD COLUMN IF NOT EXISTS overall_cgpa TEXT;

-- Notify postgrest to reload the schema
NOTIFY pgrst, 'reload schema';
