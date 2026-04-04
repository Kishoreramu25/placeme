-- SQL to fix placement_records table schema
-- Adds missing columns required by the frontend

-- 1. Add reference_faculty if it doesn't exist
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS reference_faculty TEXT;

-- 2. Add department and register_no as optional columns if they don't exist
-- (The RPC was referencing them, so better to have them as nullable than fail)
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS register_no TEXT;

-- 3. Force schema reload to ensure Supabase API picks up changes
NOTIFY pgrst, 'reload schema';
