import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function OrganizerAuth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "login" ? "login" : "signup";
  const [mode, setMode] = useState<"signup" | "login">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const { signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password, name.trim());
        toast.success("Welcome! Organizer account created.");
        navigate("/admin/tournaments/new");
      } else {
        await signInWithEmail(email.trim(), password);
        toast.success("Logged in successfully!");
        navigate("/admin/tournaments");
      }
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-emerald-500/40 bg-card shadow-2xl">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
            <Trophy className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">
            {mode === "signup" ? "Create Organizer Account" : "Organizer Login"}
          </CardTitle>
          <CardDescription className="text-xs">
            Create and manage your own cricket tournaments with live scoring.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Your Name / Organization</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ahsan Hayat (Lahore Sports Club)"
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="organizer@example.com"
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
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl gap-2 shadow-md shadow-emerald-600/20"
            >
              {loading ? "Processing..." : mode === "signup" ? "Sign Up & Launch Tournament" : "Log In to Dashboard"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center text-xs text-muted-foreground pt-2 border-t space-y-2">
            {mode === "signup" ? (
              <p>
                Already have an organizer account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-emerald-500 hover:underline font-bold"
                >
                  Log In
                </button>
              </p>
            ) : (
              <p>
                New tournament organizer?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-emerald-500 hover:underline font-bold"
                >
                  Create an Account
                </button>
              </p>
            )}
            <div>
              <Link to="/scorer/login" className="text-amber-500 hover:underline text-[11px] font-semibold">
                Are you a Match Scorer? Click here for Scorer Access →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
