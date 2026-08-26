import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getDocs, query, where, addDoc } from "firebase/firestore";
import { usersCol, tournamentMembersCol, now, type UserAccount, type UserRole, type TournamentMember } from "@/lib/firestore";

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
        // Check if there is an active PIN session in sessionStorage
        const hasPinSession = typeof window !== "undefined" && sessionStorage.getItem("scorer_global_pin_auth") === "true";
        setState({
          firebaseUser: null,
          role: hasPinSession ? "scorer" : null,
          isAdmin: false,
          isScorer: hasPinSession,
          isLoading: false,
        });
        return;
      }

      const email = user.email.toLowerCase().trim();

      try {
        // Query users collection & tournament members collection for this email
        const [userSnap, memberSnap, allUsersSnap] = await Promise.all([
          getDocs(query(usersCol(), where("email", "==", email))),
          getDocs(query(tournamentMembersCol(), where("userEmail", "==", email))),
          getDocs(usersCol()),
        ]);

        let role: UserRole | null = null;
        let isTournamentAdmin = false;
        let isTournamentScorer = false;

        // Check Tournament Memberships
        if (!memberSnap.empty) {
          const memberships = memberSnap.docs.map((d) => d.data() as TournamentMember);
          if (memberships.some((m) => m.role === "OWNER" || m.role === "ADMIN")) {
            isTournamentAdmin = true;
          }
          if (memberships.some((m) => m.role === "SCORER" || m.role === "ADMIN" || m.role === "OWNER")) {
            isTournamentScorer = true;
          }
        }

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
          role = isTournamentAdmin ? "admin" : isTournamentScorer ? "scorer" : null;
        }

        const isAdmin = role === "admin" || isTournamentAdmin;
        const isScorer = role === "scorer" || isAdmin || isTournamentScorer;

        setState({
          firebaseUser: user,
          role: isAdmin ? "admin" : isScorer ? "scorer" : null,
          isAdmin,
          isScorer,
          isLoading: false,
        });
      } catch (err) {
        console.error("Error resolving user role:", err);
        setState({
          firebaseUser: user,
          role: null,
          isAdmin: false,
          isScorer: false,
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
