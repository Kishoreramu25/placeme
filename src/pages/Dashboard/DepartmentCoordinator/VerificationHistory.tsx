import { useState, useEffect } from "react";
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
import { Loader2, Eye, History, CheckCircle2, XCircle, Search, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function VerificationHistory() {
  const { departmentId } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  async function fetchHistory() {
    if (!departmentId) return;
    try {
      const { data, error } = await supabase
        .from("students_master")
        .select("*")
        .eq("department_id", departmentId)
        .in("approval_status", ["approved_by_hod", "approved_by_tpo", "rejected"])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch history: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, [departmentId]);

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name} ${s.reg_no}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verification History</h1>
          <p className="text-muted-foreground">
            View all past verification actions for your department.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-0 shadow-premium overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle>Past Records</CardTitle>
          <CardDescription>
            History of approved and rejected student profiles.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-center p-4 text-muted-foreground">
                No history found.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="min-w-[150px] text-[10px] uppercase font-black py-4">Student Name</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Reg No</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Batch</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-center">CGPA</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-center">Backlogs</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-center">History(A)</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-center">10th%</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-center">12th%</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-black pr-6">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/30 transition-colors border-b last:border-0 text-xs text-muted-foreground">
                      <TableCell className="font-bold py-2 text-foreground">{student.first_name} {student.last_name}</TableCell>
                      <TableCell className="font-mono text-[10px]">{student.reg_no}</TableCell>
                      <TableCell>{student.batches}</TableCell>
                      <TableCell className="font-black text-center text-foreground">{student.current_cgpa}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className="text-[9px] font-bold px-1.5 h-4"
                          variant={
                            student.approval_status === 'approved_by_tpo' ? 'default' : 
                            student.approval_status === 'approved_by_hod' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {student.approval_status === 'approved_by_tpo' ? 'VERIFIED' : 
                           student.approval_status === 'approved_by_hod' ? 'APPROVED' : 
                           'REJECTED'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{student.current_backlogs || "0"}</TableCell>
                      <TableCell className="text-center">{student.history_of_arrears_count || "0"}</TableCell>
                      <TableCell className="text-center">{student.tenth_mark || "-"}</TableCell>
                      <TableCell className="text-center">{student.twelfth_mark || "-"}</TableCell>
                      <TableCell className="text-right pr-4 py-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profile Detail View (Past Record)</DialogTitle>
            <DialogDescription>
              Viewing archived details for {selectedStudent?.first_name} {selectedStudent?.last_name}
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="grid gap-6 py-4">
               <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border">
                  {selectedStudent.approval_status === 'rejected' ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  <span className="text-sm font-semibold">
                    Current Status: {selectedStudent.approval_status.replace(/_/g, ' ').toUpperCase()}
                  </span>
               </div>

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

              <div className="flex justify-end pt-6 border-t">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close Review
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
