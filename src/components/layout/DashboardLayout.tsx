import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children?: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { role } = useAuth();
  
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className={cn(
            "flex-1 overflow-y-auto p-6 custom-scrollbar",
            role === "student" && "student-sharp-theme"
          )}>
            {children || <Outlet />}
            <footer className="py-8 text-center text-xs text-muted-foreground border-t mt-12">
              {/* © Zenetive Infotech — hidden for now */}
            </footer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}