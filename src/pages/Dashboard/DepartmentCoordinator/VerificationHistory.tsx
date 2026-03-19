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
import { Loader2, Eye, History, CheckCircle2, XCircle, Search, Download, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  
  // Custom Export States
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>(
    STUDENT_COLUMNS.map(c => c.key)
  );
  const [columnSearchTerm, setColumnSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("all");

  const toggleColumn = (key: string) => {
    setSelectedExportColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllCols = () => setSelectedExportColumns(STUDENT_COLUMNS.map(c => c.key));
  const deselectAllCols = () => setSelectedExportColumns([]);

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

  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    if (searchColumn === "all") {
      // Universal search across completely all fields
      return Object.values(s).some(val => 
        val && String(val).toLowerCase().includes(term)
      );
    } else {
      // Targeted search over a specific column
      const val = s[searchColumn];
      return val && String(val).toLowerCase().includes(term);
    }
  });

  const exportToExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error("No data to export");
      return;
    }

    const columnsToExport = STUDENT_COLUMNS.filter(col => selectedExportColumns.includes(col.key));
    
    if (columnsToExport.length === 0) {
      toast.error("Please select at least one data column to export.");
      return;
    }

    const wb = XLSX.utils.book_new();
    const exportData = filteredStudents.map(student => {
      const row: any = {};
      
      // Always include base identifiable fields first
      row["Record Status"] = student.approval_status === "approved_by_tpo" ? "TPO Verified" :
                             student.approval_status === "approved_by_hod" ? "HOD Approved" :
                             "Rejected";
      row["Student Name"] = `${student.first_name} ${student.last_name || ''}`.trim();
      row["Registration No."] = student.reg_no;

      columnsToExport.forEach(col => {
        row[col.label] = student[col.key] || "";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Verification History");
    XLSX.writeFile(wb, "HOD_Verification_History.xlsx");
    setIsExportDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification History</h1>
        <p className="text-muted-foreground">
          View all past verification actions for your department.
        </p>
      </div>

      {/* Massive Universal Search & Export Toolbar */}
      <div className="bg-primary/5 p-4 md:p-6 rounded-2xl border border-primary/10 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row gap-3">
          <div className="w-full md:w-72 shrink-0">
            <Select value={searchColumn} onValueChange={setSearchColumn}>
              <SelectTrigger className="h-14 bg-background border-primary/20 shadow-inner rounded-xl font-medium">
                <SelectValue placeholder="Select Target Field..." />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all" className="font-bold text-primary">Scan All 75 Fields Natively</SelectItem>
                {STUDENT_COLUMNS.map(col => (
                  <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full">
            <Search className="absolute left-4 top-4 h-5 w-5 text-primary/60" />
            <Input
              placeholder={searchColumn === 'all' 
                ? "Deep Search: Type a city, name, caste, blood group..." 
                : `Targeted Search: Type exact value for ${STUDENT_COLUMNS.find(c => c.key === searchColumn)?.label || 'selected field'}...`
              }
              className="pl-12 h-14 text-base md:text-lg bg-background shadow-inner border-primary/20 font-semibold rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-sm font-semibold text-primary">
            <Badge variant="secondary" className="mr-2 text-sm px-2 py-0.5">{filteredStudents.length}</Badge> 
            Records Matching Filter
          </div>
          
          <Button onClick={() => setIsExportDialogOpen(true)} className="w-full sm:w-auto h-11 px-6 shadow-md gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all">
            <Filter className="h-4 w-4" /> Selected Filter Results: Export Columns to Excel
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-premium overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle>Archived Records ({filteredStudents.length})</CardTitle>
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
                <Table className="whitespace-nowrap">
                  <TableHeader className="bg-muted/50 sticky top-0 z-20">
                    <TableRow className="border-b shadow-sm">
                      {/* Frozen Actions */}
                      <TableHead className="w-[80px] text-center font-black uppercase text-[10px] tracking-wider sticky left-0 z-30 bg-muted/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Actions
                      </TableHead>
                      {/* Frozen Status */}
                      <TableHead className="w-[120px] text-center font-black uppercase text-[10px] tracking-wider sticky left-[80px] z-30 bg-muted/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Status
                      </TableHead>
                      {/* Frozen Name */}
                      <TableHead className="w-[200px] text-left font-black uppercase text-[10px] tracking-wider sticky left-[200px] z-30 bg-muted/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Student Name
                      </TableHead>
                      {/* Frozen Reg No */}
                      <TableHead className="w-[150px] text-left font-black uppercase text-[10px] tracking-wider sticky left-[400px] z-30 bg-muted/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Reg No
                      </TableHead>
                      
                      {/* Dynamic Columns */}
                      {STUDENT_COLUMNS.map((col) => (
                        <TableHead 
                          key={col.key} 
                          className="min-w-[140px] px-4 font-black uppercase text-[10px] tracking-wider text-muted-foreground"
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
                        <TableCell className="text-center sticky left-0 z-10 bg-background group-hover:bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] p-2">
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
                        </TableCell>

                        {/* Frozen Status */}
                        <TableCell className="text-center sticky left-[80px] z-10 bg-background group-hover:bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] p-2">
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
                        <TableCell className="font-bold py-3 px-4 text-foreground sticky left-[200px] z-10 bg-background group-hover:bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[200px]" title={`${student.first_name} ${student.last_name || ''}`}>
                          {student.first_name} {student.last_name}
                        </TableCell>

                        {/* Frozen Reg No Cell */}
                        <TableCell className="font-mono text-xs px-4 text-muted-foreground sticky left-[400px] z-10 bg-background group-hover:bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[150px]">
                          {student.reg_no}
                        </TableCell>

                        {/* Dynamic Data Cells */}
                        {STUDENT_COLUMNS.map((col) => {
                          const val = student[col.key];
                          return (
                            <TableCell 
                              key={col.key} 
                              className={cn(
                                "px-4 py-3 text-xs truncate max-w-[200px]",
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
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="w-full sm:w-auto hover:bg-destructive hover:text-white transition-colors">
                  Close Archive
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CUSTOM CSV EXPORT DIALOG */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 border-primary/20 shadow-2xl overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/40 shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Advanced Data Export
            </DialogTitle>
            <DialogDescription>
              Select specifically which profile columns you want to include in your Excel file. (Student Name, Reg No, and Status are always included automatically).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-3 border-b bg-primary/5 shadow-inner shrink-0 gap-3">
            <div className="text-sm font-semibold text-primary shrink-0">
              <Badge variant="secondary" className="mr-2">{selectedExportColumns.length}</Badge> 
              of {STUDENT_COLUMNS.length} Columns Selected
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search columns to export..."
                  className="pl-8 h-8 text-xs bg-background shadow-sm"
                  value={columnSearchTerm}
                  onChange={(e) => setColumnSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={selectAllCols} className="h-8 shadow-sm">Select All</Button>
                <Button size="sm" variant="outline" onClick={deselectAllCols} className="h-8 shadow-sm">Clear All</Button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto p-6 flex-1 bg-muted/5 min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STUDENT_COLUMNS.filter(c => c.label.toLowerCase().includes(columnSearchTerm.toLowerCase())).map(col => (
                <Label 
                  key={col.key} 
                  htmlFor={`export-${col.key}`}
                  className="flex items-start space-x-3 bg-background p-3 rounded-lg border shadow-sm hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer group"
                >
                  <Checkbox 
                    id={`export-${col.key}`} 
                    checked={selectedExportColumns.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
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

          <div className="p-4 border-t bg-muted/20 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
            <Button onClick={exportToExcel} className="gap-2 shadow-md">
              <Download className="h-4 w-4" /> Download Custom Excel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
