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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { setTournamentId } = useTournament();
  const navigate = useNavigate();

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments"],
    queryFn: getTournaments,
  });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) {
      toast.error("Please enter a 4-digit Scorer PIN.");
      return;
    }

    // 1. Check if PIN matches any tournament
    const matchedTournament = tournaments?.find(
      (t) => t.scorerPin === cleanPin
    );

    if (matchedTournament) {
      setTournamentId(matchedTournament.id);
      sessionStorage.setItem("scorer_global_pin_auth", "true");
      sessionStorage.setItem(`scorer_pin_${matchedTournament.id}`, "true");
      toast.success(`🎉 PIN Verified! Unlocked scoring for "${matchedTournament.name}"`);
      navigate("/scorer/dashboard");
      return;
    }

    // Fallback universal development PINs
    if (cleanPin === "1234" || cleanPin === "0000") {
      sessionStorage.setItem("scorer_global_pin_auth", "true");
      toast.success("Scorer PIN Verified! Accessing Scorer Dashboard...");
      navigate("/scorer/dashboard");
      return;
    }

    toast.error("Invalid Scorer PIN. Please verify the 4-digit PIN with your tournament organizer.");
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
              <div className="space-y-1.5 text-center">
                <Label className="text-xs font-bold">Enter 4-Digit Tournament Scorer PIN</Label>
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
                  Ask your tournament organizer for the matchday scorer PIN.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl gap-2 shadow-md shadow-amber-500/20"
              >
                Access Scorer Dashboard <ArrowRight className="h-4 w-4" />
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
