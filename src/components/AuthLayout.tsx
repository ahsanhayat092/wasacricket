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
  Search,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { AuthLayoutSkeleton } from "./AuthLayoutSkeleton";
import { UniversalSearchDialog } from "@/components/UniversalSearchDialog";
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
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLayoutSkeleton />;
  }

  // If no logged in user, prompt login for organizer portal
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full border rounded-3xl bg-card shadow-xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Organizer Workspace
            </h1>
            <p className="text-xs text-muted-foreground max-w-sm">
              Sign in to manage your tournaments, schedules, teams, rules, and live match scoring.
            </p>
          </div>
          <div className="space-y-3 w-full">
            <Button
              onClick={() => {
                window.location.href = LOGIN_PATH;
              }}
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
            >
              Sign in with Google
            </Button>
            <Link to="/scorer/login" className="block w-full">
              <Button
                variant="outline"
                size="lg"
                className="w-full text-amber-500 border-amber-500/40 hover:bg-amber-500/10 font-bold text-xs rounded-xl"
              >
                <KeyRound className="h-4 w-4 mr-2" /> Enter Scorer PIN
              </Button>
            </Link>
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
  const { user, logout, isAdmin = true, isScorer } = useAuth();
  const { tournamentId, tournament, setTournamentId } = useTournament();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [universalSearchOpen, setUniversalSearchOpen] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setUniversalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isSuperAdmin = user?.email?.toLowerCase() === "ahsanhayat092@gmail.com";

  // Fetch tournaments owned or managed by this user
  const { data: allowedTournaments = [], isLoading: isLoadingTourneys } = useQuery({
    queryKey: ["user_tournaments", user?.uid, user?.email],
    queryFn: () => getUserTournaments(user?.email, user?.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isCreatingNewTournament = location.pathname === "/admin/tournaments/new";
  const isGlobalPath =
    isCreatingNewTournament || location.pathname === "/admin/tournaments";

  const isAuthorizedForCurrentTournament =
    isSuperAdmin ||
    isGlobalPath ||
    (allowedTournaments.length > 0 &&
      allowedTournaments.some((t) => t.id === tournamentId));

  // Auto-switch to user's first allowed tournament if active tournamentId doesn't belong to them
  useEffect(() => {
    if (!isSuperAdmin && !isLoadingTourneys && allowedTournaments.length > 0) {
      const hasCurrent = allowedTournaments.some((t) => t.id === tournamentId);
      if (!hasCurrent) {
        setTournamentId(allowedTournaments[0].id);
      }
    }
  }, [isSuperAdmin, isLoadingTourneys, allowedTournaments, tournamentId, setTournamentId]);

  // Prevent flash of unauthorized tournament data while user tournaments are loading
  if (!isSuperAdmin && !isGlobalPath && isLoadingTourneys) {
    return <AuthLayoutSkeleton />;
  }

  const menuItems = adminMenuItems;
  const activeMenuItem = menuItems.find((item) => item.path === location.pathname);

  return (
    <>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="h-16 justify-center border-b px-3">
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={toggleSidebar}
              className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none shrink-0"
              aria-label="Toggle navigation"
            >
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            {!isCollapsed && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex-1 min-w-0 flex items-center justify-between gap-1 p-1.5 rounded-xl hover:bg-accent/60 transition-colors text-left focus:outline-none group">
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="font-bold tracking-tight truncate text-sm text-foreground">
                        {allowedTournaments.length > 0
                          ? tournament?.name || "Tournament Workspace"
                          : "No Active Tournament"}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-500 inline" /> Organizer Workspace
                      </span>
                    </div>
                    {allowedTournaments && allowedTournaments.length > 1 && (
                      <Layers className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 ml-1" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-1.5">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Switch Tournament
                  </div>
                  {allowedTournaments?.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => {
                        setTournamentId(t.id);
                        localStorage.setItem("wasa_active_tournament_id", t.id);
                      }}
                      className="cursor-pointer text-xs font-semibold flex items-center justify-between py-2 rounded-lg"
                    >
                      <span className="truncate flex-1">{t.name}</span>
                      {t.id === tournamentId && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 ml-2" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  {allowedTournaments.length === 0 && (
                    <div className="px-2 py-2 text-xs text-muted-foreground italic">
                      No tournaments created yet
                    </div>
                  )}
                  <div className="my-1 border-t" />
                  <DropdownMenuItem
                    onClick={() => navigate("/admin/tournaments")}
                    className="cursor-pointer text-xs font-semibold gap-2 py-2 text-emerald-600 dark:text-emerald-400"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Manage All Tournaments</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/admin/tournaments/new")}
                    className="cursor-pointer text-xs font-semibold gap-2 py-2 text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create New Tournament</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                      {user?.name || "Tournament Organizer"}
                    </p>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/30 text-emerald-600">
                      Organizer
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-1">
                    {user?.email || "organizer"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={logout}
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
                : (activeMenuItem?.label ?? "Organizer Workspace")}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUniversalSearchOpen(true)}
              className="gap-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground h-9 px-3 bg-muted/40 border-border/80"
              title="Search players, teams, matches (Cmd + K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden md:inline-flex px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
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
              <Card className="p-8 sm:p-10 max-w-lg w-full text-center space-y-6 border-dashed border-2 bg-muted/10 rounded-3xl shadow-sm">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                  <Trophy className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    {allowedTournaments.length === 0
                      ? "Create Your First Cricket Tournament!"
                      : "Tournament Access Restricted"}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                    {allowedTournaments.length === 0
                      ? "You are logged in as a Tournament Organizer. Launch your corporate cup, tape-ball league, or club championship in 5 minutes with our wizard to start adding teams, generating fixtures, and scoring matches."
                      : `You are not authorized to manage "${tournament?.name || "this tournament"}". Organizers can only manage tournaments they own or are invited to.`}
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => navigate("/admin/tournaments/new")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 rounded-xl h-11 shadow-md shadow-emerald-600/20"
                  >
                    <Plus className="h-4 w-4" /> Launch 5-Step Tournament Wizard
                  </Button>
                  {allowedTournaments.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => navigate("/admin/tournaments")}
                      className="text-xs font-bold rounded-xl h-10"
                    >
                      View My Tournaments
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            children
          )}
        </main>
      </SidebarInset>

      {/* Universal Search Dialog */}
      <UniversalSearchDialog
        open={universalSearchOpen}
        onOpenChange={setUniversalSearchOpen}
        tournamentIdScoped={tournamentId}
      />
    </>
  );
}
