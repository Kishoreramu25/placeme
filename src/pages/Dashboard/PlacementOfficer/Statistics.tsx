import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { StatsCard } from "@/components/shared/StatsCard";
import { CardSkeleton } from "@/components/shared/LoadingState";
import { CSVUpload } from "@/components/shared/CSVUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, Building2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function Statistics() {
  const queryClient = useQueryClient();
  // Fetch all statistics with related data from placement_records
  const { data: statsData, isLoading } = useQuery({
    queryKey: ["all-statistics"],
    queryFn: async () => {
      const { data } = await (supabase.from("placement_records" as any) as any).select("*");
      if (!data) return [];

      // Aggregate manually
      // We want 1 row per Department per Company roughly
      const statsMap = new Map();

      data.forEach((r: any) => {
        const dept = "General"; // Reverting to General institutional view
        const company = r.v_company_name || "Unknown";
        const key = `${dept}-${company}`;

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            id: r.id,
            students_appeared: 0,
            students_selected: 0,
            ppo_count: 0,
            departments: { name: dept, code: dept },
            placement_drives: {
              visit_date: r.date_of_visit || r.created_at,
              companies: { name: company }
            }
          });
        }

        const entry = statsMap.get(key);
        entry.students_appeared += 1;

        const type = r.v_visit_type?.toLowerCase();
        // Since the template records represent selections, we count them as selected
        entry.students_selected += 1;
      });

      return Array.from(statsMap.values());
    },
  });

  // Calculate summary stats
  const summaryStats = statsData
    ? {
      totalAppeared: statsData.reduce((sum, s) => sum + (s.students_appeared || 0), 0),
      totalSelected: statsData.reduce((sum, s) => sum + (s.students_selected || 0), 0),
      totalPPO: statsData.reduce((sum, s) => sum + (s.ppo_count || 0), 0),
      avgSelectionRate:
        statsData.length > 0
          ? Math.round(
            (statsData.reduce((sum, s) => {
              if (s.students_appeared > 0) {
                return sum + (s.students_selected / s.students_appeared) * 100;
              }
              return sum;
            }, 0) /
              statsData.length)
          )
          : 0,
    }
    : { totalAppeared: 0, totalSelected: 0, totalPPO: 0, avgSelectionRate: 0 };

  // Department-wise aggregation
  const deptWiseStats = statsData
    ? Object.values(
      statsData.reduce((acc, s) => {
        const deptCode = (s.departments as any)?.code || "Unknown";
        if (!acc[deptCode]) {
          acc[deptCode] = {
            name: (s.departments as any)?.name || "Unknown",
            code: deptCode,
            appeared: 0,
            selected: 0,
            ppo: 0,
          };
        }
        acc[deptCode].appeared += s.students_appeared || 0;
        acc[deptCode].selected += s.students_selected || 0;
        acc[deptCode].ppo += s.ppo_count || 0;
        return acc;
      }, {} as Record<string, any>)
    )
    : [];

  return (
    <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
            <p className="text-muted-foreground">
              Comprehensive placement statistics and performance metrics
            </p>
          </div>
          <CSVUpload
            title="Upload Statistics"
            description="Upload a CSV file to add selection statistics for drives"
            templateHeaders={["Company Name", "Department Code", "Students Appeared", "Students Selected", "PPO Count"]}
            templateFileName="selection_statistics"
            exampleData={[
              { company_name: "Tech Corp", department_code: "CSE", students_appeared: "50", students_selected: "15", ppo_count: "3" },
              { company_name: "Tech Corp", department_code: "ECE", students_appeared: "30", students_selected: "8", ppo_count: "2" },
            ]}
            onUpload={async (data) => {
              // Get all departments
              const { data: allDepts } = await supabase.from("departments").select("id, code");
              const deptMap = new Map((allDepts || []).map((d) => [d.code.toLowerCase(), d.id]));

              // Get all drives with company names
              const { data: allDrives } = await supabase
                .from("placement_drives")
                .select("id, companies(name)")
                .order("visit_date", { ascending: false });

              const driveMap = new Map<string, string>();
              (allDrives || []).forEach((d) => {
                const name = (d.companies as any)?.name?.toLowerCase();
                if (name && !driveMap.has(name)) driveMap.set(name, d.id);
              });

              const records = [];
              for (const row of data) {
                const companyName = (row.company_name || row.company || "").toLowerCase();
                const deptCode = (row.department_code || row.department || "").toLowerCase();

                const driveId = driveMap.get(companyName);
                const deptId = deptMap.get(deptCode);

                if (!driveId || !deptId) continue;

                records.push({
                  drive_id: driveId,
                  department_id: deptId,
                  students_appeared: parseInt(row.students_appeared) || 0,
                  students_selected: parseInt(row.students_selected) || 0,
                  ppo_count: parseInt(row.ppo_count) || 0,
                });
              }

              if (records.length === 0) throw new Error("No valid records found. Check company names and department codes.");

              const { error } = await supabase.from("selection_statistics").insert(records);
              if (error) throw error;

              queryClient.invalidateQueries({ queryKey: ["all-statistics"] });
              toast.success(`${records.length} statistics records added successfully`);
            }}
          />
        </div>

        {/* Summary Stats */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <StatsCard
                title="Total Appeared"
                value={summaryStats.totalAppeared}
                icon={<Users className="h-6 w-6" />}
                variant="default"
              />
              <StatsCard
                title="Total Selected"
                value={summaryStats.totalSelected}
                icon={<TrendingUp className="h-6 w-6" />}
                variant="success"
              />
              <StatsCard
                title="PPO Conversions"
                value={summaryStats.totalPPO}
                icon={<Building2 className="h-6 w-6" />}
                variant="primary"
              />
              <StatsCard
                title="Avg Selection Rate"
                value={`${summaryStats.avgSelectionRate}%`}
                icon={<BarChart3 className="h-6 w-6" />}
                variant="warning"
              />
            </>
          )}
        </div>

        {/* Department-wise Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Department-wise Performance</CardTitle>
            <CardDescription>Placement statistics breakdown by department</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 rounded shimmer" />
                ))}
              </div>
            ) : deptWiseStats.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Appeared</TableHead>
                    <TableHead className="text-right">Selected</TableHead>
                    <TableHead className="text-right">PPO</TableHead>
                    <TableHead>Selection Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptWiseStats.map((dept: any) => {
                    const rate = dept.appeared > 0 ? Math.round((dept.selected / dept.appeared) * 100) : 0;
                    return (
                      <TableRow key={dept.code}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{dept.code}</p>
                            <p className="text-sm text-muted-foreground">{dept.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{dept.appeared}</TableCell>
                        <TableCell className="text-right font-medium text-success">{dept.selected}</TableCell>
                        <TableCell className="text-right font-medium text-primary">{dept.ppo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Progress value={rate} className="h-2 w-24" />
                            <span className="text-sm font-medium">{rate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No statistics recorded yet</p>
                <p className="text-sm text-muted-foreground">
                  Add selection statistics to placement drives
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Statistics Records */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Statistics Entries</CardTitle>
            <CardDescription>Latest selection statistics records</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded shimmer" />
                ))}
              </div>
            ) : statsData && statsData.length > 0 ? (
              <div className="space-y-4">
                {statsData.slice(0, 10).map((stat) => (
                  <div
                    key={stat.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {(stat.placement_drives as any)?.companies?.name || "Unknown Company"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(stat.departments as any)?.code} •{" "}
                          {new Date((stat.placement_drives as any)?.visit_date).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{stat.students_appeared}</p>
                        <p className="text-muted-foreground">Appeared</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-success">{stat.students_selected}</p>
                        <p className="text-muted-foreground">Selected</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-primary">{stat.ppo_count}</p>
                        <p className="text-muted-foreground">PPO</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No statistics entries yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}