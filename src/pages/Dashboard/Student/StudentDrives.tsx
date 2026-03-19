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
  DollarSign, Globe, Linkedin, ExternalLink, Target
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
      // 1. Fetch student profile from students_master
      const { data: studentProfile } = await supabase
        .from('students_master')
        .select('id, department_id, approval_status, resume_url')
        .eq('id', user?.id)
        .single();

      if (!studentProfile || studentProfile.approval_status !== 'approved_by_tpo') {
        return [];
      }

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
          companies (name),
          drive_eligible_departments (department_id)
        `)
        .in('id', driveIds)
        .eq('status', 'scheduled')
        .order("visit_date", { ascending: true });

      if (driveError) throw driveError;

      // 5. Map applications to drives
      return (allDrives || []).map(drive => {
        const application = appMap.get(drive.id);
        return {
          ...drive,
          isEligible: true,
          applicationStatus: application?.status || null,
          applicationDetails: application || null
        };
      });
    },
    enabled: !!user?.id,
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





  return (
    <div className="space-y-6">
      {!profile && !profileLoading && (
        <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
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
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                {drive.applicationStatus ? (
                  <Badge 
                    variant="outline" 
                    className={
                      drive.applicationStatus.includes('rejected') 
                        ? "bg-red-50 text-red-700 border-red-300 font-bold" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                    }
                  >
                    {drive.applicationStatus === 'pending_hod' || drive.applicationStatus === 'approved_by_hod' 
                      ? 'APPLIED' 
                      : drive.applicationStatus === 'rejected_by_hod' 
                        ? 'HOD REJECTED' 
                        : drive.applicationStatus === 'rejected_by_tpo' 
                          ? 'TPO REJECTED' 
                          : drive.applicationStatus.replace(/_/g, ' ').toUpperCase()
                    }
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
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-bold text-xl">No drives found</h3>
          <p className="text-muted-foreground">New placement drives will appear here soon.</p>
        </div>
      )}

      {/* Drive Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {selectedDrive && (
            <>
              <DialogHeader className="p-6 pb-2">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">{selectedDrive.companies?.name}</DialogTitle>
                    <DialogDescription className="text-md font-medium text-foreground">
                      {selectedDrive.role_offered}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 p-6 pt-0">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white border border-slate-200 rounded-xl relative shadow-sm">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Package (CTC)</p>
                      <p className="font-bold text-xl text-slate-900">₹{selectedDrive.ctc_amount >= 1000 ? (selectedDrive.ctc_amount / 100000).toFixed(1) : selectedDrive.ctc_amount} LPA</p>
                    </div>
                    {selectedDrive.stipend_amount && (
                      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Stipend</p>
                        <p className="font-bold text-xl text-slate-900">₹{selectedDrive.stipend_amount.toLocaleString()}/mo</p>
                      </div>
                    )}
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Work Location</p>
                      <p className="font-bold text-sm text-slate-800 truncate">{selectedDrive.work_location || "PAN India"}</p>
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Visit Mode</p>
                      <p className="font-bold text-sm text-slate-800 uppercase">{selectedDrive.visit_mode.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">App. Deadline</p>
                      <p className="font-bold text-sm text-slate-800">{selectedDrive.application_deadline ? new Date(selectedDrive.application_deadline).toLocaleDateString() : "Open Application"}</p>
                    </div>
                  </div>

                  {/* Company Digital Assets */}
                  {(selectedDrive.company_website || selectedDrive.company_linkedin || selectedDrive.other_links) && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-3">
                      {selectedDrive.company_website && (
                        <a href={selectedDrive.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-800 hover:text-slate-900 transition-all shadow-sm">
                          <Globe className="h-3 w-3" /> Website
                        </a>
                      )}
                      {selectedDrive.company_linkedin && (
                        <a href={selectedDrive.company_linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-800 hover:text-slate-900 transition-all shadow-sm">
                          <Linkedin className="h-3 w-3" /> LinkedIn
                        </a>
                      )}
                      {selectedDrive.other_links && (
                        <a href={selectedDrive.other_links} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-800 hover:text-slate-900 transition-all shadow-sm">
                          <ExternalLink className="h-3 w-3" /> Digital Resources
                        </a>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-bold flex items-center gap-2 text-slate-900">
                      <FileText className="h-5 w-5 text-slate-600" /> 
                      Professional Job Description
                    </h4>
                    <div className="p-5 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {selectedDrive.job_description || "Detailed requirements as specified by the organization."}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-bold flex items-center gap-2 text-slate-900 border-b pb-2">
                        <Target className="h-5 w-5 text-slate-500" />
                        Eligibility Criteria
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Min CGPA</p>
                          <p className="font-bold text-slate-900">{selectedDrive.min_cgpa}</p>
                        </div>
                        <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Max Backlogs</p>
                          <p className="font-bold text-slate-900">{selectedDrive.max_backlogs}</p>
                        </div>
                        <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Max History</p>
                          <p className="font-bold text-slate-900">{selectedDrive.max_history_arrears || 0}</p>
                        </div>
                        <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">10th Mark</p>
                          <p className="font-bold text-slate-900">{selectedDrive.min_10th_mark}%</p>
                        </div>
                        <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">12th Mark</p>
                          <p className="font-bold text-slate-900">{selectedDrive.min_12th_mark}%</p>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-100/50 border border-slate-200 rounded-lg">
                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Target Batches</p>
                        <p className="text-sm font-bold text-slate-900">{selectedDrive.eligible_batches || "2021-2025"}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold flex items-center gap-2 text-slate-900 border-b pb-2">
                        <Info className="h-5 w-5 text-slate-500" />
                        Organizational Details
                      </h4>
                      <div className="space-y-3">
                        {selectedDrive.bond_details && (
                          <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Bond & Terms</p>
                            <p className="text-sm text-slate-800 font-semibold">{selectedDrive.bond_details}</p>
                          </div>
                        )}
                        <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Visit Classification</p>
                          <p className="text-sm font-bold text-slate-800 uppercase leading-none">{selectedDrive.drive_type}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedDrive.remarks && (
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                      <h4 className="font-bold flex items-center gap-2 text-slate-800 uppercase text-xs tracking-widest">
                        <Info className="h-4 w-4 text-slate-500" /> 
                        Officer's Directives & Instructions
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {selectedDrive.remarks}
                      </p>
                    </div>
                  )}

                  {selectedDrive.applicationStatus === 'interview_scheduled' && selectedDrive.applicationDetails?.interview_timestamp && (
                    <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg ring-1 ring-white/10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Scheduled Interview Slot</p>
                      <p className="text-lg text-white font-bold">
                        {new Date(selectedDrive.applicationDetails.interview_timestamp).toLocaleString('en-IN', {
                          dateStyle: 'full',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                  )}

                  {(selectedDrive.applicationStatus === 'rejected_by_hod' || selectedDrive.applicationStatus === 'rejected_by_tpo') && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-xs font-bold text-red-800 uppercase mb-1">Feedback from Coordinator</p>
                      <p className="text-sm text-red-700">
                        {selectedDrive.applicationDetails?.rejection_reason || "Unfortunately, your application was not selected for this drive by your department coordinator."}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 bg-muted/20 border-t">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                {!selectedDrive.applicationStatus ? (
                  <Button 
                    className="bg-primary hover:bg-primary-hover px-8 font-bold"
                    onClick={handleApply}
                    disabled={isApplying}
                  >
                    {isApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Confirm & Apply
                  </Button>
                ) : selectedDrive.applicationStatus.includes('rejected') ? (
                  <Button className="bg-red-600 disabled:opacity-100" disabled>
                    <AlertCircle className="mr-2 h-4 w-4" /> Application Rejected
                  </Button>
                ) : (
                  <Button className="bg-emerald-600 disabled:opacity-100" disabled>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Application Submitted
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
            <div className="h-20 w-20 rounded-full bg-slate-900 flex items-center justify-center mb-6 shadow-xl ring-4 ring-slate-100">
               <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
              Application<br/>Submitted!
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 uppercase tracking-widest">
              Success Notification
            </DialogDescription>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Identified</p>
             <p className="font-bold text-slate-800">{selectedDrive?.companies?.name}</p>
             <p className="text-xs text-slate-500">{selectedDrive?.role_offered}</p>
          </div>

          <div className="space-y-4 text-left border-t pt-6">
             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Next Steps in Selection</h4>
             <div className="space-y-3">
                <div className="flex items-start gap-4">
                   <div className="h-5 w-5 rounded-full border border-slate-900 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                   <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 leading-none">HOD Verification</p>
                      <p className="text-[10px] text-slate-500">Department head will verify your primary eligibility.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4">
                   <div className="h-5 w-5 rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-slate-400">2</div>
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
