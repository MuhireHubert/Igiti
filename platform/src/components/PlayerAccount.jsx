import { useEffect, useState } from "react";
import "./PlayerAccount.css";
import { CheckCircle2, LogIn, LogOut, UserRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const { user, ready, signIn, signUp, signOut, resetPassword, acceptSchoolInvite } = usePlayerAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PLAYER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [invite, setInvite] = useState(null);
  const inviteToken = new URLSearchParams(window.location.search).get("invite");

  useEffect(() => {
    if (!inviteToken) return undefined;
    const controller = new AbortController();
    fetch(`${(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "")}/v1/school-invites/${encodeURIComponent(inviteToken)}`, { signal: controller.signal })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => { if (response.ok) { setInvite(payload.data); setRole(payload.data.role); setFirstName((current) => current || payload.data.firstName || ""); } else setError(payload.error || "This school invitation is no longer available."); })
      .catch(() => { if (!controller.signal.aborted) setError("We could not check this school invitation."); });
    return () => controller.abort();
  }, [inviteToken]);

  if (!ready) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        await signUp(email, password, role, firstName, lastName, inviteToken);
        setMessage(invite ? `Your account is ready and you are enrolled with ${invite.schoolName}. Check your email for verification.` : "Your account is ready. Check your email for a verification message, then sign in again.");
      } else {
        await signIn(email, password);
        if (inviteToken) await acceptSchoolInvite(inviteToken);
        setOpen(false);
        navigate("/settings");
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
      setConfirmingSignOut(false);
      setOpen(false);
    } catch {
      setError("We couldn't sign you out. Please try again.");
    }
  }

  async function handlePasswordReset() {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Enter your email address first, then choose Forgot password.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email);
      setMessage("If an Igiti account exists for that email, a secure password-reset link has been sent.");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="account-button" onClick={() => { setOpen(true); setError(""); setMessage(""); }} aria-haspopup="dialog">
        <UserRound size={15} /> {user ? "Account" : "Sign in"}
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
            <button className="button button-primary account-wide" onClick={() => { setOpen(false); navigate("/settings"); }}>Account settings & plans</button>
            {confirmingSignOut ? <div className="account-signout-confirm"><p>Sign out of Igiti Play on this device?</p><div><button className="button button-dark" onClick={handleSignOut}><LogOut size={16} /> Yes, sign out</button><button className="button button-outline" onClick={() => setConfirmingSignOut(false)}>Stay signed in</button></div></div> : <button className="account-signout-link" onClick={() => setConfirmingSignOut(true)}><LogOut size={15} /> Sign out securely</button>}
            <p className="account-copy account-small">Your browser save remains available even when you sign out.</p>
          </> : <>
            <p className="account-copy">{invite ? `You have been invited to join ${invite.schoolName} as a ${invite.role.toLowerCase()}. Create an account with the invited email and choose your own password.` : mode === "signup" ? "Choose the workspace that fits you. Platform administration is assigned only by the platform owner." : "Sign in to access account-based progress where available."}</p>
            {error && <p className="account-error" role="alert">{error}</p>}
            {message && <p className="account-message" role="status">{message}</p>}
            <form onSubmit={submit}>
              {mode === "signup" && <div className="account-name-grid"><label className="account-field">First name<input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label><label className="account-field">Last name<input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label></div>}
              <label className="account-field">Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label className="account-field">Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              {mode === "signup" && <label className="account-field">I am joining as<select value={role} onChange={(event) => setRole(event.target.value)} disabled={Boolean(invite)}><option value="PLAYER">Player — play and save my progress</option><option value="STUDENT">Student — receive learning game assignments</option><option value="TEACHER">Teacher — assign games when linked to a school</option><option value="SCHOOL">School — manage a school programme</option></select><small>{invite ? "This role is set by the school invitation." : "After joining, schools create their workspace and teachers or students select their school in Account Settings."}</small></label>}
              <button className="button button-primary account-wide" type="submit" disabled={busy}><LogIn size={16} /> {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
            </form>
            {mode === "signin" && <button className="account-switch account-reset-link" type="button" onClick={handlePasswordReset} disabled={busy}>Forgot password? Send a secure reset link</button>}
            <button className="account-switch" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setMessage(""); }}>{mode === "signup" ? "Already have an account? Sign in" : "New to Igiti Play? Create an account"}</button>
          </>}
        </section>
      </div>}
    </>
  );
}
