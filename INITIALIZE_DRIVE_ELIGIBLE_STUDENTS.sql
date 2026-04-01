-- =====================================================================
-- INITIALIZE DRIVE ELIGIBLE STUDENTS
-- This function automatically filters students based on placement
-- drive criteria and inserts them into placement_applications.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.initialize_drive_eligible_students(p_drive_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_drive RECORD;
    v_eligible_batches TEXT[];
    v_year_string TEXT;
BEGIN
    -- 1. Get Drive Details and Criteria
    SELECT * INTO v_drive FROM public.placement_drives WHERE id = p_drive_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Drive not found';
    END IF;

    -- Process the eligible_batches string into an array for easier matching
    -- E.g. "2021-2025" or "4th Year"
    IF v_drive.eligible_batches IS NOT NULL AND v_drive.eligible_batches != '' THEN
        v_eligible_batches := string_to_array(replace(v_drive.eligible_batches, ' ', ''), ',');
    ELSE
        v_eligible_batches := ARRAY[]::TEXT[];
    END IF;

    -- 2. Insert Eligible Students into placement_applications
    INSERT INTO public.placement_applications (drive_id, student_id, status)
    SELECT 
        p_drive_id,
        sm.id,
        'pending_hod' -- Initial status for eligible students
    FROM public.students_master sm
    WHERE 
        -- Must be approved by TPO to participate
        sm.approval_status = 'approved_by_tpo'
        
        -- Department must be authorized for this drive
        AND EXISTS (
            SELECT 1 FROM public.drive_eligible_departments ded 
            WHERE ded.drive_id = p_drive_id AND ded.department_id = sm.department_id
        )
        
        -- Criteria Matching
        AND (v_drive.min_cgpa IS NULL OR v_drive.min_cgpa = 0 OR (sm.overall_cgpa ~ '^[0-9.]+$' AND sm.overall_cgpa::numeric >= v_drive.min_cgpa))
        AND (v_drive.max_backlogs IS NULL OR sm.current_backlogs <= v_drive.max_backlogs)
        AND (v_drive.max_history_arrears IS NULL OR sm.history_of_arrear <= v_drive.max_history_arrears)
        AND (v_drive.min_10th_mark IS NULL OR v_drive.min_10th_mark = 0 OR sm.percentage_10th >= v_drive.min_10th_mark)
        AND (v_drive.min_12th_mark IS NULL OR v_drive.min_12th_mark = 0 OR 
             (sm.diploma_studied = 'Yes' AND sm.percentage_diploma >= v_drive.min_12th_mark) OR
             (sm.diploma_studied != 'Yes' AND sm.percentage_12th >= v_drive.min_12th_mark))
             
        -- Batch/Year Matching
        AND (
            array_length(v_eligible_batches, 1) IS NULL 
            OR sm.batch = ANY(v_eligible_batches) 
            OR (sm.current_year = 4 AND '4thYear' = ANY(v_eligible_batches))
            OR (sm.current_year = 3 AND '3rdYear' = ANY(v_eligible_batches))
            OR (sm.current_year = 2 AND '2ndYear' = ANY(v_eligible_batches))
            OR (sm.current_year = 1 AND '1stYear' = ANY(v_eligible_batches))
        )
        
        -- Prevent duplicates
        AND NOT EXISTS (
            SELECT 1 FROM public.placement_applications pa 
            WHERE pa.drive_id = p_drive_id AND pa.student_id = sm.id
        );

END;
$$;
