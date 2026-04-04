import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Search, FileDown, Columns, Upload, Clipboard, Eye, EyeOff, X, Loader2, CheckCircle2, Filter, ArrowUpDown, ArrowUp, Save, RefreshCw, Calculator, Building, GraduationCap, DollarSign, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type StudentPlacement = {
    id: string;
    company_name: string;
    company_mail: string;
    company_address: string;
    hr_name: string;
    hr_mail: string;
    student_name: string;
    student_id: string;
    student_mail: string;
    student_mobile: string;
    student_address: string;
    department: string;
    offer_type: string;
    salary: number;
    package_lpa: number;
    current_year: number;
    semester: number;
    join_date: string;
    ref_no: string;
    other_details?: Record<string, string>;
};

export function StudentPlacementTable() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    const [newColumnName, setNewColumnName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);

    // Data Fetching - Moved to top to avoid TDZ errors
    const { data: placementsData, isLoading } = useQuery({
        queryKey: ["student-placements"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("student_placements" as any)
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data as any) as StudentPlacement[];
        },
    });
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem("sp_searchTerm") || "");
    const [hideEmpty, setHideEmpty] = useState(() => localStorage.getItem("sp_hideEmpty") === "true");

    interface FilterCriterion {
        id: string;
        field: keyof StudentPlacement;
        label: string;
        value: string;
    }

    const [activeFilters, setActiveFilters] = useState<FilterCriterion[]>(() => {
        const saved = localStorage.getItem("sp_activeFilters");
        return saved ? JSON.parse(saved) : [];
    });
    const [isAddingFilter, setIsAddingFilter] = useState(false);
    const [newFilterField, setNewFilterField] = useState<string>("");
    const [newFilterValue, setNewFilterValue] = useState<string>("");
    const [filterValueSearch, setFilterValueSearch] = useState("");

    useEffect(() => {
        setFilterValueSearch("");
    }, [newFilterField]);

    type SortOption = "date-desc" | "date-asc" | "student-asc" | "student-desc" | "company-asc" | "company-desc";
    const [sortBy, setSortBy] = useState<SortOption>(() => (localStorage.getItem("sp_sortBy") as SortOption) || "date-desc");

    // Persist State Config
    useEffect(() => {
        localStorage.setItem("sp_searchTerm", searchTerm);
        localStorage.setItem("sp_hideEmpty", String(hideEmpty));
        localStorage.setItem("sp_sortBy", sortBy);
        localStorage.setItem("sp_activeFilters", JSON.stringify(activeFilters));
    }, [searchTerm, hideEmpty, sortBy, activeFilters]);

    // Bulk Select State
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

    // === Excel-like State ===
    type CellPos = { row: number; col: number };
    const [selectedCell, setSelectedCell] = useState<CellPos | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<CellPos | null>(null);
    const [editingCell, setEditingCell] = useState<CellPos | null>(null);
    const [localEdits, setLocalEdits] = useState<Record<string, Record<string, any>>>({});
    const [isDragging, setIsDragging] = useState(false);
    const [dragEnd, setDragEnd] = useState<CellPos | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [tableScrollWidth, setTableScrollWidth] = useState(2000);

    // Sync Horizontal Scrolls, detects table width, & Scroll to Top Detection
    useEffect(() => {
        const table = tableRef.current;
        const topScroll = topScrollRef.current;
        if (!table || !topScroll) return;

        // Sync table width to the top scrollbar's inner spacer
        const updateWidth = () => {
            if (table) setTableScrollWidth(table.scrollWidth);
        };
        
        // Initial width set
        updateWidth();

        const handleTableScroll = () => {
            if (topScroll.scrollLeft !== table.scrollLeft) {
                topScroll.scrollLeft = table.scrollLeft;
            }
            if (table.scrollTop > 300) setShowScrollTop(true);
            else setShowScrollTop(false);
        };
        const handleTopScroll = () => {
            if (table.scrollLeft !== topScroll.scrollLeft) {
                table.scrollLeft = topScroll.scrollLeft;
            }
        };

        table.addEventListener('scroll', handleTableScroll);
        topScroll.addEventListener('scroll', handleTopScroll);
        
        // Use ResizeObserver for dynamic column count changes
        const observer = new ResizeObserver(updateWidth);
        observer.observe(table);

        return () => {
            table.removeEventListener('scroll', handleTableScroll);
            topScroll.removeEventListener('scroll', handleTopScroll);
            observer.disconnect();
        };
    }, []);

    const scrollToTop = () => {
        if (tableRef.current) {
            tableRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Column Definitions State with LocalStorage Persistence
    const [columnDefs, setColumnDefs] = useState<any[]>(() => {
        const saved = localStorage.getItem("placement_column_defs");
        const defaultCols = [
            { key: "student_name", label: "Student Name", visible: true, isCustom: false },
            { key: "department", label: "Dept", visible: true, isCustom: false },
            { key: "student_mail", label: "Student Mail", visible: true, isCustom: false },
            { key: "student_id", label: "Student ID", visible: true, isCustom: false },
            { key: "company_name", label: "Company Name", visible: true, isCustom: false },
            { key: "offer_type", label: "Type", visible: true, isCustom: false },
            { key: "salary", label: "Salary", visible: true, isCustom: false },
            { key: "package_lpa", label: "Package (LPA)", visible: true, isCustom: false },
            { key: "company_mail", label: "Company Mail", visible: true, isCustom: false },
            { key: "company_address", label: "Company Address", visible: true, isCustom: false },
            { key: "hr_name", label: "HR Name", visible: true, isCustom: false },
            { key: "hr_mail", label: "HR Mail", visible: true, isCustom: false },
            { key: "student_mobile", label: "Student Mobile", visible: true, isCustom: false },
            { key: "student_address", label: "Student Address", visible: true, isCustom: false },
            { key: "current_year", label: "Year", visible: true, isCustom: false },
            { key: "semester", label: "Sem", visible: true, isCustom: false },
            { key: "join_date", label: "Join Date", visible: true, isCustom: false },
            { key: "ref_no", label: "Ref", visible: true, isCustom: false },
        ];
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Create map of new professional order
                const orderMap = defaultCols.reduce((acc: any, col, idx) => { acc[col.key] = idx; return acc; }, {});
                
                // Merge states (visibility etc) but enforce the new professional order
                const baseCols = defaultCols.map(def => {
                    const found = parsed.find((p: any) => p.key === def.key);
                    return found ? { ...def, ...found } : def;
                });

                // Add any custom columns that were created by user
                const custom = parsed.filter((p: any) => p.isCustom && !orderMap[p.key]);
                
                return [...baseCols, ...custom];
            } catch (e) {
                return defaultCols;
            }
        }
        return defaultCols;
    });

    useEffect(() => {
        localStorage.setItem("placement_column_defs", JSON.stringify(columnDefs));
    }, [columnDefs]);

    // Header Editing State
    const [editingHeaderKey, setEditingHeaderKey] = useState<string | null>(null);
    const [tempHeaderName, setTempHeaderName] = useState("");

    const handleHeaderRename = (key: string, newLabel: string) => {
        setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, label: newLabel } : col));
        setEditingHeaderKey(null);
    };

    const handleHideColumn = (key: string) => {
        if (window.confirm("Are you sure you want to hide this column?")) {
            setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, visible: false } : col));
        }
    };

    const handleUnhideColumn = (key: string) => {
        setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, visible: true } : col));
    };

    const handleAddCustomColumn = () => {
        if (newColumnName.trim()) {
            const key = newColumnName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            setColumnDefs(prev => [...prev, { key, label: newColumnName.trim(), visible: true, isCustom: true }]);
            setNewColumnName("");
            setIsColumnDialogOpen(false);
            toast.success(`Column "${newColumnName}" added`);
        }
    };

    // Delete Mutation

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("student_placements" as any).delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Record deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
        },
        onError: (error) => {
            toast.error("Failed to delete: " + error.message);
        }
    });

    // Delete All Mutation
    const deleteAllMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            if (!ids.length) return;
            const { error } = await supabase.from("student_placements" as any).delete().in("id", ids);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            toast.success(`Deleted ${variables.length} records successfully`);
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
            setIsDeleteDialogOpen(false);
            setSelectionEnd(null);
            setSelectedCell(null);
        },
        onError: (error) => {
            toast.error("Failed to delete records: " + error.message);
        }
    });



    // Cell Update Mutation
    const cellUpdateMutation = useMutation({
        mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
            const { error } = await supabase.from("student_placements" as any).update({ [field]: value }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
        },
        onError: (error) => {
            toast.error("Save failed: " + error.message);
        }
    });

    // Batch cell update for paste/fill operations
    const batchUpdateMutation = useMutation({
        mutationFn: async (updates: { id: string; field: string; value: any }[]) => {
            // Use RPC for transactional update
            const { error } = await supabase.rpc('batch_update_student_placements', { updates });
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            toast.success(`Updated ${variables.length} cell(s)`);
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
            setLocalEdits({});
            setIsSuccessDialogOpen(true);
        },
        onError: (error) => {
            toast.error("Batch save failed: " + error.message);
        }
    });

    // Bulk Insert Mutation
    const bulkInsertMutation = useMutation({
        mutationFn: async (records: Partial<StudentPlacement>[]) => {
            // Use RPC for transactional bulk insert
            const { error } = await supabase.rpc('bulk_insert_student_placements_v2', { records });
            if (error) throw error;
        },

        onSuccess: (data, variables) => {
            toast.success(`Successfully imported ${variables.length} records`);
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
        },
        onError: (error) => {
            toast.error("Import failed: " + error.message);
        }
    });

    // Excel Helper — Dynamic Mapping based on Column Definitions
    const mapExcelRowToStudentPlacement = (row: any): Partial<StudentPlacement> => {
        // Normalize: lowercase, strip all non-alphanumeric
        const norm = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

        // 1. Build Field Map from available columns (Labels & Keys)
        const fieldMap: Record<string, keyof StudentPlacement> = {};

        columnDefs.forEach(col => {
            fieldMap[norm(col.label)] = col.key; // Match "Company Name" -> company_name
            fieldMap[norm(col.key)] = col.key;   // Match "company_name" -> company_name
        });

        // 2. Add common aliases for fuzzy matching
        const aliases: Record<string, keyof StudentPlacement> = {
            'company': 'company_name', 'organization': 'company_name',
            'email': 'student_mail', 'mail': 'student_mail', 'studentmailid': 'student_mail',
            'mobile': 'student_mobile', 'phone': 'student_mobile', 'contact': 'student_mobile', 'studentmobilenumber': 'student_mobile',
            'address': 'student_address',
            'dept': 'department', 'branch': 'department',
            'type': 'offer_type', 'offer': 'offer_type', 'internshipplaced': 'offer_type',
            'ctc': 'salary', 'annualsalary': 'salary', 'stipendsalary': 'salary', 'stipend': 'salary',
            'package': 'package_lpa', 'lpa': 'package_lpa',
            'year': 'current_year', 'batch': 'current_year', 'placedyear': 'current_year',
            'sem': 'semester', 'placedsem': 'semester',
            'doj': 'join_date', 'dateofjoining': 'join_date', 'date': 'join_date',
            'ref': 'ref_no', 'reference': 'ref_no', 'referenceno': 'ref_no',
            'hr': 'hr_name', 'hrcontact': 'hr_name',
            'hremail': 'hr_mail',
            'companyemail': 'company_mail',
            'companyaddress': 'company_address',
            'placedstudentname': 'student_name',
        };
        Object.assign(fieldMap, aliases);

        // 3. Map Row Data
        const fieldValues: Record<string, any> = {};
        for (const excelHeader of Object.keys(row)) {
            const normalizedHeader = norm(excelHeader);
            // Ignore serial numbers
            if (normalizedHeader === 'sno' || normalizedHeader === 'slno') continue;

            const fieldKey = fieldMap[normalizedHeader];
            if (fieldKey && fieldValues[fieldKey] === undefined) {
                // Determine value (trim strings)
                let val = row[excelHeader];
                if (typeof val === 'string') val = val.trim();
                fieldValues[fieldKey] = val;
            }
        }

        const str = (field: string) => String(fieldValues[field] ?? '').trim();
        const num = (field: string, fallback: number = 0) => {
            const val = fieldValues[field];
            return (val !== undefined && val !== null && val !== '') ? Number(val) : fallback;
        };

        return {
            company_name: str('company_name'),
            company_mail: str('company_mail'),
            company_address: str('company_address'),
            hr_name: str('hr_name'),
            hr_mail: str('hr_mail'),
            student_name: str('student_name'),
            student_id: str('student_id'),
            student_mail: str('student_mail'),
            student_mobile: str('student_mobile'),
            student_address: str('student_address'),
            department: str('department'),
            offer_type: str('offer_type'),
            salary: num('salary'),
            package_lpa: num('package_lpa'),
            current_year: num('current_year', new Date().getFullYear()),
            semester: num('semester'),
            join_date: str('join_date') || null,
            ref_no: str('ref_no'),
        };
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        try {
            const file = files[0];
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws);
            let mapped = json.map(mapExcelRowToStudentPlacement);

            if (mapped.length) {
                // 1. Extract IDs and Names
                const studentIds = mapped.map(r => r.student_id).filter(Boolean);
                const companyNames = mapped.map(r => r.company_name).filter(Boolean);

                // 2. Fetch Master Data
                const { data: students } = await supabase
                    .from("master_students" as any)
                    .select("*")
                    .in("student_id", studentIds);

                const { data: companies } = await supabase
                    .from("master_companies" as any)
                    .select("*")
                    .in("company_name", companyNames);

                const studentMap = new Map(students?.map((s: any) => [s.student_id, s]));
                const companyMap = new Map(companies?.map((c: any) => [c.company_name, c]));

                // 3. Merge Data
                mapped = mapped.map(record => {
                    const masterStudent = record.student_id ? studentMap.get(record.student_id) : null;
                    const masterCompany = record.company_name ? companyMap.get(record.company_name) : null;

                    return {
                        ...record,
                        student_name: record.student_name || masterStudent?.student_name || "",
                        student_mail: record.student_mail || masterStudent?.student_mail || "",
                        student_mobile: record.student_mobile || masterStudent?.student_mobile || "",
                        student_address: record.student_address || masterStudent?.student_address || "",
                        department: record.department || masterStudent?.department || "",
                        current_year: record.current_year || masterStudent?.current_year || record.current_year,
                        semester: record.semester || masterStudent?.semester || record.semester,

                        company_mail: record.company_mail || masterCompany?.company_mail || "",
                        company_address: record.company_address || masterCompany?.company_address || "",
                        hr_name: record.hr_name || masterCompany?.hr_name || "",
                        hr_mail: record.hr_mail || masterCompany?.hr_mail || "",
                    };
                });

                bulkInsertMutation.mutate(mapped);
            }
        } catch (e) {
            console.error(e);
            toast.error("File upload failed");
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDownload = () => {
        if (!filteredData || filteredData.length === 0) {
            toast.error("No records to download based on current filters.");
            return;
        }

        const wb = XLSX.utils.book_new();
        const exportData = filteredData.map((r, i) => {
            const data: any = {
                "S.No": i + 1,
            };

            visibleColumns.forEach(col => {
                const val = col.isCustom ? (r.other_details?.[col.key]) : (r as any)[col.key];
                data[col.label] = val || "";
            });

            return data;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Student Placements");
        XLSX.writeFile(wb, `Student_Placements_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success(`Downloaded ${filteredData.length} records.`);
    };



    const getAvailableValues = (fieldKey: string) => {
        if (!placementsData) return [];
        const vals = new Set(placementsData.map(p => {
            const col = columnDefs.find(c => c.key === fieldKey);
            return col?.isCustom ? (p.other_details?.[fieldKey]) : (p as any)[fieldKey];
        }).filter(Boolean));
        return Array.from(vals).sort();
    };

    const handleAddFilter = () => {
        if (!newFilterField || !newFilterValue) return;
        const fieldConfig = columnDefs.find(f => f.key === newFilterField);
        if (!fieldConfig) return;

        const newFilter: FilterCriterion = {
            id: Math.random().toString(36).substr(2, 9),
            field: newFilterField as keyof StudentPlacement,
            label: fieldConfig.label,
            value: newFilterValue
        };

        setActiveFilters([...activeFilters, newFilter]);
        setIsAddingFilter(false);
        setNewFilterField("");
        setNewFilterValue("");
    };

    const removeFilter = (id: string) => {
        setActiveFilters(activeFilters.filter(f => f.id !== id));
    };

    // Filter & Search Logic
    const filteredData = placementsData?.filter((p: any) => {
        // Global Search
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesGlobal = columnDefs.some(col => {
                if (!col.visible) return false;
                const val = col.isCustom ? (p.other_details?.[col.key]) : p[col.key];
                return String(val || "").toLowerCase().includes(searchLower);
            });
            if (!matchesGlobal) return false;
        }

        // Specific Filters
        for (const filter of activeFilters) {
            const col = columnDefs.find(c => c.key === filter.field);
            const recordVal = col?.isCustom ? (p.other_details?.[filter.field]) : p[filter.field];
            if (String(recordVal || "").toLowerCase() !== filter.value.toLowerCase()) {
                return false;
            }
        }
        return true;
    }).sort((a, b) => {
        if (sortBy === "company-asc") return String(a.company_name || "").localeCompare(String(b.company_name || ""));
        if (sortBy === "company-desc") return String(b.company_name || "").localeCompare(String(a.company_name || ""));
        if (sortBy === "student-asc") return String(a.student_name || "").localeCompare(String(b.student_name || ""));
        if (sortBy === "student-desc") return String(b.student_name || "").localeCompare(String(a.student_name || ""));
        if (sortBy === "date-asc") return new Date(a.join_date || 0).getTime() - new Date(b.join_date || 0).getTime();
        if (sortBy === "date-desc") return new Date(b.join_date || 0).getTime() - new Date(a.join_date || 0).getTime();
        return 0;
    });

    const visibleColumns = columnDefs.filter(c => c.visible);

    const rowsToShow = hideEmpty 
        ? filteredData?.filter(r => {
            return visibleColumns.every(col => {
                const val = col.isCustom ? (r.other_details?.[col.key]) : (r as any)[col.key];
                return val !== null && val !== undefined && val !== "";
            });
        }) 
        : filteredData;



    const handleSelectAll = useCallback(() => {
        if (!rowsToShow) return;
        if (selectedRowIds.size === rowsToShow.length) {
            setSelectedRowIds(new Set());
        } else {
            setSelectedRowIds(new Set(rowsToShow.map((r: any, idx: number) => r.id || `temp-${idx}`)));
        }
    }, [rowsToShow, selectedRowIds]);

    const handleSelectRow = useCallback((id: string) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);
    const handleBulkDelete = () => {
        if (selectedRowIds.size === 0) return;
        if (confirm(`Are you sure you want to completely delete ${selectedRowIds.size} student records?`)) {
            const idsToDelete = Array.from(selectedRowIds);
            
            // Sync with backend natively only for real UUIDs
            const dbIds = idsToDelete.filter(id => !id.startsWith("temp-"));
            if (dbIds.length > 0) {
                dbIds.forEach(id => {
                    (supabase.from("student_placements" as any) as any).delete().eq("id", id).then();
                });
            }
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
            
            // Clean local uncommitted state
            const newEdits = { ...localEdits };
            idsToDelete.forEach(id => delete newEdits[id]);
            setLocalEdits(newEdits);
            
            setSelectedRowIds(new Set());
            toast.success("Batch deleted successfully!");
        }
    };

    const handleBulkExport = () => {
        if (selectedRowIds.size === 0) return;
        const selectedData = rowsToShow.filter((r, idx) => selectedRowIds.has(r.id || `temp-${idx}`));
        const wb = XLSX.utils.book_new();
        const exportData = selectedData.map((r, i) => {
            const data: any = { "S.No": i + 1 };
            visibleColumns.forEach(col => {
                const val = col.isCustom ? (r.other_details?.[col.key]) : (r as any)[col.key];
                data[col.label] = val || "";
            });
            return data;
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Selected Data");
        XLSX.writeFile(wb, `Student_Placements_Selected.xlsx`);
        toast.success(`Exported ${selectedData.length} records.`);
        setSelectedRowIds(new Set());
    };

    // === Excel-like Helpers ===
    const getSelectionRange = useCallback(() => {
        if (!selectedCell) return null;
        const end = selectionEnd || selectedCell;
        return {
            minRow: Math.min(selectedCell.row, end.row),
            maxRow: Math.max(selectedCell.row, end.row),
            minCol: Math.min(selectedCell.col, end.col),
            maxCol: Math.max(selectedCell.col, end.col),
        };
    }, [selectedCell, selectionEnd]);

    const isCellInSelection = useCallback((row: number, col: number) => {
        const range = getSelectionRange();
        if (!range) return false;
        return row >= range.minRow && row <= range.maxRow && col >= range.minCol && col <= range.maxCol;
    }, [getSelectionRange]);

    const isCellInDragFill = useCallback((row: number, col: number) => {
        if (!isDragging || !selectedCell || !dragEnd) return false;
        const startRow = selectedCell.row + 1;
        const endRow = dragEnd.row;
        if (endRow < startRow) return false;
        return row >= startRow && row <= endRow && col === selectedCell.col;
    }, [isDragging, selectedCell, dragEnd]);

    const getCellValue = useCallback((record: StudentPlacement, colKey: string) => {
        const edited = localEdits[record.id]?.[colKey];
        if (edited !== undefined) return edited;
        const col = columnDefs.find(c => c.key === colKey);
        if (col?.isCustom) return record.other_details?.[colKey] || "";
        return (record as any)[colKey] ?? "";
    }, [localEdits, columnDefs]);

    const setLocalCellValue = useCallback((recordId: string, colKey: string, value: any) => {
        setLocalEdits(prev => ({
            ...prev,
            [recordId]: { ...prev[recordId], [colKey]: value }
        }));
    }, []);

    const commitCellEdit = useCallback((recordId: string, colKey: string, value: any) => {
        cellUpdateMutation.mutate({ id: recordId, field: colKey, value });
        setLocalEdits(prev => {
            const next = { ...prev };
            if (next[recordId]) {
                delete next[recordId][colKey];
                if (Object.keys(next[recordId]).length === 0) delete next[recordId];
            }
            return next;
        });
    }, [cellUpdateMutation]);

    const handleCellClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
        if (e.shiftKey && selectedCell) {
            setSelectionEnd({ row, col });
        } else {
            setSelectedCell({ row, col });
            setSelectionEnd(null);
        }
    }, [selectedCell]);

    const handleCellDoubleClick = useCallback((row: number, col: number) => {
        setEditingCell({ row, col });
        setSelectedCell({ row, col });
        setSelectionEnd(null);
    }, []);

    // Keyboard handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if typing in search/dialog inputs
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && !target.closest('.excel-cell')) return;
            if (target.closest('[role="dialog"]')) return;

            if (!filteredData || !selectedCell) return;

            // Ctrl+C: Copy
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                const range = getSelectionRange();
                if (!range) return;
                const lines: string[] = [];
                for (let r = range.minRow; r <= range.maxRow; r++) {
                    const record = filteredData[r];
                    if (!record) continue;
                    const cells: string[] = [];
                    for (let c = range.minCol; c <= range.maxCol; c++) {
                        const colKey = visibleColumns[c]?.key;
                        if (colKey) cells.push(String(getCellValue(record, colKey)));
                    }
                    lines.push(cells.join('\t'));
                }
                navigator.clipboard.writeText(lines.join('\n'));
                toast.success('Copied to clipboard');
                return;
            }

            // Ctrl+V: Paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                navigator.clipboard.readText().then(text => {
                    if (!text || !selectedCell || !filteredData) return;
                    const rows = text.split(/\r?\n/).filter(l => l.length > 0);
                    const updates: { id: string; field: string; value: any }[] = [];
                    rows.forEach((rowText, rOffset) => {
                        const cells = rowText.split('\t');
                        const targetRow = selectedCell.row + rOffset;
                        const record = filteredData[targetRow];
                        if (!record) return;
                        cells.forEach((cellVal, cOffset) => {
                            const targetCol = selectedCell.col + cOffset;
                            const colKey = visibleColumns[targetCol]?.key;
                            if (!colKey) return;
                            const trimmed = cellVal.trim();
                            setLocalCellValue(record.id, colKey, trimmed);
                            updates.push({ id: record.id, field: colKey, value: trimmed });
                        });
                    });
                    if (updates.length > 0) {
                        // batchUpdateMutation.mutate(updates); // Manual Save
                        toast.success(`Pasted ${updates.length} cells. Click Save to commit.`);
                    }
                }).catch(() => toast.error('Clipboard access denied'));
                return;
            }

            // Arrow keys navigation
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !editingCell) {
                e.preventDefault();
                const { row, col } = selectedCell;
                let newRow = row, newCol = col;
                if (e.key === 'ArrowUp') newRow = Math.max(0, row - 1);
                if (e.key === 'ArrowDown') newRow = Math.min((filteredData?.length || 1) - 1, row + 1);
                if (e.key === 'ArrowLeft') newCol = Math.max(0, col - 1);
                if (e.key === 'ArrowRight' || e.key === 'Tab') newCol = Math.min(visibleColumns.length - 1, col + 1);
                if (e.shiftKey) {
                    setSelectionEnd({ row: newRow, col: newCol });
                } else {
                    setSelectedCell({ row: newRow, col: newCol });
                    setSelectionEnd(null);
                }
                return;
            }

            // Enter to start editing
            if (e.key === 'Enter' && !editingCell) {
                e.preventDefault();
                setEditingCell({ ...selectedCell });
                return;
            }

            // Escape to stop editing
            if (e.key === 'Escape') {
                setEditingCell(null);
                return;
            }

            // Delete/Backspace to clear selected cells
            if ((e.key === 'Delete' || e.key === 'Backspace') && !editingCell) {
                e.preventDefault();
                const range = getSelectionRange();
                if (!range) return;
                const updates: { id: string; field: string; value: any }[] = [];
                for (let r = range.minRow; r <= range.maxRow; r++) {
                    const record = filteredData[r];
                    if (!record) continue;
                    for (let c = range.minCol; c <= range.maxCol; c++) {
                        const colKey = visibleColumns[c]?.key;
                        if (!colKey) continue;
                        setLocalCellValue(record.id, colKey, '');
                        updates.push({ id: record.id, field: colKey, value: '' });
                    }
                }
                if (updates.length > 0) {
                    // batchUpdateMutation.mutate(updates); // Manual Save
                }
                return;
            }

            // Start typing to edit (single printable character)
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !editingCell) {
                setEditingCell({ ...selectedCell });
                const record = filteredData[selectedCell.row];
                const colKey = visibleColumns[selectedCell.col]?.key;
                if (record && colKey) {
                    setLocalCellValue(record.id, colKey, e.key);
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCell, selectionEnd, editingCell, filteredData, visibleColumns, getCellValue, setLocalCellValue, getSelectionRange, batchUpdateMutation]);

    // Focus input when editing starts
    useEffect(() => {
        if (editingCell && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingCell]);

    // Drag-to-fill mouse handlers
    const handleFillHandleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseUp = () => {
            if (isDragging && selectedCell && dragEnd && filteredData) {
                const sourceRecord = filteredData[selectedCell.row];
                const colKey = visibleColumns[selectedCell.col]?.key;
                if (sourceRecord && colKey) {
                    const sourceVal = getCellValue(sourceRecord, colKey);
                    const startRow = selectedCell.row + 1;
                    const endRow = dragEnd.row;
                    if (endRow >= startRow) {
                        const updates: { id: string; field: string; value: any }[] = [];
                        for (let r = startRow; r <= endRow; r++) {
                            const record = filteredData[r];
                            if (!record) continue;
                            setLocalCellValue(record.id, colKey, sourceVal);
                            updates.push({ id: record.id, field: colKey, value: sourceVal });
                        }
                        if (updates.length > 0) {
                            // batchUpdateMutation.mutate(updates); // Manual Save
                        }
                    }
                }
            }
            setIsDragging(false);
            setDragEnd(null);
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [isDragging, selectedCell, dragEnd, filteredData, visibleColumns, getCellValue, setLocalCellValue, batchUpdateMutation]);

    const handleCellMouseEnter = useCallback((row: number, col: number) => {
        if (isDragging) {
            setDragEnd({ row, col });
        }
    }, [isDragging]);

    const handlePasteFromClipboard = () => {
        navigator.clipboard.readText().then(text => {
            toast.info("Select a cell and press Ctrl+V to securely paste from clipboard");
        }).catch(() => toast.error('Clipboard access denied'));
    };

    const handlePasteAsNewColumn = () => {
        setIsColumnDialogOpen(true);
    };

    const fetchRecords = () => {
        queryClient.invalidateQueries({ queryKey: ["student-placements"] });
        toast.success("Syncing database...");
    };

    return (
        <Card className="w-full border-0 shadow-premium overflow-hidden bg-background">
            <CardHeader className="space-y-6 pb-6 bg-muted/5 border-b px-4 md:px-6 pt-6">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                    <div>
                        <CardTitle className="text-2xl font-black flex items-center gap-3 tracking-tight text-primary">
                            Student Placement Records
                            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                        </CardTitle>
                        <CardDescription className="text-sm font-medium mt-1">
                            Centralized placement data history and management
                        </CardDescription>
                    </div>

                    {/* Peak Professional Action Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 mr-2 border-r pr-4 border-border/50">
                            <Button onClick={fetchRecords} variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 transition-colors" title="Sync from Database">
                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 gap-2 shadow-sm font-semibold border-primary/20 hover:bg-primary/5">
                                    <Plus className="h-4 w-4 text-primary" /> Modify Table
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2">
                                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer gap-2 mb-1">
                                    <Upload className="h-4 w-4 text-indigo-500" /> Import Excel/CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handlePasteFromClipboard} className="cursor-pointer gap-2 mb-1">
                                    <Clipboard className="h-4 w-4 text-indigo-500" /> Paste Raw Data
                                </DropdownMenuItem>
                                <div className="h-px bg-border/50 my-1"/>
                                <DropdownMenuItem onClick={() => { setEditingId(null); setIsDialogOpen(true); }} className="cursor-pointer gap-2 mb-1">
                                     <Plus className="h-4 w-4 text-green-600" /> Insert Empty Row
                                 </DropdownMenuItem>
                                <DropdownMenuItem onClick={handlePasteAsNewColumn} className="cursor-pointer gap-2 mb-1">
                                     <Plus className="h-4 w-4 text-green-600" /> Insert Custom Column
                                 </DropdownMenuItem>
                                <div className="h-px bg-border/50 my-1"/>
                                <DropdownMenuItem onClick={() => setIsColumnDialogOpen(true)} className="cursor-pointer gap-2 mb-1">
                                     <Columns className="h-4 w-4 text-primary" /> Manage Columns
                                 </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setHideEmpty(!hideEmpty)} className="cursor-pointer gap-2">
                                     {hideEmpty ? <EyeOff className="h-4 w-4 text-orange-500" /> : <Eye className="h-4 w-4 text-orange-500" />}
                                     {hideEmpty ? "Disable Strict View" : "Enable Strict View"}
                                 </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Commit Changes */}
                        <Button
                            onClick={() => {
                                const updates: { id: string; field: string; value: any }[] = [];
                                Object.entries(localEdits).forEach(([id, fields]) => {
                                    Object.entries(fields).forEach(([field, value]) => {
                                        updates.push({ id, field, value });
                                    });
                                });
                                if (updates.length) batchUpdateMutation.mutate(updates);
                            }}
                            disabled={!Object.keys(localEdits).length || batchUpdateMutation.isPending}
                            className="h-10 px-6 gap-2 shadow-md bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all font-bold"
                        >
                            {batchUpdateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                            Commit Changes
                        </Button>
                    </div>
                </div>



                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .csv" multiple />

                {/* Bulk Action Context Toolbar */}
                {selectedRowIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 border border-slate-700">
                        <div className="flex items-center gap-2 font-semibold">
                            <CheckSquare className="h-5 w-5 text-blue-400" />
                            <span>{selectedRowIds.size} Selected</span>
                        </div>
                        <div className="w-px h-6 bg-slate-700 mx-2" />
                        <Button variant="ghost" size="sm" onClick={handleBulkExport} className="hover:bg-slate-800 text-slate-200">
                            <FileDown className="h-4 w-4 mr-2" /> Export
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="hover:bg-red-900/50 text-red-400 hover:text-red-300">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedRowIds(new Set())} className="hover:bg-slate-800 rounded-full h-8 w-8 ml-2">
                            <X className="h-4 w-4 text-slate-400" />
                        </Button>
                    </div>
                )}

                {/* Peak Professional Unified Control Bar */}
                <div className="flex flex-col gap-4 bg-background p-5 rounded-2xl border-2 border-primary/5 shadow-2xl mt-6 relative overflow-hidden group">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                    
                    <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 relative z-10">
                        {/* Universal Search Section */}
                        <div className="relative w-full xl:w-[280px] shrink-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Universal Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                                <Input
                                    className="h-11 pl-10 text-sm font-semibold shadow-inner bg-muted/20 border-primary/10 hover:border-primary/30 focus-visible:ring-primary/20 transition-all rounded-xl"
                                    placeholder="Type anything..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="hidden xl:block w-px h-12 bg-border/50 mx-2 self-end mb-0.5" />

                        {/* Power Filtering Section */}
                        <div className="flex-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Precise Filtering</Label>
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <Select value={newFilterField} onValueChange={setNewFilterField}>
                                    <SelectTrigger className="h-11 w-full sm:w-[200px] text-sm font-bold bg-background shadow-sm rounded-xl border-primary/20 ring-offset-background focus:ring-2 focus:ring-primary/20 transition-all">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-primary/50" />
                                            <SelectValue placeholder="Select Field" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {columnDefs.filter(f => !String(f.key).toLowerCase().includes('address') && !String(f.key).toLowerCase().includes('mail') && !String(f.key).toLowerCase().includes('hr_name') && !String(f.key).toLowerCase().includes('mobile') && !String(f.key).toLowerCase().includes('ref_no')).map(f => (
                                            <SelectItem key={String(f.key)} value={String(f.key)} className="text-sm font-semibold">{f.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={newFilterValue} onValueChange={setNewFilterValue} disabled={!newFilterField}>
                                    <SelectTrigger className="h-11 w-full sm:w-[200px] text-sm font-bold bg-background shadow-sm rounded-xl border-primary/20 ring-offset-background focus:ring-2 focus:ring-primary/20 transition-all">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-primary/50" />
                                            <SelectValue placeholder="Select Value" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[400px]">
                                        <div className="p-2 sticky top-0 bg-background z-10 border-b">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search..."
                                                    value={filterValueSearch}
                                                    onChange={(e) => setFilterValueSearch(e.target.value)}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                    className="h-8 pl-8 text-[11px] bg-muted/30 focus-visible:ring-primary/20"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="p-1">
                                            {getAvailableValues(newFilterField)
                                                .filter(val => String(val).toLowerCase().includes(filterValueSearch.toLowerCase()))
                                                .map((val: any) => (
                                                    <SelectItem key={String(val)} value={String(val)} className="text-sm font-semibold">{String(val)}</SelectItem>
                                                ))
                                            }
                                        </div>
                                    </SelectContent>
                                </Select>

                                <Button size="lg" className="h-11 px-6 text-xs font-black shadow-lg bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl w-full sm:w-auto gap-2" onClick={handleAddFilter} disabled={!newFilterField || !newFilterValue}>
                                    <Plus className="h-4 w-4" /> Apply
                                </Button>
                            </div>
                        </div>

                        <div className="hidden xl:block w-px h-12 bg-border/50 mx-2 self-end mb-0.5" />

                        {/* Action Suite */}
                        <div className="shrink-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Actions & Export</Label>
                            <div className="flex items-center gap-3">
                                <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                                    <SelectTrigger className="h-11 w-[140px] shadow-sm font-bold border-primary/20 bg-background text-[11px] rounded-xl">
                                        <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
                                        <SelectValue placeholder="Sort" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="date-desc" className="text-xs font-medium">Newest to Oldest</SelectItem>
                                        <SelectItem value="date-asc" className="text-xs font-medium">Oldest to Newest</SelectItem>
                                        <SelectItem value="student-asc" className="text-xs font-medium">Student (A-Z)</SelectItem>
                                        <SelectItem value="student-desc" className="text-xs font-medium">Student (Z-A)</SelectItem>
                                        <SelectItem value="company-asc" className="text-xs font-medium">Company (A-Z)</SelectItem>
                                        <SelectItem value="company-desc" className="text-xs font-medium">Company (Z-A)</SelectItem>
                                    </SelectContent>
                                </Select>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="h-11 px-4 text-xs font-black shadow-sm border-2 border-primary/10 hover:bg-primary/5 transition-all rounded-xl gap-2">
                                            <FileDown className="h-4 w-4 text-primary" /> Export
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                                        <DropdownMenuItem onClick={handleDownload} className="cursor-pointer gap-2 py-2.5 text-xs font-bold">
                                            <FileDown className="h-4 w-4 text-blue-600" /> Current View (.xlsx)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <div className="h-11 flex items-center px-4 rounded-xl bg-primary/5 border border-primary/10 text-primary font-black text-xs min-w-[100px] justify-center shadow-inner">
                                    {filteredData?.length || 0} Items
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Filter Chips */}
                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 px-1">
                        {activeFilters.map(filter => (
                            <Badge key={filter.id} variant="secondary" className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 bg-primary/10 text-primary border-primary/20 animate-in zoom-in-95">
                                <span className="opacity-70">{filter.label}:</span>
                                {filter.value}
                                <button onClick={() => removeFilter(filter.id)} className="ml-1 rounded-full hover:bg-primary/20 p-0.5 transition-colors">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                        <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10" onClick={() => setActiveFilters([])}>
                            Clear All Filters
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-0 relative">
                {/* Thinned Professional Top Scrollbar */}
                <div 
                    ref={topScrollRef}
                    className="overflow-x-auto overflow-y-hidden border-b h-3 bg-muted/20 custom-scrollbar relative z-10"
                >
                    <div style={{ width: `${tableScrollWidth}px` }} className="h-px block" />
                </div>

                <div 
                    ref={tableRef} 
                    className="rounded-none overflow-auto relative shadow-sm select-none max-h-[70vh] custom-scrollbar border" 
                    tabIndex={0}
                >
                    {/* Floating Scroll to Top Button (Fixed for maximum visibility) */}
                    {showScrollTop && (
                        <div className="fixed bottom-10 right-10 z-[60] flex justify-end">
                            <Button
                                onClick={scrollToTop}
                                className="rounded-full w-14 h-14 shadow-2xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 transition-all hover:scale-110 active:scale-95 border-2 border-white/20"
                                size="icon"
                            >
                                <ArrowUp className="h-7 w-7" />
                            </Button>
                        </div>
                    )}
                    <Table className="min-w-[2000px] border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 z-30 bg-background shadow-sm">
                        <TableRow>
                            <TableHead className="w-[40px] sticky left-0 top-0 z-50 bg-background border-b border-r text-center">
                                <Checkbox 
                                    checked={rowsToShow?.length > 0 && selectedRowIds.size === rowsToShow.length}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-[60px] font-bold sticky left-[40px] top-0 z-50 bg-background border-b border-r text-center">S.No</TableHead>
                            {visibleColumns.map((col) => (
                                <TableHead key={col.key} className="font-bold bg-background border-b border-r min-w-[150px] group sticky top-0 z-30">
                                    {editingHeaderKey === col.key ? (
                                        <div className="flex items-center gap-1">
                                            <Input
                                                value={tempHeaderName}
                                                onChange={(e) => setTempHeaderName(e.target.value)}
                                                className="h-7 text-xs"
                                                autoFocus
                                                onBlur={() => handleHeaderRename(col.key, tempHeaderName)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleHeaderRename(col.key, tempHeaderName)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2">
                                            <span>{col.label}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost" size="icon" className="h-6 w-6"
                                                    onClick={() => { setEditingHeaderKey(col.key); setTempHeaderName(col.label); }}
                                                >
                                                    <Pencil className="h-3 w-3 text-blue-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon" className="h-6 w-6"
                                                    onClick={() => handleHideColumn(col.key)}
                                                >
                                                    <Trash2 className="h-3 w-3 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </TableHead>
                            ))}
                            <TableHead className="text-right font-bold bg-background border-b sticky right-0 top-0 z-40 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={visibleColumns.length + 2} className="text-center h-24">Loading...</TableCell></TableRow>
                        ) : rowsToShow?.length === 0 ? (
                            <TableRow><TableCell colSpan={visibleColumns.length + 2} className="text-center h-24">No records found</TableCell></TableRow>
                        ) : (
                            rowsToShow?.map((record, rowIndex) => (
                                <TableRow key={record.id || `row-${rowIndex}`} className="hover:bg-muted/5 border-b">
                                    <TableCell className="sticky left-0 bg-background z-10 border-r border-b text-center">
                                        <Checkbox 
                                                checked={selectedRowIds.has((record.id || `temp-${rowIndex}`) as string)}
                                                onCheckedChange={() => handleSelectRow((record.id || `temp-${rowIndex}`) as string)}
                                            />
                                    </TableCell>
                                    <TableCell className="font-medium text-muted-foreground sticky left-[40px] bg-background z-10 border-r text-center">{rowIndex + 1}</TableCell>
                                    {visibleColumns.map((col, colIndex) => {
                                        const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                                        const isInRange = isCellInSelection(rowIndex, colIndex);
                                        const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                                        const isInFill = isCellInDragFill(rowIndex, colIndex);
                                        const cellValue = getCellValue(record, col.key);
                                        const isUnsaved = localEdits[record.id]?.[col.key] !== undefined;

                                        return (
                                            <TableCell
                                                key={col.key}
                                                className={`p-0 relative excel-cell cursor-cell transition-colors border-r border-b ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/50 dark:bg-blue-950/30 z-10' :
                                                    isInRange ? 'bg-blue-50/80 dark:bg-blue-950/20' :
                                                        isInFill ? 'bg-green-50/80 dark:bg-green-950/20 ring-1 ring-green-400 ring-inset' :
                                                            ''
                                                    } ${isUnsaved ? 'bg-yellow-50/50 dark:bg-yellow-900/20' : ''}`}
                                                onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                                                onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                                                onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                                            >
                                                {isUnsaved && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-bl-sm z-20 pointer-events-none" />}
                                                {isEditing ? (
                                                    <Input
                                                        ref={editInputRef}
                                                        className="excel-cell border-none shadow-none ring-0 focus-visible:ring-0 h-8 px-2 bg-white dark:bg-gray-900 rounded-none"
                                                        value={String(cellValue)}
                                                        onChange={(e) => setLocalCellValue(record.id, col.key, e.target.value)}
                                                        onBlur={() => setEditingCell(null)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                setEditingCell(null);
                                                                const editedVal = localEdits[record.id]?.[col.key];
                                                                // if (editedVal !== undefined) commitCellEdit(record.id, col.key, editedVal); // Manual Save
                                                                setSelectedCell({ row: Math.min((filteredData?.length || 1) - 1, rowIndex + 1), col: colIndex });
                                                            }
                                                            if (e.key === 'Escape') {
                                                                setEditingCell(null);
                                                                setLocalEdits(prev => {
                                                                    const next = { ...prev };
                                                                    if (next[record.id]) delete next[record.id][col.key];
                                                                    return next;
                                                                });
                                                            }
                                                            if (e.key === 'Tab') {
                                                                e.preventDefault();
                                                                setEditingCell(null);
                                                                const editedVal = localEdits[record.id]?.[col.key];
                                                                if (editedVal !== undefined) commitCellEdit(record.id, col.key, editedVal);
                                                                const nextCol = Math.min(visibleColumns.length - 1, colIndex + 1);
                                                                setSelectedCell({ row: rowIndex, col: nextCol });
                                                                setEditingCell({ row: rowIndex, col: nextCol });
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="px-2 py-1.5 min-h-[32px] flex items-center text-sm truncate">
                                                        {col.key === 'package_lpa' && cellValue ? (
                                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                                                                ₹ {cellValue} LPA
                                                            </span>
                                                        ) : col.key === 'salary' && cellValue ? (
                                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                                ₹ {Number(cellValue).toLocaleString('en-IN')}
                                                            </span>
                                                        ) : col.key === 'offer_type' && cellValue ? (
                                                            <Badge variant="outline" className={`font-semibold ${String(cellValue).toLowerCase().includes('intern') ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                                                                {String(cellValue)}
                                                            </Badge>
                                                        ) : (
                                                            String(cellValue) || <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Fill Handle */}
                                                {isSelected && !isEditing && (
                                                    <div
                                                        className="absolute bottom-0 right-0 w-[7px] h-[7px] bg-blue-600 border border-white cursor-crosshair z-20"
                                                        onMouseDown={handleFillHandleMouseDown}
                                                        title="Drag to fill"
                                                    />
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-right sticky right-0 bg-background/95 backdrop-blur-sm shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l border-b">
                                        <div className="flex justify-end gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => { setEditingId(record.id); setIsDialogOpen(true); }}
                                                className="text-primary hover:bg-primary/10 hover:text-primary h-8 w-8 rounded-full transition-all"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 rounded-full transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
                                                    <div className="bg-destructive/10 p-6 border-b border-destructive/10">
                                                        <AlertDialogHeader>
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2.5 bg-destructive/10 rounded-2xl">
                                                                    <Trash2 className="h-5 w-5 text-destructive" />
                                                                </div>
                                                                <AlertDialogTitle className="text-xl font-black text-destructive/90">Delete Record?</AlertDialogTitle>
                                                            </div>
                                                        </AlertDialogHeader>
                                                    </div>
                                                    <div className="p-8">
                                                        <AlertDialogDescription className="text-sm font-semibold text-muted-foreground">
                                                            Are you sure you want to permanently delete the placement record for <b>{record.student_name}</b>? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                        <AlertDialogFooter className="mt-8">
                                                            <AlertDialogCancel className="h-11 rounded-xl font-bold border-2 border-primary/5">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => deleteMutation.mutate(record.id)} 
                                                                className="h-11 bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold px-6 shadow-lg shadow-destructive/20"
                                                            >
                                                                Delete Record
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </div>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
          </CardContent>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <b>{rowsToShow?.length}</b> record(s) currently listed.
                            {searchTerm || Object.keys(activeFilters).length > 0 ? " (Filtered results only)" : " (All records)"}
                            <br />This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                if (rowsToShow?.length) {
                                    const ids = rowsToShow.map((r: any) => r.id);
                                    deleteAllMutation.mutate(ids);
                                }
                            }}
                        >
                            Confirm Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-green-600 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" /> Saved Successfully
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            All changes have been committed to the database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setIsSuccessDialogOpen(false)}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Column Dialog */}
            <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Custom Column</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Column Name</Label>
                            <Input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="e.g. Bond Period" />
                        </div>
                        <Button onClick={handleAddCustomColumn} className="w-full">Add</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <PlacementRecordDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingId={editingId}
                customColumns={columnDefs.filter(c => c.isCustom).map(c => c.key)}
            />
        </Card>
    );
}

