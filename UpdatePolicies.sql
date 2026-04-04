-- Run this SQL query in your Supabase SQL Editor to update the RLS policies

-- Drop existing policies if they exist (to avoid conflicts or keeping restrictive ones)
drop policy if exists "Enable read access for all authenticated users" on public.placement_records;
drop policy if exists "Enable insert for authenticated users" on public.placement_records;
drop policy if exists "Enable update for authenticated users" on public.placement_records;
drop policy if exists "Enable delete for authenticated users" on public.placement_records;

-- Create MORE PERMISSIVE Policies for Development
-- This enables public access (anon) which often fixes "violates row-level security policy"
-- when the client isn't perfectly syncing its auth state or using a 'dev' login.

create policy "Enable all access for everyone"
on public.placement_records
for all
using (true)
with check (true);
