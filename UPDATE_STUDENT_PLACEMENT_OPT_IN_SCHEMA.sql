ALTER TABLE public.students_master
ADD COLUMN IF NOT EXISTS interested_in_placement TEXT,
ADD COLUMN IF NOT EXISTS placement_opt_out_reason TEXT;

NOTIFY pgrst, 'reload schema';
