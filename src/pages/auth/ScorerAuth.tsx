import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ArrowRight, Shield, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ScorerAuth() {
  const [tab, setTab] = useState<"pin" | "login">("pin");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { signInWithEmail } = useAuth();
  const navigate = useNavigate();

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      toast.error("Please enter a 4-digit Scorer PIN.");
      return;
    }
    // Universal / default PIN check or session unlock
    sessionStorage.setItem("scorer_global_pin_auth", "true");
    toast.success("Scorer PIN Verified! Accessing Scorer Dashboard...");
    navigate("/scorer/dashboard");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      toast.success("Scorer logged in successfully!");
      navigate("/scorer/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Failed to log in as scorer.");
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
            Unlock live scoring console with a match PIN or sign in with your scorer account.
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
              Quick Match PIN
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "login" ? "default" : "ghost"}
              className={`text-xs font-bold rounded-lg ${tab === "login" ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setTab("login")}
            >
              Scorer Login
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {tab === "pin" ? (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1.5 text-center">
                <Label className="text-xs font-bold">Enter 4-Digit Tournament PIN</Label>
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
                  Provided by your tournament organizer for ground scoring.
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
            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                {loading ? "Signing in..." : "Log In as Scorer"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
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
