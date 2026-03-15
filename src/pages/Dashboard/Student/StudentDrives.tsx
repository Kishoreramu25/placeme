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
  CheckCircle2, AlertCircle, Info, Loader2, FileText, CheckCircle, Plus 
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

      // 2. Get all eligible department entries for this student's department
      const { data: eligibleEntries } = await supabase
        .from('drive_eligible_departments')
        .select('drive_id')
        .eq('department_id', studentProfile.department_id);

      if (!eligibleEntries || eligibleEntries.length === 0) {
        return [];
      }

      const driveIds = eligibleEntries.map(e => e.drive_id);

      // 3. Fetch those specific drives with status = scheduled
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
          application_deadline,
          status,
          companies (name),
          drive_eligible_departments (department_id)
        `)
        .in('id', driveIds)
        .eq('status', 'scheduled')
        .order("visit_date", { ascending: true });

      if (driveError) throw driveError;

      // 4. Temporarily use an empty map for applications (feature coming later)
      const appMap = new Map();

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
      const { error } = await supabase
        .from("placement_applications")
        .insert([{
          drive_id: selectedDrive.id,
          student_id: user?.id,
          status: "pending_hod",
          resume_url: profile?.resume_url
        }]);

      if (error) throw error;
      
      toast.success("Application submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["student-eligible-drives"] });
      setIsDetailsOpen(false);
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
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" /> {drive.applicationStatus.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                ) : (
                  <Badge className="bg-blue-600">AVAILABLE</Badge>
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
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Info className="h-4 w-4" />
                <span>₹{(drive.ctc_amount || 0).toFixed(1)} LPA</span>
              </div>
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
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">CTC Package</p>
                      <p className="font-bold text-primary">₹{selectedDrive.ctc_amount} LPA</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Location</p>
                      <p className="font-bold">{selectedDrive.work_location || "PAN India"}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-destructive">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Deadline</p>
                      <p className="font-bold">{selectedDrive.application_deadline ? new Date(selectedDrive.application_deadline).toLocaleDateString() : "ASAP"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold flex items-center gap-2"><FileText className="h-4 w-4" /> Job Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedDrive.job_description || "No description provided."}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-bold">Eligibility Details</h4>
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                      <div className="flex justify-between pr-4"><span>Min CGPA:</span> <span className="font-bold">{selectedDrive.min_cgpa}</span></div>
                      <div className="flex justify-between pr-4"><span>Max Backlogs:</span> <span className="font-bold">{selectedDrive.max_backlogs}</span></div>
                      <div className="flex justify-between pr-4"><span>10th Mark:</span> <span className="font-bold">{selectedDrive.min_10th_mark}%</span></div>
                      <div className="flex justify-between pr-4"><span>12th Mark:</span> <span className="font-bold">{selectedDrive.min_12th_mark}%</span></div>
                    </div>
                  </div>

                  {selectedDrive.bond_details && (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                      <p className="text-xs font-bold text-orange-800 uppercase mb-1">Bond & Terms</p>
                      <p className="text-sm text-orange-700">{selectedDrive.bond_details}</p>
                    </div>
                  )}

                  {selectedDrive.applicationStatus === 'interview_scheduled' && selectedDrive.applicationDetails?.interview_timestamp && (
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                      <p className="text-xs font-bold text-purple-800 uppercase mb-1">Interview Scheduled</p>
                      <p className="text-sm text-purple-700 font-bold">
                        {new Date(selectedDrive.applicationDetails.interview_timestamp).toLocaleString('en-IN', {
                          dateStyle: 'full',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                  )}

                  {selectedDrive.applicationStatus === 'rejected_by_hod' || selectedDrive.applicationStatus === 'rejected_by_tpo' && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                      <p className="text-xs font-bold text-red-800 uppercase mb-1">Application Rejected</p>
                      <p className="text-sm text-red-700">
                        {selectedDrive.applicationDetails?.rejection_reason || "Unfortunately, your application was not selected for this drive."}
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
                ) : (
                  <Button className="bg-green-600 disabled:opacity-100" disabled>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Application Submitted
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
