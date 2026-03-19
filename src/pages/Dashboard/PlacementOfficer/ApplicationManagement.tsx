import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Briefcase, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  CheckCircle,
  Clock, 
  XCircle, 
  FileText, 
  Download, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  Settings, 
  MoreVertical,
  Trash2,
  Check,
  Building2,
  TrendingUp,
  User,
  Layers,
  MapPin,
  Calendar,
  Mail,
  Phone,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Globe,
  Activity,
  ArrowUpDown,
  Eye,
  Loader2,
  Award
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export const COLUMN_DEFS = [
  { key: "company_name", label: "Company", visible: true, sticky: true, offset: 160, category: "Placement" },
  { key: "role_offered", label: "Role Offered", visible: true, sticky: false, category: "Placement" },
  { key: "status", label: "Status", visible: true, sticky: false, category: "Placement" },
  { key: "first_name", label: "Name", visible: true, sticky: false, category: "Personal" },
  { key: "last_name", label: "Last Name", visible: true, sticky: false, category: "Personal" },
  { key: "reg_no", label: "Reg No", visible: true, sticky: false, category: "Personal" },
  { key: "department_name", label: "Department", visible: true, sticky: false, category: "Academic" },
  { key: "overall_cgpa", label: "Overall CGPA", visible: true, sticky: false, category: "Academic" },
  { key: "current_backlogs", label: "Backlogs", visible: true, sticky: false, category: "Academic" },
  { key: "ctc_amount", label: "CTC", visible: true, sticky: false, category: "Placement" },
  { key: "roll_number", label: "Roll Number", visible: false, category: "Personal" },
  { key: "email_address", label: "Email", visible: false, category: "Personal" },
  { key: "alternate_email", label: "Alt Email", visible: false, category: "Personal" },
  { key: "mobile_number", label: "Mobile", visible: false, category: "Personal" },
  { key: "whatsapp_number", label: "WhatsApp", visible: false, category: "Personal" },
  { key: "date_of_birth", label: "DOB", visible: false, category: "Personal" },
  { key: "gender", label: "Gender", visible: false, category: "Personal" },
  { key: "blood_group", label: "Blood Group", visible: false, category: "Personal" },
  { key: "marital_status", label: "Marital Status", visible: false, category: "Personal" },
  { key: "aadhar_number", label: "Aadhar", visible: false, category: "Personal" },
  { key: "pan_number", label: "PAN", visible: false, category: "Personal" },
  { key: "passport_available", label: "Passport", visible: false, category: "Personal" },
  { key: "passport_number", label: "Passport No", visible: false, category: "Personal" },
  { key: "nationality", label: "Nationality", visible: false, category: "Personal" },
  { key: "state", label: "State", visible: false, category: "Address" },
  { key: "district", label: "District", visible: false, category: "Address" },
  { key: "mother_tongue", label: "Mother Tongue", visible: false, category: "Personal" },
  { key: "religion", label: "Religion", visible: false, category: "Personal" },
  { key: "community", label: "Community", visible: false, category: "Personal" },
  { key: "caste", label: "Caste", visible: false, category: "Personal" },
  { key: "tenth_board", label: "10th Board", visible: false, category: "Academic" },
  { key: "tenth_school", label: "10th School", visible: false, category: "Academic" },
  { key: "tenth_percentage", label: "10th %", visible: false, category: "Academic" },
  { key: "twelfth_board", label: "12th Board", visible: false, category: "Academic" },
  { key: "twelfth_school", label: "12th School", visible: false, category: "Academic" },
  { key: "twelfth_percentage", label: "12th %", visible: false, category: "Academic" },
  { key: "diploma_studied", label: "Diploma", visible: false, category: "Academic" },
  { key: "diploma_institute", label: "Diploma Inst", visible: false, category: "Academic" },
  { key: "diploma_stream", label: "Diploma Stream", visible: false, category: "Academic" },
  { key: "work_experience_years", label: "Work Exp (Y)", visible: false, category: "Professional" },
  { key: "current_year", label: "Year", visible: false, category: "Academic" },
  { key: "current_semester", label: "Semester", visible: false, category: "Academic" },
  { key: "sem_1_cgpa", label: "Sem 1", visible: false, category: "Academic" },
  { key: "sem_2_cgpa", label: "Sem 2", visible: false, category: "Academic" },
  { key: "sem_3_cgpa", label: "Sem 3", visible: false, category: "Academic" },
  { key: "sem_4_cgpa", label: "Sem 4", visible: false, category: "Academic" },
  { key: "sem_5_cgpa", label: "Sem 5", visible: false, category: "Academic" },
  { key: "sem_6_cgpa", label: "Sem 6", visible: false, category: "Academic" },
  { key: "sem_7_cgpa", label: "Sem 7", visible: false, category: "Academic" },
  { key: "sem_8_cgpa", label: "Sem 8", visible: false, category: "Academic" },
  { key: "current_standing_arrear", label: "Standing Arrear", visible: false, category: "Academic" },
  { key: "history_of_arrear", label: "History Arrear", visible: false, category: "Academic" },
  { key: "arrears_count", label: "Arrears Count", visible: false, category: "Academic" },
  { key: "regulations", label: "Regulations", visible: false, category: "Academic" },
  { key: "batch", label: "Batch", visible: false, category: "Academic" },
  { key: "section", label: "Section", visible: false, category: "Academic" },
  { key: "quota", label: "Quota", visible: false, category: "Academic" },
  { key: "medium", label: "Medium", visible: false, category: "Academic" },
  { key: "mode_of_education", label: "Education Mode", visible: false, category: "Academic" },
  { key: "mode_of_admission", label: "Admission Mode", visible: false, category: "Academic" },
  { key: "student_status", label: "Student Status", visible: false, category: "Academic" },
  { key: "father_name", label: "Father", visible: false, category: "Family" },
  { key: "father_occupation", label: "Father Job", visible: false, category: "Family" },
  { key: "father_mobile", label: "Father Ph", visible: false, category: "Family" },
  { key: "mother_name", label: "Mother", visible: false, category: "Family" },
  { key: "mother_mobile", label: "Mother Ph", visible: false, category: "Family" },
  { key: "is_parent_farmer", label: "Farmer (P)", visible: false, category: "Family" },
  { key: "door_street", label: "Street", visible: false, category: "Address" },
  { key: "area_village", label: "Village", visible: false, category: "Address" },
  { key: "pincode", label: "Pincode", visible: false, category: "Address" },
  { key: "hostel_day_scholar", label: "Scholar Type", visible: false, category: "Personal" },
  { key: "hostel_name", label: "Hostel Name", visible: false, category: "Personal" },
  { key: "interested_in_placement", label: "Placement Int", visible: false, category: "Placement" },
  { key: "opt_out_reason", label: "Opt Out Reason", visible: false, category: "Placement" },
  { key: "photo_url", label: "Photo", visible: false, category: "Resource" },
  { key: "resume_url", label: "Resume", visible: true, sticky: false, category: "Resource" },
  { key: "it_skills", label: "IT Skills", visible: false, category: "Professional" },
  { key: "programming_languages", label: "Languages", visible: false, category: "Professional" },
  { key: "projects", label: "Projects", visible: false, category: "Professional" },
  { key: "internships", label: "Internships", visible: false, category: "Professional" },
  { key: "certifications", label: "Certifications", visible: false, category: "Professional" },
  { key: "github_url", label: "GitHub", visible: false, category: "Professional" },
  { key: "linkedin_url", label: "LinkedIn", visible: false, category: "Professional" },
  { key: "leetcode_url", label: "LeetCode", visible: false, category: "Professional" },
  { key: "hackerrank_url", label: "HackerRank", visible: false, category: "Professional" },
  { key: "preferred_role", label: "Pref Role", visible: false, category: "Placement" },
  { key: "preferred_location", label: "Pref Location", visible: false, category: "Placement" },
  { key: "extracurricular", label: "Extra", visible: false, category: "Personal" },
  { key: "geographic_area", label: "Geo Area", visible: false, category: "Address" },
  { key: "physically_challenged", label: "Physic Chal.", visible: false, category: "Personal" },
  { key: "first_graduate", label: "1st Grad", visible: false, category: "Family" },
  { key: "single_parent", label: "Single Parent", visible: false, category: "Family" },
  { key: "ex_serviceman_child", label: "Ex-Serv. Child", visible: false, category: "Family" },
  { key: "andaman_nicobar", label: "AN Islands", visible: false, category: "Address" },
];

