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
  const [studentDeptId, setStudentDeptId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<StudentMasterFormData>({
    resolver: zodResolver(studentMasterSchema),
  });

  const currentYear = watch("current_year");
  const currentSemester = watch("current_semester");
  const diplomaStudied = watch("diploma_studied");
  const arrearStatus = watch("current_standing_arrear");
  const passportAvailable = watch("passport_available");
  const isHostellerType = watch("is_hosteller");
  const interestedInPlacement = watch("interested_in_placement");

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        // Fetch the backend department mapping generated during account creation
        const { data: profile } = await supabase
          .from("profiles")
          .select("department_id")
          .eq("id", user.id)
          .maybeSingle();
          
        if (profile?.department_id) {
          setStudentDeptId(profile.department_id);
        }

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
      // Basic Identity
      first_name: "Jane",
      last_name: "Doe",
      date_of_birth: "2003-08-15",
      gender: "Female",
      blood_group: "O+",
      marital_status: "Single",
      aadhar_number: "812345678901",
      pan_number: "ABCDE1234F",
      passport_available: "YES",
      passport_number: "Z9876543",
      
      // Contact & Demographics
      email_address: "jane.doe@example.com",
      alternate_email: "jane.alternate@gmail.com",
      mobile_number: "9876543210",
      whatsapp_number: "9876543210",
      nationality: "Indian",
      state: "Tamil Nadu",
      district: "Erode",
      mother_tongue: "Tamil",
      religion: "Hindu",
      community: "BC",
      caste: "Kongu Vellalar",

      // Academic Records
      tenth_percentage: "95.6%",
      tenth_mark: "478",
      tenth_board: "State Board",
      tenth_school_name: "Government Higher Secondary School, Erode",
      twelfth_percentage: "92.4%",
      twelfth_mark: "554",
      twelfth_school_board: "State Board",
      twelfth_school_name: "Government Higher Secondary School, Erode",
      diploma_studied: "NO",
      diploma_institute_name: "",
      diploma_stream: "",
      work_experience: "3 months summer internship at TechCorp as Frontend Developer Intern.",
      
      // College Performance
      current_year: "4",
      current_semester: "7",
      sem_1_cgpa: "8.5",
      sem_2_cgpa: "8.8",
      sem_3_cgpa: "8.4",
      sem_4_cgpa: "8.9",
      sem_5_cgpa: "9.1",
      sem_6_cgpa: "9.0",
      sem_7_cgpa: "8.7",
      sem_8_cgpa: "9.5",
      overall_cgpa: "8.8",
      current_standing_arrear: "NO",
      current_backlogs: "0",
      history_of_arrear: "None",
      history_of_arrears_count: "0",

      // College Details
      reg_no: "730920104032",
      roll_number: "20CSR032",
      degree_branches: "Computer Science and Engineering",
      regulations: "2021",
      batches: "2021-2025",
      section: "A",
      quota: "Government",
      medium: "English",
      mode_of_education: "Regular",
      mode_of_admission: "CQ",
      student_status: "Active",
      is_hosteller: "Hosteller",
      hostel_name: "Bhavani Boys Hostel",

      // Family & Communication
      father_guardian_name: "John Doe Sr.",
      occupation_father_guardian: "Farmer",
      father_mobile_number: "9988776655",
      mother_name: "Mary Doe",
      mother_mobile_number: "9988776644",
      is_parent_farmer: "YES",
      communication_door_street: "123, Main Street, Village Post",
      communication_area_village: "Bhavani Taluk",
      communication_pincode: "638301",

      // Placement Details
      interested_in_placement: "YES",
      placement_opt_out_reason: "",
      photo_url: "https://drive.google.com/open?id=demo_photo",
      resume_url: "https://drive.google.com/open?id=demo_resume",
      programming_languages: "Java, Python, C++",
      skills: "React, Node.js, SQL, MongoDB",
      projects: "E-Commerce Website, College API",
      internship_experience: "Frontend Developer at ABC Startup",
      certifications: "AWS Certified Cloud Practitioner",
      linkedin_url: "https://linkedin.com/in/janedoe",
      github_url: "https://github.com/janedoe",
      leetcode_url: "https://leetcode.com/janedoe",
      hackerrank_url: "https://hackerrank.com/janedoe",
      preferred_job_role: "Software Development Engineer",
      preferred_location: "Bangalore, Chennai",

      // Other Details
      extra_curricular: "NSS Volunteer, College Football Team Captain",
      geographic_classification: "Rural",
      is_physically_challenged: "NO",
      is_first_graduate: "YES",
      is_single_parent: "NO",
      is_ex_serviceman_child: "NO",
      is_andaman_nicobar: "NO",
    };
    
    // Merge with current data explicitly overriding all mockable fields
    reset({ ...demoData } as any);
    toast.success("Massive Demo Profile populated! 🚀");
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
        department_id: studentDeptId,
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
                    
                    {/* Basic Identity */}
                    <div className="space-y-2 md:col-span-3 text-primary font-semibold border-b pb-1">Basic Details</div>
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
                      <Label>Date of Birth</Label>
                      <Input {...register("date_of_birth")} type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <select 
                        {...register("gender")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Transgender">Transgender</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Blood Group</Label>
                      <select 
                        {...register("blood_group")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Marital Status</Label>
                      <select 
                        {...register("marital_status")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-2 md:col-span-3 text-primary font-semibold border-b pb-1 pt-4">Contact Information</div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input {...register("email_address")} placeholder="you@example.com" />
                      {errors.email_address && <p className="text-xs text-destructive">{errors.email_address.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Alternate Email Options</Label>
                      <Input {...register("alternate_email")} placeholder="Secondary Email" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      <Input {...register("mobile_number")} placeholder="10 Digit Number" />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp Number</Label>
                      <Input {...register("whatsapp_number")} placeholder="10 Digit Number" />
                    </div>

                    {/* Government ID */}
                    <div className="space-y-2 md:col-span-3 text-primary font-semibold border-b pb-1 pt-4">Government ID & Legal</div>
                    <div className="space-y-2">
                      <Label>Aadhar Number</Label>
                      <Input {...register("aadhar_number")} placeholder="12 Digit Number" />
                    </div>
                    <div className="space-y-2">
                      <Label>PAN Number</Label>
                      <Input {...register("pan_number")} placeholder="Alphabet/Numeric Combo" />
                    </div>
                    <div className="space-y-2">
                      <Label>Do you have a Passport?</Label>
                      <select 
                        {...register("passport_available")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select status</option>
                        <option value="NO">NO</option>
                        <option value="YES">YES</option>
                      </select>
                    </div>
                    {passportAvailable === "YES" && (
                      <div className="space-y-2">
                        <Label>Passport Number / Details</Label>
                        <Input {...register("passport_number")} placeholder="e.g. Z1234567" />
                      </div>
                    )}

                    {/* Demographics */}
                    <div className="space-y-2 md:col-span-3 text-primary font-semibold border-b pb-1 pt-4">Demographics</div>
                    <div className="space-y-2">
                      <Label>Nationality</Label>
                      <Input {...register("nationality")} placeholder="e.g. Indian" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input {...register("state")} placeholder="e.g. Tamil Nadu" />
                    </div>
                    <div className="space-y-2">
                      <Label>District</Label>
                      <Input {...register("district")} placeholder="e.g. Erode" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mother Tongue</Label>
                      <Input {...register("mother_tongue")} placeholder="e.g. Tamil" />
                    </div>
                    <div className="space-y-2">
                      <Label>Religion</Label>
                      <Input {...register("religion")} placeholder="e.g. Hindu" />
                    </div>
                    <div className="space-y-2">
                      <Label>Community</Label>
                      <select 
                        {...register("community")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Community</option>
                        <option value="OC">OC</option>
                        <option value="BC">BC</option>
                        <option value="BCM">BCM</option>
                        <option value="MBC">MBC</option>
                        <option value="DNC">DNC</option>
                        <option value="SC">SC</option>
                        <option value="SCA">SCA</option>
                        <option value="ST">ST</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Caste</Label>
                      <Input {...register("caste")} placeholder="Enter specific Caste" />
                    </div>

                  </CardContent>
                </Card>
              </TabsContent>

              {/* Academic Details - Reorganized */}
              <TabsContent value="academic">
                <Card className="border-primary/10 shadow-premium">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg">Academic Records</CardTitle>
                    <CardDescription>Schooling, diploma, work experience and current college performance.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1">10th Standard Info</div>
                    <div className="space-y-2">
                      <Label>10th Mark</Label>
                      <Input {...register("tenth_mark")} placeholder="e.g. 450" />
                    </div>
                    <div className="space-y-2">
                      <Label>10th Percentage</Label>
                      <Input {...register("tenth_percentage")} placeholder="e.g. 95%" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>10th School Name</Label>
                      <Input {...register("tenth_school_name")} placeholder="Your 10th school name" />
                    </div>

                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-4">12th Standard Info</div>
                    <div className="space-y-2">
                      <Label>12th Mark</Label>
                      <Input {...register("twelfth_mark")} placeholder="e.g. 550" />
                    </div>
                    <div className="space-y-2">
                      <Label>12th Percentage</Label>
                      <Input {...register("twelfth_percentage")} placeholder="e.g. 90%" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>12th School Name</Label>
                      <Input {...register("twelfth_school_name")} placeholder="Your 12th school name" />
                    </div>

                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-4">Diploma Info</div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Any Diploma studied after 10th/12th?</Label>
                      <select 
                        {...register("diploma_studied")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select option</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    {diplomaStudied === "YES" && (
                      <>
                        <div className="space-y-2">
                          <Label>Institute Name</Label>
                          <Input {...register("diploma_institute_name")} placeholder="Diploma institute name" />
                        </div>
                        <div className="space-y-2">
                          <Label>Stream / Branch</Label>
                          <Input {...register("diploma_stream")} placeholder="e.g. Computer Engineering" />
                        </div>
                      </>
                    )}

                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-4">Professional Experience</div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Any Work Experience?</Label>
                      <textarea
                        {...register("work_experience")}
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Detail any prior work experience in a professional manner. Leave blank if none."
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-4">College Performance</div>
                    <div className="space-y-2">
                      <Label>Current Year</Label>
                      <select 
                        {...register("current_year")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                        <option value="5">5th Year</option>
                      </select>
                    </div>
                    
                    {currentYear && (
                      <div className="space-y-2">
                        <Label>Current Semester</Label>
                        <select 
                          {...register("current_semester")}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select Semester</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                          <option value="6">6</option>
                          <option value="7">7</option>
                          <option value="8">8</option>
                          <option value="9">9</option>
                          <option value="10">10</option>
                        </select>
                      </div>
                    )}
                    
                    <div className="space-y-2 md:col-span-2 pt-2 border-t mt-2">
                      <Label className="text-muted-foreground mb-4 block text-xs">Based on exactly {currentSemester ? currentSemester : "0"} semesters completed/studying, enter your CGPA for each semester below.</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: Math.min(parseInt(currentSemester || "0") || 0, 10) }).map((_, i) => (
                          <div key={i} className="space-y-2">
                            <Label>Sem {i + 1} CGPA</Label>
                            <Input {...register(`sem_${i + 1}_cgpa` as keyof StudentMasterFormData)} placeholder="e.g. 8.5" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Overall CGPA</Label>
                      <Input {...register("overall_cgpa")} placeholder="e.g. 8.2" className="max-w-xs" />
                    </div>

                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-4">Arrear Information</div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Any Arrears?</Label>
                      <select 
                        {...register("current_standing_arrear")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-xs"
                      >
                        <option value="">Select</option>
                        <option value="NO">NO ARREARS</option>
                        <option value="YES">YES</option>
                      </select>
                    </div>
                    
                    {arrearStatus === "YES" && (
                      <>
                        <div className="space-y-2">
                          <Label>Current Arrear Count</Label>
                          <Input {...register("current_backlogs")} placeholder="e.g. 2" />
                        </div>
                        <div className="space-y-2">
                          <Label>History of Arrear / Arrear Details</Label>
                          <Input {...register("history_of_arrear")} placeholder="Total ever or specific details" />
                        </div>
                      </>
                    )}
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
                      <select 
                        {...register("degree_branches")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Department</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                        <option value="Agricultural Engineering">Agricultural Engineering</option>
                        <option value="Biomedical Engineering">Biomedical Engineering</option>
                        <option value="Bio Technology">Bio Technology</option>
                        <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                        <option value="CSE(Cyber Security)">CSE(Cyber Security)</option>
                        <option value="CSE(AI&ML)">CSE(AI&ML)</option>
                        <option value="CSE(Internet of Things)">CSE(Internet of Things)</option>
                        <option value="Computer Science and Design">Computer Science and Design</option>
                        <option value="Artificial Intelligence and Data Science">Artificial Intelligence and Data Science</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering</option>
                        <option value="Electronics and Communication Engineering">Electronics and Communication Engineering</option>
                        <option value="Electronics and Instrumentation Engineering">Electronics and Instrumentation Engineering</option>
                        <option value="Robotics and Automation">Robotics and Automation</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Chemical Engineering">Chemical Engineering</option>
                        <option value="M.Tech. CSE">M.Tech. CSE</option>
                        <option value="Management Studies">Management Studies</option>
                        <option value="Computer Applications">Computer Applications</option>
                        <option value="Science and Humanities">Science and Humanities</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Regulations</Label>
                      <Input {...register("regulations")} placeholder="e.g. 2021" />
                    </div>
                    <div className="space-y-2">
                      <Label>Batch</Label>
                      <Input {...register("batches")} placeholder="e.g. 2021-2025" />
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Input {...register("section")} placeholder="e.g. A" />
                    </div>
                    <div className="space-y-2">
                      <Label>Quota</Label>
                      <select 
                        {...register("quota")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Quota</option>
                        <option value="Government">Government (Counseling)</option>
                        <option value="Management">Management</option>
                        <option value="Sports">Sports</option>
                        <option value="NRI">NRI</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Medium</Label>
                      <select 
                        {...register("medium")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Medium</option>
                        <option value="English">English</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mode of Education</Label>
                      <select 
                        {...register("mode_of_education")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Mode</option>
                        <option value="Regular">Regular / Full-Time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Distance">Distance Education</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mode of Admission</Label>
                      <select 
                        {...register("mode_of_admission")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Mode</option>
                        <option value="CQ">CQ (Counseling Quota)</option>
                        <option value="MQ">MQ (Management Quota)</option>
                        <option value="Lapsed">Lapsed</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Student Status</Label>
                      <select 
                        {...register("student_status")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Status</option>
                        <option value="Active">Active (Studying)</option>
                        <option value="Completed">Completed (Alumni)</option>
                        <option value="Discontinued">Discontinued</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2 md:col-span-3 text-primary font-semibold border-b pb-1 pt-4">Accommodation Details</div>
                    <div className="space-y-2">
                      <Label>Hosteller / Day Scholar</Label>
                      <select 
                        {...register("is_hosteller")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Option</option>
                        <option value="Hosteller">Hosteller</option>
                        <option value="Day Scholar">Day Scholar</option>
                      </select>
                    </div>
                    {isHostellerType === "Hosteller" && (
                      <div className="space-y-2">
                        <Label>Hostel Name</Label>
                        <Input {...register("hostel_name")} placeholder="e.g. Boys Hostel A" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Placement Details */}
              <TabsContent value="placement">
                <Card className="border-primary/10 shadow-premium">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg">Placement & Professional Information</CardTitle>
                    <CardDescription>Prepare your profile for companies.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
                    
                    <div className="space-y-4 md:col-span-2 bg-primary/5 p-4 rounded-xl border border-primary/20">
                      <div className="space-y-2">
                        <Label className="text-lg font-bold text-primary">Are you interested in Placement?</Label>
                        <select 
                          {...register("interested_in_placement")}
                          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select Option</option>
                          <option value="YES">YES, I am interested in Placement</option>
                          <option value="NO">NO, I am NOT interested (Higher Studies / Business etc.)</option>
                        </select>
                      </div>
                      
                      {interestedInPlacement === "NO" && (
                        <div className="space-y-2 pt-2 border-t border-primary/10">
                          <Label className="text-destructive font-semibold">Reason for not opting for placement</Label>
                          <textarea
                            {...register("placement_opt_out_reason")}
                            rows={3}
                            className="flex w-full rounded-md border border-destructive/40 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Please provide your reason (e.g. Planning for Higher Studies, Running Family Business, Entrepreneurship, Govt Exam Preparation)"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-2">Essential Documents</div>
                    <div className="space-y-2">
                      <Label>Passport Size Photo URL / Link</Label>
                      <Input {...register("photo_url")} placeholder="https://drive.google.com/..." />
                      <p className="text-[10px] text-muted-foreground">Public Drive Link.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Resume URL / Link (PDF)</Label>
                      <Input {...register("resume_url")} placeholder="https://drive.google.com/..." />
                      <p className="text-[10px] text-muted-foreground">Public Drive Link.</p>
                    </div>

                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-4">Technical Profile</div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Known Programming Languages</Label>
                      <Input {...register("programming_languages")} placeholder="e.g. C, C++, Java, Python, JavaScript" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Other IT Skills</Label>
                      <Input {...register("skills")} placeholder="e.g. React, Node.js, PostgreSQL, Tailwind" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Projects (Title + Description)</Label>
                      <Input {...register("projects")} placeholder="Key academic or personal projects..." />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Internship Experience</Label>
                      <Input {...register("internship_experience")} placeholder="Describe any previous internships..." />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Certifications</Label>
                      <Input {...register("certifications")} placeholder="e.g. AWS Cloud Practitioner, Google Analytics" />
                    </div>

                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-4">Social & Coding Profiles (Optional)</div>
                    <div className="space-y-2">
                      <Label>LinkedIn Profile</Label>
                      <Input {...register("linkedin_url")} placeholder="https://linkedin.com/in/..." />
                    </div>
                    <div className="space-y-2">
                      <Label>GitHub Profile</Label>
                      <Input {...register("github_url")} placeholder="https://github.com/..." />
                    </div>
                    <div className="space-y-2">
                      <Label>LeetCode Profile</Label>
                      <Input {...register("leetcode_url")} placeholder="https://leetcode.com/u/..." />
                    </div>
                    <div className="space-y-2">
                      <Label>HackerRank Profile</Label>
                      <Input {...register("hackerrank_url")} placeholder="https://hackerrank.com/profile/..." />
                    </div>

                    <div className="space-y-2 md:col-span-2 text-primary font-semibold border-b pb-1 pt-4">Preferences</div>
                    <div className="space-y-2">
                      <Label>Preferred Job Role</Label>
                      <Input {...register("preferred_job_role")} placeholder="e.g. Full Stack Developer, Data Analyst" />
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
                      <Label>Extracurricular Activities</Label>
                      <Input {...register("extra_curricular")} placeholder="e.g. NSS, Sports, Cultural Clubs" />
                    </div>
                    <div className="space-y-2">
                      <Label>Geographic Classification</Label>
                      <select 
                        {...register("geographic_classification")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Area</option>
                        <option value="Urban">Urban (City)</option>
                        <option value="Semi-Urban">Semi-Urban</option>
                        <option value="Rural">Rural (Village)</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Physically Challenged?</Label>
                      <select 
                        {...register("is_physically_challenged")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Option</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>First Graduate?</Label>
                      <select 
                        {...register("is_first_graduate")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Option</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Single Parent?</Label>
                      <select 
                        {...register("is_single_parent")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Option</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Child of Ex-Serviceman (TN)?</Label>
                      <select 
                        {...register("is_ex_serviceman_child")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Option</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tamil origin from Andaman?</Label>
                      <select 
                        {...register("is_andaman_nicobar")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Option</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
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
