import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  Circle,
  FileText,
  ShieldAlert,
  Siren,
  Trophy,
  UserRound,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchDriveRosterData } from "@/lib/drive-roster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type NotificationType =
  | "new_drive"
  | "application_submitted"
  | "application_approved"
  | "application_rejected"
  | "attendance_absent"
  | "drive_result"
  | "student_verification";

interface NotificationRecord {
  id: string;
  user_id: string;
  role: string;
  type: NotificationType;
  title: string;
  message: string;
  drive_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface InboxItem extends NotificationRecord {
  synthetic?: boolean;
}

function getAudienceLabel(recipientRole: string) {
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
}

function getNotificationMeta(notif: InboxItem) {
  if (notif.synthetic) {
    return {
      icon: <Siren className="h-5 w-5 text-rose-600" />,
      sender: "Escalation Engine",
      recipient: getAudienceLabel(notif.role),
      badge: "Action Required",
      badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
      cardClass: "border-rose-200 bg-rose-50/70",
      iconClass: "border-rose-200 bg-white",
    };
  }

  const lowerTitle = notif.title.toLowerCase();
  if (notif.type === "new_drive" && lowerTitle.includes("student did not apply")) {
    return {
      icon: <ShieldAlert className="h-5 w-5 text-rose-600" />,
      sender: "Department Coordinator",
      recipient: "Placement Officer",
      badge: "Follow-up Report",
      badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
      cardClass: "border-rose-200 bg-rose-50/60",
      iconClass: "border-rose-200 bg-white",
    };
  }

  if (notif.type === "application_submitted") {
    const isTpoAction = notif.role === "placement_officer";
    return {
      icon: <FileText className={`h-5 w-5 ${isTpoAction ? "text-indigo-600" : "text-cyan-600"}`} />,
      sender: isTpoAction ? "Department Coordinator" : "Student",
      recipient: getAudienceLabel(notif.role),
      badge: isTpoAction ? "Final Approval Queue" : "Application Submitted",
      badgeClass: isTpoAction
        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
        : "border-cyan-200 bg-cyan-50 text-cyan-700",
      cardClass: isTpoAction
        ? "border-indigo-200 bg-indigo-50/50"
        : "border-cyan-200 bg-cyan-50/50",
      iconClass: isTpoAction ? "border-indigo-200 bg-white" : "border-cyan-200 bg-white",
    };
  }

  if (notif.type === "student_verification") {
    const isTpoAction = notif.role === "placement_officer" || lowerTitle.includes("final verification");
    const isRejected = lowerTitle.includes("rejected");
    const isApprovedForStudent = notif.role === "student" && lowerTitle.includes("approved");
    const isTpoVerified = notif.role === "student" && lowerTitle.includes("verified by tpo");
    return {
      icon: <UserRound className={`h-5 w-5 ${isRejected ? "text-rose-600" : isTpoAction ? "text-indigo-600" : isApprovedForStudent || isTpoVerified ? "text-emerald-600" : "text-cyan-600"}`} />,
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
        ? "border-rose-200 bg-rose-50/50"
        : isTpoVerified || isApprovedForStudent
          ? "border-emerald-200 bg-emerald-50/50"
          : isTpoAction
            ? "border-indigo-200 bg-indigo-50/50"
            : "border-cyan-200 bg-cyan-50/50",
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
        icon: <Building2 className="h-5 w-5 text-sky-600" />,
        sender: "Placement Cell",
        recipient: getAudienceLabel(notif.role),
        badge: "Drive Incoming",
        badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
        cardClass: "border-sky-200 bg-sky-50/50",
        iconClass: "border-sky-200 bg-white",
      };
    case "application_approved":
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
        sender: "Approval Desk",
        recipient: getAudienceLabel(notif.role),
        badge: "Approved",
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
        cardClass: "border-emerald-200 bg-emerald-50/50",
        iconClass: "border-emerald-200 bg-white",
      };
    case "application_rejected":
      return {
        icon: <XCircle className="h-5 w-5 text-rose-600" />,
        sender: "Approval Desk",
        recipient: getAudienceLabel(notif.role),
        badge: "Rejected",
        badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
        cardClass: "border-rose-200 bg-rose-50/50",
        iconClass: "border-rose-200 bg-white",
      };
    case "attendance_absent":
      return {
        icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
        sender: "Attendance Control",
        recipient: getAudienceLabel(notif.role),
        badge: "Attendance Alert",
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
        cardClass: "border-amber-200 bg-amber-50/50",
        iconClass: "border-amber-200 bg-white",
      };
    case "drive_result":
      return {
        icon: <Trophy className="h-5 w-5 text-violet-600" />,
        sender: "Placement Cell",
        recipient: getAudienceLabel(notif.role),
        badge: "Result Update",
        badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
        cardClass: "border-violet-200 bg-violet-50/50",
        iconClass: "border-violet-200 bg-white",
      };
    default:
      return {
        icon: <Bell className="h-5 w-5 text-slate-500" />,
        sender: "System",
        recipient: getAudienceLabel(notif.role),
        badge: "Notification",
        badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
        cardClass: "border-slate-200 bg-slate-50/70",
        iconClass: "border-slate-200 bg-white",
      };
  }
}

