import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  QrCode, User, Building2, CheckCircle2, AlertCircle, 
  Loader2, ArrowLeft, ShieldCheck, UserCheck, Search,
  RefreshCw, Camera, Scan, XCircle, Info
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [drive, setDrive] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentIds, setCurrentIds] = useState<{ student_id: string; drive_id: string } | null>(null);
  const [scannedBy, setScannedBy] = useState("");
  const [isAlreadyPresent, setIsAlreadyPresent] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check for Secure Context (HTTPS/Localhost)
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      toast.error("Live Camera requires HTTPS. Using 'Camera App' fallback for you.", {
        duration: 5000
      });
    }

    if (scanning) {
      // Delay slightly to ensure DOM is rendered
      const timer = setTimeout(() => {
        const element = document.getElementById("qr-reader");
        if (!element) {
          console.warn("Scanner container 'qr-reader' not found in DOM yet.");
          return;
        }

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scanner.render(onScanSuccess, (err) => {
          if (!err.includes("No QR code found")) {
             console.warn("Scanner Status:", err);
          }
        });

        scannerRef.current = scanner;
      }, 100);

      return () => clearTimeout(timer);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [scanning]);

  const requestPermission = async () => {
    setLoading(true);
    setPermissionError(null);
    try {
      // Use Html5Qrcode to request permission by trying to list cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setHasPermission(true);
        setScanning(true);
        toast.success("Camera access granted!");
      } else {
        throw new Error("No cameras found on this device.");
      }
    } catch (err: any) {
      console.error("Camera Access Error:", err);
      const msg = err.message || "Generic camera error";
      setPermissionError(msg);
      toast.error(`Permission Denied: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // Use a hidden container or direct scan for files
      const html5QrCode = new Html5Qrcode("qr-reader-hidden");
      const decodedText = await html5QrCode.scanFile(file, true);
      onScanSuccess(decodedText);
    } catch (err) {
      console.error("QR Scan Error:", err);
      toast.error("Could not find a valid QR code in that photo. Try again.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  async function onScanSuccess(decodedText: string) {
    try {
      const url = new URL(decodedText);
      const studentId = url.searchParams.get("student_id");
      const driveId = url.searchParams.get("drive_id");

      if (!studentId || !driveId) {
        toast.error("Invalid QR Code: Missing parameters");
        return;
      }

      setScanning(false);
      if (scannerRef.current) {
        await scannerRef.current.clear();
      }
      
      setCurrentIds({ student_id: studentId, drive_id: driveId });
      fetchDetails(studentId, driveId);

    } catch (err) {
      console.error("Invalid QR encoded data", err);
      toast.error("Invalid QR Code detected");
    }
  }

  async function fetchDetails(studentId: string, driveId: string) {
    setLoading(true);
    try {
      // 1. Fetch Student from students_master
      const { data: studentData, error: studentError } = await supabase
        .from('students_master')
        .select('id, first_name, last_name, reg_no, roll_number, photo_url, department_id, departments(name)')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      // 2. Fetch Drive from placement_drives
      const { data: driveData, error: driveError } = await supabase
        .from('placement_drives')
        .select('*, companies(name)')
        .eq('id', driveId)
        .single();
      
      if (driveError) throw driveError;
      setDrive(driveData);

      // 3. Verify if already marked using get_drive_attendance RPC
      const { data: attendance, error: attError } = await supabase
        .rpc('get_drive_attendance' as any, { p_drive_id: driveId });

      if (attError) throw attError;

      const currentAtt = (attendance as any[] || []).find(a => a.student_id === studentId);
      if (currentAtt?.attendance_status === 'present') {
        setIsAlreadyPresent(true);
        toast.warning(`${studentData.first_name} is already marked present!`);
      } else {
        setIsAlreadyPresent(false);
      }

    } catch (err: any) {
      toast.error("Error fetching student details: " + err.message);
      resetScanner();
    } finally {
      setLoading(false);
    }
  }

  const markPresent = async () => {
    if (!scannedBy.trim()) {
      toast.error("Please enter your name (TPO/Invigilator)");
      return;
    }

    if (!currentIds) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('drive_attendance' as any)
        .insert({
          drive_id: currentIds.drive_id,
          student_id: currentIds.student_id,
          status: 'present',
          scanned_at: new Date().toISOString(),
          scanned_by: scannedBy
        });

      if (error) throw error;

      toast.success(`✅ ${student.first_name} ${student.last_name || ""} marked present!`);
      resetScanner();
    } catch (err: any) {
      toast.error("Error marking attendance: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetScanner = () => {
    setStudent(null);
    setDrive(null);
    setCurrentIds(null);
    setIsAlreadyPresent(false);
    setScanning(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl shadow-premium border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] -rotate-12 translate-x-8 -translate-y-8 pointer-events-none">
          <QrCode className="h-64 w-64" />
        </div>
        <div className="relative space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl rotate-3">
               <Scan className="h-5 w-5" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Attendance Scanner</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">Scan student QR codes to record their arrival for the recruitment drive.</p>
        </div>
        <div className="relative">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2 rounded-full font-bold uppercase text-[10px] tracking-widest animate-pulse h-8 flex items-center gap-2">
            <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
            Live Monitoring System
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
              {/* Scanner Section - Only show card if granted or scanning */}
              {(scanning || (hasPermission && !student)) && (
                <Card className={`overflow-hidden border-none shadow-premium rounded-[2rem] transition-all duration-500 ${scanning ? 'ring-2 ring-primary ring-offset-8' : 'opacity-40'}`}>
                  <CardHeader className="bg-slate-900 text-white p-6 pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                         <Camera className="h-4 w-4 text-primary" />
                         Active Camera
                      </CardTitle>
                      <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">
                        {scanning ? "Tracking" : "Paused"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 bg-slate-900">
                    <div id="qr-reader" className="w-full h-full min-h-[350px] bg-slate-900"></div>
                    <div id="qr-reader-hidden" className="hidden"></div>
                  </CardContent>
                  <CardFooter className="bg-slate-800/50 p-4 justify-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                      {scanning ? "Scanning for codes..." : "Permissions Granted"}
                    </p>
                  </CardFooter>
                </Card>
              )}

              {/* Camera Intent UI (Permission Request) */}
              {!hasPermission && !scanning && !student && (
                <div className="space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="bg-slate-50 border border-slate-200 p-8 rounded-[2rem] text-center space-y-4 shadow-inner">
                    <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                      <Camera className="h-8 w-8 text-slate-900" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">Camera Initiation Required</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                         To mark attendance, we need secure access to your device's camera.
                       </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={requestPermission}
                    disabled={loading}
                    className="w-full h-16 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-sm gap-3"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scan className="h-5 w-5" />}
                    Grant Camera Access
                  </Button>

                  {permissionError && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 text-rose-600">
                       <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                       <div className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                         Error: {permissionError}. Please ensure you have enabled camera permissions in your browser settings.
                       </div>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><Separator className="bg-slate-200" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-4 font-black text-slate-400 tracking-widest">or</span></div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-4 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                       <Info className="h-5 w-5 text-amber-600 shrink-0" />
                       <p className="text-[10px] font-bold text-amber-700 leading-tight uppercase tracking-wide">
                         Mobile tip: If live camera doesn't show, use the button below to take a photo.
                       </p>
                    </div>
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-16 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-50 font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all"
                    >
                      <Camera className="h-6 w-6" />
                      Open Camera App
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      capture="environment"
                      onChange={onFileSelected}
                    />
                  </div>
                </div>
              )}              
              {scanning && (
                <div className="space-y-6">
                  <div className="relative group p-4 bg-slate-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-inner">
                    <div id="qr-reader" className="overflow-hidden rounded-[2rem] aspect-square bg-slate-900 border-none relative z-10"></div>
                    <div className="absolute inset-0 z-0 bg-slate-200 animate-pulse"></div>
                    <div className="absolute inset-x-8 top-12 h-1 bg-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.5)] z-20 animate-scan pointer-events-none"></div>
                  </div>
                </div>
              )}

              {(scanning || (!student && hasPermission)) && (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-4 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                     <Info className="h-5 w-5 text-amber-600 shrink-0" />
                     <p className="text-[10px] font-bold text-amber-700 leading-tight uppercase tracking-wide">
                       Mobile Tip: If live camera fails, use the button below to take a photo.
                     </p>
                  </div>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-16 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-50 font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all"
                  >
                    <Camera className="h-6 w-6" />
                    Take Photo
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    capture="environment"
                    onChange={onFileSelected}
                  />
                  {scanning && (
                    <Button 
                      variant="ghost" 
                      onClick={() => {setScanning(false); setHasPermission(false);}}
                      className="w-full text-slate-400 uppercase font-black tracking-widest text-[10px] mt-2"
                    >
                      Close Scanner
                    </Button>
                  )}
                </div>
              )}

              {!scanning && hasPermission && !student && (
                <div className="text-center p-8 space-y-4">
                  <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto border-2 border-emerald-100 shadow-sm">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Permission Granted</p>
                  <Button 
                    onClick={() => setScanning(true)} 
                    className="w-full h-14 bg-slate-900 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl"
                  >
                    Start Scanner
                  </Button>
                </div>
              )}

              {!scanning && student && (
                <Button 
                  onClick={resetScanner} 
                  variant="outline" 
                  className="w-full h-16 border-slate-900 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-[0.98] bg-white text-slate-900 hover:bg-slate-50 shadow-xl"
                >
                  <RefreshCw className="mr-3 h-4 w-4" />
                  Mark Another
                </Button>
              )}
            </div>
         </div>
        {/* Details Section */}
        <div className="lg:col-span-7 space-y-6">
          {loading ? (
             <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-premium border border-slate-100">
                <Loader2 className="h-12 w-12 animate-spin text-slate-900 mb-4" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Verifying Attendance Data...</p>
             </div>
          ) : student && drive ? (
            <Card className="overflow-hidden border-none shadow-premium bg-white rounded-[2rem] animate-in slide-in-from-right duration-500">
              <div className="h-3 bg-gradient-to-r from-slate-900 via-primary to-slate-900"></div>
              <CardHeader className="flex flex-col items-center pt-8 pb-4">
                <div className="relative group">
                  <div className="h-32 w-32 rounded-[2rem] border-4 border-slate-50 bg-slate-100 flex items-center justify-center shadow-xl overflow-hidden rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    {student.photo_url ? (
                      <img src={student.photo_url} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-16 w-16 text-slate-300" />
                    )}
                  </div>
                  {isAlreadyPresent && (
                     <div className="absolute -bottom-2 -right-2 h-12 w-12 bg-amber-500 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl animate-in zoom-in-50 duration-500">
                       <XCircle className="h-6 w-6 text-white" />
                     </div>
                  )}
                  {!isAlreadyPresent && (
                     <div className="absolute -bottom-2 -right-2 h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl animate-in zoom-in-50 duration-500">
                       <CheckCircle2 className="h-6 w-6 text-white" />
                     </div>
                  )}
                </div>
                <div className="mt-6 text-center">
                  <Badge variant="outline" className="mb-2 bg-slate-50 border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-[0.2em] px-3 py-1 rounded-full">
                    {student.departments?.name || "N/A"}
                  </Badge>
                  <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">{student.first_name} {student.last_name}</CardTitle>
                  <div className="flex items-center justify-center gap-6 mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> {student.reg_no}</span>
                    <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
                    <span>ROLL: {student.roll_number || "N/A"}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-6">
                 <Separator className="bg-slate-100" />
                 
                 {/* Drive Info Overlay */}
                 <div className="p-6 bg-slate-900 rounded-[2rem] text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.2] transition-transform group-hover:scale-110 pointer-events-none">
                       <Building2 className="h-16 w-16 text-primary" />
                    </div>
                    <div className="relative space-y-3">
                       <p className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">Attending Drive</p>
                       <h4 className="text-xl font-black tracking-tight leading-tight">{drive.companies?.name} <span className="text-slate-500 block text-xs font-bold leading-none mt-1 uppercase tracking-widest">{drive.role_offered}</span></h4>
                    </div>
                 </div>

                 {!isAlreadyPresent ? (
                   <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="tpoName" className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Marked By (Your Name)</Label>
                        <Input 
                          id="tpoName"
                          placeholder="e.g. Dr. Ramesh (TPO)" 
                          value={scannedBy}
                          onChange={(e) => setScannedBy(e.target.value)}
                          className="h-14 border-2 border-slate-100 focus:border-slate-900 rounded-2xl font-bold bg-white placeholder:text-slate-200 text-slate-900 shadow-sm"
                        />
                      </div>
                      <Button 
                        className="w-full h-16 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 mt-4" 
                        onClick={markPresent}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          "Confirm Attendance"
                        )}
                      </Button>
                   </div>
                 ) : (
                   <div className="p-8 bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] flex flex-col items-center text-center space-y-3 animate-in fade-in zoom-in duration-500">
                      <div className="h-16 w-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                        <Info className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-black text-amber-900 uppercase tracking-tight">Access Restricted</h4>
                        <p className="text-xs font-bold text-amber-700 leading-relaxed uppercase tracking-widest">Already marked present for this drive.</p>
                      </div>
                   </div>
                 )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-premium border border-slate-100 border-dashed border-4 p-12 text-center">
               <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6 shadow-inner">
                  <ShieldCheck className="h-12 w-12" />
               </div>
               <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tight mb-2">System Ready for Scanning</h3>
               <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-[280px]">Point the camera at a student's drive pass to pull identity records and confirm attendance.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
         {[
           { icon: Camera, title: "1. Position QR", desc: "Keep the student's QR code within the highlighted viewfinder." },
           { icon: UserCheck, title: "2. Verify Identity", desc: "Confirm the photo and reg number matches the student present." },
           { icon: CheckCircle2, title: "3. Mark Present", desc: "Enter your name and save to finalize the attendance record." }
         ].map((step, i) => (
           <div key={i} className="bg-white/40 backdrop-blur-sm p-6 rounded-3xl border border-white/50 space-y-2">
              <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 mb-2">
                <step.icon className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{step.title}</h4>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{step.desc}</p>
           </div>
         ))}
      </div>
    </div>
  );
}
