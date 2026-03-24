import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Download, 
  CheckCircle2, 
  XCircle, 
  User, 
  Search, 
  AlertCircle, 
  Target, 
  Users, 
  UserMinus, 
  UserCheck, 
  FileCheck, 
  GraduationCap 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DriveAttendanceDialogProps {
  driveId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
}

export function DriveAttendanceDialog({ driveId, isOpen, onOpenChange, companyName }: DriveAttendanceDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [driveData, setDriveData] = useState<any>(null);
  const [eligibleDepts, setEligibleDepts] = useState<string[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && driveId) {
      fetchRosterData();
    }
  }, [isOpen, driveId]);

  const fetchRosterData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Drive Details (Criteria)
      const { data: drive, error: driveErr } = await supabase
        .from('placement_drives')
        .select('*')
        .eq('id', driveId)
        .single();
      if (driveErr) throw driveErr;
      setDriveData(drive);

      // 2. Fetch Eligible Departments
      const { data: depts, error: deptsErr } = await supabase
        .from('drive_eligible_departments')
        .select('department_id')
        .eq('drive_id', driveId);
      if (deptsErr) throw deptsErr;
      const deptIds = depts.map(d => d.department_id);
      setEligibleDepts(deptIds);

      // 3. Fetch All Students (Verified Profiles)
      const { data: allStudents, error: studentsErr } = await supabase
        .from('students_master')
        .select('*, departments(name)')
        .order('reg_no');
      if (studentsErr) throw studentsErr;

      // 4. Fetch Applications for this drive
      const { data: apps, error: appsErr } = await supabase
        .from('placement_applications' as any)
        .select('*')
        .eq('drive_id', driveId);
      if (appsErr) throw appsErr;
      setApplications(apps || []);

      // 5. Fetch Attendance (to mark status)
      const { data: currentAtt, error: attError } = await supabase
        .rpc('get_drive_attendance' as any, { p_drive_id: driveId });
      if (attError) throw attError;

      // 6. Process Logic
      const attendanceMap = new Map((currentAtt as any[] || []).map(a => [a.student_id, a]));
      const appMap = new Map((apps || []).map((a: any) => [a.student_id, a]));
      const allowedDepts = new Set(deptIds);

      const processed = (allStudents as any[]).map(s => {
        // Eligibility Logic
        const meetCgpa = (s.overall_cgpa || 0) >= (drive.min_cgpa || 0);
        const meetBacklogs = (s.standing_backlogs || 0) <= (drive.max_backlogs || 99);
        const meetHistory = (s.history_arrears || 0) <= (drive.max_history_arrears || 99);
        const meet10th = (s.mark_10th || 0) >= (drive.min_10th_mark || 0);
        const meet12th = (s.mark_12th || 0) >= (drive.min_12th_mark || 0);
        const meetDept = allowedDepts.has(s.department_id);
        
        // Batch match
        const studentBatch = s.batch || "";
        const meetBatch = drive.eligible_batches ? drive.eligible_batches.includes(studentBatch) : true;

        const isEligible = meetCgpa && meetBacklogs && meetHistory && meet10th && meet12th && meetDept && meetBatch;
        const app = appMap.get(s.id);
        const att = attendanceMap.get(s.id);

        return {
          id: s.id,
          name: `${s.first_name || ""} ${s.last_name || ""}`,
          regNo: s.reg_no || "N/A",
          dept: s.departments?.name || "N/A",
          cgpa: s.overall_cgpa,
          isEligible,
          applied: !!app,
          appStatus: app?.status || "not_applied",
          attendanceStatus: att?.attendance_status || "absent",
        };
      });

      setStudents(processed);
    } catch (err: any) {
      console.error('Roster error:', err);
      setError(err.message || "Failed to sync roster data");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Reg No", "Department", "Eligibility", "Applied", "Attendance"];
    const rows = students.map(s => [
      s.name,
      s.regNo,
      s.dept,
      s.isEligible ? "YES" : "NO",
      s.applied ? "YES" : "NO",
      s.attendanceStatus.toUpperCase()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Roster_${companyName}_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const eligibleStudents = students.filter(s => s.isEligible);
  const appliedAndEligible = students.filter(s => s.isEligible && s.applied);
  const eligibleButNotApplied = students.filter(s => s.isEligible && !s.applied);

  const presentCount = students.filter(s => s.attendanceStatus === "present").length;
  const totalEligible = eligibleStudents.length;
  const totalApplied = appliedAndEligible.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-premium bg-white rounded-3xl">
        <div className="bg-slate-900 px-8 py-6 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.1] -rotate-12 translate-x-8 -translate-y-4">
            <CheckCircle2 className="h-32 w-32" />
          </div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                 <User className="h-6 w-6 text-emerald-400" />
               </div>
               <div>
                 <DialogTitle className="text-2xl font-black tracking-tight uppercase">Drive Intelligence Roster</DialogTitle>
                 <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                   {companyName} | Eligibility Tracking
                 </DialogDescription>
               </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl space-y-1">
                <div className="flex items-center gap-2 text-primary opacity-80 mb-1">
                  <GraduationCap className="h-3 w-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Total Eligible</span>
                </div>
                <p className="text-2xl font-black leading-none">{totalEligible}</p>
             </div>
             <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <FileCheck className="h-3 w-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Applied</span>
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">{totalApplied}</p>
             </div>
             <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Target className="h-3 w-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Not Applied</span>
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">{totalEligible - totalApplied}</p>
             </div>
             <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <UserCheck className="h-3 w-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Present</span>
                </div>
                <p className="text-2xl font-black text-emerald-900 leading-none">{presentCount}</p>
             </div>
          </div>

          <Tabs defaultValue="eligible" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              <TabsTrigger value="eligible" className="rounded-xl font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-premium transition-all gap-2">
                <Users className="h-4 w-4" />
                All Eligible ({totalEligible})
              </TabsTrigger>
              <TabsTrigger value="applied" className="rounded-xl font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-premium transition-all gap-2">
                <UserCheck className="h-4 w-4" />
                Applied ({totalApplied})
              </TabsTrigger>
              <TabsTrigger value="not_applied" className="rounded-xl font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-premium transition-all gap-2">
                <UserMinus className="h-4 w-4" />
                Not Applied ({totalEligible - totalApplied})
              </TabsTrigger>
            </TabsList>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between font-bold">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <Input
                  placeholder="Filter roster..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight"
                />
              </div>
              <Button onClick={exportToCSV} variant="outline" className="h-10 border-slate-900 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl px-6 hover:bg-slate-900 hover:text-white transition-all">
                <Download className="mr-2 h-4 w-4" /> Export Report
              </Button>
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center flex-col gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Scanning Roster Database...</p>
                </div>
            ) : error ? (
                <div className="text-center py-20 text-rose-600">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest">{error}</p>
                </div>
            ) : (
                <>
                <TabsContent value="eligible">
                   <StudentTable data={eligibleStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.regNo.toLowerCase().includes(searchQuery.toLowerCase()))} showStatus />
                </TabsContent>
                <TabsContent value="applied">
                   <StudentTable data={appliedAndEligible.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.regNo.toLowerCase().includes(searchQuery.toLowerCase()))} showStatus />
                </TabsContent>
                <TabsContent value="not_applied">
                   <StudentTable data={eligibleButNotApplied.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.regNo.toLowerCase().includes(searchQuery.toLowerCase()))} showStatus={false} />
                </TabsContent>
                </>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StudentTable({ data, showStatus }: { data: any[], showStatus: boolean }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
        <Users className="h-12 w-12 text-slate-200 mb-3" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching students found</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Student Details</TableHead>
            <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Department</TableHead>
            <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Academic</TableHead>
            {showStatus && <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s) => (
            <TableRow key={s.id} className="hover:bg-slate-50 transition-colors border-slate-100 group">
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:rotate-6">
                      <User className="h-4 w-4" />
                   </div>
                   <div className="space-y-0.5">
                     <p className="font-black text-slate-900 text-xs uppercase tracking-tight">{s.name}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.regNo}</p>
                   </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold text-[9px] uppercase tracking-tighter">
                  {s.dept}
                </Badge>
              </TableCell>
              <TableCell>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-900">{s.cgpa || "N/A"}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">CGPA</span>
                 </div>
              </TableCell>
              {showStatus && (
                <TableCell>
                  <div className="flex gap-2">
                    {s.applied ? (
                      <Badge className="bg-emerald-500 text-white border-0 text-[8px] font-black px-1.5 py-0.5 rounded-sm shadow-sm">APPLIED</Badge>
                    ) : (
                      <Badge variant="outline" className="border-rose-200 text-rose-500 bg-rose-50 text-[8px] font-black px-1.5 py-0.5 rounded-sm">NOT APPLIED</Badge>
                    )}
                    {s.attendanceStatus === "present" && (
                      <Badge className="bg-blue-600 text-white border-0 text-[8px] font-black px-1.5 py-0.5 rounded-sm shadow-sm">PRESENT</Badge>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
