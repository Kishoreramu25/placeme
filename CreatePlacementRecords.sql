-- !!! IMPORTANT: Run this ENTIRE script in Supabase SQL Editor to fix the "table not found" error !!!

-- 1. Create the table 'student_placements' to match the frontend component EXACTLY
create table if not exists public.student_placements (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Company Details
    company_name text,
    company_mail text,
    company_address text,
    hr_name text,
    hr_mail text,

    -- Student Details
    student_name text,
    student_id text, -- Register No
    student_mail text,
    student_mobile text,
    student_address text,
    department text,
    
    -- Offer Details
    offer_type text,
    salary numeric,
    package_lpa numeric,
    current_year integer,
    semester integer,
    join_date date,
    ref_no text,
    
    -- Dynamic Fields (Stored as JSONB) - CRITICAL for "Add Column" feature
    other_details jsonb default '{}'::jsonb,
    
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS)
alter table public.student_placements enable row level security;

-- 3. Create Access Policies (Permissions)

-- Allow everyone to read
create policy "Enable read access for all authenticated users"
on public.student_placements for select
to authenticated
using (true);

-- Allow inserting records
create policy "Enable insert for authenticated users"
on public.student_placements for insert
to authenticated
with check (true);

-- Allow updating records
create policy "Enable update for authenticated users"
on public.student_placements for update
to authenticated
using (true);

-- Allow deleting records
create policy "Enable delete for authenticated users"
on public.student_placements for delete
to authenticated
using (true);
