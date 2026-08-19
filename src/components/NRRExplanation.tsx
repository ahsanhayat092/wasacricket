import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Info, CheckCircle2, Trophy, HelpCircle } from "lucide-react";

export function NRRExplanation() {
  return (
    <Card className="border-border/80 bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-500" />
            Net Run Rate (NRR) Calculation Method & Tiebreaker Rules
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-500">
            ICC Standard Standardized
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Formula Box */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-500">
            <Info className="h-3.5 w-3.5" /> Formula
          </div>
          <div className="p-3 rounded-lg bg-background border font-mono text-xs sm:text-sm font-bold text-center text-foreground overflow-x-auto shadow-inner">
            NRR = (Total Runs Scored ÷ Total Overs Faced) − (Total Runs Conceded ÷ Total Overs Bowled)
          </div>
          <p className="text-[11px] text-muted-foreground">
            Net Run Rate is calculated over aggregate runs and aggregate legal balls across all completed league matches.
          </p>
        </div>

        {/* Detailed Rules Grid */}
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
              1. All Out (5 Wickets Fallen) Rule
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              If a team is dismissed (All Out) before completing their allocated overs, their run rate is calculated over their <strong>full quota of 4.0 overs (24 legal balls)</strong> rather than the overs at which they were bowled out.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              2. Successful Run Chase Rule
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              When a team successfully chases a target, only the <strong>actual balls faced</strong> (e.g. reaching target in 3.2 overs = 20 balls) are used in their batting run rate and the opponent's bowling run rate.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
              3. Fractional Overs Conversion
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Cricket overs are not decimals. In calculations, balls are converted as sixths of an over: <strong>0.1 ov = 0.167</strong>, <strong>0.2 ov = 0.333</strong>, <strong>0.3 ov = 0.500</strong>, <strong>0.4 ov = 0.667</strong>, <strong>0.5 ov = 0.833</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" />
              4. Ranking & Tiebreakers
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Teams are ranked by: <strong>Points (Win: 2, Tie/NR: 1, Loss: 0)</strong> ➔ <strong>Net Run Rate (NRR)</strong> ➔ <strong>Head-to-Head / Admin Tiebreak</strong>. Top 2 teams advance to the Final.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
