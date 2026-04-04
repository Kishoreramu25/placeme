import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarRange, GraduationCap, Target, UserCheck, XCircle, Search, RefreshCcw, Building2, AlertCircle, Loader2, ArrowUpRight, Briefcase, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatEligibleYearLabel } from "@/lib/eligibility";
import { DriveAttendanceDialog } from "@/components/dashboard/DriveAttendanceDialog";
import { fetchDriveRosterData } from "@/lib/drive-roster";

export default function UpcomingDrives() {
  const { departmentId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [drives, setDrives] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("oldest");
  const [errorProfile, setErrorProfile] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState<any | null>(null);
  const [missingYearCount, setMissingYearCount] = useState(0);

  const fetchData = async () => {
    if (!departmentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch drives that include this department
      const { data: eligibleDrives, error: driveErr } = await supabase
        .from('drive_eligible_departments')
        .select('drive_id')
        .eq('department_id', departmentId);

      if (driveErr) throw driveErr;
      const driveIds = eligibleDrives.map(d => d.drive_id);

      if (driveIds.length === 0) {
        setDrives([]);
        setLoading(false);
        return;
      }

      // 2. Fetch Drive details
      const { data: drivesData, error: drivesErr } = await supabase
        .from('placement_drives')
        .select(`
          *,
          companies(name)
        `)
        .in('id', driveIds)
        .eq('status', 'scheduled')
        .order('visit_date', { ascending: true });

      if (drivesErr) throw drivesErr;

      // 3. Fetch approved students only to surface missing year data warnings.
      const { data: approvedStudents, error: studentsErr } = await supabase
        .from("students_master")
        .select("id, current_year")
        .in('approval_status', ['approved_by_hod', 'approved_by_tpo']);
      if (studentsErr) throw studentsErr;

      setMissingYearCount((approvedStudents || []).filter((student) => !String(student.current_year || "").trim()).length);
      setDrives(drivesData || []);
    } catch (err: any) {
      console.error("Fetch Intel Error:", err);
      toast.error("Protocol Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (departmentId) {
      fetchData();
    } else if (!loading && !departmentId) {
       // Check if profile has department_id
       const timer = setTimeout(() => {
          if(!departmentId) setErrorProfile(true);
       }, 5000);
       return () => clearTimeout(timer);
    }
  }, [departmentId]);

  if (errorProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-700">
        <AlertCircle className="h-16 w-16 text-rose-500 mb-6" />
        <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tighter">Profile Configuration Error</h1>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">No Department Associated with this Command Account</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-8 rounded-none border-2 border-slate-900 font-black uppercase text-xs tracking-widest">Re-attempt sync</Button>
      </div>
    );
  }

  const filteredDrives = drives
    .filter(d => 
      (d.companies?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.role_offered && d.role_offered.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const dateA = new Date(a.visit_date || 0).getTime();
      const dateB = new Date(b.visit_date || 0).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-8 border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-6 w-1 bg-primary rounded-none" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Department Intelligence Stream</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Upcoming Drives</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Global recruitment tracker & departmental metrics</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="SEARCH PROTOCOL..." 
              className="pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white focus:ring-slate-900 rounded-none font-black text-[10px] uppercase tracking-widest transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={sortOrder} onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}>
            <SelectTrigger className="h-14 w-[180px] bg-white border-slate-200 font-black text-[10px] uppercase tracking-widest rounded-none">
              <SelectValue placeholder="Sort Drives" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest" className="text-[10px] font-black uppercase">
                New To Old
              </SelectItem>
              <SelectItem value="oldest" className="text-[10px] font-black uppercase">
                Old To New
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { toast.success("Intel Feed Refreshed"); fetchData(); }} variant="outline" className="h-14 w-14 p-0 border-slate-200 rounded-none bg-white hover:bg-slate-900 hover:text-white transition-all">
            <RefreshCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {!loading && missingYearCount > 0 && (
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em]">Year Data Required</p>
                <p className="mt-1 text-sm font-medium leading-relaxed">
                  {missingYearCount} approved student profile{missingYearCount === 1 ? "" : "s"} do not have `current_year`.
                  Year-based drive eligibility now uses only `students_master.current_year`, so those students will not be counted until their profile is updated.
                </p>
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col gap-6">
             <Skeleton className="h-64 w-full rounded-none" />
             <Skeleton className="h-64 w-full rounded-none" />
          </div>
        ) : filteredDrives.length === 0 ? (
          <div className="py-40 text-center border-2 border-dashed border-slate-100 rounded-none bg-slate-50/50">
            <CalendarRange className="h-20 w-20 mx-auto text-slate-200 mb-6" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">No Active Intelligence Streams</p>
          </div>
        ) : (
          filteredDrives.map(drive => (
            <DriveIntelCard key={drive.id} drive={drive} onOpenRoster={() => setSelectedDrive(drive)} />
          ))
        )}
      </div>

      {selectedDrive && (
        <DriveAttendanceDialog
          isOpen={!!selectedDrive}
          onOpenChange={(open) => !open && setSelectedDrive(null)}
          driveId={selectedDrive.id}
          companyName={selectedDrive.companies?.name || "Drive"}
        />
      )}
    </div>
  );
}

