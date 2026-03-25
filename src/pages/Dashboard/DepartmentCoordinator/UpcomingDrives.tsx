import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarRange, GraduationCap, Users, FileCheck, Target, UserCheck, XCircle, Search, RefreshCcw, Building2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function UpcomingDrives() {
  const { departmentId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [drives, setDrives] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    if (!departmentId) return;
    setLoading(true);
    try {
      // 1. Fetch drives that include this department
      const { data: eligibleDrives, error: driveErr } = await supabase
        .from('drive_eligible_departments')
        .select('drive_id')
        .eq('department_id', departmentId);

      if (driveErr) throw driveErr;
      const driveIds = eligibleDrives.map(d => d.drive_id);

      if (driveIds.length === 0) {
        setDrives([]);
        return;
      }

      // 2. Fetch Drive details
      const { data: drivesData, error: drivesErr } = await supabase
        .from('placement_drives')
        .select('*')
        .in('id', driveIds)
        .order('drive_date', { ascending: true });

      if (drivesErr) throw drivesErr;

      // 3. Fetch students of THIS department
      const { data: deptStudents, error: studentsErr } = await supabase
        .from('students_master')
        .select('*')
        .eq('department_id', departmentId);
      if (studentsErr) throw studentsErr;

      // 4. Fetch all applications for these drives
      const { data: apps, error: appsErr } = await supabase
        .from('placement_applications' as any)
        .select('*')
        .in('drive_id', driveIds);
      if (appsErr) throw appsErr;

      // 5. Process drive by drive for counts
      const processedDrives = drivesData.map(drive => {
        const eligibleStudents = deptStudents.filter(s => {
          const meetCgpa = (s.overall_cgpa || 0) >= (drive.min_cgpa || 0);
          const meetBacklogs = (s.standing_backlogs || 0) <= (drive.max_backlogs || 99);
          const meetHistory = (s.history_arrears || 0) <= (drive.max_history_arrears || 99);
          
          const studentBatch = s.batch || "";
          const driveBatches = drive.eligible_batches || [];
          const meetBatch = driveBatches.length > 0 ? driveBatches.includes(studentBatch) : true;
          
          return meetCgpa && meetBacklogs && meetHistory && meetBatch;
        });

        const driveApps = apps?.filter(a => a.drive_id === drive.id) || [];
        const appMap = new Map(driveApps.map(a => [a.student_id, a]));
        
        const appliedCount = eligibleStudents.filter(s => appMap.has(s.id)).length;
        
        return {
          ...drive,
          eligibleCount: eligibleStudents.length,
          appliedCount: appliedCount,
          notAppliedCount: eligibleStudents.length - appliedCount,
        };
      });

      setDrives(processedDrives);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to fetch drive intelligence");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (departmentId) fetchData();
  }, [departmentId]);

  const filteredDrives = drives.filter(d => 
    d.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.job_role && d.job_role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-8 border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-6 w-1 bg-primary rounded-none" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Intelligence Protocol</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Upcoming Drives</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Candidacy lifecycle & departmental metrics</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="FILTER INTELLIGENCE FEED..." 
              className="pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white focus:ring-slate-900 rounded-none font-black text-[10px] uppercase tracking-widest transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => { toast.success("Refreshed Drive Intel"); fetchData(); }} variant="outline" className="h-14 w-14 p-0 border-slate-200 rounded-none bg-white hover:bg-slate-900 hover:text-white transition-all">
            <RefreshCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-none" />
          ))
        ) : filteredDrives.length === 0 ? (
          <div className="py-40 text-center border-2 border-dashed border-slate-100 rounded-none bg-slate-50/50">
            <CalendarRange className="h-20 w-20 mx-auto text-slate-200 mb-6" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">No Intelligence Streams Registered</p>
          </div>
        ) : (
          filteredDrives.map(drive => (
            <DriveIntelCard key={drive.id} drive={drive} departmentId={departmentId!} />
          ))
        )}
      </div>
    </div>
  );
}