export default function NotificationsPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [escalations, setEscalations] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const refreshInbox = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const notificationsPromise = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      const escalationsPromise =
        role === "placement_officer"
          ? supabase
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
              .limit(10)
          : Promise.resolve({ data: [], error: null } as any);

      const [{ data: notificationRows, error: notificationError }, { data: overdueDrives, error: escalationError }] =
        await Promise.all([notificationsPromise, escalationsPromise]);

      if (notificationError) throw notificationError;
      if (escalationError) throw escalationError;

      setNotifications((notificationRows || []) as NotificationRecord[]);

      if (role !== "placement_officer" || !overdueDrives?.length) {
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
    } catch (error: any) {
      toast.error(error.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    void refreshInbox();

    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refreshInbox();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  const inboxItems = useMemo(
    () =>
      [...escalations, ...notifications].sort(
        (a, b) =>
          sortOrder === "newest"
            ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [escalations, notifications, sortOrder]
  );

  const markAsRead = async (id: string) => {
    setMarkingId(id);
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setMarkingId(null);

    if (error) {
      toast.error(error.message || "Failed to mark notification as seen");
      return;
    }

    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    toast.success("Notification marked as seen");
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
      setMarkingId(notif.id);
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      setMarkingId(null);

      if (error) {
        toast.error(error.message || "Failed to open notification");
        return;
      }

      setNotifications((prev) => prev.filter((item) => item.id !== notif.id));
    }

    navigate(target);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Notifications</h1>
          <p className="text-sm font-medium text-slate-500">
            Professional event updates, approval signals, and escalation alerts.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "newest" | "oldest")}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort notifications" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">New To Old</SelectItem>
              <SelectItem value="oldest">Old To New</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full md:w-auto" onClick={() => void refreshInbox()}>
            Refresh Notifications
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Unread Inbox</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{notifications.length}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Escalation Alerts</p>
          <p className="mt-2 text-3xl font-black text-rose-700">{escalations.length}</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500">Audience</p>
          <p className="mt-2 text-lg font-black text-slate-900">{getAudienceLabel(role || "user")}</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-bold text-slate-400">
          Synchronizing notification feed...
        </div>
      ) : inboxItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <Bell className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-900">No active notifications</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">New drive alerts and escalation follow-ups will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <h2 className="text-lg font-black tracking-tight text-slate-900">All Notifications ({inboxItems.length})</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Everything in one simple feed. Notification routing and actions stay unchanged.</p>
          </div>
          {inboxItems.map((notif) => {
            const meta = getNotificationMeta(notif);
            return (
              <div
                key={notif.id}
                className={`rounded-2xl border p-5 shadow-sm transition-all ${meta.cardClass}`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${meta.iconClass}`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${meta.badgeClass}`}>
                          {meta.badge}
                        </Badge>
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          From {meta.sender}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          To {meta.recipient}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-slate-400" />
                        <h2 className="text-lg font-black tracking-tight text-slate-900">{notif.title}</h2>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">{notif.message}</p>
                      {notif.synthetic && (
                        <div className="mt-3 rounded-xl border border-rose-200 bg-white/80 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-rose-700">
                          Deadline closed. Eligible students still have no non-application reason recorded.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                    <span className="text-xs font-bold text-slate-400">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {getNotificationTarget(notif) && (
                        <Button
                          size="sm"
                          className="rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]"
                          disabled={markingId === notif.id}
                          onClick={() => void openAction(notif)}
                        >
                          {markingId === notif.id ? "Opening..." : "Open Action"}
                        </Button>
                      )}
                      {!notif.synthetic && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]"
                          disabled={markingId === notif.id}
                          onClick={() => void markAsRead(notif.id)}
                        >
                          {markingId === notif.id ? "Updating..." : "Mark Seen"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {!notif.synthetic && (
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                    Active unread notification
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
