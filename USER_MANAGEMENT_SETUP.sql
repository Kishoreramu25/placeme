-- USER MANAGEMENT & SECURITY SETUP
-- Run this script in the Supabase SQL Editor to enable TPO/HOD User Creation

-- 1. Ensure all Roles exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'faculty') THEN
    ALTER TYPE public.app_role ADD VALUE 'faculty';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create the Master Trigger Function (V5)
-- This function automatically creates Profiles and Roles when an Admin signs up a user via metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_v5()
RETURNS trigger AS $$
DECLARE
  role_param text;
  dept_id_param uuid;
  full_name_param text;
  first_name_val text;
  last_name_val text;
BEGIN
  -- Extract values safely from the Auth signup data
  role_param := new.raw_user_meta_data->>'role';
  dept_id_param := (new.raw_user_meta_data->>'department_id')::uuid;
  full_name_param := COALESCE(new.raw_user_meta_data->>'full_name', 'User');
  
  -- Split name safely
  first_name_val := split_part(full_name_param, ' ', 1);
  last_name_val := substring(full_name_param from position(' ' in full_name_param) + 1);
  IF last_name_val = full_name_param THEN last_name_val := ''; END IF;

  -- A. UPSERT Profile
  INSERT INTO public.profiles (id, email, full_name, department_id)
  VALUES (new.id, new.email, full_name_param, dept_id_param)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    department_id = EXCLUDED.department_id;

  -- B. UPSERT Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, COALESCE(role_param, 'student')::public.app_role)
  ON CONFLICT (user_id, role) DO UPDATE SET
    role = EXCLUDED.role;

  -- C. UPSERT Student Master (only for students)
  IF role_param = 'student' THEN
    INSERT INTO public.students_master (id, department_id, email_address, first_name, last_name, approval_status)
    VALUES (new.id, dept_id_param, new.email, first_name_val, last_name_val, 'pending_hod')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Cleanup ALL old triggers and activate V5
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v2 ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v3 ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v4 ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v5 ON auth.users;

CREATE TRIGGER on_auth_user_created_v5
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v5();

-- 4. Set RLS Policies for the User Management UI
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- TPOs and HODs need to view roles for their user lists
DROP POLICY IF EXISTS "Public view for roles" ON public.user_roles;
CREATE POLICY "Public view for roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

-- Ensure profiles are viewable so lists show names
DROP POLICY IF EXISTS "Public view for profiles" ON public.profiles;
CREATE POLICY "Public view for profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Grant permissions to make sure the trigger has power
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.students_master TO service_role;
