import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeInit } from "@/components/ThemeInit";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Dashboard Pages
import TPOOverview from "./pages/Dashboard/PlacementOfficer/Overview";
import Companies from "./pages/Dashboard/PlacementOfficer/Companies";
import Drives from "./pages/Dashboard/PlacementOfficer/Drives";
import Statistics from "./pages/Dashboard/PlacementOfficer/Statistics";
import Reports from "./pages/Dashboard/PlacementOfficer/Reports";
import CoordinatorOverview from "./pages/Dashboard/DepartmentCoordinator/Overview";
import DepartmentDrives from "./pages/Dashboard/DepartmentCoordinator/DepartmentDrives";
import ManagementOverview from "./pages/Dashboard/Management/Overview";
import Placements from "./pages/Placements";
import AddPlacement from "./pages/Dashboard/PlacementOfficer/AddPlacement";
import MasterData from "./pages/Dashboard/PlacementOfficer/MasterData";
import StudentRecords from "./pages/Dashboard/PlacementOfficer/StudentRecords";
import StudentsMaster from "./pages/Dashboard/PlacementOfficer/StudentsMaster";
import StudentApprovals from "./pages/Dashboard/DepartmentCoordinator/StudentApprovals";
import VerificationHistory from "./pages/Dashboard/DepartmentCoordinator/VerificationHistory";
import StudentProfile from "./pages/Dashboard/Student/StudentProfile";
import StudentDrives from "./pages/Dashboard/Student/StudentDrives";
import TPOUserManagement from "./pages/Dashboard/PlacementOfficer/UserManagement";
import ApplicationManagement from "./pages/Dashboard/PlacementOfficer/ApplicationManagement";
import DriveApplications from "./pages/Dashboard/DepartmentCoordinator/DriveApplications";
import HODManageUsers from "./pages/Dashboard/DepartmentCoordinator/ManageUsers";
import TPOApplicationApprovals from "./pages/Dashboard/PlacementOfficer/TPOApplicationApprovals";
import PlacedStudents from "./pages/Dashboard/PlacementOfficer/PlacedStudents";
import Settings from "./pages/Dashboard/Settings";
import AppGuide from "./pages/Dashboard/AppGuide";
import AttendanceConfirm from "./pages/AttendanceConfirm";
import QRScanner from "./pages/Dashboard/PlacementOfficer/QRScanner";
import UpcomingDrives from "./pages/Dashboard/DepartmentCoordinator/UpcomingDrives";
import NotificationsPage from "./pages/Dashboard/Notifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeInit />
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* TPO Dedicated Routes */}
            <Route
              path="/tpo"
              element={
                <ProtectedRoute allowedRoles={["placement_officer"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<TPOOverview />} />
              <Route path="drives" element={<Drives />} />
              <Route path="students" element={<StudentsMaster />} />
              <Route path="applications" element={<ApplicationManagement />} />
              <Route path="approvals" element={<TPOApplicationApprovals />} />
              <Route path="placed" element={<PlacedStudents />} />
              <Route path="users" element={<TPOUserManagement />} />
              <Route path="scanner" element={<QRScanner />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route
              path="/hod"
              element={
                <ProtectedRoute allowedRoles={["department_coordinator"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentApprovals />} />
              <Route path="upcoming" element={<UpcomingDrives />} />
              <Route path="history" element={<VerificationHistory />} />
              <Route path="applications" element={<DriveApplications />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Student Dedicated Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentProfile />} />
              <Route path="drives" element={<StudentDrives />} />
              <Route path="resources" element={<AppGuide />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Management Dedicated Routes */}
            <Route
              path="/management"
              element={
                <ProtectedRoute allowedRoles={["management"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ManagementOverview />} />
              <Route path="overview" element={<ManagementOverview />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Legacy Dashboard Redirects for backward compatibility */}
            <Route path="/dashboard/tpo" element={<Navigate to="/tpo" replace />} />
            <Route path="/dashboard/coordinator" element={<Navigate to="/hod" replace />} />
            <Route path="/dashboard/student" element={<Navigate to="/student" replace />} />

            {/* Public Routes */}
            <Route path="/placements" element={<Placements />} />
            <Route path="/attend" element={<AttendanceConfirm />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
