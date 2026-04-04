import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function TPOApplicationApprovals() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // Fetch all HOD-approved applications across ALL departments
      const { data: apps, error } = await supabase
        .from("placement_applications")
        .select(`
          id,
          student_id,
          status,
          resume_url,
          drive_id,
          placement_drives (
            role_offered,
            companies (name)
          )
        `)
        .eq("status", "approved_by_hod");

      if (error) throw error;

      // Fetch student details separately
      const studentIds = (apps || []).map(a => a.student_id);
      if (studentIds.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const { data: students, error: studErr } = await supabase
        .from("students_master")
        .select("id, first_name, last_name, reg_no, current_cgpa, department_id, departments:department_id(name)")
        .in("id", studentIds);

      if (studErr) throw studErr;

      const studentMap = new Map((students || []).map(s => [s.id, s]));

      const merged = (apps || []).map(app => ({
        ...app,
        student: studentMap.get(app.student_id)
      }));

      setApplications(merged);
    } catch (err: any) {
      console.error("Error fetching TPO applications:", err);
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appId: string, status: string) => {
    setProcessing(appId);
    try {
      const targetApp = applications.find((application) => application.id === appId);
      const { error } = await supabase
        .from("placement_applications")
        .update({ status })
        .eq("id", appId);

      if (error) throw error;

      if (targetApp?.student_id) {
        const companyName = targetApp.placement_drives?.companies?.name || "the drive";
        const roleName = targetApp.placement_drives?.role_offered || "the offered role";

        await supabase.from("notifications" as any).insert({
          user_id: targetApp.student_id,
          role: "student",
          type: status === "approved_by_tpo" ? "application_approved" : "application_rejected",
          title: status === "approved_by_tpo" ? "Application Approved By TPO" : "Application Rejected By TPO",
          message:
            status === "approved_by_tpo"
              ? `Your application for ${companyName} - ${roleName} has been approved by TPO. Track the next steps from your drives page.`
              : `Your application for ${companyName} - ${roleName} was rejected by TPO. Check your drives page for the latest status.`,
          drive_id: targetApp.drive_id,
        });
      }

      toast.success(`Application ${status === "approved_by_tpo" ? "approved!" : "rejected."}`);
      fetchApplications();
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = applications.filter(app => {
    const name = `${app.student?.first_name ?? ""} ${app.student?.last_name ?? ""}`.toLowerCase();
    const company = app.placement_drives?.companies?.name?.toLowerCase() ?? "";
    const reg = app.student?.reg_no?.toLowerCase() ?? "";
    const q = searchTerm.toLowerCase();
    return name.includes(q) || company.includes(q) || reg.includes(q);
  });

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending TPO Approval</h1>
          <p className="text-muted-foreground">
            Applications approved by HOD and awaiting your final approval.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-orange-500 text-white text-sm px-3 py-1">
            {applications.length} Awaiting Review
          </Badge>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, reg no, company..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-xl bg-muted/30">
          <CheckCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="font-bold text-xl">No pending approvals</p>
          <p className="text-muted-foreground text-sm mt-1">
            {searchTerm ? "No results match your search." : "HOD-approved applications will appear here."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Student</th>
                <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Department</th>
                <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Company & Role</th>
                <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider">CGPA</th>
                <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider">Resume</th>
                <th className="p-3 text-right text-[10px] font-black uppercase tracking-wider">Decision</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <tr key={app.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <div className="font-semibold">
                      {app.student?.first_name} {app.student?.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {app.student?.reg_no || "N/A"}
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {app.student?.departments?.name || "N/A"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium">{app.placement_drives?.companies?.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground italic ml-6">
                      {app.placement_drives?.role_offered}
                    </div>
                  </td>
                  <td className="p-3 text-center font-bold text-primary">
                    {app.student?.current_cgpa || "N/A"}
                  </td>
                  <td className="p-3 text-center">
                    {app.resume_url ? (
                      <a
                        href={app.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-bold"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">N/A</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 h-8"
                        disabled={processing === app.id}
                        onClick={() => updateStatus(app.id, "approved_by_tpo")}
                      >
                        {processing === app.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <CheckCircle className="h-4 w-4 mr-1" />
                        }
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8"
                        disabled={processing === app.id}
                        onClick={() => updateStatus(app.id, "rejected_by_tpo")}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
