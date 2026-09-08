/**
 * One auth listener, one user document, one source of truth (#368).
 *
 * Before this, useUserData and useUserRole each registered their own
 * onAuthStateChanged and their own read of users/{uid} - per component. With
 * 21 components on useUserData and 4 on useUserRole, a single screen could
 * open five to ten listeners and issue five to ten reads of the same
 * document. Beyond the waste, they could disagree: one component finished its
 * read before a role change and another after, so the same page rendered two
 * different answers to "is this user an admin".
 *
 * The hooks keep their existing return shapes, so none of the 25 call sites
 * changed - they now read from this context instead of doing the work
 * themselves.
 *
 * One deliberate behaviour change: useUserData used a one-time getDoc, while
 * useUserRole used a realtime onSnapshot. This unifies on onSnapshot, so
 * every consumer now sees a role change without a reload - which is what
 * useUserRole existed to provide and what useUserData's users silently
 * lacked.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db } from "@/firebase/firebaseConfig";
import { COLLECTIONS } from "@/firebase/collectionNames";
import { normalizeRole } from "@/constants/roles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, userData: null, loading: true });
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeUserDoc = null;

    const stopWatchingUserDoc = () => {
      if (typeof unsubscribeUserDoc === "function") {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }
    };

    const unsubscribeAuth = onAuthStateChanged(getAuth(), (firebaseUser) => {
      // A previous user's document listener must go before the next one is
      // attached, or signing out and back in leaves the old one live and the
      // two race to set userData.
      stopWatchingUserDoc();

      if (!firebaseUser) {
        setState({ user: null, userData: null, loading: false });
        return;
      }

      unsubscribeUserDoc = onSnapshot(
        doc(db, COLLECTIONS.users, firebaseUser.uid),
        (snapshot) => {
          setState({
            user: firebaseUser,
            userData: snapshot.exists() ? snapshot.data() : null,
            loading: false,
          });
        },
        (error) => {
          // A rules denial or a dropped connection must still resolve the
          // loading state, or every consumer spins forever.
          console.error("AuthProvider: user document listener failed", error);
          setState({ user: firebaseUser, userData: null, loading: false });
        }
      );
    });

    return () => {
      stopWatchingUserDoc();
      if (typeof unsubscribeAuth === "function") unsubscribeAuth();
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(getAuth());
      // No local setState here: onAuthStateChanged fires on sign-out and is
      // the one thing allowed to write this state. Clearing it here as well
      // would be a second source of truth, which is the bug this file exists
      // to remove.
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [navigate]);

  const value = useMemo(
    () => ({
      user: state.user,
      userData: state.userData,
      role: normalizeRole(state.userData?.role),
      loading: state.loading,
      logout,
    }),
    [state, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an <AuthProvider>. It is mounted in App.jsx.");
  }
  return context;
}
