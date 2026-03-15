import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, UserPlus, Shield, Users, Eye, EyeOff,
  Ban, PauseCircle, CheckCircle2, GraduationCap
} from "lucide-react";

export default function UserManagement() {
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [hodList, setHodList] = useState<any[]>([]);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isFetchingHODs, setIsFetchingHODs] = useState(true);
  const [isFetchingStudents, setIsFetchingStudents] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // HOD form
  const [hodName, setHodName] = useState("");
  const [hodEmail, setHodEmail] = useState("");
  const [hodPassword, setHodPassword] = useState("");
  const [hodDept, setHodDept] = useState("");
  const [showHodPwd, setShowHodPwd] = useState(false);

  // Student form
  const [stuName, setStuName] = useState("");
  const [stuEmail, setStuEmail] = useState("");
  const [stuPassword, setStuPassword] = useState("");
  const [stuDept, setStuDept] = useState("");
  const [showStuPwd, setShowStuPwd] = useState(false);

  // Active create form selector
  const [createRole, setCreateRole] = useState<"student" | "hod">("hod");

  useEffect(() => {
    fetchDepartments();
    fetchHODs();
    fetchStudents();
  }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("id, name").order("name");
    if (data) setDepartments(data);
  };

  const fetchHODs = async () => {
    setIsFetchingHODs(true);
    try {
      const { data, error } = await supabase
        .from("staff_credentials")
        .select("*, departments:department_id(name)")
        .eq("role", "department_coordinator")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setHodList(data || []);
    } catch (err: any) {
      console.error("Failed fetching HODs:", err.message);
    } finally {
      setIsFetchingHODs(false);
    }
  };

  const fetchStudents = async () => {
    setIsFetchingStudents(true);
    try {
      const { data, error } = await supabase
        .from("student_credentials")
        .select("*, departments:department_id(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setStudentList(data || []);
    } catch (err: any) {
      console.error("Failed fetching students:", err.message);
    } finally {
      setIsFetchingStudents(false);
    }
  };

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

  const handleCreateHOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hodName || !hodEmail || !hodPassword || !hodDept) { toast.error("Fill all fields"); return; }
    setIsCreating(true);
    try {
      await invokeEdge({
        action: 'create',
        email: hodEmail,
        password: hodPassword,
        full_name: hodName,
        role: 'department_coordinator',
        department_id: hodDept
      });
      toast.success(`✅ HOD account created for ${hodName}`);
      setHodName(""); setHodEmail(""); setHodPassword(""); setHodDept("");
      fetchHODs();
    } catch (err: any) {
      toast.error(err.message || "Failed to create HOD");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stuName || !stuEmail || !stuPassword || !stuDept) { toast.error("Fill all fields"); return; }
    setIsCreating(true);
    try {
      await invokeEdge({
        action: 'create',
        email: stuEmail,
        password: stuPassword,
        full_name: stuName,
        role: 'student',
        department_id: stuDept
      });
      toast.success(`✅ Student account created for ${stuName}`);
      setStuName(""); setStuEmail(""); setStuPassword(""); setStuDept("");
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to create student");
    } finally {
      setIsCreating(false);
    }
  };

  const updateStatus = async (userId: string, status: "active" | "suspended" | "banned") => {
    setProcessingId(userId);
    try {
      await invokeEdge({ action: 'update_status', user_id: userId, account_status: status });
      const labels: Record<string, string> = {
        active: "✅ Account activated", suspended: "⏸️ Account suspended", banned: "🚫 Account banned"
      };
      toast.success(labels[status]);
      fetchStudents();
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const togglePwd = (id: string) => setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "suspended": return <Badge className="bg-yellow-500 text-white text-[10px]">Suspended</Badge>;
      case "banned":    return <Badge variant="destructive" className="text-[10px]">Banned</Badge>;
      default:          return <Badge className="bg-green-600 text-white text-[10px]">Active</Badge>;
    }
  };

  const PasswordCell = ({ id, pwd }: { id: string; pwd: string }) => (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded select-all">
        {showPasswords[id] ? pwd : "••••••••"}
      </span>
      <button onClick={() => togglePwd(id)} className="text-muted-foreground hover:text-foreground shrink-0">
        {showPasswords[id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Create and manage HODs and Students with full credential visibility.</p>
      </div>

      <Tabs defaultValue="hods">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="hods"><Shield className="h-4 w-4 mr-1.5" /> HODs</TabsTrigger>
          <TabsTrigger value="students"><GraduationCap className="h-4 w-4 mr-1.5" /> Students</TabsTrigger>
          <TabsTrigger value="create"><UserPlus className="h-4 w-4 mr-1.5" /> Create</TabsTrigger>
        </TabsList>

        {/* ══ TAB 1: HODs ══ */}
        <TabsContent value="hods" className="pt-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> All HOD Accounts
                <Badge variant="outline" className="ml-auto">{hodList.length} HODs</Badge>
              </CardTitle>
              <CardDescription>Credentials for all Department Coordinators.</CardDescription>
            </CardHeader>
            <CardContent>
              {isFetchingHODs ? (
                <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              ) : hodList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No HOD accounts yet. Go to "Create" tab to add one.</div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Name</th>
                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Email</th>
                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Password</th>
                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Department</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hodList.map((hod: any) => (
                        <tr key={hod.id} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-semibold">{hod.full_name}</td>
                          <td className="p-3 text-muted-foreground text-xs">{hod.email}</td>
                          <td className="p-3"><PasswordCell id={hod.id} pwd={hod.plain_password} /></td>
                          <td className="p-3"><Badge variant="secondary">{hod.departments?.name || "N/A"}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TAB 2: Students ══ */}
        <TabsContent value="students" className="pt-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> All Student Accounts
                <Badge variant="outline" className="ml-auto">{studentList.length} Students</Badge>
              </CardTitle>
              <CardDescription>Full credentials and account status control for all students.</CardDescription>
            </CardHeader>
            <CardContent>
              {isFetchingStudents ? (
                <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              ) : studentList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No student accounts yet.</div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Name</th>
                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Email</th>
                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Password</th>
                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider">Department</th>
                        <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider">Status</th>
                        <th className="p-3 text-right text-[10px] font-black uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentList.map((s: any) => {
                        const status = s.account_status ?? "active";
                        const isProc = processingId === s.user_id;
                        return (
                          <tr key={s.id} className="border-t hover:bg-muted/20 transition-colors">
                            <td className="p-3 font-semibold">{s.full_name}</td>
                            <td className="p-3 text-muted-foreground text-xs">{s.email}</td>
                            <td className="p-3"><PasswordCell id={s.id} pwd={s.plain_password} /></td>
                            <td className="p-3">
                              <Badge variant="secondary" className="text-[10px]">{s.departments?.name || "N/A"}</Badge>
                            </td>
                            <td className="p-3 text-center">{getStatusBadge(status)}</td>
                            <td className="p-3">
                              <div className="flex justify-end gap-1.5">
                                {status !== "active" && (
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-[11px] text-green-600 border-green-300"
                                    disabled={isProc}
                                    onClick={() => updateStatus(s.user_id, "active")}
                                  >
                                    {isProc ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                    Activate
                                  </Button>
                                )}
                                {status !== "suspended" && (
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-[11px] text-yellow-600 border-yellow-300"
                                    disabled={isProc}
                                    onClick={() => updateStatus(s.user_id, "suspended")}
                                  >
                                    {isProc ? <Loader2 className="h-3 w-3 animate-spin" /> : <PauseCircle className="h-3 w-3 mr-1" />}
                                    Suspend
                                  </Button>
                                )}
                                {status !== "banned" && (
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-[11px] text-destructive border-red-300"
                                    disabled={isProc}
                                    onClick={() => updateStatus(s.user_id, "banned")}
                                  >
                                    {isProc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3 mr-1" />}
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
        </TabsContent>

        {/* ══ TAB 3: Create ══ */}
        <TabsContent value="create" className="pt-4">
          <div className="grid gap-6 md:grid-cols-2">

            {/* Create HOD */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" /> Create HOD Account
                </CardTitle>
                <CardDescription>Creates a new Department Coordinator login.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateHOD} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input placeholder="Dr. Jane Doe" value={hodName} onChange={e => setHodName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" placeholder="hod@esec.ac.in" value={hodEmail} onChange={e => setHodEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showHodPwd ? "text" : "password"}
                        placeholder="Set a strong password"
                        value={hodPassword}
                        onChange={e => setHodPassword(e.target.value)}
                        className="pr-9"
                      />
                      <button type="button" className="absolute right-2.5 top-2.5 text-muted-foreground" onClick={() => setShowHodPwd(v => !v)}>
                        {showHodPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Select value={hodDept} onValueChange={setHodDept}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreating}>
                    {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create HOD Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Create Student */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5 text-primary" /> Create Student Account
                </CardTitle>
                <CardDescription>Creates a student login for any department.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input placeholder="e.g. Ravi Kumar" value={stuName} onChange={e => setStuName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" placeholder="student@esec.ac.in" value={stuEmail} onChange={e => setStuEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showStuPwd ? "text" : "password"}
                        placeholder="Set a password"
                        value={stuPassword}
                        onChange={e => setStuPassword(e.target.value)}
                        className="pr-9"
                      />
                      <button type="button" className="absolute right-2.5 top-2.5 text-muted-foreground" onClick={() => setShowStuPwd(v => !v)}>
                        {showStuPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Select value={stuDept} onValueChange={setStuDept}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreating}>
                    {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Student Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
