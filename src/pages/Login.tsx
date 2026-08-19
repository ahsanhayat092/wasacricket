import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router";
import { useFirebaseAuth } from "@/providers/AuthProvider";
import { useEffect } from "react";
import { Trophy } from "lucide-react";

const provider = new GoogleAuthProvider();

export default function Login() {
  const navigate = useNavigate();
  const { firebaseUser, isLoading } = useFirebaseAuth();

  useEffect(() => {
    if (!isLoading && firebaseUser) {
      navigate("/admin");
    }
  }, [firebaseUser, isLoading, navigate]);

  async function handleGoogleSignIn() {
    try {
      await signInWithPopup(auth, provider);
      navigate("/admin");
    } catch (err: unknown) {
      console.error("Sign-in failed:", err);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950">
      <Card className="w-full max-w-sm border-border/40 bg-card/80 backdrop-blur shadow-2xl">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
              <Trophy className="h-7 w-7 text-emerald-400" />
            </div>
          </div>
          <CardTitle className="text-xl">Tournament Admin</CardTitle>
          <CardDescription>
            Sign in to manage the WasaCricket tournament
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Button
            id="google-sign-in-btn"
            className="w-full gap-2 bg-white text-slate-900 hover:bg-slate-100 border border-slate-200"
            size="lg"
            onClick={handleGoogleSignIn}
          >
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
            Continue with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Admin access is granted by the tournament administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
