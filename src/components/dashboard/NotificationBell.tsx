import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  Clock,
  Circle
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  user_id: string;
  role: string;
  type: 'new_drive' | 'application_approved' | 'application_rejected' | 'attendance_absent' | 'drive_result';
  title: string;
  message: string;
  drive_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
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
            setNotifications(prev => [payload.new as Notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            toast.info(`New Notification: ${payload.new.title}`);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_drive': return <Building2 className="h-4 w-4 text-blue-500" />;
      case 'application_approved': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'application_rejected': return <XCircle className="h-4 w-4 text-rose-500" />;
      case 'attendance_absent': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'drive_result': return <Trophy className="h-4 w-4 text-primary" />;
      default: return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

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
          {notifications.length === 0 ? (
            <div className="p-12 text-center opacity-40">
              <Bell className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-widest">No Signals Detected</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notif) => (
                <DropdownMenuItem 
                  key={notif.id} 
                  className={`p-4 flex gap-4 cursor-pointer focus:bg-slate-50 transition-colors ${!notif.is_read ? 'bg-primary/[0.02]' : ''}`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border ${!notif.is_read ? 'bg-white border-slate-200' : 'bg-slate-50 border-transparent'} transition-all`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-black text-slate-900 uppercase tracking-tight">
                      <span className="truncate">{notif.title}</span>
                      <span className="text-[9px] font-bold text-slate-400 normal-case whitespace-nowrap shrink-0">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold whitespace-normal leading-relaxed">
                      {notif.message}
                    </p>
                    {!notif.is_read && (
                      <div className="flex items-center gap-1 mt-1">
                        <Circle className="h-1.5 w-1.5 fill-primary text-primary" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-primary">Unread Vector</span>
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-3 bg-slate-50 text-center">
           <Button variant="ghost" size="sm" className="w-full h-8 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900" onClick={fetchNotifications}>
             Refresh Neural Net
           </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
