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
  const { departmentId, user } = useAuth();
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

  useEffect(() => {
    if (departmentId) fetchStudents();
  }, [departmentId]);

  // Helper: verify session then invoke edge function
  const invokeEdge = async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Session token:", session?.access_token);
    if (!session) throw new Error("Not logged in. Please refresh and try again.");
    const { data, error } = await supabase.functions.invoke('create-user', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchStudents = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("student_credentials")
        .select("*, departments:department_id(name)")
        .eq("department_id", departmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      toast.error("Failed to load students: " + err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error("Please fill all fields"); return; }
    if (!departmentId) { toast.error("Your department is not configured. Contact TPO."); return; }

    setIsCreating(true);
    try {
      await invokeEdge({
        action: 'create',
        email,
        password,
        full_name: name,
        role: 'student',
        department_id: departmentId
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
      await invokeEdge({ action: 'update_status', user_id: userId, account_status: status });

      const labels: Record<string, string> = {
        active:    "✅ Account re-activated",
        suspended: "⏸️ Account temporarily suspended",
        banned:    "🚫 Account permanently banned"
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

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Create Form ── */}
        <Card className="lg:col-span-2 border-0 shadow-md h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5 text-primary" /> Create Student Account
            </CardTitle>
            <CardDescription>Account will be assigned to your department automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStudent} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Students List ── */}
        <Card className="lg:col-span-3 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" /> Department Students
              <Badge variant="outline" className="ml-auto">{students.length}</Badge>
            </CardTitle>
            <CardDescription>Manage access for students in your department.</CardDescription>
          </CardHeader>
          <CardContent>
            {isFetching ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No students created yet. Use the form to add your first student.
              </div>
            ) : (
              <div className="space-y-3">
                {students.map((s: any) => {
                  const status = s.account_status ?? "active";
                  const isProcessing = processingId === s.user_id;
                  return (
                    <div key={s.id} className="p-3 rounded-xl border bg-muted/30 space-y-2">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">{s.full_name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </div>
                        {getStatusBadge(status)}
                      </div>

                      {/* Password row */}
                      <div className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1.5 font-mono">
                        <span className="text-muted-foreground shrink-0">Password:</span>
                        <span className="flex-1 truncate">
                          {showPasswords[s.id] ? s.plain_password : "••••••••"}
                        </span>
                        <button
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => setShowPasswords(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                        >
                          {showPasswords[s.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-0.5">
                        {status !== "active" && (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                            disabled={isProcessing}
                            onClick={() => updateAccountStatus(s.user_id, "active")}
                          >
                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
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
                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <PauseCircle className="h-3 w-3 mr-1" />}
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
                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3 mr-1" />}
                            Ban
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
