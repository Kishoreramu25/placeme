import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface CSVUploadProps {
  title: string;
  description: string;
  templateHeaders: string[];
  templateFileName: string;
  onUpload: (data: Record<string, string>[]) => Promise<void>;
  exampleData?: Record<string, string>[];
}

export function CSVUpload({
  title,
  description,
  templateHeaders,
  templateFileName,
  onUpload,
  exampleData,
}: CSVUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const data: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });
      data.push(row);
    }

    return data;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFile = async (selectedFile: File) => {
    setError(null);
    setUploadSuccess(false);

    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }

    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);
      setFile(selectedFile);
      setParsedData(data);
    } catch (err: any) {
      setError(err.message || "Failed to parse CSV file");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(parsedData);
      setUploadSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setFile(null);
        setParsedData([]);
        setUploadSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to upload data");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      templateHeaders.join(","),
      ...(exampleData || []).map((row) =>
        templateHeaders.map((h) => {
          const key = h.toLowerCase().replace(/\s+/g, "_");
          const value = row[key] || "";
          return value.includes(",") ? `"${value}"` : value;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${templateFileName}_template.csv`;
    link.click();
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setUploadSuccess(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-primary">
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </Button>

          {/* Drop Zone */}
          <div
            className={cn(
              "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              file && "border-success bg-success/5"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-success" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{parsedData.length} rows parsed</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Drag & drop your CSV file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {uploadSuccess && (
            <Alert className="border-success bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">Data uploaded successfully!</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData.length > 0 && !uploadSuccess && (
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">Preview ({parsedData.length} rows)</h4>
              <div className="max-h-32 overflow-auto text-sm text-muted-foreground">
                {parsedData.slice(0, 3).map((row, i) => (
                  <div key={i} className="truncate">
                    {Object.values(row).slice(0, 3).join(" • ")}...
                  </div>
                ))}
                {parsedData.length > 3 && (
                  <p className="text-xs mt-2">...and {parsedData.length - 3} more rows</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUpload}
              disabled={parsedData.length === 0 || isUploading || uploadSuccess}
            >
              {isUploading ? "Uploading..." : `Upload ${parsedData.length} Records`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