const CATEGORIES = [
  { id: "Placement", icon: <Building2 className="h-3.5 w-3.5" />, color: "text-blue-600 bg-blue-50" },
  { id: "Personal", icon: <User className="h-3.5 w-3.5" />, color: "text-emerald-600 bg-emerald-50" },
  { id: "Academic", icon: <Layers className="h-3.5 w-3.5" />, color: "text-amber-600 bg-amber-50" },
  { id: "Professional", icon: <TrendingUp className="h-3.5 w-3.5" />, color: "text-purple-600 bg-purple-50" },
  { id: "Family", icon: <Users className="h-3.5 w-3.5" />, color: "text-cyan-600 bg-cyan-50" },
  { id: "Address", icon: <MapPin className="h-3.5 w-3.5" />, color: "text-rose-600 bg-rose-50" },
  { id: "Resource", icon: <FileText className="h-3.5 w-3.5" />, color: "text-indigo-600 bg-indigo-50" },
];

export default function ApplicationManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("tpo_app_visibility");
    const defaults = COLUMN_DEFS.reduce((acc: any, col) => {
      acc[col.key] = col.visible;
      return acc;
    }, {});
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Object.keys(parsed).length !== COLUMN_DEFS.length) {
        localStorage.setItem("tpo_app_visibility", JSON.stringify(defaults));
        return defaults;
      }
      return parsed;
    }
    return defaults;
  });

  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [newFilterField, setNewFilterField] = useState("");
  const [newFilterValue, setNewFilterValue] = useState("");
  const [isModifyTableOpen, setIsModifyTableOpen] = useState(false);
  const [sortBy, setSortBy] = useState("applied_at-desc");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { data: applications, isLoading } = useQuery({
    queryKey: ["tpo-application-pool"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_application_pool");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const stats = useMemo(() => {
    if (!applications) return { total: 0, shortlisted: 0, placed: 0, pending: 0 };
    return {
      total: applications.length,
      shortlisted: applications.filter(a => a.status === 'shortlisted').length,
      placed: applications.filter(a => a.status === 'selected').length,
      pending: applications.filter(a => a.status === 'approved_by_hod' || a.status === 'pending_tpo').length
    };
  }, [applications]);

  const toggleColumn = (key: string) => {
    setColumnVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("tpo_app_visibility", JSON.stringify(next));
      return next;
    });
  };

  const updateStatus = async (appId: string, status: string, interviewTs?: string) => {
    setIsProcessing(appId);
    try {
      const updateData: any = { status };
      if (interviewTs) updateData.interview_timestamp = interviewTs;
      const { error } = await supabase.from("placement_applications" as any).update(updateData).eq("id", appId);
      if (error) throw error;
      toast.success(`Candidate record updated to ${status.toUpperCase().replace(/_/g, ' ')}`);
      queryClient.invalidateQueries({ queryKey: ["tpo-application-pool"] });
      setIsDetailsOpen(false);
      setIsInterviewDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsProcessing(null);
    }
  };

  const getAvailableValues = (key: string) => {
    if (!applications) return [];
    try {
      const vals = new Set((applications as any[]).map(app => String((app as any)[key] || "")).filter(Boolean));
      return Array.from(vals).sort();
    } catch { return []; }
  };

  const addFilter = () => {
    if (!newFilterField || !newFilterValue) return;
    const field = COLUMN_DEFS.find(c => c.key === newFilterField);
    setActiveFilters([...activeFilters, { 
      id: Math.random().toString(36).substr(2, 9),
      key: newFilterField, 
      label: field?.label, 
      value: newFilterValue 
    }]);
    setNewFilterField("");
    setNewFilterValue("");
  };

  const filteredApps = useMemo(() => {
    if (!applications) return [];
    return applications.filter((app: any) => {
      const visibleCols = COLUMN_DEFS.filter(c => columnVisibility[c.key]);
      const matchesSearch = searchTerm === "" || visibleCols.some(col => {
        const val = (app as any)[col.key];
        return String(val || "").toLowerCase().includes(searchTerm.toLowerCase());
      });
      const matchesFilters = activeFilters.every(f => String((app as any)[f.key] || "").toLowerCase() === f.value.toLowerCase());
      return matchesSearch && matchesFilters;
    }).sort((a, b) => {
      const [key, dir] = sortBy.split("-");
      const valA = (a as any)[key];
      const valB = (b as any)[key];
      if (valA === valB) return 0;
      const comparison = String(valA || "").localeCompare(String(valB || ""));
      return dir === "asc" ? comparison : -comparison;
    });
  }, [applications, searchTerm, activeFilters, sortBy, columnVisibility]);

  const handleExportCSV = (dataToExport?: any[]) => {
    const data = Array.isArray(dataToExport) ? dataToExport : filteredApps;
    if (!Array.isArray(data) || data.length === 0) {
      toast.error("No data available to export");
      return;
    }
    try {
      const visibleCols = COLUMN_DEFS.filter(c => columnVisibility[c.key]);
      const headers = visibleCols.map(c => c.label);
      const rows = data.map(app => 
        visibleCols.map(col => {
          let val = (app as any)[col.key];
          if (col.key === "status") val = val?.toUpperCase();
          if (col.key === "first_name") val = `${app.first_name} ${app.last_name}`;
          const strVal = String(val || "").replace(/%/g, '');
          return strVal.includes(",") || strVal.includes('"') ? `"${strVal.replace(/"/g, '""')}"` : strVal;
        }).join(",")
      );
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Application_Pool_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${Array.isArray(dataToExport) ? 'Selected' : 'All'} data exported!`);
    } catch (err) {
      console.error(err);
      toast.error("Export failed: Data processing error");
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "pending";
    if (s === "selected" || s === "placed") return <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 border-none shadow-sm"><CheckCircle2 className="h-3 w-3 mr-1" /> PLACED</Badge>;
    if (s === "shortlisted") return <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 border-none shadow-sm"><Activity className="h-3 w-3 mr-1" /> SHORTLISTED</Badge>;
    if (s === "interview_scheduled") return <Badge className="bg-gradient-to-r from-purple-500 to-violet-600 border-none shadow-sm"><Calendar className="h-3 w-3 mr-1" /> INTERVIEW SET</Badge>;
    if (s === "rejected_by_tpo") return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-200"><XCircle className="h-3 w-3 mr-1" /> REJECTED</Badge>;
    if (s === "pending_tpo" || s === "approved_by_hod") return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">AWAITING TPO</Badge>;
    return <Badge variant="secondary" className="bg-slate-100 text-slate-600">{status?.toUpperCase().replace(/_/g, ' ') || 'PENDING'}</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Placement Intelligence Command</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 drop-shadow-sm">Application Pool</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Enterprise-grade candidacy lifecycle management</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-fit">
          <Card className="px-4 py-2 border-none bg-slate-100/50 backdrop-blur shadow-none">
            <p className="text-[9px] font-black text-slate-400 uppercase">Total Candidates</p>
            <p className="text-xl font-black text-slate-900">{stats.total}</p>
          </Card>
          <Card className="px-4 py-2 border-none bg-blue-50/50 backdrop-blur shadow-none">
            <p className="text-[9px] font-black text-blue-400 uppercase">Shortlisted</p>
            <p className="text-xl font-black text-blue-600">{stats.shortlisted}</p>
          </Card>
          <Card className="px-4 py-2 border-none bg-emerald-50/50 backdrop-blur shadow-none">
            <p className="text-[9px] font-black text-emerald-400 uppercase">Placed</p>
            <p className="text-xl font-black text-emerald-600">{stats.placed}</p>
          </Card>
          <Card className="px-4 py-2 border-none bg-amber-50/50 backdrop-blur shadow-none">
            <p className="text-[9px] font-black text-amber-400 uppercase">Pending</p>
            <p className="text-xl font-black text-amber-600">{stats.pending}</p>
          </Card>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 sticky top-0 z-20 py-2 bg-background/80 backdrop-blur-md border-b">
         <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Universal Candidate Search (ID, Name, Dept...)"
              className="pl-11 h-12 bg-slate-50 border-slate-200 focus-visible:ring-primary focus-visible:bg-white transition-all text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="lg" variant="outline" onClick={() => setIsModifyTableOpen(true)} className="h-12 border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm font-black uppercase text-xs">
              <Filter className="h-4 w-4 mr-2 text-primary" />
              Configure Grid
            </Button>
            <Button size="lg" variant="outline" onClick={() => handleExportCSV()} className="h-12 border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm font-black uppercase text-xs">
              <Download className="h-4 w-4 mr-2 text-primary" />
              Export Pool
            </Button>
          </div>
      </div>

      <Card className="bg-white/50 border shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">
            <Activity className="h-3 w-3" /> Filters
          </div>
          <Select value={newFilterField} onValueChange={setNewFilterField}>
            <SelectTrigger className="w-[200px] h-10 font-bold border-slate-200 bg-white">
              <SelectValue placeholder="Select Data Point" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {COLUMN_DEFS.map(col => (
                <SelectItem key={col.key} value={col.key} className="text-xs font-bold">{col.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newFilterValue} onValueChange={setNewFilterValue} disabled={!newFilterField}>
            <SelectTrigger className="w-[200px] h-10 font-bold border-slate-200 bg-white">
              <SelectValue placeholder="Match Value" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {getAvailableValues(newFilterField).map(val => (
                <SelectItem key={val} value={val} className="text-xs font-bold">{val}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="h-10 px-6 font-black uppercase text-[11px] shadow-sm transform active:scale-95 transition-all" onClick={addFilter} disabled={!newFilterValue}>Inject Filter</Button>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <div className="flex items-center gap-3">
             <ArrowUpDown className="h-4 w-4 text-slate-400" />
             <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-10 font-black uppercase text-[10px] border-none bg-transparent shadow-none hover:bg-slate-100 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="applied_at-desc" className="text-[10px] font-black uppercase">Recent Application</SelectItem>
                  <SelectItem value="overall_cgpa-desc" className="text-[10px] font-black uppercase">Academic Ranking</SelectItem>
                  <SelectItem value="ctc_amount-desc" className="text-[10px] font-black uppercase">Remuneration Priority</SelectItem>
                  <SelectItem value="first_name-asc" className="text-[10px] font-black uppercase">Alphabetical Alpha</SelectItem>
                </SelectContent>
             </Select>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-dashed">
            {activeFilters.map(f => (
              <Badge key={f.id} variant="secondary" className="gap-2 px-4 py-1.5 font-black text-[10px] bg-white border shadow-sm text-slate-700 animate-in zoom-in-95">
                <span className="text-slate-400 uppercase">{f.label}:</span> {f.value}
                <XCircle className="h-3.5 w-3.5 cursor-pointer text-rose-500 hover:text-rose-700 transition-colors" onClick={() => setActiveFilters(activeFilters.filter(x => x.id !== f.id))} />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="ml-2 text-rose-600 font-black uppercase text-[10px] hover:bg-rose-50" onClick={() => setActiveFilters([])}>Purge All Filters</Button>
          </div>
        )}
      </Card>

      {selectedRowIds.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4 z-50">
          <div className="h-10 w-10 bg-primary text-white rounded-full flex items-center justify-center font-black shadow-lg shadow-primary/20">{selectedRowIds.size}</div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-primary uppercase leading-tight">Selection Protocol Active</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Bulk processing for {selectedRowIds.size} entities</span>
          </div>
          <div className="flex-1" />
          <Button size="sm" variant="outline" className="h-10 bg-white shadow-sm font-bold border-slate-200" onClick={() => {
             const selectedData = filteredApps.filter(app => selectedRowIds.has(app.id));
             handleExportCSV(selectedData);
          }}>Download Intelligence Batch</Button>
          <Button size="sm" variant="destructive" className="h-10 shadow-lg shadow-rose-500/20 font-bold uppercase tracking-widest text-[10px] px-6" onClick={() => {
            if(confirm(`WARNING: Remove ${selectedRowIds.size} application records permanently?`)) {
              toast.success(`${selectedRowIds.size} records purged from current view`);
              setSelectedRowIds(new Set());
            }
          }}>Execute Record Removal</Button>
        </div>
      )}

      <Card className="rounded-2xl border bg-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all">
        <div className="overflow-x-auto relative" ref={(el) => {
          if (el) {
            const sync = (e: any) => {
              const top = document.getElementById("top-scrollbar-inner");
              if (top) document.getElementById("top-scrollbar")!.scrollLeft = e.target.scrollLeft;
            };
            el.addEventListener("scroll", sync);
          }
        }}>
          <Table>
            <TableHeader className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-40">
              <TableRow className="border-b transition-none">
                <TableHead className="w-[60px] min-w-[60px] sticky left-0 z-50 bg-slate-50/95 py-5 px-0 border-r shadow-[5px_0_15px_rgba(0,0,0,0.03)] text-center" style={{ left: 0 }}>
                  <Checkbox 
                    className="h-5 w-5 data-[state=checked]:bg-primary rounded-[5px]"
                    checked={selectedRowIds.size === filteredApps.length && filteredApps.length > 0} 
                    onCheckedChange={() => {
                      if (selectedRowIds.size === filteredApps.length) setSelectedRowIds(new Set());
                      else setSelectedRowIds(new Set(filteredApps.map(a => a.id)));
                    }}
                  />
                </TableHead>
                <TableHead className="w-[100px] min-w-[100px] font-black text-[10px] uppercase tracking-widest text-slate-400 sticky z-50 bg-slate-50/95 border-r shadow-[5px_0_15px_rgba(0,0,0,0.03)] px-2 text-center" style={{ left: '60px' }}>Protocol</TableHead>
                {COLUMN_DEFS.filter(c => columnVisibility[c.key]).map((col) => (
                  <TableHead 
                    key={col.key} 
                    className={`font-black text-[10px] uppercase tracking-widest text-slate-400 py-5 px-10 ${col.sticky ? "sticky z-50 bg-slate-50/95 border-r shadow-[5px_0_15px_rgba(0,0,0,0.03)]" : ""}`}
                    style={col.sticky ? { left: `${col.offset}px`, minWidth: '160px', width: '160px' } : { minWidth: '220px' }}
                  >
                    <div className="flex items-center gap-2">
                       {col.label}
                       <ChevronDown className="h-3 w-3 opacity-30" />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({length: 10}).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-5 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 rounded-lg" /></TableCell>
                    {COLUMN_DEFS.filter(c => columnVisibility[c.key]).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-32 rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredApps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Object.values(columnVisibility).filter(v => v).length + 2} className="text-center py-24">
                    <div className="flex flex-col items-center opacity-40">
                      <Search className="h-12 w-12 mb-4" />
                      <p className="text-xl font-black uppercase tracking-widest">No candidates match the target profile</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredApps.map((app: any, idx: number) => (
                  <TableRow 
                    key={app.id} 
                    style={{ animationDelay: `${idx * 30}ms` }}
                    className="hover:bg-primary/[0.03] transition-colors whitespace-nowrap text-[11.5px] font-bold text-slate-700 h-20 group/row"
                    onClick={() => { setSelectedApp(app); setIsDetailsOpen(true); }}
                  >
                    <TableCell className="sticky left-0 bg-white z-30 group-hover/row:bg-primary/[0.01] transition-colors border-r shadow-[5px_0_15px_rgba(0,0,0,0.01)] text-center px-0 w-[60px] min-w-[60px]" style={{ left: 0 }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        className="h-5 w-5 rounded-[5px]"
                        checked={selectedRowIds.has(app.id)} 
                        onCheckedChange={() => {
                          const next = new Set(selectedRowIds);
                          if (next.has(app.id)) next.delete(app.id);
                          else next.add(app.id);
                          setSelectedRowIds(next);
                        }}
                      />
                    </TableCell>
                    <TableCell className="sticky bg-white z-30 group-hover/row:bg-primary/[0.01] transition-colors border-r shadow-[5px_0_15px_rgba(0,0,0,0.01)] px-2 text-center w-[100px] min-w-[100px]" style={{ left: '60px' }}>
                      <Button variant="outline" size="sm" className="h-8 px-4 rounded-full border-slate-200 text-[10px] font-black uppercase bg-white group-hover/row:bg-primary group-hover/row:text-white group-hover/row:border-primary transition-all shadow-sm" onClick={(e) => { e.stopPropagation(); setSelectedApp(app); setIsDetailsOpen(true); }}>Manage</Button>
                    </TableCell>
                    {COLUMN_DEFS.filter(c => columnVisibility[c.key]).map((col) => (
                      <TableCell 
                        key={col.key} 
                        className={`${col.sticky ? "sticky z-20 bg-white group-hover/row:bg-primary/[0.02] transition-colors border-r shadow-[5px_0_15px_rgba(0,0,0,0.01)] px-10" : "px-10"} ${col.key === "first_name" ? "text-primary font-black" : "text-slate-600"}`}
                        style={col.sticky ? { left: `${col.offset}px`, minWidth: '160px', width: '160px' } : { minWidth: '220px' }}
                      >
                        {col.key === "status" ? (
                          getStatusBadge(app[col.key])
                        ) : col.key === "first_name" ? (
                          <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] uppercase">{app.first_name?.[0]}{app.last_name?.[0]}</div>
                             <span>{app.first_name || ""} {app.last_name || ""}</span>
                          </div>
                        ) : col.key === "resume_url" && app[col.key] ? (
                          <Button variant="secondary" size="sm" className="h-7 px-3 text-[9px] font-black uppercase bg-slate-100 hover:bg-slate-900 hover:text-white transition-all rounded-full" onClick={(e) => { e.stopPropagation(); window.open(app[col.key], '_blank'); }}>View Dossier</Button>
                        ) : col.key === "photo_url" && app[col.key] ? (
                          <Button variant="ghost" size="sm" className="h-7 px-3 text-[9px] font-black uppercase" onClick={(e) => { e.stopPropagation(); window.open(app[col.key], '_blank'); }}>View Intel</Button>
                        ) : col.key.includes('percentage') ? (
                          <div className="flex items-center gap-1.5"><div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, parseFloat(app[col.key] || 0))}%` }} /></div><span className="font-black text-slate-900">{String(app[col.key] || "0").replace('%','')}%</span></div>
                        ) : (
                          String(app[col.key] || "—")
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div id="top-scrollbar" className="overflow-x-auto h-2 mt-4 hover:h-4 transition-all opacity-0 hover:opacity-100 bg-slate-100 rounded-full" onScroll={(e: any) => {
        const table = document.querySelector(".overflow-x-auto.relative");
        if (table) table.scrollLeft = e.target.scrollLeft;
      }}>
        <div id="top-scrollbar-inner" style={{ width: "8000px", height: "1px" }} />
      </div>

      <Dialog open={isModifyTableOpen} onOpenChange={setIsModifyTableOpen}>
        <DialogContent className="max-w-[1000px] max-h-[85vh] p-0 overflow-hidden flex flex-col bg-slate-100/50 backdrop-blur-2xl rounded-[40px] border-white/20 shadow-2xl">
          <DialogHeader className="p-8 bg-white border-b shrink-0">
            <div className="flex justify-between items-start">
               <div className="space-y-1">
                 <DialogTitle className="text-3xl font-black tracking-tight">Grid Intelligence Schema</DialogTitle>
                 <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Toggle dimensions for real-time visualization</DialogDescription>
                 <div className="flex gap-4 mt-4">
                    <Button variant="outline" size="sm" className="h-9 px-4 font-black uppercase text-[10px] rounded-xl border-primary text-primary" onClick={() => {
                        const next = COLUMN_DEFS.reduce((acc: any, col) => { acc[col.key] = true; return acc; }, {});
                        setColumnVisibility(next);
                        localStorage.setItem("tpo_app_visibility", JSON.stringify(next));
                    }}>Show All Metrics</Button>
                    <Button variant="outline" size="sm" className="h-9 px-4 font-black uppercase text-[10px] rounded-xl border-rose-500 text-rose-500 hover:bg-rose-50" onClick={() => {
                        const next = COLUMN_DEFS.reduce((acc: any, col) => { acc[col.key] = false; return acc; }, {});
                        setColumnVisibility(next);
                        localStorage.setItem("tpo_app_visibility", JSON.stringify(next));
                    }}>Purge All Parameters</Button>
                 </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-primary">Target Density</p>
                  <p className="text-2xl font-black text-slate-900">{Object.values(columnVisibility).filter(v => v).length} / {COLUMN_DEFS.length}</p>
               </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="Placement" className="flex-1 flex flex-col min-h-0 bg-white">
             <TabsList className="px-8 py-3 bg-slate-50 border-b flex justify-start gap-2 h-auto shrink-0 overflow-x-auto no-scrollbar">
                {CATEGORIES.map(cat => (
                  <TabsTrigger 
                    key={cat.id} 
                    value={cat.id}
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary text-[10px] font-black uppercase px-5 py-2.5 rounded-xl transition-all border border-transparent data-[state=active]:border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                       <span className={cat.color + " p-1 rounded-md"}>{cat.icon}</span>
                       {cat.id}
                    </div>
                  </TabsTrigger>
                ))}
             </TabsList>

             <div className="flex-1 overflow-y-auto">
               {CATEGORIES.map(cat => (
                 <TabsContent key={cat.id} value={cat.id} className="m-0 focus-visible:outline-none">
                    <div className="p-8 space-y-8 pb-12">
                      <div className="flex items-center justify-between border-b pb-4">
                         <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{cat.id} Domain Parameters</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Configure domain-specific grid visualization</p>
                         </div>
                         <div className="flex gap-2">
                            <Button 
                              variant="outline" size="sm" 
                              className="h-8 text-[9px] font-black uppercase text-primary border-primary/20 hover:bg-primary/5 rounded-full px-4"
                              onClick={() => {
                                const catKeys = COLUMN_DEFS.filter(c => c.category === cat.id).map(c => c.key);
                                setColumnVisibility(prev => {
                                  const next = { ...prev };
                                  catKeys.forEach(k => next[k] = true);
                                  localStorage.setItem("tpo_app_visibility", JSON.stringify(next));
                                  return next;
                                });
                              }}
                            >Select All</Button>
                            <Button 
                              variant="outline" size="sm" 
                              className="h-8 text-[9px] font-black uppercase text-rose-500 border-rose-100 hover:bg-rose-50 rounded-full px-4"
                              onClick={() => {
                                const catKeys = COLUMN_DEFS.filter(c => c.category === cat.id).map(c => c.key);
                                setColumnVisibility(prev => {
                                  const next = { ...prev };
                                  catKeys.forEach(k => next[k] = false);
                                  localStorage.setItem("tpo_app_visibility", JSON.stringify(next));
                                  return next;
                                });
                              }}
                            >Expose All</Button>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {COLUMN_DEFS.filter(c => c.category === cat.id).map(col => (
                          <div key={col.key} className="flex items-center space-x-3 p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-primary/20 transition-all group shadow-sm hover:shadow-md">
                            <Checkbox 
                              id={`col-dlg-${col.key}`} 
                              className="h-5 w-5 rounded-[6px]"
                              checked={columnVisibility[col.key]} 
                              onCheckedChange={() => toggleColumn(col.key)}
                            />
                            <Label htmlFor={`col-dlg-${col.key}`} className="text-[11px] font-black text-slate-600 cursor-pointer flex-1 group-hover:text-primary transition-all leading-tight">{col.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                 </TabsContent>
               ))}
             </div>
          </Tabs>

          <DialogFooter className="p-8 bg-white border-t shrink-0">
            <Button className="w-full h-16 rounded-[20px] bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.01] active:scale-[0.99] text-base" onClick={() => setIsModifyTableOpen(false)}>
              Apply Grid Transformation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-slate-50">
          {selectedApp && (
            <div className="flex flex-col h-full">
               <div className="bg-white p-10 border-b relative">
                  <div className="absolute top-0 right-0 p-4">
                     <Badge className="bg-slate-100 text-slate-400 font-mono text-[10px] border-none">REF: {selectedApp.id?.split('-')[0]}</Badge>
                  </div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-4">
                      <div className="h-20 w-20 rounded-3xl bg-primary text-white flex items-center justify-center text-3xl font-black shadow-2xl shadow-primary/30 transform rotate-2">
                        {selectedApp.first_name?.[0]}{selectedApp.last_name?.[0]}
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-5xl font-black tracking-tighter text-slate-900">{selectedApp.first_name} {selectedApp.last_name}</h2>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-slate-50 text-slate-600 border-slate-200">REG NO: {selectedApp.reg_no}</Badge>
                          <Separator orientation="vertical" className="h-4" />
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none bg-slate-100 px-3 py-1.5 rounded-full">{selectedApp.department_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 text-right">
                       <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Status Protocol</div>
                       {getStatusBadge(selectedApp.status)}
                       <div className="mt-2 grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" className="h-9 font-bold text-[10px] tracking-tighter px-4" onClick={() => window.open(selectedApp.resume_url, '_blank')}>Dossier Output</Button>
                          <Button variant="outline" size="sm" className="h-9 font-bold text-[10px] tracking-tighter px-4" onClick={() => window.open(selectedApp.photo_url, '_blank')}>Intel Metadata</Button>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="flex-1 flex overflow-hidden">
                  <div className="w-80 bg-slate-50 border-r p-8 overflow-y-auto space-y-10">
                     <div className="space-y-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><TrendingUp className="h-3 w-3" /> Target Metrics</p>
                        <div className="space-y-4">
                           <div className="bg-white p-5 rounded-3xl border shadow-sm">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">AGGREGATE CGPA</p>
                              <p className="text-3xl font-black text-primary tracking-tighter">{selectedApp.overall_cgpa}</p>
                           </div>
                           <div className="bg-white p-5 rounded-3xl border shadow-sm">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">TARGET REMUNERATION</p>
                              <p className="text-xl font-black text-emerald-600 tracking-tighter">₹{selectedApp.ctc_amount?.toLocaleString()}</p>
                           </div>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Building2 className="h-3 w-3" /> Target Entity</p>
                        <div className="space-y-2">
                           <p className="text-sm font-black text-slate-900">{selectedApp.company_name}</p>
                           <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedApp.role_offered}</p>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex-1 bg-white overflow-y-auto">
                    <Tabs defaultValue="personal" className="w-full">
                      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-10 py-4 border-b">
                        <TabsList className="bg-slate-100/50 p-1 gap-2 rounded-2xl w-fit">
                          <TabsTrigger value="personal" className="px-8 font-black text-[10px] uppercase rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">Intelligence</TabsTrigger>
                          <TabsTrigger value="academic" className="px-8 font-black text-[10px] uppercase rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">Education</TabsTrigger>
                          <TabsTrigger value="professional" className="px-8 font-black text-[10px] uppercase rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">Skills</TabsTrigger>
                          <TabsTrigger value="family" className="px-8 font-black text-[10px] uppercase rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">Unit</TabsTrigger>
                          <TabsTrigger value="actions" className="px-8 font-black text-[10px] uppercase rounded-xl bg-slate-900 text-white data-[state=active]:bg-primary data-[state=active]:text-white">Overrides</TabsTrigger>
                        </TabsList>
                      </div>

                      <div className="p-10">
                        <TabsContent value="personal" className="m-0 space-y-12 animate-in fade-in slide-in-from-bottom-2">
                          <div className="grid grid-cols-2 gap-12">
                             <div className="space-y-8">
                                <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Biometric Metadata</h4>
                                <div className="space-y-6">
                                   <div className="flex items-center justify-between border-b pb-4"><span className="text-xs text-slate-400 font-bold uppercase">Designation ID</span><span className="font-black text-slate-900">{selectedApp.roll_number}</span></div>
                                   <div className="flex items-center justify-between border-b pb-4"><span className="text-xs text-slate-400 font-bold uppercase">Biological Sex</span><span className="font-black text-slate-900">{selectedApp.gender}</span></div>
                                   <div className="flex items-center justify-between border-b pb-4"><span className="text-xs text-slate-400 font-bold uppercase">Origin Timestamp</span><span className="font-black text-slate-900">{selectedApp.date_of_birth}</span></div>
                                   <div className="flex items-center justify-between border-b pb-4"><span className="text-xs text-slate-400 font-bold uppercase">Primary Identification (Aadhar)</span><span className="font-black text-slate-900 font-mono tracking-tighter">{selectedApp.aadhar_number}</span></div>
                                </div>
                             </div>
                             <div className="space-y-8">
                                <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Contact Protocols</h4>
                                <div className="space-y-4">
                                   <div className="p-5 bg-slate-100/50 rounded-2xl flex items-center gap-5 transition-all hover:bg-slate-100">
                                      <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary"><Mail className="h-5 w-5" /></div>
                                      <div className="flex flex-col"><span className="text-[9px] font-black text-slate-400 uppercase">Master Mail</span><span className="text-sm font-black text-slate-900">{selectedApp.email_address}</span></div>
                                   </div>
                                   <div className="p-5 bg-slate-100/50 rounded-2xl flex items-center gap-5 transition-all hover:bg-slate-100">
                                      <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500"><Phone className="h-5 w-5" /></div>
                                      <div className="flex flex-col"><span className="text-[9px] font-black text-slate-400 uppercase">Mobile Comm</span><span className="text-sm font-black text-slate-900">{selectedApp.mobile_number}</span></div>
                                   </div>
                                </div>
                             </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="academic" className="m-0 space-y-12 animate-in fade-in slide-in-from-bottom-2">
                           <div className="grid grid-cols-4 gap-4">
                              {[
                                { l: "Secondary Percentage", v: selectedApp.tenth_percentage, c: "primary" },
                                { l: "Hr. Secondary Percentage", v: selectedApp.twelfth_percentage, c: "emerald" },
                                { l: "Regulation ID", v: selectedApp.regulations, c: "amber" },
                                { l: "Arrear Incidents", v: selectedApp.current_backlogs, c: "rose" }
                              ].map((item, i) => (
                                <div key={i} className={`p-6 bg-white border rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all`}>
                                   <p className="text-[9px] font-black text-slate-400 uppercase mb-2 leading-tight">{item.l}</p>
                                   <p className={`text-3xl font-black tracking-tighter ${item.c === 'rose' && parseFloat(item.v) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{item.v || "0"}{item.l.includes('Percentage') ? '%' : ''}</p>
                                </div>
                              ))}
                           </div>
                           <div className="space-y-6">
                              <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Semester Performance Matrix</h4>
                              <div className="grid grid-cols-4 gap-6">
                                {[1,2,3,4,5,6,7,8].map(i => (
                                  <div key={i} className="flex flex-col items-center bg-slate-50 p-5 rounded-3xl border border-transparent hover:border-slate-200 transition-all group">
                                     <div className="text-[10px] font-black text-slate-400 uppercase mb-3">SEM {i}</div>
                                     <div className="text-2xl font-black text-slate-900 group-hover:scale-110 transition-transform">{selectedApp[`sem_${i}_cgpa`] || "0.00"}</div>
                                  </div>
                                ))}
                              </div>
                           </div>
                        </TabsContent>

                        <TabsContent value="professional" className="m-0 animate-in fade-in slide-in-from-bottom-2">
                           <div className="grid grid-cols-2 gap-12">
                              <div className="space-y-8">
                                 <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Technology Stack</h4>
                                 <div className="space-y-8">
                                    <div className="space-y-4">
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Programming Dialects</span>
                                       <div className="flex flex-wrap gap-2">
                                          {selectedApp.programming_languages?.split(',').map((p: string) => (
                                            <Badge key={p} variant="secondary" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-primary transition-colors">{p.trim()}</Badge>
                                          ))}
                                       </div>
                                    </div>
                                    <div className="space-y-4">
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">IT Capabilities</span>
                                       <div className="p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-300 text-xs font-bold leading-relaxed">{selectedApp.it_skills || "No records detected."}</div>
                                    </div>
                                 </div>
                              </div>
                              <div className="space-y-8">
                                 <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">External Profiles</h4>
                                 <div className="space-y-3">
                                    {[
                                      { l: "LinkedIn Corporate Profile", v: selectedApp.linkedin_url, i: <User className="h-4 w-4" /> },
                                      { l: "GitHub Code Repository", v: selectedApp.github_url, i: <Activity className="h-4 w-4" /> },
                                      { l: "LeetCode Competitive Intel", v: selectedApp.leetcode_url, i: <TrendingUp className="h-4 w-4" /> }
                                    ].map((link, i) => (
                                      link.v && (
                                        <Button key={i} variant="outline" className="w-full h-16 rounded-2xl justify-start px-6 gap-5 bg-slate-50 border-slate-200 hover:bg-white hover:border-primary group transition-all" onClick={() => window.open(link.v, '_blank')}>
                                          <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-all">{link.i}</div>
                                          <div className="flex flex-col items-start translate-x-2"><span className="text-[9px] font-black text-slate-400 uppercase group-hover:text-primary transition-all">ACCES PROTOCOL: {link.l.split(' ')[0]}</span><span className="text-xs font-black text-slate-900">{link.l}</span></div>
                                          <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
                                        </Button>
                                      )
                                    ))}
                                 </div>
                              </div>
                           </div>
                        </TabsContent>

                        <TabsContent value="actions" className="m-0 space-y-12 animate-in fade-in slide-in-from-bottom-2">
                           <div className="flex flex-col items-center justify-center py-10 space-y-12 bg-slate-900 text-white rounded-3xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-10 opacity-5">
                                 <Building2 className="h-96 w-96" />
                              </div>
                              <div className="text-center space-y-2 z-10">
                                 <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/80">Command Overrides</p>
                                 <h4 className="text-3xl font-black text-white px-20">Terminate or Advance Candidacy Protocals</h4>
                              </div>
                              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl px-10 z-10 font-black">
                                <Button className="h-20 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 text-sm font-black uppercase gap-3 rounded-2xl transition-all active:scale-95" onClick={() => updateStatus(selectedApp.application_id || selectedApp.id, "shortlisted")} disabled={!!isProcessing}><Activity className="h-6 w-6" /> Shortlist Entity</Button>
                                <Button className="h-20 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20 text-sm font-black uppercase gap-3 rounded-2xl transition-all active:scale-95" onClick={() => setIsInterviewDialogOpen(true)} disabled={!!isProcessing}><Calendar className="h-6 w-6" /> Deploy Interview</Button>
                                <Button className="h-20 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 text-sm font-black uppercase gap-3 rounded-2xl transition-all active:scale-95" onClick={() => updateStatus(selectedApp.application_id || selectedApp.id, "selected")} disabled={!!isProcessing}><Award className="h-6 w-6" /> Execute Placement</Button>
                                <Button variant="destructive" className="h-20 shadow-lg shadow-rose-500/20 text-sm font-black uppercase gap-3 rounded-2xl transition-all active:scale-95" onClick={() => updateStatus(selectedApp.application_id || selectedApp.id, "rejected_by_tpo")} disabled={!!isProcessing}><XCircle className="h-6 w-6" /> Final Neutralization</Button>
                              </div>
                           </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isInterviewDialogOpen} onOpenChange={setIsInterviewDialogOpen}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-3xl p-8">
          <DialogHeader className="mb-6 space-y-2 text-center">
            <div className="mx-auto h-16 w-16 bg-purple-100 text-purple-600 rounded-3xl flex items-center justify-center mb-2"><Calendar className="h-8 w-8" /></div>
            <DialogTitle className="text-3xl font-black tracking-tight">Set Interview Schedule</DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">Define coordinates for the candidate assessment phase</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Protocol Timestamp</Label>
              <Input type="datetime-local" className="h-14 font-black text-sm bg-slate-50 border-slate-200 rounded-2xl focus:ring-purple-500" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex-col gap-3 sm:flex-col mt-6">
            <Button className="w-full bg-purple-600 h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-purple-500/20" onClick={() => updateStatus(selectedApp.id, "interview_scheduled", interviewDate)}>Finalize Schedule Deploy</Button>
            <Button variant="ghost" className="w-full h-14 rounded-2xl font-black uppercase text-slate-400 hover:text-slate-900" onClick={() => setIsInterviewDialogOpen(false)}>Abort Protocol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
