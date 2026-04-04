-- Add missing fields to placement_drives
ALTER TABLE public.placement_drives 
ADD COLUMN IF NOT EXISTS job_description TEXT,
ADD COLUMN IF NOT EXISTS bond_details TEXT,
ADD COLUMN IF NOT EXISTS work_location TEXT,
ADD COLUMN IF NOT EXISTS min_cgpa NUMERIC(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_backlogs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_history_arrears INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS eligible_batches TEXT, -- Store as comma-separated values like '2021-2025, 2022-2026'
ADD COLUMN IF NOT EXISTS min_10th_mark NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_12th_mark NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS application_open_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP WITH TIME ZONE;

-- Create placement_applications table
CREATE TABLE IF NOT EXISTS public.placement_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES public.placement_drives(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending_hod', 
    -- Statuses: pending_hod, approved_by_hod, rejected_by_hod, pending_tpo, shortlisted, interview_scheduled, selected, rejected_by_tpo
    additional_message TEXT,
    resume_url TEXT,
    interview_timestamp TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(drive_id, student_id)
);

-- Enable Row Level Security
ALTER TABLE public.placement_applications ENABLE ROW LEVEL SECURITY;

-- Students can view their own applications
CREATE POLICY "Students can view own applications" ON public.placement_applications
    FOR SELECT USING (auth.uid() = student_id);

-- Students can apply (insert)
CREATE POLICY "Students can apply" ON public.placement_applications
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- HOD can view and update applications in their department
CREATE POLICY "HOD management" ON public.placement_applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.students_master sm ON sm.id = public.placement_applications.student_id
            WHERE p.id = auth.uid() 
            AND p.department_id = sm.department_id
            AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'department_coordinator')
        )
    );

-- TPO can manage all applications
CREATE POLICY "TPO management" ON public.placement_applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'placement_officer'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_placement_applications_updated_at
    BEFORE UPDATE ON public.placement_applications
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
