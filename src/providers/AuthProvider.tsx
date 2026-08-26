import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  getRedirectResult,
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
    // Process any pending redirect auth credentials
    getRedirectResult(auth).catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) {
        // Check if there is an active organizer session in localStorage
        const organizerSessionStr =
          typeof window !== "undefined"
            ? localStorage.getItem("wasa_organizer_session")
            : null;
        if (organizerSessionStr) {
          try {
            const org = JSON.parse(organizerSessionStr);
            if (org?.email) {
              const cleanEmail = org.email.toLowerCase().trim();
              setState({
                firebaseUser: {
                  uid: org.uid || `org_${cleanEmail.replace(/[^a-z0-9]/gi, "_")}`,
                  email: cleanEmail,
                  displayName: org.name || cleanEmail.split("@")[0],
                  photoURL: null,
                } as any,
                role: "admin",
                isAdmin: true,
                isScorer: true,
                isLoading: false,
              });
              return;
            }
          } catch {}
        }

        // Check if there is an active tournament-scoped PIN session in sessionStorage
        let hasPinSession = false;
        if (typeof window !== "undefined") {
          try {
            const raw = sessionStorage.getItem("scorer_auth_tournaments");
            const parsed = raw ? JSON.parse(raw) : [];
            hasPinSession = Array.isArray(parsed) && parsed.length > 0;
          } catch {}
        }

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
      const isSuperAdmin = email === "ahsanhayat092@gmail.com";

      try {
        // Query users collection & tournament members collection for this email
        const [userSnap, memberSnap] = await Promise.all([
          getDocs(query(usersCol(), where("email", "==", email))),
          getDocs(query(tournamentMembersCol(), where("userEmail", "==", email))),
        ]);

        let isTournamentAdmin = true;
        let isTournamentScorer = true;

        // Ensure user account is saved in Firestore
        if (userSnap.empty) {
          await addDoc(usersCol(), {
            email,
            name: user.displayName ?? email.split("@")[0],
            role: "admin",
            createdBy: isSuperAdmin ? "system" : "self_signup",
            createdAt: now(),
            updatedAt: now(),
          });
        }

        setState({
          firebaseUser: user,
          role: "admin",
          isAdmin: true,
          isScorer: true,
          isLoading: false,
        });
      } catch (err) {
        console.error("Error resolving user role:", err);
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
