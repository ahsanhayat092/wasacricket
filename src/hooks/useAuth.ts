import { useFirebaseAuth } from "@/providers/AuthProvider";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
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
      refresh: () => {},
    }),
    [user, firebaseUser, isAdmin, isScorer, role, isLoading, logout],
  );
}
