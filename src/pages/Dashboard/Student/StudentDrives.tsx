import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Building2, Calendar, MapPin, Briefcase, ChevronRight, 
  CheckCircle2, AlertCircle, Info, Loader2, FileText, CheckCircle, Plus,
  DollarSign, Globe, Linkedin, ExternalLink, Target, Sparkles, ClipboardList, Clock, History as HistoryIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import QRCode from "react-qr-code";
import { QrCode } from "lucide-react";

export default function StudentDrives() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDrive, setSelectedDrive] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Fetch Student Profile for eligibility check
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["student-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students_master")
        .select("*")
        .eq("id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch Drives and Applications
  const { data: drives, isLoading: drivesLoading } = useQuery({
    queryKey: ["student-eligible-drives", user?.id, profile?.id],
    queryFn: async () => {
      // 1. Fetch full student profile for eligibility validation
      const { data: studentProfile } = await supabase
        .from('students_master')
        .select(`
          id, 
          department_id, 
          approval_status, 
          resume_url,
          overall_cgpa,
          current_backlogs,
          history_of_arrears_count,
          percentage_10th,
          percentage_12th,
          current_year,
          current_standing_arrear,
          history_of_arrear
        `)
        .eq('id', user?.id)
        .single();

      if (!studentProfile || studentProfile.approval_status !== 'approved_by_tpo') {
        return [];
      }

      // Helper to parse string metrics to numbers safely
      const parseMetric = (val: any) => {
        if (!val) return 0;
        const clean = String(val).replace(/[^0-9.]/g, '');
        return clean ? parseFloat(clean) : 0;
      };

      const studentMetrics = {
        cgpa: parseMetric(studentProfile.overall_cgpa),
        backlogs: parseMetric(studentProfile.current_standing_arrear),
        historyArrears: parseMetric(studentProfile.history_of_arrear),
        mark10: parseMetric(studentProfile.percentage_10th),
        mark12: parseMetric(studentProfile.percentage_12th),
        year: studentProfile.current_year?.trim() || "4th Year"
      };

      // 2. Fetch all applications for this student to check current status
      const { data: studentApplications } = await supabase
        .from('placement_applications' as any)
        .select('*')
        .eq('student_id', user?.id);

      const appMap = new Map();
      (studentApplications || []).forEach((app: any) => {
        appMap.set(app.drive_id, app);
      });

      // 3. Get all eligible department entries for this student's department
      const { data: eligibleEntries } = await supabase
        .from('drive_eligible_departments')
        .select('drive_id')
        .eq('department_id', studentProfile.department_id);

      if (!eligibleEntries || eligibleEntries.length === 0) {
        return [];
      }

      const driveIds = eligibleEntries.map(e => e.drive_id);

      // 4. Fetch those specific drives with status = scheduled
      const { data: allDrives, error: driveError } = await supabase
        .from('placement_drives')
        .select(`
          id,
          role_offered,
          drive_type,
          visit_date,
          visit_mode,
          ctc_amount,
          stipend_amount,
          min_cgpa,
          max_backlogs,
          min_10th_mark,
          min_12th_mark,
          job_description,
          work_location,
          bond_details,
          application_deadline,
          company_website,
          company_linkedin,
          other_links,
          max_history_arrears,
          remarks,
          status,
          round_details,
          eligible_batches,
          companies (name),
          drive_eligible_departments (department_id)
        `)
        .in('id', driveIds)
        .eq('status', 'scheduled')
        .order("visit_date", { ascending: true });

      if (driveError) throw driveError;

      // 5. Filter for eligibility and map applications
      const drivePromises = ((allDrives as any) || []).filter((drive: any) => {
        // Eligibility Logic
        if (drive.min_cgpa && studentMetrics.cgpa < drive.min_cgpa) return false;
        if (drive.max_backlogs !== null && studentMetrics.backlogs > drive.max_backlogs) return false;
        if (drive.max_history_arrears !== null && studentMetrics.historyArrears > drive.max_history_arrears) return false;
        if (drive.min_10th_mark && studentMetrics.mark10 < drive.min_10th_mark) return false;
        if (drive.min_12th_mark && studentMetrics.mark12 < drive.min_12th_mark) return false;
        
        // Year check
        const driveTargetYear = drive.eligible_batches || "4th Year";
        if (driveTargetYear !== "All Students" && studentMetrics.year !== driveTargetYear) return false;

        return true;
      }).map((drive: any) => {
        const application = appMap.get(drive.id);

        // EXTRA: Fetch LifeCycle status from drive_student_status (Step 7)
        return supabase
          .from('drive_student_status' as any)
          .select('status, non_application_reason, absence_reason')
          .eq('drive_id', drive.id)
          .eq('student_id', user?.id)
          .single()
          .then(({ data: lifecycle }) => ({
            ...drive,
            isEligible: true,
            applicationStatus: application?.status || null,
            applicationDetails: application || null,
            lifecycleStatus: (lifecycle as any)?.status || 'eligible',
            lifecycleDetails: lifecycle
          }));
      });

      return Promise.all(drivePromises);
    },
    enabled: !!user?.id && !!profile?.id,
  });

  const handleApply = async () => {
    if (!selectedDrive || isApplying) return;
    setIsApplying(true);

    try {
      const { data, error } = await supabase
        .rpc('safe_apply_for_drive', {
          p_drive_id: selectedDrive.id,
          p_student_id: user?.id,
          p_resume_url: profile?.resume_url || null
        });

      if (error) throw error;

      if (data?.success === false) {
        toast.error(data.message || "You have already applied for this drive!");
      } else {
        setIsSuccessOpen(true);
        queryClient.invalidateQueries({ queryKey: ["student-eligible-drives"] });
        setIsDetailsOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to apply");
    } finally {
      setIsApplying(false);
    }
  };

  if (drivesLoading) {
    return (
      <div className="flex h-64 items-center justify-center flex-col gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading available drives...</p>
      </div>
    );
  }
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending_hod':
        return { label: '⏳ Pending HOD Review', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
      case 'approved_by_hod':
        return { label: '✅ HOD Approved', color: 'bg-blue-100 text-blue-800 border-blue-200' }
      case 'approved_by_tpo':
        return { label: '🎉 TPO Approved', color: 'bg-green-100 text-green-800 border-green-200' }
      case 'rejected_by_hod':
        return { label: '❌ HOD Rejected', color: 'bg-red-100 text-red-800 border-red-200' }
      case 'rejected_by_tpo':
        return { label: '❌ TPO Rejected', color: 'bg-red-100 text-red-800 border-red-200' }
      default:
        return { label: 'APPLIED', color: 'bg-gray-100 text-gray-800 border-gray-200' }
    }
  }

  return (
    <div className="space-y-6">
      {!profile && !profileLoading && (
        <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-none text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-bold">Master Profile Not Found</p>
            <p>You can see drives, but you <strong>cannot apply</strong> until you complete your profile.</p>
          </div>
          <Button size="sm" variant="outline" className="border-amber-300 hover:bg-amber-100" onClick={() => window.location.href='/student/profile'}>
            Complete Profile
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Placement Drives</h1>
        <p className="text-muted-foreground">
          Browse all available placement and internship opportunities.
        </p>
      </div>


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {drives?.map((drive) => (
          <Card key={drive.id} className="flex flex-col border-primary/10 hover:shadow-premium transition-all">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="bg-primary/10 p-2 rounded-none">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                {drive.applicationStatus ? (
                  <Badge variant="outline" 
                    className={getStatusBadge(drive.applicationStatus).color}>
                    {getStatusBadge(drive.applicationStatus).label}
                  </Badge>
                ) : (
                  <Badge className="bg-slate-900 text-white font-bold tracking-wider">AVAILABLE</Badge>
                )}
              </div>
              <CardTitle className="mt-4">{drive.companies?.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 font-medium text-foreground">
                <Briefcase className="h-3.5 w-3.5" /> {drive.role_offered}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Drive Date: {new Date(drive.visit_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{drive.work_location || "Not specified"}</span>
              </div>
              {drive.ctc_amount ? (
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Info className="h-4 w-4" />
                  <span>₹{drive.ctc_amount >= 1000 ? (drive.ctc_amount / 100000).toFixed(1) : drive.ctc_amount} LPA</span>
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">TBD / Internship</Badge>
              )}
              {drive.lifecycleStatus && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1.5 flex items-center gap-1.5">
                    <HistoryIcon className="h-3 w-3" />
                    Intel Lifecycle Phase
                  </p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={drive.lifecycleStatus} />
                    {drive.lifecycleStatus === 'not_applied' && (
                      <span className="text-[9px] font-bold text-rose-500 italic">Action Required</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="outline" 
                className="w-full group" 
                onClick={() => {
                  setSelectedDrive(drive);
                  setIsDetailsOpen(true);
                }}
              >
                View Details
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {(!drives || drives.length === 0) && (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-none bg-muted/30">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-bold text-xl">No drives found</h3>
          <p className="text-muted-foreground">New placement drives will appear here soon.</p>
        </div>
      )}

      {/* Drive Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-none">
          {selectedDrive && (
            <>
              <div className="bg-primary/10 px-6 py-5 border-b border-primary/20 bg-gradient-to-r from-primary/5 to-transparent shrink-0">
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-none text-primary shadow-sm border border-primary/10">
                      <Building2 className="h-8 w-8" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-black text-primary tracking-tight">{selectedDrive.companies?.name}</DialogTitle>
                      <DialogDescription className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {selectedDrive.role_offered}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                <div className="space-y-6">
                  {/* Status Alerts */}
                  {(selectedDrive.applicationStatus === 'rejected_by_hod' || selectedDrive.applicationStatus === 'rejected_by_tpo') && (
                    <Alert variant="destructive" className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-xs font-black uppercase tracking-widest text-red-800">Application Status: Rejected</AlertTitle>
                      <AlertDescription className="text-sm font-medium text-red-600">
                        {selectedDrive.applicationDetails?.remarks || "Please check your eligibility criteria or contact the placement cell."}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-14 bg-slate-100 p-1.5 rounded-none mb-8 shadow-inner border border-slate-200">
                      <TabsTrigger value="basic" className="rounded-none gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-black text-[10px] uppercase tracking-wider">
                        <Info className="h-3.5 w-3.5" />
                        Details
                      </TabsTrigger>
                      <TabsTrigger value="job" className="rounded-none gap-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-black text-[10px] uppercase tracking-wider">
                        <Briefcase className="h-3.5 w-3.5" />
                        Job
                      </TabsTrigger>
                      <TabsTrigger value="eligibility" className="rounded-none gap-2.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-black text-[10px] uppercase tracking-wider">
                        <Target className="h-3.5 w-3.5" />
                        Eligibility
                      </TabsTrigger>
                      <TabsTrigger value="rounds" className="rounded-none gap-2.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-black text-[10px] uppercase tracking-wider">
                        <ClipboardList className="h-3.5 w-3.5" />
                        Rounds
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                         <div className="p-4 bg-slate-50 border border-slate-200 rounded-none relative shadow-sm overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform"><Calendar className="h-8 w-8" /></div>
                           <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Drive Date</p>
                           <p className="font-bold text-slate-800">{new Date(selectedDrive.visit_date).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-none relative shadow-sm overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform"><MapPin className="h-8 w-8" /></div>
                           <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Base Location</p>
                           <p className="font-bold text-slate-800">{selectedDrive.work_location || "Not Specified"}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-none relative shadow-sm overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform"><Globe className="h-8 w-8" /></div>
                           <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Visit Mode</p>
                           <p className="font-bold text-slate-800 uppercase tracking-tight">{selectedDrive.visit_mode.replace(/_/g, ' ')}</p>
                        </div>
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="bg-slate-50 p-6 rounded-none border border-slate-200 space-y-4 shadow-sm">
                           <h3 className="font-black flex items-center gap-2 text-slate-800 uppercase text-xs tracking-wider">
                            <Clock className="h-4 w-4 text-primary" />
                            Timeline Information
                          </h3>
                          <div className="space-y-4">
                            <div className="space-y-1">
                               <Label className="text-[10px] font-bold uppercase text-slate-400">Application Deadline</Label>
                               <p className="font-black text-primary uppercase text-sm">{selectedDrive.application_deadline ? new Date(selectedDrive.application_deadline).toLocaleDateString() : "Open Application"}</p>
                            </div>
                            <div className="space-y-1">
                               <Label className="text-[10px] font-bold uppercase text-slate-400">Scheduled Time</Label>
                               <p className="font-black text-slate-800 text-sm">09:00 AM (Tentative)</p>
                            </div>
                          </div>
                        </div>

                        {(selectedDrive.company_website || selectedDrive.company_linkedin || selectedDrive.other_links) && (
                          <div className="bg-slate-50 p-6 rounded-none border border-slate-200 space-y-4 shadow-sm">
                             <h3 className="font-black flex items-center gap-2 text-slate-800 uppercase text-xs tracking-wider">
                              <Globe className="h-4 w-4 text-primary" />
                              Official Links
                            </h3>
                            <div className="flex flex-col gap-2">
                              {selectedDrive.company_website && (
                                <a href={selectedDrive.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                                  <Globe className="h-3.5 w-3.5" /> Official Website
                                </a>
                              )}
                              {selectedDrive.company_linkedin && (
                                <a href={selectedDrive.company_linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline">
                                  <Linkedin className="h-3.5 w-3.5" /> Company LinkedIn
                                </a>
                              )}
                              {selectedDrive.other_links && (
                                <a href={selectedDrive.other_links} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:underline">
                                  <ExternalLink className="h-3.5 w-3.5" /> Other Resources
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="job" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
                      <div className="grid gap-6 sm:grid-cols-2">
                         <div className="bg-emerald-50/50 p-6 rounded-none border border-emerald-100 flex items-center justify-between shadow-sm">
                            <div className="space-y-1">
                               <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Placement CTC</p>
                               <p className="text-2xl font-black text-emerald-900 leading-none">₹{selectedDrive.ctc_amount >= 1000 ? (selectedDrive.ctc_amount / 100000).toFixed(1) : selectedDrive.ctc_amount} LPA</p>
                            </div>
                            <div className="h-12 w-12 bg-white rounded-none flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                               <DollarSign className="h-6 w-6" />
                            </div>
                         </div>
                         {selectedDrive.stipend_amount && (
                           <div className="bg-emerald-900/5 p-6 rounded-none border border-emerald-100 flex items-center justify-between shadow-sm">
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Monthly Stipend</p>
                                 <p className="text-2xl font-black text-emerald-900 leading-none">₹{selectedDrive.stipend_amount.toLocaleString()}</p>
                              </div>
                              <div className="h-12 w-12 bg-white rounded-none flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                 <Sparkles className="h-6 w-6" />
                              </div>
                           </div>
                         )}
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label className="font-black text-slate-700 flex items-center gap-2 uppercase text-[10px] tracking-[0.2em] border-b pb-2">
                             <Briefcase className="h-4 w-4 text-emerald-600" />
                             Job Description & Candidate Responsibilities
                          </Label>
                          <div className="p-6 bg-white rounded-none border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner min-h-[140px]">
                            {selectedDrive.job_description || "Detailed requirements as specified by the organization will be briefed during the session."}
                          </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                           <div className="bg-slate-50 p-5 rounded-none border border-slate-200">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Service Policy</h4>
                              <p className="text-sm font-bold text-slate-800">{selectedDrive.bond_details || "No Service Agreement Mentioned"}</p>
                           </div>
                           <div className="bg-slate-50 p-5 rounded-none border border-slate-200">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Classification</h4>
                              <p className="text-sm font-black text-emerald-600 uppercase italic tracking-tight">{selectedDrive.drive_type} Opportunity</p>
                           </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="eligibility" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
                      <div className="grid gap-6 sm:grid-cols-3">
                         <div className="bg-orange-50/50 p-6 rounded-none border border-orange-200 space-y-3 shadow-sm group">
                          <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">Min CGPA</p>
                          <p className="font-black text-3xl text-orange-900">{selectedDrive.min_cgpa}</p>
                        </div>
                        <div className="bg-orange-50/50 p-6 rounded-none border border-orange-200 space-y-3 shadow-sm group">
                          <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">Backlogs</p>
                          <p className="font-black text-3xl text-orange-900">{selectedDrive.max_backlogs}</p>
                        </div>
                        <div className="bg-orange-50/50 p-6 rounded-none border border-orange-200 space-y-3 shadow-sm group">
                          <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">Arrears History</p>
                          <p className="font-black text-3xl text-orange-900">{selectedDrive.max_history_arrears || 0}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-8 rounded-none border-2 border-dashed border-slate-200 space-y-8">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 bg-slate-200 rounded-none flex items-center justify-center text-slate-500 font-black text-xs uppercase shadow-inner">01</div>
                           <h3 className="text-sm font-black uppercase text-slate-800 tracking-[0.2em]">Academic Benchmarks</h3>
                        </div>
                        <div className="grid gap-12 sm:grid-cols-3">
                          <div className="space-y-1 text-center">
                            <p className="text-3xl font-black text-slate-400/50 leading-none">10th</p>
                            <p className="text-lg font-black text-slate-700">{selectedDrive.min_10th_mark}%</p>
                            <p className="text-[9px] uppercase font-black text-slate-400">Min Threshold</p>
                          </div>
                          <div className="space-y-1 text-center">
                            <p className="text-3xl font-black text-slate-400/50 leading-none">12th</p>
                            <p className="text-lg font-black text-slate-700">{selectedDrive.min_12th_mark}%</p>
                            <p className="text-[9px] uppercase font-black text-slate-400">Min Threshold</p>
                          </div>
                          <div className="space-y-1 text-center">
                            <p className="text-3xl font-black text-slate-400/50 leading-none">BATCH</p>
                            <p className="text-lg font-black text-slate-700">{selectedDrive.eligible_batches || "2021-2025"}</p>
                            <p className="text-[9px] uppercase font-black text-slate-400">Graduating Cohort</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="rounds" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
                      {selectedDrive.round_details && Array.isArray(selectedDrive.round_details) && selectedDrive.round_details.length > 0 ? (
                        <div className="bg-purple-50/50 p-6 rounded-none border border-purple-100 space-y-6">
                           <h3 className="font-black text-purple-900 flex items-center gap-2 uppercase text-xs tracking-widest px-2">
                             <ClipboardList className="h-5 w-5" />
                             Recruitment Roadmap
                           </h3>
                           <div className="space-y-4">
                            {selectedDrive.round_details.map((round: any, idx: number) => (
                              <div key={idx} className="bg-white p-5 rounded-none border border-purple-100 shadow-sm flex gap-5 items-center group transition-all hover:bg-purple-100/20">
                                <div className="h-12 w-12 rounded-none bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm shrink-0 border-2 border-white shadow-sm transition-all group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110">
                                  {idx + 1}
                                </div>
                                <div className="space-y-1 flex-1">
                                  <p className="font-black text-slate-900 uppercase tracking-tight leading-none text-sm group-hover:text-purple-900">{round.name}</p>
                                  {round.description && <p className="text-xs text-slate-500 font-medium leading-relaxed group-hover:text-slate-600">{round.description}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-none bg-slate-50">
                           <Sparkles className="h-10 w-10 text-slate-200 mb-3" />
                           <p className="text-sm font-bold text-slate-400 italic">Rounds details will be updated during the Pre-Placement Talk.</p>
                        </div>
                      )}

                      {selectedDrive.remarks && (
                        <div className="bg-slate-900 p-6 rounded-none shadow-xl ring-2 ring-slate-800 space-y-4">
                          <h4 className="font-black flex items-center gap-2 text-white uppercase text-xs tracking-[0.2em] border-b border-white/5 pb-2">
                            <Info className="h-4 w-4 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" /> 
                            Management Briefing
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed font-bold italic">"{selectedDrive.remarks}"</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {selectedDrive.applicationStatus === 'approved_by_tpo' && (
                    <div className="p-8 bg-black rounded-none shadow-2xl relative overflow-hidden group border border-white/10 flex flex-col items-center gap-6">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.1] transition-transform group-hover:rotate-12">
                        <QrCode className="h-24 w-24 text-white" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Attendance QR Code Activated
                        </p>
                        <h3 className="text-xl text-white font-black tracking-widest uppercase">Drive Identity Pass</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Show this to the invigilator on drive day</p>
                      </div>

                      <div className="p-4 bg-white rounded-none shadow-premium animate-in zoom-in-95 duration-500">
                        <QRCode
                          value={`${window.location.origin}/attend?student_id=${user?.id}&drive_id=${selectedDrive.id}`}
                          size={180}
                          level="H"
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        />
                      </div>

                      <div className="text-center space-y-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Digital Entry ID</p>
                        <p className="text-xs text-white/50 font-mono">{user?.id?.slice(0, 18)}...</p>
                      </div>
                    </div>
                  )}

                  {/* Scheduled Interview (Contextual for later stages) */}
                  {selectedDrive.applicationStatus === 'interview_scheduled' && selectedDrive.applicationDetails?.interview_timestamp && (
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-none shadow-2xl relative overflow-hidden group ring-1 ring-white/10">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.2] transition-transform group-hover:rotate-12">
                        <Clock className="h-20 w-20 text-white" />
                      </div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Live Interview Slot Confirmed
                      </p>
                      <p className="text-2xl text-white font-black tracking-tight leading-none mb-1">
                        {new Date(selectedDrive.applicationDetails.interview_timestamp).toLocaleString('en-IN', {
                          dateStyle: 'full',
                          timeStyle: 'short'
                        })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Platform: Campus / Online Portal</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
                {!selectedDrive.applicationStatus ? (
                  <Button 
                    className="w-full h-12 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-none shadow-xl transition-all active:scale-[0.98]" 
                    onClick={handleApply}
                    disabled={isApplying || (profileLoading)}
                  >
                    {isApplying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ChevronRight className="mr-2 h-5 w-5" />}
                    Lock & Apply Selected Opportunity
                  </Button>
                ) : (
                  <Button className="w-full h-12 bg-slate-100 border border-slate-200 text-slate-400 font-black uppercase tracking-widest rounded-none cursor-not-allowed pointer-events-none" disabled>
                    <CheckCircle className="mr-2 h-5 w-5 text-emerald-500" />
                    Application Locked / Submitted
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Success Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-md p-8 text-center space-y-6">
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 rounded-none bg-slate-900 flex items-center justify-center mb-6 shadow-xl ring-4 ring-slate-100">
               <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
              Application<br/>Submitted!
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 uppercase tracking-widest">
              Success Notification
            </DialogDescription>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Identified</p>
             <p className="font-bold text-slate-800">{selectedDrive?.companies?.name}</p>
             <p className="text-xs text-slate-500">{selectedDrive?.role_offered}</p>
          </div>

          <div className="space-y-4 text-left border-t pt-6">
             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Next Steps in Selection</h4>
             <div className="space-y-3">
                <div className="flex items-start gap-4">
                   <div className="h-5 w-5 rounded-none border border-slate-900 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                   <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 leading-none">HOD Verification</p>
                      <p className="text-[10px] text-slate-500">Department head will verify your primary eligibility.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4">
                   <div className="h-5 w-5 rounded-none border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-slate-400">2</div>
                   <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-400 leading-none">TPO Review</p>
                      <p className="text-[10px] text-slate-400">Placement cell will finalize your application for shortlisting.</p>
                   </div>
                </div>
             </div>
          </div>

          <DialogFooter>
             <Button variant="outline" className="w-full h-12 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-black uppercase text-xs tracking-widest transition-all" onClick={() => setIsSuccessOpen(false)}>
                Acknowledge & Close
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    eligible: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Eligible to Apply' },
    applied: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Application Tracked' },
    appeared: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Process Underway' },
    selected: { bg: 'bg-emerald-600', text: 'text-white', label: 'Offer Received' },
    absent: { bg: 'bg-rose-50', text: 'text-rose-600', label: 'Medical/Personal Absent' },
    not_applied: { bg: 'bg-slate-900', text: 'text-white', label: 'Reason Pending' },
  };
  const config = configs[status] || configs.eligible;
  return (
    <Badge className={`${config.bg} ${config.text} border-0 font-black text-[7.5px] uppercase px-1.5 py-0.5 rounded-none shadow-sm`}>
      {config.label}
    </Badge>
  );
}
