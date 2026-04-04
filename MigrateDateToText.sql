-- RUN THIS IN SUPABASE SQL EDITOR TO FIX THE DATE SAVING ERROR
-- This changes the column type to TEXT so you can save dates like "24.09.25 & 25.09.25"

ALTER TABLE public.placement_records 
ALTER COLUMN date_of_visit TYPE TEXT USING date_of_visit::TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
