import { useState, useEffect } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Download, Search, CheckCircle, Eye, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

export default function StudentsMaster() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  async function fetchApprovedStudents() {
    try {
      const { data, error } = await supabase
        .from("students_master")
        .select(`
          *,
          departments (name)
        `)
        .in("approval_status", ["approved_by_hod", "approved_by_tpo"]);

      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch records: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchApprovedStudents();
  }, []);

  const handleFinalApprove = async (studentId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("students_master")
        .update({ approval_status: "approved_by_tpo" })
        .eq("id", studentId);

      if (error) throw error;
      toast.success("Profile verified and finalized!");
      fetchApprovedStudents();
      setIsDetailsOpen(false);
    } catch (err: any) {
      toast.error("Verification failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToExcel = () => {
    const exportData = students.map((s) => {
      const { departments, ...rest } = s;
      return {
        ...rest,
        department_name: departments?.name,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students Master");
    XLSX.writeFile(workbook, "Students_Master_Records.xlsx");
  };

  const filteredStudents = students.filter(
    (s) =>
      s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.reg_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Students Master Repository</h1>
            <p className="text-muted-foreground">Comprehensive database of HOD-Verified student details.</p>
          </div>
          <Button onClick={exportToExcel} variant="outline" className="shadow-sm">
            <Download className="h-4 w-4 mr-2" /> Export to Excel
          </Button>
        </div>

        <Card className="shadow-premium border-primary/10">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Approved Students</CardTitle>
                <CardDescription>Verified profiles confirmed by respective HODs.</CardDescription>
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
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-center">
                <p className="text-sm text-muted-foreground">No records found matching your criteria.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 border-b">
                    <TableRow>
                      <TableHead className="min-w-[150px] text-[10px] uppercase font-black py-4">Student Name</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">Dept</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">Reg No</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">Batch</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-center">CGPA</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-center">Backlogs</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-center">History(A)</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-center">10th%</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-center">12th%</TableHead>
                      <TableHead className="min-w-[140px] text-[10px] uppercase font-black">Skills</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">Status</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-black pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id} className="hover:bg-primary/5 transition-colors border-b last:border-0 text-xs text-muted-foreground">
                        <TableCell className="font-bold py-2 text-primary">
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell className="font-medium">{student.departments?.name}</TableCell>
                        <TableCell className="font-mono text-[10px]">{student.reg_no}</TableCell>
                        <TableCell>{student.batches || "-"}</TableCell>
                        <TableCell className="font-black text-center text-foreground">{student.current_cgpa || "0"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={parseInt(student.current_backlogs || "0") > 0 ? "destructive" : "secondary"} className="text-[9px] px-1.5 h-4">
                            {student.current_backlogs || "0"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{student.history_of_arrears_count || "0"}</TableCell>
                        <TableCell className="text-center font-medium">{student.tenth_mark || "-"}</TableCell>
                        <TableCell className="text-center font-medium">{student.twelfth_mark || "-"}</TableCell>
                        <TableCell className="max-w-[120px] truncate" title={student.skills}>{student.skills || "-"}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={student.approval_status === 'approved_by_tpo' ? 'default' : 'secondary'}
                            className={`text-[9px] font-bold px-1.5 h-4 ${student.approval_status === 'approved_by_tpo' ? 'bg-green-600' : ''}`}
                          >
                            {student.approval_status === 'approved_by_tpo' ? 'VERIFIED' : 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-2 py-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-primary">Master Profile Details</DialogTitle>
              <DialogDescription>
                Full verification view for {selectedStudent?.first_name} {selectedStudent?.last_name}
              </DialogDescription>
            </DialogHeader>

            {selectedStudent && (
              <div className="space-y-8 py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Object.entries(selectedStudent).map(([key, value]) => {
                    if (['id', 'created_at', 'updated_at', 'approval_status', 'department_id', 'departments'].includes(key)) return null;
                    return (
                      <div key={key} className="space-y-1 p-2 bg-muted/30 rounded-md border border-muted">
                        <div className="text-[10px] uppercase text-muted-foreground font-black tracking-tighter leading-none">{key.replace(/_/g, ' ')}</div>
                        <div className="font-medium text-sm break-words">{String(value || "N/A")}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                  {selectedStudent.approval_status === "approved_by_hod" && (
                    <Button 
                      variant="default" 
                      className="bg-green-600 hover:bg-green-700 shadow-md" 
                      onClick={() => handleFinalApprove(selectedStudent.id)}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Verify & Finalize Record
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}
