import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useTournament } from "@/context/TournamentContext";
import { usePlayerModal } from "@/context/PlayerModalContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Moon,
  Sun,
  Menu,
  Trophy,
  Shield,
  KeyRound,
  LogIn,
  LogOut,
  Search,
  Activity,
  Layers,
  Sparkles,
  Calendar,
  ListOrdered,
  BookOpen,
  Users,
  Share2,
  LayoutDashboard,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ShareTournamentModal } from "@/components/ShareTournamentModal";
import { UniversalSearchDialog } from "@/components/UniversalSearchDialog";
import { SystemHealthBadge } from "@/components/SystemHealthBadge";

export function PublicLayout() {
  const { theme, toggle } = useTheme();
  const { user, isAdmin, isScorer, logout } = useAuth();
  const { openPlayerSearch } = usePlayerModal();
  const { tournament, activeTournamentSlug } = useTournament();
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [universalSearchOpen, setUniversalSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  const isTournamentSubpage = !!activeTournamentSlug;
  const basePrefix = activeTournamentSlug ? `/t/${activeTournamentSlug}` : "";

  // 1. Clean Global Public Top Navigation
  const GLOBAL_NAV = [
    { to: "/", label: "Home" },
    { to: "/live-scores", label: "Live Scores", badge: "LIVE" },
    { to: "/tournaments", label: "Tournaments" },
    { to: "/about", label: "About" },
  ];

  // 2. Tournament-Specific Sub Navigation (when inside /t/:slug)
  const TOURNAMENT_SUBNAV = [
    { to: `${basePrefix}/`, label: "Overview", icon: Trophy },
    { to: `${basePrefix}/schedule`, label: "Schedule", icon: Calendar },
    { to: `${basePrefix}/teams`, label: "Teams", icon: Users },
    { to: `${basePrefix}/points-table`, label: "Points Table", icon: ListOrdered },
    { to: `${basePrefix}/results`, label: "Results", icon: Activity },
    { to: `${basePrefix}/statistics`, label: "Stats", icon: Sparkles },
    { to: `${basePrefix}/rules`, label: "Rules", icon: BookOpen },
  ];

  const globalNavLinkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5",
      isActive
        ? "bg-emerald-500/10 text-emerald-500 font-bold"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
    );

  const subNavLinkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5",
      isActive
        ? "bg-emerald-600 text-white shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
    );

  const tournamentTitle = tournament?.name || "WASA Premier League";
  const venueTitle = tournament?.venueName || "Askari XI, Lahore";

  // Contextual destination for Create Tournament CTA
  const createTournamentPath = user ? "/admin/tournaments/new" : "/organizer/signup";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 1. Global Header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg shrink-0">
            <span className="h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Trophy className="h-5 w-5 text-amber-300" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-black tracking-tight text-base">
                WasaCricket
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Tournament Hub
              </span>
            </div>
          </Link>

          {/* Desktop Public Navigation (Center) */}
          <nav className="hidden md:flex items-center gap-1 ml-4 flex-1">
            {GLOBAL_NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} className={globalNavLinkCls}>
                {n.label}
                {n.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-rose-500 text-white font-extrabold animate-pulse">
                    {n.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Header Actions (Right) */}
          <div className="flex items-center gap-2">
            {/* Player Search Trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={openPlayerSearch}
              className="gap-1.5 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground h-9"
              title="Search Players"
            >
              <Search className="h-4 w-4 text-emerald-500" />
              <span className="hidden sm:inline">Search</span>
            </Button>

            {/* Auth / Workspace Context Area */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl hover:bg-accent transition-colors focus:outline-none border border-border/60">
                    <Avatar className="h-7 w-7 border shrink-0">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="text-[11px] font-bold bg-emerald-500/10 text-emerald-500">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-bold max-w-[100px] truncate hidden sm:inline">
                      {user.name || user.email?.split("@")[0]}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5">
                  <div className="px-2 py-1.5 space-y-0.5">
                    <p className="text-xs font-bold truncate leading-none">
                      {user.name || "User"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => navigate("/admin")}
                    className="cursor-pointer text-xs font-semibold gap-2 py-2"
                  >
                    <Shield className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Organizer Workspace</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate("/team")}
                    className="cursor-pointer text-xs font-semibold gap-2 py-2"
                  >
                    <Users className="h-3.5 w-3.5 text-sky-500" />
                    <span>Team Manager Portal</span>
                  </DropdownMenuItem>

                  {isScorer && (
                    <DropdownMenuItem
                      onClick={() => navigate("/scorer/dashboard")}
                      className="cursor-pointer text-xs font-semibold gap-2 py-2"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                      <span>Scorer Dashboard</span>
                    </DropdownMenuItem>
                  )}

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
            ) : (
              <Link to="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs font-bold rounded-xl text-muted-foreground hover:text-foreground h-9"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}

            {/* Create Tournament CTA (Primary Action) */}
            <Link to={createTournamentPath}>
              <Button
                size="sm"
                className="gap-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm h-9"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-300" />
                <span className="hidden sm:inline">Create Tournament</span>
              </Button>
            </Link>

            {/* Universal Full-Text Search Trigger (Cmd + K) */}
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

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Mobile Menu Hamburger */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-2 mt-6">
                  <div className="pb-3 border-b">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Public Navigation
                    </span>
                  </div>

                  {GLOBAL_NAV.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.to === "/"}
                      onClick={() => setOpen(false)}
                      className={globalNavLinkCls}
                    >
                      {n.label}
                    </NavLink>
                  ))}

                  <div className="pt-4 border-t space-y-2">
                    {user ? (
                      <div className="space-y-2">
                        <div className="px-2 py-1.5 rounded-xl bg-muted/40 text-xs">
                          <p className="font-bold text-foreground truncate">{user.name || "User"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Link to="/admin" onClick={() => setOpen(false)} className="block">
                          <Button size="sm" className="w-full bg-emerald-600 text-white font-bold text-xs gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            Organizer Workspace
                          </Button>
                        </Link>
                        <Link to="/team" onClick={() => setOpen(false)} className="block">
                          <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-1.5">
                            <Users className="h-3.5 w-3.5 text-sky-500" />
                            Team Manager Portal
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setOpen(false);
                            logout();
                          }}
                          className="w-full text-xs font-bold text-destructive justify-start gap-1.5"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Link to="/login" onClick={() => setOpen(false)} className="block">
                          <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-1.5">
                            <LogIn className="h-3.5 w-3.5" />
                            Sign In
                          </Button>
                        </Link>
                        <Link to="/organizer/signup" onClick={() => setOpen(false)} className="block">
                          <Button size="sm" className="w-full bg-emerald-600 text-white font-bold text-xs gap-1.5">
                            <Trophy className="h-3.5 w-3.5 text-amber-300" />
                            Create Tournament
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* 2. Tournament Sub-Header (Visible when viewing a Tournament Micro-Portal) */}
        {isTournamentSubpage && (
          <div className="border-t bg-muted/10 px-4 py-2">
            <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-extrabold text-xs text-foreground truncate">
                  {tournamentTitle}
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  · {venueTitle}
                </span>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {TOURNAMENT_SUBNAV.map((sub) => {
                  const Icon = sub.icon;
                  return (
                    <NavLink key={sub.to} to={sub.to} end={sub.to === `${basePrefix}/`} className={subNavLinkCls}>
                      <Icon className="h-3 w-3" />
                      {sub.label}
                    </NavLink>
                  );
                })}

                {/* Manage Tournament Shortcut */}
                <Link to={user || isAdmin ? "/admin" : "/organizer/login"}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 text-muted-foreground hover:text-emerald-500 shrink-0"
                    title="Manage this tournament"
                  >
                    <Shield className="h-3 w-3" />
                    <span>Manage</span>
                  </Button>
                </Link>

                {/* WhatsApp & QR Share Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShareOpen(true)}
                  className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1.5 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 ml-1 shrink-0"
                >
                  <Share2 className="h-3 w-3" />
                  <span>Share / QR</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Share & QR Code Modal */}
      <ShareTournamentModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        tournament={tournament}
      />

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Modern Sports Footer */}
      <footer className="border-t py-12 mt-16 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            <div className="sm:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                  <Trophy className="h-4 w-4 text-amber-300" />
                </span>
                <span className="font-black text-base">WasaCricket</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                The modern cricket tournament management platform. Live ball-by-ball scoring, mathematical scenario engines, and club management.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-foreground">Explore</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><Link to="/live-scores" className="hover:text-emerald-500">Live Scores</Link></li>
                <li><Link to="/tournaments" className="hover:text-emerald-500">Browse Tournaments</Link></li>
                <li><Link to="/about" className="hover:text-emerald-500">About Platform</Link></li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-foreground">For Teams</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><Link to="/team" className="hover:text-emerald-500">Manage Your Team</Link></li>
                <li><Link to="/team/players" className="hover:text-emerald-500">Player Rosters</Link></li>
                <li><Link to="/team/tournaments" className="hover:text-emerald-500">Join Tournaments</Link></li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-foreground">For Organizers & Scorers</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><Link to="/organizer/signup" className="hover:text-emerald-500">Create Tournament</Link></li>
                <li><Link to="/scorer/login" className="hover:text-emerald-500">Scorer Portal</Link></li>
                <li><Link to="/admin" className="hover:text-emerald-500">Organizer Login</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-border/40 flex flex-wrap items-center justify-between gap-4 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <p>© 2026 WasaCricket. All Rights Reserved. Play Hard, Win Together!</p>
              <SystemHealthBadge />
            </div>
            <p>Sportsmanship • Competition • Excellence</p>
          </div>
        </div>
      </footer>

      {/* Universal Full-Text & Fuzzy Search Dialog */}
      <UniversalSearchDialog
        open={universalSearchOpen}
        onOpenChange={setUniversalSearchOpen}
        tournamentIdScoped={activeTournamentSlug}
      />
    </div>
  );
}
