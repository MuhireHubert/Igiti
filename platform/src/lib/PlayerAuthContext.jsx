import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, firebaseReady } from "../lib/firebase.js";

const PlayerAuthContext = createContext(null);

export function PlayerAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    ready: firebaseReady && Boolean(auth),
    signIn: async (email, password) => {
      if (!auth) throw new Error("Player accounts are not configured yet.");
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Accounts created in Firebase Console do not receive an automatic
      // verification link. Request one on the first sign-in so privileged
      // server routes can continue to require a verified identity.
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
      }
      return credential;
    },
    signUp: async (email, password, role) => {
      if (!auth) throw new Error("Player accounts are not configured yet.");
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const token = await credential.user.getIdToken();
      const response = await fetch(`${(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "")}/v1/me/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Your account was created, but its role could not be saved.");
      await sendEmailVerification(credential.user);
      return credential;
    },
    signOut: () => auth ? signOut(auth) : Promise.resolve(),
  }), [user, loading]);

  return <PlayerAuthContext.Provider value={value}>{children}</PlayerAuthContext.Provider>;
}

export function usePlayerAuth() {
  const context = useContext(PlayerAuthContext);
  if (!context) throw new Error("usePlayerAuth must be used inside PlayerAuthProvider.");
  return context;
}
