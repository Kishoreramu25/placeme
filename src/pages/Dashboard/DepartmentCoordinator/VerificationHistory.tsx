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
import { Loader2, Eye, History, CheckCircle2, XCircle, Search, Download, Filter, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STUDENT_COLUMNS } from "@/lib/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as XLSX from 'xlsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function VerificationHistory() {
  const { departmentId } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  
  // Table Customization States
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    STUDENT_COLUMNS.slice(0, 15).map(c => c.key) // Default to first 15 for performance/cleanliness
  );
  const [isModifyTableOpen, setIsModifyTableOpen] = useState(false);
  
  // Precise Filtering States
  const [filterField, setFilterField] = useState<string>("all");
  const [filterValue, setFilterValue] = useState("");
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Multi-column search/filter result

  const toggleVisibleColumn = (key: string) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

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

  const promptDeleteRejectedStudent = (student: any) => {
    if (student.approval_status !== "rejected") {
      toast.error("Only rejected candidates can be deleted");
      return;
    }

    setStudentToDelete(student);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteRejectedStudent = async () => {
    if (!studentToDelete || !departmentId) return;

    try {
      const { error } = await supabase
        .from("students_master")
        .delete()
        .eq("id", studentToDelete.id)
        .eq("department_id", departmentId)
        .eq("approval_status", "rejected");

      if (error) throw error;

      setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
      if (selectedStudent?.id === studentToDelete.id) {
        setSelectedStudent(null);
        setIsDetailsOpen(false);
      }
      toast.success("Rejected candidate deleted successfully");
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    } finally {
      setIsDeleteConfirmOpen(false);
      setStudentToDelete(null);
    }
  };

  const filteredStudents = students
    .filter(s => {
      // 1. Precise Filtering (Targeted field) - ONLY if field is selected
      if (filterField !== "all" && filterValue) {
        const val = s[filterField];
        if (!val || !String(val).toLowerCase().includes(filterValue.toLowerCase())) return false;
      }
      
      // 2. Universal Search (Any field) - ONLY if search term exists
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = Object.values(s).some(val => 
          val && String(val).toLowerCase().includes(term)
        );
        if (!matchesSearch) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });


  const exportToExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error("No data to export");
      return;
    }

    if (visibleColumns.length === 0) {
      toast.error("Please select at least one column to export");
      return;
    }

    const wb = XLSX.utils.book_new();
    const exportData = filteredStudents.map(student => {
      const row: any = {};
      
      // Always include these core identification fields as they are "frozen" in the UI
      row["Status"] = student.approval_status?.replace(/_/g, ' ').toUpperCase() || "";
      row["Student Name"] = `${student.first_name} ${student.last_name || ''}`;
      row["Reg No"] = student.reg_no;

      // Include selected dynamic columns
      STUDENT_COLUMNS.forEach(col => {
        if (visibleColumns.includes(col.key)) {
          row[col.label] = student[col.key] || "";
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Master Database");
    XLSX.writeFile(wb, `Student_Master_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Data exported successfully with selected columns.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Data Base</h1>
        <p className="text-muted-foreground">
          Comprehensive repository of all verified and archived student records.
        </p>
      </div>

      {/* EXECUTIVE COMMAND BAR */}
      <div className="bg-white rounded-2xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <Button 
            onClick={exportToExcel}
            className="h-10 px-6 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md gap-2 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            <Download className="h-4 w-4" />
            Save (Download)
          </Button>
           
          <div className="flex items-center gap-3">
            <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
              <SelectTrigger className="h-10 w-44 bg-white font-semibold text-xs border-slate-200">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Latest Submissions</SelectItem>
                <SelectItem value="oldest">Oldest Records</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => setIsModifyTableOpen(true)}
              className="h-10 px-4 border-slate-200 bg-white shadow-sm gap-2 text-xs font-bold uppercase"
            >
              <Filter className="h-3 w-3" /> Modify Table
            </Button>
          </div>
        </div>

        <div className="p-6 bg-white space-y-4">
           {/* Omni-Search Engine */}
           <div className="flex flex-col md:flex-row gap-3">
              <div className="w-full md:w-64 shrink-0">
                 <Select value={filterField} onValueChange={setFilterField}>
                   <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 font-bold text-xs uppercase tracking-widest px-4">
                     <div className="flex items-center gap-2">
                        <span className="text-slate-400">Filter:</span>
                        <SelectValue placeholder="All Fields" />
                     </div>
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">Global Master Search</SelectItem>
                     {STUDENT_COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                   </SelectContent>
                 </Select>
              </div>

              <div className="relative flex-1">
                 <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                 <Input 
                   placeholder={filterField === "all" ? "Search across 100+ master fields..." : `Type to filter by ${STUDENT_COLUMNS.find(c => c.key === filterField)?.label}...`}
                   value={filterField === "all" ? searchTerm : filterValue}
                   onChange={(e) => filterField === "all" ? setSearchTerm(e.target.value) : setFilterValue(e.target.value)}
                   className="pl-12 h-12 text-base bg-slate-50/50 border-slate-200 focus-visible:ring-slate-900 rounded-xl font-medium placeholder:text-slate-400"
                 />
                 {(searchTerm || filterValue) && (
                   <Button 
                     variant="ghost" 
                     className="absolute right-2 top-2 h-8 px-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900"
                     onClick={() => {setSearchTerm(""); setFilterValue("");}}
                   >
                     Clear Filter
                   </Button>
                 )}
              </div>
           </div>
        </div>
      </div>

      <Card className="border-0 shadow-premium overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle>Master Records ({filteredStudents.length})</CardTitle>
          <CardDescription>
            Comprehensive grid of all historical approvals and rejections.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full overflow-x-auto">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-center p-4 text-muted-foreground">
                No history records found.
              </div>
            ) : (
              <div className="w-max min-w-full">
                <Table className="whitespace-nowrap border-separate border-spacing-0 border-l border-t border-slate-200">
                  <TableHeader className="bg-muted/50 sticky top-0 z-20">
                    <TableRow className="border-b shadow-sm">
                      {/* Frozen Actions */}
                      <TableHead className="min-w-[60px] w-[60px] text-center font-black uppercase text-[10px] tracking-wider sticky left-0 z-30 bg-muted/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-b border-slate-300">
                        Actions
                      </TableHead>
                      {/* Frozen Status */}
                      <TableHead className="min-w-[110px] w-[110px] text-center font-black uppercase text-[10px] tracking-wider sticky left-[60px] z-30 bg-muted/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-b border-slate-300">
                        Status
                      </TableHead>
                      {/* Frozen Name */}
                      <TableHead className="min-w-[180px] w-[180px] text-left font-black uppercase text-[10px] tracking-wider sticky left-[170px] z-30 bg-muted/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-b border-slate-300">
                        Student Name
                      </TableHead>
                      {/* Frozen Reg No */}
                      <TableHead className="min-w-[140px] w-[140px] text-left font-black uppercase text-[10px] tracking-wider sticky left-[350px] z-30 bg-muted/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-b border-slate-300">
                        Reg No
                      </TableHead>
                      {/* Frozen Placement Interest */}
                      <TableHead className="min-w-[110px] w-[110px] text-center font-black uppercase text-[10px] tracking-wider sticky left-[490px] z-30 bg-muted/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-b border-slate-300">
                        Interest
                      </TableHead>
                      
                      {/* Dynamic Columns */}
                      {STUDENT_COLUMNS.filter(col => visibleColumns.includes(col.key) && col.key !== 'interested_in_placement').map((col) => (
                        <TableHead 
                          key={col.key} 
                          className="min-w-[140px] px-4 font-black uppercase text-[10px] tracking-wider text-muted-foreground border-r border-b border-slate-300"
                        >
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow 
                        key={student.id} 
                        className="hover:bg-muted/30 transition-colors border-b last:border-0 group"
                      >
                        {/* Frozen Actions Cell */}
                        <TableCell className="text-center sticky left-0 z-10 bg-background group-hover:bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] p-2 w-[60px] border-r border-b border-slate-200">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0 text-primary hover:text-primary hover:bg-primary/10 transition-colors rounded-full"
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {student.approval_status === "rejected" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors rounded-full"
                                onClick={() => promptDeleteRejectedStudent(student)}
                                title="Delete rejected candidate"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>

                        {/* Frozen Status */}
                        <TableCell className="text-center sticky left-[60px] z-10 bg-background group-hover:bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] p-2 w-[110px] border-r border-b border-slate-200">
                          <Badge 
                            className="text-[9px] font-bold px-1.5 h-4 w-full justify-center"
                            variant={
                              student.approval_status === 'approved_by_tpo' ? 'default' : 
                              student.approval_status === 'approved_by_hod' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {student.approval_status === 'approved_by_tpo' ? 'TPO VERIFIED' : 
                             student.approval_status === 'approved_by_hod' ? 'HOD APPROVED' : 
                             'REJECTED'}
                          </Badge>
                        </TableCell>

                        {/* Frozen Name Cell */}
                        <TableCell className="font-bold py-3 px-4 text-foreground sticky left-[170px] z-10 bg-background group-hover:bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[180px] w-[180px] border-r border-b border-slate-200" title={`${student.first_name} ${student.last_name || ''}`}>
                          {student.first_name} {student.last_name}
                        </TableCell>

                        {/* Frozen Reg No Cell */}
                        <TableCell className="font-mono text-xs px-4 text-muted-foreground sticky left-[350px] z-10 bg-background group-hover:bg-muted/50 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.05)] truncate max-w-[140px] w-[140px] border-r border-b border-slate-200">
                          {student.reg_no}
                        </TableCell>

                        {/* Frozen Placement Interest Cell */}
                        <TableCell className="text-center sticky left-[490px] z-10 bg-background group-hover:bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] p-2 w-[110px] border-r border-b border-slate-200">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2",
                              student.interested_in_placement?.toLowerCase() === 'yes' 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-rose-50 text-rose-600 border-rose-200"
                            )}
                          >
                            {student.interested_in_placement || "N/A"}
                          </Badge>
                        </TableCell>

                        {/* Dynamic Data Cells */}
                        {STUDENT_COLUMNS.filter(col => visibleColumns.includes(col.key) && col.key !== 'interested_in_placement').map((col) => {
                          const val = student[col.key];
                          return (
                            <TableCell 
                              key={col.key} 
                              className={cn(
                                "px-4 py-3 text-xs truncate max-w-[200px] border-r border-b border-slate-200",
                                !val ? "text-muted-foreground/30 italic" : "text-muted-foreground"
                              )}
                              title={String(val || "N/A")}
                            >
                              {val ? String(val) : "-"}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-11/12 border-primary/20 shadow-2xl p-0">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30 sticky top-0 z-50 backdrop-blur-md">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              Archived Profile Review
            </DialogTitle>
            <DialogDescription className="text-sm">
              Comprehensive historical view for <span className="font-bold text-foreground">{selectedStudent?.first_name} {selectedStudent?.last_name}</span> ({selectedStudent?.reg_no})
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="grid gap-6 p-6">
               <div className="flex items-center gap-3 p-4 bg-muted/60 rounded-xl border border-primary/10 shadow-sm">
                  {selectedStudent.approval_status === 'rejected' ? (
                    <XCircle className="h-6 w-6 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Final Record Status</span>
                    <span className={cn(
                      "text-lg font-black tracking-tight",
                      selectedStudent.approval_status === 'rejected' ? 'text-destructive' : 'text-green-600'
                    )}>
                      {selectedStudent.approval_status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
               </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 text-sm mt-2">
                {STUDENT_COLUMNS.map((col) => {
                  const val = selectedStudent[col.key];
                  return (
                    <div key={col.key} className="border-b border-border/50 pb-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1 line-clamp-1" title={col.label}>
                        {col.label}
                      </div>
                      <div className={cn(
                        "font-medium truncate",
                        !val && "text-muted-foreground/40 italic"
                      )} title={String(val || "N/A")}>
                        {val ? String(val) : "Not Provided"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-6 border-t mt-4 sticky bottom-0 bg-background pb-2">
                {selectedStudent?.approval_status === "rejected" && (
                  <Button
                    variant="destructive"
                    onClick={() => promptDeleteRejectedStudent(selectedStudent)}
                    className="mr-3 w-full sm:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Candidate
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="w-full sm:w-auto hover:bg-destructive hover:text-white transition-colors">
                  Close Archive
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rejected candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {studentToDelete?.first_name} {studentToDelete?.last_name} from the HOD student database. This action should only be used for rejected records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRejectedStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODIFY TABLE DIALOG */}
      <Dialog open={isModifyTableOpen} onOpenChange={setIsModifyTableOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 border-primary/20 shadow-2xl overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/40 shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Modify Table Display
            </DialogTitle>
            <DialogDescription>
              Select which columns should be visible in your live Master Database view.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-3 border-b bg-primary/5 shadow-inner shrink-0 gap-3">
            <div className="text-sm font-semibold text-primary shrink-0">
              <Badge variant="secondary" className="mr-2">{visibleColumns.length}</Badge> 
              of {STUDENT_COLUMNS.length} Columns Visible
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="flex gap-2 shrink-0">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setVisibleColumns(STUDENT_COLUMNS.map(c => c.key))} 
                  className="h-8 shadow-sm"
                >
                  Select All
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setVisibleColumns([])} 
                  className="h-8 shadow-sm"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto p-6 flex-1 bg-muted/5 min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STUDENT_COLUMNS.map(col => (
                <Label 
                  key={col.key} 
                  htmlFor={`visible-${col.key}`}
                  className="flex items-start space-x-3 bg-background p-3 rounded-lg border shadow-sm hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer group"
                >
                  <Checkbox 
                    id={`visible-${col.key}`} 
                    checked={visibleColumns.includes(col.key)}
                    onCheckedChange={() => toggleVisibleColumn(col.key)}
                    className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <span className="text-[13px] font-semibold leading-tight group-hover:text-primary transition-colors">
                      {col.label}
                    </span>
                  </div>
                </Label>
              ))}
            </div>
          </div>

          <div className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
            <Button 
              variant="outline"
              className="gap-2 shadow-sm w-full sm:w-auto border-emerald-600 text-emerald-600 hover:bg-emerald-50" 
              onClick={() => {
                exportToExcel();
              }}
            >
              <Download className="h-4 w-4" />
              Download Selected Data
            </Button>
            <Button className="gap-2 shadow-md w-full sm:w-auto bg-slate-900" onClick={() => setIsModifyTableOpen(false)}>
              Apply Table Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
