DO $$ BEGIN
  CREATE TYPE public.student_approval_status AS ENUM ('pending_hod', 'approved_by_hod', 'approved_by_tpo', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';

CREATE TABLE IF NOT EXISTS public.students_master (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Workflow
  approval_status TEXT DEFAULT 'pending_hod',
  department_id UUID REFERENCES public.departments(id),

  -- User Fields
  email_address TEXT,
  first_name TEXT,
  last_name TEXT,
  gender TEXT,
  date_of_birth TEXT,
  blood_group TEXT,
  mobile_number TEXT,
  marital_status TEXT,
  aadhar_number TEXT,
  community TEXT,
  geographic_classification TEXT,
  caste TEXT,
  religion TEXT,
  mother_tongue TEXT,
  nationality TEXT,
  state TEXT,
  profile_status TEXT,
  twelfth_register_number TEXT,
  twelfth_school_name TEXT,
  twelfth_school_address TEXT,
  twelfth_school_board TEXT,
  is_parent_farmer TEXT,
  medium_of_instruction TEXT,
  is_physically_challenged TEXT,
  current_cgpa TEXT,
  current_standing_arrear TEXT,
  history_of_arrear TEXT,
  is_ex_serviceman_child TEXT,
  sports_representation TEXT,
  qualifying_exam_details TEXT,
  extra_curricular TEXT,
  studied_tamil_10th TEXT,
  is_andaman_nicobar TEXT,
  ncc_a_certificate TEXT,
  completion_month_year TEXT,
  transport TEXT,
  wants_hostel TEXT,
  father_guardian_name TEXT,
  father_mobile_number TEXT,
  mother_name TEXT,
  mother_mobile_number TEXT,
  occupation_father_guardian TEXT,
  communication_door_street TEXT,
  communication_area_village TEXT,
  communication_pincode TEXT,
  regulations TEXT,
  batches TEXT,
  degree_branches TEXT,
  reg_no TEXT,
  roll_number TEXT,
  student_status TEXT,
  mode_of_education TEXT,
  mode_of_admission TEXT,
  section TEXT,
  quota TEXT,
  medium TEXT,
  current_semester TEXT,
  is_hosteller TEXT,
  is_transport TEXT
);

ALTER TABLE public.students_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users (Student Master)"
ON public.students_master FOR ALL TO authenticated
USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
