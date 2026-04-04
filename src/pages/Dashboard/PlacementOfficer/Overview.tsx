import { PlacementRecordTable } from "@/components/shared/PlacementRecordTable";

export default function TPOOverview() {
  return (
    <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Visit Data</h1>
          <p className="text-muted-foreground">
            Overview of all scheduled and completed company visits and their placement records.
          </p>
        </div>

        {/* Placement Record Table */}
        <PlacementRecordTable />
      </div>
  );
}