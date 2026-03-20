import { useState, useEffect } from "react";
import { STUDENT_COLUMNS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Loader2, CheckCircle, XCircle, Eye, 
  History, Download, Search, FileSpreadsheet,
  AlertCircle, PartyPopper
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function StudentApprovals() {
  const { departmentId } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  async function fetchPendingStudents() {
    if (!departmentId) return;
    try {
      const { data, error } = await supabase
        .from("students_master")
        .select("*")
        .eq("department_id", departmentId)
        .eq("approval_status", "pending_hod")
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch students: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPendingStudents();
  }, [departmentId]);

  const handleAction = async (studentId: string, status: "approved_by_hod" | "rejected") => {
    setIsProcessing(studentId);
    try {
      const { error } = await supabase
        .from("students_master")
        .update({ 
          approval_status: status,
          updated_at: new Date().toISOString()
        })
        .eq("id", studentId);

      if (error) throw error;
      
      toast.success(status === "approved_by_hod" ? "Profile verified successfully" : "Profile rejected");
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setIsDetailsOpen(false);
    } catch (err: any) {
      toast.error("Action failed: " + err.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const exportToCSV = () => {
    if (students.length === 0) return;
    const headers = ["Name", "Reg No", "Batch", "Dept", "CGPA", "Backlogs", "Arrears", "10th", "12th", "Skills", "Role"];
    const rows = students.map(s => [
      `${s.first_name || ""} ${s.last_name || ""}`,
      s.reg_no || "",
      s.batch_year || s.batches || "",
      s.degree_branches || "",
      s.overall_cgpa || s.current_cgpa || "",
      s.current_backlogs || "0",
      s.history_of_arrears_count || s.history_of_arrear || "0",
      s.percentage_10th || s.mark_10th || "",
      s.percentage_12th || s.mark_12th || "",
      s.skills || "",
      s.preferred_job_role || ""
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `pending_verification_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(s).some(val => 
      val && String(val).toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Verifications</h1>
          <p className="text-muted-foreground">Review and verify student profile updates.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/hod/history')} className="gap-2">
            <History className="h-4 w-4" />
            View History
          </Button>
          <Button onClick={exportToCSV} variant="secondary" className="gap-2" disabled={students.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{students.length}</div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Waiting for Action</p>
          </CardContent>
        </Card>
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or registration number..." 
            className="pl-10 h-full bg-card border-muted-foreground/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-0 shadow-premium overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col h-64 items-center justify-center text-center p-8 space-y-4">
                <div className="bg-muted p-4 rounded-full">
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">All caught up!</h3>
                  <p className="text-muted-foreground text-sm">No profiles are waiting for verification.</p>
                </div>
              </div>
            ) : (
              <Table className="w-max min-w-full border-separate border-spacing-0">
                <TableHeader className="bg-muted/90 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[60px] w-[60px] text-[10px] uppercase font-black py-4 sticky left-0 z-30 bg-muted backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Actions</TableHead>
                    <TableHead className="min-w-[100px] w-[100px] text-[10px] uppercase font-black py-4 sticky left-[60px] z-30 bg-muted backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center">Status</TableHead>
                    <TableHead className="min-w-[170px] w-[170px] text-[10px] uppercase font-black py-4 sticky left-[160px] z-30 bg-muted backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Student Name</TableHead>
                    <TableHead className="min-w-[130px] w-[130px] text-[10px] uppercase font-black sticky left-[330px] z-30 bg-muted backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r">Reg No</TableHead>
                    <TableHead className="min-w-[100px] w-[100px] text-[10px] uppercase font-black py-4 sticky left-[460px] z-30 bg-muted backdrop-blur border-r text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Interest</TableHead>
                    {STUDENT_COLUMNS.filter(col => !['first_name', 'last_name', 'reg_no', 'interested_in_placement'].includes(col.key)).map((col) => (
                      <TableHead key={col.key} className="min-w-[180px] text-[10px] uppercase font-black whitespace-nowrap px-4 border-r border-border/40">
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/30 transition-colors border-b last:border-0 text-xs">
                      <TableCell className="py-1 px-2 sticky left-0 z-20 bg-background/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[60px]">
                        <div className="flex items-center gap-1 bg-background/80 rounded-md p-1 border">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-primary hover:bg-primary/20 hover:text-primary transition-all rounded-full"
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-green-600 hover:bg-green-100 hover:text-green-700 transition-all rounded-full"
                            onClick={() => handleAction(student.id, "approved_by_hod")}
                            disabled={isProcessing === student.id}
                          >
                            {isProcessing === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/20 transition-all rounded-full"
                            onClick={() => handleAction(student.id, "rejected")}
                            disabled={isProcessing === student.id}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="sticky left-[60px] z-20 bg-background/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[100px] text-center">
                        <Badge variant="secondary" className="text-[8px] font-bold px-1.5 h-4 justify-center bg-slate-100 text-slate-600 border-slate-200">PENDING</Badge>
                      </TableCell>
                      <TableCell className="font-bold py-2 sticky left-[160px] z-20 bg-background/95 backdrop-blur whitespace-nowrap uppercase tracking-tighter text-slate-900 pr-4 w-[170px]">
                        {student.first_name} {student.last_name}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] sticky left-[330px] z-20 bg-background/95 backdrop-blur border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap font-bold text-primary px-4 w-[130px]">
                        {student.reg_no}
                      </TableCell>
                      <TableCell className="sticky left-[460px] z-20 bg-background/95 backdrop-blur border-r text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[100px]">
                        {student.interested_in_placement?.toLowerCase() === 'yes' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 uppercase text-[8px] font-black tracking-widest px-2">Interested</Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-50 uppercase text-[8px] font-black tracking-widest px-2">NO</Badge>
                        )}
                      </TableCell>
                      
                      {STUDENT_COLUMNS.filter(col => !['first_name', 'last_name', 'reg_no', 'interested_in_placement'].includes(col.key)).map((col) => (
                        <TableCell key={col.key} className="whitespace-nowrap px-4 border-r border-border/20 text-slate-600 font-semibold" title={String(student[col.key] || "-")}>
                          {student[col.key] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

        {/* Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student Profile Review</DialogTitle>
              <DialogDescription>
                Full master details for {selectedStudent?.first_name} {selectedStudent?.last_name}
              </DialogDescription>
            </DialogHeader>

            {selectedStudent && (
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {Object.entries(selectedStudent).map(([key, value]) => {
                    if (['id', 'created_at', 'updated_at', 'approval_status', 'department_id'].includes(key)) return null;
                    return (
                      <div key={key} className="border-b pb-1">
                        <div className="text-[10px] uppercase text-muted-foreground font-bold">{key.replace(/_/g, ' ')}</div>
                        <div className="font-medium truncate">{String(value || "N/A")}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => handleAction(selectedStudent.id, "rejected")} disabled={isProcessing === selectedStudent.id}>
                    <XCircle className="h-4 w-4 mr-2" /> Reject Profile
                  </Button>
                  <Button 
                    variant="default" 
                    className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 font-bold group" 
                    onClick={() => handleAction(selectedStudent.id, "approved_by_hod")} 
                    disabled={isProcessing === selectedStudent.id}
                  >
                    {isProcessing === selectedStudent.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PartyPopper className="h-5 w-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-all text-yellow-300" />}
                    SUPER APPROVE & SEND TO TPO!
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}
