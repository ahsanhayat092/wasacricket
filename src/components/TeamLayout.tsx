import { useAuth } from "@/hooks/useAuth";
import { TeamProvider, useTeam } from "@/context/TeamContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  CalendarDays,
  ExternalLink,
  Home,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Plus,
  Shield,
  Trophy,
  Users,
  Inbox,
  Sparkles,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useLocation, useNavigate, Link, Outlet } from "react-router";
import { AuthLayoutSkeleton } from "./AuthLayoutSkeleton";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { TeamBadge } from "./TeamBadge";

const teamNavItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/team" },
  { icon: Users, label: "Players & Roster", path: "/team/players" },
  { icon: Trophy, label: "Tournaments", path: "/team/tournaments" },
  { icon: Inbox, label: "Requests & Invites", path: "/team/requests" },
];

export default function TeamLayout() {
  const { isLoading, user } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <AuthLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full border rounded-3xl bg-card shadow-xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
              <Users className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Sign in to Team Manager Hub
            </h1>
            <p className="text-xs text-muted-foreground max-w-sm">
              Create and manage your cricket team, register players, and join official tournaments.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full">
            <Button
              onClick={() => navigate("/team/login")}
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
            >
              Sign In to Your Team
            </Button>
            <Button
              onClick={() => navigate("/team/signup")}
              variant="outline"
              size="lg"
              className="w-full font-bold text-xs rounded-xl"
            >
              Create Team Manager Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TeamProvider>
      <SidebarProvider>
        <TeamLayoutContent />
      </SidebarProvider>
    </TeamProvider>
  );
}

function TeamLayoutContent() {
  const { user, logout } = useAuth();
  const { activeTeam, teams, setActiveTeamId } = useTeam();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  const activeNavItem = teamNavItems.find((item) =>
    item.path === "/team"
      ? location.pathname === "/team" || location.pathname === "/team/dashboard"
      : location.pathname.startsWith(item.path),
  );

  return (
    <>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="h-16 justify-center border-b px-3">
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={toggleSidebar}
              className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none shrink-0"
              aria-label="Toggle navigation"
            >
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            </button>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                {teams.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 text-left w-full hover:opacity-80 transition-opacity">
                        <TeamBadge shortName={activeTeam?.shortName || "TM"} logoUrl={activeTeam?.logoUrl} size="sm" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-xs truncate leading-none">
                            {activeTeam?.name || "My Cricket Team"}
                          </span>
                          <span className="text-[9px] text-emerald-500 font-bold uppercase mt-0.5">
                            Switch Team ▾
                          </span>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      {teams.map((t) => (
                        <DropdownMenuItem
                          key={t.id}
                          onClick={() => setActiveTeamId(t.id)}
                          className="cursor-pointer text-xs font-bold gap-2"
                        >
                          <TeamBadge shortName={t.shortName} logoUrl={t.logoUrl} size="sm" />
                          <span className="truncate">{t.name}</span>
                          {t.id === activeTeam?.id && (
                            <Badge className="ml-auto text-[8px] bg-emerald-600 text-white">Active</Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-2">
                    {activeTeam && (
                      <TeamBadge shortName={activeTeam.shortName} logoUrl={activeTeam.logoUrl} size="sm" />
                    )}
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="font-bold tracking-tight truncate text-xs">
                        {activeTeam?.name || "Team Workspace"}
                      </span>
                      <span className="text-[9px] text-emerald-500 uppercase font-extrabold flex items-center gap-1">
                        <Users className="h-2.5 w-2.5 inline" /> Team Manager
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="py-2">
          <SidebarMenu className="px-2 space-y-1">
            {teamNavItems.map((item) => {
              const isActive =
                item.path === "/team"
                  ? location.pathname === "/team" || location.pathname === "/team/dashboard"
                  : location.pathname.startsWith(item.path);

              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => navigate(item.path)}
                    tooltip={item.label}
                    className="h-9 transition-colors font-medium text-sm"
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          <div className="mt-6 px-4 pt-4 border-t space-y-2">
            <Link
              to="/tournaments"
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Trophy className="h-3.5 w-3.5 group-hover:text-amber-500" />
              {!isCollapsed && <span>Browse Tournaments</span>}
            </Link>
            <Link
              to="/admin"
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Shield className="h-3.5 w-3.5 group-hover:text-emerald-500" />
              {!isCollapsed && <span>Organizer Workspace</span>}
            </Link>
          </div>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors w-full text-left focus:outline-none group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8 border shrink-0">
                  <AvatarFallback className="text-xs font-bold bg-emerald-500/10 text-emerald-500">
                    {user?.name?.charAt(0).toUpperCase() || "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold truncate leading-none">
                      {user?.name || "Manager"}
                    </p>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/30 text-emerald-600">
                      Manager
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-1">
                    {user?.email || "manager"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5">
              <DropdownMenuItem
                onClick={() => navigate("/admin")}
                className="cursor-pointer text-xs font-semibold gap-2 py-2"
              >
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>Organizer Workspace</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/")}
                className="cursor-pointer text-xs font-semibold gap-2 py-2"
              >
                <Home className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Public Site</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive text-xs font-semibold gap-2 py-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 flex-1 overflow-x-hidden">
        <header className="h-14 border-b flex items-center justify-between px-4 sm:px-6 bg-background/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {activeNavItem?.label ?? "Team Manager Workspace"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Public Site</span>
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </>
  );
}
