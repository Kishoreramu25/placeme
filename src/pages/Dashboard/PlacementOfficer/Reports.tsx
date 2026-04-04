
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Reports() {
  const { data: companies } = useQuery({
    queryKey: ["companies-export"],
    queryFn: async () => {
      const { data } = await supabase.from("placement_records" as any).select("company_name, company_mail, hr_name, hr_mail, company_address");
      if (!data) return [];

      const uniqueMap = new Map();
      data.forEach((r: any) => {
        if (r.company_name && !uniqueMap.has(r.company_name)) {
          uniqueMap.set(r.company_name, {
            name: r.company_name,
            industry_domain: "N/A",
            location: r.company_address,
            contact_person: r.hr_name,
            contact_email: r.company_mail || r.hr_mail,
            contact_phone: "N/A"
          });
        }
      });
      return Array.from(uniqueMap.values());
    },
  });

  const { data: drives } = useQuery({
    queryKey: ["drives-export"],
    queryFn: async () => {
      const { data } = await supabase.from("placement_records" as any).select("*");
      if (!data) return [];

      const uniqueDrivesMap = new Map();
      data.forEach((r: any) => {
        const companyName = r.company_name;
        if (!companyName) return;

        if (!uniqueDrivesMap.has(companyName)) {
          uniqueDrivesMap.set(companyName, {
            companies: { name: companyName },
            academic_years: { year_label: r.placed_year },
            drive_type: r.internship_or_placed,
            role_offered: "See records", // proxy
            visit_date: r.date_of_join,
            visit_mode: 'on_campus',
            ctc_amount: r.package_lpa
          });
        }
      });
      return Array.from(uniqueDrivesMap.values());
    },
  });

  const { data: statistics } = useQuery({
    queryKey: ["stats-export"],
    queryFn: async () => {
      const { data } = await supabase.from("placement_records" as any).select("*");
      if (!data) return [];

      // Group for export
      const statsMap = new Map();

      data.forEach((r: any) => {
        const dept = r.department || "Unknown";
        const company = r.company_name || "Unknown";
        const key = `${dept}-${company}`;

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            students_appeared: 0,
            students_selected: 0,
            ppo_count: 0,
            departments: { code: dept },
            placement_drives: {
              companies: { name: company },
              visit_date: r.date_of_join
            }
          });
        }
        const entry = statsMap.get(key);
        entry.students_appeared += 1;

        const type = r.internship_or_placed?.toLowerCase();
        if (type === 'placed' || type === 'both') {
          entry.students_selected += 1;
        }
        if (type === 'internship' || type === 'both') {
          entry.ppo_count += 1;
        }
      });
      return Array.from(statsMap.values());
    },
  });

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => {
          const keys = header.toLowerCase().replace(/ /g, "_").split(".");
          let value = row;
          for (const key of keys) {
            value = value?.[key] ?? "";
          }
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value);
          if (stringValue.includes(",") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Report exported successfully");
  };

  const exportCompanies = () => {
    const headers = ["Name", "Industry", "Location", "Contact Person", "Email", "Phone"];
    const formattedData = companies?.map((c) => ({
      name: c.name,
      industry: c.industry_domain,
      location: c.location,
      contact_person: c.contact_person,
      email: c.contact_email,
      phone: c.contact_phone,
    }));
    exportToCSV(formattedData || [], "companies_report", headers);
  };

  const exportDrives = () => {
    const headers = ["Company", "Academic Year", "Type", "Role", "Visit Date", "Mode", "CTC"];
    const formattedData = drives?.map((d) => ({
      company: (d.companies as any)?.name,
      academic_year: (d.academic_years as any)?.year_label,
      type: d.drive_type,
      role: d.role_offered,
      visit_date: d.visit_date,
      mode: d.visit_mode,
      ctc: d.ctc_amount,
    }));
    exportToCSV(formattedData || [], "drives_report", headers);
  };

  const exportStatistics = () => {
    const headers = ["Company", "Department", "Visit Date", "Appeared", "Selected", "PPO"];
    const formattedData = statistics?.map((s) => ({
      company: (s.placement_drives as any)?.companies?.name,
      department: (s.departments as any)?.code,
      visit_date: (s.placement_drives as any)?.visit_date,
      appeared: s.students_appeared,
      selected: s.students_selected,
      ppo: s.ppo_count,
    }));
    exportToCSV(formattedData || [], "statistics_report", headers);
  };

  const reportCards = [
    {
      title: "Companies Report",
      description: "Export all company details including contact information",
      icon: Building2,
      count: companies?.length || 0,
      action: exportCompanies,
    },
    {
      title: "Placement Drives Report",
      description: "Export all placement drive details with company info",
      icon: Calendar,
      count: drives?.length || 0,
      action: exportDrives,
    },
    {
      title: "Selection Statistics Report",
      description: "Export department-wise selection statistics",
      icon: FileText,
      count: statistics?.length || 0,
      action: exportStatistics,
    },
  ];

  return (
    <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download placement reports in CSV format
          </p>
        </div>

        {/* Report Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reportCards.map((report, index) => (
            <Card key={index} className="card-hover">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <report.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription>{report.count} records</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                <Button onClick={report.action} className="w-full" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Report Generation</CardTitle>
            <CardDescription>
              All reports are exported in CSV format and can be opened in Excel or Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 rounded-lg border p-4">
                <h4 className="font-medium mb-2">What's included?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Company details and contact information</li>
                  <li>• Placement drive schedules and outcomes</li>
                  <li>• Department-wise selection statistics</li>
                  <li>• PPO conversion data</li>
                </ul>
              </div>
              <div className="flex-1 rounded-lg border p-4">
                <h4 className="font-medium mb-2">Export formats</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• CSV (Comma Separated Values)</li>
                  <li>• Compatible with Excel, Google Sheets</li>
                  <li>• UTF-8 encoded for special characters</li>
                  <li>• Date stamped filenames</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}