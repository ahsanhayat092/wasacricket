import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getMatchWorkspace } from "@/lib/queries";
import { useTournament } from "@/context/TournamentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Shield, KeyRound, ArrowRight, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function ScorerPinEntry() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournament } = useTournament();
  const [pin, setPin] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["matchWorkspace", id],
    queryFn: () => getMatchWorkspace(id!),
    enabled: !!id,
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const validPin = tournament?.scorerPin;

    if (!validPin) {
      toast.error("Tournament scorer PIN is not configured by the organizer.");
      return;
    }

    const attemptsKey = `scorer_failed_attempts_match_${id}`;
    const lockoutKey = `scorer_lockout_match_${id}`;
    const lockoutTime = sessionStorage.getItem(lockoutKey);
    if (lockoutTime && Date.now() < Number(lockoutTime)) {
      const remainingSecs = Math.ceil((Number(lockoutTime) - Date.now()) / 1000);
      toast.error(`Too many incorrect attempts. Please wait ${remainingSecs}s.`);
      return;
    }

    if (pin.trim() === validPin) {
      sessionStorage.removeItem(attemptsKey);
      sessionStorage.removeItem(lockoutKey);
      toast.success("Scorer PIN Verified! Accessing Match Live Scoring Console...");
      sessionStorage.setItem(`scorer_pin_auth_${id}`, "true");
      navigate(`/admin/matches/${id}`);
    } else {
      const currentAttempts = Number(sessionStorage.getItem(attemptsKey) || "0") + 1;
      sessionStorage.setItem(attemptsKey, String(currentAttempts));
      if (currentAttempts >= 5) {
        const lockUntil = Date.now() + 5 * 60 * 1000;
        sessionStorage.setItem(lockoutKey, String(lockUntil));
        toast.error("5 incorrect attempts. Access locked for 5 minutes.");
      } else {
        toast.error(`Incorrect PIN. (${5 - currentAttempts} attempts remaining)`);
      }
    }
  };

  const match = data?.match;
  const teamA = data?.teams?.find((t) => t.id === match?.teamAId);
  const teamB = data?.teams?.find((t) => t.id === match?.teamBId);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-emerald-500/40 bg-card shadow-2xl">
        <CardHeader className="text-center pb-2 space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-black tracking-tight">Scorer Access</CardTitle>
          <CardDescription className="text-xs">
            Enter the 4-digit tournament PIN to score this match live.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {match && (
            <div className="p-3 rounded-xl border bg-muted/20 text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-emerald-500 tracking-wider">
                {match.stage === "FINAL" ? "Grand Final" : match.stage === "PLAYOFF" ? "Playoff Match" : `Match #${match.matchNumber}`}
              </span>
              <p className="text-sm font-bold">
                {teamA?.name ?? "Team A"} vs {teamB?.name ?? "Team B"}
              </p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5 text-center">
              <Label className="text-xs font-bold">Enter 4-Digit PIN</Label>
              <Input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="h-12 text-center text-2xl font-mono tracking-widest font-bold"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-sm shadow-md"
            >
              Unlock Scorer Console <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-2">
            <Link to="/" className="hover:underline">
              Return to Public Portal
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
