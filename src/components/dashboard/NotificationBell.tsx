import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchDriveRosterData } from "@/lib/drive-roster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Trophy, 
  FileText,
  Circle,
  Siren,
  UserRound,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  user_id: string;
  role: string;
  type: 'new_drive' | 'application_submitted' | 'application_approved' | 'application_rejected' | 'attendance_absent' | 'drive_result' | 'student_verification';
  title: string;
  message: string;
  drive_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface InboxItem extends Notification {
  synthetic?: boolean;
}

export function NotificationBell() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [escalations, setEscalations] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      void refreshInbox();
      
      // Real-time subscription
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            toast.info(`New Notification: ${payload.new.title}`);
            void refreshInbox();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, role]);

  const refreshInbox = async () => {
    await Promise.all([fetchNotifications(), fetchEscalations()]);
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data as Notification[]);
    }
  };

  const fetchEscalations = async () => {
    if (!user || role !== "placement_officer") {
      setEscalations([]);
      return;
    }

    const { data: overdueDrives, error } = await supabase
      .from("placement_drives")
      .select(`
        id,
        role_offered,
        application_deadline,
        companies (name)
      `)
      .eq("created_by", user.id)
      .not("application_deadline", "is", null)
      .lt("application_deadline", new Date().toISOString())
      .order("application_deadline", { ascending: false })
      .limit(5);

    if (error || !overdueDrives?.length) {
      setEscalations([]);
      return;
    }

    const escalationItems = await Promise.all(
      (overdueDrives as any[]).map(async (drive) => {
        try {
          const roster = await fetchDriveRosterData(drive.id);
          const unresolvedStudents = roster.students.filter(
            (student) => student.isEligible && !student.applied && !student.nonApplicationReason?.trim()
          );

          if (!unresolvedStudents.length) {
            return null;
          }

          return {
            id: `escalation-${drive.id}`,
            user_id: user.id,
            role: "placement_officer",
            type: "attendance_absent" as const,
            title: `Reason Pending: ${drive.companies?.name || drive.role_offered || "Drive"}`,
            message: `${unresolvedStudents.length} eligible student(s) did not apply and still have no reason recorded after the deadline.`,
            drive_id: drive.id,
            is_read: false,
            created_at: drive.application_deadline,
            synthetic: true,
          } satisfies InboxItem;
        } catch (rosterError) {
          console.error("Failed to compute escalation notification:", rosterError);
          return null;
        }
      })
    );

    setEscalations(escalationItems.filter(Boolean) as InboxItem[]);
  };

  useEffect(() => {
    setUnreadCount(notifications.length + escalations.length);
  }, [notifications, escalations]);

  const markAsRead = async (id: string, silent = false) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (!silent) {
        toast.success("Notification marked as seen");
      }
    }
  };

  const getNotificationTarget = (notif: InboxItem) => {
    const lowerTitle = notif.title.toLowerCase();

    if (notif.type === "student_verification") {
      if (notif.role === "department_coordinator") return "/hod";
      if (notif.role === "placement_officer") return "/tpo/students";
      return "/student";
    }

    if (notif.type === "application_submitted") {
      if (notif.role === "department_coordinator") return "/hod/applications";
      if (notif.role === "placement_officer") return "/tpo/approvals";
      return "/student/drives";
    }

    if (notif.synthetic) return "/tpo/notifications";
    if (notif.type === "new_drive" && lowerTitle.includes("student did not apply")) return "/tpo/notifications";

    switch (notif.type) {
      case "new_drive":
        if (notif.role === "placement_officer") return "/tpo/drives";
        if (notif.role === "department_coordinator") return "/hod/upcoming";
        if (notif.role === "student") return "/student/drives";
        return "/management/notifications";
      case "application_approved":
      case "application_rejected":
        if (notif.role === "student") return "/student/drives";
        if (notif.role === "department_coordinator") return "/hod/applications";
        return "/tpo/approvals";
      case "attendance_absent":
      case "drive_result":
        return notif.role === "student" ? "/student/drives" : "/tpo/drives";
      default:
        return null;
    }
  };

  const openAction = async (notif: InboxItem) => {
    const target = getNotificationTarget(notif);
    if (!target) return;

    if (!notif.synthetic) {
      await markAsRead(notif.id, true);
    }

    navigate(target);
  };

  const getAudienceLabel = (recipientRole: string) => {
    switch (recipientRole) {
      case "placement_officer":
        return "Placement Officer";
      case "department_coordinator":
        return "Department Coordinator";
      case "student":
        return "Student";
      case "management":
        return "Management";
      default:
        return "User";
    }
  };

  const getNotificationMeta = (notif: InboxItem) => {
    if (notif.synthetic) {
      return {
        icon: <Siren className="h-4 w-4 text-rose-600" />,
        sender: "Escalation Engine",
        recipient: getAudienceLabel(notif.role),
        badge: "Action Required",
        badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
        cardClass: "border-l-4 border-l-rose-500 bg-rose-50/70",
        iconClass: "border-rose-200 bg-white",
      };
    }

    const lowerTitle = notif.title.toLowerCase();
    if (notif.type === "new_drive" && lowerTitle.includes("student did not apply")) {
      return {
        icon: <ShieldAlert className="h-4 w-4 text-rose-600" />,
        sender: "Department Coordinator",
        recipient: "Placement Officer",
        badge: "Follow-up Report",
        badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
        cardClass: "border-l-4 border-l-rose-500 bg-rose-50/60",
        iconClass: "border-rose-200 bg-white",
      };
    }

    if (notif.type === "application_submitted") {
      const isTpoAction = notif.role === "placement_officer";
      return {
        icon: <FileText className={`h-4 w-4 ${isTpoAction ? "text-indigo-600" : "text-cyan-600"}`} />,
        sender: isTpoAction ? "Department Coordinator" : "Student",
        recipient: getAudienceLabel(notif.role),
        badge: isTpoAction ? "Final Approval Queue" : "Application Submitted",
        badgeClass: isTpoAction
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-cyan-200 bg-cyan-50 text-cyan-700",
        cardClass: isTpoAction
          ? "border-l-4 border-l-indigo-500 bg-indigo-50/50"
          : "border-l-4 border-l-cyan-500 bg-cyan-50/50",
        iconClass: isTpoAction ? "border-indigo-200 bg-white" : "border-cyan-200 bg-white",
      };
    }

    if (notif.type === "student_verification") {
      const isTpoAction = notif.role === "placement_officer" || lowerTitle.includes("final verification");
      const isRejected = lowerTitle.includes("rejected");
      const isApprovedForStudent = notif.role === "student" && lowerTitle.includes("approved");
      const isTpoVerified = notif.role === "student" && lowerTitle.includes("verified by tpo");
      return {
        icon: <UserRound className={`h-4 w-4 ${isRejected ? "text-rose-600" : isTpoAction ? "text-indigo-600" : isApprovedForStudent || isTpoVerified ? "text-emerald-600" : "text-cyan-600"}`} />,
        sender: isTpoVerified ? "Placement Officer" : isApprovedForStudent || isRejected ? "Department Coordinator" : isTpoAction ? "Department Coordinator" : "Student Portal",
        recipient: getAudienceLabel(notif.role),
        badge: isRejected ? "Verification Rejected" : isTpoVerified ? "TPO Verified" : isApprovedForStudent ? "HOD Approved" : isTpoAction ? "Final Verification" : "Profile Submitted",
        badgeClass: isRejected
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : isTpoVerified || isApprovedForStudent
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : isTpoAction
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-cyan-200 bg-cyan-50 text-cyan-700",
        cardClass: isRejected
          ? "border-l-4 border-l-rose-500 bg-rose-50/50"
          : isTpoVerified || isApprovedForStudent
            ? "border-l-4 border-l-emerald-500 bg-emerald-50/50"
            : isTpoAction
              ? "border-l-4 border-l-indigo-500 bg-indigo-50/50"
              : "border-l-4 border-l-cyan-500 bg-cyan-50/50",
        iconClass: isRejected
          ? "border-rose-200 bg-white"
          : isTpoVerified || isApprovedForStudent
            ? "border-emerald-200 bg-white"
            : isTpoAction
              ? "border-indigo-200 bg-white"
              : "border-cyan-200 bg-white",
      };
    }

    switch (notif.type) {
      case "new_drive":
        return {
          icon: <Building2 className="h-4 w-4 text-sky-600" />,
          sender: "Placement Cell",
          recipient: getAudienceLabel(notif.role),
          badge: "Drive Incoming",
          badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
          cardClass: "border-l-4 border-l-sky-500 bg-sky-50/50",
          iconClass: "border-sky-200 bg-white",
        };
      case "application_approved":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
          sender: "Approval Desk",
          recipient: getAudienceLabel(notif.role),
          badge: "Approved",
          badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
          cardClass: "border-l-4 border-l-emerald-500 bg-emerald-50/50",
          iconClass: "border-emerald-200 bg-white",
        };
      case "application_rejected":
        return {
          icon: <XCircle className="h-4 w-4 text-rose-600" />,
          sender: "Approval Desk",
          recipient: getAudienceLabel(notif.role),
          badge: "Rejected",
          badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
          cardClass: "border-l-4 border-l-rose-500 bg-rose-50/50",
          iconClass: "border-rose-200 bg-white",
        };
      case "attendance_absent":
        return {
          icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
          sender: "Attendance Control",
          recipient: getAudienceLabel(notif.role),
          badge: "Attendance Alert",
          badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
          cardClass: "border-l-4 border-l-amber-500 bg-amber-50/50",
          iconClass: "border-amber-200 bg-white",
        };
      case "drive_result":
        return {
          icon: <Trophy className="h-4 w-4 text-violet-600" />,
          sender: "Placement Cell",
          recipient: getAudienceLabel(notif.role),
          badge: "Result Update",
          badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
          cardClass: "border-l-4 border-l-violet-500 bg-violet-50/50",
          iconClass: "border-violet-200 bg-white",
        };
      default:
        return {
          icon: <Bell className="h-4 w-4 text-slate-500" />,
          sender: "System",
          recipient: getAudienceLabel(notif.role),
          badge: "Notification",
          badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
          cardClass: "border-l-4 border-l-slate-400 bg-slate-50/70",
          iconClass: "border-slate-200 bg-white",
        };
    }
  };

  const inboxItems = [...escalations, ...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group hover:bg-slate-100 transition-all rounded-full h-10 w-10">
          <Bell className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center bg-rose-600 text-white border-2 border-white text-[10px] font-black p-0 rounded-full animate-in zoom-in duration-300">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0 border-none shadow-premium bg-white rounded-2xl overflow-hidden mt-2" align="end">
        <DropdownMenuLabel className="p-4 bg-slate-50/50 flex items-center justify-between border-b">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest text-slate-900">Intelligence Briefing</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Event Protocol Notifications</span>
          </div>
          {unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
        </DropdownMenuLabel>
        <ScrollArea className="h-[400px]">
          {inboxItems.length === 0 ? (
            <div className="p-12 text-center opacity-40">
              <Bell className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-widest">No Signals Detected</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inboxItems.map((notif) => {
                const meta = getNotificationMeta(notif);
                return (
                <DropdownMenuItem 
                  key={notif.id} 
                  className={`p-4 flex gap-4 cursor-default focus:bg-slate-50 transition-colors ${meta.cardClass}`}
                  onSelect={(event) => event.preventDefault()}
                >
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border transition-all ${meta.iconClass}`}>
                    {meta.icon}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] ${meta.badgeClass}`}>
                            {meta.badge}
                          </Badge>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                            From {meta.sender}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">
                            <ArrowRight className="inline h-3 w-3" />
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                            To {meta.recipient}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-tight">
                          <UserRound className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{notif.title}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 normal-case whitespace-nowrap shrink-0">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-bold whitespace-normal leading-relaxed mt-1">
                      {notif.message}
                    </p>
                    {notif.synthetic ? (
                      <div className="mt-2 rounded-xl border border-rose-200 bg-white/70 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-rose-700">
                        Deadline closed. Reason capture is still pending for one or more eligible students.
                      </div>
                    ) : !notif.is_read && (
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1">
                          <Circle className="h-1.5 w-1.5 fill-primary text-primary" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-primary">Unread Vector</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getNotificationTarget(notif) && (
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 rounded-full px-3 text-[9px] font-black uppercase tracking-widest"
                              onClick={(event) => {
                                event.stopPropagation();
                                void openAction(notif);
                              }}
                            >
                              Open Action
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-full border-primary/20 px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                            onClick={(event) => {
                              event.stopPropagation();
                              void markAsRead(notif.id);
                            }}
                          >
                            Mark Seen
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-3 bg-slate-50 text-center">
           <Button variant="ghost" size="sm" className="w-full h-8 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900" onClick={refreshInbox}>
             Refresh Neural Net
           </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
