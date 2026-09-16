import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournaments, getAllPlatformMatches } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Zap,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  KeyRound,
  CheckCircle2,
  Users,
  Activity,
  Award,
  Sparkles,
  MapPin,
  Clock,
  Flame,
  Check,
  Quote,
  Tv,
  Smartphone,
  PlusCircle,
  Share2,
  RotateCcw,
  Play,
  Sliders,
  ChevronRight,
  TrendingUp,
  Target,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import {
  ballsToOversText,
  formatMatchDay,
  formatMatchDateTime,
  type MatchStatus,
} from "@/lib/cricket";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function LandingHome() {
  const { user } = useAuth();
  const createTourneyHref = user ? "/admin/tournaments/new" : "/organizer/signup";
  const [matchFilter, setMatchFilter] = useState<"ALL" | "LIVE" | "UPCOMING" | "COMPLETED">("ALL");

  // Fetch real tournaments and matches from platform
  const { data: tournaments } = useQuery({
    queryKey: ["tournaments"],
    queryFn: getTournaments,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["all_platform_landing_matches"],
    queryFn: getAllPlatformMatches,
    refetchInterval: 5000,
  });

  // --- Interactive Live Scoring Simulator State ---
  const [demoRuns, setDemoRuns] = useState(142);
  const [demoWickets, setDemoWickets] = useState(6);
  const [demoBalls, setDemoBalls] = useState(112); // 18.4 overs = 18*6 + 4 = 112 balls
  const [demoOverBalls, setDemoOverBalls] = useState<Array<{ text: string; type: "run" | "boundary" | "six" | "wicket" | "extra" }>>([
    { text: "1", type: "run" },
    { text: "4", type: "boundary" },
    { text: "0", type: "run" },
    { text: "6", type: "six" },
  ]);
  const [demoBatterRuns, setDemoBatterRuns] = useState(48);
  const [demoBatterBalls, setDemoBatterBalls] = useState(31);
  const [demoEventBanner, setDemoEventBanner] = useState<string | null>(null);

  // --- Interactive WOW Event Showcase Tab ---
  const [activeEventShowcase, setActiveEventShowcase] = useState<"FOUR" | "SIX" | "WICKET" | "MAIDEN">("FOUR");

  // Interactive scoring demo handlers
  const handleScoreBall = (ballVal: string, runAmount: number, isWicket = false, isExtra = false) => {
    let type: "run" | "boundary" | "six" | "wicket" | "extra" = "run";
    if (ballVal === "4") type = "boundary";
    else if (ballVal === "6") type = "six";
    else if (isWicket) type = "wicket";
    else if (isExtra) type = "extra";

    setDemoRuns((prev) => prev + runAmount);
    if (isWicket) setDemoWickets((prev) => Math.min(10, prev + 1));
    if (!isExtra || ballVal === "W") setDemoBalls((prev) => prev + 1);

    if (!isExtra) {
      setDemoBatterRuns((prev) => prev + runAmount);
      setDemoBatterBalls((prev) => prev + 1);
    }

    setDemoOverBalls((prev) => [...prev.slice(-5), { text: ballVal, type }]);

    if (ballVal === "4") {
      setDemoEventBanner("FOUR! Pierces the extra cover boundary!");
    } else if (ballVal === "6") {
      setDemoEventBanner("SIX! Dispatched 85 meters into the mid-wicket stands!");
    } else if (isWicket) {
      setDemoEventBanner("OUT! Clean bowled! Timber disturbed!");
    } else if (ballVal === "0") {
      setDemoEventBanner("Dot ball. Good length beating the outside edge.");
    } else {
      setDemoEventBanner(`${runAmount} run${runAmount > 1 ? "s" : ""} pushed into the gap.`);
    }

    setTimeout(() => {
      setDemoEventBanner(null);
    }, 3200);
  };

  const handleResetDemo = () => {
    setDemoRuns(142);
    setDemoWickets(6);
    setDemoBalls(112);
    setDemoOverBalls([
      { text: "1", type: "run" },
      { text: "4", type: "boundary" },
      { text: "0", type: "run" },
      { text: "6", type: "six" },
    ]);
    setDemoBatterRuns(48);
    setDemoBatterBalls(31);
    setDemoEventBanner(null);
  };

  return (
    <div className="space-y-20 sm:space-y-28 pb-20 overflow-x-hidden">
      {/* =========================================================================
          1. HERO SECTION: "Run Your Cricket Tournament. Live."
          ========================================================================= */}
      <section className="relative pt-6 sm:pt-12 px-4 max-w-6xl mx-auto">
        {/* Subtle Ambient Stadium Light Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="text-center space-y-5 max-w-4xl mx-auto">
          {/* Platform Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Complete Multi-Tenant Cricket Operating System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Run Your Cricket Tournament.{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 bg-clip-text text-transparent">
              Live.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create tournaments, score every ball live, track players and stats, and give your fans a professional match-day experience.
          </p>

          {/* Primary CTA Hierarchy */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-md mx-auto sm:max-w-none">
            <Link to={createTourneyHref} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-7 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm gap-2 shadow-xl shadow-emerald-600/25 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              >
                <Trophy className="h-4 w-4" />
                <span>Create Tournament</span>
                <span className="text-[10px] font-extrabold uppercase bg-white/20 px-1.5 py-0.5 rounded ml-1 hidden sm:inline">
                  Free
                </span>
              </Button>
            </Link>

            <Link to="/live-scores" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-6 font-bold text-sm gap-2 rounded-xl border-border/80 hover:border-emerald-500/60 hover:text-emerald-500 bg-card/60 backdrop-blur-sm transition-all duration-200"
              >
                <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                <span>Explore Live Match</span>
              </Button>
            </Link>

            <Link to="/team" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-6 font-bold text-sm gap-2 rounded-xl border-sky-500/40 hover:border-sky-500 hover:text-sky-400 text-sky-600 dark:text-sky-400 bg-sky-500/5 transition-all duration-200"
              >
                <Users className="h-4 w-4 text-sky-500" />
                <span>Team Manager Hub</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* -------------------------------------------------------------
            VISUAL PRODUCT HERO: Real Live Match Center Experience
            ------------------------------------------------------------- */}
        <div className="mt-10 sm:mt-14 max-w-4xl mx-auto">
          <div className="relative rounded-3xl border-2 border-emerald-500/30 bg-card/90 shadow-2xl backdrop-blur-md overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
            {/* Live Header Strip */}
            <div className="bg-muted/40 border-b border-border/70 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500 text-white font-black text-[10px] gap-1.5 animate-pulse px-2 py-0.5 rounded-full border-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  LIVE ●
                </Badge>
                <span className="font-bold text-foreground">WPL Championship 2026</span>
                <span className="text-muted-foreground">• Semi-Final 1</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
                <span>Askari XI Ground, Lahore</span>
                <span className="text-emerald-500 font-bold hidden sm:inline">20 Ov Match</span>
              </div>
            </div>

            {/* Live Teams & Big Scoreboard */}
            <div className="p-5 sm:p-7 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Team 1: WASA XI */}
                <div className="space-y-2 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                        WXI
                      </div>
                      <div>
                        <h3 className="font-black text-base sm:text-lg text-foreground leading-tight">WASA XI</h3>
                        <p className="text-[11px] text-emerald-500 font-bold">Batting 2nd (Target: 140)</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 text-[10px] font-bold">
                      Batting
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">142</span>
                      <span className="text-xl sm:text-2xl font-bold text-muted-foreground">/ 6</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-foreground font-mono">18.4 OVERS</div>
                      <div className="text-[10px] text-muted-foreground">CRR: 7.61 • RRR: 0.00</div>
                    </div>
                  </div>
                </div>

                {/* Team 2: Engineering XI */}
                <div className="space-y-2 p-4 rounded-2xl bg-muted/30 border border-border/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-slate-700 text-white font-black flex items-center justify-center text-sm shadow-sm">
                        EXI
                      </div>
                      <div>
                        <h3 className="font-black text-base sm:text-lg text-foreground leading-tight">Engineering XI</h3>
                        <p className="text-[11px] text-muted-foreground">Innings 1 Completed</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-muted-foreground text-[10px] font-medium">
                      Fielding
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-foreground/80 tracking-tight">139</span>
                      <span className="text-xl sm:text-2xl font-bold text-muted-foreground">/ 8</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-muted-foreground font-mono">20.0 OVERS</div>
                      <div className="text-[10px] text-muted-foreground">Final Innings Total</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Situation / Climax Strip */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-amber-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span>WASA XI won by 4 wickets with 2 balls remaining — Qualified for Grand Final!</span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 hidden sm:inline">POTM: Ahmed Khan</span>
              </div>

              {/* Real-time Batsmen & Bowler Mini Live Cockpit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t pt-4">
                {/* Active Batsmen */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Batsmen in the Middle
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-bold text-foreground">Ahmed Khan*</span>
                        <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1 rounded">Strike</span>
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        48 <span className="text-muted-foreground text-[11px] font-normal">(31b · 4x4, 2x6)</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-transparent" />
                        <span className="font-semibold text-foreground">Ali Raza</span>
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        32 <span className="text-muted-foreground text-[11px] font-normal">(27b · 2x4, 1x6)</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active Bowler & Over Strip */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Current Bowler: Kashif Ali
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">3.4 ov • 28/2</span>
                  </div>

                  {/* Over Delivery Chips */}
                  <div className="p-2.5 rounded-lg bg-muted/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Over 19 Deliveries:</span>
                      <span className="text-[11px] font-bold text-emerald-500 font-mono">12 runs off over</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="h-7 w-7 rounded-full bg-muted border text-xs font-bold flex items-center justify-center">1</span>
                      <span className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-500 text-xs font-black flex items-center justify-center shadow-sm">4</span>
                      <span className="h-7 w-7 rounded-full bg-muted border text-xs font-bold flex items-center justify-center text-muted-foreground">0</span>
                      <span className="h-7 w-7 rounded-full bg-purple-500/20 border border-purple-500 text-purple-400 text-xs font-black flex items-center justify-center shadow-sm">6</span>
                      <span className="h-7 w-7 rounded-full bg-rose-500/20 border border-rose-500 text-rose-500 text-xs font-black flex items-center justify-center shadow-sm">W</span>
                      <span className="h-7 w-7 rounded-full bg-muted border text-xs font-bold flex items-center justify-center">1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. FEATURE SECTION: "Every Ball. Instantly." (Live Scorer Interactive Console)
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
            Fast & Tactile Mobile Cockpit
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Every Ball. Instantly.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Record every delivery and keep the entire match updated in real time. Try tapping the buttons below to experience the scorer console:
          </p>
        </div>

        {/* Interactive Live Scoring Simulator Card */}
        <div className="max-w-3xl mx-auto rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Scorer Header Bar */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> Live Scoring Console
              </span>
              <h3 className="text-lg font-bold text-foreground">Match 11 • 2nd Innings Chase</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetDemo}
              className="text-xs h-8 gap-1 rounded-xl text-muted-foreground hover:text-foreground"
              title="Reset simulator numbers"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Demo
            </Button>
          </div>

          {/* Current Score & Over Display */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-center">
            <div className="p-4 rounded-2xl bg-muted/40 border text-center">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Score</span>
              <div className="text-3xl sm:text-4xl font-black text-foreground">
                {demoRuns} <span className="text-xl text-muted-foreground">/ {demoWickets}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border text-center">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Overs Completed</span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-500 font-mono">
                {ballsToOversText(demoBalls)}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-muted/40 border text-center">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Striker: Ahmed Khan</span>
              <div className="text-2xl sm:text-3xl font-black text-foreground font-mono">
                {demoBatterRuns} <span className="text-sm font-normal text-muted-foreground">({demoBatterBalls}b)</span>
              </div>
            </div>
          </div>

          {/* Current Over Delivery Sequence */}
          <div className="p-4 rounded-2xl border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground">CURRENT OVER DELIVERIES</span>
              <span className="text-emerald-500">{demoOverBalls.length} balls bowled</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
              {demoOverBalls.map((b, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-9 w-9 rounded-full text-xs font-black flex items-center justify-center transition-all animate-in zoom-in duration-200",
                    b.type === "boundary" && "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-500",
                    b.type === "six" && "bg-purple-500/20 border-2 border-purple-500 text-purple-400",
                    b.type === "wicket" && "bg-rose-500/20 border-2 border-rose-500 text-rose-500",
                    b.type === "run" && "bg-muted border border-border text-foreground",
                    b.type === "extra" && "bg-amber-500/20 border border-amber-500 text-amber-400"
                  )}
                >
                  {b.text}
                </span>
              ))}
              {demoOverBalls.length === 0 && (
                <span className="text-xs text-muted-foreground italic">Over in progress...</span>
              )}
            </div>
          </div>

          {/* Interactive Event Pop-up Feedback */}
          {demoEventBanner && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center animate-in fade-in slide-in-from-bottom-2">
              ⚡ {demoEventBanner}
            </div>
          )}

          {/* Scorer Keypad Controls */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block text-center">
              Tap any button to test live scoring:
            </span>
            <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleScoreBall("0", 0)}
                className="h-12 text-sm font-black rounded-xl hover:bg-muted/80"
              >
                0
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleScoreBall("1", 1)}
                className="h-12 text-sm font-black rounded-xl hover:bg-muted/80"
              >
                1
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleScoreBall("2", 2)}
                className="h-12 text-sm font-black rounded-xl hover:bg-muted/80"
              >
                2
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleScoreBall("3", 3)}
                className="h-12 text-sm font-black rounded-xl hover:bg-muted/80"
              >
                3
              </Button>
              <Button
                type="button"
                onClick={() => handleScoreBall("4", 4)}
                className="h-12 text-sm font-black rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
              >
                4
              </Button>
              <Button
                type="button"
                onClick={() => handleScoreBall("6", 6)}
                className="h-12 text-sm font-black rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20"
              >
                6
              </Button>
              <Button
                type="button"
                onClick={() => handleScoreBall("W", 0, true)}
                className="h-12 text-sm font-black rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                W
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleScoreBall("1wd", 1, false, true)}
                className="h-12 text-xs font-bold rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              >
                WD
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleScoreBall("1nb", 1, false, true)}
                className="h-12 text-xs font-bold rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              >
                NB
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SECTION: 4 / 6 / WICKET / MAIDEN OVER WOW MOMENTS
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-purple-500 border-purple-500/30 font-bold uppercase tracking-wider text-[10px]">
            Broadcast Stadium Graphics
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Animated Match-Day Moments.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            When the ball races to the ropes, sails into the stands, or shatters timber, fans and scorers experience celebratory broadcast overlays.
          </p>

          {/* Event Switcher Tabs */}
          <div className="flex items-center justify-center gap-2 pt-3 flex-wrap">
            <Button
              size="sm"
              variant={activeEventShowcase === "FOUR" ? "default" : "outline"}
              onClick={() => setActiveEventShowcase("FOUR")}
              className={cn(
                "rounded-xl text-xs font-bold gap-1.5 h-9 px-4",
                activeEventShowcase === "FOUR" && "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
              )}
            >
              🏏 FOUR! Boundary
            </Button>
            <Button
              size="sm"
              variant={activeEventShowcase === "SIX" ? "default" : "outline"}
              onClick={() => setActiveEventShowcase("SIX")}
              className={cn(
                "rounded-xl text-xs font-bold gap-1.5 h-9 px-4",
                activeEventShowcase === "SIX" && "bg-purple-600 hover:bg-purple-500 text-white border-purple-500"
              )}
            >
              🚀 SIX! Maximum
            </Button>
            <Button
              size="sm"
              variant={activeEventShowcase === "WICKET" ? "default" : "outline"}
              onClick={() => setActiveEventShowcase("WICKET")}
              className={cn(
                "rounded-xl text-xs font-bold gap-1.5 h-9 px-4",
                activeEventShowcase === "WICKET" && "bg-rose-600 hover:bg-rose-500 text-white border-rose-500"
              )}
            >
              🔴 WICKET! Out
            </Button>
            <Button
              size="sm"
              variant={activeEventShowcase === "MAIDEN" ? "default" : "outline"}
              onClick={() => setActiveEventShowcase("MAIDEN")}
              className={cn(
                "rounded-xl text-xs font-bold gap-1.5 h-9 px-4",
                activeEventShowcase === "MAIDEN" && "bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500"
              )}
            >
              🎯 MAIDEN Over
            </Button>
          </div>
        </div>

        {/* Dynamic Event Showcase Card */}
        <div className="max-w-xl mx-auto transition-all duration-300">
          {activeEventShowcase === "FOUR" && (
            <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/80 bg-gradient-to-b from-emerald-950 via-zinc-950 to-black p-6 sm:p-8 text-center shadow-2xl shadow-emerald-900/40 ring-4 ring-emerald-500/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600/20 border-2 border-emerald-500 shadow-lg shadow-emerald-600/40 animate-bounce mb-3">
                <span className="text-3xl font-black text-emerald-400">4</span>
              </div>
              <p className="text-xs font-black tracking-widest uppercase text-emerald-400">CRACKING BOUNDARY</p>
              <h3 className="text-4xl sm:text-5xl font-black text-white tracking-tight uppercase mt-0.5">
                FOUR! 🏏
              </h3>
              <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">SMASHED BY BATSMAN</p>
                <p className="text-lg font-black text-white mt-0.5">Ahmed Khan</p>
                <p className="text-xs font-semibold text-emerald-200/80 mt-1">Off the bowling of Kashif Ali</p>
              </div>
              <p className="text-xs text-emerald-200/90 mt-3">
                Pierces the infield and races away to the boundary ropes!
              </p>
            </div>
          )}

          {activeEventShowcase === "SIX" && (
            <div className="relative overflow-hidden rounded-3xl border-2 border-purple-500/80 bg-gradient-to-b from-purple-950 via-zinc-950 to-black p-6 sm:p-8 text-center shadow-2xl shadow-purple-900/40 ring-4 ring-purple-500/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-600/20 border-2 border-purple-400 shadow-lg shadow-purple-600/40 animate-bounce mb-3">
                <span className="text-3xl font-black text-purple-300">6</span>
              </div>
              <p className="text-xs font-black tracking-widest uppercase text-amber-300 flex items-center justify-center gap-1">
                <Zap className="h-3 w-3 fill-amber-300 text-amber-300" /> MAXIMUM BLAST
              </p>
              <h3 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-purple-200 to-pink-300 tracking-tight uppercase mt-0.5">
                SIX! 🚀
              </h3>
              <div className="mt-4 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">LAUNCHED INTO THE STANDS</p>
                <p className="text-lg font-black text-white mt-0.5">Bilal Mehmood</p>
                <p className="text-xs font-semibold text-purple-200/80 mt-1">Off the bowling of Usman Tariq</p>
              </div>
              <p className="text-xs text-purple-200/90 mt-3">
                Clean strike sailing 90 meters high over long-on for a huge maximum!
              </p>
            </div>
          )}

          {activeEventShowcase === "WICKET" && (
            <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500/80 bg-gradient-to-b from-rose-950 via-zinc-950 to-black p-6 sm:p-8 text-center shadow-2xl shadow-rose-900/40 ring-4 ring-rose-500/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 shadow-lg shadow-rose-600/40 animate-bounce mb-3">
                <Flame className="h-8 w-8 text-rose-500" />
              </div>
              <p className="text-xs font-black tracking-widest uppercase text-rose-400">FALL OF WICKET</p>
              <h3 className="text-4xl sm:text-5xl font-black text-white tracking-tight uppercase mt-0.5">
                OUT! 🔴
              </h3>
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-left space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-rose-300 font-bold">👤 Batsman Out:</span>
                  <span className="font-black text-white">Ali Raza</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-rose-300 font-bold">🎯 Bowler:</span>
                  <span className="font-bold text-rose-200">Kashif Ali</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-rose-300 font-bold">⚡ Dismissal:</span>
                  <span className="font-bold text-amber-300 bg-amber-500/10 px-1.5 rounded">b Bowled</span>
                </div>
              </div>
              <p className="text-xs text-rose-200/90 mt-3">
                Crucial breakthrough! Middle stump uprooted under pressure!
              </p>
            </div>
          )}

          {activeEventShowcase === "MAIDEN" && (
            <div className="relative overflow-hidden rounded-3xl border-2 border-cyan-500/80 bg-gradient-to-b from-cyan-950 via-zinc-950 to-black p-6 sm:p-8 text-center shadow-2xl shadow-cyan-900/40 ring-4 ring-cyan-500/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-600/20 border-2 border-cyan-400 shadow-lg shadow-cyan-500/40 animate-bounce mb-3">
                <span className="text-3xl font-black text-cyan-300">0</span>
              </div>
              <p className="text-xs font-black tracking-widest uppercase text-cyan-400">ICE COLD DEFENSE • 0 RUNS CONCEDED</p>
              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mt-0.5">
                MAIDEN OVER! 🎯
              </h3>
              <div className="mt-4 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center gap-2">
                <span className="h-7 w-7 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-black flex items-center justify-center">0</span>
                <span className="h-7 w-7 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-black flex items-center justify-center">0</span>
                <span className="h-7 w-7 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-black flex items-center justify-center">0</span>
                <span className="h-7 w-7 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-black flex items-center justify-center">0</span>
                <span className="h-7 w-7 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-black flex items-center justify-center">0</span>
                <span className="h-7 w-7 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-black flex items-center justify-center">0</span>
              </div>
              <p className="text-xs text-cyan-200/90 mt-3">
                A complete 6-dot maiden delivered in the death overs. Deep cricket intelligence built in.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          4. SECTION: LIVE MATCH CENTER & FAN EXPERIENCE
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
            Public Fan Experience
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Your Match. Live for Everyone.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Spectators, club members, and families follow ball-by-ball commentary, player partnerships, and scorecards from any smartphone without logging in.
          </p>
        </div>

        {/* Match Center Showcase UI */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-border/80 bg-card overflow-hidden shadow-2xl">
          {/* Match Center Top Tabs */}
          <div className="bg-muted/30 border-b px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white shadow-sm flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" /> Live Scorecard
            </span>
            <span className="px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground">
              Ball-by-Ball
            </span>
            <span className="px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground">
              Commentary
            </span>
            <span className="px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground">
              Partnerships
            </span>
            <span className="px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground hidden sm:inline">
              Statistics
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Live Match Summary Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 text-white text-[10px] font-black">LIVE CHASE</Badge>
                  <span className="text-xs text-muted-foreground font-semibold">2nd Innings • Over 19 of 20</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                  WASA XI needs 4 runs from 8 balls
                </h3>
              </div>

              {/* 1-Click WhatsApp Share Trigger */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs font-bold rounded-xl border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 shrink-0"
              >
                <Share2 className="h-3.5 w-3.5" /> Share Live to WhatsApp
              </Button>
            </div>

            {/* Scorecard Table Simulation */}
            <div className="rounded-2xl border overflow-hidden">
              <div className="bg-muted/40 px-4 py-2 text-xs font-bold text-muted-foreground grid grid-cols-12">
                <span className="col-span-5 sm:col-span-6">BATTER</span>
                <span className="col-span-2 text-right">R</span>
                <span className="col-span-2 text-right">B</span>
                <span className="col-span-1 text-right">4s</span>
                <span className="col-span-1 text-right">6s</span>
                <span className="col-span-1 text-right hidden sm:inline">SR</span>
              </div>
              <div className="divide-y text-xs font-medium">
                <div className="px-4 py-2.5 grid grid-cols-12 items-center bg-emerald-500/5">
                  <div className="col-span-5 sm:col-span-6 flex items-center gap-1.5 font-bold text-foreground">
                    <span>Ahmed Khan*</span>
                    <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1 rounded">not out</span>
                  </div>
                  <span className="col-span-2 text-right font-bold text-foreground">48</span>
                  <span className="col-span-2 text-right text-muted-foreground">31</span>
                  <span className="col-span-1 text-right text-muted-foreground">4</span>
                  <span className="col-span-1 text-right text-muted-foreground">2</span>
                  <span className="col-span-1 text-right text-emerald-500 font-bold hidden sm:inline">154.8</span>
                </div>
                <div className="px-4 py-2.5 grid grid-cols-12 items-center">
                  <div className="col-span-5 sm:col-span-6 flex items-center gap-1.5 font-bold text-foreground">
                    <span>Ali Raza</span>
                    <span className="text-[10px] text-muted-foreground">b Kashif</span>
                  </div>
                  <span className="col-span-2 text-right font-bold text-foreground">32</span>
                  <span className="col-span-2 text-right text-muted-foreground">27</span>
                  <span className="col-span-1 text-right text-muted-foreground">2</span>
                  <span className="col-span-1 text-right text-muted-foreground">1</span>
                  <span className="col-span-1 text-right text-muted-foreground hidden sm:inline">118.5</span>
                </div>
              </div>
            </div>

            {/* Fall of Wickets Timeline */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Fall of Wickets
              </span>
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-muted border">1-12 (1.4 ov)</span>
                <span className="px-2 py-0.5 rounded bg-muted border">2-45 (5.2 ov)</span>
                <span className="px-2 py-0.5 rounded bg-muted border">3-89 (11.1 ov)</span>
                <span className="px-2 py-0.5 rounded bg-muted border">4-118 (15.3 ov)</span>
                <span className="px-2 py-0.5 rounded bg-muted border">5-132 (17.5 ov)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. SECTION: TOURNAMENT MANAGEMENT WORKFLOW ("From Setup to Final Ball")
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
            End-to-End Operating System
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            From Tournament Setup to Final Ball.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Say goodbye to paper scorebooks, WhatsApp arguments, and spreadsheet formulas.
          </p>
        </div>

        {/* 7-Step Horizontal Workflow (Desktop) / Vertical Stack (Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 relative group hover:border-emerald-500/40 transition-all">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xs flex items-center justify-center">
              01
            </div>
            <h3 className="text-base font-bold text-foreground">Create Tournament</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Define match rules, overs per side (4 to 50), max bowler quotas, wide/no-ball runs, and group or direct knockout format.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 relative group hover:border-emerald-500/40 transition-all">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xs flex items-center justify-center">
              02
            </div>
            <h3 className="text-base font-bold text-foreground">Add Teams & Pools</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Register participating clubs, upload logos, invite verified Team Managers, or group teams into Group A & B pools.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 relative group hover:border-emerald-500/40 transition-all">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xs flex items-center justify-center">
              03
            </div>
            <h3 className="text-base font-bold text-foreground">Schedule Matches</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Auto-generate round-robin league schedules or custom match days, timings, and venues with 1-click clash detection.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 relative group hover:border-emerald-500/40 transition-all">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xs flex items-center justify-center">
              04
            </div>
            <h3 className="text-base font-bold text-foreground">Assign Ground Scorers</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Give scorers PIN-protected match access so they can score ball-by-ball with zero permission to alter tournament rules.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 relative group hover:border-emerald-500/40 transition-all">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xs flex items-center justify-center">
              05
            </div>
            <h3 className="text-base font-bold text-foreground">Score Live With Undo</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mobile-first cockpit handles deliveries, wickets, extras, maiden overs, and multi-ball undo with offline resilience.
            </p>
          </div>

          {/* Step 6 */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 relative group hover:border-emerald-500/40 transition-all">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xs flex items-center justify-center">
              06
            </div>
            <h3 className="text-base font-bold text-foreground">Automated NRR & Standings</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Net Run Rates and points table recalculate instantly after every delivery. Knockout qualifiers seed automatically.
            </p>
          </div>

          {/* Step 7 */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 relative group hover:border-emerald-500/40 transition-all">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xs flex items-center justify-center">
              07
            </div>
            <h3 className="text-base font-bold text-foreground">OBS Broadcast & Fans</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Stream matches to YouTube or Facebook with transparent lower-third graphics, while spectators follow live links on phones.
            </p>
          </div>

          {/* Step 8 (Closing CTA) */}
          <div className="p-5 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 flex flex-col justify-between space-y-3">
            <div>
              <Trophy className="h-7 w-7 text-emerald-500" />
              <h3 className="text-base font-bold text-foreground mt-2">Ready to Host?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Launch your tournament in under 3 minutes with our step-by-step wizard.
              </p>
            </div>
            <Link to={createTourneyHref}>
              <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl">
                Start Tournament Now →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. SECTION: PLAYER PROFILES & PERSISTENT STATISTICS
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-amber-500 border-amber-500/30 font-bold uppercase tracking-wider text-[10px]">
            Persistent Career History
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Every Player Has a Story.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            The platform is not just a one-off scoring sheet. It compiles lifetime career metrics, strike rates, boundary charts, and recent form for every player.
          </p>
        </div>

        {/* Real-looking Player Profile Showcase Card */}
        <div className="max-w-3xl mx-auto rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
            <div className="flex items-center gap-3.5">
              <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                AK
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-foreground">Ahmad Khan</h3>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                    All-Rounder
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-semibold">
                  WASA XI • Vice Captain (VC)
                </p>
              </div>
            </div>

            {/* Career Badges */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-500 font-bold border border-amber-500/30">
                ⭐ Orange Cap Contender
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-muted/30 border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Matches</span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5">14</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/30 border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Runs</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-500 mt-0.5">386</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/30 border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Average</span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5">32.1</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/30 border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Strike Rate</span>
              <div className="text-2xl sm:text-3xl font-black text-purple-400 mt-0.5">147.8</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/30 border col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Wickets</span>
              <div className="text-2xl sm:text-3xl font-black text-rose-500 mt-0.5">11</div>
            </div>
          </div>

          {/* Recent Form Sequence */}
          <div className="space-y-2 p-4 rounded-2xl bg-muted/20 border">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground uppercase tracking-wider">Recent Match Inning Scores</span>
              <span className="text-emerald-500 font-mono">Last 5 Matches</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-sm border border-emerald-500/40">
                48*
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-muted text-foreground font-bold text-sm border">
                12
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-sm border border-emerald-500/40">
                67*
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-muted text-foreground font-bold text-sm border">
                03
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-muted text-foreground font-bold text-sm border">
                42
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                34 Fours • 16 Sixes • Best Bowling: 4/18
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. SECTION: TOURNAMENT STATISTICS & AUTOMATED NRR
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-sky-500 border-sky-500/30 font-bold uppercase tracking-wider text-[10px]">
            Automated Calculations
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Know What's Happening Across the Tournament.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Net Run Rate and tournament leaderboards recalculate automatically after every single delivery.
          </p>
        </div>

        {/* Analytics Leaderboard Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl border bg-card text-center space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Most Runs</span>
            <div className="text-xl font-black text-amber-500">Ahmed Khan</div>
            <div className="text-xs font-mono font-bold text-foreground">428 runs</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Most Wickets</span>
            <div className="text-xl font-black text-purple-400">Kashif Ali</div>
            <div className="text-xs font-mono font-bold text-foreground">17 wickets</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Best Strike Rate</span>
            <div className="text-xl font-black text-emerald-500">Bilal M.</div>
            <div className="text-xs font-mono font-bold text-foreground">181.4 SR</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Highest Score</span>
            <div className="text-xl font-black text-foreground">87*</div>
            <div className="text-[11px] text-muted-foreground">vs Lions</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Best Bowling</span>
            <div className="text-xl font-black text-foreground">4 / 18</div>
            <div className="text-[11px] text-muted-foreground">in 4.0 ov</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Top NRR</span>
            <div className="text-xl font-black text-sky-400">+1.42</div>
            <div className="text-[11px] text-muted-foreground">WASA XI</div>
          </div>
        </div>

        {/* NRR Standings Table (Presented as Automated Result) */}
        <div className="max-w-4xl mx-auto rounded-3xl border bg-card overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground">Championship Group A Standings</h3>
              <p className="text-xs text-muted-foreground">
                Automated NRR updates live as balls are bowled — zero manual math disputes.
              </p>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs font-bold">
              Top 2 Advance to Semi-Finals
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-bold border-b">
                <tr>
                  <th className="p-3 pl-4">POS</th>
                  <th className="p-3">TEAM</th>
                  <th className="p-3 text-center">P</th>
                  <th className="p-3 text-center">W</th>
                  <th className="p-3 text-center">L</th>
                  <th className="p-3 text-right font-black text-foreground">NET RUN RATE (NRR)</th>
                  <th className="p-3 text-right pr-4 font-black">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium">
                <tr className="bg-emerald-500/5">
                  <td className="p-3 pl-4 font-bold text-emerald-500">1</td>
                  <td className="p-3 font-bold text-foreground flex items-center gap-2">
                    <span>WASA XI</span>
                    <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1 rounded">QUALIFIED</span>
                  </td>
                  <td className="p-3 text-center">6</td>
                  <td className="p-3 text-center">5</td>
                  <td className="p-3 text-center">1</td>
                  <td className="p-3 text-right font-black text-emerald-500 font-mono">+1.42</td>
                  <td className="p-3 text-right pr-4 font-black text-foreground">10</td>
                </tr>
                <tr className="bg-emerald-500/5">
                  <td className="p-3 pl-4 font-bold text-emerald-500">2</td>
                  <td className="p-3 font-bold text-foreground flex items-center gap-2">
                    <span>Engineering XI</span>
                    <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1 rounded">QUALIFIED</span>
                  </td>
                  <td className="p-3 text-center">6</td>
                  <td className="p-3 text-center">4</td>
                  <td className="p-3 text-center">2</td>
                  <td className="p-3 text-right font-black text-emerald-500 font-mono">+0.84</td>
                  <td className="p-3 text-right pr-4 font-black text-foreground">8</td>
                </tr>
                <tr>
                  <td className="p-3 pl-4 font-bold text-muted-foreground">3</td>
                  <td className="p-3 font-semibold text-foreground">Finance XI</td>
                  <td className="p-3 text-center">6</td>
                  <td className="p-3 text-center">3</td>
                  <td className="p-3 text-center">3</td>
                  <td className="p-3 text-right font-bold text-muted-foreground font-mono">+0.31</td>
                  <td className="p-3 text-right pr-4 font-bold text-foreground">6</td>
                </tr>
                <tr>
                  <td className="p-3 pl-4 font-bold text-muted-foreground">4</td>
                  <td className="p-3 font-semibold text-foreground">Operations XI</td>
                  <td className="p-3 text-center">6</td>
                  <td className="p-3 text-center">2</td>
                  <td className="p-3 text-center">4</td>
                  <td className="p-3 text-right font-bold text-muted-foreground font-mono">-0.52</td>
                  <td className="p-3 text-right pr-4 font-bold text-foreground">4</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. SECTION: LIVE BROADCAST & OBS OVERLAYS ("From Pitch to Screen")
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-red-500 border-red-500/30 font-bold uppercase tracking-wider text-[10px]">
            Live Streaming Ready
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Broadcast Overlays for OBS & YouTube.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Hook up our transparent live overlay URL directly into OBS, vMix, or Prism Live. Scores, striker dots, and boundary banners stream directly over camera footage.
          </p>
        </div>

        {/* OBS Lower-Third Mockup */}
        <div className="max-w-3xl mx-auto rounded-3xl border border-red-500/30 bg-slate-950 p-6 shadow-2xl relative overflow-hidden text-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5 text-red-400 font-bold">
                <Tv className="h-4 w-4" /> OBS Lower-Third Chroma Overlay
              </span>
              <span className="text-white/60 font-mono text-[11px]">1920 x 1080 Transparent Ready</span>
            </div>

            {/* Broadcast Lower Third Graphic */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-base">
                  WXI
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">WASA XI (Chasing 140)</div>
                  <div className="text-2xl font-black text-white">
                    142-6 <span className="text-sm text-white/70 font-mono">(18.4 ov)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="text-right">
                  <div className="text-white font-bold">Ahmed Khan* 48 (31)</div>
                  <div className="text-white/60">Ali Raza 32 (27)</div>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <div className="text-emerald-400 font-bold">Kashif Ali</div>
                  <div className="text-white/60">3.4-0-28-2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. SOCIAL PROOF & REAL TOURNAMENTS
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="text-center space-y-1.5 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
            Multi-Tenant Community
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Trusted by Community Leagues & Corporate Cups
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            From tape-ball tournaments to official weekend championships, organizers rely on PitchPe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="border border-border/80 bg-card p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <Quote className="h-6 w-6 text-emerald-500/60" />
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic">
                "Shifted our 16-team tape-ball championship from messy paper scorebooks to PitchPe in 5 minutes. The automated NRR table eliminated all end-of-stage disputes."
              </p>
            </div>
            <div className="pt-3 border-t flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-xs flex items-center justify-center shrink-0">
                ZA
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Zeeshan A.</div>
                <div className="text-[10px] text-muted-foreground">Tournament Director, Lahore Tape-Ball Cup</div>
              </div>
            </div>
          </Card>

          <Card className="border border-border/80 bg-card p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <Quote className="h-6 w-6 text-emerald-500/60" />
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic">
                "The mobile scorer console is incredibly fast. Multi-ball undo and offline cache meant zero panic when the ground 4G dropped during a tense chase."
              </p>
            </div>
            <div className="pt-3 border-t flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-xs flex items-center justify-center shrink-0">
                HK
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Hamza K.</div>
                <div className="text-[10px] text-muted-foreground">Official Scorer, Askari XI Championship</div>
              </div>
            </div>
          </Card>

          <Card className="border border-border/80 bg-card p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <Quote className="h-6 w-6 text-emerald-500/60" />
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic">
                "Fans and players loved the live match link. Having strike rates, fall of wickets, and live NRR shared directly into WhatsApp groups made our league feel like the IPL."
              </p>
            </div>
            <div className="pt-3 border-t flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-xs flex items-center justify-center shrink-0">
                BM
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Bilal M.</div>
                <div className="text-[10px] text-muted-foreground">Team Captain, Shaheen Super Strikers</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* =========================================================================
          10. FINAL CALL TO ACTION SECTION
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="py-12 sm:py-16 px-6 sm:px-10 rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 border border-emerald-500/40 text-center space-y-6 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 max-w-xl mx-auto relative z-10">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Ready to Run Your Cricket Tournament?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
              Create your tournament. Add your teams. Score every ball. Share every moment.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 relative z-10 pt-2 w-full max-w-md mx-auto sm:max-w-none">
            <Link to={createTourneyHref} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 bg-white text-slate-950 hover:bg-slate-100 font-black text-sm px-8 rounded-full shadow-xl transition-all duration-200 hover:scale-105"
              >
                Create Tournament Now
              </Button>
            </Link>
            <Link to="/team" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 border-white/30 text-white hover:bg-white/10 font-bold text-sm px-7 rounded-full backdrop-blur-sm shadow-md transition-all duration-200"
              >
                Explore Team Manager Hub
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
