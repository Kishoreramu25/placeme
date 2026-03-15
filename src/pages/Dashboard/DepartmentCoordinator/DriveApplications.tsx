import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function DriveApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        .select("id, first_name, last_name, reg_no, current_cgpa")
        .eq("department_id", hodProfile.department_id);

      if (!students || students.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);

      // Step 3: Get pending applications for those students
      const { data: apps, error: appsError } = await supabase
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
      .from("placement_applications")
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
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left text-center">Resume</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-semibold">
                    {app.student?.first_name} {app.student?.last_name}
                  </td>
                  <td className="p-3 text-muted-foreground">{app.student?.reg_no || "N/A"}</td>
                  <td className="p-3 text-center font-bold text-primary">{app.student?.current_cgpa || "N/A"}</td>
                  <td className="p-3 font-medium">{app.placement_drives?.companies?.name}</td>
                  <td className="p-3 italic text-muted-foreground">{app.placement_drives?.role_offered}</td>
                  <td className="p-3 text-center">
                    {app.resume_url ? (
                      <a href={app.resume_url} target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:underline font-bold">View</a>
                    ) : "N/A"}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8"
                        onClick={() => updateStatus(app.id, "approved_by_hod")}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8"
                        onClick={() => updateStatus(app.id, "rejected_by_hod")}>
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
