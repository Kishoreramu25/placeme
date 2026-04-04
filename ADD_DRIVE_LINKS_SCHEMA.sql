-- Add company-related link columns to placement_drives table
ALTER TABLE public.placement_drives 
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS company_linkedin TEXT,
ADD COLUMN IF NOT EXISTS other_links TEXT;

-- Update the audit logs to track these if needed (optional as triggers handle it)
COMMENT ON COLUMN public.placement_drives.company_website IS 'Official website link of the company for this drive';
COMMENT ON COLUMN public.placement_drives.company_linkedin IS 'LinkedIn profile/page of the company/hiring team';
COMMENT ON COLUMN public.placement_drives.other_links IS 'Other relevant links like registration forms, brochures, etc.';
