import { useFirebaseAuth } from "@/providers/AuthProvider";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
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
    await signOut(auth);
    navigate(redirectPath);
  }, [navigate, redirectPath]);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    return await signInWithEmailAndPassword(auth, email.trim(), pass);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string, displayName?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    return cred;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return await signInWithPopup(auth, googleProvider);
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
