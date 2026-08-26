import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useTournament } from "@/context/TournamentContext";
import { usePlayerModal } from "@/context/PlayerModalContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Moon,
  Sun,
  Menu,
  Trophy,
  Shield,
  KeyRound,
  LogIn,
  Search,
  Activity,
  Layers,
  Sparkles,
  Info,
  Calendar,
  ListOrdered,
  BookOpen,
  Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PublicLayout() {
  const { theme, toggle } = useTheme();
  const { user, isAdmin, isScorer } = useAuth();
  const { openPlayerSearch } = usePlayerModal();
  const { tournament, activeTournamentSlug, isFlagshipWasa } = useTournament();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isTournamentSubpage = !!activeTournamentSlug;
  const basePrefix = activeTournamentSlug ? `/t/${activeTournamentSlug}` : "";

  // 1. Global Public Top Navigation
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 1. Global Header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg">
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

          {/* Desktop Global Navigation */}
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

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Player Search Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={openPlayerSearch}
              className="gap-1.5 text-xs font-semibold rounded-xl bg-muted/20 hover:bg-muted border-border/60 h-9"
              title="Search Players"
            >
              <Search className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Search</span>
            </Button>

            {/* Scorer Access CTA */}
            <Link to="/scorer/login">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-bold rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10 h-9"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Scorer Login</span>
              </Button>
            </Link>

            {/* Create Tournament CTA */}
            <Link to={isAdmin ? "/admin/tournaments/new" : "/organizer/signup"}>
              <Button
                size="sm"
                className="gap-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm h-9"
              >
                <Trophy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Create Tournament</span>
              </Button>
            </Link>

            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="h-9 w-9 rounded-xl">
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Mobile Sheet Menu */}
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
                    <Link to="/organizer/signup" onClick={() => setOpen(false)} className="block">
                      <Button size="sm" className="w-full bg-emerald-600 text-white font-bold text-xs">
                        Create Tournament
                      </Button>
                    </Link>
                    <Link to="/scorer/login" onClick={() => setOpen(false)} className="block">
                      <Button variant="outline" size="sm" className="w-full text-amber-500 border-amber-500/40 text-xs font-bold">
                        Scorer Access
                      </Button>
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setOpen(false)} className="block">
                        <Button variant="secondary" size="sm" className="w-full text-xs font-bold">
                          Admin Portal
                        </Button>
                      </Link>
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
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Modern Sports Footer */}
      <footer className="border-t py-12 mt-16 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                  <Trophy className="h-4 w-4 text-amber-300" />
                </span>
                <span className="font-black text-base">WasaCricket</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                The modern cricket tournament management platform. Live ball-by-ball scoring, mathematical scenario engines, and corporate tournament tools.
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
              <h4 className="font-bold text-foreground">For Organizers</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><Link to="/organizer/signup" className="hover:text-emerald-500">Create Tournament</Link></li>
                <li><Link to="/scorer/login" className="hover:text-emerald-500">Scorer Portal</Link></li>
                <li><Link to="/admin" className="hover:text-emerald-500">Organizer Login</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-border/40 flex flex-wrap items-center justify-between gap-4 text-[11px] text-muted-foreground">
            <p>© 2026 WasaCricket. All Rights Reserved. Play Hard, Win Together!</p>
            <p>Sportsmanship • Competition • Excellence</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