function DriveIntelCard({ drive, onOpenRoster }: { drive: any, onOpenRoster: () => void }) {
  const [stats, setStats] = useState({ eligible: 0, applied: 0, pending: 0, present: 0, absent: 0 });
  const [loadingAtt, setLoadingAtt] = useState(true);

  useEffect(() => {
    const fetchDriveSummary = async () => {
      setLoadingAtt(true);
      try {
        const roster = await fetchDriveRosterData(drive.id);
        const eligibleStudents = roster.students.filter((student) => student.isEligible);
        const appliedStudents = eligibleStudents.filter((student) => student.applied);
        const present = appliedStudents.filter((student) => student.attendanceStatus === "present").length;

        setStats({
          eligible: eligibleStudents.length,
          applied: appliedStudents.length,
          pending: Math.max(eligibleStudents.length - appliedStudents.length, 0),
          present,
          absent: Math.max(appliedStudents.length - present, 0),
        });
      } catch (err) {
        console.error(err);
        setStats({ eligible: 0, applied: 0, pending: 0, present: 0, absent: 0 });
      } finally {
        setLoadingAtt(false);
      }
    };
    fetchDriveSummary();
  }, [drive.id]);

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-orange-50/40 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-1 hover:shadow-[0_32px_100px_-52px_rgba(15,23,42,0.55)]">
      <div className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.16),_transparent_36%),linear-gradient(135deg,#0f172a,#1e293b)] px-8 py-7 text-white">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
                <Building2 className="h-5 w-5 text-orange-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">Recruitment Protocol</p>
                <p className="text-xs font-mono font-bold uppercase text-slate-100">#{drive.id.split("-")[0]}</p>
              </div>
            </div>
            <div>
              <h3 className="max-w-2xl text-3xl font-black uppercase tracking-tight text-white">{drive.companies?.name || "Company"}</h3>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-orange-200">{drive.role_offered || "General Profile"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[360px]">
            <InfoChip label="Visit Date" value={new Date(drive.visit_date).toLocaleDateString()} />
            <InfoChip label="Min CGPA" value={String(drive.min_cgpa || 0)} />
            <InfoChip label="Mode" value={String(drive.visit_mode || "Placement")} />
            <InfoChip label="Eligible Year" value={formatEligibleYearLabel(drive.eligible_batches || "All Students")} />
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid gap-4 md:grid-cols-5">
          <MetricBox label="Eligible" value={loadingAtt ? "..." : stats.eligible} icon={<GraduationCap className="h-4 w-4" />} color="text-slate-900" tone="slate" />
          <MetricBox label="Applied" value={loadingAtt ? "..." : stats.applied} icon={<UserCheck className="h-4 w-4" />} color="text-sky-700" tone="sky" />
          <MetricBox label="Pending" value={loadingAtt ? "..." : stats.pending} icon={<Target className="h-4 w-4" />} color="text-amber-700" tone="amber" />
          <MetricBox label="Present" value={loadingAtt ? "..." : stats.present} icon={<Sparkles className="h-4 w-4" />} color="text-emerald-700" tone="emerald" />
          <MetricBox label="Absent" value={loadingAtt ? "..." : stats.absent} icon={<XCircle className="h-4 w-4" />} color="text-rose-700" tone="rose" />
        </div>

        {!loadingAtt && stats.eligible === 0 && (
          <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <p className="text-xs font-black uppercase tracking-[0.22em]">
              No Students Are Eligible For This Drive
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed">
              This department was selected for the drive, but no students currently match the eligibility criteria.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 border-t border-dashed border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.24em]">Active Intelligence Feed</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">Drive Sync: {new Date().toLocaleTimeString()}</div>
            <Button onClick={onOpenRoster} className="rounded-full bg-slate-900 px-6 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white hover:bg-orange-500">
              View Eligible Students
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">{label}</p>
      <p className="mt-1 text-sm font-black uppercase tracking-wide text-white">{value}</p>
    </div>
  );
}

function MetricBox({ label, value, icon, color, tone }: { label: string, value: any, icon: any, color: string, tone: "slate" | "sky" | "amber" | "emerald" | "rose" }) {
  const toneClasses = {
    slate: "bg-slate-100 text-slate-500",
    sky: "bg-sky-100 text-sky-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
    rose: "bg-rose-100 text-rose-600",
  };

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
      <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
      </div>
    </div>
  );
}
