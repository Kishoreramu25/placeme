-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO FIX THE "TABLE NOT FOUND" ERROR

-- 1. Create the table that is missing
create table if not exists public.student_placements (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Company Infos
    company_name text,
    company_mail text,
    company_address text,
    hr_name text,
    hr_mail text,

    -- Student Infos
    student_name text,
    student_id text,
    student_mail text,
    student_mobile text,
    student_address text,
    department text,
    
    -- Offer Infos
    offer_type text,
    salary numeric,
    package_lpa numeric,
    current_year integer,
    semester integer,
    join_date date,
    ref_no text,
    
    -- Custom Columns Storage
    other_details jsonb default '{}'::jsonb,
    
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Allow it to be used
alter table public.student_placements enable row level security;

create policy "Enable all access for authenticated users"
on public.student_placements
for all
to authenticated
using (true)
with check (true);
