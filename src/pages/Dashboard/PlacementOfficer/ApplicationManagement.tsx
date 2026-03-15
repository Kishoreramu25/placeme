import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  CheckCircle, XCircle, Eye, Loader2, Building2, User, 
  Calendar, Award, Search, Filter, Mail, Phone
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ApplicationManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { data: applications, isLoading } = useQuery({
    queryKey: ["tpo-drive-apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placement_applications")
        .select(`
          *,
          students_master (
            first_name,
            last_name,
            reg_no,
            current_cgpa
          ),
          placement_drives (
            id,
            role_offered,
            companies (name)
          )
        `)
        .in("status", ["approved_by_hod", "pending_tpo", "shortlisted", "interview_scheduled", "selected", "rejected_by_tpo"]);

      if (error) throw error;
      return data;
    },
  });

  const updateStatus = async (appId: string, status: string, interviewTs?: string) => {
    setIsProcessing(appId);
    try {
      const updateData: any = { status };
      if (interviewTs) updateData.interview_timestamp = interviewTs;

      const { error } = await supabase
        .from("placement_applications")
        .update(updateData)
        .eq("id", appId);

      if (error) throw error;
      
      toast.success(`Application updated to ${status.replace(/_/g, ' ')}`);
      queryClient.invalidateQueries({ queryKey: ["tpo-drive-apps"] });
      setIsDetailsOpen(false);
      setIsInterviewDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredApps = applications?.filter(app => 
    `${app.students_master?.first_name} ${app.students_master?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.placement_drives?.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.students_master?.reg_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved_by_hod":
      case "pending_tpo": return <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">HOD APPROVED</Badge>;
      case "shortlisted": return <Badge className="bg-blue-500">SHORTLISTED</Badge>;
      case "interview_scheduled": return <Badge className="bg-purple-500">INTERVIEW SET</Badge>;
      case "selected": return <Badge className="bg-green-600">PLACED</Badge>;
      case "rejected_by_tpo": return <Badge variant="destructive">REJECTED</Badge>;
      default: return <Badge>{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Main Application Pool</h1>
          <p className="text-muted-foreground">Manage student candidacies from Shortlist to final Selection.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidate or company..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="shadow-premium border-0 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase">Candidate</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Department</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Drive</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Status</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredApps?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No applications found.</TableCell></TableRow>
              ) : (
                filteredApps?.map((app) => (
                  <TableRow key={app.id} className="hover:bg-muted/30">
                    <TableCell className="py-3">
                      <div className="font-bold">{app.students_master?.first_name} {app.students_master?.last_name}</div>
                      <div className="text-[10px] font-mono">{app.students_master?.reg_no}</div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{app.students_master?.departments?.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{app.placement_drives?.companies?.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{app.placement_drives?.role_offered}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(app.status)}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm" onClick={() => { setSelectedApp(app); setIsDetailsOpen(true); }}>
                         <Eye className="h-4 w-4 mr-1" /> View Candidate
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* TPO Management Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Candidate Review: {selectedApp.students_master?.first_name} {selectedApp.students_master?.last_name}</DialogTitle>
                <div className="flex gap-2 pt-2">
                  {getStatusBadge(selectedApp.status)}
                  <Badge variant="outline">Verified by HOD</Badge>
                </div>
              </DialogHeader>

              <Tabs defaultValue="profile" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">Profile & Resume</TabsTrigger>
                  <TabsTrigger value="actions">Manage Status</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile" className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <h4 className="font-bold border-b pb-1 text-primary">Academic Metrics</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-muted/40 p-3 rounded-lg"><p className="text-[10px] font-bold text-muted-foreground uppercase">CGPA</p><p className="text-lg font-black">{selectedApp.students_master?.current_cgpa}</p></div>
                           <div className="bg-muted/40 p-3 rounded-lg"><p className="text-[10px] font-bold text-muted-foreground uppercase">Backlogs</p><p className="text-lg font-black">{selectedApp.students_master?.current_backlogs}</p></div>
                           <div className="bg-muted/40 p-3 rounded-lg"><p className="text-[10px] font-bold text-muted-foreground uppercase">10th %</p><p className="font-bold">{selectedApp.students_master?.tenth_mark}%</p></div>
                           <div className="bg-muted/40 p-3 rounded-lg"><p className="text-[10px] font-bold text-muted-foreground uppercase">12th %</p><p className="font-bold">{selectedApp.students_master?.twelfth_mark}%</p></div>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <h4 className="font-bold border-b pb-1 text-primary">Contact Info</h4>
                        <div className="space-y-3">
                           <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {selectedApp.students_master?.email_address}</div>
                           <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {selectedApp.students_master?.mobile_number}</div>
                           <div className="flex items-center gap-3 text-sm font-bold"><Award className="h-4 w-4 text-muted-foreground" /> Skills: {selectedApp.students_master?.skills}</div>
                        </div>
                     </div>
                  </div>
                </TabsContent>

                <TabsContent value="actions" className="pt-4 space-y-8">
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 h-16 px-8 flex-col"
                      onClick={() => updateStatus(selectedApp.id, "shortlisted")}
                      disabled={isProcessing === selectedApp.id}
                    >
                      <CheckCircle className="h-6 w-6 mb-1" />
                      <span>Shortlist for Drive</span>
                    </Button>

                    <Button 
                      className="bg-purple-600 hover:bg-purple-700 h-16 px-8 flex-col"
                      onClick={() => setIsInterviewDialogOpen(true)}
                      disabled={isProcessing === selectedApp.id}
                    >
                      <Calendar className="h-6 w-6 mb-1" />
                      <span>Schedule Interview</span>
                    </Button>

                    <Button 
                      className="bg-green-600 hover:bg-green-700 h-16 px-8 flex-col"
                      onClick={() => updateStatus(selectedApp.id, "selected")}
                      disabled={isProcessing === selectedApp.id}
                    >
                      <Award className="h-6 w-6 mb-1" />
                      <span>Mark as SELECTED</span>
                    </Button>

                    <Button 
                      variant="destructive"
                      className="h-16 px-8 flex-col"
                      onClick={() => updateStatus(selectedApp.id, "rejected_by_tpo")}
                      disabled={isProcessing === selectedApp.id}
                    >
                      <XCircle className="h-6 w-6 mb-1" />
                      <span>Reject from Drive</span>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Interview Scheduling Popup */}
      <Dialog open={isInterviewDialogOpen} onOpenChange={setIsInterviewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Interview Schedule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Interview Date & Time</Label>
              <Input 
                type="datetime-local" 
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">The student will be notified of this schedule via the portal.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInterviewDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-purple-600"
              onClick={() => updateStatus(selectedApp.id, "interview_scheduled", interviewDate)}
            >
              Confirm Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
