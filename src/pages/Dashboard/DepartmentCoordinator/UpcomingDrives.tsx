import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Calendar,
  Building2,
  Target,
  UserCheck,
  UserMinus,
  Activity,
  ChevronRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function UpcomingDrives() {
  const { profile } = useAuth();
  const hodDeptId = (profile as any)?.department_id;

  // 1. Fetch Drives that are active/upcoming
  const { data: drives, isLoading: drivesLoading } = useQuery({
    queryKey: ["hod-upcoming-drives", hodDeptId],
    queryFn: async () => {
      // Get drives where this department is eligible
      const { data: eligibleDriveIds, error: edgeErr } = await supabase
        .from('drive_eligible_departments')
        .select('drive_id')
        .eq('department_id', hodDeptId);
      
      if (edgeErr) throw edgeErr;
      const driveIds = eligibleDriveIds.map(d => d.drive_id);

      if (driveIds.length === 0) return [];

      const { data, error } = await supabase
        .from('placement_drives')
        .select(`
          *,
          companies (name)
        `)
        .in('id', driveIds)
        .order('visit_date', { ascending: true });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!hodDeptId,
  });

  // 2. Fetch Students of this department to calculate eligibility
  const { data: deptStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ["hod-dept-students", hodDeptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students_master')
        .select('*')
        .eq('department_id', hodDeptId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!hodDeptId,
  });

  // 3. Fetch collective applications and attendance for these drives
  const { data: collectiveData, isLoading: collLoading } = useQuery({
    queryKey: ["hod-drives-activity", hodDeptId, drives?.map(d => d.id)],
    queryFn: async () => {
      if (!drives || drives.length === 0) return { apps: [], attendance: [] };
      
      const driveIds = drives.map(d => d.id);
      
      const [appsRes, attRes] = await Promise.all([
        supabase.from('placement_applications' as any).select('*').in('drive_id', driveIds),
        supabase.from('attendance_logs' as any).select('*').in('drive_id', driveIds)
      ]);

      return {
        apps: appsRes.data || [],
        attendance: attRes.data || []
      };
    },
    enabled: !!drives && drives.length > 0,
  });

  const driveStats = useMemo(() => {
    if (!drives || !deptStudents) return [];

    return drives.map(drive => {
      const driveApps = (collectiveData?.apps || []).filter((a: any) => a.drive_id === drive.id);
      const driveAtt = (collectiveData?.attendance || []).filter((a: any) => a.drive_id === drive.id);
      
      const deptEligible = deptStudents.filter(s => {
        const meetCgpa = (s.overall_cgpa || 0) >= (drive.min_cgpa || 0);
        const meetBacklogs = (s.current_backlogs || 0) <= (drive.max_backlogs || 99);
        const meetHistory = (s.history_of_arrear || 0) <= (drive.max_history_arrears || 99);
        const meet10th = (s.mark_10th || 0) >= (drive.min_10th_mark || 0);
        const meet12th = (s.mark_12th || 0) >= (drive.min_12th_mark || 0);
        const meetBatch = drive.eligible_batches ? drive.eligible_batches.includes(s.batches) : true;
        return meetCgpa && meetBacklogs && meetHistory && meet10th && meet12th && meetBatch;
      });

      const eligibleIds = new Set(deptEligible.map(s => s.id));
      const appliedInDept = driveApps.filter((a: any) => eligibleIds.has(a.student_id));
      const appliedIds = new Set(appliedInDept.map((a: any) => a.student_id));
      
      const presentInDept = driveAtt.filter((a: any) => appliedIds.has(a.student_id) && a.attendance_status === 'present');
      const presentIds = new Set(presentInDept.map((a: any) => a.student_id));

      const absentInDept = appliedInDept.filter((a: any) => !presentIds.has(a.student_id));
      const notAppliedInDept = deptEligible.filter(s => !appliedIds.has(s.id));

      return {
        ...drive,
        stats: {
          eligible: deptEligible.length,
          applied: appliedInDept.length,
          present: presentInDept.length,
          absent: absentInDept.length,
          notApplied: notAppliedInDept.length
        }
      };
    });
  }, [drives, deptStudents, collectiveData]);

  if (drivesLoading || studentsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-12 w-1/3 rounded-none" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full rounded-none" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-none bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Department Intelligence Command</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 border-l-4 border-primary pl-4">Upcoming Recruitment</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-4">Departmental Drive Monitoring & Performance Metrics</p>
        </div>
      </div>

      {driveStats.length === 0 ? (
        <Card className="rounded-none border-2 border-dashed border-slate-200 bg-slate-50/50 py-20">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 bg-slate-100 flex items-center justify-center rounded-none text-slate-400">
               <Briefcase className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase tracking-tight">No Active Drives</h3>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Your department has no upcoming recruitment drives listed</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {driveStats.map((drive) => (
            <Card key={drive.id} className="rounded-none border-none shadow-2xl bg-white overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="bg-slate-900 p-8 text-white relative">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Building2 className="h-24 w-24" />
                 </div>
                 <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                       <Badge className="bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-none px-4 py-1">UPCOMING</Badge>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{new Date(drive.visit_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase leading-tight">{drive.companies?.name}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 underline underline-offset-8 decoration-primary/50">
                       <Briefcase className="h-3 w-3" /> {drive.role_offered}
                    </p>
                 </div>
              </div>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min. CGPA</p>
                      <p className="text-2xl font-black text-slate-900">{drive.min_cgpa}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Batch</p>
                      <p className="text-2xl font-black text-slate-900">{drive.eligible_batches?.[0] || 'N/A'}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="p-5 bg-slate-50 border border-slate-100 space-y-1 rounded-none group-hover:bg-white group-hover:shadow-lg transition-all">
                      <div className="flex items-center gap-2 text-primary opacity-60">
                         <GraduationCap className="h-3.5 w-3.5" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Eligible Students</span>
                      </div>
                      <p className="text-3xl font-black text-slate-900">{drive.stats.eligible}</p>
                   </div>
                   <div className="p-5 bg-slate-50 border border-slate-100 space-y-1 rounded-none group-hover:bg-white group-hover:shadow-lg transition-all">
                      <div className="flex items-center gap-2 text-emerald-600 opacity-60">
                         <UserCheck className="h-3.5 w-3.5" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Applied Count</span>
                      </div>
                      <p className="text-3xl font-black text-slate-900">{drive.stats.applied}</p>
                   </div>
                   <div className="p-5 bg-blue-50 border border-blue-100 space-y-1 rounded-none group-hover:bg-white group-hover:shadow-lg transition-all">
                      <div className="flex items-center gap-2 text-blue-600 opacity-60">
                         <Target className="h-3.5 w-3.5" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Attendance (Present)</span>
                      </div>
                      <p className="text-3xl font-black text-blue-900">{drive.stats.present}</p>
                   </div>
                   <div className="p-5 bg-rose-50 border border-rose-100 space-y-1 rounded-none group-hover:bg-white group-hover:shadow-lg transition-all">
                      <div className="flex items-center gap-2 text-rose-600 opacity-60">
                         <UserMinus className="h-3.5 w-3.5" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Absentees</span>
                      </div>
                      <p className="text-3xl font-black text-rose-900">{drive.stats.absent}</p>
                   </div>
                </div>

                <div className="mt-8 pt-8 border-t border-dashed flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 bg-slate-300 rounded-none" /> {drive.stats.notApplied} Not Applied</div>
                   </div>
                   <Button variant="ghost" className="rounded-none font-black text-[10px] uppercase group-hover:text-primary">
                      View Department Roster <ChevronRight className="h-4 w-4 ml-2" />
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
