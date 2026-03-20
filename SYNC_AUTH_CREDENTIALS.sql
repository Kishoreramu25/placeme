-- =====================================================================
-- FIX: SYNC GLOBAL AUTHENTICATION USERS TO MANAGEMENT DASHBOARD
-- =====================================================================
-- This script ensures that EVERY SINGLE user inside Supabase Auth 
-- is correctly mirrored into the TPO User Management portal.
-- Run this in your Supabase SQL Editor.
-- =====================================================================

-- 1. Sync any missing accounts from auth.users to public.profiles
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email), 
    created_at, 
    COALESCE(updated_at, created_at)
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, 
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- 2. Ensure every profile has a corresponding user_role (Default: student if unknown)
INSERT INTO public.user_roles (user_id, role)
SELECT 
    p.id, 
    (COALESCE(au.raw_user_meta_data->>'role', 'student'))::public.app_role
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.id IS NULL
ON CONFLICT DO NOTHING;

-- 3. Pre-populate Student Credentials proxy if missing
INSERT INTO public.student_credentials (user_id, email, full_name, plain_password, account_status)
SELECT 
    p.id, 
    p.email, 
    p.full_name, 
    'N/A (LEGACY)', 
    'active'
FROM public.profiles p
JOIN public.user_roles ur ON p.id = ur.user_id
LEFT JOIN public.student_credentials sc ON p.id = sc.user_id
WHERE ur.role = 'student' AND sc.id IS NULL;

-- 4. Pre-populate Staff Credentials proxy if missing
INSERT INTO public.staff_credentials (user_id, email, full_name, role, plain_password)
SELECT 
    p.id, 
    p.email, 
    p.full_name, 
    ur.role, 
    'N/A (LEGACY)'
FROM public.profiles p
JOIN public.user_roles ur ON p.id = ur.user_id
LEFT JOIN public.staff_credentials stc ON p.id = stc.user_id
WHERE ur.role IN ('placement_officer', 'department_coordinator', 'management') 
  AND stc.id IS NULL;

-- 5. Final Audit: Refresh the materialized view of our dashboard
-- This ensures the UI sees the new data immediately after page refresh.
NOTIFY pgrst, 'reload schema';
