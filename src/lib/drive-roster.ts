import { formatYearLabel, matchesEligibleYear, parseEligibilityNumber } from "@/lib/eligibility";
import { supabase } from "@/integrations/supabase/client";

export function evaluateDriveStudent(student: any, drive: any, allowedDeptIds: Set<string>) {
  const studentCgpa = parseEligibilityNumber(student.overall_cgpa);
  const studentBacklogs = parseEligibilityNumber(student.current_standing_arrear);
  const studentHistoryArrears = parseEligibilityNumber(student.history_of_arrear);
  const student10th = parseEligibilityNumber(student.percentage_10th);
  const student12th = parseEligibilityNumber(student.percentage_12th);

  const meetCgpa = studentCgpa >= (drive.min_cgpa || 0);
  const meetBacklogs = studentBacklogs <= (drive.max_backlogs || 99);
  const meetHistory = studentHistoryArrears <= (drive.max_history_arrears || 99);
  const meet10th = student10th >= (drive.min_10th_mark || 0);
  const meet12th = student12th >= (drive.min_12th_mark || 0);
  const meetDept = allowedDeptIds.size === 0 || allowedDeptIds.has(student.department_id);
  const meetYear = matchesEligibleYear(drive.eligible_batches, student.current_year);
  const isEligible = meetCgpa && meetBacklogs && meetHistory && meet10th && meet12th && meetDept && meetYear;

  return {
    studentCgpa,
    isEligible,
    yearLabel: formatYearLabel(student.current_year),
    debug: {
      meetCgpa,
      meetBacklogs,
      meetHistory,
      meet10th,
      meet12th,
      meetDept,
      meetBatch: meetYear,
    },
  };
}

export async function fetchDriveRosterData(driveId: string) {
  const { data: drive, error: driveErr } = await supabase
    .from("placement_drives")
    .select("*")
    .eq("id", driveId)
    .single();
  if (driveErr) throw driveErr;

  const { data: depts, error: deptsErr } = await supabase
    .from("drive_eligible_departments")
    .select("department_id")
    .eq("drive_id", driveId);
  if (deptsErr) throw deptsErr;
  const deptIds = (depts || []).map((entry: any) => entry.department_id);
  const allowedDeptIds = new Set(deptIds);

  const { data: joinedStudents, error: studentsErr } = await supabase
    .from("students_master")
    .select("*, departments(name)")
    .in("approval_status", ["approved_by_hod", "approved_by_tpo"])
    .order("reg_no");

  let allStudents = joinedStudents || [];

  if (studentsErr || allStudents.length === 0) {
    const { data: rawStudents, error: rawStudentsErr } = await supabase
      .from("students_master")
      .select("*")
      .in("approval_status", ["approved_by_hod", "approved_by_tpo"])
      .order("reg_no");
    if (rawStudentsErr) throw rawStudentsErr;

    const { data: departmentsData, error: departmentsErr } = await supabase
      .from("departments")
      .select("id, name");
    if (departmentsErr) throw departmentsErr;

    const departmentMap = new Map((departmentsData || []).map((dept: any) => [dept.id, dept.name]));
    allStudents = (rawStudents || []).map((student: any) => ({
      ...student,
      departments: {
        name: departmentMap.get(student.department_id) || "N/A",
      },
    }));
  }

  const { data: apps, error: appsErr } = await supabase
    .from("placement_applications" as any)
    .select("*")
    .eq("drive_id", driveId);
  if (appsErr) throw appsErr;

  const { data: lifecycleRows, error: lifecycleErr } = await supabase
    .from("drive_student_status" as any)
    .select("student_id, status, non_application_reason, absence_reason")
    .eq("drive_id", driveId);
  if (lifecycleErr) throw lifecycleErr;

  const { data: currentAtt, error: attError } = await supabase
    .rpc("get_drive_attendance" as any, { p_drive_id: driveId });
  if (attError) throw attError;

  const attendanceMap = new Map((currentAtt as any[] || []).map((entry) => [entry.student_id, entry]));
  const appMap = new Map((apps || []).map((entry: any) => [entry.student_id, entry]));
  const lifecycleMap = new Map((lifecycleRows || []).map((entry: any) => [entry.student_id, entry]));

  const students = (allStudents as any[]).map((student) => {
    const evaluation = evaluateDriveStudent(student, drive, allowedDeptIds);
    const app = appMap.get(student.id);
    const att = attendanceMap.get(student.id);
    const lifecycle = lifecycleMap.get(student.id);

    return {
      id: student.id,
      name: `${student.first_name || ""} ${student.last_name || ""}`.trim(),
      regNo: student.reg_no || "N/A",
      dept: student.departments?.name || "N/A",
      cgpa: evaluation.studentCgpa || student.overall_cgpa,
      yearLabel: evaluation.yearLabel,
      rawYear: student.current_year || "N/A",
      isEligible: evaluation.isEligible,
      applied: !!app,
      appStatus: app?.status || "not_applied",
      attendanceStatus: att?.attendance_status || "absent",
      scannedAt: att?.scanned_at,
      nonApplicationReason: lifecycle?.non_application_reason || "",
      absenceReason: lifecycle?.absence_reason || "",
      lifecycleStatus: lifecycle?.status || "eligible",
      debug: evaluation.debug,
    };
  });

  return {
    drive,
    deptIds,
    applications: apps || [],
    students,
  };
}
