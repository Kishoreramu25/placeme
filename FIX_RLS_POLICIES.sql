-- Allow users to insert their own role during signup
DROP POLICY IF EXISTS "Allow users to insert their own role" ON public.user_roles;
CREATE POLICY "Allow users to insert their own role"
ON public.user_roles FOR INSERT
TO authenticated, anon
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own role (needed for session check)
DROP POLICY IF EXISTS "Allow users to read their own role" ON public.user_roles;
CREATE POLICY "Allow users to read their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Also allow Student Master table inserts during signup
DROP POLICY IF EXISTS "Allow users to insert their own master profile" ON public.students_master;
CREATE POLICY "Allow users to insert their own master profile"
ON public.students_master FOR INSERT
TO authenticated, anon
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Enable all access for authenticated users (Student Master)" ON public.students_master;
CREATE POLICY "Enable all access for users to their own data"
ON public.students_master FOR ALL
TO authenticated
USING (auth.uid() = id OR (SELECT role FROM user_roles WHERE user_id = auth.uid()) IN ('placement_officer', 'department_coordinator'));

-- Allow users-- 1. Ensure the 'faculty' role exists in the database
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'faculty') THEN
    ALTER TYPE public.app_role ADD VALUE 'faculty';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create the Final, TOUGH trigger function (V4 with faculty support)
CREATE OR REPLACE FUNCTION public.handle_new_user_v4()
RETURNS trigger AS $$
DECLARE
  role_param text;
  dept_id_param uuid;
  full_name_param text;
  first_name_val text;
  last_name_val text;
BEGIN
  -- Extract values safely
  role_param := new.raw_user_meta_data->>'role';
  dept_id_param := (new.raw_user_meta_data->>'department_id')::uuid;
  full_name_param := COALESCE(new.raw_user_meta_data->>'full_name', 'User');
  
  -- Split name safely
  first_name_val := split_part(full_name_param, ' ', 1);
  last_name_val := substring(full_name_param from position(' ' in full_name_param) + 1);
  IF last_name_val = full_name_param THEN last_name_val := ''; END IF;

  -- A. UPSERT Profile (handles if it already exists)
  INSERT INTO public.profiles (id, email, full_name, department_id)
  VALUES (new.id, new.email, full_name_param, dept_id_param)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    department_id = EXCLUDED.department_id;

  -- B. UPSERT Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, COALESCE(role_param, 'student')::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

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

-- 3. Cleanup ALL potential old triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v2 ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v3 ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v4 ON auth.users;

-- 4. Enable the new V4 trigger
CREATE TRIGGER on_auth_user_created_v4
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v4();
