import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, UserPlus, Users, Ban, PauseCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ManageUsers() {
  const { user } = useAuth();
  const [hodDepartmentId, setHodDepartmentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Step 1: Fetch HOD's department_id from profiles
  useEffect(() => {
    const fetchHodProfile = async () => {
      if (!user?.id) return;
      const { data: hodProfile, error } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error("Failed to load your department profile.");
        setIsFetching(false);
        return;
      }
      setHodDepartmentId(hodProfile?.department_id ?? null);
    };
    fetchHodProfile();
  }, [user?.id]);

  // Step 2: Once hodDepartmentId is known, fetch students
  useEffect(() => {
    if (hodDepartmentId) fetchStudents();
  }, [hodDepartmentId]);

  // Helper: verify session then invoke edge function
  const invokeEdge = async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in. Please refresh and try again.");
    const { data, error } = await supabase.functions.invoke("create-user", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchStudents = async () => {
    setIsFetching(true);
    try {
      const { data: students, error } = await supabase
        .from("student_credentials")
        .select(`
          id,
          user_id,
          full_name,
          email,
          plain_password,
          account_status,
          created_at,
          departments (name)
        `)
        .eq("department_id", hodDepartmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents(students || []);
    } catch (err: any) {
      toast.error("Failed to load students: " + err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error("Please fill all fields"); return; }
    if (!hodDepartmentId) { toast.error("Your department is not configured. Contact TPO."); return; }

    setIsCreating(true);
    try {
      await invokeEdge({
        action: "create",
        email,
        password,
        full_name: name,
        role: "student",
        department_id: hodDepartmentId,
      });

      toast.success(`✅ Student account created for ${name}`);
      setName(""); setEmail(""); setPassword("");
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setIsCreating(false);
    }
  };

  const updateAccountStatus = async (userId: string, status: "active" | "suspended" | "banned") => {
    setProcessingId(userId);
    try {
      await invokeEdge({ action: "update_status", user_id: userId, account_status: status });

      const labels: Record<string, string> = {
        active:    "✅ Account re-activated",
        suspended: "⏸️ Account temporarily suspended",
        banned:    "🚫 Account permanently banned",
      };
      toast.success(labels[status]);
      fetchStudents();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":    return <Badge className="bg-green-600 text-white">Active</Badge>;
      case "suspended": return <Badge className="bg-yellow-500 text-white">Suspended</Badge>;
      case "banned":    return <Badge variant="destructive">Banned</Badge>;
      default:          return <Badge variant="secondary">Active</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Students</h1>
        <p className="text-muted-foreground">Create accounts and control student access for your department.</p>
      </div>

      {/* ── Create Form ── */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" /> Create Student Account
          </CardTitle>
          <CardDescription>Account will be assigned to your department automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateStudent} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="e.g. Rahul Kumar" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email / Username</Label>
              <Input type="email" placeholder="student@esec.ac.in" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showNewPwd ? "text" : "password"}
                  placeholder="Set a password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-9"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPwd(v => !v)}
                >
                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Students Table ── */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" /> Department Students
            <Badge variant="outline" className="ml-auto">{students.length}</Badge>
          </CardTitle>
          <CardDescription>All students in your department — manage their access here.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isFetching ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground text-sm">
              No students created yet. Use the form above to add your first student.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Username / Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Password</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Department</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s: any, idx: number) => {
                    const status = s.account_status ?? "active";
                    const isProcessing = processingId === s.user_id;
                    const deptName = s.departments?.name ?? "—";
                    return (
                      <tr
                        key={s.id}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        {/* # */}
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>

                        {/* Student Name */}
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{s.full_name}</td>

                        {/* Email */}
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.email}</td>

                        {/* Password with eye toggle */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 bg-muted rounded px-2 py-1 font-mono text-xs w-fit max-w-[180px]">
                            <span className="truncate flex-1">
                              {showPasswords[s.id] ? (s.plain_password ?? "—") : "••••••••"}
                            </span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() =>
                                setShowPasswords(prev => ({ ...prev, [s.id]: !prev[s.id] }))
                              }
                              title={showPasswords[s.id] ? "Hide password" : "Show password"}
                            >
                              {showPasswords[s.id]
                                ? <EyeOff className="h-3.5 w-3.5" />
                                : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3">{getStatusBadge(status)}</td>

                        {/* Department */}
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{deptName}</td>

                        {/* Action Buttons */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {status !== "active" && (
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                                disabled={isProcessing}
                                onClick={() => updateAccountStatus(s.user_id, "active")}
                              >
                                {isProcessing
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                Activate
                              </Button>
                            )}
                            {status !== "suspended" && (
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                                disabled={isProcessing}
                                onClick={() => updateAccountStatus(s.user_id, "suspended")}
                              >
                                {isProcessing
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <PauseCircle className="h-3 w-3 mr-1" />}
                                Suspend
                              </Button>
                            )}
                            {status !== "banned" && (
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-destructive border-red-300 hover:bg-red-50"
                                disabled={isProcessing}
                                onClick={() => updateAccountStatus(s.user_id, "banned")}
                              >
                                {isProcessing
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Ban className="h-3 w-3 mr-1" />}
                                Ban
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
