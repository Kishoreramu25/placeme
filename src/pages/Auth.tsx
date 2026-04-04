import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { loginSchema, signupSchema, LoginFormData, SignupFormData } from "@/lib/validations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, GraduationCap, AlertCircle, Users, BookOpen, TrendingUp, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type AppRole = "placement_officer" | "department_coordinator" | "management" | "student";

interface Department {
  id: string;
  name: string;
  code: string;
}



export default function Auth() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "login");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  const navigate = useNavigate();
  const { user, role, authError, signIn, signUp } = useAuth();
  const displayError = error ?? authError;

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Signup form
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: undefined,
      departmentId: null,
    },
  });

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from("departments").select("id, name, code").order("name");
      if (data) setDepartments(data);
    };
    fetchDepartments();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && role) {
      const redirectPath =
        role === "placement_officer"
          ? "/tpo"
          : role === "department_coordinator"
            ? "/hod"
            : role === "management"
              ? "/management"
              : "/student";
      navigate(redirectPath, { replace: true });
    }
  }, [user, role, navigate]);

  const handleLogin = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    const { data: authData, error } = await signIn(data.email, data.password);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (error.message.includes("Email not confirmed")) {
        setError("Please verify your email address before signing in.");
      } else if (error.message.toLowerCase().includes("rate limit") || error.message.toLowerCase().includes("too many requests")) {
        setError("Security limit exceeded. Please use a different email address (e.g. user+1@gmail.com) or wait 15 minutes.");
      } else {
        setError(error.message);
      }
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      // Success: The useEffect will handle redirect once role is loaded.
      // We can keep loading true for a moment.
      setTimeout(() => {
        // If still here after 3 seconds, something might be stuck
        setIsLoading(false);
        // Maybe show a hint if not redirected?
      }, 3000);
    } else {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setError(null);
    setIsLoading(true);

    if (!data.role) {
      setError("Please select a role");
      setIsLoading(false);
      return;
    }

    if ((data.role === "department_coordinator" || data.role === "student") && !data.departmentId) {
      setError("Please select your department");
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(
      data.email,
      data.password,
      data.fullName,
      data.role,
      data.departmentId
    );

    if (error) {
      if (error.message.includes("User already registered")) {
        setError("An account with this email already exists. Please sign in instead.");
      } else if (error.message.toLowerCase().includes("rate limit") || error.message.toLowerCase().includes("too many requests")) {
        setError("Security limit exceeded. Please use a different email address (e.g. user+1@gmail.com) to sign up immediately.");
      } else {
        setError(error.message);
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const seedDepartments = async () => {
    setIsLoading(true);
    try {
      const defaultDepts = [
        { name: "Civil Engineering", code: "CIVIL" },
        { name: "Agricultural Engineering", code: "AGRI" },
        { name: "Biomedical Engineering", code: "BME" },
        { name: "Bio Technology", code: "BIOTECH" },
        { name: "Computer Science and Engineering", code: "CSE" },
        { name: "CSE(Cyber Security)", code: "CSE-CS" },
        { name: "CSE(AI&ML)", code: "CSE-AIML" },
        { name: "CSE(Internet of Things)", code: "CSE-IOT" },
        { name: "Computer Science and Design", code: "CSD" },
        { name: "Artificial Intelligence and Data Science", code: "AIDS" },
        { name: "Information Technology", code: "IT" },
        { name: "Electrical and Electronics Engineering", code: "EEE" },
        { name: "Electronics and Communication Engineering", code: "ECE" },
        { name: "Electronics and Instrumentation Engineering", code: "EIE" },
        { name: "Robotics and Automation", code: "RA" },
        { name: "Mechanical Engineering", code: "MECH" },
        { name: "Chemical Engineering", code: "CHEM" },
        { name: "M.Tech. CSE", code: "MTECH-CSE" },
        { name: "Management Studies", code: "MBA" },
        { name: "Computer Applications", code: "MCA" },
        { name: "Artificial Intelligence and Machine learning", code: "AIML-FULL" },
        { name: "Science and Humanities", code: "S&H" },
      ];

      const { error } = await supabase.from("departments").upsert(defaultDepts, { onConflict: "code" });
      if (error) throw error;

      toast.success("Departments initialized successfully!");
      // Refresh list
      const { data } = await supabase.from("departments").select("id, name, code").order("name");
      if (data) setDepartments(data);
    } catch (err: any) {
      toast.error("Failed to seed departments: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black">
        {/* Background Image - Centered and Full Coverage */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/auth-bg.png')" }}
        />
        {/* Suitable Overlay - Semi-transparent black for text readability */}
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 flex flex-col justify-center h-full px-12 py-16">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm p-2">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">ESEC</h1>
              <p className="text-white/60">Placement Management System</p>
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight text-white">
              ERODE SENGUNTHAR ENGINEERING COLLEGE
            </h2>
            <p className="text-lg text-white/70 max-w-md">
              A comprehensive platform for managing placement drives, tracking company visits,
              and generating actionable insights for better outcomes.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-sm text-white/60">Companies</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
                <div className="text-2xl font-bold text-white">95%</div>
                <div className="text-sm text-white/60">Placement Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 p-1">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold">ESEC</span>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {displayError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}

            {/* Login Tab */}
            <TabsContent value="login">
              <Card className="border-0 shadow-premium">
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>Enter your credentials to access your dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        {...loginForm.register("email")}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...loginForm.register("password")}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <Card className="border-0 shadow-premium">
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>Select your role and enter your details</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-6">
                    {/* Role Selection */}
                    <div className="space-y-3">
                      <Label>Select your role</Label>
                      <Select
                        onValueChange={(value) => {
                          signupForm.setValue("role", value as AppRole);
                          // Clear department if not HOD or Student
                          if (value !== "department_coordinator" && value !== "student") {
                            signupForm.setValue("departmentId", null);
                          }
                        }}
                      >
                        <SelectTrigger className={cn(signupForm.formState.errors.role && "border-destructive")}>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="placement_officer">Placement Officer</SelectItem>
                          <SelectItem value="department_coordinator">HOD (Department Coordinator)</SelectItem>
                        </SelectContent>
                      </Select>
                      {signupForm.formState.errors.role && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.role.message}
                        </p>
                      )}
                    </div>

                    {/* Department Selection (for HODs and students) */}
                    {(signupForm.watch("role") === "department_coordinator" || signupForm.watch("role") === "student") && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          Department <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          onValueChange={(value) => signupForm.setValue("departmentId", value)}
                        >
                          <SelectTrigger className={cn(signupForm.formState.errors.departmentId && "border-destructive")}>
                            <SelectValue placeholder="Select your department" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {departments.length > 0 ? (
                              departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-center text-muted-foreground">
                                No departments found. {role === "placement_officer" && "Click 'Initialize' below."}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {signupForm.formState.errors.departmentId && (
                          <p className="text-xs text-destructive">
                            {signupForm.formState.errors.departmentId.message}
                          </p>
                        )}
                        {departments.length === 0 && role === "placement_officer" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={seedDepartments}
                            disabled={isLoading}
                          >
                            Initialize Departments
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        placeholder="John Doe"
                        {...signupForm.register("fullName")}
                      />
                      {signupForm.formState.errors.fullName && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        {...signupForm.register("email")}
                      />
                      {signupForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...signupForm.register("password")}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                        >
                          {showSignupPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {signupForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>



      {/* © Zenetive Infotech — hidden for now */}
    </div>
  );
}
