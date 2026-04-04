import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type AppRole = "placement_officer" | "department_coordinator" | "management" | "student";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If specific roles are required, check if user has one of them
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      // Redirect to appropriate dashboard based on role
      if (role === "placement_officer") {
        return <Navigate to="/tpo" replace />;
      } else if (role === "department_coordinator") {
        return <Navigate to="/hod" replace />;
      } else if (role === "management") {
        return <Navigate to="/management" replace />;
      } else if (role === "student") {
        return <Navigate to="/student" replace />;
      }
      return <Navigate to="/auth" replace />;
    }
  }

  return <>{children}</>;
}