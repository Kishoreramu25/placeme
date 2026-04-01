import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/shared/LoadingState";
import { CSVUpload } from "@/components/shared/CSVUpload";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarDays,
  Building2,
  MapPin,
  Briefcase,
  Loader2,
  Sparkles,
  Linkedin,
  Globe,
  ExternalLink,
  Clock,
  DollarSign,
  GraduationCap,
  ClipboardList,
  Target,
  History,
  Award,
  CheckSquare,
  CheckCircle2,
  Info,
  Layers,
  Users
} from "lucide-react";

import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { driveSchema, DriveFormData } from "@/lib/validations";
import { DriveAttendanceDialog } from "@/components/dashboard/DriveAttendanceDialog";
import { DriveStudentsDialog } from "@/components/dashboard/DriveStudentsDialog";

interface PlacementDrive {
  id: string;
  company_id: string;
  academic_year_id: string;
  drive_type: "placement" | "internship" | "both";
  role_offered: string | null;
  visit_date: string;
  visit_time: string | null;
  visit_mode: "on_campus" | "off_campus" | "virtual";
  stipend_amount: number | null;
  ctc_amount: number | null;
  remarks: string | null;
  created_at: string;
  companies: { name: string } | null;
  academic_years: { year_label: string } | null;
  job_description: string | null;
  bond_details: string | null;
  work_location: string | null;
  min_cgpa: number;
  max_backlogs: number;
  max_history_arrears: number;
  eligible_batches: string | null;
  min_10th_mark: number;
  min_12th_mark: number;
  application_deadline: string | null;
  company_website: string | null;
  company_linkedin: string | null;
  other_links: string | null;
  round_details?: any;
  status?: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  year_label: string;
  is_current: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function Drives() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState<PlacementDrive | null>(null);
  const [attendanceDrive, setAttendanceDrive] = useState<PlacementDrive | null>(null);
  const [studentAnalyzerDrive, setStudentAnalyzerDrive] = useState<PlacementDrive | null>(null);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  const form = useForm<DriveFormData>({
    resolver: zodResolver(driveSchema),
    defaultValues: {
      company_name: "",
      drive_type: "placement",
      role_offered: "",
      visit_date: "",
      visit_time: "",
      visit_mode: "on_campus",
      stipend_amount: null,
      ctc_amount: null,
      remarks: "",
      eligible_departments: [],
      job_description: "",
      bond_details: "",
      work_location: "",
      min_cgpa: 0,
      max_backlogs: 0,
      max_history_arrears: 0,
      eligible_batches: "4th Year",
      min_10th_mark: 0,
      min_12th_mark: 0,
      application_deadline: "",
      company_website: "",
      company_linkedin: "",
      other_links: "",
      round_details: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "round_details",
  });

  const { data: drives, isLoading } = useQuery({
    queryKey: ["drives", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("placement_drives")
        .select(`
          *,
          companies (name),
          academic_years (year_label)
        `)
        .order("visit_date", { ascending: false });

      if (searchQuery) {
        // Since we need to filter by company name which is a related table, 
        // we'll fetch and then filter if searching
        const { data, error } = await query;
        if (error) throw error;
        return data.filter(d => 
          d.companies?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.role_offered?.toLowerCase().includes(searchQuery.toLowerCase())
        ) as unknown as PlacementDrive[];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PlacementDrive[];
    },
  });

  // Fetch companies for dropdown
  const { data: companies } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").order("name");
      return data as Company[];
    },
  });

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: ["academic-years"],
    queryFn: async () => {
      const { data } = await supabase.from("academic_years").select("*").order("year_label", { ascending: false });
      return data as AcademicYear[];
    },
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, code").order("name");
      return data as Department[];
    },
  });

  // Fetch eligible departments for a drive
  const fetchEligibleDepts = async (driveId: string) => {
    const { data } = await supabase
      .from("drive_eligible_departments")
      .select("department_id")
      .eq("drive_id", driveId);
    return data?.map((d) => d.department_id) || [];
  };

  const saveMutation = useMutation({
    mutationFn: async ({ data, isDraft }: { data: DriveFormData; isDraft: boolean }) => {
      const { company_name, eligible_departments, ...rest } = data;
      const toastId = toast.loading(isDraft ? "Saving draft..." : "Scheduling drive...");

      try {
        // 1. Resolve Company
        let company_id;
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id")
          .eq("name", company_name)
          .maybeSingle();

        if (existingCompany) {
          company_id = existingCompany.id;
        } else {
          try {
            const { data: newCompany, error: compError } = await supabase
              .from("companies")
              .insert([{ name: company_name }])
              .select()
              .single();
            if (compError) throw compError;
            company_id = newCompany.id;
          } catch (e) {
            console.error("Company insert failed:", e);
            throw new Error(`The company "${company_name}" doesn't exist. Please ask Admin to add it or check for spelling.`);
          }
        }

        // 2. Resolve Academic Year (Always use Current to avoid RLS Insert issues)
        let academic_year_id;
        const { data: currentYear } = await supabase
          .from("academic_years")
          .select("id")
          .eq("is_current", true)
          .maybeSingle();

        if (currentYear) {
          academic_year_id = currentYear.id;
        } else {
          // Fallback to the latest year if no "current" is set
          const { data: latestYear } = await supabase
            .from("academic_years")
            .select("id")
            .order("year_label", { ascending: false })
            .limit(1)
            .maybeSingle();
          academic_year_id = latestYear?.id;
        }

        if (!academic_year_id) {
          // Final fallback - get the single most recent year by label
          const { data: fallbackYear } = await supabase
            .from("academic_years")
            .select("id")
            .order("year_label", { ascending: false })
            .limit(1)
            .single();
          academic_year_id = fallbackYear?.id;
        }

        if (!academic_year_id) throw new Error("Could not determine academic year. Please contact TPO Admin to set a Current Academic Year.");

        const driveData = {
          ...rest,
          // Normalize to Rupees if input was LPA, otherwise keep as is
          ctc_amount: rest.ctc_amount && rest.ctc_amount < 100 ? rest.ctc_amount * 100000 : rest.ctc_amount,
          company_id,
          academic_year_id,
          status: isDraft ? 'draft' : 'scheduled'
        };
        
        let driveId;
        if (editingDrive) {
          const { error } = await supabase
            .from("placement_drives")
            .update({
              ...driveData,
              updated_at: new Date().toISOString()
            } as any)
            .eq("id", editingDrive.id);
          if (error) throw error;
          driveId = editingDrive.id;
        } else {
          const { data: newDrive, error } = await supabase
            .from("placement_drives")
            .insert([{ 
              ...driveData, 
              created_by: user?.id 
            } as any])
            .select()
            .single();
          if (error) throw error;
          driveId = newDrive.id;
        }

        // Sync departments
        await supabase.from("drive_eligible_departments").delete().eq("drive_id", driveId);
        if (eligible_departments.length > 0) {
          const deptRecords = eligible_departments.map(deptId => ({
            drive_id: driveId,
            department_id: deptId
          }));
          
          const { error: deptError } = await supabase.from("drive_eligible_departments").insert(deptRecords);
          if (deptError) throw deptError;
        }
        
        // Initialize eligible students and send notifications
        const { error: rpcError } = await (supabase.rpc as any)('initialize_drive_eligible_students', { 
          p_drive_id: driveId 
        });
        if (rpcError) console.error("RPC Init Error:", rpcError);

        toast.dismiss(toastId);
        return true;
      } catch (err) {
        toast.dismiss(toastId);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drives"] });
      setIsDialogOpen(false);
      setEditingDrive(null);
      setSelectedDepts([]);
      form.reset();
      toast.success(editingDrive ? "Changes saved successfully! 🎉" : "New Drive Scheduled! 🚀");
    },
    onError: (error: any) => {
      console.error("Critical Save Error:", error);
      toast.error(error.message || "An error occurred while saving.");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("placement_drives")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drives"] });
      toast.success("Drive deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete drive");
    },
  });

  const handleEdit = async (drive: PlacementDrive) => {
    setEditingDrive(drive);
    const eligibleDepts = await fetchEligibleDepts(drive.id);
    setSelectedDepts(eligibleDepts);
    form.reset({
      company_name: drive.companies?.name || "",
      drive_type: drive.drive_type,
      role_offered: drive.role_offered || "",
      visit_date: drive.visit_date,
      visit_time: drive.visit_time || "",
      visit_mode: drive.visit_mode,
      stipend_amount: drive.stipend_amount,
      ctc_amount: drive.ctc_amount,
      remarks: drive.remarks || "",
      eligible_departments: eligibleDepts,
      job_description: drive.job_description || "",
      bond_details: drive.bond_details || "",
      work_location: drive.work_location || "",
      min_cgpa: drive.min_cgpa || 0,
      max_backlogs: drive.max_backlogs || 0,
      max_history_arrears: drive.max_history_arrears || 0,
      eligible_batches: drive.eligible_batches || "2021-2025",
      min_10th_mark: drive.min_10th_mark || 0,
      min_12th_mark: drive.min_12th_mark || 0,
      application_deadline: drive.application_deadline ? new Date(drive.application_deadline).toISOString().split('T')[0] : "",
      company_website: drive.company_website || "",
      company_linkedin: drive.company_linkedin || "",
      other_links: drive.other_links || "",
      round_details: Array.isArray(drive.round_details) ? drive.round_details : [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this drive? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingDrive(null);
    setSelectedDepts([]);
    form.reset();
  };

  const handleDeptToggle = (deptId: string) => {
    const newDepts = selectedDepts.includes(deptId)
      ? selectedDepts.filter((d) => d !== deptId)
      : [...selectedDepts, deptId];
    setSelectedDepts(newDepts);
    form.setValue("eligible_departments", newDepts);
  };

  const getDriveTypeBadge = (type: string) => {
    switch (type) {
      case "placement":
        return <Badge className="bg-success/20 text-success border-0">Placement</Badge>;
      case "internship":
        return <Badge className="bg-primary/20 text-primary border-0">Internship</Badge>;
      case "both":
        return <Badge className="bg-warning/20 text-warning border-0">Both</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getVisitModeBadge = (mode: string) => {
    switch (mode) {
      case "on_campus":
        return <Badge variant="outline">On Campus</Badge>;
      case "off_campus":
        return <Badge variant="outline">Off Campus</Badge>;
      case "virtual":
        return <Badge variant="outline">Virtual</Badge>;
      default:
        return <Badge variant="outline">{mode}</Badge>;
    }
  };

  const fillDemoData = () => {
    const demoDepts = departments?.slice(0, 3).map(d => d.id) || [];
    setSelectedDepts(demoDepts);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const visitDate = tomorrow.toISOString().split('T')[0];
    
    const deadline = new Date().toISOString().split('T')[0];

    form.reset({
      company_name: "Google India",
      drive_type: "placement",
      role_offered: "Software Development Engineer",
      visit_date: visitDate,
      visit_time: "09:30 AM",
      visit_mode: "on_campus",
      stipend_amount: 50000,
      ctc_amount: 24, // Store as LPA, mutation will normalize
      remarks: "Testing drive - please ignore",
      eligible_departments: demoDepts,
      job_description: "We are looking for passionate engineers to join our cloud team.",
      bond_details: "No Bond",
      work_location: "Bangalore / Remote",
      min_cgpa: 8.0,
      max_backlogs: 0,
      max_history_arrears: 0,
      eligible_batches: "4th Year",
      min_10th_mark: 85,
      min_12th_mark: 85,
      application_deadline: deadline,
      company_website: "https://www.google.com",
      company_linkedin: "https://www.linkedin.com/company/google",
      other_links: "https://careers.google.com",
    });
    toast.success("Magic Fill complete! 📝✨");
  };

  const forceSaveTest = async () => {
    const toastId = toast.loading("Force inserting drive...");
    try {
      // Get the first academic year and first company
      const { data: years } = await supabase.from("academic_years").select("id").limit(1);
      const { data: comps } = await supabase.from("companies").select("id").limit(1);
      
      if (!years?.[0] || !comps?.[0]) {
        throw new Error("No Year/Company found. Please run the SQL fix first!");
      }

      const { error } = await supabase.from("placement_drives").insert([{
        company_id: comps[0].id,
        academic_year_id: years[0].id,
        visit_date: new Date().toISOString().split('T')[0],
        drive_type: "placement",
        role_offered: "DEBUG TEST ROLE",
        visit_mode: "on_campus",
        created_by: user?.id
      }]);

      if (error) throw error;
      
      toast.dismiss(toastId);
      toast.success("FORCE SAVE SUCCESS! 🎉");
      queryClient.invalidateQueries({ queryKey: ["drives"] });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.dismiss(toastId);
      window.alert("FORCE FAILED: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Placement Drives</h1>
            <p className="text-muted-foreground">Manage placement and internship drives</p>
          </div>
          <div className="flex gap-3">
            <CSVUpload
              title="Upload Drives"
              description="Upload a CSV file to add multiple placement drives at once"
              templateHeaders={["Company Name", "Visit Date", "Drive Type", "Visit Mode", "Role Offered", "CTC", "Stipend", "Remarks"]}
              templateFileName="placement_drives"
              exampleData={[
                { company_name: "Tech Corp", visit_date: "2025-02-15", drive_type: "placement", visit_mode: "on_campus", role_offered: "Software Engineer", ctc: "800000", stipend: "", remarks: "Full stack role" },
                { company_name: "Data Systems", visit_date: "2025-02-20", drive_type: "internship", visit_mode: "virtual", role_offered: "Data Analyst Intern", ctc: "", stipend: "25000", remarks: "6 month internship" },
              ]}
              onUpload={async (data) => {
                // Get current academic year
                const { data: currentYear } = await supabase
                  .from("academic_years")
                  .select("id")
                  .eq("is_current", true)
                  .single();

                if (!currentYear) throw new Error("No current academic year found");

                // Get all companies to match by name
                const { data: allCompanies } = await supabase.from("companies").select("id, name");
                const companyMap = new Map((allCompanies || []).map((c) => [c.name.toLowerCase(), c.id]));

                const records = [];
                for (const row of data) {
                  const companyName = row.company_name || row.company || "";
                  const companyId = companyMap.get(companyName.toLowerCase());

                  if (!companyId || !row.visit_date) continue;

                  records.push({
                    company_id: companyId,
                    academic_year_id: currentYear.id,
                    visit_date: row.visit_date,
                    drive_type: (row.drive_type || "placement") as "placement" | "internship" | "both",
                    visit_mode: (row.visit_mode || "on_campus") as "on_campus" | "off_campus" | "virtual",
                    role_offered: row.role_offered || null,
                    ctc_amount: row.ctc ? parseFloat(row.ctc) : null,
                    stipend_amount: row.stipend ? parseFloat(row.stipend) : null,
                    remarks: row.remarks || null,
                    created_by: user?.id || null,
                  });
                }

                if (records.length === 0) throw new Error("No valid records found. Make sure company names match existing companies.");

                const { error } = await supabase.from("placement_drives").insert(records);
                if (error) throw error;

                queryClient.invalidateQueries({ queryKey: ["drives"] });
                toast.success(`${records.length} drives added successfully`);
              }}
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingDrive(null); setSelectedDepts([]); form.reset(); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Drive
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border-none shadow-2xl">
                <div className="bg-primary/10 px-6 py-4 border-b border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
                      <Sparkles className="h-6 w-6" />
                      {editingDrive ? "Edit Drive Details" : "Schedule New Placement Drive"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium">
                      Configure comprehensive drive details for better visibility and student targeting.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <form 
                  onSubmit={form.handleSubmit((data) => saveMutation.mutate({ data, isDraft: false }))} 
                  className="p-6 space-y-6"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      form.handleSubmit((data) => saveMutation.mutate({ data, isDraft: false }))();
                    }
                  }}
                >
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-14 bg-slate-100 p-1.5 rounded-2xl mb-8 shadow-inner border border-slate-200">
                      <TabsTrigger value="basic" className="rounded-xl gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-xs uppercase tracking-tight">
                        <Building2 className="h-4 w-4" />
                        Basic Info
                      </TabsTrigger>
                      <TabsTrigger value="job" className="rounded-xl gap-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-xs uppercase tracking-tight">
                        <Briefcase className="h-4 w-4" />
                        Job Details
                      </TabsTrigger>
                      <TabsTrigger value="eligibility" className="rounded-xl gap-2.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-xs uppercase tracking-tight">
                        <Target className="h-4 w-4" />
                        Eligibility
                      </TabsTrigger>
                      <TabsTrigger value="rounds" className="rounded-xl gap-2.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-xs uppercase tracking-tight">
                        <ClipboardList className="h-4 w-4" />
                        Rounds
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                          <Building2 className="h-32 w-32 rotate-12" />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-1.5 bg-primary rounded-full" />
                          <div>
                             <h3 className="font-black text-primary uppercase text-sm tracking-widest">Company Identification</h3>
                             <p className="text-[10px] text-muted-foreground font-bold">Primary company and position details</p>
                          </div>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 relative z-10">
                          {/* Company Selection */}
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Company Name *</Label>
                            <Input {...form.register("company_name")} placeholder="e.g., Google India, Microsoft" className="h-11 bg-white border-primary/20 focus-visible:ring-primary shadow-sm font-semibold" />
                          </div>

                          {/* Role Offered */}
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Job Role Offered *</Label>
                            <Input {...form.register("role_offered")} placeholder="e.g., Software Development Engineer" className="h-11 bg-white border-primary/20 font-semibold" />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-8 sm:grid-cols-2">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
                           <h3 className="font-black flex items-center gap-2 text-slate-800 uppercase text-xs tracking-wider">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            Drive Logistics
                          </h3>
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-slate-400">Drive Classification</Label>
                              <Controller
                                name="drive_type"
                                control={form.control}
                                render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-11 bg-white border-slate-200 font-bold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="placement">Placement Drive</SelectItem>
                                      <SelectItem value="internship">Internship Drive</SelectItem>
                                      <SelectItem value="both">Both (Placement + Intern)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-slate-400">Visit Mode</Label>
                              <Controller
                                name="visit_mode"
                                control={form.control}
                                render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-11 bg-white border-slate-200 font-bold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="on_campus">Physical (On Campus)</SelectItem>
                                      <SelectItem value="off_campus">External (Off Campus)</SelectItem>
                                      <SelectItem value="virtual">Remote (Virtual)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
                           <h3 className="font-black flex items-center gap-2 text-slate-800 uppercase text-xs tracking-wider">
                            <Clock className="h-4 w-4 text-primary" />
                            Timeline & Deadlines
                          </h3>
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                                 <span>Scheduled Drive Date *</span>
                                 <Badge variant="outline" className="text-[9px] uppercase font-black bg-white">Primary</Badge>
                              </Label>
                              <Input type="date" {...form.register("visit_date")} className="h-11 bg-white border-slate-200 font-bold" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                                <span>Application Deadline</span>
                                <Badge variant="secondary" className="text-[9px] uppercase font-black">Flexible</Badge>
                              </Label>
                              <Input type="date" {...form.register("application_deadline")} className="h-11 bg-white border-slate-200 font-bold text-primary" placeholder="Leave empty if no deadline" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="job" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid gap-8 sm:grid-cols-2">
                        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-6 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                            <DollarSign className="h-24 w-24" />
                          </div>
                          <h3 className="font-black text-emerald-700 flex items-center gap-2 uppercase text-sm tracking-widest">
                            <DollarSign className="h-5 w-5" />
                            Compensation Package
                          </h3>
                          <div className="grid gap-4 relative z-10">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Placement CTC (₹ LPA)</Label>
                              <Input type="number" step="0.1" {...form.register("ctc_amount", { valueAsNumber: true })} placeholder="12.5" className="h-11 bg-white border-emerald-200 focus-visible:ring-emerald-500 font-bold text-emerald-900" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Monthly Stipend (₹)</Label>
                              <Input type="number" {...form.register("stipend_amount", { valueAsNumber: true })} placeholder="25000" className="h-11 bg-white border-emerald-200 focus-visible:ring-emerald-500 font-bold" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100 space-y-6 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                            <MapPin className="h-24 w-24" />
                          </div>
                          <h3 className="font-black text-sky-700 flex items-center gap-2 uppercase text-sm tracking-widest">
                            <MapPin className="h-5 w-5" />
                            Location & Policy
                          </h3>
                          <div className="grid gap-4 relative z-10">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-sky-800 tracking-wider">Work Location</Label>
                              <Input {...form.register("work_location")} placeholder="e.g., Bangalore, Hyderabad, Remote" className="h-11 bg-white border-sky-200 focus-visible:ring-sky-500 font-bold" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-sky-800 tracking-wider">Service Agreement / Bond</Label>
                              <Input {...form.register("bond_details")} placeholder="e.g., 2 Years / No Bond" className="h-11 bg-white border-sky-200 focus-visible:ring-sky-500 font-bold" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
                            <ClipboardList className="h-5 w-5 text-primary" />
                            Detailed Job Description
                          </Label>
                          <Textarea {...form.register("job_description")} className="min-h-[140px] bg-white border-slate-200 shadow-sm focus-visible:ring-primary font-medium" placeholder="Roles, responsibilities, and specific software requirements..." />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
                            <Info className="h-5 w-5 text-amber-500" />
                            Officer Directives
                          </Label>
                          <Textarea {...form.register("remarks")} placeholder="Notes for candidates: Dress code, Laptop requirements, etc." className="h-24 bg-white border-slate-200 focus-visible:ring-amber-500" />
                        </div>
                      </div>

                      <div className="bg-slate-100/50 p-6 rounded-3xl border-2 border-dashed border-slate-200 space-y-6">
                        <h3 className="font-black text-slate-500 flex items-center gap-2 uppercase text-[10px] tracking-[0.2em] px-2">
                          <Globe className="h-4 w-4" />
                          Digital Presence
                        </h3>
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400">Official Website</Label>
                            <Input {...form.register("company_website")} placeholder="https://google.com" className="h-11 bg-white" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400">LinkedIn Profile</Label>
                            <Input {...form.register("company_linkedin")} placeholder="https://linkedin.com/company/google" className="h-11 bg-white" />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="eligibility" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid gap-6 sm:grid-cols-3">
                         <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-200 space-y-3 relative overflow-hidden group shadow-sm transition-all hover:shadow-orange-100">
                          <div className="absolute top-0 right-0 p-4 opacity-[0.1] group-hover:rotate-12 transition-transform">
                             <GraduationCap className="h-10 w-10 text-orange-600" />
                          </div>
                          <Label className="text-[10px] font-black text-orange-800 flex items-center gap-2 uppercase tracking-widest">
                            Min CGPA
                          </Label>
                          <Input type="number" step="0.01" {...form.register("min_cgpa", { valueAsNumber: true })} className="h-11 bg-white border-orange-200 focus-visible:ring-orange-500 font-black text-xl text-orange-900" />
                        </div>
                        <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-200 space-y-3 relative overflow-hidden group shadow-sm transition-all hover:shadow-orange-100">
                          <div className="absolute top-0 right-0 p-4 opacity-[0.1] group-hover:rotate-12 transition-transform">
                             <History className="h-10 w-10 text-orange-600" />
                          </div>
                          <Label className="text-[10px] font-black text-orange-800 flex items-center gap-2 uppercase tracking-widest">
                            Max Backlogs
                          </Label>
                          <Input type="number" {...form.register("max_backlogs", { valueAsNumber: true })} className="h-11 bg-white border-orange-200 focus-visible:ring-orange-500 font-black text-xl text-orange-900" />
                        </div>
                        <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-200 space-y-3 relative overflow-hidden group shadow-sm transition-all hover:shadow-orange-100">
                          <div className="absolute top-0 right-0 p-4 opacity-[0.1] group-hover:rotate-12 transition-transform">
                             <Award className="h-10 w-10 text-orange-600" />
                          </div>
                          <Label className="text-[10px] font-black text-orange-800 flex items-center gap-2 uppercase tracking-widest">
                            Max Arrears
                          </Label>
                          <Input type="number" {...form.register("max_history_arrears", { valueAsNumber: true })} className="h-11 bg-white border-orange-200 focus-visible:ring-orange-500 font-black text-xl text-orange-900" />
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6 shadow-inner">
                        <div className="flex items-center gap-2 px-2">
                           <Layers className="h-4 w-4 text-slate-400" />
                           <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em]">Academic Benchmarks</h3>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400 px-1">Min 10th %</Label>
                            <Input type="number" step="0.1" {...form.register("min_10th_mark", { valueAsNumber: true })} className="h-11 bg-white border-slate-200 font-bold" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400 px-1">Min 12th / Diploma %</Label>
                            <Input type="number" step="0.1" {...form.register("min_12th_mark", { valueAsNumber: true })} className="h-11 bg-white border-slate-200 font-bold" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400 px-1">Target Eligibility Year</Label>
                            <Controller
                              name="eligible_batches"
                              control={form.control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || "4th Year"}>
                                  <SelectTrigger className="h-11 bg-white border-slate-200 font-bold">
                                    <SelectValue placeholder="Select Target Year" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="All Students">All Students</SelectItem>
                                    <SelectItem value="2nd Year">2nd Year</SelectItem>
                                    <SelectItem value="3rd Year">3rd Year</SelectItem>
                                    <SelectItem value="4th Year">4th Year</SelectItem>
                                    <SelectItem value="5th Year">5th Year</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <Label className="font-bold flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-primary" />
                            Target Departments
                          </Label>
                          <Badge variant="outline" className="text-muted-foreground font-normal">{selectedDepts.length} Selected</Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {departments?.map((dept) => (
                            <label
                              key={dept.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all ${selectedDepts.includes(dept.id) ? 'bg-primary/10 border-primary/50 text-primary shadow-sm hover:bg-primary/20' : 'bg-white hover:bg-muted/50'}`}
                            >
                              <Checkbox
                                checked={selectedDepts.includes(dept.id)}
                                onCheckedChange={() => handleDeptToggle(dept.id)}
                                className="h-3 w-3 data-[state=checked]:bg-primary"
                              />
                              <span className="truncate">{dept.code}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="rounds" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-[400px]">
                      <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="font-bold text-purple-900 flex items-center gap-2">
                              <ClipboardList className="h-5 w-5" />
                              Recruitment Process Rounds
                            </h3>
                            <p className="text-xs text-purple-700/70 font-medium">Define the sequence of selection stages for this drive.</p>
                          </div>
                          <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-purple-200">
                             <Label className="text-[10px] font-black uppercase text-purple-900">No. of Rounds</Label>
                             <Input 
                                type="number" 
                                className="w-16 h-8 text-center font-bold text-purple-900 border-purple-200"
                                placeholder="0"
                                min="0"
                                onChange={(e) => {
                                  const count = parseInt(e.target.value) || 0;
                                  const currentCount = fields.length;
                                  if (count > currentCount) {
                                    for (let i = currentCount; i < count; i++) {
                                      append({ name: `Round ${i + 1}`, description: "" });
                                    }
                                  } else if (count < currentCount) {
                                    for (let i = currentCount - 1; i >= count; i--) {
                                      remove(i);
                                    }
                                  }
                                }}
                                value={fields.length}
                             />
                          </div>
                        </div>

                        <div className="space-y-4">
                          {fields.map((field, index) => (
                            <div key={field.id} className="group relative bg-white p-4 rounded-xl border border-purple-100 shadow-sm transition-all hover:shadow-md hover:border-purple-300">
                              <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-1.5 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-all" />
                              <div className="grid gap-4 sm:grid-cols-12 items-start">
                                <div className="sm:col-span-1">
                                  <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                                    {index + 1}
                                  </div>
                                </div>
                                <div className="sm:col-span-11 space-y-4">
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Round Title</Label>
                                      <Input 
                                        {...form.register(`round_details.${index}.name`)} 
                                        placeholder="e.g. Aptitude Test, Technical Interview"
                                        className="h-10 font-bold text-slate-900 border-slate-200 focus-visible:ring-purple-500"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Brief Description / Requirements</Label>
                                      <Input 
                                        {...form.register(`round_details.${index}.description`)} 
                                        placeholder="e.g. Duration: 60 mins, Mode: Virtual"
                                        className="h-10 text-slate-700 border-slate-200 focus-visible:ring-purple-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {fields.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-purple-200 rounded-2xl bg-purple-50/30">
                              <Layers className="h-10 w-10 text-purple-200 mb-3" />
                              <p className="text-sm font-bold text-purple-300 italic tracking-tight">Enter Number of Rounds above to start configuring the process.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-between items-center px-6 py-4 border-t bg-muted/20">
                    <div className="flex gap-2">
                       <Button type="button" variant="outline" onClick={fillDemoData} className="text-primary hover:text-primary hover:bg-primary/10 border-primary/20 rounded-lg">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Magic Fill
                      </Button>
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="ghost" onClick={handleDialogClose}>
                        Discard
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        disabled={saveMutation.isPending} 
                        onClick={() => form.handleSubmit((data) => saveMutation.mutate({ data, isDraft: true }))()}
                        className="rounded-lg border-primary/20 hover:bg-primary/5 text-primary"
                      >
                         {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
                         Save as Draft
                      </Button>
                      <Button type="submit" disabled={saveMutation.isPending} className="min-w-[150px] rounded-lg shadow-lg hover:shadow-xl transition-all shadow-primary/20">
                        {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        {editingDrive ? "Update Schedule" : "Confirm Schedule"}
                      </Button>
                    </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search drives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Drives Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Placement Drives</CardTitle>
            <CardDescription>{drives?.length || 0} drives scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : drives && drives.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Visit</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drives.map((drive) => (
                      <TableRow key={drive.id} className="hover:bg-muted/30 transition-colors border-b last:border-0 group h-[80px]">
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm group-hover:scale-110 transition-transform">
                              <Building2 className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-lg leading-none">{drive.companies?.name || "Unknown"}</p>
                                {drive.company_website && (
                                  <a href={drive.company_website} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors">
                                    <Globe className="h-4 w-4" />
                                  </a>
                                )}
                                {drive.company_linkedin && (
                                  <a href={drive.company_linkedin} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-blue-600 transition-colors">
                                    <Linkedin className="h-4 w-4" />
                                  </a>
                                )}
                                {drive.other_links && (
                                  <a href={drive.other_links} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-orange-500 transition-colors">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold h-4">
                                  {drive.academic_years?.year_label}
                                </Badge>
                                <span>Batch: {drive.eligible_batches || "2021-2025"}</span>
                                {(!drive.application_deadline) && (
                                  <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200">Open App</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 items-start">
                            {getDriveTypeBadge(drive.drive_type)}
                            {drive.status === 'draft' && (
                              <Badge className="bg-slate-500 text-white border-0 text-[10px] font-black h-4 px-1">DRAFT</Badge>
                            )}
                            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                              <MapPin className="h-3 w-3" />
                              {drive.visit_mode === 'on_campus' ? 'On Campus' : drive.visit_mode === 'off_campus' ? 'Off Campus' : 'Virtual'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-primary font-semibold">
                              <Briefcase className="h-4 w-4" />
                              <p>{drive.role_offered || "Multiple Roles"}</p>
                            </div>
                            <p className="text-xs text-muted-foreground/80 pl-6">{drive.work_location || "Location TBD"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 font-bold text-slate-800">
                              <CalendarDays className="h-4 w-4 text-primary/70" />
                              <span>
                                {new Date(drive.visit_date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{drive.visit_time || "09:00 AM"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            {drive.ctc_amount && (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-100 dark:border-green-800/30 w-fit">
                                <DollarSign className="h-3.5 w-3.5" />
                                <p className="font-bold text-sm">
                                  ₹{drive.ctc_amount >= 1000 ? (drive.ctc_amount / 100000).toFixed(1) : drive.ctc_amount} LPA
                                </p>
                              </div>
                            )}
                            {!drive.ctc_amount && (
                              <Badge variant="outline" className="text-muted-foreground whitespace-nowrap text-[10px]">TBD / Internship</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 text-primary">
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[180px] p-2 rounded-xl shadow-premium border-slate-100">
                              <DropdownMenuItem onClick={() => handleEdit(drive)} className="cursor-pointer rounded-lg font-bold py-2.5">
                                <Pencil className="mr-3 h-4 w-4 text-slate-400" />
                                Edit Drive
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAttendanceDrive(drive)} className="cursor-pointer rounded-lg font-bold py-2.5 text-primary bg-primary/5 mt-1">
                                <CheckCircle2 className="mr-3 h-4 w-4" />
                                View Attendance
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStudentAnalyzerDrive(drive)} className="cursor-pointer rounded-lg font-bold py-2.5 text-indigo-600 bg-indigo-50 mt-1">
                                <Users className="mr-3 h-4 w-4" />
                                View Students
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive cursor-pointer hover:bg-destructive/10 rounded-lg font-bold py-2.5 mt-1"
                                onClick={() => handleDelete(drive.id)}
                              >
                                <Trash2 className="mr-3 h-4 w-4" />
                                Delete Drive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No drives scheduled</p>
                <p className="text-sm text-muted-foreground">
                  Schedule your first placement drive to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {attendanceDrive && (
          <DriveAttendanceDialog 
            isOpen={!!attendanceDrive}
            onOpenChange={(open) => !open && setAttendanceDrive(null)}
            driveId={attendanceDrive.id}
            companyName={attendanceDrive.companies?.name || "Drive"}
          />
        )}

        {studentAnalyzerDrive && (
          <DriveStudentsDialog
            isOpen={!!studentAnalyzerDrive}
            onClose={() => setStudentAnalyzerDrive(null)}
            driveId={studentAnalyzerDrive.id}
            driveName={studentAnalyzerDrive.companies?.name || "Placement Drive"}
          />
        )}
      </div>
  );
}