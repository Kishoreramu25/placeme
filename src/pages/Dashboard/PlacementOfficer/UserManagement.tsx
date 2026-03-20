import { useState, useEffect, useMemo } from "react";
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
  Ban, PauseCircle, CheckCircle2, GraduationCap,
  Search, Filter, MoreHorizontal, LayoutDashboard, Key,
  Mail, Building2, UserCircle, Activity
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
  <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[32px] overflow-hidden group">
    <CardContent className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div className={`h-12 w-12 rounded-2xl bg-slate-50 ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="h-6 w-6" />
        </div>
        <Badge variant="secondary" className="bg-slate-50 text-[10px] font-black">PROTOCOL STATUS: NOMINAL</Badge>
      </div>
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{title}</h4>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-slate-900 tracking-tighter">{value}</span>
        <span className="text-xs font-bold text-slate-400 font-mono">UNITS</span>
      </div>
      <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
    </CardContent>
  </Card>
);

export default function UserManagement() {
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [hodList, setHodList] = useState<any[]>([]);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isFetchingHODs, setIsFetchingHODs] = useState(true);
  const [isFetchingStudents, setIsFetchingStudents] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please log in again.");
        return;
      }
      fetchDepartments();
      fetchHODs();
      fetchStudents();
    };
    initialize();
  }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("id, name").order("name");
    if (data) setDepartments(data);
  };

  const fetchHODs = async () => {
    setIsFetchingHODs(true);
    try {
      // Cast to any to bypass table check if it's missing from generated types
      const { data, error } = await (supabase as any)
        .from("staff_credentials")
        .select("*, departments(name)")
        .eq("role", "department_coordinator")
        .order("created_at", { ascending: false });
      
      console.log("HODS:", data, "ERROR:", error);
      if (error) {
        console.error("HOD Fetch Error:", error.message);
        throw error;
      }
      setHodList(data || []);
    } catch (err: any) {
      toast.error("Failed fetching HODs: " + err.message);
    } finally {
      setIsFetchingHODs(false);
    }
  };

  const fetchStudents = async () => {
    setIsFetchingStudents(true);
    try {
      const { data, error } = await (supabase as any)
        .from("student_credentials")
        .select("*, departments(name)")
        .order("created_at", { ascending: false });
      
      console.log("STUDENTS:", data, "ERROR:", error);
      if (error) {
        console.error("Student Fetch Error:", error.message);
        throw error;
      }
      setStudentList(data || []);
    } catch (err: any) {
      toast.error("Failed fetching students: " + err.message);
    } finally {
      setIsFetchingStudents(false);
    }
  };

  const invokeEdge = async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
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
      case "suspended": return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-black uppercase">Suspended</Badge>;
      case "banned":    return <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-black uppercase">Banned</Badge>;
      default:          return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">Active</Badge>;
    }
  };

  const filteredHods = useMemo(() => {
    return hodList.filter(h => 
      h.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      h.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.departments?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [hodList, searchTerm]);

  const filteredStudents = useMemo(() => {
    return studentList.filter(s => 
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.departments?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [studentList, searchTerm]);

  // Stats calculation
  const totalUnits = studentList.length + hodList.length;
  const hodCount = hodList.filter(h => h.role === 'department_coordinator').length;
  const activeStudents = studentList.filter(s => s.account_status === 'active').length;

  const PasswordCell = ({ id, pwd }: { id: string; pwd: string }) => (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl group hover:border-primary/30 transition-all w-fit min-w-[140px]">
      <Key className="h-3 w-3 text-slate-400 group-hover:text-primary transition-colors" />
      <span className="font-mono text-xs font-bold text-slate-600 select-all flex-1">
        {showPasswords[id] ? pwd : "••••••••"}
      </span>
      <button onClick={() => togglePwd(id)} className="text-slate-400 hover:text-primary transition-colors">
        {showPasswords[id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-800 uppercase flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary p-2 bg-primary/10 rounded-2xl" />
            User Management
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">Protocol Audit & Access Control Hub</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name, email or department..." 
              className="pl-11 h-12 bg-white border-slate-200 rounded-2xl font-bold text-slate-600 focus:ring-primary shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Registered Units" 
          value={totalUnits} 
          icon={UserCircle} 
          color="text-indigo-400"
          subtitle="Aggregate entity count"
        />
        <StatCard 
          title="Total HOD Directors" 
          value={hodCount} 
          icon={Shield} 
          color="text-emerald-400"
          subtitle="Departmental leads"
        />
        <StatCard 
          title="Active Student Entities" 
          value={activeStudents} 
          icon={GraduationCap} 
          color="text-blue-400"
          subtitle="Current student pipeline"
        />
      </div>

      <Tabs defaultValue="hods" className="w-full">
        <TabsList className="bg-slate-100 p-1.5 gap-2 rounded-2xl w-fit h-auto mb-6">
          <TabsTrigger value="hods" className="px-8 py-3 font-black text-[10px] uppercase rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
            <Shield className="h-4 w-4 mr-2" /> HOD Directory
          </TabsTrigger>
          <TabsTrigger value="students" className="px-8 py-3 font-black text-[10px] uppercase rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
            <GraduationCap className="h-4 w-4 mr-2" /> Student Archive
          </TabsTrigger>
          <TabsTrigger value="create" className="px-8 py-3 font-black text-[10px] uppercase rounded-xl bg-slate-900 text-white data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <UserPlus className="h-4 w-4 mr-2" /> Deployment Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hods" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                     <CardTitle className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        HOD Credential Registry
                     </CardTitle>
                     <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Complete administrative oversight of department coordinators</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold text-xs gap-2" onClick={fetchHODs}>
                     <Activity className="h-4 w-4" /> REFRESH DATA
                  </Button>
               </div>
            </CardHeader>
            <CardContent className="p-0">
              {isFetchingHODs ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Accessing Secure Records...</p>
                </div>
              ) : filteredHods.length === 0 ? (
                <div className="text-center py-24 space-y-4">
                   <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Search className="h-10 w-10" />
                   </div>
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">No matching HOD entities found in this dimension.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">IDENTIFIER</th>
                        <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">COMMUNICATION LINK</th>
                        <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">ACCESS KEY</th>
                        <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">DEPARTMENT</th>
                        <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">MANAGEMENT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHods.map((hod: any) => (
                        <tr key={hod.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                                  <UserCircle className="h-6 w-6" />
                               </div>
                               <span className="font-black text-slate-800 uppercase tracking-tighter text-sm">{hod.full_name}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs italic">
                               <Mail className="h-3.5 w-3.5" /> {hod.email}
                            </div>
                          </td>
                          <td className="p-6"><PasswordCell id={hod.id} pwd={hod.plain_password} /></td>
                          <td className="p-6">
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 w-fit">
                               <Building2 className="h-3 w-3" /> {hod.departments?.name || "N/A"}
                            </Badge>
                          </td>
                          <td className="p-6 text-right">
                             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all">
                                <MoreHorizontal className="h-5 w-5 text-slate-400" />
                             </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                     <CardTitle className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        Student Archive Matrix
                     </CardTitle>
                     <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Comprehensive student credential auditing and status control</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold text-xs gap-2" onClick={fetchStudents}>
                     <Activity className="h-4 w-4" /> REFRESH DATA
                  </Button>
               </div>
            </CardHeader>
            <CardContent className="p-0">
              {isFetchingStudents ? (
                 <div className="flex flex-col items-center justify-center py-24 gap-4">
                   <Loader2 className="h-12 w-12 animate-spin text-primary" />
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Synchronizing Student Grid...</p>
                 </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-24 space-y-4">
                   <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <GraduationCap className="h-10 w-10" />
                   </div>
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">No student entities match the current search filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">CANDIDATE</th>
                        <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">COMMUNICATION LINK</th>
                        <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">ACCESS KEY</th>
                        <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">STATUS</th>
                        <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">OPS PROTOCOL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((s: any) => {
                        const status = s.account_status ?? "active";
                        const isProc = processingId === s.user_id;
                        return (
                          <tr key={s.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                            <td className="p-6">
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                     <GraduationCap className="h-6 w-6" />
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="font-black text-slate-800 uppercase tracking-tighter text-sm leading-none mb-1">{s.full_name}</span>
                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.departments?.name}</span>
                                  </div>
                               </div>
                            </td>
                            <td className="p-6">
                               <div className="flex items-center gap-2 text-slate-500 font-bold text-xs italic">
                                  <Mail className="h-3.5 w-3.5" /> {s.email}
                               </div>
                            </td>
                            <td className="p-6"><PasswordCell id={s.id} pwd={s.plain_password} /></td>
                            <td className="p-6 text-center">{getStatusBadge(status)}</td>
                            <td className="p-6">
                              <div className="flex justify-end gap-2">
                                {status !== "active" && (
                                  <Button size="sm" variant="outline"
                                    className="h-9 px-4 text-[10px] font-black uppercase border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 rounded-xl"
                                    disabled={isProc}
                                    onClick={() => updateStatus(s.user_id, "active")}
                                  >
                                    {isProc ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                                    Activate
                                  </Button>
                                )}
                                {status !== "suspended" && (
                                  <Button size="sm" variant="outline"
                                    className="h-9 px-4 text-[10px] font-black uppercase border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-50 rounded-xl"
                                    disabled={isProc}
                                    onClick={() => updateStatus(s.user_id, "suspended")}
                                  >
                                    {isProc ? <Loader2 className="h-3 w-3 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5 mr-1.5" />}
                                    Suspend
                                  </Button>
                                )}
                                {status !== "banned" && (
                                  <Button size="sm" variant="outline"
                                    className="h-9 px-4 text-[10px] font-black uppercase border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-50 rounded-xl"
                                    disabled={isProc}
                                    onClick={() => updateStatus(s.user_id, "banned")}
                                  >
                                    {isProc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3.5 w-3.5 mr-1.5" />}
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

        <TabsContent value="create" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Deployment Forms */}
              {[
                { 
                  t: "HOD COMMAND DEPLOYMENT", 
                  d: "Initialize new department coordinator protocol", 
                  i: <Shield className="h-6 w-6" />,
                  form: (
                    <form onSubmit={handleCreateHOD} className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Full Identity</Label>
                        <Input placeholder="Dr. Alexander Pierce" className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold" value={hodName} onChange={e => setHodName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Communication Channel (Email)</Label>
                        <Input type="email" placeholder="pierce@esec.ac.in" className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold" value={hodEmail} onChange={e => setHodEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Secure Access Key (Password)</Label>
                        <div className="relative">
                          <Input
                            type={showHodPwd ? "text" : "password"}
                            placeholder="SET SECURE KEY"
                            className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold pr-12"
                            value={hodPassword}
                            onChange={e => setHodPassword(e.target.value)}
                          />
                          <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors" onClick={() => setShowHodPwd(v => !v)}>
                            {showHodPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Assigned Department</Label>
                        <Select value={hodDept} onValueChange={setHodDept}>
                          <SelectTrigger className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold"><SelectValue placeholder="LOCATE DEPARTMENT" /></SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-2xl">
                            {departments.map(d => <SelectItem key={d.id} value={d.id} className="font-bold py-3 uppercase text-[11px]">{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full h-16 bg-slate-900 hover:bg-primary text-white rounded-2xl shadow-xl shadow-slate-900/20 font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98]" disabled={isCreating}>
                        {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : "EXECUTE PROXY DEPLOYMENT"}
                      </Button>
                    </form>
                  )
                },
                { 
                  t: "STUDENT ENTITY REGISTRATION", 
                  d: "Add new student candidate to the collective archive", 
                  i: <GraduationCap className="h-6 w-6" />,
                  form: (
                    <form onSubmit={handleCreateStudent} className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Full Legal Name</Label>
                        <Input placeholder="Kishore Ramu" className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold" value={stuName} onChange={e => setStuName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Academic Email</Label>
                        <Input type="email" placeholder="kishore@esec.ac.in" className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold" value={stuEmail} onChange={e => setStuEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Password Credentials</Label>
                        <div className="relative">
                          <Input
                            type={showStuPwd ? "text" : "password"}
                            placeholder="SET STUDENT KEY"
                            className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold pr-12"
                            value={stuPassword}
                            onChange={e => setStuPassword(e.target.value)}
                          />
                          <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors" onClick={() => setShowStuPwd(v => !v)}>
                            {showStuPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Academic Department</Label>
                        <Select value={stuDept} onValueChange={setStuDept}>
                          <SelectTrigger className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold"><SelectValue placeholder="SELECT ACADEMIC TRACK" /></SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-2xl">
                            {departments.map(d => <SelectItem key={d.id} value={d.id} className="font-bold py-3 uppercase text-[11px]">{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full h-16 bg-primary hover:bg-slate-900 text-white rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98]" disabled={isCreating}>
                        {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : "AUTHORIZE NEW ENTITY"}
                      </Button>
                    </form>
                  )
                }
              ].map((section, idx) => (
                <Card key={idx} className="border-none shadow-2xl shadow-slate-200/50 rounded-[40px] overflow-hidden bg-white">
                   <CardHeader className="bg-slate-50/50 p-10 border-b border-slate-100 flex flex-row items-center gap-6">
                      <div className="h-14 w-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-primary">
                         {section.i}
                      </div>
                      <div>
                         <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">{section.t}</CardTitle>
                         <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{section.d}</CardDescription>
                      </div>
                   </CardHeader>
                   <CardContent className="p-10">
                      {section.form}
                   </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
