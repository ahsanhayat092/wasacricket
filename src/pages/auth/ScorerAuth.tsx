import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTournament } from "@/context/TournamentContext";
import { getTournaments } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ArrowRight, Shield, Zap, Sparkles, CheckCircle2, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function ScorerAuth() {
  const [tab, setTab] = useState<"pin" | "login">("pin");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [pin, setPin] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { tournamentId, setTournamentId } = useTournament();
  const navigate = useNavigate();

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments"],
    queryFn: getTournaments,
  });

  const activeTourneyId = selectedTournamentId || tournamentId || tournaments?.[0]?.id || "";

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) {
      toast.error("Please enter the tournament Scorer PIN.");
      return;
    }

    const targetTourney = tournaments?.find((t) => t.id === activeTourneyId);
    if (!targetTourney) {
      toast.error("Please select a tournament event to score.");
      return;
    }

    // Rate-limit lockout check
    const attemptsKey = `scorer_failed_attempts_${targetTourney.id}`;
    const lockoutKey = `scorer_lockout_${targetTourney.id}`;
    const lockoutTime = sessionStorage.getItem(lockoutKey);
    if (lockoutTime && Date.now() < Number(lockoutTime)) {
      const remainingSecs = Math.ceil((Number(lockoutTime) - Date.now()) / 1000);
      toast.error(`Too many incorrect attempts. Please wait ${remainingSecs}s before trying again.`);
      return;
    }

    const correctPin = targetTourney.scorerPin;

    if (correctPin && cleanPin === correctPin) {
      // Clear failed attempts
      sessionStorage.removeItem(attemptsKey);
      sessionStorage.removeItem(lockoutKey);

      // Authorize strictly for THIS tournament only
      const existingStr = sessionStorage.getItem("scorer_auth_tournaments");
      let existing: string[] = [];
      try {
        existing = existingStr ? JSON.parse(existingStr) : [];
      } catch {}
      if (!existing.includes(targetTourney.id)) {
        existing.push(targetTourney.id);
      }
      sessionStorage.setItem("scorer_auth_tournaments", JSON.stringify(existing));
      sessionStorage.setItem(`scorer_pin_auth_${targetTourney.id}`, "true");
      setTournamentId(targetTourney.id);

      toast.success(`🎉 PIN Verified! Scoring unlocked for "${targetTourney.name}"`);
      navigate("/scorer/dashboard");
      return;
    }

    // Track failed attempts
    const currentAttempts = Number(sessionStorage.getItem(attemptsKey) || "0") + 1;
    sessionStorage.setItem(attemptsKey, String(currentAttempts));
    if (currentAttempts >= 5) {
      const lockUntil = Date.now() + 5 * 60 * 1000;
      sessionStorage.setItem(lockoutKey, String(lockUntil));
      toast.error(`5 incorrect attempts. Scorer entry locked for 5 minutes.`);
    } else {
      toast.error(`Incorrect PIN for "${targetTourney.name}". (${5 - currentAttempts} attempts remaining)`);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        toast.success("Scorer account created successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        toast.success("Scorer logged in successfully!");
      }
      navigate("/scorer/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Signed in with Google!");
      navigate("/scorer/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Google sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-amber-500/40 bg-card shadow-2xl">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">Scorer Access</CardTitle>
          <CardDescription className="text-xs">
            Unlock the live scoring console with a match PIN or sign in with your designated scorer account.
          </CardDescription>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/40 rounded-xl border mt-2">
            <Button
              type="button"
              size="sm"
              variant={tab === "pin" ? "default" : "ghost"}
              className={`text-xs font-bold rounded-lg ${tab === "pin" ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setTab("pin")}
            >
              🔑 Quick Match PIN
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "login" ? "default" : "ghost"}
              className={`text-xs font-bold rounded-lg ${tab === "login" ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setTab("login")}
            >
              👤 Scorer Account
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {tab === "pin" ? (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-bold">Select Tournament Event</Label>
                <select
                  value={selectedTournamentId || activeTourneyId}
                  onChange={(e) => setSelectedTournamentId(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold rounded-xl border bg-background text-foreground"
                >
                  {tournaments?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 text-center">
                <Label className="text-xs font-bold">Enter Tournament Scorer PIN</Label>
                <Input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="h-12 text-center text-2xl font-mono tracking-widest font-bold rounded-xl"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter the access code set by your tournament organizer for this event.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl gap-2 shadow-md shadow-amber-500/20"
              >
                Access Match Center <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Scorer Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="scorer@example.com"
                    className="h-10 text-xs rounded-xl"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl gap-2 shadow-md shadow-amber-500/20"
                >
                  {loading
                    ? "Processing..."
                    : authMode === "signup"
                    ? "Create Scorer Account"
                    : "Log In as Scorer"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              {/* Toggle Signin / Signup */}
              <div className="text-center text-xs">
                {authMode === "signin" ? (
                  <p className="text-muted-foreground">
                    New scorer?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className="text-amber-500 font-bold hover:underline"
                    >
                      Create an account
                    </button>
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("signin")}
                      className="text-amber-500 font-bold hover:underline"
                    >
                      Log in here
                    </button>
                  </p>
                )}
              </div>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <span className="relative bg-card px-2 text-[10px] text-muted-foreground uppercase">
                  Or continue with
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-10 text-xs font-bold gap-2 rounded-xl"
              >
                <span>Continue with Google</span>
              </Button>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground pt-2 border-t space-y-2">
            <Link to="/organizer/signup" className="text-emerald-500 hover:underline font-bold block">
              Are you a Tournament Organizer? Click here →
            </Link>
            <Link to="/" className="text-muted-foreground hover:underline text-[11px] block">
              Return to Public Homepage
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
