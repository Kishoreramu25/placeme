ALTER TABLE public.students_master
ADD COLUMN IF NOT EXISTS is_first_graduate TEXT,
ADD COLUMN IF NOT EXISTS is_single_parent TEXT;

NOTIFY pgrst, 'reload schema';
