import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Building2, Calendar, Edit2, Users, TrendingUp, Trophy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DepartmentDrives() {
    const { departmentId } = useAuth();
    const queryClient = useQueryClient();
    const [selectedDrive, setSelectedDrive] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [stats, setStats] = useState({ appeared: 0, selected: 0, ppo: 0 });

    // Fetch drives and their existing stats for this department
    const { data: drives, isLoading } = useQuery({
        queryKey: ["department-drives-list", departmentId],
        queryFn: async () => {
            // 1. Fetch all drives (assuming coordinators can see all drives and add their dept stats)
            // Alternatively, we could filter by specific eligible departments if that logic was strictly enforced
            const { data: allDrives } = await supabase
                .from("placement_drives")
                .select(`
          *,
          companies(name),
          selection_statistics(
            students_appeared,
            students_selected,
            ppo_count,
            department_id
          )
        `)
                .order("visit_date", { ascending: false });

            if (!allDrives) return [];

            // Process drives to attach the specific stats for this department
            return allDrives.map((drive) => {
                const myStats = drive.selection_statistics.find(
                    (s: any) => s.department_id === departmentId
                );
                return {
                    ...drive,
                    myStats: myStats || { students_appeared: 0, students_selected: 0, ppo_count: 0 },
                };
            });
        },
        enabled: !!departmentId,
    });

    const handleUpdate = (drive: any) => {
        setSelectedDrive(drive);
        setStats({
            appeared: drive.myStats.students_appeared,
            selected: drive.myStats.students_selected,
            ppo: drive.myStats.ppo_count,
        });
        setIsDialogOpen(true);
    };

    const handleSaveStats = async () => {
        try {
            if (!departmentId || !selectedDrive) return;

            // Check if a record already exists to determine if we update or insert
            // We can use upsert with a unique constraint on (drive_id, department_id) if it exists,
            // but 'selection_statistics' might not have that constraint explicitly defined in types.
            // We'll try to find the record ID first or use upsert logic.

            const { data: existingStats } = await supabase
                .from("selection_statistics")
                .select("id")
                .eq("drive_id", selectedDrive.id)
                .eq("department_id", departmentId)
                .single();

            let error;

            if (existingStats) {
                // Update
                const { error: updateError } = await supabase
                    .from("selection_statistics")
                    .update({
                        students_appeared: stats.appeared,
                        students_selected: stats.selected,
                        ppo_count: stats.ppo,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", existingStats.id);
                error = updateError;
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from("selection_statistics")
                    .insert({
                        drive_id: selectedDrive.id,
                        department_id: departmentId,
                        students_appeared: stats.appeared,
                        students_selected: stats.selected,
                        ppo_count: stats.ppo
                    });
                error = insertError;
            }

            if (error) throw error;

            toast.success("Department statistics updated successfully");
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["department-drives-list"] });
        } catch (err: any) {
            toast.error(err.message || "Failed to update statistics");
        }
    };

    if (!departmentId) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Department information not found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Department Drives</h1>
                    <p className="text-muted-foreground">
                        View placement drives and update student selection statistics for your department.
                    </p>
                </div>

                {isLoading ? (
                    <div>Loading drives...</div>
                ) : (
                    <div className="grid gap-6">
                        {drives?.map((drive) => (
                            <Card key={drive.id} className="overflow-hidden">
                                <div className="md:flex">
                                    <div className="p-6 md:w-2/3 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                                    <Building2 className="h-6 w-6 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-semibold">{(drive.companies as any)?.name}</h3>
                                                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-4 w-4" />
                                                            {format(new Date(drive.visit_date), "MMMM d, yyyy")}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="capitalize">{drive.drive_type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                            <div>
                                                <span className="text-muted-foreground">Role:</span> <span className="font-medium">{drive.role_offered || "N/A"}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Package:</span> <span className="font-medium">{drive.ctc_amount ? `₹${(drive.ctc_amount / 100000).toFixed(2)} LPA` : "N/A"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 p-6 md:w-1/3 border-t md:border-t-0 md:border-l flex flex-col justify-center gap-4">
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-background p-2 rounded border">
                                                <div className="text-2xl font-bold">{drive.myStats.students_appeared}</div>
                                                <div className="text-xs text-muted-foreground">Appeared</div>
                                            </div>
                                            <div className="bg-background p-2 rounded border border-success/20 bg-success/5">
                                                <div className="text-2xl font-bold text-success">{drive.myStats.students_selected}</div>
                                                <div className="text-xs text-muted-foreground">Selected</div>
                                            </div>
                                            <div className="bg-background p-2 rounded border border-primary/20 bg-primary/5">
                                                <div className="text-2xl font-bold text-primary">{drive.myStats.ppo_count}</div>
                                                <div className="text-xs text-muted-foreground">PPO</div>
                                            </div>
                                        </div>
                                        <Button onClick={() => handleUpdate(drive)} className="w-full">
                                            <Edit2 className="h-4 w-4 mr-2" />
                                            Update Statistics
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Selection Statistics</DialogTitle>
                            <DialogDescription>
                                Update the number of students from your department for <strong>{(selectedDrive?.companies as any)?.name}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        Appeared
                                    </Label>
                                    <Input
                                        type="number"
                                        value={stats.appeared}
                                        onChange={(e) => setStats({ ...stats, appeared: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-success" />
                                        Selected
                                    </Label>
                                    <Input
                                        type="number"
                                        value={stats.selected}
                                        onChange={(e) => setStats({ ...stats, selected: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-primary" />
                                        PPO (Pre-Placement Offers)
                                    </Label>
                                    <Input
                                        type="number"
                                        value={stats.ppo}
                                        onChange={(e) => setStats({ ...stats, ppo: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveStats}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
    );
}
