import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router";
import { useFirebaseAuth } from "@/providers/AuthProvider";
import { Trophy, Mail, Lock, KeyRound, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const googleProvider = new GoogleAuthProvider();

export default function Login() {
  const navigate = useNavigate();
  const { firebaseUser, role, isAdmin, isScorer, isLoading } = useFirebaseAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (!isLoading && firebaseUser) {
      if (isAdmin) {
        navigate("/admin", { replace: true });
      } else if (isScorer) {
        navigate("/admin/matches", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [firebaseUser, isLoading, isAdmin, isScorer, navigate]);

  // Google Sign In
  async function handleGoogleSignIn() {
    try {
      setSubmitting(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error("Google sign-in error:", err);
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // Email & Password Sign In
  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    try {
      setSubmitting(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Signed in successfully");
    } catch (err: unknown) {
      console.error("Sign-in error:", err);
      const code = (err as { code?: string })?.code;
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        toast.error("Invalid email or password. Please check and try again.");
      } else if (code === "auth/wrong-password") {
        toast.error("Incorrect password.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many failed attempts. Please try again later or reset password.");
      } else {
        toast.error(err instanceof Error ? err.message : "Sign-in failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Email & Password Sign Up / Register
  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Account created successfully. Welcome to PitchPe!");
    } catch (err: unknown) {
      console.error("Sign-up error:", err);
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.error(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Password Reset
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    try {
      setSubmitting(true);
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      toast.success("Password reset email sent. Please check your inbox.");
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950">
      <Card className="w-full max-w-md border-border/40 bg-card/90 backdrop-blur shadow-2xl">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
              <Trophy className="h-7 w-7 text-emerald-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            WASA Premier League
          </CardTitle>
          <CardDescription className="text-xs">
            Sign in to access the Admin & Official Scorer Workspace
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Google Sign In Button */}
          <Button
            id="google-sign-in-btn"
            type="button"
            className="w-full gap-2.5 bg-white text-slate-900 hover:bg-slate-100 border border-slate-200 font-semibold"
            size="lg"
            disabled={submitting}
            onClick={handleGoogleSignIn}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-card px-3 text-muted-foreground font-semibold">
                Or sign in with email
              </span>
            </div>
          </div>

          {/* Forgot Password View */}
          {showForgot ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-xs">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    placeholder="admin@pitchpe.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {resetSent && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  ✓ Reset link sent! Check your inbox.
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin" className="text-xs">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-xs">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-xs">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        required
                        placeholder="you@pitchpe.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-xs">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Sign In to Portal
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-4">
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-xs">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        required
                        placeholder="you@pitchpe.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-xs">
                      Password (min 6 characters)
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-xs">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          <div className="pt-2 text-center">
            <a
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              ← Back to Public Site
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
