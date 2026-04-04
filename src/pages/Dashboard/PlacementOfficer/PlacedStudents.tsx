import { StudentPlacementTable } from "@/components/placement/StudentPlacementTable";

export default function PlacedStudents() {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Placed Students</h1>
        <p className="text-muted-foreground">
          Complete placement records with full Excel-like editing, import, and export.
        </p>
      </div>

      <StudentPlacementTable />
    </div>
  );
}
