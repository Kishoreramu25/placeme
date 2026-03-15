import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, User, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getRoleLabel = () => {
    switch (role) {
      case "placement_officer":
        return "Placement Officer";
      case "department_coordinator":
        return "HOD";
      case "management":
        return "Management";
      default:
        return "User";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-4 border-b bg-card/80 backdrop-blur-xl px-6">
      <SidebarTrigger className="text-foreground hover:bg-muted" />

      {/* College Logo & Banner */}
      <div className="flex items-center gap-3">
        <img
          src="/header_banner.png"
          alt="Erode Sengunthar Engineering College"
          className="h-10 w-auto object-contain hidden sm:block"
        />
      </div>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        className="mr-2 text-muted-foreground hover:text-destructive"
        onClick={handleSignOut}
        title="Sign Out"
      >
        <LogOut className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={profile?.avatar_url || undefined}
                alt={profile?.full_name || "User"}
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.full_name ? getInitials(profile.full_name) : "U"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
              <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
              <p className="text-xs leading-none text-primary mt-1">{getRoleLabel()}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}