import { useState } from "react";
import { CheckCircle2, LogIn, LogOut, UserRound, X } from "lucide-react";
import { usePlayerAuth } from "../lib/PlayerAuthContext.jsx";

function authErrorMessage(error) {
  if (error?.code === "auth/invalid-credential") return "The email or password is incorrect.";
  if (error?.code === "auth/email-already-in-use") return "An account already exists for this email. Try signing in.";
  if (error?.code === "auth/weak-password") return "Choose a password with at least 6 characters.";
  if (error?.code === "auth/too-many-requests") return "Too many attempts. Please wait a little and try again.";
  if (error?.code === "auth/invalid-email") return "Enter a valid email address.";
  return error?.message || "We couldn't complete that request. Please try again.";
}

export default function PlayerAccount() {
  const { user, ready, signIn, signUp, signOut } = usePlayerAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!ready) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        await signUp(email, password);
        setMessage("Your account is ready. Check your email for a verification message.");
      } else {
        await signIn(email, password);
        setMessage("Signed in. Your cloud progress can now sync on supported puzzles.");
      }
      setPassword("");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setMessage("You have signed out.");
    } catch {
      setError("We couldn't sign you out. Please try again.");
    }
  }

  return (
    <>
      <button className="account-button" onClick={() => { setOpen(true); setError(""); }} aria-haspopup="dialog">
        <UserRound size={15} /> {user ? "My account" : "Sign in"}
      </button>
      {open && <div className="account-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
          <button className="account-close" onClick={() => setOpen(false)} aria-label="Close account panel"><X size={18} /></button>
          <div className="account-dialog-mark"><UserRound size={21} /></div>
          <span className="eyebrow">YOUR IGITI ACCOUNT</span>
          <h2 id="account-title">{user ? "Welcome back." : mode === "signup" ? "Join the journey." : "Keep your progress."}</h2>
          {user ? <>
            <p className="account-copy">Signed in as <strong>{user.email}</strong></p>
            {user.emailVerified ? <p className="account-status"><CheckCircle2 size={16} /> Email verified</p> : <p className="account-status">Check your inbox for an email verification message.</p>}
            {message && <p className="account-message" role="status">{message}</p>}
            {error && <p className="account-error" role="alert">{error}</p>}
            <button className="button button-dark account-wide" onClick={handleSignOut}><LogOut size={16} /> Sign out</button>
            <p className="account-copy account-small">Your browser save remains available even when you sign out.</p>
          </> : <>
            <p className="account-copy">{mode === "signup" ? "Create an account to begin using account-based progress where available." : "Sign in to access account-based progress where available."}</p>
            {error && <p className="account-error" role="alert">{error}</p>}
            {message && <p className="account-message" role="status">{message}</p>}
            <form onSubmit={submit}>
              <label className="account-field">Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label className="account-field">Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              <button className="button button-primary account-wide" type="submit" disabled={busy}><LogIn size={16} /> {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
            </form>
            <button className="account-switch" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setMessage(""); }}>{mode === "signup" ? "Already have an account? Sign in" : "New to Igiti Play? Create an account"}</button>
          </>}
        </section>
      </div>}
    </>
  );
}
