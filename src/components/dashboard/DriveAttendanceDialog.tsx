import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  GraduationCap,
  Send
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchDriveRosterData } from "@/lib/drive-roster";
import * as XLSX from "xlsx";

interface DriveAttendanceDialogProps {
  driveId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
}

export function DriveAttendanceDialog({ driveId, isOpen, onOpenChange, companyName }: DriveAttendanceDialogProps) {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [sendingStudentId, setSendingStudentId] = useState<string | null>(null);

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
      const roster = await fetchDriveRosterData(driveId!);
      setDriveData(roster.drive);
      setEligibleDepts(roster.deptIds);
      setApplications(roster.applications);
      setStudents(roster.students);
    } catch (err: any) {
      console.error('Roster error:', err);
      setError(err.message || "Failed to sync roster data");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const eligibleOnly = students.filter(s => s.isEligible);
    
    if (eligibleOnly.length === 0) {
      toast.error("No eligible students found to export.");
      return;
    }

    const rows = eligibleOnly.map((s) => ({
      "Student Name": s.name || "",
      "Reg No": s.regNo || "",
      Department: s.dept || "",
      CGPA: s.cgpa || "",
      Eligibility: "YES",
      Applied: s.applied ? "YES" : "NO",
      "Attendance Status": s.attendanceStatus === "present" ? "PRESENT" : s.applied ? "ABSENT" : "NOT MARKED",
      Reason: s.nonApplicationReason || s.absenceReason || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Eligible Roster");

    const safeCompanyName = (companyName || "Drive")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "_");
    const fileDate = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Roster_${safeCompanyName}_${fileDate}.xlsx`);
  };

  const eligibleStudents = students.filter(s => s.isEligible);
  const appliedAndEligible = students.filter(s => s.isEligible && s.applied);
  const eligibleButNotApplied = students.filter(s => s.isEligible && !s.applied);
  const absenteeStudents = appliedAndEligible.filter(s => s.attendanceStatus !== "present");

  const presentCount = appliedAndEligible.filter(s => s.attendanceStatus === "present").length;
  const totalEligible = eligibleStudents.length;
  const totalApplied = appliedAndEligible.length;
  const totalAbsent = absenteeStudents.length;

  const submitReasonToTpo = async (
    student: any,
    reasonType: "non_application" | "absence" = "non_application"
  ) => {
    const reason = (reasons[student.id] || "").trim();
    if (!reason) {
      toast.error("Please enter a reason first");
      return;
    }

    if (!driveId || !driveData?.created_by) {
      toast.error("Drive information is incomplete");
      return;
    }

    setSendingStudentId(student.id);
    try {
      const updatePayload =
        reasonType === "absence"
          ? { absence_reason: reason }
          : { non_application_reason: reason };

      await supabase
        .from("drive_student_status" as any)
        .update(updatePayload)
        .eq("drive_id", driveId)
        .eq("student_id", student.id);

      const title =
        reasonType === "absence" ? "Student Marked Absent" : "Student Did Not Apply";
      const message =
        reasonType === "absence"
          ? `${student.name} from ${student.dept} was absent for ${companyName}. Reason: ${reason}`
          : `${student.name} from ${student.dept} did not apply for ${companyName}. Reason: ${reason}`;

      const { error: notificationError } = await supabase.from("notifications" as any).insert({
        user_id: driveData.created_by,
        role: "placement_officer",
        type: "new_drive",
        title,
        message,
        drive_id: driveId,
      });

      if (notificationError) throw notificationError;

      setStudents((prev) =>
        prev.map((row) =>
          row.id === student.id
            ? {
                ...row,
                nonApplicationReason:
                  reasonType === "non_application" ? reason : row.nonApplicationReason,
                absenceReason: reasonType === "absence" ? reason : row.absenceReason,
              }
            : row
        )
      );

      toast.success("Reason sent to TPO and marked as sent");
      setReasons((prev) => ({ ...prev, [student.id]: "" }));
    } catch (err: any) {
      toast.error(err.message || "Failed to send reason");
    } finally {
      setSendingStudentId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-premium bg-white rounded-none">
        <div className="bg-slate-900 px-8 py-6 text-white shrink-0 relative overflow-hidden rounded-none">
          <div className="absolute top-0 right-0 p-8 opacity-[0.1] -rotate-12 translate-x-8 -translate-y-4">
            <CheckCircle2 className="h-32 w-32" />
          </div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 bg-white/10 rounded-none flex items-center justify-center backdrop-blur-md border border-white/20">
                 <User className="h-6 w-6 text-emerald-400" />
               </div>
               <div>
                 <DialogTitle className="text-2xl font-black tracking-tight uppercase">Eligible Student Roster</DialogTitle>
                 <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                   {companyName} | Name, Department, CGPA and Attendance Tracking
                 </DialogDescription>
               </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
             <div className="p-4 bg-slate-900 text-white rounded-none shadow-xl space-y-1">
                <div className="flex items-center gap-2 text-primary opacity-80 mb-1">
                  <GraduationCap className="h-3 w-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Total Eligible</span>
                </div>
                <p className="text-2xl font-black leading-none">{totalEligible}</p>
             </div>
             <div className="p-4 bg-white border border-slate-200 rounded-none shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <FileCheck className="h-3 w-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Applied</span>
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">{totalApplied}</p>
             </div>
             <div className="p-4 bg-white border border-slate-200 rounded-none shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Target className="h-3 w-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pending App</span>
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">{totalEligible - totalApplied}</p>
             </div>
             <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-none shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <UserCheck className="h-3 w-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Marked Present</span>
                </div>
                <p className="text-2xl font-black text-emerald-900 leading-none">{presentCount}</p>
             </div>
             <div className="p-4 bg-rose-50 border border-rose-100 rounded-none shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-rose-600 mb-1">
                  <UserMinus className="h-3 w-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Absentees</span>
                </div>
                <p className="text-2xl font-black text-rose-900 leading-none">{totalAbsent}</p>
             </div>
          </div>

          <Tabs defaultValue="eligible" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-14 bg-slate-100 p-1 rounded-none border border-slate-200 shadow-inner">
              <TabsTrigger value="eligible" className="rounded-none font-black text-[9px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-premium transition-all gap-2">
                <Users className="h-4 w-4" />
                All Eligible ({totalEligible})
              </TabsTrigger>
              <TabsTrigger value="applied" className="rounded-none font-black text-[9px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-premium transition-all gap-2">
                <UserCheck className="h-4 w-4" />
                Applied ({totalApplied})
              </TabsTrigger>
              <TabsTrigger value="absent" className="rounded-none font-black text-[9px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-premium transition-all gap-2">
                <XCircle className="h-4 w-4" />
                Absent ({totalAbsent})
              </TabsTrigger>
              <TabsTrigger value="not_applied" className="rounded-none font-black text-[9px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-400 data-[state=active]:shadow-premium transition-all gap-2">
                <UserMinus className="h-4 w-4" />
                Not Applied ({totalEligible - totalApplied})
              </TabsTrigger>
            </TabsList>

            <div className="bg-white p-4 rounded-none border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between font-bold">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <Input
                  placeholder="Filter roster..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 border-slate-200 rounded-none text-xs font-bold uppercase tracking-tight"
                />
              </div>
              <Button onClick={fetchRosterData} variant="outline" className="h-10 border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-none px-6 hover:bg-slate-50 transition-all mr-auto">
                Refresh Sync
              </Button>
              <Button onClick={exportToCSV} variant="outline" className="h-10 border-slate-900 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-none px-6 hover:bg-slate-900 hover:text-white transition-all">
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
                   <StudentTable data={eligibleStudents.filter(s => (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || String(s.regNo || "").toLowerCase().includes(searchQuery.toLowerCase()))} showStatus />
                </TabsContent>
                <TabsContent value="applied">
                   <StudentTable data={appliedAndEligible.filter(s => (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || String(s.regNo || "").toLowerCase().includes(searchQuery.toLowerCase()))} showStatus />
                </TabsContent>
                <TabsContent value="absent">
                   <StudentTable
                     data={absenteeStudents.filter(s => (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || String(s.regNo || "").toLowerCase().includes(searchQuery.toLowerCase()))}
                     showStatus
                     enableReasonEntry={role === "department_coordinator"}
                     reasons={reasons}
                     onReasonChange={(studentId, value) =>
                       setReasons((prev) => ({ ...prev, [studentId]: value }))
                     }
                     onSubmitReason={(student) => submitReasonToTpo(student, "absence")}
                     sendingStudentId={sendingStudentId}
                     showReasonColumn={true}
                     reasonMode="absence"
                   />
                </TabsContent>
                <TabsContent value="not_applied">
                   <StudentTable
                     data={eligibleButNotApplied.filter(s => (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || String(s.regNo || "").toLowerCase().includes(searchQuery.toLowerCase()))}
                     showStatus={false}
                     enableReasonEntry={role === "department_coordinator"}
                     reasons={reasons}
                     onReasonChange={(studentId, value) =>
                       setReasons((prev) => ({ ...prev, [studentId]: value }))
                     }
                     onSubmitReason={(student) => submitReasonToTpo(student, "non_application")}
                     sendingStudentId={sendingStudentId}
                     showReasonColumn={true}
                     reasonMode="non_application"
                   />
                </TabsContent>
                </>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StudentTable({
  data,
  showStatus,
  enableReasonEntry = false,
  reasons = {},
  onReasonChange,
  onSubmitReason,
  sendingStudentId,
  showReasonColumn = false,
  reasonMode = "non_application",
}: {
  data: any[],
  showStatus: boolean,
  enableReasonEntry?: boolean,
  reasons?: Record<string, string>,
  onReasonChange?: (studentId: string, value: string) => void,
  onSubmitReason?: (student: any) => void,
  sendingStudentId?: string | null,
  showReasonColumn?: boolean,
  reasonMode?: "non_application" | "absence",
}) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
        <Users className="h-12 w-12 text-slate-200 mb-3" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          No students are eligible for this drive
        </p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 text-center">
          No matching eligibility to students
        </p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-none overflow-hidden shadow-sm bg-white">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Student Details</TableHead>
            <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Department</TableHead>
            <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Academic</TableHead>
            {showStatus && <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Status</TableHead>}
            {showReasonColumn && (
              <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Reason</TableHead>
            )}
            {enableReasonEntry && (
              <TableHead className="font-black text-[9px] uppercase tracking-widest py-4 text-right">Reason To TPO</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s) => (
            <TableRow key={s.id} className="hover:bg-slate-50 transition-colors border-slate-100 group">
              {(() => {
                const currentReason =
                  reasonMode === "absence"
                    ? (s.absenceReason || "").trim()
                    : (s.nonApplicationReason || "").trim();
                const hasReasonSent = currentReason.length > 0;
                const inputValue = reasons[s.id] || "";
                const canSendNewReason = inputValue.trim().length > 0;
                return (
                  <>
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
                      <Badge className="bg-emerald-500 text-white border-0 text-[8px] font-black px-1.5 py-0.5 rounded-none shadow-sm">APPLIED</Badge>
                    ) : (
                      <Badge variant="outline" className="border-rose-200 text-rose-500 bg-rose-50 text-[8px] font-black px-1.5 py-0.5 rounded-none">NOT APPLIED</Badge>
                    )}
                    {s.attendanceStatus === "present" ? (
                      <Badge className="bg-blue-600 text-white border-0 text-[8px] font-black px-1.5 py-0.5 rounded-none shadow-sm">PRESENT</Badge>
                    ) : s.applied ? (
                      <Badge className="bg-rose-600 text-white border-0 text-[8px] font-black px-1.5 py-0.5 rounded-none shadow-sm">ABSENT</Badge>
                    ) : null}
                  </div>
                </TableCell>
              )}
              {showReasonColumn && (
                <TableCell className="py-4">
                  <div className="space-y-2 max-w-[280px]">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 leading-relaxed">
                      {currentReason || "No reason submitted"}
                    </div>
                    {hasReasonSent && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[8px] font-black uppercase tracking-widest rounded-none">
                        Marked as Sent
                      </Badge>
                    )}
                  </div>
                </TableCell>
              )}
              {enableReasonEntry && (
                <TableCell className="py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Input
                      placeholder={
                        reasonMode === "absence"
                          ? "Reason for not attending"
                          : "Reason for not applying"
                      }
                      value={inputValue}
                      onChange={(e) => onReasonChange?.(s.id, e.target.value)}
                      className="h-10 max-w-[240px] border-slate-200 rounded-none text-[11px] font-bold"
                    />
                    <Button
                      size="sm"
                      onClick={() => onSubmitReason?.(s)}
                      disabled={sendingStudentId === s.id || (!canSendNewReason && hasReasonSent)}
                      className="h-10 rounded-none bg-slate-900 hover:bg-primary text-white"
                    >
                      {sendingStudentId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : !canSendNewReason && hasReasonSent ? (
                        <span className="text-[9px] font-black uppercase tracking-widest">Sent</span>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              )}
                  </>
                );
              })()}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
