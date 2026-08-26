import React from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Settings2,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-16 space-y-16">
      {/* 1. Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
          About The Platform
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
          Modern Cricket Management & Live Scoring
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Built from the ground up for corporate championships, grassroots tape-ball leagues, and professional clubs who demand real-time scoring, flexible over quotas, and instant fan access.
        </p>
      </div>

      {/* 2. Key Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4 border-emerald-500/30 bg-emerald-500/[0.02]">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Zap className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black">Zero-Delay Live Scoring</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Real-time ball-by-ball console with undo/redo capabilities, strike rotation, dismissal logging, and instant synchronization to fans across all devices.
          </p>
        </Card>

        <Card className="p-6 space-y-4 border-sky-500/30 bg-sky-500/[0.02]">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black">Dynamic Rules Engine</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Support for 4 to 50 overs per side, customized bowler quotas (1 or 2 overs max), Last-Man-Standing, free hits, and flexible playoff formats.
          </p>
        </Card>

        <Card className="p-6 space-y-4 border-amber-500/30 bg-amber-500/[0.02]">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black">Mathematical Scenario Engine</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Automated Net Run Rate (NRR) computation and mathematical qualification matrix calculating top 2/3 playoff scenarios in real-time.
          </p>
        </Card>
      </div>

      {/* 3. Supported Formats */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Supported Cricket Formats</h2>
          <p className="text-xs text-muted-foreground">
            Whether you are organizing a quick 4-over indoor match or a multi-day test event.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl border bg-card space-y-2">
            <Badge className="bg-emerald-500 text-white font-bold text-[10px]">Tape-Ball / Indoor</Badge>
            <h4 className="font-bold text-sm">4–8 Overs Match</h4>
            <p className="text-muted-foreground">
              6 players per team, 1 over per bowler, Last-Man-Standing allowed.
            </p>
          </div>

          <div className="p-4 rounded-2xl border bg-card space-y-2">
            <Badge className="bg-sky-500 text-white font-bold text-[10px]">T10 League</Badge>
            <h4 className="font-bold text-sm">10 Overs Match</h4>
            <p className="text-muted-foreground">
              Max 2 overs per bowler, 11-a-side squads, Page Playoff structure.
            </p>
          </div>

          <div className="p-4 rounded-2xl border bg-card space-y-2">
            <Badge className="bg-amber-500 text-white font-bold text-[10px]">T20 Standard</Badge>
            <h4 className="font-bold text-sm">20 Overs Match</h4>
            <p className="text-muted-foreground">
              Max 4 overs per bowler, official ICC rules, IPL-style top 4 playoffs.
            </p>
          </div>

          <div className="p-4 rounded-2xl border bg-card space-y-2">
            <Badge className="bg-purple-500 text-white font-bold text-[10px]">Custom Format</Badge>
            <h4 className="font-bold text-sm">Organizers Choice</h4>
            <p className="text-muted-foreground">
              Fully configurable overs, wickets, extra runs, and knockout brackets.
            </p>
          </div>
        </div>
      </section>

      {/* 4. CTA */}
      <section className="text-center p-8 sm:p-12 rounded-3xl border bg-card/60 space-y-6 shadow-sm">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Host Your Tournament Today</h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Create your account, customize your format, and start live scoring in under two minutes.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/organizer/signup">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm h-11 px-8 rounded-xl shadow-md">
              Create Tournament
            </Button>
          </Link>
          <Link to="/live-scores">
            <Button size="lg" variant="outline" className="font-bold text-sm h-11 px-6 rounded-xl">
              Browse Live Matches
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
