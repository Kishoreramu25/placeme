-- =====================================================================
-- ADD ROUND DETAILS COLUMN TO PLACEMENT DRIVES
-- =====================================================================

ALTER TABLE public.placement_drives 
ADD COLUMN IF NOT EXISTS round_details JSONB DEFAULT '[]'::jsonb;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
