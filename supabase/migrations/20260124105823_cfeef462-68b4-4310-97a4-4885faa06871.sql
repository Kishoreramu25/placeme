-- Create enum types for roles and other fields
CREATE TYPE public.app_role AS ENUM ('placement_officer', 'department_coordinator', 'management');
CREATE TYPE public.drive_type AS ENUM ('placement', 'internship', 'both');
CREATE TYPE public.visit_mode AS ENUM ('on_campus', 'off_campus', 'virtual');
CREATE TYPE public.audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Departments are viewable by all authenticated users
CREATE POLICY "Departments are viewable by authenticated users"
ON public.departments FOR SELECT TO authenticated USING (true);

-- Create user_roles table (critical for RBAC - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create academic_years table
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_label TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on academic_years
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

-- Academic years viewable by authenticated users
CREATE POLICY "Academic years are viewable by authenticated users"
ON public.academic_years FOR SELECT TO authenticated USING (true);

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  location TEXT,
  industry_domain TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  alternate_phone TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create placement_drives table
CREATE TABLE public.placement_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) NOT NULL,
  drive_type drive_type NOT NULL DEFAULT 'placement',
  role_offered TEXT,
  visit_date DATE NOT NULL,
  visit_time TIME,
  visit_mode visit_mode NOT NULL DEFAULT 'on_campus',
  stipend_amount NUMERIC,
  ctc_amount NUMERIC,
  remarks TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on placement_drives
ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;

-- Create drive_eligible_departments junction table
CREATE TABLE public.drive_eligible_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id UUID REFERENCES public.placement_drives(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (drive_id, department_id)
);

-- Enable RLS on drive_eligible_departments
ALTER TABLE public.drive_eligible_departments ENABLE ROW LEVEL SECURITY;

-- Create selection_statistics table
CREATE TABLE public.selection_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id UUID REFERENCES public.placement_drives(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  students_appeared INTEGER NOT NULL DEFAULT 0,
  students_selected INTEGER NOT NULL DEFAULT 0,
  ppo_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (drive_id, department_id)
);

-- Enable RLS on selection_statistics
ALTER TABLE public.selection_statistics ENABLE ROW LEVEL SECURITY;

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action audit_action NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (to prevent RLS recursion)
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles
  WHERE id = _user_id
$$;

-- Function to check if user is placement officer
CREATE OR REPLACE FUNCTION public.is_placement_officer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'placement_officer')
$$;

-- Function to check if user is department coordinator
CREATE OR REPLACE FUNCTION public.is_department_coordinator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'department_coordinator')
$$;

-- Function to check if user is management
CREATE OR REPLACE FUNCTION public.is_management(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'management')
$$;

-- =====================================================
-- RLS POLICIES FOR USER_ROLES
-- =====================================================

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Only placement officers can insert roles (for new user registration)
CREATE POLICY "Allow insert during signup"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES FOR PROFILES
-- =====================================================

-- Users can view all profiles (needed for displaying names)
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow profile creation during signup
CREATE POLICY "Allow profile creation during signup"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- =====================================================
-- RLS POLICIES FOR COMPANIES
-- =====================================================

-- All authenticated users can view companies
CREATE POLICY "Companies are viewable by authenticated users"
ON public.companies FOR SELECT TO authenticated USING (true);

-- Only placement officers can insert companies
CREATE POLICY "Placement officers can insert companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (public.is_placement_officer(auth.uid()));

-- Only placement officers can update companies
CREATE POLICY "Placement officers can update companies"
ON public.companies FOR UPDATE TO authenticated
USING (public.is_placement_officer(auth.uid()))
WITH CHECK (public.is_placement_officer(auth.uid()));

