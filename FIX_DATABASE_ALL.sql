-- =====================================================================
-- MASTER FIX SCRIPT FOR PLACEMENT RECORDS
-- Run this ENTIRE script in the Supabase SQL Editor to fix database issues.
-- =====================================================================

-- 1. FIX TABLE SCHEMA: Add missing columns required by frontend
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS reference_faculty TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS register_no TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS other_details JSONB DEFAULT '{}'::jsonb;

-- 2. FORCE SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';

-- 3. UPDATE TRANSACTIONAL LOGIC RPCs

-- Robust Unified Upsert for Placement Records
-- Handles both inserts and updates, even with missing or invalid IDs.
CREATE OR REPLACE FUNCTION public.upsert_placement_records(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  rec_id uuid;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(records)
  LOOP
    -- Safely parse or generate ID
    BEGIN
      rec_id := (r->>'id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      rec_id := gen_random_uuid();
    END;

    IF rec_id IS NULL THEN
      rec_id := gen_random_uuid();
    END IF;

    INSERT INTO public.placement_records (
      id, v_visit_type, date_of_visit, v_company_name, v_company_address,
      v_location, v_company_contact_person, v_company_contact_number,
      v_company_mail_id, company_type, salary_package, remark,
      reference_faculty, department, register_no, other_details
    ) VALUES (
      rec_id,
      r->>'v_visit_type',
      r->>'date_of_visit',
      r->>'v_company_name',
      r->>'v_company_address',
      r->>'v_location',
      r->>'v_company_contact_person',
      r->>'v_company_contact_number',
      r->>'v_company_mail_id',
      r->>'company_type',
      r->>'salary_package',
      r->>'remark',
      r->>'reference_faculty',
      r->>'department',
      r->>'register_no',
      COALESCE(r->'other_details', '{}'::jsonb)
    )
    ON CONFLICT (id) DO UPDATE SET
      v_visit_type = EXCLUDED.v_visit_type,
      date_of_visit = EXCLUDED.date_of_visit,
      v_company_name = EXCLUDED.v_company_name,
      v_company_address = EXCLUDED.v_company_address,
      v_location = EXCLUDED.v_location,
      v_company_contact_person = EXCLUDED.v_company_contact_person,
      v_company_contact_number = EXCLUDED.v_company_contact_number,
      v_company_mail_id = EXCLUDED.v_company_mail_id,
      company_type = EXCLUDED.company_type,
      salary_package = EXCLUDED.salary_package,
      remark = EXCLUDED.remark,
      reference_faculty = EXCLUDED.reference_faculty,
      department = EXCLUDED.department,
      register_no = EXCLUDED.register_no,
      other_details = EXCLUDED.other_details,
      updated_at = NOW();
  END LOOP;
END;
$$;

-- Keep old RPC for compatibility during transition
CREATE OR REPLACE FUNCTION public.bulk_insert_placement_records(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.upsert_placement_records(records);
END;
$$;

-- Transactional Bulk Insert (for Students - legacy support)
CREATE OR REPLACE FUNCTION public.bulk_insert_student_placements_v2(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(records)
  LOOP
    INSERT INTO public.student_placements (
      company_name, company_mail, company_address, hr_name, hr_mail,
      student_name, student_id, student_mail, student_mobile, student_address,
      department, offer_type, salary, package_lpa, current_year, semester,
      join_date, ref_no, other_details
    ) VALUES (
      r->>'company_name',
      r->>'company_mail',
      r->>'company_address',
      r->>'hr_name',
      r->>'hr_mail',
      r->>'student_name',
      r->>'student_id',
      r->>'student_mail',
      r->>'student_mobile',
      r->>'student_address',
      r->>'department',
      r->>'offer_type',
      (r->>'salary')::numeric,
      (r->>'package_lpa')::numeric,
      (r->>'current_year')::integer,
      (r->>'semester')::integer,
      (r->>'join_date')::date,
      r->>'ref_no',
      COALESCE(r->'other_details', '{}'::jsonb)
    );
  END LOOP;
END;
$$;
