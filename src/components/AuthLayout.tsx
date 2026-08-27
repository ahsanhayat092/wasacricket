import { useAuth } from "@/hooks/useAuth";
import { useTournament } from "@/context/TournamentContext";
import { getUserTournaments, getUserScorerTournaments } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { LOGIN_PATH } from "@/const";
import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Home,
  KeyRound,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  PanelLeft,
  Settings,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trophy,
  UserCheck,
  Users,
  BookOpen,
  Layers,
  Plus,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { AuthLayoutSkeleton } from "./AuthLayoutSkeleton";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const adminMenuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: Layers, label: "My Tournaments", path: "/admin/tournaments" },
  { icon: Users, label: "Teams & Squads", path: "/admin/teams" },
  { icon: CalendarDays, label: "Fixtures & Schedule", path: "/admin/schedule" },
  { icon: ClipboardList, label: "Scorecards & Reset", path: "/admin/matches" },
  { icon: ListOrdered, label: "Standings & Points", path: "/admin/points-table" },
  { icon: BookOpen, label: "Tournament Rules", path: "/admin/rules" },
  { icon: ShieldCheck, label: "People & Permissions", path: "/admin/users" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

const scorerMenuItems = [
  { icon: LayoutDashboard, label: "Scorer Dashboard", path: "/scorer/dashboard" },
  { icon: ClipboardList, label: "Live Matches", path: "/admin/matches" },
];

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isLoading, user, isAdmin, isScorer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if there is an active PIN session in sessionStorage
  const pinUnlockedTourneys: string[] = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem("scorer_auth_tournaments");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const hasPinSession = pinUnlockedTourneys.length > 0;
  const isCreatingTournament = location.pathname === "/admin/tournaments/new";

  // Redirect scorer away from admin-only pages to scorer dashboard or matches
  useEffect(() => {
    if (!isLoading && (user || hasPinSession) && isScorer && !isAdmin) {
      const isAllowed =
        isCreatingTournament ||
        location.pathname === "/scorer/dashboard" ||
        location.pathname === "/admin/matches" ||
        location.pathname.startsWith("/admin/matches/");
      if (!isAllowed) {
        navigate("/scorer/dashboard", { replace: true });
      }
    }
  }, [isLoading, user, hasPinSession, isScorer, isAdmin, isCreatingTournament, location.pathname, navigate]);

  if (isLoading) {
    return <AuthLayoutSkeleton />;
  }

  // If no logged in user and no PIN session, prompt login
  if (!user && !hasPinSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Sign in to Tournament Portal
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              Administrator or Official Scorer credentials are required to access this workspace.
            </p>
          </div>
          <div className="space-y-3 w-full">
            <Button
              onClick={() => {
                window.location.href = LOGIN_PATH;
              }}
              size="lg"
              className="w-full"
            >
              Sign in with Google
            </Button>
            <Link to="/scorer/login" className="block w-full">
              <Button
                variant="outline"
                size="lg"
                className="w-full text-amber-500 border-amber-500/40 hover:bg-amber-500/10 font-bold"
              >
                <KeyRound className="h-4 w-4 mr-2" /> Enter Scorer PIN
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in but has neither admin nor scorer role (and no PIN session), allow tournament creation
  if (user && !isAdmin && !isScorer && !hasPinSession && !isCreatingTournament) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center border rounded-2xl bg-card shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto">
            <KeyRound className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">
              Access Permission Pending
            </h1>
            <p className="text-sm text-muted-foreground">
              Your account (<strong>{user.email}</strong>) has not been granted Administrator or Scorer privileges yet.
            </p>
            <p className="text-xs text-muted-foreground/80 pt-2">
              Please contact the tournament administrator to add your email address as an Official Scorer or Administrator.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="default"
              onClick={() => (window.location.href = "/admin/tournaments/new")}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              <Trophy className="h-4 w-4 mr-1.5" /> Create Tournament
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/scorer/login")}
              className="flex-1 text-amber-500"
            >
              Scorer PIN Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </SidebarProvider>
  );
}

