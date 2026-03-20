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
import { toast } from "sonner";
import { 
  Loader2, Eye, Search, Download, Filter, 
  Settings2, Sparkles, UserCheck, 
  ArrowUpDown, X, CheckCircle2,
  Trash2, FilterX
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface ActiveFilter {
  id: string;
  field: string;
  label: string;
  value: string;
}

export default function StudentsMaster() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Grid Configuration
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    STUDENT_COLUMNS.slice(0, 12).map(c => c.key)
  );
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Advanced Filtering
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [selectedField, setSelectedField] = useState<string>("");
  const [filterValue, setFilterValue] = useState("");

  async function fetchStudents() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("students_master")
        .select(`
          *,
          departments (name)
        `)
        .in("approval_status", ["approved_by_hod", "approved_by_tpo"])
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
    fetchStudents();
  }, []);

  const handleFinalApprove = async (studentId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("students_master")
        .update({ 
          approval_status: "approved_by_tpo",
          updated_at: new Date().toISOString()
        })
        .eq("id", studentId);

      if (error) throw error;
      toast.success("Student profile verified and officially published!");
      fetchStudents();
      setIsDetailsOpen(false);
    } catch (err: any) {
      toast.error("Verification failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const addFilter = () => {
    if (!selectedField || !filterValue) return;
    
    const fieldLabel = STUDENT_COLUMNS.find(c => c.key === selectedField)?.label || selectedField;
    const newFilter: ActiveFilter = {
      id: Math.random().toString(36).substr(2, 9),
      field: selectedField,
      label: fieldLabel,
      value: filterValue
    };
    
    setActiveFilters(prev => [...prev, newFilter]);
    setFilterValue("");
  };

  const removeFilter = (id: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== id));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchTerm("");
  };

  const filteredStudents = students.filter((s) => {
    // 1. Universal Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = [
        s.first_name, 
        s.last_name, 
        s.reg_no, 
        s.departments?.name
      ].some(text => text?.toLowerCase().includes(term));
      
      if (!matchesSearch) return false;
    }

    // 2. Advanced Filters
    for (const filter of activeFilters) {
      const val = String(s[filter.field] || "").toLowerCase();
      if (!val.includes(filter.value.toLowerCase())) return false;
    }

    return true;
  });

  const exportToExcel = () => {
    if (filteredStudents.length === 0) return;
    
    const exportData = filteredStudents.map((s) => {
      const row: any = {};
      row["Student Name"] = `${s.first_name} ${s.last_name || ""}`;
      row["Reg No"] = s.reg_no;
      row["Status"] = s.approval_status === "approved_by_tpo" ? "VERIFIED" : "PENDING TPO";
      
      STUDENT_COLUMNS.forEach(col => {
        if (visibleColumns.includes(col.key)) {
          row[col.label] = s[col.key] || "";
        }
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidate Pool");
    XLSX.writeFile(workbook, `Candidate_Pool_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-2xl shadow-inner">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900">Student Master Pool</h1>
            <p className="text-slate-500 font-medium text-sm">Universal access to all verified candidate credentials.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsConfigOpen(true)}
            className="rounded-xl border-slate-200 bg-white shadow-sm font-bold text-xs uppercase"
          >
            <Settings2 className="h-4 w-4 mr-2" /> Configure Grid
          </Button>
          <Button 
            onClick={exportToExcel}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg font-bold text-xs uppercase"
          >
            <Download className="h-4 w-4 mr-2" /> Export Pool
          </Button>
        </div>
      </div>

      {/* FILTER & SEARCH ENGINE */}
      <div className="bg-white rounded-2xl border shadow-premium overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Universal Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <Input 
                placeholder="Universal Candidate Search (ID, Name, Dept...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-base bg-slate-50/50 border-slate-200 focus-visible:ring-primary rounded-xl font-medium"
              />
            </div>

            {/* Advanced Filters Trigger */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 font-bold gap-2">
                  <Filter className="h-4 w-4" /> Filters
                  {activeFilters.length > 0 && (
                    <Badge className="bg-primary text-white ml-2">{activeFilters.length}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Select Data Point</Label>
                    <Select value={selectedField} onValueChange={setSelectedField}>
                      <SelectTrigger className="font-semibold h-10">
                        <SelectValue placeholder="Chose Field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDENT_COLUMNS.map(c => (
                          <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Match Value</Label>
                    <Input 
                      placeholder="Enter criteria..." 
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addFilter()}
                      className="font-medium"
                    />
                  </div>

                  <Button 
                    className="w-full bg-slate-900 text-white font-bold h-10" 
                    onClick={addFilter}
                    disabled={!selectedField || !filterValue}
                  >
                    Inject Filter
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {activeFilters.length > 0 || searchTerm ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const recentFilter: ActiveFilter = {
                      id: 'recent_app',
                      field: 'updated_at',
                      label: 'Recently Verified',
                      value: new Date().toISOString().split('T')[0].slice(0, 7) // Filter by current month
                    };
                    setActiveFilters(prev => [...prev, recentFilter]);
                  }}
                  className="h-12 text-primary border-primary/20 bg-primary/5 font-bold px-4 hover:bg-primary/10 rounded-xl"
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Recent Candidate
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={clearAllFilters}
                  className="h-12 text-slate-400 hover:text-rose-600 font-bold px-4"
                >
                  <FilterX className="h-4 w-4 mr-2" /> Clear All
                </Button>
              </div>
            ) : (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    setActiveFilters([{
                      id: 'recent_app',
                      field: 'updated_at',
                      label: 'Verified This Month',
                      value: currentMonth
                    }]);
                  }}
                  className="h-12 text-slate-500 border-slate-200 font-bold px-4 hover:bg-slate-50 rounded-xl"
                >
                  <Sparkles className="h-4 w-4 mr-2" /> View Recent Candidates
                </Button>
            )}
          </div>

          {/* Active Filter Badges */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {activeFilters.map(filter => (
                <Badge 
                  key={filter.id} 
                  variant="secondary" 
                  className="pl-3 pr-1 py-1.5 rounded-lg border-primary/20 bg-primary/5 text-primary flex items-center gap-1.5"
                >
                  <span className="text-[10px] uppercase font-black opacity-50">{filter.label}:</span>
                  <span className="font-bold">{filter.value}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0 hover:bg-rose-100 hover:text-rose-600 rounded-full"
                    onClick={() => removeFilter(filter.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MASTER DATA GRID */}
      <Card className="border-0 shadow-premium overflow-hidden">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col h-64 items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Syncing Global Master Data...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col h-64 items-center justify-center text-center p-8 space-y-4">
                <div className="bg-slate-100 p-6 rounded-full">
                  <Search className="h-10 w-10 text-slate-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">No Candidates Found</h3>
                  <p className="text-slate-500 text-sm">Try broadening your universal search or removing filters.</p>
                </div>
              </div>
            ) : (
              <div className="w-max min-w-full">
                <Table className="border-collapse border-separate border-spacing-0">
                  <TableHeader className="bg-slate-50 border-b sticky top-0 z-40">
                    <TableRow className="hover:bg-transparent">
                      {/* Frozen Actions */}
                      <TableHead className="min-w-[70px] w-[70px] text-center font-black uppercase text-[10px] tracking-wider py-5 sticky left-0 z-50 bg-slate-50 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)]">
                        Action
                      </TableHead>
                      {/* Frozen Status */}
                      <TableHead className="min-w-[100px] w-[100px] text-center font-black uppercase text-[10px] tracking-wider sticky left-[70px] z-50 bg-slate-50 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)]">
                        Status
                      </TableHead>
                      {/* Frozen Name */}
                      <TableHead className="min-w-[180px] w-[180px] text-left font-black uppercase text-[10px] tracking-wider sticky left-[170px] z-50 bg-slate-50 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)]">
                        Student Name
                      </TableHead>
                      {/* Frozen Reg No */}
                      <TableHead className="min-w-[140px] w-[140px] text-left font-black uppercase text-[10px] tracking-wider sticky left-[350px] z-50 bg-slate-50 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)] border-r">
                        Reg No
                      </TableHead>

                      {/* Dynamic Columns */}
                      {STUDENT_COLUMNS.filter(col => visibleColumns.includes(col.key) && !['first_name', 'last_name', 'reg_no'].includes(col.key)).map((col) => (
                        <TableHead key={col.key} className="min-w-[160px] px-6 font-black uppercase text-[10px] tracking-wider text-slate-500 border-r border-slate-100">
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id} className="hover:bg-primary/5 transition-colors group">
                        {/* Frozen Actions */}
                        <TableCell className="text-center sticky left-0 z-30 bg-background group-hover:bg-slate-50/80 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)] py-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 text-primary hover:bg-primary/20 rounded-full"
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>

                        {/* Frozen Status */}
                        <TableCell className="text-center sticky left-[70px] z-30 bg-background group-hover:bg-slate-50/80 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)] py-2">
                          <Badge 
                            variant={student.approval_status === 'approved_by_tpo' ? 'default' : 'secondary'}
                            className={cn(
                              "text-[8px] font-black px-2 h-4 justify-center uppercase tracking-tighter",
                              student.approval_status === 'approved_by_tpo' 
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            )}
                          >
                            {student.approval_status === 'approved_by_tpo' ? 'VERIFIED' : 'PENDING'}
                          </Badge>
                        </TableCell>

                        {/* Frozen Name */}
                        <TableCell className="font-bold py-2 sticky left-[170px] z-30 bg-background group-hover:bg-slate-50/80 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)] text-slate-900 px-4">
                          {student.first_name} {student.last_name}
                        </TableCell>

                        {/* Frozen Reg No */}
                        <TableCell className="font-mono text-[10px] font-bold py-2 sticky left-[350px] z-30 bg-background group-hover:bg-slate-50/80 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)] text-primary px-4 border-r overflow-hidden">
                          {student.reg_no}
                        </TableCell>

                        {/* Dynamic Data Cells */}
                        {STUDENT_COLUMNS.filter(col => visibleColumns.includes(col.key) && !['first_name', 'last_name', 'reg_no'].includes(col.key)).map((col) => {
                          const val = student[col.key];
                          return (
                            <TableCell key={col.key} className="px-6 py-2 text-[11px] font-medium text-slate-600 border-r border-slate-50 transition-colors" title={String(val || "-")}>
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

      {/* CONFIGURE GRID DIALOG */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-slate-200 shadow-2xl">
          <DialogHeader className="p-8 bg-slate-50 border-b shrink-0">
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Settings2 className="h-6 w-6 text-primary" /> Configure Master Grid
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Select key data points to visualize in your primary recruitment dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {STUDENT_COLUMNS.map(col => (
                <Label 
                  key={col.key}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md",
                    visibleColumns.includes(col.key) ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-white border-slate-100 opacity-60 hover:opacity-100"
                  )}
                >
                  <Checkbox 
                    checked={visibleColumns.includes(col.key)}
                    onCheckedChange={(checked) => {
                      if (checked) setVisibleColumns(prev => [...prev, col.key]);
                      else setVisibleColumns(prev => prev.filter(k => k !== col.key));
                    }}
                    className="data-[state=checked]:bg-primary rounded-md"
                  />
                  <span className="text-sm font-bold text-slate-700">{col.label}</span>
                </Label>
              ))}
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={() => setVisibleColumns(STUDENT_COLUMNS.map(c => c.key))} className="font-bold">Select All</Button>
            <Button variant="ghost" onClick={() => setVisibleColumns(['first_name', 'last_name', 'reg_no', 'department_id'])} className="font-bold text-rose-600">Reset View</Button>
            <Button className="bg-slate-900 text-white font-bold h-11 px-8 rounded-xl" onClick={() => setIsConfigOpen(false)}>Save Visual Configuration</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DETAILS DIALOG */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-primary/20 shadow-2xl overflow-hidden rounded-3xl">
          <DialogHeader className="p-8 bg-slate-900 text-white border-b sticky top-0 z-50">
            <DialogTitle className="text-3xl font-black tracking-tighter">Candidate Final Verification</DialogTitle>
            <DialogDescription className="text-white/60 font-medium">
              Reviewing verified master data for {selectedStudent?.first_name} {selectedStudent?.last_name}
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="p-8 space-y-10 bg-white">
              {/* Profile Overview Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-4 rounded-3xl">
                      <UserCheck className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                      <p className="text-primary font-bold">{selectedStudent.reg_no}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-dashed text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Current Verification Tier</p>
                  <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 h-auto text-sm">
                    {selectedStudent.approval_status === "approved_by_tpo" ? "TPO VERIFIED" : "HOD APPROVED"}
                  </Badge>
                </div>
              </div>

              {/* Data Grid Analysis */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">
                {STUDENT_COLUMNS.map((col) => {
                  const val = selectedStudent[col.key];
                  return (
                    <div key={col.key} className="space-y-1.5 border-b border-slate-100 pb-3">
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 line-clamp-1">{col.label}</div>
                      <div className={cn(
                        "font-bold text-sm text-slate-800",
                        !val && "text-slate-300 italic font-normal"
                      )}>{val ? String(val) : "Not Disclosed"}</div>
                    </div>
                  );
                })}
              </div>

              {/* ACTION FOOTER */}
              <div className="flex justify-end gap-3 pt-6 border-t mt-4 sticky bottom-[-2rem] bg-white/80 backdrop-blur pb-2">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="rounded-xl h-12 font-bold px-8">Close Archive View</Button>
                {selectedStudent.approval_status === "approved_by_hod" && (
                  <Button 
                    className="bg-primary hover:bg-slate-800 text-white font-black h-12 px-10 rounded-xl shadow-xl hover:-translate-y-1 transition-all flex gap-3"
                    onClick={() => handleFinalApprove(selectedStudent.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    FINAL PUBLISH CANDIDATE
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
