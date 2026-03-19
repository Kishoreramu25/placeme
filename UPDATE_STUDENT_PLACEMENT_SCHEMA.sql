ALTER TABLE public.students_master
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS programming_languages TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS hackerrank_url TEXT,
ADD COLUMN IF NOT EXISTS leetcode_url TEXT;

NOTIFY pgrst, 'reload schema';
