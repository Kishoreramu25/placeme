import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, Search, Target, UserCheck, Award } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface DriveStudentsDialogProps {
  driveId: string | null;
  isOpen: boolean;
  onClose: () => void;
  driveName: string;
  departmentId?: string; // If provided, limits the view to this department
}

export function DriveStudentsDialog({ driveId, isOpen, onClose, driveName, departmentId }: DriveStudentsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen && driveId) {
      fetchStudents();
    }
  }, [isOpen, driveId, departmentId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // 1. Get Drive
      const { data: driveData } = await supabase
        .from("placement_drives")
        .select("*")
        .eq("id", driveId)
        .single();
        
      // 2. Get Eligible Departments for this drive
      const { data: deptData } = await supabase
        .from("drive_eligible_departments")
        .select("department_id")
        .eq("drive_id", driveId);
        
      let eligibleDepts = deptData?.map(d => d.department_id) || [];
      
      // If a specific departmentId is passed (e.g., from HOD view), restrict to it
      if (departmentId) {
          eligibleDepts = eligibleDepts.includes(departmentId) ? [departmentId] : [];
      }
      
      if (eligibleDepts.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
      }
      
      // 3. Get all students from those departments
      const { data: allStudents } = await (supabase as any)
        .from("students_master")
        .select("id, first_name, last_name, reg_no, overall_cgpa, current_standing_arrear, percentage_10th, percentage_12th, department_id, batch, current_year, departments(name)")
        .in("department_id", eligibleDepts);
        
      // 4. Get placement applications
      const { data: appliedStudents } = await (supabase as any)
        .from("placement_applications")
        .select("student_id, status")
        .eq("drive_id", driveId);
        
      const appliedMap = new Map((appliedStudents as any[] || []).map(a => [a.student_id, a.status]));
      
      // 5. Get Attendance
      const { data: attendanceData } = await (supabase.rpc as any)('get_drive_attendance', { p_drive_id: driveId });
      const presentSet = new Set((attendanceData || []).filter((a: any) => a.attendance_status === 'present').map((a: any) => a.student_id));
      
      // 6. Process logic
      const processed = (allStudents || []).map(student => {
        const appStatus = appliedMap.get(student.id);
        const isEligible = appStatus !== undefined; // If they are in applications, they were deemed eligible initially
        const isAttended = presentSet.has(student.id);
        
        let reasons = [];
        if (!isEligible && driveData) {
            if (driveData.min_cgpa && parseFloat(student.overall_cgpa || "0") < driveData.min_cgpa) reasons.push("CGPA");
            if (driveData.max_backlogs !== null && parseInt(student.current_standing_arrear || "0") > driveData.max_backlogs) reasons.push("Backlogs");
            if (driveData.min_10th_mark && parseFloat(student.percentage_10th || "0") < driveData.min_10th_mark) reasons.push("10th %");
            if (driveData.min_12th_mark && parseFloat(student.percentage_12th || "0") < driveData.min_12th_mark) reasons.push("12th %");
        }
        
        return {
           ...student,
           isEligible,
           appStatus,
           isAttended,
           reasons: reasons.join(", ") || "Other Criteria / Not Approved"
        };
      });
      
      setStudents(processed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(s => 
    `${s.first_name} ${s.last_name} ${s.reg_no}`.toLowerCase().includes(search.toLowerCase())
  );
  
  const eligible = filtered.filter(s => s.isEligible);
  const ineligible = filtered.filter(s => !s.isEligible);
  const attended = filtered.filter(s => s.isAttended);
  const advanced = filtered.filter(s => s.appStatus === 'shortlisted' || s.appStatus === 'interview_scheduled' || s.appStatus === 'selected');
  const placed = filtered.filter(s => s.appStatus === 'selected');

  const StudentRow = ({ s, type }: { s: any, type: 'eligible' | 'ineligible' | 'attended' | 'advanced' | 'placed' }) => (
      <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors">
         <div>
            <p className="font-bold">{s.first_name} {s.last_name}</p>
            <p className="text-xs text-muted-foreground">{s.reg_no} • {s.departments?.name}</p>
         </div>
         <div className="text-right flex flex-col items-end gap-1">
            {type === 'ineligible' ? (
                <Badge variant="destructive" className="text-[10px]">Failed: {s.reasons}</Badge>
            ) : type === 'placed' ? (
                <Badge className="bg-amber-500 hover:bg-amber-600 border-0 text-[10px]"><Award className="w-3 h-3 mr-1" /> PLACED</Badge>
            ) : type === 'advanced' ? (
                <Badge className="bg-indigo-500 hover:bg-indigo-600 border-0 text-[10px] uppercase">{s.appStatus.replace('_', ' ')}</Badge>
            ) : type === 'attended' ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-600 border-0 text-[10px]">Present</Badge>
            ) : (
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50">{s.appStatus?.replace(/_/g, ' ') || 'Applied'}</Badge>
            )}
            <p className="text-[10px] text-muted-foreground font-medium">CGPA: {s.overall_cgpa} | Backlogs: {s.current_standing_arrear}</p>
         </div>
      </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b shrink-0 bg-slate-50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> {driveName} - Student Analysis
          </DialogTitle>
          <DialogDescription>
            {departmentId ? "View your department's students for this drive." : "View all students mapped to this placement drive."}
          </DialogDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or reg no..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9"
            />
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {loading ? (
             <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
             <Tabs defaultValue="eligible" className="flex-1 flex flex-col">
                <div className="w-full overflow-x-auto border-b">
                   <TabsList className="m-4 w-auto h-auto min-w-max p-1 bg-slate-100 rounded-xl">
                      <TabsTrigger value="eligible" className="gap-2 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Eligible & Applied ({eligible.length})</TabsTrigger>
                      <TabsTrigger value="ineligible" className="gap-2 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><XCircle className="h-4 w-4 text-rose-500" /> Not Eligible ({ineligible.length})</TabsTrigger>
                      <TabsTrigger value="attended" className="gap-2 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><UserCheck className="h-4 w-4 text-blue-500" /> Attended ({attended.length})</TabsTrigger>
                      <TabsTrigger value="advanced" className="gap-2 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><Target className="h-4 w-4 text-indigo-500" /> Advanced Rounds ({advanced.length})</TabsTrigger>
                      <TabsTrigger value="placed" className="gap-2 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><Award className="h-4 w-4 text-amber-500" /> Placed ({placed.length})</TabsTrigger>
                   </TabsList>
                </div>
                
                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                   <TabsContent value="eligible" className="m-0 space-y-3">
                      {eligible.map(s => <StudentRow key={s.id} s={s} type="eligible" />)}
                      {eligible.length === 0 && <p className="text-center text-muted-foreground py-8">No eligible students found.</p>}
                   </TabsContent>
                   <TabsContent value="ineligible" className="m-0 space-y-3">
                      {ineligible.map(s => <StudentRow key={s.id} s={s} type="ineligible" />)}
                      {ineligible.length === 0 && <p className="text-center text-muted-foreground py-8">No ineligible students found.</p>}
                   </TabsContent>
                   <TabsContent value="attended" className="m-0 space-y-3">
                      {attended.map(s => <StudentRow key={s.id} s={s} type="attended" />)}
                      {attended.length === 0 && <p className="text-center text-muted-foreground py-8">No attendance records found yet.</p>}
                   </TabsContent>
                   <TabsContent value="advanced" className="m-0 space-y-3">
                      {advanced.map(s => <StudentRow key={s.id} s={s} type="advanced" />)}
                      {advanced.length === 0 && <p className="text-center text-muted-foreground py-8">No students in advanced rounds yet.</p>}
                   </TabsContent>
                   <TabsContent value="placed" className="m-0 space-y-3">
                      {placed.map(s => <StudentRow key={s.id} s={s} type="placed" />)}
                      {placed.length === 0 && <p className="text-center text-muted-foreground py-8">No placements recorded yet.</p>}
                   </TabsContent>
                </div>
             </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
