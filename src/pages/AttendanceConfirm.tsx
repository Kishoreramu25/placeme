import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  User, Building2, CheckCircle2, AlertCircle, Loader2, 
  MapPin, Briefcase, Calendar, ShieldCheck, Mail, Phone, GraduationCap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AttendanceConfirm() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("student_id");
  const driveId = searchParams.get("drive_id");

  const [student, setStudent] = useState<any>(null);
  const [drive, setDrive] = useState<any>(null);
  const [existingAttendance, setExistingAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scannedBy, setScannedBy] = useState("");

  useEffect(() => {
    async function fetchData() {
      if (!studentId || !driveId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch student
        const { data: studentData, error: studentError } = await supabase
          .from("students_master")
          .select("*, departments(name)")
          .eq("id", studentId)
          .single();
        
        if (studentError) throw studentError;
        setStudent(studentData);

        // Fetch drive
        const { data: driveData, error: driveError } = await supabase
          .from("placement_drives")
          .select("*, companies(name)")
          .eq("id", driveId)
          .single();

        if (driveError) throw driveError;
        setDrive(driveData);

        // Fetch existing attendance
        const { data: attendanceData } = await supabase
          .from("drive_attendance" as any)
          .select("*")
          .eq("student_id", studentId)
          .eq("drive_id", driveId)
          .single();
        
        setExistingAttendance(attendanceData);
      } catch (err: any) {
        console.error(err);
        toast.error("Error fetching data: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [studentId, driveId]);

  const markPresent = async () => {
    if (!scannedBy.trim()) {
      toast.error("Please enter teacher/invigilator name");
      return;
    }

    setSubmitting(true);
    try {
      if (existingAttendance) {
        const { error } = await supabase
          .from("drive_attendance" as any)
          .update({
            status: "present",
            scanned_at: new Date().toISOString(),
            scanned_by: scannedBy
          })
          .eq("id", existingAttendance.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("drive_attendance" as any)
          .insert({
            student_id: studentId,
            drive_id: driveId,
            status: "present",
            scanned_at: new Date().toISOString(),
            scanned_by: scannedBy
          });
        
        if (error) throw error;
      }

      setExistingAttendance({ status: "present" });
      toast.success(`Attendance marked for ${student?.first_name} ${student?.last_name || ""}`);
    } catch (err: any) {
      toast.error("Error marking attendance: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Verifying Identity...</p>
      </div>
    );
  }

  if (!student || !drive) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md w-full text-center space-y-6">
           <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
             <AlertCircle className="h-8 w-8" />
           </div>
           <div className="space-y-2">
             <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Invalid Pass</h1>
             <p className="text-sm text-slate-500 font-medium">The QR code scanned is either invalid or expired. Please contact the TPO.</p>
           </div>
           <Button variant="outline" className="w-full h-12 border-slate-900 uppercase font-black text-xs tracking-widest" onClick={() => window.location.href = "/"}>
             Go to Home Page
           </Button>
        </div>
      </div>
    );
  }

  const isAlreadyPresent = existingAttendance?.status === "present";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center font-sans">
      <div className="max-w-2xl w-full">
        {/* Header decoration */}
        <div className="flex flex-col items-center mb-8 space-y-2">
           <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
             <ShieldCheck className="h-6 w-6" />
           </div>
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Gatekeeping System</h2>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase text-center">Drive Attendance</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-1">
          {/* Identity Card */}
          <Card className="overflow-hidden border-none shadow-premium bg-white rounded-3xl">
            <div className="h-3 bg-gradient-to-r from-slate-900 via-primary to-slate-900"></div>
            <CardHeader className="flex flex-col items-center pt-8 pb-4">
              <div className="relative group">
                <div className="h-28 w-28 rounded-full border-4 border-slate-50 bg-slate-100 flex items-center justify-center shadow-lg overflow-hidden group-hover:scale-105 transition-transform duration-500">
                  {student.photo_url ? (
                    <img src={student.photo_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-slate-400" />
                  )}
                </div>
                {isAlreadyPresent && (
                   <div className="absolute -bottom-1 -right-1 h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-in zoom-in-50 duration-500">
                     <CheckCircle2 className="h-6 w-6 text-white" />
                   </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">{student.first_name} {student.last_name}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-2 font-bold text-slate-500 mt-1 uppercase text-[10px] tracking-widest">
                   {student.reg_no}
                </CardDescription>
                <Badge variant="outline" className="mt-3 bg-slate-50 border-slate-200 text-slate-700 font-bold uppercase text-[9px] tracking-wider px-3 py-1 rounded-full">
                  {student.departments?.name || student.department}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
               {/* Quick Info */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                     <GraduationCap className="h-5 w-5 text-slate-400 mb-2" />
                     <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Semester</p>
                     <p className="text-sm font-black text-slate-800 uppercase">{student.current_semester || "N/A"}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                     <Mail className="h-5 w-5 text-slate-400 mb-2" />
                     <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Email</p>
                     <p className="text-xs font-black text-slate-800 truncate w-full text-center px-2">{student.email_address?.split('@')[0]}...</p>
                  </div>
               </div>

               <Separator className="bg-slate-100" />

               {/* Drive info */}
               <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Drive Information</h3>
                  <div className="p-5 bg-slate-900 rounded-3xl text-white relative overflow-hidden group shadow-2xl">
                     <div className="absolute top-0 right-0 p-6 opacity-[0.2] transition-transform group-hover:scale-110">
                        <Building2 className="h-16 w-16" />
                     </div>
                     <div className="relative space-y-4">
                        <div className="space-y-1">
                           <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none">Recruitment Drive</p>
                           <h4 className="text-2xl font-black tracking-tight">{drive.companies?.name}</h4>
                        </div>
                        <div className="flex flex-wrap gap-4 pt-1">
                           <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-slate-400" />
                              <span className="text-xs font-bold text-slate-300">{drive.role_offered}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="text-xs font-bold text-slate-300">{new Date(drive.visit_date).toLocaleDateString()}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Verification input */}
               {!isAlreadyPresent && (
                 <div className="space-y-4 mt-8 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <div className="space-y-2 text-center">
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-slate-900" />
                          Teacher Verification
                       </h3>
                       <p className="text-[10px] text-slate-500 font-medium">Please enter your name to confirm attendance.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scannedBy" className="text-[10px] font-black uppercase text-slate-400 ml-1">Invigilator Name</Label>
                      <Input 
                        id="scannedBy"
                        placeholder="e.g. Dr. Ramesh P" 
                        value={scannedBy}
                        onChange={(e) => setScannedBy(e.target.value)}
                        className="h-12 border-2 border-slate-200 focus:border-slate-900 rounded-xl font-bold bg-white"
                      />
                    </div>
                 </div>
               )}

               {isAlreadyPresent && (
                 <div className="mt-8">
                   <Alert className="bg-emerald-50 border-emerald-200 p-8 rounded-[2rem] flex flex-col items-center text-center space-y-4 animate-in zoom-in duration-500">
                      <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <div>
                        <AlertTitle className="text-xl font-black text-emerald-900 uppercase tracking-tight">Verified & Recorded</AlertTitle>
                        <AlertDescription className="text-sm font-bold text-emerald-700 leading-relaxed max-w-[200px]">
                          Attendance marked successfully for this candidate.
                        </AlertDescription>
                      </div>
                   </Alert>
                 </div>
               )}
            </CardContent>
            
            {!isAlreadyPresent && (
              <CardFooter className="px-8 pb-8 pt-0">
                <Button 
                   className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50" 
                   onClick={markPresent}
                   disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    "Mark Student Present"
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
          
          <div className="text-center opacity-50 mt-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">© 2026 ESEC PLACEMENT PORTAL | DIGITAL GATEWAY</p>
          </div>
        </div>
      </div>
    </div>
  );
}