function PlacementRecordDialog({
    open,
    onOpenChange,
    editingId,
    customColumns = []
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId: string | null;
    customColumns: string[];
}) {
    const queryClient = useQueryClient();
    const { role, departmentId } = useAuth();
    const isEditing = !!editingId;

    const form = useForm<Partial<StudentPlacement>>({
        defaultValues: {}
    });

    const { data: departments } = useQuery({
        queryKey: ["departments"],
        queryFn: async () => {
            const { data } = await supabase.from("departments").select("id, code, name").order("code");
            return data;
        }
    });

    useQuery({
        queryKey: ["student-placement", editingId],
        queryFn: async () => {
            if (!editingId) return null;
            const { data } = await supabase.from("student_placements" as any).select("*").eq("id", editingId).single();
            if (data) form.reset(data as any);
            return data;
        },
        enabled: isEditing && open
    });

    useEffect(() => {
        if (!isEditing && open && role === "department_coordinator" && departments && departmentId) {
            const myDept = departments.find(d => d.id === departmentId);
            if (myDept) form.setValue("department", myDept.code);
        }
    }, [open, isEditing, role, departmentId, departments, form]);

    const mutation = useMutation({
        mutationFn: async (values: Partial<StudentPlacement>) => {
            if (isEditing) {
                const { error } = await supabase.from("student_placements" as any).update(values).eq("id", editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("student_placements" as any).insert([values]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(isEditing ? "Record updated" : "Record added");
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
            onOpenChange(false);
            form.reset({});
        },
        onError: (error) => toast.error("Error: " + error.message)
    });

    const onSubmit = (data: Partial<StudentPlacement>) => mutation.mutate(data);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Record" : "Add Placement Record"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input
                                {...form.register("company_name")}
                                onBlur={async (e) => {
                                    form.register("company_name").onBlur(e);
                                    const val = e.target.value;
                                    if (val) {
                                        const { data } = await supabase.from("master_companies" as any).select("*").eq("company_name", val).single();
                                        if (data) {
                                            if (!form.getValues("company_mail")) form.setValue("company_mail", data.company_mail || "");
                                            if (!form.getValues("company_address")) form.setValue("company_address", data.company_address || "");
                                            if (!form.getValues("hr_name")) form.setValue("hr_name", data.hr_name || "");
                                            if (!form.getValues("hr_mail")) form.setValue("hr_mail", data.hr_mail || "");
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Company Mail</Label>
                            <Input {...form.register("company_mail")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Company Address</Label>
                            <Input {...form.register("company_address")} />
                        </div>
                        <div className="space-y-2">
                            <Label>HR Name</Label>
                            <Input {...form.register("hr_name")} />
                        </div>
                        <div className="space-y-2">
                            <Label>HR Mail</Label>
                            <Input {...form.register("hr_mail")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Student Name</Label>
                            <Input {...form.register("student_name")} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Student ID</Label>
                            <Input
                                {...form.register("student_id")}
                                onBlur={async (e) => {
                                    form.register("student_id").onBlur(e);
                                    const val = e.target.value;
                                    if (val) {
                                        const { data } = await supabase.from("master_students" as any).select("*").eq("student_id", val).single();
                                        if (data) {
                                            if (!form.getValues("student_name")) form.setValue("student_name", data.student_name || "");
                                            if (!form.getValues("student_mail")) form.setValue("student_mail", data.student_mail || "");
                                            if (!form.getValues("student_mobile")) form.setValue("student_mobile", data.student_mobile || "");
                                            // Ensure department code matches select options
                                            if (!form.getValues("department") && data.department) {
                                                // Try to find matching dept code roughly
                                                // Ideally master data has same codes, but we warn if mismatch
                                                form.setValue("department", data.department);
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Student Email</Label>
                            <Input {...form.register("student_mail")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Student Mobile</Label>
                            <Input {...form.register("student_mobile")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select onValueChange={(v) => form.setValue("department", v)} defaultValue={form.getValues("department")}>
                                <SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger>
                                <SelectContent>
                                    {departments?.map(d => <SelectItem key={d.id} value={d.code}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Offer Type</Label>
                            <Input {...form.register("offer_type")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Salary</Label>
                            <Input type="number" {...form.register("salary")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Package (LPA)</Label>
                            <Input type="number" step="0.1" {...form.register("package_lpa")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Year (Batch)</Label>
                            <Input type="number" {...form.register("current_year")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Semester</Label>
                            <Input type="number" {...form.register("semester")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Join Date</Label>
                            <Input type="date" {...form.register("join_date")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Reference No</Label>
                            <Input {...form.register("ref_no")} />
                        </div>
                    </div>
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending && <Clipboard className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Update" : "Create"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
