import { useFirebaseAuth } from "@/providers/AuthProvider";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithRedirect,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { LOGIN_PATH } from "@/const";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const { firebaseUser, role, isAdmin, isScorer, isLoading } = useFirebaseAuth();

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem("wasa_organizer_session");
      sessionStorage.removeItem("scorer_global_pin_auth");
      await signOut(auth);
    } catch {}
    navigate(redirectPath);
  }, [navigate, redirectPath]);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      return await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      if (err?.message?.includes("closing/hidden") || err?.code === "failed-precondition") {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return await signInWithEmailAndPassword(auth, email.trim(), pass);
      }
      throw err;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string, displayName?: string) => {
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      if (err?.message?.includes("closing/hidden") || err?.code === "failed-precondition") {
        await new Promise((resolve) => setTimeout(resolve, 300));
        cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      } else {
        throw err;
      }
    }
    if (displayName && cred.user) {
      try {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      } catch {}
    }
    return cred;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return await signInWithRedirect(auth, googleProvider);
  }, []);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !firebaseUser) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, firebaseUser, navigate, redirectPath]);

  // User shape with admin / scorer / user roles
  const user = useMemo(() => {
    if (!firebaseUser) return null;
    return {
      name: firebaseUser.displayName,
      email: firebaseUser.email,
      avatar: firebaseUser.photoURL,
      role: role ?? ("user" as const),
      uid: firebaseUser.uid,
    };
  }, [firebaseUser, role]);

  return useMemo(
    () => ({
      user,
      isAuthenticated: !!firebaseUser,
      isAdmin,
      isScorer,
      role,
      isLoading,
      error: null,
      logout,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      refresh: () => {},
    }),
    [
      user,
      firebaseUser,
      isAdmin,
      isScorer,
      role,
      isLoading,
      logout,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
    ],
  );
}