function DriveIntelCard({ drive, departmentId }: { drive: any, departmentId: string }) {
  const [stats, setStats] = useState({ present: 0, absent: 0 });
  const [loadingAtt, setLoadingAtt] = useState(true);

  useEffect(() => {
    const fetchAttendanceDetails = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_drive_attendance' as any, { p_drive_id: drive.id });
        if (error) throw error;
        
        // Fetch applied student IDs for this drive AND department
        const { data: apps } = await supabase
            .from('placement_applications' as any)
            .select(`
                student_id,
                students_master!inner(department_id)
            `)
            .eq('drive_id', drive.id)
            .eq('students_master.department_id', departmentId);
            
        const deptAppliedIds = new Set(apps?.map((a: any) => a.student_id) || []);
        
        const present = (data as any[] || []).filter(a => deptAppliedIds.has(a.student_id) && a.attendance_status === 'present').length;
        const totalDeptApplied = deptAppliedIds.size;
        
        setStats({
          present,
          absent: totalDeptApplied - present
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAtt(false);
      }
    };
    fetchAttendanceDetails();
  }, [drive.id, departmentId]);

  return (
    <Card className="rounded-none border-x-0 border-t-0 border-b-2 border-slate-200 overflow-hidden shadow-none hover:border-primary/20 transition-all bg-white group">
      <div className="p-10">
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Header Info */}
          <div className="lg:w-[400px] space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center bg-slate-900 text-white rounded-none">
                   <Building2 className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Recruitment protocol ID</span>
                  <span className="text-[10px] font-mono font-bold text-slate-900">{drive.id.split('-')[0].toUpperCase()}</span>
                </div>
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors leading-none uppercase">{drive.company_name}</h3>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{drive.job_role || "GENERAL PROFILE"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-100 p-4 rounded-none border border-slate-200">
                <p className="text-[8px] font-black uppercase text-slate-500 mb-1">DRIVE DATE</p>
                <p className="text-sm font-black text-slate-900">{new Date(drive.drive_date).toLocaleDateString()}</p>
              </div>
              <div className="bg-primary/5 p-4 rounded-none border border-primary/10">
                <p className="text-[8px] font-black uppercase text-primary mb-1">threshold</p>
                <p className="text-sm font-black text-primary">{drive.min_cgpa} CGPA</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
               <Badge className="rounded-none bg-slate-900 text-white border-0 font-black text-[9px] uppercase px-4 py-2">{drive.drive_type || "ON-CAMPUS"}</Badge>
               <Badge className="rounded-none bg-slate-100 text-slate-600 border border-slate-200 font-black text-[9px] uppercase px-4 py-2">BATCH: {drive.eligible_batches?.join(', ') || 'ALL'}</Badge>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="flex-1 flex flex-col justify-center">
             <div className="grid grid-cols-2 md:grid-cols-5 gap-0 divide-x divide-y md:divide-y-0 border border-slate-200 bg-slate-50 shadow-2xl">
                <MetricBox label="Eligible" value={drive.eligibleCount} icon={<GraduationCap className="h-4 w-4" />} color="text-slate-900" />
                <MetricBox label="Applied" value={drive.appliedCount} icon={<UserCheck className="h-4 w-4" />} color="text-blue-600" />
                <MetricBox label="Pending" value={drive.notAppliedCount} icon={<Target className="h-4 w-4" />} color="text-amber-500" />
                <MetricBox label="Present" value={loadingAtt ? "..." : stats.present} icon={<UserCheck className="h-4 w-4" />} color="text-emerald-600" />
                <MetricBox label="Absent" value={loadingAtt ? "..." : stats.absent} icon={<XCircle className="h-4 w-4" />} color="text-rose-600" />
             </div>
             
             <div className="mt-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-none bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Protocol: Active Intelligence Sync</span>
                </div>
                <div className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Last updated: {new Date().toLocaleTimeString()}</div>
             </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetricBox({ label, value, icon, color }: { label: string, value: any, icon: any, color: string }) {
  return (
    <div className={`p-8 bg-white transition-all flex flex-col items-center justify-center gap-4 text-center group/box`}>
      <div className={`p-3 bg-slate-50 text-slate-400 group-hover/box:${color} group-hover/box:bg-white transition-all`}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
      </div>
    </div>
  );
}
