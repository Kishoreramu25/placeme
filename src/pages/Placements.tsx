import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Calendar, Building2, Briefcase, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";

export default function Placements() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: placements, isLoading } = useQuery({
    queryKey: ["all-placements-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placement_drives")
        .select(`
          *,
          companies (name, industry_domain, location, website),
          academic_years (year_label),
          selection_statistics (students_selected, ppo_count)
        `)
        .order("visit_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredPlacements = placements?.filter((drive) => {
    const companyName = (drive.companies as any)?.name?.toLowerCase() || "";
    const role = drive.role_offered?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();

    return companyName.includes(search) || role.includes(search);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Placement Repository</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <a href="/dashboard/tpo">Dashboard</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Placement Records</h2>
            <p className="text-muted-foreground">
              Search and view placement history, statistics, and company details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by company or role..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Drives</CardTitle>
                <CardDescription>List of all placement drives and their outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>CTC / Stipend</TableHead>
                        <TableHead>Selected</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlacements?.map((drive) => {
                        const totalSelected = drive.selection_statistics?.reduce(
                          (sum, stat) => sum + (stat.students_selected || 0),
                          0
                        ) || 0;

                        return (
                          <TableRow key={drive.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {(drive.companies as any)?.name}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {(drive.companies as any)?.location}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{drive.role_offered || "N/A"}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={drive.drive_type === "internship" ? "secondary" : "default"}>
                                {drive.drive_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div className="whitespace-nowrap">
                                  {format(new Date(drive.visit_date), "MMM d, yyyy")}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium whitespace-nowrap">
                                {drive.ctc_amount ? `₹${(drive.ctc_amount / 100000).toFixed(1)} LPA` : "-"}
                              </div>
                              {drive.stipend_amount && (
                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                  Stipend: ₹{drive.stipend_amount}/mo
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-success">{totalSelected}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="ghost">View Details</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Building2 className="h-5 w-5" />
                                      {(drive.companies as any)?.name} - Placement Details
                                    </DialogTitle>
                                    <DialogDescription>
                                      Detailed report for the drive conducted on {format(new Date(drive.visit_date), "MMMM d, yyyy")}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-muted-foreground">Role Offered</div>
                                        <div className="font-semibold">{drive.role_offered}</div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-muted-foreground">Package (CTC)</div>
                                        <div className="font-semibold">{drive.ctc_amount ? `₹${(drive.ctc_amount / 100000).toFixed(2)} LPA` : "N/A"}</div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-muted-foreground">Drive Type</div>
                                        <div className="capitalize">{drive.drive_type}</div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-muted-foreground">Mode</div>
                                        <div className="capitalize">{drive.visit_mode?.replace("_", " ")}</div>
                                      </div>
                                    </div>
                                    <div className="rounded-lg border p-4 bg-muted/50">
                                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" />
                                        Remarks & Student Details
                                      </h4>
                                      <p className="whitespace-pre-wrap text-sm">{drive.remarks || "No additional remarks or student list provided."}</p>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
