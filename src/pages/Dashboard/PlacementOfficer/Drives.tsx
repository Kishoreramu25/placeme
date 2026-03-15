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
  Sparkles
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { driveSchema, DriveFormData } from "@/lib/validations";

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
      eligible_batches: "2021-2025",
      min_10th_mark: 0,
      min_12th_mark: 0,
      application_deadline: "",
    },
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
        ) as PlacementDrive[];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PlacementDrive[];
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
    mutationFn: async (data: DriveFormData) => {
      const toastId = toast.loading(editingDrive ? "Updating drive details..." : "Scheduling new drive...");
      const { eligible_departments, company_name, academic_year, ...rest } = data;
      
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
          company_id,
          academic_year_id
        };
        
        let driveId;
        if (editingDrive) {
          const { error } = await supabase
            .from("placement_drives")
            .update({
              ...driveData,
              updated_at: new Date().toISOString()
            })
            .eq("id", editingDrive.id);
          if (error) throw error;
          driveId = editingDrive.id;
        } else {
          const { data: newDrive, error } = await supabase
            .from("placement_drives")
            .insert([{ 
              ...driveData, 
              created_by: user?.id 
            }])
            .select()
            .single();
          if (error) throw error;
          driveId = newDrive.id;
        }

        // Sync departments
        const { error: delError } = await supabase.from("drive_eligible_departments").delete().eq("drive_id", driveId);
        if (delError) throw delError;

        if (eligible_departments.length > 0) {
          const deptRecords = eligible_departments.map(deptId => ({
            drive_id: driveId,
            department_id: deptId
          }));
          
          const { error: deptError } = await supabase.from("drive_eligible_departments").insert(deptRecords);
          if (deptError) throw deptError;
        }
        
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
      ctc_amount: 24,
      remarks: "Testing drive - please ignore",
      eligible_departments: demoDepts,
      job_description: "We are looking for passionate engineers to join our cloud team.",
      bond_details: "No Bond",
      work_location: "Bangalore / Remote",
      min_cgpa: 8.0,
      max_backlogs: 0,
      max_history_arrears: 0,
      eligible_batches: "2021-2025",
      min_10th_mark: 85,
      min_12th_mark: 85,
      application_deadline: deadline,
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingDrive ? "Edit Drive" : "Schedule New Drive"}</DialogTitle>
                  <DialogDescription>
                    {editingDrive
                      ? "Update the drive details below"
                      : "Fill in the details to schedule a new placement drive"}
                  </DialogDescription>
                </DialogHeader>
                <form 
                  onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} 
                  className="space-y-6"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      form.handleSubmit((data) => saveMutation.mutate(data))();
                    }
                  }}
                >
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="job">Job Details</TabsTrigger>
                      <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4 pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Company Selection */}
                        <div className="space-y-2">
                          <Label>Company Name *</Label>
                          <Input {...form.register("company_name")} placeholder="e.g., Google, Microsoft" />
                        </div>

                        {/* Drive Type */}
                        <div className="space-y-2">
                          <Label>Drive Type *</Label>
                          <Controller
                            name="drive_type"
                            control={form.control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="placement">Placement</SelectItem>
                                  <SelectItem value="internship">Internship</SelectItem>
                                  <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Visit Mode */}
                        <div className="space-y-2">
                          <Label>Visit Mode *</Label>
                          <Controller
                            name="visit_mode"
                            control={form.control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="on_campus">On Campus</SelectItem>
                                  <SelectItem value="off_campus">Off Campus</SelectItem>
                                  <SelectItem value="virtual">Virtual</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Role Offered */}
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Role Offered *</Label>
                          <Input {...form.register("role_offered")} placeholder="e.g., Software Engineer" />
                        </div>

                        {/* Visit Date & Time */}
                        <div className="space-y-2">
                          <Label>Drive Date *</Label>
                          <Input type="date" {...form.register("visit_date")} />
                        </div>
                        <div className="space-y-2">
                          <Label>Application Deadline</Label>
                          <Input type="date" {...form.register("application_deadline")} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="job" className="space-y-4 pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>CTC (₹ LPA)</Label>
                          <Input type="number" step="0.1" {...form.register("ctc_amount", { valueAsNumber: true })} placeholder="12.5" />
                        </div>
                        <div className="space-y-2">
                          <Label>Work Location</Label>
                          <Input {...form.register("work_location")} placeholder="e.g., Bangalore, Remote" />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Job Description</Label>
                          <Textarea {...form.register("job_description")} className="min-h-[100px]" placeholder="Paste job description here..." />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Bond Details (if any)</Label>
                          <Input {...form.register("bond_details")} placeholder="e.g., 2 years / No bond" />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Additional Remarks</Label>
                          <Textarea {...form.register("remarks")} placeholder="Notes for HOD/Students" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="eligibility" className="space-y-4 pt-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                         <div className="space-y-2">
                          <Label>Min CGPA</Label>
                          <Input type="number" step="0.01" {...form.register("min_cgpa", { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Backlogs</Label>
                          <Input type="number" {...form.register("max_backlogs", { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Max History Arrears</Label>
                          <Input type="number" {...form.register("max_history_arrears", { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Min 10th %</Label>
                          <Input type="number" step="0.1" {...form.register("min_10th_mark", { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Min 12th %</Label>
                          <Input type="number" step="0.1" {...form.register("min_12th_mark", { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Eligible Batches</Label>
                          <Input {...form.register("eligible_batches")} placeholder="2021-2025" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Eligible Departments *</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {departments?.map((dept) => (
                            <label
                              key={dept.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer hover:bg-muted/50 transition-colors ${selectedDepts.includes(dept.id) ? 'bg-primary/5 border-primary/30' : ''}`}
                            >
                              <Checkbox
                                checked={selectedDepts.includes(dept.id)}
                                onCheckedChange={() => handleDeptToggle(dept.id)}
                              />
                              <span className="truncate">{dept.code}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-2">
                       <Button type="button" variant="ghost" onClick={fillDemoData} className="text-primary hover:text-primary hover:bg-primary/10">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Magic Fill
                      </Button>
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saveMutation.isPending} className="min-w-[120px]">
                        {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {editingDrive ? "Update Drive" : "Schedule Drive"}
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
                      <TableRow key={drive.id} className="table-row-hover">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{drive.companies?.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">
                                {drive.academic_years?.year_label}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getDriveTypeBadge(drive.drive_type)}
                            {getVisitModeBadge(drive.visit_mode)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{drive.role_offered || "Multiple Roles"}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {new Date(drive.visit_date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          {drive.visit_time && (
                            <p className="text-sm text-muted-foreground mt-1">{drive.visit_time}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {drive.ctc_amount && (
                            <p className="font-medium">₹{(drive.ctc_amount / 100000).toFixed(1)} LPA</p>
                          )}
                          {drive.stipend_amount && (
                            <p className="text-sm text-muted-foreground">
                              ₹{drive.stipend_amount.toLocaleString()}/mo
                            </p>
                          )}
                          {!drive.ctc_amount && !drive.stipend_amount && <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(drive)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(drive.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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
      </div>
  );
}