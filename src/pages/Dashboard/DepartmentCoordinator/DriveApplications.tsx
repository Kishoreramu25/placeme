import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Info, FileText, Target, AlertCircle, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function DriveApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (user?.id) fetchApplications();
  }, [user?.id]);

  const fetchApplications = async () => {
    setLoading(true);

    try {
      // Step 1: Get HOD's department_id from profiles
      const { data: hodProfile } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user?.id)
        .single();

      if (!hodProfile?.department_id) {
        setLoading(false);
        return;
      }

      // Step 2: Get all students in that department
      const { data: students } = await supabase
        .from("students_master")
        .select("id, first_name, last_name, reg_no, overall_cgpa, tenth_percentage, twelfth_percentage, current_standing_arrear, interested_in_placement")
        .eq("department_id", hodProfile.department_id);

      if (!students || students.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);

      // Step 3: Get pending applications for those students
      const { data: apps, error: appsError } = await supabase
        .from("placement_applications" as any)
        .select(`
          id,
          student_id,
          status,
          resume_url,
          drive_id,
          placement_drives (
            id,
            role_offered,
            companies (name),
            min_cgpa,
            max_backlogs,
            min_10th_mark,
            min_12th_mark
          )
        `)
        .in("student_id", studentIds)
        .eq("status", "pending_hod");

      if (appsError) throw appsError;

      // Step 4: Merge student info
      const merged = (apps || []).map(app => ({
        ...app,
        student: students.find(s => s.id === app.student_id)
      }));

      setApplications(merged);
    } catch (error: any) {
      console.error("Error fetching applications:", error);
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appId: string, status: string) => {
    const { error } = await supabase
      .from("placement_applications" as any)
      .update({ status })
      .eq("id", appId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Application ${status === "approved_by_hod" ? "approved" : "rejected"}!`);
      fetchApplications();
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Drive Applications</h1>
        <p className="text-muted-foreground">Review and approve student applications</p>
      </div>

      <Badge variant="outline" className="text-sm">
        {applications.length} Pending Approval
      </Badge>

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30">
          <p className="font-bold text-xl">No pending applications</p>
          <p className="text-muted-foreground">Students who apply will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left">Student</th>
                <th className="p-3 text-left">Reg No</th>
                <th className="p-3 text-left text-center">CGPA</th>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Role Offered</th>
                <th className="p-3 text-center">Placement Intent</th>
                <th className="p-3 text-right">Decision</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-semibold">
                    {app.student?.first_name} {app.student?.last_name}
                  </td>
                  <td className="p-3 text-muted-foreground">{app.student?.reg_no || "N/A"}</td>
                  <td className="p-3 text-center font-bold text-primary">{app.student?.overall_cgpa || "N/A"}</td>
                  <td className="p-3 font-medium">{app.placement_drives?.companies?.name}</td>
                  <td className="p-3 italic text-muted-foreground text-[11px] leading-tight max-w-[150px]">{app.placement_drives?.role_offered}</td>
                  <td className="p-3 text-center">
                    {String(app.student?.interested_in_placement).toLowerCase() === "yes" || 
                     String(app.student?.interested_in_placement).toLowerCase() === "true" ? (
                      <Badge className="bg-emerald-500 text-white border-0 font-bold text-[10px]">YES</Badge>
                    ) : (
                      <Badge variant="destructive" className="border-0 font-bold text-[10px]">NO</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 font-bold text-xs"
                        onClick={() => updateStatus(app.id, "approved_by_hod")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8 font-bold text-xs"
                        onClick={() => updateStatus(app.id, "rejected_by_hod")}>
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Comparison Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {selectedApp && (
            <>
              <DialogHeader className="p-6 pb-2">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">{selectedApp.placement_drives?.companies?.name}</DialogTitle>
                    <DialogDescription className="text-md font-medium text-foreground">
                      Eligibility Check for {selectedApp.student?.first_name} {selectedApp.student?.last_name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 p-6 pt-0">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Company Requirements */}
                    <div className="space-y-4">
                      <h4 className="font-bold flex items-center gap-2 text-slate-900 border-b pb-2 uppercase text-xs tracking-wider">
                        <Target className="h-4 w-4 text-slate-500" />
                        Company Requirements
                      </h4>
                      <div className="space-y-3">
                         <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Min CGPA Required</p>
                            <p className="font-bold text-slate-900">{selectedApp.placement_drives?.min_cgpa || "No Criteria"}</p>
                         </div>
                         <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Max Backlogs Allowed</p>
                            <p className="font-bold text-slate-900">{selectedApp.placement_drives?.max_backlogs ?? "N/A"}</p>
                         </div>
                         <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Min 10th / 12th Marks</p>
                            <p className="font-bold text-slate-900">{selectedApp.placement_drives?.min_10th_mark}% / {selectedApp.placement_drives?.min_12th_mark}%</p>
                         </div>
                      </div>
                    </div>

                    {/* Student Performance */}
                    <div className="space-y-4">
                      <h4 className="font-bold flex items-center gap-2 text-slate-900 border-b pb-2 uppercase text-xs tracking-wider">
                        <FileText className="h-4 w-4 text-slate-500" />
                        Student Performance
                      </h4>
                      <div className="space-y-3">
                         <div className={`p-3 border rounded-lg ${
                           parseFloat(selectedApp.student?.overall_cgpa) >= parseFloat(selectedApp.placement_drives?.min_cgpa) 
                           ? "bg-emerald-50 border-emerald-200" 
                           : "bg-red-50 border-red-200"
                         }`}>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Current Overall CGPA</p>
                            <p className="font-bold text-slate-900">{selectedApp.student?.overall_cgpa || "N/A"}</p>
                         </div>
                         <div className={`p-3 border rounded-lg ${
                           parseInt(selectedApp.student?.current_standing_arrear || "0") <= parseInt(selectedApp.placement_drives?.max_backlogs || "99") 
                           ? "bg-emerald-50 border-emerald-200" 
                           : "bg-red-50 border-red-200"
                         }`}>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Current Backlogs</p>
                            <p className="font-bold text-slate-900">{selectedApp.student?.current_standing_arrear || "0"}</p>
                         </div>
                         <div className="p-3 border border-slate-200 rounded-lg bg-white shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">10th / 12th Marks (%)</p>
                            <p className="font-bold text-slate-900">{selectedApp.student?.tenth_percentage}% / {selectedApp.student?.twelfth_percentage}%</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-slate-900 text-white p-6 rounded-xl space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Quick Verification Result</h4>
                      {parseFloat(selectedApp.student?.overall_cgpa) >= parseFloat(selectedApp.placement_drives?.min_cgpa) &&
                       parseInt(selectedApp.student?.current_standing_arrear || "0") <= parseInt(selectedApp.placement_drives?.max_backlogs || "99") ? (
                         <Badge className="bg-emerald-500 text-white border-0">SYSTEM ELIGIBLE</Badge>
                       ) : (
                         <Badge variant="destructive" className="border-0">CRITERIA MISMATCH</Badge>
                       )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      Automated eligibility is based on student master profile data. 
                      Please verify physical documents during the selection process if required.
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 bg-slate-50 border-t gap-3">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="font-bold">Close Window</Button>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => {
                    updateStatus(selectedApp.id, "rejected_by_hod");
                    setIsDetailsOpen(false);
                  }}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject Application
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                    updateStatus(selectedApp.id, "approved_by_hod");
                    setIsDetailsOpen(false);
                  }}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve Student
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
