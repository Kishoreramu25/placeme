import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared/LoadingState";
import { CSVUpload } from "@/components/shared/CSVUpload";
import { toast } from "sonner";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Building2, Phone, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companySchema, CompanyFormData } from "@/lib/validations";

interface Company {
  id: string;
  name: string;
  address: string | null;
  location: string | null;
  industry_domain: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  alternate_phone: string | null;
  created_at: string;
}

export default function Companies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      address: "",
      location: "",
      industry_domain: "",
      contact_person: "",
      contact_email: "",
      contact_phone: "",
      alternate_phone: "",
    },
  });

  // Fetch companies from placement_records
  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies", searchQuery],
    queryFn: async () => {
      let query = supabase.from("placement_records" as any).select("*").order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Filter unique companies
      const uniqueCompaniesMap = new Map();
      (data || []).forEach((record: any) => {
        const name = record.company_name?.trim();
        if (name && !uniqueCompaniesMap.has(name.toLowerCase())) {
          uniqueCompaniesMap.set(name.toLowerCase(), {
            id: record.id,
            name: name,
            address: record.company_address,
            location: record.company_address, // Using address as location proxy
            contact_email: record.company_mail,
            contact_person: record.hr_name,
            contact_phone: record.hr_mail, // Using HR mail as phone proxy if phone not available, or just leave blank
            industry_domain: "N/A", // Not in excel
            created_at: record.created_at
          });
        }
      });

      let companyList = Array.from(uniqueCompaniesMap.values());

      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        companyList = companyList.filter(c =>
          c.name.toLowerCase().includes(lowerQuery) ||
          (c.location && c.location.toLowerCase().includes(lowerQuery))
        );
      }

      return companyList as Company[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (editingCompany) {
        const { error } = await supabase
          .from("companies")
          .update({
            name: data.name,
            address: data.address || null,
            location: data.location || null,
            industry_domain: data.industry_domain || null,
            contact_person: data.contact_person || null,
            contact_email: data.contact_email || null,
            contact_phone: data.contact_phone || null,
            alternate_phone: data.alternate_phone || null,
          })
          .eq("id", editingCompany.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companies").insert({
          name: data.name,
          address: data.address || null,
          location: data.location || null,
          industry_domain: data.industry_domain || null,
          contact_person: data.contact_person || null,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
          alternate_phone: data.alternate_phone || null,
          created_by: user?.id || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsDialogOpen(false);
      setEditingCompany(null);
      form.reset();
      toast.success(editingCompany ? "Company updated successfully" : "Company added successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete company");
    },
  });

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    form.reset({
      name: company.name,
      address: company.address || "",
      location: company.location || "",
      industry_domain: company.industry_domain || "",
      contact_person: company.contact_person || "",
      contact_email: company.contact_email || "",
      contact_phone: company.contact_phone || "",
      alternate_phone: company.alternate_phone || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this company? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCompany(null);
    form.reset();
  };

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
            <p className="text-muted-foreground">Manage recruiting companies and their details</p>
          </div>
          <div className="flex gap-3">
            <CSVUpload
              title="Upload Companies"
              description="Upload a CSV file to add multiple companies at once"
              templateHeaders={["Name", "Industry", "Location", "Address", "Contact Person", "Email", "Phone", "Alternate Phone"]}
              templateFileName="companies"
              exampleData={[
                { name: "Tech Corp", industry: "IT", location: "Bangalore", address: "123 Tech Park", contact_person: "John Doe", email: "hr@techcorp.com", phone: "+91 9876543210", alternate_phone: "" },
                { name: "Data Systems", industry: "Analytics", location: "Hyderabad", address: "456 Data Hub", contact_person: "Jane Smith", email: "careers@datasys.com", phone: "+91 9876543211", alternate_phone: "+91 9876543212" },
              ]}
              onUpload={async (data) => {
                const records = data.map((row) => ({
                  name: row.name || row.company_name || "",
                  industry_domain: row.industry || row.industry_domain || null,
                  location: row.location || null,
                  address: row.address || null,
                  contact_person: row.contact_person || null,
                  contact_email: row.email || row.contact_email || null,
                  contact_phone: row.phone || row.contact_phone || null,
                  alternate_phone: row.alternate_phone || null,
                  created_by: user?.id || null,
                })).filter((r) => r.name);

                if (records.length === 0) throw new Error("No valid records found");

                const { error } = await supabase.from("companies").insert(records);
                if (error) throw error;

                queryClient.invalidateQueries({ queryKey: ["companies"] });
                toast.success(`${records.length} companies added successfully`);
              }}
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingCompany(null); form.reset(); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Company
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCompany ? "Edit Company" : "Add New Company"}</DialogTitle>
                  <DialogDescription>
                    {editingCompany
                      ? "Update the company details below"
                      : "Fill in the company details to add a new recruiting company"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="name">Company Name *</Label>
                      <Input id="name" {...form.register("name")} placeholder="e.g., Tech Solutions Pvt Ltd" />
                      {form.formState.errors.name && (
                        <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry_domain">Industry</Label>
                      <Input id="industry_domain" {...form.register("industry_domain")} placeholder="e.g., IT, Manufacturing" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" {...form.register("location")} placeholder="e.g., Bangalore" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea id="address" {...form.register("address")} placeholder="Full company address" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <Input id="contact_person" {...form.register("contact_person")} placeholder="HR Manager name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Email</Label>
                      <Input id="contact_email" type="email" {...form.register("contact_email")} placeholder="hr@company.com" />
                      {form.formState.errors.contact_email && (
                        <p className="text-sm text-destructive">{form.formState.errors.contact_email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Phone</Label>
                      <Input id="contact_phone" {...form.register("contact_phone")} placeholder="+91 98765 43210" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alternate_phone">Alternate Phone</Label>
                      <Input id="alternate_phone" {...form.register("alternate_phone")} placeholder="+91 98765 43211" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Saving..." : editingCompany ? "Update" : "Add Company"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search companies by name, location, or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Companies</CardTitle>
            <CardDescription>
              {companies?.length || 0} companies in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : companies && companies.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Added On</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id} className="table-row-hover">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{company.name}</p>
                              {company.address && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {company.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {company.industry_domain || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>{company.location || "—"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {company.contact_person && (
                              <p className="text-sm">{company.contact_person}</p>
                            )}
                            {company.contact_email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {company.contact_email}
                              </div>
                            )}
                            {company.contact_phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {company.contact_phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(company.created_at).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(company)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(company.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No companies found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Try a different search term" : "Add your first company to get started"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}