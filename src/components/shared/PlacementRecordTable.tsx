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
import { Plus, Save, Trash2, Upload, Loader2, RefreshCw, Download, Clipboard, Eye, EyeOff, X, CheckCircle2 } from "lucide-react";
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
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
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
    // const [customColumns, setCustomColumns] = useState<string[]>([]); // Replaced by derived state
    const [hideEmpty, setHideEmpty] = useState(false);
    const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

    // === Excel-like State ===
    type CellPos = { row: number; col: number };
    const [selectedCell, setSelectedCell] = useState<CellPos | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<CellPos | null>(null);
    const [editingCell, setEditingCell] = useState<CellPos | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragEnd, setDragEnd] = useState<CellPos | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

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
            { key: "v_visit_type", label: "Visit Type", visible: true, isCustom: false },
            { key: "date_of_visit", label: "Date", visible: true, isCustom: false },
            { key: "v_company_name", label: "Company", visible: true, isCustom: false },
            { key: "v_company_address", label: "Address", visible: true, isCustom: false },
            { key: "v_location", label: "Location", visible: true, isCustom: false },
            { key: "v_company_contact_person", label: "Contact Person", visible: true, isCustom: false },
            { key: "v_company_contact_number", label: "Contact No", visible: true, isCustom: false },
            { key: "v_company_mail_id", label: "Email", visible: true, isCustom: false },
            { key: "company_type", label: "Type", visible: true, isCustom: false },
            { key: "salary_package", label: "Salary", visible: true, isCustom: false },
            { key: "remark", label: "Remark", visible: true, isCustom: false },
            { key: "reference_faculty", label: "Ref Faculty", visible: true, isCustom: false },
            { key: "department", label: "Department", visible: false, isCustom: false },
            { key: "register_no", label: "Register No", visible: false, isCustom: false }
        ];

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge defaults in case new columns were added to code but not in local storage
                const merged = defaultCols.map(def => {
                    const found = parsed.find((p: any) => p.key === def.key);
                    return found ? { ...def, ...found } : def;
                });
                // Add any custom columns from storage
                const custom = parsed.filter((p: any) => p.isCustom);
                return [...merged, ...custom];
            } catch (e) {
                console.error("Error parsing column defs", e);
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
    const [searchTerm, setSearchTerm] = useState("");

    // Dynamic Filters
    interface FilterCriterion {
        id: string;
        field: keyof PlacementRecord;
        label: string;
        value: string;
    }

    const [activeFilters, setActiveFilters] = useState<FilterCriterion[]>([]);
    const [isAddingFilter, setIsAddingFilter] = useState(false);
    const [newFilterField, setNewFilterField] = useState<string>("");
    const [newFilterValue, setNewFilterValue] = useState<string>("");

    // Filter Fields Configuration
    const FILTER_FIELDS: { label: string; key: keyof PlacementRecord }[] = [
        { label: "Visit Type", key: "v_visit_type" },
        { label: "Company", key: "v_company_name" },
        { label: "Location", key: "v_location" },
        { label: "Company Type", key: "company_type" },
        { label: "Date of Visit", key: "date_of_visit" },
        { label: "Reference Faculty", key: "reference_faculty" }
    ];

    const filteredRecords = useMemo(() => {
        return records.filter((record) => {
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
    }, [records, searchTerm, activeFilters]);


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

    const handleDeleteAll = async () => {
        if (!confirm("Are you sure you want to delete ALL records? This action cannot be undone.")) return;

        setIsLoading(true);
        try {
            const { error } = await (supabase
                .from("placement_records" as any) as any)
                .delete()
                .not("id", "is", null);

            if (error) throw error;

            setRecords([]);
            toast.success("All records deleted successfully");
        } catch (error: any) {
            console.error("Delete all error:", error);
            toast.error("Failed to delete all records: " + (error.message || "Unknown error"));
        } finally {
            setIsLoading(false);
        }
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

        const fieldConfig = FILTER_FIELDS.find(f => f.key === newFilterField);
        if (!fieldConfig) return;

        const newFilter: FilterCriterion = {
            id: Math.random().toString(36).substr(2, 9),
            field: fieldConfig.key,
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
        <Card className="w-full border-t-4 border-t-primary shadow-lg">
            <CardHeader className="space-y-4 pb-6 bg-muted/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            Placement Records
                            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                        </CardTitle>
                        <CardDescription className="text-base mt-1">
                            Centralized placement data history and management
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setIsColumnDialogOpen(true)}
                            className="gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M9 3v18" /></svg>
                            Columns
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept=".xlsx, .xls, .csv"
                            multiple
                        />
                        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="shadow-sm">
                            <Upload className="mr-2 h-4 w-4" /> Import Excel/CSV
                        </Button>
                        <Button onClick={handlePasteFromClipboard} variant="outline" className="shadow-sm bg-primary/5 border-primary/20 hover:bg-primary/10">
                            <Clipboard className="mr-2 h-4 w-4 text-primary" /> Paste New Rows
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" className="shadow-sm">
                                    <Download className="mr-2 h-4 w-4" /> Export Data
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleDownload}>
                                    Export Filtered ({filteredRecords.length})
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleMultipleExport}>
                                    Export All (Multi-Sheet)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={addRow} variant="outline" className="shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Row
                        </Button>
                        <Button onClick={handlePasteAsNewColumn} variant="outline" className="shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> Paste New Column
                        </Button>
                        <Button onClick={fetchRecords} variant="ghost" size="icon" title="Refresh">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleDeleteAll} variant="destructive" size="icon" title="Delete All">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="shadow-sm">
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Changes
                        </Button>
                        <Button
                            variant={hideEmpty ? "secondary" : "outline"}
                            onClick={() => setHideEmpty(!hideEmpty)}
                            className="shadow-sm whitespace-nowrap"
                            title={hideEmpty ? "Show all columns" : "Show only 100% filled columns (Strict View)"}
                        >
                            {hideEmpty ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                            {hideEmpty ? "Disable Strict View" : "Enable Strict View"}
                        </Button>
                    </div>
                </div>

                {/* Direct Paste Hint */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 px-3 py-1.5 rounded-md border border-primary/10 w-fit">
                    <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span>Tip: You can <b>Ctrl+V</b> anywhere on this page to paste records directly from Excel!</span>
                </div>

                <div className="flex flex-col gap-4 mt-4 p-5 bg-background rounded-xl border shadow-sm">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <Input
                            className="h-12 pl-12 text-lg shadow-inner bg-muted/20 focus-visible:bg-background transition-colors"
                            placeholder="Universal Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {activeFilters.length > 0 && (
                        <div className="flex flex-wrap gap-2 py-2">
                            {activeFilters.map(filter => (
                                <span key={filter.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                    <span className="opacity-70">{filter.label}:</span>
                                    {filter.value}
                                    <button
                                        onClick={() => removeFilter(filter.id)}
                                        className="ml-1 rounded-full p-0.5 hover:bg-primary/20 text-primary"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </span>
                            ))}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground text-xs"
                                onClick={() => setActiveFilters([])}
                            >
                                Clear All
                            </Button>
                        </div>
                    )}

                    {!isAddingFilter ? (
                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={() => setIsAddingFilter(true)}
                                className="border-dashed gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Custom Filter
                            </Button>
                            <div className="text-right text-sm text-muted-foreground">
                                Records Found: <span className="text-primary text-lg font-bold">{filteredRecords.length}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-end gap-3 p-4 bg-muted/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                            <div className="w-full sm:w-1/3 space-y-2">
                                <label className="text-sm font-medium">Filter By</label>
                                <Select value={newFilterField} onValueChange={setNewFilterField}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select Field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FILTER_FIELDS.map(f => (
                                            <SelectItem key={String(f.key)} value={String(f.key)}>{f.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full sm:w-1/3 space-y-2">
                                <label className="text-sm font-medium">Select Value</label>
                                <Select value={newFilterValue} onValueChange={setNewFilterValue} disabled={!newFilterField}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder={!newFilterField ? "Select Field First" : "Select Value"} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {getAvailableValues(newFilterField).map((val: any) => (
                                            <SelectItem key={String(val)} value={String(val)}>
                                                {String(val)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={handleAddFilter} disabled={!newFilterField || !newFilterValue}>
                                    Apply Filter
                                </Button>
                                <Button variant="ghost" onClick={() => setIsAddingFilter(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="rounded-none border-t overflow-x-auto relative">
                    <Table className="min-w-[1800px] border-collapse">
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-b-2">
                                <TableHead className="w-12 text-center sticky left-0 z-20 bg-muted/95 backdrop-blur font-bold border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">#</TableHead>
                                {visibleColumns.map((col, index) => (
                                    <TableHead
                                        key={col.key}
                                        className="h-10 px-2 font-bold text-primary select-none bg-muted/50 border-r border-b relative group min-w-[150px]"
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
                                <TableHead className="text-right w-16 sticky right-0 z-20 bg-muted/95 backdrop-blur font-bold border-l shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">Actions</TableHead>
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
                                    <TableRow key={record.id || rowIndex} className="group transition-colors hover:bg-muted/30">
                                        <TableCell className="font-medium text-muted-foreground">{rowIndex + 1}</TableCell>

                                        {/* Unified Columns Loop */}
                                        {visibleColumns.map((colDef, colIndex) => {
                                            const field = colDef.key;
                                            const globalColIndex = colIndex;
                                            const isSelected = isCellInSelection(rowIndex, globalColIndex);
                                            const isEditing = editingCell?.row === rowIndex && editingCell?.col === globalColIndex;
                                            const isDragFill = isCellInDragFill(rowIndex, globalColIndex);

                                            // Determine cell style
                                            let cellClass = "p-0 border h-10 relative cursor-cell ";
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
                                                        <div className="w-full h-full px-2 flex items-center overflow-hidden whitespace-nowrap text-ellipsis">
                                                            {record[field]}
                                                        </div>
                                                    )}

                                                    {/* Drag Handle (bottom-right of selection end) */}
                                                    {selectedCell && selectionEnd === null && selectedCell.row === rowIndex && selectedCell.col === globalColIndex && (
                                                        <div
                                                            className="absolute bottom-[-4px] right-[-4px] w-3 h-3 bg-primary border-2 border-white cursor-crosshair z-20"
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                setIsDragging(true);
                                                                setDragEnd(selectedCell);
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                            );
                                        })}

                                        <TableCell className="text-right sticky right-0 bg-background/95 backdrop-blur-sm shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeRow(rowIndex, record)}
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 rounded-full transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
        </Card >
    );
}
