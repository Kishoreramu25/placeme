import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, CheckCircle2, XCircle, User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DriveAttendanceDialogProps {
  driveId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
}

export function DriveAttendanceDialog({ driveId, isOpen, onOpenChange, companyName }: DriveAttendanceDialogProps) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen && driveId) {
      fetchAttendance();
    }
  }, [isOpen, driveId]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_drive_attendance' as any, { p_drive_id: driveId });

      if (error) {
        console.error('Attendance fetch error:', error);
        throw error;
      }

      const combined = (data as any[] || []).map((student: any) => ({
        id: student.student_id,
        name: `${student.first_name || ""} ${student.last_name || ""}`,
        regNo: student.reg_no || "N/A",
        dept: student.department_name || "N/A",
        status: student.attendance_status || "absent",
        scannedAt: student.scanned_at,
        scannedBy: student.scanned_by
      }));

      setStudents(combined);
    } catch (err: any) {
      toast.error("Failed to load attendance: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Reg No", "Department", "Status", "Scanned At", "Scanned By"];
    const rows = students.map(s => [
      s.name,
      s.regNo,
      s.dept,
      s.status.toUpperCase(),
      s.scannedAt ? new Date(s.scannedAt).toLocaleString() : "N/A",
      s.scannedBy || "N/A"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${companyName}_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.regNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = students.filter(s => s.status === "present").length;
  const totalCount = students.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-premium bg-white rounded-3xl">
        <div className="bg-slate-900 px-8 py-6 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.1] -rotate-12 translate-x-8 -translate-y-4">
            <CheckCircle2 className="h-32 w-32" />
          </div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                 <User className="h-6 w-6 text-emerald-400" />
               </div>
               <div>
                 <DialogTitle className="text-2xl font-black tracking-tight uppercase">Drive Attendance</DialogTitle>
                 <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                   Real-time Monitoring | {companyName}
                 </DialogDescription>
               </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm space-y-1">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Approved</p>
               <p className="text-3xl font-black text-slate-900">{totalCount}</p>
            </div>
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl shadow-sm space-y-1">
               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Present Today</p>
               <p className="text-3xl font-black text-emerald-900">{presentCount}</p>
            </div>
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl shadow-sm space-y-1">
               <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Absent / Pending</p>
               <p className="text-3xl font-black text-amber-900">{totalCount - presentCount}</p>
            </div>
          </div>

          {/* Search and Export */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by Name or Reg No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border-slate-200 rounded-xl font-medium focus-visible:ring-slate-900"
              />
            </div>
            <Button 
               onClick={exportToCSV} 
               variant="outline" 
               className="h-10 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-black uppercase text-xs tracking-widest rounded-xl px-6 transition-all"
               disabled={students.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV Report
            </Button>
          </div>

          {/* Attendance Table */}
          {loading ? (
            <div className="flex h-64 items-center justify-center flex-col gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Records...</p>
            </div>
          ) : students.length > 0 ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-50/50">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="font-black text-[10px] uppercase text-slate-500 tracking-widest py-4">Student Identity</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500 tracking-widest py-4">Department</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500 tracking-widest py-4">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500 tracking-widest py-4">Scanned Information</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s) => (
                    <TableRow key={s.id} className="hover:bg-white transition-colors border-slate-200 group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                              <User className="h-5 w-5" />
                           </div>
                           <div className="space-y-0.5">
                             <p className="font-black text-slate-900 text-sm leading-none">{s.name}</p>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.regNo}</p>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-tighter">
                          {s.dept}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.status === "present" ? (
                          <Badge className="bg-emerald-500 text-white border-0 font-black text-[9px] uppercase tracking-widest px-2.5 py-1">
                            PRESENT
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-400 border-slate-200 font-black text-[9px] uppercase tracking-widest px-2.5 py-1">
                            ABSENT
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.scannedAt ? (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                               <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                               {new Date(s.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[9px] font-medium text-slate-500 italic">By: {s.scannedBy || "N/A"}</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-300">
                             <XCircle className="h-3 w-3" />
                             <span className="text-[10px] font-bold uppercase italic">Pending Scan</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
               <User className="h-16 w-16 text-slate-200 mb-4" />
               <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">No Approved Students</h3>
               <p className="text-sm text-slate-400 font-medium">Students with 'Approved by TPO' status will appear here.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
