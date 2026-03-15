import { useAuth } from "@/hooks/useAuth";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  BarChart3,
  FileText,
  Users,
  GraduationCap,
  TrendingUp,
  PieChart,
  Settings,
  Plus,
  Briefcase,
  Database,
  BookOpen,
  CalendarRange,
  UserPlus,
  ClipboardCheck,
  History,
  ShieldCheck,
  LogOut,
  FileCheck,
  Inbox,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tpoNavItems: NavItem[] = [
  { title: "Dashboard", url: "/tpo", icon: LayoutDashboard },
  { title: "Placed Students", url: "/tpo/placed", icon: Award },
  { title: "Drive Management", url: "/tpo/drives", icon: CalendarRange },
  { title: "Application Pool", url: "/tpo/applications", icon: Inbox },
  { title: "Pending Approvals", url: "/tpo/approvals", icon: ClipboardCheck },
  { title: "Company Database", url: "/tpo/companies", icon: Building2 },
  { title: "Students Master", url: "/tpo/students", icon: Users },
  { title: "Analytics", url: "/tpo/analytics", icon: BarChart3 },
  { title: "User Management", url: "/tpo/users", icon: UserPlus },
  { title: "Settings", url: "/tpo/settings", icon: Settings },
];

const hodNavItems: NavItem[] = [
  { title: "Pending Students", url: "/hod", icon: ClipboardCheck },
  { title: "Drive Applications", url: "/hod/applications", icon: FileCheck },
  { title: "Manage Students", url: "/hod/students", icon: UserPlus },
  { title: "Approved History", url: "/hod/history", icon: History },
  { title: "Settings", url: "/hod/settings", icon: Settings },
];

const studentNavItems: NavItem[] = [
  { title: "Dashboard", url: "/student", icon: LayoutDashboard },
  { title: "My Profile", url: "/student/profile", icon: GraduationCap },
  { title: "Placement Drives", url: "/student/drives", icon: Briefcase },
  { title: "Resources", url: "/student/resources", icon: BookOpen },
  { title: "Settings", url: "/student/settings", icon: Settings },
];

const managementNavItems: NavItem[] = [
  { title: "Overview", url: "/management", icon: LayoutDashboard },
  { title: "Placement Trends", url: "/management/trends", icon: TrendingUp },
  { title: "Executive Report", url: "/management/reports", icon: FileText },
  { title: "Settings", url: "/management/settings", icon: Settings },
];




export function AppSidebar() {
  const { role } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case "placement_officer":
        return tpoNavItems;
      case "department_coordinator":
        return hodNavItems;
      case "management":
        return managementNavItems;
      case "student":
        return studentNavItems;

      default:
        return [];
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case "placement_officer":
        return <Users className="h-6 w-6" />;
      case "department_coordinator":
        return <GraduationCap className="h-6 w-6" />;
      case "management":
        return <TrendingUp className="h-6 w-6" />;
      case "student":
        return <GraduationCap className="h-6 w-6" />;

      default:
        return <LayoutDashboard className="h-6 w-6" />;
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case "placement_officer":
        return "TPO Dashboard";
      case "department_coordinator":
        return "HOD Dashboard";
      case "management":
        return "Management";
      case "student":
        return "Student Portal";

      default:
        return "Dashboard";
    }
  };

  const getSettingsUrl = () => {
    switch (role) {
      case "placement_officer": return "/tpo/settings";
      case "department_coordinator": return "/hod/settings";
      case "student": return "/student/settings";
      case "management": return "/management/settings";
      default: return "/auth";
    }
  };

  const navItems = getNavItems();

  return (
    <Sidebar className="border-r-0" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            {getRoleIcon()}
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                {getRoleLabel()}
              </span>
              <span className="text-xs text-sidebar-foreground/60">Placement System</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={collapsed ? "Settings" : undefined}>
              <NavLink
                to={getSettingsUrl()}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              >
                <Settings className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}