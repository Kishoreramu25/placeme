import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { StatsCard } from "@/components/shared/StatsCard";
import { CardSkeleton } from "@/components/shared/LoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const CHART_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 84%, 60%)",
  "hsl(180, 70%, 45%)",
  "hsl(320, 70%, 50%)",
  "hsl(60, 80%, 45%)",
];

export default function ManagementOverview() {
  // Fetch overall statistics
  const { data: overallStats, isLoading: loadingStats } = useQuery({
    queryKey: ["management-overall-stats"],
    queryFn: async () => {
      const { data } = await (supabase.from("placement_records" as any) as any).select("v_visit_type, salary_package");
      if (!data) return { appeared: 0, selected: 0, ppo: 0 };

      const ppos = data.filter((r: any) => r.v_visit_type?.toLowerCase().includes("ppo")).length;

      return {
        appeared: data.length,
        selected: data.length, // Every row is a selection in master data
        ppo: ppos,
      };
    },
  });

  // Fetch company count
  const { data: companiesCount } = useQuery({
    queryKey: ["companies-count-mgmt"],
    queryFn: async () => {
      const { data } = await (supabase.from("placement_records" as any) as any).select("v_company_name");
      if (!data) return 0;
      return new Set(data.map((r: any) => r.v_company_name?.toLowerCase().trim())).size;
    },
  });


  // Fetch top companies by hires
  const { data: topCompanies } = useQuery({
    queryKey: ["top-companies"],
    queryFn: async () => {
      const { data } = await (supabase.from("placement_records" as any) as any).select("v_company_name");
      if (!data) return [];

      const companyHires: Record<string, number> = {};
      data.forEach((r: any) => {
        const name = r.v_company_name || "Unknown";
        companyHires[name] = (companyHires[name] || 0) + 1;
      });

      return Object.entries(companyHires)
        .map(([name, hires]) => ({ name, hires }))
        .sort((a, b) => b.hires - a.hires)
        .slice(0, 5);
    },
  });

  // Drive type distribution
  const { data: driveTypeData } = useQuery({
    queryKey: ["drive-types-mgmt"],
    queryFn: async () => {
      const { data } = await (supabase.from("placement_records" as any) as any).select("v_visit_type");
      if (!data) return [];

      const counts = data.reduce((acc: any, d: any) => {
        const type = d.v_visit_type || "Unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(counts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
    },
  });

  const placementRate =
    overallStats && overallStats.appeared > 0
      ? Math.round((overallStats.selected / overallStats.appeared) * 100)
      : 0;

  const ppoConversionRate =
    overallStats && overallStats.selected > 0
      ? Math.round((overallStats.ppo / overallStats.selected) * 100)
      : 0;

  return (
    <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground">
            Institution-wide placement analytics and insights
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loadingStats ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <StatsCard
                title="Total Companies"
                value={companiesCount || 0}
                icon={<Building2 className="h-6 w-6" />}
                variant="primary"
              />
              <StatsCard
                title="Students Placed"
                value={overallStats?.selected || 0}
                icon={<Users className="h-6 w-6" />}
                variant="success"
              />
              <StatsCard
                title="Placement Rate"
                value={`${placementRate}%`}
                icon={<TrendingUp className="h-6 w-6" />}
                variant="warning"
              />
              <StatsCard
                title="PPO Conversion"
                value={`${ppoConversionRate}%`}
                icon={<BarChart3 className="h-6 w-6" />}
                variant="default"
              />
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Drive Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Drive Distribution</CardTitle>
              <CardDescription>Placement vs Internship drives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {driveTypeData && driveTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={driveTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {driveTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No drives recorded
                  </div>
                )}
              </div>
              {driveTypeData && driveTypeData.length > 0 && (
                <div className="flex justify-center gap-6 mt-4">
                  {(driveTypeData as { name: string; value: number }[]).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {entry.name} ({entry.value})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Companies */}
        <Card>
          <CardHeader>
            <CardTitle>Top Recruiting Companies</CardTitle>
            <CardDescription>Companies with most hires</CardDescription>
          </CardHeader>
          <CardContent>
            {topCompanies && topCompanies.length > 0 ? (
              <div className="space-y-4">
                {topCompanies.map((company, index) => (
                  <div
                    key={company.name}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                        #{index + 1}
                      </div>
                      <p className="font-medium">{company.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-success">{company.hires}</p>
                      <p className="text-sm text-muted-foreground">students hired</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hiring data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}