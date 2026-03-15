import { useState, useEffect } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentMasterSchema, StudentMasterFormData } from "@/lib/validations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Save, Send, AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, PartyPopper } from "lucide-react";

export default function StudentProfile() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string>("pending_hod");

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [formData, setFormData] = useState<StudentMasterFormData | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentMasterFormData>({
    resolver: zodResolver(studentMasterSchema),
  });

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("students_master")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          reset(data);
          setStatus(data.approval_status);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [user, reset]);

  const fillDemoData = () => {
    const demoData: Partial<StudentMasterFormData> = {
      first_name: "John",
      last_name: "Doe",
      gender: "Male",
      date_of_birth: "2002-05-15",
      mobile_number: "9876543210",
      blood_group: "O+",
      aadhar_number: "123456789012",
      tenth_mark: "92%",
      tenth_board: "CBSE",
      twelfth_mark: "88%",
      twelfth_school_board: "CBSE",
      current_cgpa: "8.5",
      current_backlogs: "0",
      history_of_arrears_count: "0",
      degree_branches: "Computer Science and Engineering",
      batches: "2021-2025",
      reg_no: "710021104001",
      skills: "React, Node.js, PostgreSQL, Tailwind",
      resume_url: "https://drive.google.com/demo-resume",
      preferred_job_role: "Full Stack Developer",
    };
    
    // Merge with current data
    reset({ ...demoData } as any);
    toast.info("Form filled with demo data for testing!");
  };

  const onActualSubmit = async (data: StudentMasterFormData) => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    const toastId = toast.loading("Encrypting and submitting your profile...");
    
    try {
      const { id, created_at, updated_at: old_updated, approval_status: old_status, ...rest } = data as any;
      
      const { error } = await supabase.from("students_master").upsert({
        id: user.id,
        ...rest,
        approval_status: "pending_hod", 
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      
      setStatus("pending_hod");
      toast.success("Profile submitted successfully!", { id: toastId });
      setIsSuccessOpen(true);
    } catch (err: any) {
      toast.error("Failed to save profile: " + (err.message || "Unknown error"), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = (data: StudentMasterFormData) => {
    setFormData(data);
    setIsConfirmOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">My Master Profile</h1>
          <p className="text-muted-foreground">Verification status and profile management.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <Button 
            variant="outline" 
            type="button" 
            onClick={fillDemoData}
            className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary transition-all shadow-md active:scale-95"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Fill Demo Data (Testing)
          </Button>

          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
            status === 'approved_by_tpo' ? 'bg-green-100 text-green-700 border border-green-200' :
            status === 'approved_by_hod' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
            status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
            'bg-yellow-100 text-yellow-700 border border-yellow-200'
          }`}>
            {status === 'approved_by_tpo' ? '✓ Verified by TPO' : 
             status === 'approved_by_hod' ? '◎ Verified by HOD' : 
             status === 'rejected' ? '✕ Needs Revision' : 
             '⚠ Pending Verification'}
          </div>
        </div>
      </div>

        {status === "approved_by_tpo" && (
          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Profile Verified</AlertTitle>
            <AlertDescription>Your profile has been verified by the TPO. Any further changes will require re-approval.</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit, (err) => {
          console.error("Validation Errors:", err);
          toast.error("Please check the form for errors: " + Object.keys(err).join(", "));
        })}>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6 h-auto p-1 bg-muted/50 border">
              <TabsTrigger value="personal" className="py-2">Personal</TabsTrigger>
              <TabsTrigger value="academic" className="py-2">Academic</TabsTrigger>
              <TabsTrigger value="family" className="py-2">Family & Address</TabsTrigger>
              <TabsTrigger value="college" className="py-2">College Details</TabsTrigger>
              <TabsTrigger value="placement" className="py-2">Placement Details</TabsTrigger>
              <TabsTrigger value="other" className="py-2">Other</TabsTrigger>
            </TabsList>

            <div className="mt-6 space-y-6">
              {/* Personal Details as before... (keeping it same for now) */}
              <TabsContent value="personal">
                <Card className="border-primary/10 shadow-premium">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                    <CardDescription>Basic identification and contact details.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-3 pt-6">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input {...register("email_address")} placeholder="you@example.com" />
                      {errors.email_address && <p className="text-xs text-destructive">{errors.email_address.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input {...register("first_name")} placeholder="First Name" />
                      {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input {...register("last_name")} placeholder="Last Name" />
                      {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Input {...register("gender")} placeholder="Male/Female/Other" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input {...register("date_of_birth")} type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Blood Group</Label>
                      <Input {...register("blood_group")} placeholder="e.g., O+" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      <Input {...register("mobile_number")} placeholder="10 Digit Number" />
                    </div>
                    <div className="space-y-2">
                      <Label>Marital Status</Label>
                      <Input {...register("marital_status")} placeholder="Single/Married" />
                    </div>
                    <div className="space-y-2">
                      <Label>Aadhar Number</Label>
                      <Input {...register("aadhar_number")} placeholder="12 Digit Number" />
                    </div>
                    <div className="space-y-2">
                      <Label>Community</Label>
                      <Input {...register("community")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Caste</Label>
                      <Input {...register("caste")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Religion</Label>
                      <Input {...register("religion")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mother Tongue</Label>
                      <Input {...register("mother_tongue")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nationality</Label>
                      <Input {...register("nationality")} />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input {...register("state")} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Academic Details - Reorganized */}
              <TabsContent value="academic">
                <Card className="border-primary/10 shadow-premium">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg">Academic Records</CardTitle>
                    <CardDescription>Schooling and current college performance.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1">10th Standard Info</div>
                    <div className="space-y-2">
                      <Label>10th Percentage / CGPA</Label>
                      <Input {...register("tenth_mark")} placeholder="e.g. 95% or 9.5" />
                    </div>
                    <div className="space-y-2">
                      <Label>10th Board</Label>
                      <Input {...register("tenth_board")} placeholder="State Board / CBSE / ICSE" />
                    </div>

                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-4">12th Standard Info</div>
                    <div className="space-y-2">
                      <Label>12th Percentage / Mark</Label>
                      <Input {...register("twelfth_mark")} placeholder="e.g. 90%" />
                    </div>
                    <div className="space-y-2">
                      <Label>12th Board</Label>
                      <Input {...register("twelfth_school_board")} placeholder="State Board / CBSE / ICSE" />
                    </div>
                    <div className="space-y-2">
                      <Label>12th Register Number</Label>
                      <Input {...register("twelfth_register_number")} />
                    </div>
                    <div className="space-y-2">
                      <Label>12th School Name</Label>
                      <Input {...register("twelfth_school_name")} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>12th School Address</Label>
                      <Input {...register("twelfth_school_address")} />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-4">College Performance</div>
                    <div className="space-y-2">
                      <Label>Current CGPA / GPA</Label>
                      <Input {...register("current_cgpa")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Number of Backlogs</Label>
                      <Input {...register("current_backlogs")} placeholder="e.g. 0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Total History of Arrears (Count)</Label>
                      <Input {...register("history_of_arrears_count")} placeholder="Total ever" />
                    </div>
                    <div className="space-y-2">
                      <Label>Medium of Instruction</Label>
                      <Input {...register("medium_of_instruction")} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Family & Address */}
              <TabsContent value="family">
                <Card className="border-primary/10 shadow-premium">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg">Family & Communication</CardTitle>
                    <CardDescription>Parents details and communication address.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
                    <div className="space-y-2">
                      <Label>Father / Guardian Name</Label>
                      <Input {...register("father_guardian_name")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Father Mobile Number</Label>
                      <Input {...register("father_mobile_number")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mother Name</Label>
                      <Input {...register("mother_name")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mother Mobile Number</Label>
                      <Input {...register("mother_mobile_number")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Father Occupation</Label>
                      <Input {...register("occupation_father_guardian")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Is parent a Farmer/Agri Labour?</Label>
                      <Input {...register("is_parent_farmer")} placeholder="YES/NO" />
                    </div>
                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-2">Communication Address</div>
                    <div className="space-y-2">
                      <Label>Door No & Street Name</Label>
                      <Input {...register("communication_door_street")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Area / Village / Town</Label>
                      <Input {...register("communication_area_village")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pincode</Label>
                      <Input {...register("communication_pincode")} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* College Details */}
              <TabsContent value="college">
                <Card className="border-primary/10 shadow-premium">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg">College Information</CardTitle>
                    <CardDescription>Current enrollment details.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-3 pt-6">
                    <div className="space-y-2">
                      <Label>Register Number (College)</Label>
                      <Input {...register("reg_no")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Roll Number</Label>
                      <Input {...register("roll_number")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Department / Branch</Label>
                      <Input {...register("degree_branches")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Regulations</Label>
                      <Input {...register("regulations")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Batch (e.g. 2021-2025)</Label>
                      <Input {...register("batches")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Semester</Label>
                      <Input {...register("current_semester")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Input {...register("section")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quota</Label>
                      <Input {...register("quota")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Medium</Label>
                      <Input {...register("medium")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mode of Education</Label>
                      <Input {...register("mode_of_education")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mode of Admission</Label>
                      <Input {...register("mode_of_admission")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Student Status</Label>
                      <Input {...register("student_status")} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Placement Details - REPLACEMENT FOR EXTRA CURRICULAR */}
              <TabsContent value="placement">
                <Card className="border-primary/10 shadow-premium">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg">Placement & Professional Information</CardTitle>
                    <CardDescription>Prepare your profile for companies.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Resume URL / Link (PDF)</Label>
                      <Input {...register("resume_url")} placeholder="https://drive.google.com/..." />
                      <p className="text-[10px] text-muted-foreground">Please provide a public link to your Google Drive or similar resume PDF.</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Skills</Label>
                      <Input {...register("skills")} placeholder="e.g. Python, React, SQL, Problem Solving" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Internship Experience</Label>
                      <Input {...register("internship_experience")} placeholder="Describe any previous internships..." />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Projects (Title + Description)</Label>
                      <Input {...register("projects")} placeholder="Key academic or personal projects..." />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Certifications</Label>
                      <Input {...register("certifications")} placeholder="e.g. AWS Cloud Practitioner, Google Analytics" />
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Job Role</Label>
                      <Input {...register("preferred_job_role")} placeholder="e.g. Software Engineer, Data Analyst" />
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Location</Label>
                      <Input {...register("preferred_location")} placeholder="e.g. Bangalore, Chennai, Remote" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Other Information */}
              <TabsContent value="other">
                <Card className="border-primary/10 shadow-premium">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg">Other Details</CardTitle>
                    <CardDescription>Miscellaneous information.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-3 pt-6">
                    <div className="space-y-2">
                      <Label>Extra curricular Activities (Legacy)</Label>
                      <Input {...register("extra_curricular")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Geographic Classification</Label>
                      <Input {...register("geographic_classification")} placeholder="Urban/Rural" />
                    </div>
                    <div className="space-y-2">
                      <Label>Physically Challenged?</Label>
                      <Input {...register("is_physically_challenged")} placeholder="YES/NO" />
                    </div>
                    <div className="space-y-2">
                      <Label>Child of Ex-Serviceman (TN)?</Label>
                      <Input {...register("is_ex_serviceman_child")} placeholder="YES/NO" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tamil origin from Andaman?</Label>
                      <Input {...register("is_andaman_nicobar")} placeholder="YES/NO" />
                    </div>
                    <div className="space-y-2">
                      <Label>Studied Tamil in 10th?</Label>
                      <Input {...register("studied_tamil_10th")} placeholder="YES/NO" />
                    </div>
                    <div className="space-y-2">
                      <Label>Transport Mode</Label>
                      <Input {...register("transport")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Need Hostel?</Label>
                      <Input {...register("wants_hostel")} placeholder="YES/NO" />
                    </div>
                    <div className="space-y-2">
                      <Label>Is Hosteller?</Label>
                      <Input {...register("is_hosteller")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Is Transport?</Label>
                      <Input {...register("is_transport")} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end pt-8">
            <Button type="submit" size="lg" className="w-full md:w-auto shadow-lg bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-xl transition-all hover:scale-105 active:scale-95" disabled={isSaving || status === 'approved_by_tpo'}>
              {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
              Save and Submit for Approval
            </Button>
          </div>
        </form>

        {/* Confirmation Dialog */}
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent className="rounded-2xl border-primary/20 bg-card/95 backdrop-blur-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-2xl">
                <AlertCircle className="h-6 w-6 text-primary" />
                Confirm Submission
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base pt-2">
                Are you sure you want to submit your profile? This will send your details to your HOD for verification. Please ensure all academic data is accurate.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-4">
              <AlertDialogCancel className="rounded-xl">Review Again</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => formData && onActualSubmit(formData)}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6"
              >
                Yes, Submit Now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Success Dialog */}
        <AlertDialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
          <AlertDialogContent className="rounded-3xl border-none bg-gradient-to-br from-primary to-primary/80 text-white text-center p-8">
            <div className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <PartyPopper className="h-10 w-10 text-white" />
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-3xl font-bold text-center text-white">
                Awesome!
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/90 text-lg text-center pt-2 italic">
                Your profile has been successfully submitted and is now in the verification queue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 pt-6">
               <div className="bg-white/10 rounded-2xl p-4 text-sm flex items-start gap-3 text-left">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <p>Next step: Your HOD will review your academic records and forward them to the TPO.</p>
               </div>
            </div>
            <AlertDialogFooter className="flex justify-center sm:justify-center pt-6">
              <AlertDialogAction className="bg-white text-primary hover:bg-white/90 rounded-2xl px-10 font-bold py-6 text-lg w-full">
                Great, Thank You!
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