-- Only placement officers can delete companies
CREATE POLICY "Placement officers can delete companies"
ON public.companies FOR DELETE TO authenticated
USING (public.is_placement_officer(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR PLACEMENT_DRIVES
-- =====================================================

-- Placement officers see all drives
CREATE POLICY "Placement officers can view all drives"
ON public.placement_drives FOR SELECT TO authenticated
USING (public.is_placement_officer(auth.uid()) OR public.is_management(auth.uid()));

-- Department coordinators see drives for their department
CREATE POLICY "Dept coordinators view dept drives"
ON public.placement_drives FOR SELECT TO authenticated
USING (
  public.is_department_coordinator(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.drive_eligible_departments ded
    WHERE ded.drive_id = placement_drives.id
    AND ded.department_id = public.get_user_department(auth.uid())
  )
);

-- Only placement officers can insert drives
CREATE POLICY "Placement officers can insert drives"
ON public.placement_drives FOR INSERT TO authenticated
WITH CHECK (public.is_placement_officer(auth.uid()));

-- Only placement officers can update drives
CREATE POLICY "Placement officers can update drives"
ON public.placement_drives FOR UPDATE TO authenticated
USING (public.is_placement_officer(auth.uid()))
WITH CHECK (public.is_placement_officer(auth.uid()));

-- Only placement officers can delete drives
CREATE POLICY "Placement officers can delete drives"
ON public.placement_drives FOR DELETE TO authenticated
USING (public.is_placement_officer(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR DRIVE_ELIGIBLE_DEPARTMENTS
-- =====================================================

-- All authenticated can view eligible departments
CREATE POLICY "Eligible departments viewable by authenticated"
ON public.drive_eligible_departments FOR SELECT TO authenticated USING (true);

-- Only placement officers can manage eligible departments
CREATE POLICY "Placement officers manage eligible depts"
ON public.drive_eligible_departments FOR INSERT TO authenticated
WITH CHECK (public.is_placement_officer(auth.uid()));

CREATE POLICY "Placement officers can delete eligible depts"
ON public.drive_eligible_departments FOR DELETE TO authenticated
USING (public.is_placement_officer(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR SELECTION_STATISTICS
-- =====================================================

-- Placement officers and management view all stats
CREATE POLICY "Officers and management view all stats"
ON public.selection_statistics FOR SELECT TO authenticated
USING (public.is_placement_officer(auth.uid()) OR public.is_management(auth.uid()));

-- Dept coordinators view their dept stats
CREATE POLICY "Dept coordinators view dept stats"
ON public.selection_statistics FOR SELECT TO authenticated
USING (
  public.is_department_coordinator(auth.uid()) AND
  department_id = public.get_user_department(auth.uid())
);

-- Only placement officers can manage stats
CREATE POLICY "Placement officers can insert stats"
ON public.selection_statistics FOR INSERT TO authenticated
WITH CHECK (public.is_placement_officer(auth.uid()));

CREATE POLICY "Placement officers can update stats"
ON public.selection_statistics FOR UPDATE TO authenticated
USING (public.is_placement_officer(auth.uid()))
WITH CHECK (public.is_placement_officer(auth.uid()));

CREATE POLICY "Placement officers can delete stats"
ON public.selection_statistics FOR DELETE TO authenticated
USING (public.is_placement_officer(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR AUDIT_LOGS
-- =====================================================

-- Placement officers can view all audit logs
CREATE POLICY "Placement officers view all audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_placement_officer(auth.uid()));

-- All authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- TRIGGERS FOR AUTOMATIC PROFILE CREATION AND UPDATES
-- =====================================================

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at on relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_placement_drives_updated_at
  BEFORE UPDATE ON public.placement_drives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_selection_statistics_updated_at
  BEFORE UPDATE ON public.selection_statistics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SEED DATA: DEPARTMENTS
-- =====================================================

INSERT INTO public.departments (name, code) VALUES
  ('Computer Science and Engineering', 'CSE'),
  ('Electronics and Communication Engineering', 'ECE'),
  ('Electrical and Electronics Engineering', 'EEE'),
  ('Mechanical Engineering', 'MECH'),
  ('Civil Engineering', 'CIVIL'),
  ('Information Technology', 'IT'),
  ('Artificial Intelligence and Machine Learning', 'AIML'),
  ('Data Science', 'DS');

-- =====================================================
-- SEED DATA: ACADEMIC YEARS
-- =====================================================

INSERT INTO public.academic_years (year_label, start_date, end_date, is_current) VALUES
  ('2022-2023', '2022-07-01', '2023-06-30', false),
  ('2023-2024', '2023-07-01', '2024-06-30', false),
  ('2024-2025', '2024-07-01', '2025-06-30', true);