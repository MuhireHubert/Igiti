import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, GraduationCap, School, Sparkles, Target, UserRound } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { usePlayerAuth } from "../lib/PlayerAuthContext.jsx";
import { getApiBaseUrl } from "../lib/api.js";
import RoleWorkspace from "../components/RoleWorkspace.jsx";
import "./RolePortal.css";

async function workspaceRequest(user) {
  const token = await user.getIdToken();
  const response = await fetch(`${getApiBaseUrl()}/v1/me/workspace`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "We couldn't load your role workspace.");
  return payload.data;
}

const copy = {
  PLAYER: { label: "Player lounge", detail: "Your personal place for saved games, new challenges, and account access.", icon: UserRound },
  STUDENT: { label: "Student desk", detail: "Your teacher-assigned learning games and progress live here.", icon: GraduationCap },
  TEACHER: { label: "Teacher studio", detail: "Assign published games, guide learners, and track their learning path.", icon: GraduationCap },
  SCHOOL: { label: "School hub", detail: "Coordinate teachers, distribute games, and manage your school programme.", icon: School },
};

function AssignmentList({ assignments = [] }) {
  if (!assignments.length) return <p className="portal-empty">Nothing has been assigned yet. Your teacher will add games here.</p>;
  return <div className="portal-assignment-list">{assignments.map((assignment) => <article key={assignment.id}><img src={assignment.game.coverImage} alt="" /><div><strong>{assignment.game.title}</strong><small>From {assignment.assignedBy.displayName || assignment.assignedBy.role}{assignment.dueAt ? ` · due ${new Date(assignment.dueAt).toLocaleDateString()}` : ""}</small></div><Link to={`/games/${assignment.game.id}`} aria-label={`Open ${assignment.game.title}`}><ArrowRight size={17} /></Link></article>)}</div>;
}

export default function RolePortal() {
  const { user, ready } = usePlayerAuth();
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    workspaceRequest(user).then((data) => { if (active) setWorkspace(data); }).catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [user]);

  if (!ready) return <main className="role-portal-loading">Preparing your portal…</main>;
  if (!user) return <Navigate to="/" replace />;
  if (error) return <main className="role-portal-error"><h1>Your portal is unavailable</h1><p>{error}</p><Link to="/">Return to Igiti Play</Link></main>;
  if (!workspace) return <main className="role-portal-loading">Opening your role workspace…</main>;
  if (["ADMIN", "OWNER", "CONTENT_MANAGER", "MODERATOR"].includes(workspace.role)) return <Navigate to="/admin" replace />;

  const meta = copy[workspace.role] || copy.PLAYER;
  const Icon = meta.icon;
  const assignedCount = workspace.assignments?.length || 0;
  return <main className="role-portal">
    <header className="role-portal-header"><Link to="/" className="role-portal-back"><ArrowLeft size={16} /> Igiti Play</Link><div className="role-portal-profile"><span className="role-portal-live"><i /> LIVE</span><span>{workspace.role}</span></div></header>
    <section className="role-portal-hero"><div className="role-portal-icon"><Icon size={26} /></div><div><span className="portal-kicker"><Sparkles size={14} /> YOUR IGITI SPACE</span><h1>{meta.label}</h1><p>{meta.detail}</p><div className="portal-signal-row"><span><CheckCircle2 size={15} /> Verified account</span><span><Target size={15} /> {workspace.role === "STUDENT" ? `${assignedCount} assigned game${assignedCount === 1 ? "" : "s"}` : "Role-based access"}</span></div></div><div className="role-portal-orbit" aria-hidden="true"><span>IGITI</span><i /><b /></div></section>

    {workspace.role === "PLAYER" && <section className="role-portal-card"><div><span className="portal-kicker">PERSONAL PLAY</span><h2>Choose your next challenge.</h2><p>Browse the game library, return to saved progress, and unlock access when new paid games are published.</p></div><Link className="portal-primary" to="/games">Browse games <ArrowRight size={16} /></Link></section>}

    {workspace.role === "STUDENT" && <section className="role-portal-card role-portal-card-stack"><div><span className="portal-kicker">ASSIGNED TO ME</span><h2>My learning games</h2></div><AssignmentList assignments={workspace.assignments} /></section>}

    {["TEACHER", "SCHOOL"].includes(workspace.role) && <section className="role-portal-card role-portal-card-stack"><div><span className="portal-kicker">{workspace.role === "TEACHER" ? "CLASSROOM" : "SCHOOL PROGRAMME"}</span><h2>{workspace.role === "TEACHER" ? "Assign games to your students" : "Assign games to your teachers"}</h2><p>{workspace.school ? `${workspace.school.name} is connected to this workspace.` : "The platform owner must finish your school membership before assignments can be sent."}</p></div><RoleWorkspace user={user} onOpenAdmin={() => { window.location.assign("/admin"); }} /></section>}

    <footer className="role-portal-footer"><BookOpenCheck size={17} /> Your role controls what you can see and do. Need a role change? Ask the platform owner.</footer>
  </main>;
}
