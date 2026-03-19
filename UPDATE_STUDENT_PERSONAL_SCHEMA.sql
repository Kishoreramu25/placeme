-- Add new personal information fields
ALTER TABLE public.students_master
ADD COLUMN IF NOT EXISTS alternate_email TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS pan_number TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS passport_available TEXT,
ADD COLUMN IF NOT EXISTS passport_number TEXT,
ADD COLUMN IF NOT EXISTS hostel_name TEXT;

NOTIFY pgrst, 'reload schema';
