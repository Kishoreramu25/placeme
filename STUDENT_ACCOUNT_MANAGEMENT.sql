-- =================================================
-- STUDENT ACCOUNT STATUS + STAFF CREDENTIALS
-- Run this in Supabase SQL Editor
-- =================================================

-- 1. Add account_status column to students_master
ALTER TABLE public.students_master
ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
-- Values: 'active' | 'suspended' | 'banned'

-- 2. Create staff_credentials table (stores HOD/TPO login info for TPO visibility)
CREATE TABLE IF NOT EXISTS public.staff_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_plain TEXT NOT NULL,   -- stored for admin visibility only
  role TEXT NOT NULL,             -- 'department_coordinator' | 'placement_officer'
  department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS on staff_credentials
ALTER TABLE public.staff_credentials ENABLE ROW LEVEL SECURITY;

-- Only TPO (placement_officer) can read staff credentials
DROP POLICY IF EXISTS "TPO can view staff credentials" ON public.staff_credentials;
CREATE POLICY "TPO can view staff credentials" ON public.staff_credentials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'placement_officer'
    )
  );

-- Authenticated users can insert (needed during account creation)
DROP POLICY IF EXISTS "Authenticated can insert credentials" ON public.staff_credentials;
CREATE POLICY "Authenticated can insert credentials" ON public.staff_credentials
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Student credentials table (for TPO/HOD to view login info)
CREATE TABLE IF NOT EXISTS public.student_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_plain TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  created_by UUID REFERENCES auth.users(id),  -- which HOD/TPO created this
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.student_credentials ENABLE ROW LEVEL SECURITY;

-- HOD can see students from their department
DROP POLICY IF EXISTS "HOD can view own dept student creds" ON public.student_credentials;
CREATE POLICY "HOD can view own dept student creds" ON public.student_credentials
  FOR SELECT TO authenticated
  USING (
    department_id = (
      SELECT department_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- TPO can see all
DROP POLICY IF EXISTS "TPO can view all student creds" ON public.student_credentials;
CREATE POLICY "TPO can view all student creds" ON public.student_credentials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'placement_officer'
    )
  );

-- Authenticated can insert
DROP POLICY IF EXISTS "Authenticated can insert student creds" ON public.student_credentials;
CREATE POLICY "Authenticated can insert student creds" ON public.student_credentials
  FOR INSERT TO authenticated WITH CHECK (true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
