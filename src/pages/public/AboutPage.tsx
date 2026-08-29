import React from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Zap,
  Activity,
  CheckCircle2,
  Layers,
  ArrowRight,
  Shield,
  KeyRound,
  FileText,
  Flame,
  Award,
  Sparkles,
  Users,
  Tv,
  Globe,
  HelpCircle,
  Clock,
  Compass,
  UserCheck,
  Wifi,
  WifiOff,
  Smartphone,
  RefreshCw,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-16 space-y-16">
      {/* 1. Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px] gap-1 px-3 py-1">
          <Compass className="h-3 w-3" /> Platform Guide & How It Works
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
          How PitchPe Works
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Every cricket championship brings together four key people: <strong>The Organizer</strong>, <strong>Team Managers</strong>, <strong>Match Scorers</strong>, and <strong>The Fans</strong>. Here is how our ecosystem connects everyone in real-time.
        </p>
      </div>

      {/* 2. The 4 Key Roles in the Ecosystem */}
      <section className="space-y-6">
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Role-Based Ecosystem
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">The Four Roles in Every Tournament</h2>
          <p className="text-xs text-muted-foreground">
            Everyone has a dedicated portal tailored precisely to what they need to do on match day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role 1: Tournament Organizer */}
          <Card className="p-6 space-y-4 border-2 border-emerald-500/30 bg-emerald-500/[0.02] rounded-3xl shadow-sm hover:border-emerald-500/60 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shadow-inner">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">1. The Tournament Organizer</h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">The Host & League Director</p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">HOST</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The organizer creates the championship event. They configure the match rules (e.g. 4-over tape ball or 20-over league), invite participating clubs, automatically generate round-robin schedules, assign venues, and award the trophy.
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>5-step tournament setup wizard in under 3 minutes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Automated round-robin fixtures & playoff brackets</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Custom points rules, bowler quotas & scorer PIN delegation</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t">
              <Link to="/organizer/signup">
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> Launch a Tournament as Organizer
                </Button>
              </Link>
            </div>
          </Card>

          {/* Role 2: Team Manager */}
          <Card className="p-6 space-y-4 border-2 border-sky-500/30 bg-sky-500/[0.02] rounded-3xl shadow-sm hover:border-sky-500/60 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold shadow-inner">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">2. The Team Manager</h3>
                    <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold">The Club Owner & Squad Leader</p>
                  </div>
                </div>
                <Badge className="bg-sky-600 text-white text-[10px] font-bold">CLUBS</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Team Managers own and manage individual cricket clubs (e.g. <em>Gladiolus</em>, <em>Lions</em>). They register team branding, maintain permanent player squads, assign captains, and accept tournament invitations or submit join requests.
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                  <span>Permanent club squad & player roster management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                  <span>Assign Captain, Vice-Captain, & Wicketkeeper badges</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                  <span>Accept tournament invites or submit join applications</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t">
              <Link to="/team">
                <Button size="sm" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Open Team Manager Portal
                </Button>
              </Link>
            </div>
          </Card>

          {/* Role 3: Match Scorer */}
          <Card className="p-6 space-y-4 border-2 border-amber-500/30 bg-amber-500/[0.02] rounded-3xl shadow-sm hover:border-amber-500/60 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shadow-inner">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">3. The Match Scorer</h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">The Ground Official & Umpire</p>
                  </div>
                </div>
                <Badge className="bg-amber-500 text-slate-950 text-[10px] font-bold">OFFICIAL</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                At the ground, the scorer operates the live match console on their mobile phone or tablet. They record the coin toss, set the active 6-a-side or 11-a-side playing lineups, log every ball live, and broadcast scores to the world.
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Single-tap ball scoring (0, 1, 2, 3, 4, 6, Wickets, Extras)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Instant Multi-Ball Undo for error correction</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>PIN code access — score on field without needing password login</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t">
              <Link to="/scorer/dashboard">
                <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Access Scorer Match Center
                </Button>
              </Link>
            </div>
          </Card>

          {/* Role 4: The Public Fan */}
          <Card className="p-6 space-y-4 border-2 border-purple-500/30 bg-purple-500/[0.02] rounded-3xl shadow-sm hover:border-purple-500/60 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold shadow-inner">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">4. Fans, Players & Spectators</h3>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Zero-Login Live Experience</p>
                  </div>
                </div>
                <Badge className="bg-purple-600 text-white text-[10px] font-bold">FANS</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Fans, family members, and team supporters follow the tournament live from anywhere. No login is needed to watch live ball-by-ball commentary, points table rankings with Net Run Rates (NRR), and live OBS stream overlays.
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span>Real-time scorecards, ball timeline & partnerships</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span>Live Points Table with automated Net Run Rate (NRR)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span>OBS graphics overlay ready for YouTube/Facebook live streaming</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t">
              <Link to="/live-scores">
                <Button size="sm" variant="outline" className="w-full border-purple-500/40 text-purple-600 hover:bg-purple-500/10 font-bold text-xs rounded-xl gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Watch Live Scores
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. The 5-Step Journey of a Tournament */}
      <section className="space-y-8">
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            End-to-End Lifecycle
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">The Journey of a Tournament</h2>
          <p className="text-xs text-muted-foreground">
            From the initial idea to crowning the champions — here is how a tournament unfolds step by step.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Step 1 */}
          <div className="p-5 rounded-3xl border-2 bg-card space-y-3 relative overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-sm flex items-center justify-center">
              1
            </div>
            <h3 className="font-black text-sm">Launch & Rules</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Organizer sets overs (e.g. 4-over tape ball or 20-over T20), bowler quotas, bonus points, and venues using the 5-step wizard.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-3xl border-2 bg-card space-y-3 relative overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 font-black text-sm flex items-center justify-center">
              2
            </div>
            <h3 className="font-black text-sm">Clubs & Squads</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Team Managers join the tournament, prepare player rosters, and set official Captains and Wicketkeepers for their club.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-3xl border-2 bg-card space-y-3 relative overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 font-black text-sm flex items-center justify-center">
              3
            </div>
            <h3 className="font-black text-sm">Toss & Live Score</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              On match day, the scorer conducts the coin toss, sets the playing VI / XI, and records every ball live with single-tap controls.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-3xl border-2 bg-card space-y-3 relative overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 font-black text-sm flex items-center justify-center">
              4
            </div>
            <h3 className="font-black text-sm">Standings & NRR</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every completed ball updates the Points Table, Wins/Losses, and Net Run Rate automatically across all public devices.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-5 rounded-3xl border-2 bg-card space-y-3 relative overflow-hidden border-emerald-500/40 bg-emerald-500/[0.02]">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center">
              🏆
            </div>
            <h3 className="font-black text-sm">Playoffs & Trophy</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Top seeded teams battle in Qualifiers, Eliminators, and the Grand Final. The champion spotlight celebrates the victory.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Wearing Multiple Hats (Multi-Role Support) */}
      <Card className="p-6 sm:p-8 rounded-3xl border-2 border-dashed bg-muted/20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black">Wearing Multiple Hats? No Problem!</h3>
            <p className="text-xs text-muted-foreground">
              You can organize a tournament, manage a team, and score matches from a single account.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          In real grassroots cricket, an organizer is often also a club captain and weekend scorer. Our universal <strong>Workspace Role Switcher</strong> at the top of your screen lets you toggle between your <strong>Organizer Workspace</strong>, <strong>Team Manager Portal</strong>, and <strong>Scorer Cockpit</strong> with a single click.
        </p>
      </Card>

      {/* 4.5. KILLER FEATURE: OFFLINE-FIRST MATCH SCORING */}
      <section className="space-y-6">
        <div className="rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Headline & Pitch */}
          <div className="text-center space-y-3 max-w-2xl mx-auto relative z-10">
            <Badge className="bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1 gap-1.5 uppercase tracking-wider">
              <WifiOff className="h-3.5 w-3.5" /> Built For Real-World Grounds
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              📶 Cricket Doesn't Stop When the Internet Does.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Score your entire match offline without missing a single ball. When connectivity returns, your scorecards, ball timelines, and standings synchronize automatically.
            </p>
          </div>

          {/* Visual Step-by-Step Flow: ONLINE -> OFFLINE -> SCORE -> RECONNECT -> SYNCED */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-2 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mx-auto">
                <Wifi className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400">Step 1</span>
                <h4 className="text-xs font-black text-white">ONLINE</h4>
                <p className="text-[11px] text-slate-400">Match & lineups locked</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center space-y-2 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center mx-auto">
                <WifiOff className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400">Step 2</span>
                <h4 className="text-xs font-black text-white">OFFLINE MODE</h4>
                <p className="text-[11px] text-slate-400">Ground signal drops</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 text-center space-y-2 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center mx-auto">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-sky-400">Step 3</span>
                <h4 className="text-xs font-black text-white">SCORE BALLS</h4>
                <p className="text-[11px] text-slate-400">0ms instant touch taps</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-center space-y-2 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center mx-auto">
                <RefreshCw className="h-5 w-5 animate-spin" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-400">Step 4</span>
                <h4 className="text-xs font-black text-white">RECONNECT</h4>
                <p className="text-[11px] text-slate-400">Network handshake</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-400 bg-emerald-500 text-center space-y-2 flex flex-col justify-between text-slate-950 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-emerald-400 font-bold flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-900">Step 5</span>
                <h4 className="text-xs font-black text-slate-950">AUTO SYNCED</h4>
                <p className="text-[11px] text-slate-900 font-medium">Cloud & fans updated</p>
              </div>
            </div>
          </div>

          {/* 3 Key Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Zero Ground Lag</strong>
                <span className="text-slate-400 text-[11px]">Instant 0ms touch response on every ball without waiting for network roundtrips.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">100% Data Loss Protection</strong>
                <span className="text-slate-400 text-[11px]">Every run, wicket, and over is buffered locally in storage until cloud handshake.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Instant OBS & Fan Catchup</strong>
                <span className="text-slate-400 text-[11px]">Upon reconnection, public scorecards, NRR calculations, and broadcast graphics fast-forward.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Supported Formats */}
      <section className="space-y-6">
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Handled Cricket Formats</h2>
          <p className="text-xs text-muted-foreground">
            Built for any match length, player count, or ground dimension.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl border bg-card space-y-1.5">
            <Badge className="bg-emerald-500 text-white font-bold text-[10px]">Tape-Ball / Indoor</Badge>
            <h4 className="font-bold text-sm">4–8 Overs Match</h4>
            <p className="text-muted-foreground">
              6-a-side squads, 1 over per bowler, Last-Man-Standing enabled.
            </p>
          </div>

          <div className="p-4 rounded-2xl border bg-card space-y-1.5">
            <Badge className="bg-sky-500 text-white font-bold text-[10px]">T10 League</Badge>
            <h4 className="font-bold text-sm">10 Overs Match</h4>
            <p className="text-muted-foreground">
              Max 2 overs per bowler, 11-a-side squads, powerplay rules.
            </p>
          </div>

          <div className="p-4 rounded-2xl border bg-card space-y-1.5">
            <Badge className="bg-amber-500 text-white font-bold text-[10px]">T20 Standard</Badge>
            <h4 className="font-bold text-sm">20 Overs Match</h4>
            <p className="text-muted-foreground">
              Max 4 overs per bowler, full ICC rules, IPL-style top 4 playoffs.
            </p>
          </div>

          <div className="p-4 rounded-2xl border bg-card space-y-1.5">
            <Badge className="bg-purple-500 text-white font-bold text-[10px]">Custom Rules</Badge>
            <h4 className="font-bold text-sm">Any Format</h4>
            <p className="text-muted-foreground">
              Configurable overs (1–50), penalty runs, custom boundary rules.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Bottom CTA */}
      <section className="text-center p-8 sm:p-12 rounded-3xl border bg-card/80 space-y-6 shadow-sm">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Ready to Get Started?</h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Choose your role below to launch a tournament, manage your squad, or follow live games.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/organizer/signup">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-11 px-6 rounded-xl shadow-md gap-2">
              <Trophy className="h-4 w-4 text-amber-300" /> Launch a Tournament
            </Button>
          </Link>
          <Link to="/team">
            <Button size="lg" className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-11 px-6 rounded-xl shadow-md gap-2">
              <Users className="h-4 w-4" /> Manage a Team
            </Button>
          </Link>
          <Link to="/live-scores">
            <Button size="lg" variant="outline" className="font-bold text-xs h-11 px-6 rounded-xl gap-2">
              <Activity className="h-4 w-4 text-emerald-500" /> View Live Scores
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