function AuthLayoutContent({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const { tournamentId, tournament, setTournamentId } = useTournament();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isSuperAdmin = user?.email?.toLowerCase() === "ahsanhayat092@gmail.com";

  // List of tournament IDs unlocked via PIN in this browser session
  const pinUnlockedTourneys: string[] = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem("scorer_auth_tournaments");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  // Fetch tournaments owned or managed by this user (if Admin)
  const { data: userAdminTournaments, isLoading: isLoadingAdminTourneys } = useQuery({
    queryKey: ["user_tournaments", user?.uid, user?.email],
    queryFn: () => getUserTournaments(user?.email, user?.uid),
    enabled: !!user && isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch tournaments assigned to this user as Scorer (or unlocked via PIN)
  const { data: userScorerTournaments, isLoading: isLoadingScorerTourneys } = useQuery({
    queryKey: ["user_scorer_tournaments", user?.email, user?.uid, pinUnlockedTourneys],
    queryFn: () => getUserScorerTournaments(user?.email, user?.uid, pinUnlockedTourneys),
    enabled: !isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const allowedTournaments = isAdmin ? userAdminTournaments : userScorerTournaments;
  const isLoadingTourneys = isAdmin ? isLoadingAdminTourneys : isLoadingScorerTourneys;
  const isCreatingNewTournament = location.pathname === "/admin/tournaments/new";
  const isGlobalPath =
    isCreatingNewTournament ||
    (isAdmin && location.pathname === "/admin/tournaments");

  const isAuthorizedForCurrentTournament =
    isSuperAdmin ||
    isGlobalPath ||
    (allowedTournaments && allowedTournaments.some((t) => t.id === tournamentId)) ||
    pinUnlockedTourneys.includes(tournamentId);

  // Auto-switch to user's first allowed tournament if active tournamentId doesn't belong to them
  useEffect(() => {
    if (!isSuperAdmin && !isLoadingTourneys && allowedTournaments && allowedTournaments.length > 0) {
      const hasCurrent =
        allowedTournaments.some((t) => t.id === tournamentId) || pinUnlockedTourneys.includes(tournamentId);
      if (!hasCurrent) {
        setTournamentId(allowedTournaments[0].id);
      }
    }
  }, [isSuperAdmin, isLoadingTourneys, allowedTournaments, tournamentId, pinUnlockedTourneys, setTournamentId]);

  // Prevent flash of unauthorized tournament data while user tournaments are loading
  if (!isSuperAdmin && !isGlobalPath && isLoadingTourneys) {
    return <AuthLayoutSkeleton />;
  }

  const menuItems = isAdmin ? adminMenuItems : scorerMenuItems;
  const activeMenuItem = menuItems.find((item) => item.path === location.pathname);

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
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-bold tracking-tight truncate text-sm">
                  {tournament?.name || "WASA Premier League"}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                  {isAdmin ? (
                    <>
                      <ShieldCheck className="h-3 w-3 text-emerald-500 inline" /> Admin Workspace
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3 w-3 text-amber-500 inline" /> Scorer Workspace
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="py-2">
          <SidebarMenu className="px-2 space-y-1">
            {menuItems.map((item) => {
              const isActive =
                item.path === "/admin"
                  ? location.pathname === "/admin"
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

          <div className="mt-6 px-4 pt-4 border-t">
            <Link
              to={tournament?.slug ? `/t/${tournament.slug}` : "/"}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ExternalLink className="h-3.5 w-3.5 group-hover:text-primary" />
              {!isCollapsed && <span>View Public Portal</span>}
            </Link>
          </div>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors w-full text-left focus:outline-none group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8 border shrink-0">
                  <AvatarFallback className="text-xs font-bold bg-emerald-500/10 text-emerald-500">
                    {user?.name?.charAt(0).toUpperCase() || "S"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold truncate leading-none">
                      {user?.name || (isAdmin ? "Admin" : "Official Scorer")}
                    </p>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-muted-foreground/30">
                      {isAdmin ? "Admin" : "Scorer"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-1">
                    {user?.email || (pinUnlockedTourneys.length > 0 ? "PIN-Verified Session" : "scorer")}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  if (user) {
                    logout();
                  } else {
                    sessionStorage.removeItem("scorer_auth_tournaments");
                    window.location.href = "/";
                  }
                }}
                className="cursor-pointer text-destructive focus:text-destructive text-xs font-medium"
              >
                <LogOut className="mr-2 h-4 w-4" />
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
              {isCreatingNewTournament
                ? "🏆 Launch Tournament Wizard"
                : (activeMenuItem?.label ?? (isAdmin ? "Admin Workspace" : "Scorer Workspace"))}
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
          {!isAuthorizedForCurrentTournament && !isLoadingTourneys ? (
            <div className="flex items-center justify-center min-h-[65vh] p-4">
              <Card className="p-8 max-w-md w-full text-center space-y-5 border-dashed border-2 bg-muted/10 rounded-3xl shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black tracking-tight">Tournament Access Restricted</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isAdmin
                      ? `You are not authorized to manage "${tournament?.name || "this tournament"}". Organizers can only manage tournaments they own or are invited to.`
                      : `You are not assigned as an Official Scorer for "${tournament?.name || "this tournament"}".`}
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  {!isAdmin ? (
                    <Link to="/scorer/login" className="w-full">
                      <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs gap-1.5 rounded-xl h-10">
                        <KeyRound className="h-4 w-4" /> Enter Scorer PIN to Unlock
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Button
                        onClick={() => navigate("/admin/tournaments/new")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 rounded-xl h-10"
                      >
                        <Plus className="h-4 w-4" /> Launch 5-Step Tournament Wizard
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/admin/tournaments")}
                        className="text-xs font-bold rounded-xl h-10"
                      >
                        View My Tournaments
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            children
          )}
        </main>
      </SidebarInset>
    </>
  );
}
