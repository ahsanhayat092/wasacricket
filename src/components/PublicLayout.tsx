import { Link, NavLink, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournament } from "@/lib/queries";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Moon, Sun, Menu, Trophy, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/schedule", label: "Schedule" },
  { to: "/teams", label: "Teams" },
  { to: "/points-table", label: "Points Table" },
  { to: "/results", label: "Results" },
  { to: "/statistics", label: "Statistics" },
];

export function PublicLayout() {
  const { theme, toggle } = useTheme();
  const { data: tournament } = useQuery({
    queryKey: ["tournament"],
    queryFn: getTournament,
  });
  const [open, setOpen] = useState(false);

  const navLinkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
      isActive
        ? "bg-primary/10 text-primary font-semibold"
        : "text-muted-foreground hover:text-foreground hover:bg-accent",
    );

  const tournamentTitle = tournament?.name || "WASA Premier League";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Trophy className="h-5 w-5 text-amber-300" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold tracking-tight">
                {tournamentTitle}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Officers Event • WASA Lahore
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-6 flex-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} className={navLinkCls}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5 font-medium">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-1 mt-6">
                  {NAV.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.to === "/"}
                      onClick={() => setOpen(false)}
                      className={navLinkCls}
                    >
                      {n.label}
                    </NavLink>
                  ))}
                  <NavLink to="/admin" onClick={() => setOpen(false)} className={navLinkCls}>
                    Admin
                  </NavLink>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t py-8 mt-12 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {tournamentTitle} — Officers Event
          </p>
          <p className="text-xs text-muted-foreground">
            Askari XI, Lahore • 26, 27 August (9:00 PM to 1:00 AM) • WASA Lahore
          </p>
          <p className="text-[11px] text-muted-foreground/80 pt-2 border-t border-border/40 max-w-xs mx-auto">
            Team Spirit • Competition • Excellence — Play Hard, Win Together!
          </p>
        </div>
      </footer>
    </div>
  );
}
