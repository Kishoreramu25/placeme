-- Create drive_attendance table
CREATE TABLE IF NOT EXISTS public.drive_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES public.placement_drives(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'absent', -- present/absent
    scanned_at TIMESTAMP WITH TIME ZONE,
    scanned_by TEXT, -- name or email of teacher who scanned
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(drive_id, student_id)
);

-- Enable RLS
ALTER TABLE public.drive_attendance ENABLE ROW LEVEL SECURITY;

-- Students can view only their own attendance
DROP POLICY IF EXISTS "Students can view own attendance" ON public.drive_attendance;
CREATE POLICY "Students can view own attendance" ON public.drive_attendance
    FOR SELECT USING (auth.uid() = student_id);

-- TPO can view and update all attendance records
DROP POLICY IF EXISTS "TPO view all attendance" ON public.drive_attendance;
CREATE POLICY "TPO view all attendance" ON public.drive_attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'placement_officer'
        )
    );

DROP POLICY IF EXISTS "TPO update all attendance" ON public.drive_attendance;
CREATE POLICY "TPO update all attendance" ON public.drive_attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'placement_officer'
        )
    );

-- Public (no auth) can INSERT — because teacher scans without logging in
DROP POLICY IF EXISTS "Public can insert attendance" ON public.drive_attendance;
CREATE POLICY "Public can insert attendance" ON public.drive_attendance
    FOR INSERT WITH CHECK (true);

-- Public can SELECT for confirmation page
DROP POLICY IF EXISTS "Public can select attendance" ON public.drive_attendance;
CREATE POLICY "Public can select attendance" ON public.drive_attendance
    FOR SELECT USING (true);

-- Public can UPDATE (to mark as present)
DROP POLICY IF EXISTS "Public can update attendance" ON public.drive_attendance;
CREATE POLICY "Public can update attendance" ON public.drive_attendance
    FOR UPDATE USING (true);

-- Add to students_master RLS for public access to name/photo
DROP POLICY IF EXISTS "Public view student basic info" ON public.students_master;
CREATE POLICY "Public view student basic info" ON public.students_master
    FOR SELECT USING (true);

-- Add to placement_drives RLS for public access to company name
DROP POLICY IF EXISTS "Public view drive basic info" ON public.placement_drives;
CREATE POLICY "Public view drive basic info" ON public.placement_drives
    FOR SELECT USING (true);
