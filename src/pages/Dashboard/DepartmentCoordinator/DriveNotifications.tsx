import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Building2, 
  MessageSquare, 
  Send, 
  Users, 
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Clock,
  CalendarDays
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DriveNotifications() {
  const { profile } = useAuth();
  const [drives, setDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrive, setSelectedDrive] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    const userRole = (profile as any);
    if (userRole?.department_id) {
      fetchDrives();
    }
  }, [profile]);

  const fetchDrives = async () => {
    const userRole = (profile as any);
    setLoading(true);
    try {
      // Fetch drives that have this department eligible
      const { data: driveDepts, error: deErr } = await supabase
        .from('drive_eligible_departments')
        .select('drive_id')
        .eq('department_id', userRole.department_id);
      
      if (deErr) throw deErr;
      const driveIds = driveDepts.map(d => d.drive_id);

      const { data: driveData, error: drErr } = await supabase
        .from('placement_drives')
        .select('*, companies(name)')
        .in('id', driveIds)
        .order('visit_date', { ascending: false });

      if (drErr) throw drErr;
      setDrives(driveData || []);
      if (driveData && driveData.length > 0) {
        setSelectedDrive(driveData[0].id);
        fetchStudents(driveData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (driveId: string) => {
    try {
      const { data, error } = await supabase
        .from('drive_student_status' as any)
        .select('*')
        .eq('drive_id', driveId)
        .eq('department_id', profile.department_id);
      
      if (error) throw error;
      setStudents(data || []);
      
      // Init reasons
      const reasonMap: Record<string, string> = {};
      (data as any[])?.forEach(s => {
        if (s.non_application_reason) reasonMap[s.student_id] = s.non_application_reason;
        if (s.status === 'absent' && s.absence_reason) reasonMap[s.student_id] = s.absence_reason;
      });
      setReasons(reasonMap);
    } catch (err) {
      console.error(err);
    }
  };

  const submitReason = async (student: any) => {
    const reason = reasons[student.student_id];
    if (!reason) {
      toast.error("Please enter a reason first");
      return;
    }

    const isAbsence = student.status === 'absent';
    const fieldToUpdate = isAbsence ? { absence_reason: reason } : { non_application_reason: reason };

    try {
      const { error } = await supabase
        .from('drive_student_status' as any)
        .update(fieldToUpdate)
        .eq('drive_id', selectedDrive)
        .eq('student_id', student.student_id);

      if (error) throw error;

      // Send notification to TPO if it's a non-application reason
      if (!isAbsence) {
        // Find TPO user ID (the one who created the drive)
        const drive = drives.find(d => d.id === selectedDrive);
        if (drive?.created_by) {
           await supabase.from('notifications' as any).insert({
             user_id: drive.created_by,
             role: 'placement_officer',
             type: 'new_drive',
             title: 'Student Did Not Apply',
             message: `${student.first_name} ${student.last_name} from ${(profile as any)?.departments?.name || 'Your Dept'} did not apply for ${drive.companies?.name}. Reason: ${reason}`,
             drive_id: selectedDrive
           });
        }
      }

      toast.success("Reason submitted to TPO successfully");
      fetchStudents(selectedDrive!);
    } catch (err: any) {
      toast.error("Submission failed: " + err.message);
    }
  };

  if (loading) return <div className="p-12 text-center font-black animate-pulse uppercase tracking-[0.3em] text-slate-300">Synchronizing Drive Intel...</div>;

  const currentDrive = drives.find(d => d.id === selectedDrive);
  const isAfterDeadline = currentDrive?.application_deadline ? new Date() > new Date(currentDrive.application_deadline) : false;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 flex items-center gap-3">
          <Building2 className="h-10 w-10 text-primary" />
          Drive Notifications
        </h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
          Departmental Eligibility & Real-time Status Tracking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-slate-900 rounded-none text-white space-y-1">
             <span className="text-[8px] font-black uppercase tracking-widest opacity-60 text-primary">Intelligence Stream</span>
             <h2 className="text-sm font-black uppercase">Active Drives</h2>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {drives.map(drive => (
              <button
                key={drive.id}
                onClick={() => { setSelectedDrive(drive.id); fetchStudents(drive.id); }}
                className={`w-full text-left p-4 transition-all border-l-4 ${selectedDrive === drive.id ? 'bg-white border-primary shadow-premium z-10' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-slate-200'}`}
              >
                <p className="text-[10px] font-black uppercase tracking-tight mb-1">{drive.companies?.name}</p>
                <div className="flex items-center gap-2 text-[9px] font-bold">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(drive.visit_date).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedDrive ? (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                  <Users className="h-32 w-32" />
                </div>
                <div className="relative z-10 space-y-2">
                  <Badge className="bg-primary text-white border-0 text-[10px] font-black uppercase rounded-none">DRIVE INTEL</Badge>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{currentDrive?.companies?.name}</h3>
                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Visit: {new Date(currentDrive?.visit_date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Deadline: {currentDrive?.application_deadline ? new Date(currentDrive.application_deadline).toLocaleDateString() : 'TBD'}</span>
                  </div>
                </div>
                <div className="relative z-10 px-6 py-4 bg-slate-900 text-white rounded-none shadow-xl">
                   <p className="text-[8px] font-black uppercase tracking-widest opacity-60 text-primary mb-1 text-center">Department Total</p>
                   <p className="text-3xl font-black text-center leading-none">{students.length}</p>
                   <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-center">Eligible Students</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 border-l-4 border-slate-900">
                 <p className="text-xs font-black uppercase tracking-tight text-slate-900 leading-relaxed">
                   These students from your department are eligible for <span className="text-primary">{currentDrive?.companies?.name}</span> drive:
                 </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-none overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-900">Student Identity</TableHead>
                      <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-900 text-center">Roster Status</TableHead>
                      <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-900 text-right">Administrative Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s: any) => {
                      const requiresNotice = (s.status === 'not_applied' && isAfterDeadline) || s.status === 'absent';
                      return (
                        <TableRow key={s.id} className="group hover:bg-slate-50 transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-slate-100 rounded-none border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Users className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase text-slate-900">{s.first_name} {s.last_name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.reg_no}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge status={s.status} />
                          </TableCell>
                          <TableCell className="text-right py-4">
                             {requiresNotice ? (
                               <div className="flex items-center justify-end gap-2">
                                  <div className="relative flex-1 max-w-[250px]">
                                     <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                     <Input
                                      placeholder={s.status === 'absent' ? "Absence reason..." : "Non-app reason..."}
                                      value={reasons[s.student_id] || ""}
                                      onChange={(e) => setReasons(prev => ({ ...prev, [s.student_id]: e.target.value }))}
                                      className="h-10 pl-10 bg-slate-50 border-slate-200 focus:bg-white text-[11px] font-bold rounded-none"
                                     />
                                  </div>
                                  <Button 
                                    size="sm" 
                                    onClick={() => submitReason(s)}
                                    className="h-10 px-4 bg-slate-900 hover:bg-primary text-white rounded-none shadow-lg transition-all"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                               </div>
                             ) : (
                               <div className="flex items-center justify-end gap-2 text-slate-300">
                                  <Clock className="h-4 w-4" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Deadline</span>
                               </div>
                             )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="py-40 text-center border-2 border-dashed border-slate-100 rounded-none bg-slate-50/50">
              <Building2 className="h-20 w-20 mx-auto text-slate-200 mb-6" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Select a Drive Vector to Inspect</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    eligible: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Eligible' },
    applied: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Applied' },
    appeared: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Appeared' },
    selected: { bg: 'bg-emerald-600', text: 'text-white', label: 'Selected' },
    absent: { bg: 'bg-rose-50', text: 'text-rose-600', label: 'Absent' },
    not_applied: { bg: 'bg-slate-900', text: 'text-white', label: 'Not Applied' },
  };
  const config = configs[status] || configs.eligible;
  return (
    <Badge className={`${config.bg} ${config.text} border-0 font-black text-[8px] uppercase px-2 py-0.5 rounded-none shadow-sm`}>
      {config.label}
    </Badge>
  );
}
