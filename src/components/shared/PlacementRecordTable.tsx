import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Save, Trash2, Upload, Loader2, RefreshCw, Download, Clipboard, Eye, EyeOff, X, CheckCircle2, Search, Filter, ArrowUpDown, ArrowUp, FileDown, Columns, GripVertical, ChevronDown, Wand2, Pencil, GraduationCap, Building, Calculator, DollarSign, CheckSquare, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

// Definition to match PLACEMENT_TEMPLATE.xlsx and placement_records table (Designation removed)
interface PlacementRecord {
    id?: string;
    v_visit_type: string;
    date_of_visit: string;
    v_company_name: string;
    v_company_address: string;
    v_location: string;
    v_company_contact_person: string;
    v_company_contact_number: string;
    v_company_mail_id: string;
    company_type: string;
    salary_package: string;
    remark: string;
    reference_faculty: string;
    department?: string;
    register_no?: string;
    other_details?: any;
    [key: string]: any; // Support dynamic fields
}

export function PlacementRecordTable() {
    const [records, setRecords] = useState<PlacementRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [focusedCell, setFocusedCell] = useState<{ index: number, field: string } | null>(null);
    const [hideEmpty, setHideEmpty] = useState(() => localStorage.getItem("pr_hideEmpty") === "true");
    const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    
    // Bulk Select State
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

    // === Excel-like State ===
    type CellPos = { row: number; col: number };
    const [selectedCell, setSelectedCell] = useState<CellPos | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<CellPos | null>(null);
    const [editingCell, setEditingCell] = useState<CellPos | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragEnd, setDragEnd] = useState<CellPos | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);

    const [showScrollTop, setShowScrollTop] = useState(false);
    const [tableScrollWidth, setTableScrollWidth] = useState(1800);

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

    // Helper: Get Selection Range
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

    const handleCellClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
        if (e.shiftKey && selectedCell) {
            setSelectionEnd({ row, col });
        } else {
            setSelectedCell({ row, col });
            setSelectionEnd(null);
            setEditingCell(null); // Stop editing when clicking elsewhere
        }
    }, [selectedCell]);

    const handleCellDoubleClick = useCallback((row: number, col: number) => {
        setEditingCell({ row, col });
        setSelectedCell({ row, col });
        setSelectionEnd(null);
    }, []);

    const handleCellMouseEnter = useCallback((row: number, col: number) => {
        if (isDragging && selectedCell) {
            setDragEnd({ row, col });
        } else if (selectedCell && !isDragging && (window.event as MouseEvent)?.buttons === 1) {
            // Drag selection logic (simple version: if mouse down, expand selection)
            // setSelectionEnd({ row, col }); // Optional: requires tracking mouse down state globally
        }
    }, [isDragging, selectedCell]);


    // === Column Definitions State with LocalStorage Persistence ===
    interface ColumnDef {
        key: string;
        label: string;
        visible: boolean;
        isCustom: boolean;
    }

    const [columnDefs, setColumnDefs] = useState<ColumnDef[]>(() => {
        const saved = localStorage.getItem("placement_record_column_defs_v2");
        const defaultCols: ColumnDef[] = [
            { key: "date_of_visit", label: "Date", visible: true, isCustom: false },
            { key: "v_company_name", label: "Company", visible: true, isCustom: false },
            { key: "v_visit_type", label: "Visit Type", visible: true, isCustom: false },
            { key: "salary_package", label: "Salary", visible: true, isCustom: false },
            { key: "v_location", label: "Location", visible: true, isCustom: false },
            { key: "company_type", label: "Type", visible: true, isCustom: false },
            { key: "v_company_contact_person", label: "Contact Person", visible: true, isCustom: false },
            { key: "v_company_contact_number", label: "Contact No", visible: true, isCustom: false },
            { key: "v_company_mail_id", label: "Email", visible: true, isCustom: false },
            { key: "v_company_address", label: "Address", visible: true, isCustom: false },
            { key: "remark", label: "Remark", visible: true, isCustom: false },
            { key: "reference_faculty", label: "Ref Faculty", visible: true, isCustom: false },
            { key: "department", label: "Department", visible: false, isCustom: false },
            { key: "register_no", label: "Register No", visible: false, isCustom: false }
        ];

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const orderMap = defaultCols.reduce((acc: any, col, idx) => { acc[col.key] = idx; return acc; }, {});
                
                // Merge states while enforcing new professional order
                const baseCols = defaultCols.map(def => {
                    const found = parsed.find((p: any) => p.key === def.key);
                    return found ? { ...def, ...found } : def;
                });

                const custom = parsed.filter((p: any) => p.isCustom && !orderMap[p.key]);
                return [...baseCols, ...custom];
            } catch (e) {
                return defaultCols;
            }
        }
        return defaultCols;
    });

    useEffect(() => {
        localStorage.setItem("placement_record_column_defs_v2", JSON.stringify(columnDefs));
    }, [columnDefs]);

    // Header Editing State
    const [editingHeaderKey, setEditingHeaderKey] = useState<string | null>(null);
    const [tempHeaderName, setTempHeaderName] = useState("");
    const [newColumnName, setNewColumnName] = useState(""); // For new custom columns

    const handleHeaderRename = (key: string, newLabel: string) => {
        setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, label: newLabel } : col));
        setEditingHeaderKey(null);
    };

    const handleHideColumn = (key: string) => {
        setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, visible: false } : col));
    };

    const handleUnhideColumn = (key: string) => {
        setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, visible: true } : col));
    };

    // Calculate visible and custom columns from state
    const visibleColumns = columnDefs.filter(c => c.visible);
    // Compatibility helpers
    const COLUMN_KEYS = visibleColumns.map(c => c.key);
    const customColumns = columnDefs.filter(c => c.isCustom).map(c => c.key); // This replaces the old customColumns state logic mostly


    const isRowEmpty = (record: PlacementRecord) => {
        return COLUMN_KEYS.every(key => {
            const val = record[key];
            return val === null || val === undefined || val === "";
        });
    };

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem("pr_searchTerm") || "");

    // Dynamic Filters
    interface FilterCriterion {
        id: string;
        field: keyof PlacementRecord;
        label: string;
        value: string;
    }

    const [activeFilters, setActiveFilters] = useState<FilterCriterion[]>(() => {
        const saved = localStorage.getItem("pr_activeFilters");
        return saved ? JSON.parse(saved) : [];
    });
    const [isAddingFilter, setIsAddingFilter] = useState(false);
    const [newFilterField, setNewFilterField] = useState<string>("");
    const [newFilterValue, setNewFilterValue] = useState<string>("");
    const [filterValueSearch, setFilterValueSearch] = useState("");

    useEffect(() => {
        setFilterValueSearch("");
    }, [newFilterField]);

    // Sort State
    type SortOption = "date-desc" | "date-asc" | "company-asc" | "company-desc";
    const [sortBy, setSortBy] = useState<SortOption>(() => (localStorage.getItem("pr_sortBy") as SortOption) || "date-desc");
    const [isRowDialogOpen, setIsRowDialogOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<PlacementRecord | null>(null);

    useEffect(() => {
        localStorage.setItem("pr_searchTerm", searchTerm);
        localStorage.setItem("pr_hideEmpty", String(hideEmpty));
        localStorage.setItem("pr_sortBy", sortBy);
        localStorage.setItem("pr_activeFilters", JSON.stringify(activeFilters));
    }, [searchTerm, hideEmpty, sortBy, activeFilters]);



    const filteredRecords = useMemo(() => {
        const filtered = records.filter((record) => {
            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                const matchesSearch = (
                    (record.v_company_name?.toLowerCase() || "").includes(lowerSearch) ||
                    (record.v_location?.toLowerCase() || "").includes(lowerSearch) ||
                    (record.v_company_contact_person?.toLowerCase() || "").includes(lowerSearch) ||
                    (record.v_company_mail_id?.toLowerCase() || "").includes(lowerSearch) ||
                    (record.remark?.toLowerCase() || "").includes(lowerSearch) ||
                    (record.reference_faculty?.toLowerCase() || "").includes(lowerSearch)
                );
                if (!matchesSearch) return false;
            }

            for (const filter of activeFilters) {
                const recordVal = String(record[filter.field] || "").toLowerCase();
                const filterVal = filter.value.toLowerCase();
                if (recordVal !== filterVal) {
                    return false;
                }
            }

            return true;
        });

        // Apply sorting
        return filtered.sort((a, b) => {
            if (sortBy === "company-asc") {
                return String(a.v_company_name || "").localeCompare(String(b.v_company_name || ""));
            }
            if (sortBy === "company-desc") {
                return String(b.v_company_name || "").localeCompare(String(a.v_company_name || ""));
            }
            if (sortBy === "date-asc") {
                return new Date(a.date_of_visit || 0).getTime() - new Date(b.date_of_visit || 0).getTime();
            }
            if (sortBy === "date-desc") {
                return new Date(b.date_of_visit || 0).getTime() - new Date(a.date_of_visit || 0).getTime();
            }
            return 0;
        });
    }, [records, searchTerm, activeFilters, sortBy]);


    const processClipboardData = (clipboardText: string, useFocus: boolean = true) => {
        try {
            const rows = clipboardText.split(/\r?\n/).filter(line => line.length > 0);
            if (rows.length === 0) return false;
            const matrix = rows.map(row => row.split("\t"));

            if (useFocus && selectedCell) {
                const { row: startRow, col: startCol } = selectedCell;

                // Adjust for custom columns if needed
                // Helper to get key from visual index
                const getKeyFromIndex = (idx: number) => {
                    if (idx < COLUMN_KEYS.length) return COLUMN_KEYS[idx];
                    const customIdx = idx - COLUMN_KEYS.length;
                    if (customIdx >= 0 && customIdx < customColumns.length) return customColumns[customIdx];
                    return null;
                };

                let updatedRecords: PlacementRecord[] = [];
                const newRecords = [...records];

                matrix.forEach((cells, rOffset) => {
                    const visualRowIndex = startRow + rOffset;
                    const targetRecord = filteredRecords[visualRowIndex];
                    if (!targetRecord) return;

                    const originalIndex = newRecords.findIndex(r => r.id === targetRecord.id);
                    if (originalIndex === -1) return;

                    let recordChanged = false;
                    let currentRecord = { ...newRecords[originalIndex] };

                    cells.forEach((cellValue, cOffset) => {
                        const targetColIndex = startCol + cOffset;
                        const fieldKey = getKeyFromIndex(targetColIndex);

                        if (fieldKey) {
                            let val = cellValue.trim();
                            if (fieldKey === "date_of_visit") val = parseExcelDate(val);

                            if (currentRecord[fieldKey] !== val) {
                                currentRecord[fieldKey] = val;
                                recordChanged = true;
                            }
                        }
                    });

                    if (recordChanged) {
                        newRecords[originalIndex] = currentRecord;
                        updatedRecords.push(currentRecord);
                    }
                });

                if (updatedRecords.length > 0) {
                    setRecords(newRecords);
                    saveBatchChanges(updatedRecords);
                    toast.success(`Updated ${updatedRecords.length} records.`);
                }
                return true;
            }

            const firstRow = matrix[0];
            const headerKeywords = ["company", "visit", "date", "type", "location", "contact", "person", "number", "mail", "remark"];
            const hasHeaders = firstRow.some(cell => headerKeywords.some(keyword => cell.toLowerCase().includes(keyword)));

            let dataToMap: any[] = [];
            if (hasHeaders && matrix.length > 1) {
                const headers = firstRow;
                dataToMap = matrix.slice(1).map(rowCells => {
                    const obj: any = {};
                    headers.forEach((header, i) => { obj[header] = rowCells[i] || ""; });
                    return obj;
                });
            } else {
                if (!useFocus) toast.info("No headers detected. Mapping data based on default column order.");
                dataToMap = matrix.map(rowCells => {
                    const obj: any = {};
                    rowCells.forEach((cell, i) => { obj[`column_${i}`] = cell; });
                    return obj;
                });
            }

            const newRecords = dataToMap.map(row => mapExcelRowToRecord(row));
            setRecords(prev => [...newRecords, ...prev]);
            toast.success(`Imported ${newRecords.length} records.`);
            return true;
        } catch (err) {
            console.error("Paste error:", err);
            toast.error("Failed to parse clipboard data.");
            return false;
        }
    };

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) {
                toast.error("Clipboard is empty or access denied.");
                return;
            }
            processClipboardData(text, false);
        } catch (err) {
            toast.error("Browser blocked clipboard access. Please use Ctrl+V instead.");
        }
    };


    // Refs for event handlers to avoid dependency churning
    const selectedCellRef = useRef<CellPos | null>(null);
    const editingCellRef = useRef<CellPos | null>(null);
    const filteredRecordsRef = useRef<PlacementRecord[]>([]);

    useEffect(() => {
        selectedCellRef.current = selectedCell;
    }, [selectedCell]);

    useEffect(() => {
        editingCellRef.current = editingCell;
    }, [editingCell]);

    useEffect(() => {
        filteredRecordsRef.current = filteredRecords;
    }, [filteredRecords]);


    useEffect(() => {
        // Keyboard Navigation Handler
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const currentSelected = selectedCellRef.current;
            const currentEditing = editingCellRef.current;
            const currentFiltered = filteredRecordsRef.current;

            const isEditing = !!currentEditing;

            // If in dialog or search input (outside table), ignore
            if (target.closest('[role="dialog"]') || (target.tagName === 'INPUT' && !target.closest('td'))) return;

            // Enter to start editing
            if (e.key === 'Enter' && currentSelected && !isEditing) {
                e.preventDefault();
                setEditingCell({ ...currentSelected });
                return;
            }

            // Enter to stop editing
            if (e.key === 'Enter' && isEditing) {
                // e.preventDefault(); // Let it submit? No, standard Excel behavior is commit and move down
                setEditingCell(null);
                // Optional: Move down
                if (currentSelected) {
                    const nextRow = Math.min((currentFiltered?.length || 1) - 1, currentSelected.row + 1);
                    setSelectedCell({ row: nextRow, col: currentSelected.col });
                }
                return;
            }

            // Escape to cancel editing
            if (e.key === 'Escape') {
                setEditingCell(null);
                return;
            }

            // Navigation (only if NOT editing)
            if (!isEditing && currentSelected && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                e.preventDefault();
                const { row, col } = currentSelected;
                let newRow = row, newCol = col;
                const totalCols = COLUMN_KEYS.length + customColumns.length;

                if (e.key === 'ArrowUp') newRow = Math.max(0, row - 1);
                // Fix: Use filteredRecords for bounds
                if (e.key === 'ArrowDown') newRow = Math.min((currentFiltered?.length || 1) - 1, row + 1);
                if (e.key === 'ArrowLeft') newCol = Math.max(0, col - 1);
                if (e.key === 'ArrowRight' || e.key === 'Tab') newCol = Math.min(totalCols - 1, col + 1);

                if (e.shiftKey) {
                    setSelectionEnd({ row: newRow, col: newCol });
                } else {
                    setSelectedCell({ row: newRow, col: newCol });
                    setSelectionEnd(null);
                }
            }

            // Delete (only if NOT editing)
            if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing && currentSelected) {
                e.preventDefault();
                // Clear content of selected cells
                // We need to recalculate range here since we don't have it in ref easily without state
                // But we have selectedCell and selectionEnd.
                // Actually, let's just use current logic.
                // Since `getSelectionRange` depends on state, and we are inside a listener that shouldn't depend on state...
                // Ideally we sync selectionEnd to a ref too.
                // For now, let's just trigger a separate handler or use a ref for selectionEnd too.
                // SIMPLIFICATION: Specifically for delete, we'll let it depend on `selectedCell` and update. 
                // BUT current architecture wants to avoid re-binding.
                // Let's add selectionEndRef.
            }

            // Ctrl+C (only if NOT editing)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isEditing && currentSelected) {
                // Copy logic - similarly needs Refs
            }
        };

        const handlePaste = (e: ClipboardEvent) => {
            const clipboardData = e.clipboardData?.getData("text");
            if (!clipboardData) return;

            const target = e.target as HTMLInputElement;
            if (editingCellRef.current) return;
            if (target && target.placeholder && target.placeholder.includes("Search")) return;

            if (processClipboardData(clipboardData, true)) {
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("paste", handlePaste);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("paste", handlePaste);
        };
    }, [customColumns, COLUMN_KEYS]); // Only re-bind if columns change structure. Refs handle the rest.


    // Drag-to-fill mouse handlers
    const handleFillHandleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseUp = () => {
            if (isDragging && selectedCell && dragEnd && filteredRecords) {
                const sourceRecord = filteredRecords[selectedCell.row];

                // Helper to get key from visual index
                const getKeyFromIndex = (idx: number) => {
                    if (idx < COLUMN_KEYS.length) return COLUMN_KEYS[idx];
                    const customIdx = idx - COLUMN_KEYS.length;
                    if (customIdx >= 0 && customIdx < customColumns.length) return customColumns[customIdx];
                    return null;
                };

                const colKey = getKeyFromIndex(selectedCell.col);

                if (sourceRecord && colKey) {
                    const sourceVal = sourceRecord[colKey] ?? "";
                    const startRow = selectedCell.row + 1;
                    const endRow = dragEnd.row;

                    if (endRow >= startRow) {
                        const batchUpdates: PlacementRecord[] = [];

                        // 1. Identify records to update from filtered view
                        for (let r = startRow; r <= endRow; r++) {
                            const targetRecord = filteredRecords[r];
                            if (!targetRecord) continue;
                            // Create a copy with the new value
                            const updatedRecord = { ...targetRecord, [colKey]: sourceVal };
                            batchUpdates.push(updatedRecord);
                        }

                        if (batchUpdates.length > 0) {
                            // 2. Update local state
                            setRecords(prev => {
                                const next = [...prev];
                                batchUpdates.forEach(update => {
                                    const idx = next.findIndex(n => n.id === update.id);
                                    if (idx !== -1) {
                                        next[idx] = { ...next[idx], [colKey]: sourceVal };
                                    }
                                });
                                return next;
                            });

                            // 3. Save to database
                            saveBatchChanges(batchUpdates);
                            toast.success("Cells filled.");
                        }
                    }
                }
            }
            setIsDragging(false);
            setDragEnd(null);
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [isDragging, selectedCell, dragEnd, filteredRecords, customColumns, COLUMN_KEYS]);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase
                .from("placement_records" as any) as any)
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching records:", error);
                toast.error("Failed to fetch records");
            } else {
                const mapped = (data as any[] || []).map(r => {
                    const other = r.other_details || {};
                    return { ...r, ...other };
                });
                setRecords(mapped);
            }
        } catch (err) {
            console.error("Exception fetching records:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const addRow = () => {
        const newRecord: PlacementRecord = {
            v_visit_type: "On Campus",
            date_of_visit: new Date().toISOString().split('T')[0],
            v_company_name: "",
            v_company_address: "",
            v_location: "",
            v_company_contact_person: "",
            v_company_contact_number: "",
            v_company_mail_id: "",
            company_type: "IT",
            salary_package: "",
            remark: "",
            reference_faculty: "",
        };
        setRecords([newRecord, ...records]);
    };

    const removeRow = async (rowIndex: number, recordToRemove: PlacementRecord) => {
        if (recordToRemove.id) {
            const { error } = await (supabase
                .from("placement_records" as any) as any)
                .delete()
                .eq("id", recordToRemove.id);

            if (error) {
                toast.error("Failed to delete record");
                return;
            }
            toast.success("Record deleted");
        }

        const index = records.indexOf(recordToRemove);
        if (index > -1) {
            const newRecords = [...records];
            newRecords.splice(index, 1);
            setRecords(newRecords);
        }
    };

    const addCustomColumn = () => {
        const name = newColumnName.trim();
        if (name) {
            const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            if (columnDefs.some((c) => c.key === key)) {
                toast.error("Column already exists");
                return;
            }
            setColumnDefs((prev) => [...prev, { key, label: name, visible: true, isCustom: true }]);
            toast.success(`Column "${name}" added`);
            setNewColumnName("");
        }
    };

    const rowsToShow = hideEmpty
        ? filteredRecords.filter((r) => !isRowEmpty(r))
        : filteredRecords;



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
        if (confirm(`Are you sure you want to delete ${selectedRowIds.size} records?`)) {
            const idsToDelete = Array.from(selectedRowIds);
            const remainingRecords = records.filter((r, idx) => !idsToDelete.includes(r.id || `temp-${idx}`));
            setRecords(remainingRecords);
            setSelectedRowIds(new Set());
            // Sync with backend natively only for real UUIDs
            idsToDelete.forEach(id => {
                if (!id.startsWith("temp-")) {
                    (supabase.from("placement_records" as any) as any).delete().eq("id", id).then();
                }
            });
            toast.success("Batch deleted successfully!");
        }
    };

    const handleBulkExport = () => {
        if (selectedRowIds.size === 0) return;
        const selectedData = records.filter((r, idx) => selectedRowIds.has(r.id || `temp-${idx}`));
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
        XLSX.utils.book_append_sheet(wb, ws, "Selected Companies");
        XLSX.writeFile(wb, `Company_Visits_Selected.xlsx`);
        toast.success(`Exported ${selectedData.length} companies.`);
        setSelectedRowIds(new Set());
    };

    const updateRecord = (recordToUpdate: PlacementRecord, field: keyof PlacementRecord, value: string) => {
        const index = records.indexOf(recordToUpdate);
        if (index === -1) return;
        const newRecords = [...records];
        newRecords[index] = { ...newRecords[index], [field]: value };
        setRecords(newRecords);
    };

    const cleanRecord = (r: PlacementRecord) => {
        const cleaned: any = {
            other_details: { ...(r.other_details || {}) }
        };

        columnDefs.forEach(col => {
            if (!col.isCustom) {
                cleaned[col.key] = r[col.key];
            } else {
                cleaned.other_details[col.key] = r[col.key];
            }
        });

        if (r.id) cleaned.id = r.id;
        return cleaned;
    };

    const saveCellChange = async (record: PlacementRecord, field: string, value: any) => {
        if (!record.id) return;

        const colDef = columnDefs.find(c => c.key === field);
        if (!colDef) return;

        try {
            let updatePayload: any = {};
            if (!colDef.isCustom) {
                updatePayload[field] = value;
            } else {
                const currentOther = { ...(record.other_details || {}) };
                currentOther[field] = value;
                updatePayload.other_details = currentOther;
            }

            const { error } = await (supabase
                .from("placement_records" as any) as any)
                .update(updatePayload)
                .eq("id", record.id);

            if (error) {
                console.error("Auto-save error:", error);
                toast.error("Failed to save change");
            }
        } catch (err) {
            console.error("Auto-save exception:", err);
        }
    };

    const saveBatchChanges = async (updatedRecords: PlacementRecord[]) => {
        const toUpsert = updatedRecords.map(cleanRecord);

        if (toUpsert.length === 0) return;

        try {
            const { error } = await (supabase as any).rpc('upsert_placement_records', {
                records: toUpsert
            });

            if (error) {
                console.error("Batch save error:", error);
                toast.error("Failed to save changes.");
            } else {
                toast.success("Changes saved.");
            }
        } catch (err) {
            console.error("Batch save exception:", err);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = records.map(cleanRecord);

            if (payload.length > 0) {
                const { error } = await (supabase as any).rpc('upsert_placement_records', {
                    records: payload
                });
                if (error) throw error;
            }

            toast.success("All records saved successfully!");
            setIsSuccessDialogOpen(true);
            fetchRecords();
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error("Failed to save records: " + (error.message || "Unknown error"));
        } finally {
            setIsSaving(false);
        }
    };

    const parseExcelDate = (value: any): string => {
        if (!value) return "";

        // If it's a number (Excel serial date), convert it
        if (typeof value === 'number' || (!isNaN(Number(value)) && !String(value).includes('-') && !String(value).includes('/'))) {
            const serial = Number(value);
            const date = new Date((serial - 25569) * 86400 * 1000);
            const offset = date.getTimezoneOffset() * 60000;
            const adjDate = new Date(date.getTime() + offset);
            return adjDate.toISOString().split('T')[0];
        }

        const dateStr = String(value).trim();
        if (!dateStr) return "";

        if (dateStr.includes('&') || dateStr.includes(' and ') || dateStr.includes(',') || dateStr.split(' ').length > 2) {
            return dateStr;
        }

        const parts = dateStr.split(/[./-]/);
        if (parts.length === 3) {
            const [d, m, y] = parts.map(Number);
            if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                const fullYear = y < 100 ? 2000 + y : y;
                const dObj = new Date(fullYear, m - 1, d);
                if (!isNaN(dObj.getTime())) {
                    return dObj.toISOString().split('T')[0];
                }
            }
        }

        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) {
            try {
                return new Date(parsed).toISOString().split('T')[0];
            } catch (e) {
                return dateStr;
            }
        }

        return dateStr;
    };

    const mapExcelRowToRecord = (row: any): PlacementRecord => {
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

        const findKeyByFuzzyMatch = (searchKeys: string[]) => {
            const normalizedSearchKeys = searchKeys.map(normalize);
            const rowKeys = Object.keys(row);

            for (const searchKey of searchKeys) {
                if (row[searchKey] !== undefined) return row[searchKey];
            }

            for (const rKey of rowKeys) {
                const normRKey = normalize(rKey);
                if (normalizedSearchKeys.includes(normRKey)) return row[rKey];
            }

            for (const rKey of rowKeys) {
                const normRKey = normalize(rKey);
                if (normalizedSearchKeys.some(sk => normRKey.includes(sk) || sk.includes(normRKey))) {
                    return row[rKey];
                }
            }
            return undefined;
        };

        const getVal = (keys: string[]) => String(findKeyByFuzzyMatch(keys) || "").trim();

        const normalizeVisitType = (val: string): string => {
            const visitTypeMap: Record<string, string> = {
                "on campus": "On Campus",
                "oncampus": "On Campus",
                "off campus": "Off Campus",
                "offcampus": "Off Campus",
                "direct": "Direct",
                "phone call": "Phone Call",
                "phonecall": "Phone Call",
                "pooled": "Pooled",
                "internship/ppo": "Internship/PPO",
                "internship": "Internship/PPO",
                "ppo": "Internship/PPO",
                "hackathon": "Hackathon",
            };
            return visitTypeMap[val.toLowerCase().trim()] || val;
        };

        return {
            v_visit_type: normalizeVisitType(getVal(["v_visit_type", "Visit Type", "Type", "Mode"])),
            date_of_visit: parseExcelDate(findKeyByFuzzyMatch(["date_of_visit", "Date of Visit", "Date", "Visit Date", "Arrival"])),
            v_company_name: getVal(["v_company_name", "Company Name", "Name of Company", "Company", "Organization"]),
            v_company_address: getVal(["v_company_address", "Company Address", "Address", "Office Address"]),
            v_location: getVal(["v_location", "Location", "City", "Venue"]),
            v_company_contact_person: getVal(["v_company_contact_person", "Contact Person", "HR Name", "Contact", "HR"]),
            v_company_contact_number: getVal(["v_company_contact_number", "Contact Number", "Mobile", "Phone", "HR Contact"]),
            v_company_mail_id: getVal(["v_company_mail_id", "Company Mail ID", "Email", "HR Mail", "Mail"]),
            company_type: getVal(["company_type", "Company Type", "Sector", "Industry"]),
            salary_package: getVal(["salary_package", "Salary Package", "Package", "CTC", "LPA", "Salary"]),
            remark: getVal(["remark", "Remark", "Notes", "Status"]),
            reference_faculty: getVal(["reference_faculty", "Reference Faculty", "Faculty", "Ref Faculty", "Faculty Ref", "Faculty Name"]),
        };
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileList = Array.from(files);
        setIsLoading(true);
        const processedFiles: string[] = [];

        try {
            const allFileResults = await Promise.all(fileList.map(async (file) => {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });
                let fileRecords: PlacementRecord[] = [];

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    if (jsonData.length > 0) {
                        const mapped = (jsonData as any[]).map(row => mapExcelRowToRecord(row));
                        fileRecords = [...fileRecords, ...mapped];
                    }
                });

                processedFiles.push(file.name);
                return fileRecords;
            }));

            const combinedRecords = allFileResults.flat();
            if (combinedRecords.length > 0) {
                setRecords(prev => [...combinedRecords, ...prev]);
                toast.success(`Imported ${combinedRecords.length} records from: ${processedFiles.join(", ")}`);
            } else {
                toast.error("No valid data found in the selected files.");
            }
        } catch (error) {
            console.error("Error parsing files:", error);
            toast.error("Failed to parse some files. Please ensure they are valid Excel/CSV files.");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handlePasteAsNewColumn = async () => {
        const columnName = prompt("Enter a name for the new column:");
        if (!columnName) return;

        const key = columnName.toLowerCase().replace(/[^a-z0-9]/g, '_');

        if (columnDefs.some(c => c.key === key)) {
            toast.error("Column already exists.");
            return;
        }

        try {
            const text = await navigator.clipboard.readText();
            if (!text) {
                toast.error("Clipboard is empty.");
                return;
            }

            const values = text.split(/\r?\n/).filter(line => line.length > 0);
            if (values.length === 0) {
                toast.error("No data found in clipboard.");
                return;
            }

            setRecords(prev => {
                return prev.map((record, index) => ({
                    ...record,
                    [key]: values[index] || ""
                }));
            });

            setColumnDefs(prev => [...prev, { key, label: columnName, visible: true, isCustom: true }]);
            toast.success(`Added column "${columnName}" with ${values.length} values.`);
        } catch (err) {
            toast.error("Failed to read clipboard. Please provide permissions.");
        }
    };

    const handleDownload = () => {
        if (filteredRecords.length === 0) {
            toast.error("No records to download based on current filters.");
            return;
        }

        const wb = XLSX.utils.book_new();
        const exportData = filteredRecords.map((r, i) => ({
            "S.No": i + 1,
            "Visit Type": r.v_visit_type,
            "Date of Visit": r.date_of_visit,
            "Company Name": r.v_company_name,
            "Company Address": r.v_company_address,
            "Location": r.v_location,
            "Contact Person": r.v_company_contact_person,
            "Contact Number": r.v_company_contact_number,
            "Company Mail ID": r.v_company_mail_id,
            "Company Type": r.company_type,
            "Salary Package": r.salary_package,
            "Remark": r.remark,
            ...Object.fromEntries(customColumns.map(col => [col, r[col] || ""]))
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Placement Records");
        XLSX.writeFile(wb, `Placement_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success(`Downloaded ${filteredRecords.length} records.`);
    };

    const handleMultipleExport = () => {
        if (records.length === 0) {
            toast.error("No records to export.");
            return;
        }

        const wb = XLSX.utils.book_new();

        const formatForExport = (data: PlacementRecord[]) => data.map((r, i) => ({
            "S.No": i + 1,
            "Visit Type": r.v_visit_type,
            "Date of Visit": r.date_of_visit,
            "Company Name": r.v_company_name,
            "Company Address": r.v_company_address,
            "Location": r.v_location,
            "Contact Person": r.v_company_contact_person,
            "Contact Number": r.v_company_contact_number,
            "Company Mail ID": r.v_company_mail_id,
            "Company Type": r.company_type,
            "Salary Package": r.salary_package,
            "Remark": r.remark,
            "Reference Faculty": r.reference_faculty,
            ...Object.fromEntries(customColumns.map(col => [col, r[col] || ""]))
        }));

        // Sheet 1: All Records
        const wsAll = XLSX.utils.json_to_sheet(formatForExport(records));
        XLSX.utils.book_append_sheet(wb, wsAll, "All Records");

        // Dynamic Sheets based on Company Type
        const types = ["IT", "CORE", "BPO", "OTHER"];
        types.forEach(type => {
            const filtered = records.filter(r => r.company_type === type);
            if (filtered.length > 0) {
                const wsType = XLSX.utils.json_to_sheet(formatForExport(filtered));
                XLSX.utils.book_append_sheet(wb, wsType, `${type} Records`);
            }
        });

        XLSX.writeFile(wb, `Multiple_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success(`Exported ${records.length} records in multiple sheets.`);
    };

    const getAvailableValues = (fieldKey: string) => {
        if (!fieldKey) return [];
        const unique = new Set(records.map((r: any) => r[fieldKey]).filter((v: any) => v !== undefined && v !== null && v !== ""));
        return Array.from(unique).sort();
    };

    const handleAddFilter = () => {
        if (!newFilterField || !newFilterValue) return;

        const fieldConfig = columnDefs.find(f => f.key === newFilterField);
        if (!fieldConfig) return;

        const newFilter: FilterCriterion = {
            id: Math.random().toString(36).substr(2, 9),
            field: fieldConfig.key as keyof PlacementRecord,
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

    return (
        <Card className="w-full border-0 shadow-premium overflow-hidden bg-background">
            <CardHeader className="space-y-6 pb-6 bg-muted/5 border-b px-4 md:px-6 pt-6">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                    <div>
                        <CardTitle className="text-2xl font-black flex items-center gap-3 tracking-tight text-primary">
                            Placement Records
                            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                        </CardTitle>
                        <CardDescription className="text-sm font-medium mt-1">
                            Centralized placement data history and management
                        </CardDescription>
                    </div>

                    {/* Peak Professional Action Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status/Refresh */}
                        <div className="flex items-center gap-1 mr-2 border-r pr-4 border-border/50">
                            <Button onClick={fetchRecords} variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 transition-colors" title="Sync from Database">
                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>

                        {/* Dropdown: Data Management */}
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
                                <DropdownMenuItem onClick={addRow} className="cursor-pointer gap-2 mb-1">
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

                        {/* Primary Save Button */}
                        <Button onClick={handleSave} disabled={isSaving} className="h-10 px-6 gap-2 shadow-md bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all font-bold">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                            Commit Changes
                        </Button>
                    </div>
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .csv" multiple />



                {/* Bulk Action Context Toolbar */}
                {selectedRowIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 border border-slate-700">
                        <div className="flex items-center gap-2 font-semibold">
                            <CheckSquare className="h-5 w-5 text-indigo-400" />
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
                                        {columnDefs.filter(f => !f.key.includes('address') && !f.key.includes('contact') && !f.key.includes('mail') && !f.key.includes('remark') && !f.key.includes('no')).map(f => (
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
                                        <SelectItem value="company-asc" className="text-xs font-medium">Company (A-Z)</SelectItem>
                                        <SelectItem value="company-desc" className="text-xs font-medium">Company (Z-A)</SelectItem>
                                    </SelectContent>
                                </Select>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="h-11 px-4 text-xs font-black shadow-sm border-2 border-primary/10 hover:bg-primary/5 transition-all rounded-xl gap-2">
                                            <Download className="h-4 w-4 text-primary" /> Export
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                                        <DropdownMenuItem onClick={handleDownload} className="cursor-pointer gap-2 py-2.5 text-xs font-bold">
                                            <Download className="h-4 w-4 text-blue-600" /> Current View
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleMultipleExport} className="cursor-pointer gap-2 py-2.5 text-xs font-bold">
                                            <Download className="h-4 w-4 text-blue-600" /> Master Multi-Sheet
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <div className="h-11 flex items-center px-4 rounded-xl bg-primary/5 border border-primary/10 text-primary font-black text-xs min-w-[100px] justify-center shadow-inner">
                                    {filteredRecords.length} Items
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
                    className="rounded-none overflow-auto relative shadow-sm select-none max-h-[70vh] custom-scrollbar focus:outline-none border" 
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
                    <Table className="min-w-[1800px] border-separate border-spacing-0 shadow-sm border-none">
                        <TableHeader className="sticky top-0 z-30 bg-white/95 backdrop-blur shadow-sm">
                            <TableRow className="hover:bg-transparent border-b">
                                <TableHead className="w-10 text-center sticky left-0 top-0 z-50 bg-white border-b border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                    <Checkbox 
                                        checked={rowsToShow?.length > 0 && selectedRowIds.size === rowsToShow.length}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="w-12 text-center sticky left-[40px] top-0 z-50 bg-white font-bold border-b border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)]">#</TableHead>
                                {visibleColumns.map((col, index) => (
                                    <TableHead
                                        key={col.key}
                                        className="h-12 px-2 font-bold text-primary select-none bg-white border-b border-r relative group min-w-[150px] sticky top-0 z-30"
                                        onDoubleClick={() => {
                                            setEditingHeaderKey(col.key);
                                            setTempHeaderName(col.label);
                                        }}
                                    >
                                        {editingHeaderKey === col.key ? (
                                            <Input
                                                autoFocus
                                                className="h-8 w-full px-2 py-0 text-sm"
                                                value={tempHeaderName}
                                                onChange={(e) => setTempHeaderName(e.target.value)}
                                                onBlur={() => handleHeaderRename(col.key, tempHeaderName)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleHeaderRename(col.key, tempHeaderName);
                                                    if (e.key === 'Escape') setEditingHeaderKey(null);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-between w-full h-full">
                                                <span className="truncate">{col.label}</span>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="sr-only">Menu</span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => setEditingHeaderKey(col.key)}>
                                                            Rename Column
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleHideColumn(col.key)} className="text-destructive">
                                                            Hide Column
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        )}
                                    </TableHead>
                                ))}
                                <TableHead className="text-right w-24 sticky right-0 top-0 z-50 bg-white border-b border-l shadow-[-2px_0_5px_rgba(0,0,0,0.05)] font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody
                            className="select-none"
                            onMouseLeave={() => setIsDragging(false)}
                            onMouseUp={() => setIsDragging(false)}
                        >
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={visibleColumns.length + 2} className="h-32 text-center text-muted-foreground">
                                        Loading records...
                                    </TableCell>
                                </TableRow>
                            ) : filteredRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleColumns.length + 2} className="h-32 text-center text-muted-foreground">
                                        No records match your criteria. try adjusting filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rowsToShow.map((record, rowIndex) => (
                                    <TableRow key={record.id || rowIndex} className="group transition-colors hover:bg-muted/30 border-b">
                                        <TableCell className="sticky left-0 bg-background z-10 border-r border-b text-center shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                            <Checkbox 
                                                checked={selectedRowIds.has((record.id || `temp-${rowIndex}`) as string)}
                                                onCheckedChange={() => handleSelectRow((record.id || `temp-${rowIndex}`) as string)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium text-muted-foreground sticky left-[40px] bg-background z-10 border-r border-b text-center shadow-[2px_0_5px_rgba(0,0,0,0.02)]">{rowIndex + 1}</TableCell>

                                        {/* Unified Columns Loop */}
                                        {visibleColumns.map((colDef, colIndex) => {
                                            const field = colDef.key;
                                            const cellValue = colDef.isCustom ? record.other_details?.[field] : (record as any)[field];
                                            const globalColIndex = colIndex;
                                            const isSelected = isCellInSelection(rowIndex, globalColIndex);
                                            const isEditing = editingCell?.row === rowIndex && editingCell?.col === globalColIndex;
                                            const isDragFill = isCellInDragFill(rowIndex, globalColIndex);

                                            // Determine cell style
                                            let cellClass = "p-0 border-r border-b h-10 relative cursor-cell ";
                                            if (isSelected) cellClass += "bg-blue-50 ring-1 ring-primary ring-inset ";
                                            if (isDragFill) cellClass += "bg-blue-100 ";
                                            if (selectedCell?.row === rowIndex && selectedCell?.col === globalColIndex && !isEditing) cellClass += "ring-2 ring-primary z-10 ";

                                            return (
                                                <TableCell
                                                    key={field}
                                                    className={cellClass}
                                                    onMouseDown={(e) => {
                                                        if (e.buttons === 1) setIsDragging(true);
                                                        handleCellClick(rowIndex, globalColIndex, e);
                                                    }}
                                                    onMouseEnter={() => handleCellMouseEnter(rowIndex, globalColIndex)}
                                                    onDoubleClick={() => handleCellDoubleClick(rowIndex, globalColIndex)}
                                                >
                                                    {isEditing ? (
                                                        (field === "v_visit_type" || field === "company_type") ? (
                                                            <Select
                                                                defaultOpen={true}
                                                                value={record[field]}
                                                                onValueChange={(val) => {
                                                                    updateRecord(record, field as any, val);
                                                                    saveCellChange(record, field as any, val);
                                                                    setEditingCell(null);
                                                                }}
                                                            >
                                                                <SelectTrigger className="border-none h-full w-full rounded-none focus:ring-0 px-2 shadow-none">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {field === "v_visit_type" ? (
                                                                        <>
                                                                            <SelectItem value="On Campus">On Campus</SelectItem>
                                                                            <SelectItem value="Off Campus">Off Campus</SelectItem>
                                                                            <SelectItem value="Direct">Direct</SelectItem>
                                                                            <SelectItem value="Phone Call">Phone Call</SelectItem>
                                                                            <SelectItem value="Pooled">Pooled</SelectItem>
                                                                            <SelectItem value="Hackathon">Hackathon</SelectItem>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <SelectItem value="IT">IT</SelectItem>
                                                                            <SelectItem value="CORE">CORE</SelectItem>
                                                                            <SelectItem value="BPO">BPO</SelectItem>
                                                                            <SelectItem value="OTHER">OTHER</SelectItem>
                                                                        </>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Input
                                                                autoFocus
                                                                value={record[field] || ""}
                                                                onChange={(e) => updateRecord(record, field as any, e.target.value)}
                                                                className="border-none shadow-none focus-visible:ring-0 h-full w-full rounded-none px-2 py-0"
                                                                onBlur={() => {
                                                                    saveCellChange(record, field as any, record[field]);
                                                                    setEditingCell(null);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        saveCellChange(record, field as any, record[field]);
                                                                        setEditingCell(null);
                                                                    }
                                                                }}
                                                            />
                                                        )
                                                    ) : (
                                                        <div className="truncate px-2 py-1.5 select-none min-h-[32px] flex items-center">
                                                            {field === 'salary_package' && cellValue ? (
                                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                                                                    {String(cellValue).includes('LPA') || String(cellValue).includes('₹') ? cellValue : `₹ ${cellValue}`}
                                                                </span>
                                                            ) : field === 'v_visit_type' && cellValue ? (
                                                                <Badge variant="outline" className={`font-semibold ${String(cellValue).toLowerCase().includes('on campus') ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-purple-200 text-purple-700 bg-purple-50'}`}>
                                                                    {String(cellValue)}
                                                                </Badge>
                                                            ) : field === 'remark' && cellValue ? (
                                                                <Badge variant="outline" className={`font-semibold ${String(cellValue).toLowerCase().includes('completed') ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>
                                                                    {String(cellValue)}
                                                                </Badge>
                                                            ) : (
                                                                cellValue !== undefined && cellValue !== "" ? String(cellValue) : <span className="text-muted-foreground opacity-50">-</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Drag Fill Handle */}
                                                    {isSelected && !isEditing && (
                                                        <div
                                                            className="absolute bottom-[-4px] right-[-4px] w-3 h-3 bg-primary border-2 border-white cursor-crosshair z-20"
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                setIsDragging(true);
                                                                setDragEnd({ row: rowIndex, col: globalColIndex });
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                            );
                                        })}

                                        <TableCell className="text-right sticky right-0 bg-background/95 backdrop-blur-sm shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => { setEditingRow(record); setIsRowDialogOpen(true); }}
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
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                                                <Trash2 className="h-5 w-5" /> Delete Record?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete this record for <b>{record.v_company_name || 'this company'}</b>? 
                                                                This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => removeRow(rowIndex, record)}
                                                                className="bg-destructive hover:bg-destructive/90 rounded-xl"
                                                            >
                                                                Delete Record
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
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

            <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Manage Columns</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                        {columnDefs.map((col) => (
                            <div key={col.key} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`col-${col.key}`}
                                    checked={col.visible}
                                    onCheckedChange={(checked) => {
                                        setColumnDefs(prev => prev.map(c => c.key === col.key ? { ...c, visible: !!checked } : c));
                                    }}
                                />
                                <Label htmlFor={`col-${col.key}`}>{col.label}</Label>
                            </div>
                        ))}
                    </div>
                    {/* Add Custom Column Helper */}
                    <div className="flex items-center space-x-2 border-t pt-4">
                        <Input
                            placeholder="New Column Name"
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                        />
                        <Button onClick={addCustomColumn} size="sm">Add</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Row Edit Dialog - Professional Modal */}
            <Dialog open={isRowDialogOpen} onOpenChange={setIsRowDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl overflow-hidden bg-background/95 backdrop-blur-xl">
                    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border-b border-primary/10">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2.5 bg-primary/10 rounded-2xl">
                                    <Pencil className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black text-primary/90">Edit Placement Record</DialogTitle>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Visit Session Details</p>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {columnDefs.map((col) => (
                                <div key={col.key} className="space-y-2 group">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-2">
                                        {col.key === 'v_company_name' && <Building className="h-3 w-3" />}
                                        {col.key === 'date_of_visit' && <Calculator className="h-3 w-3" />}
                                        {col.key === 'salary_package' && <DollarSign className="h-3 w-3" />}
                                        {col.label}
                                    </Label>
                                    {col.key === 'v_visit_type' ? (
                                        <Select 
                                            value={editingRow?.[col.key] || ''} 
                                            onValueChange={(val) => setEditingRow(prev => prev ? { ...prev, [col.key]: val } : null)}
                                        >
                                            <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-primary/10 hover:border-primary/30 transition-all font-semibold focus:ring-primary/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl p-1">
                                                <SelectItem value="On Campus">On Campus</SelectItem>
                                                <SelectItem value="Off Campus">Off Campus</SelectItem>
                                                <SelectItem value="Direct">Direct</SelectItem>
                                                <SelectItem value="Phone Call">Phone Call</SelectItem>
                                                <SelectItem value="Pooled">Pooled</SelectItem>
                                                <SelectItem value="Hackathon">Hackathon</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : col.key === 'company_type' ? (
                                        <Select 
                                            value={editingRow?.[col.key] || ''} 
                                            onValueChange={(val) => setEditingRow(prev => prev ? { ...prev, [col.key]: val } : null)}
                                        >
                                            <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-primary/10 hover:border-primary/30 transition-all font-semibold focus:ring-primary/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl p-1">
                                                <SelectItem value="IT">IT</SelectItem>
                                                <SelectItem value="CORE">CORE</SelectItem>
                                                <SelectItem value="BPO">BPO</SelectItem>
                                                <SelectItem value="OTHER">OTHER</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            value={col.isCustom ? (editingRow?.other_details?.[col.key] || '') : (editingRow?.[col.key] || '')}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditingRow(prev => {
                                                    if (!prev) return null;
                                                    if (col.isCustom) {
                                                        const other = { ...(prev.other_details || {}), [col.key]: val };
                                                        return { ...prev, other_details: other };
                                                    }
                                                    return { ...prev, [col.key]: val };
                                                });
                                            }}
                                            className="h-11 rounded-xl bg-muted/30 border-primary/10 hover:border-primary/20 transition-all font-semibold focus-visible:ring-primary/20"
                                            placeholder={`Enter ${col.label}...`}
                                            type={col.key === 'date_of_visit' ? 'date' : 'text'}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                            <Button 
                                className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all gap-2"
                                onClick={() => {
                                    if (editingRow) {
                                        setRecords(prev => prev.map(r => r.id === editingRow.id ? editingRow : r));
                                        saveBatchChanges([editingRow]);
                                        setIsRowDialogOpen(false);
                                    }
                                }}
                            >
                                <Save className="h-4 w-4" /> Save Record Details
                            </Button>
                            <Button 
                                variant="outline" 
                                className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-primary/5 hover:bg-primary/5 transition-all"
                                onClick={() => setIsRowDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card >
    );
}
