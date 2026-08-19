import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getDocs, query, where, addDoc } from "firebase/firestore";
import { usersCol, now, type UserAccount, type UserRole } from "@/lib/firestore";

type AuthContextValue = {
  firebaseUser: FirebaseUser | null;
  role: UserRole | null;
  isAdmin: boolean;
  isScorer: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  role: null,
  isAdmin: false,
  isScorer: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({
    firebaseUser: null,
    role: null,
    isAdmin: false,
    isScorer: false,
    isLoading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) {
        setState({
          firebaseUser: null,
          role: null,
          isAdmin: false,
          isScorer: false,
          isLoading: false,
        });
        return;
      }

      const email = user.email.toLowerCase().trim();

      try {
        // Query users collection for this email
        const [userSnap, allUsersSnap] = await Promise.all([
          getDocs(query(usersCol(), where("email", "==", email))),
          getDocs(usersCol()),
        ]);

        let role: UserRole | null = null;

        if (!userSnap.empty) {
          const userData = userSnap.docs[0].data() as UserAccount;
          role = userData.role;
        } else if (allUsersSnap.empty) {
          // First user in system is automatically registered as Admin
          role = "admin";
          await addDoc(usersCol(), {
            email,
            name: user.displayName ?? "Initial Administrator",
            role: "admin",
            createdBy: "system",
            createdAt: now(),
            updatedAt: now(),
          });
        } else {
          // User logged in but not yet registered by admin
          role = null;
        }

        const isAdmin = role === "admin";
        const isScorer = role === "scorer" || isAdmin; // Admins have scorer privileges too

        setState({
          firebaseUser: user,
          role,
          isAdmin,
          isScorer,
          isLoading: false,
        });
      } catch (err) {
        console.error("Error resolving user role:", err);
        // Fallback in case of network or permissions issue during first setup
        setState({
          firebaseUser: user,
          role: "admin",
          isAdmin: true,
          isScorer: true,
          isLoading: false,
        });
      }
    });

    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useFirebaseAuth(): AuthContextValue {
  return useContext(AuthContext);
}
