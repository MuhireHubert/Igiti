import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, CalendarDays, Crown, GraduationCap, LifeBuoy, School, ShoppingBag, UserRound, Users } from "lucide-react";
import { getApiBaseUrl, getGames } from "../lib/api.js";
import { deviceHeaders } from "../lib/device.js";
import { cardModes } from "../lib/africaDeck.js";
import "./RoleLocation.css";
import "./RoleCheckout.css";

const roleMeta = {
  PLAYER: { label: "Player", icon: UserRound, copy: "Play games, keep your cloud saves, and manage your own progress." },
  STUDENT: { label: "Student", icon: GraduationCap, copy: "See games assigned directly by your school and complete them at your own pace." },
  TEACHER: { label: "Teacher", icon: GraduationCap, copy: "Use your school’s learning programme without managing student payment or assignments." },
  SCHOOL: { label: "School", icon: School, copy: "Choose a school plan, then assign paid games directly to enrolled students." },
  ADMIN: { label: "Administrator", icon: Crown, copy: "Manage the game collection, players, and operational reports." },
  OWNER: { label: "Platform owner", icon: Crown, copy: "Full control of users, schools, games, country media, settings, and reporting." },
};

const billingCountries = [
  ["DZ", "Algeria"], ["AO", "Angola"], ["BJ", "Benin"], ["BW", "Botswana"], ["BF", "Burkina Faso"], ["BI", "Burundi"], ["CV", "Cabo Verde"], ["CM", "Cameroon"], ["CF", "Central African Republic"], ["TD", "Chad"], ["KM", "Comoros"], ["CD", "Democratic Republic of the Congo"], ["CG", "Republic of the Congo"], ["CI", "Côte d’Ivoire"], ["DJ", "Djibouti"], ["EG", "Egypt"], ["GQ", "Equatorial Guinea"], ["ER", "Eritrea"], ["SZ", "Eswatini"], ["ET", "Ethiopia"], ["GA", "Gabon"], ["GM", "Gambia"], ["GH", "Ghana"], ["GN", "Guinea"], ["GW", "Guinea-Bissau"], ["KE", "Kenya"], ["LS", "Lesotho"], ["LR", "Liberia"], ["LY", "Libya"], ["MG", "Madagascar"], ["MW", "Malawi"], ["ML", "Mali"], ["MR", "Mauritania"], ["MU", "Mauritius"], ["MA", "Morocco"], ["MZ", "Mozambique"], ["NA", "Namibia"], ["NE", "Niger"], ["NG", "Nigeria"], ["RW", "Rwanda"], ["ST", "São Tomé and Príncipe"], ["SN", "Senegal"], ["SC", "Seychelles"], ["SL", "Sierra Leone"], ["SO", "Somalia"], ["ZA", "South Africa"], ["SS", "South Sudan"], ["SD", "Sudan"], ["TZ", "Tanzania"], ["TG", "Togo"], ["TN", "Tunisia"], ["UG", "Uganda"], ["ZM", "Zambia"], ["ZW", "Zimbabwe"],
  ["US", "United States"], ["CA", "Canada"], ["GB", "United Kingdom"], ["FR", "France"], ["DE", "Germany"], ["BE", "Belgium"], ["NL", "Netherlands"], ["AU", "Australia"], ["AE", "United Arab Emirates"], ["SA", "Saudi Arabia"],
];

function accessLabel(resource) {
  if (resource === "plan:user:all") return "Player all-products plan";
  if (resource === "plan:school:all") return "School all-products plan";
  if (resource === "card:all") return "A-54 complete card deck";
  if (resource.startsWith("card-mode:")) return `A-54 mode: ${resource.slice("card-mode:".length).replace(/-/g, " ")}`;
  return resource.startsWith("puzzle:") ? "Purchased puzzle" : resource;
}

function expiryLabel(expiresAt) {
  return expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}` : "No expiry recorded";
}

function priceLabel(amountMinor, currency) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amountMinor || 0) / 100); }
  catch { return `${(Number(amountMinor || 0) / 100).toFixed(2)} ${currency}`; }
}

async function playerRequest(path, token, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}/v1/me${path}`, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...deviceHeaders(), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "We couldn't load your workspace.");
  return payload.data;
}

async function checkoutRequest(path, token, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...deviceHeaders(), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "We couldn't start checkout.");
  return payload.data;
}

// The portal renders account settings and learning assignments as separate
// destinations. Keeping the data client shared avoids two slightly different
// implementations of the same entitlement and membership rules.
export default function RoleWorkspace({ user, onOpenAdmin, view = "all" }) {
  const [workspace, setWorkspace] = useState(null);
  const [games, setGames] = useState([]);
  const [assignmentTarget, setAssignmentTarget] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [offers, setOffers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [schoolName, setSchoolName] = useState("");
  const [schoolInviteForm, setSchoolInviteForm] = useState({ firstName: "", lastName: "", email: "", role: "STUDENT" });
  const [schoolInviteLink, setSchoolInviteLink] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [entitlements, setEntitlements] = useState([]);
  const [checkout, setCheckout] = useState({ configured: false, environment: "sandbox" });
  const [purchasing, setPurchasing] = useState("");
  const [recurringOffers, setRecurringOffers] = useState({});
  const [billingCountry, setBillingCountry] = useState("RW");
  const [geoProof, setGeoProof] = useState(null);
  const [schoolDemo, setSchoolDemo] = useState(null);
  const [checkoutCustomer, setCheckoutCustomer] = useState({ fullName: "", email: user?.email || "", phone: "", addressLine1: "", city: "", state: "", postalCode: "" });
  const [state, setState] = useState({ loading: true, error: "", message: "" });

  async function refresh() {
    setState({ loading: true, error: "", message: "" });
    try {
      const token = await user.getIdToken();
      const geoResponse = await fetch("/api/geo", { cache: "no-store" });
      const geo = await geoResponse.json().catch(() => ({}));
      if (!geoResponse.ok || !geo.country || !geo.signature || !geo.issuedAt) throw new Error(geo.error || "We could not securely determine your location for pricing.");
      const [data, collection, offerResponse, checkoutResponse, accessList, schoolList, demoStatus] = await Promise.all([
        playerRequest("/workspace", token), getGames(),
        fetch(`${getApiBaseUrl()}/v1/offers?country=${encodeURIComponent(geo.country)}`, { headers: { Accept: "application/json" } }).then((response) => response.json()),
        fetch(`${getApiBaseUrl()}/v1/checkout/status`, { headers: { Accept: "application/json" } }).then((response) => response.json()),
        playerRequest("/entitlements", token),
        fetch(`${getApiBaseUrl()}/v1/schools`, { headers: { Accept: "application/json" } }).then((response) => response.json()),
        playerRequest("/school-demo", token),
      ]);
      setWorkspace(data);
      setOffers(offerResponse.data || []);
      setEntitlements(accessList || []);
      setSchools(schoolList.data || []);
      setSchoolDemo(demoStatus?.demo ? { ...demoStatus.demo, school: demoStatus.school } : null);
      setCheckout(checkoutResponse.data || { configured: false, environment: "sandbox" });
      setBillingCountry(geo.country);
      setGeoProof(geo);
      // Assignments reference the server Game id, not the built-in preview
      // card game (which intentionally has no database record yet).
      setGames(collection.data.filter((game) => game.gameId));
    } catch (error) {
      setState({ loading: false, error: error.message, message: "" });
      return;
    }
    setState({ loading: false, error: "", message: "" });
  }

  useEffect(() => { refresh(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user?.email) setCheckoutCustomer((current) => ({ ...current, email: current.email || user.email }));
  }, [user?.email]);

  async function assign(event) {
    event.preventDefault();
    setState((current) => ({ ...current, error: "", message: "" }));
    try {
      const token = await user.getIdToken();
      const due = dueAt ? new Date(dueAt).toISOString() : undefined;
      if (assignmentTarget.startsWith("card:")) {
        await playerRequest("/resource-assignments", token, { method: "POST", body: JSON.stringify({ resource: `card-mode:${assignmentTarget.slice("card:".length)}`, recipientId, dueAt: due }) });
      } else {
        await playerRequest("/assignments", token, { method: "POST", body: JSON.stringify({ gameId: assignmentTarget.slice("game:".length), recipientId, dueAt: due }) });
      }
      setAssignmentTarget(""); setRecipientId(""); setDueAt("");
      await refresh();
      setState({ loading: false, error: "", message: "Game assigned." });
    } catch (error) { setState({ loading: false, error: error.message, message: "" }); }
  }

  async function beginCheckout(offer) {
    setPurchasing(offer.key);
    setState((current) => ({ ...current, error: "", message: "" }));
    try {
      const token = await user.getIdToken();
      if (!geoProof) throw new Error("Secure location pricing is still loading. Please try again in a moment.");
      const order = await checkoutRequest("/v1/checkout/orders", token, { method: "POST", body: JSON.stringify({ offerKey: offer.key, recurringConsent: Boolean(recurringOffers[offer.key]), geoCountry: geoProof.country, geoIssuedAt: geoProof.issuedAt, geoSignature: geoProof.signature, customer: checkoutCustomer }) });
      window.location.assign(order.redirectUrl);
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, message: "" }));
      setPurchasing("");
    }
  }

  async function saveSchool(event) {
    event.preventDefault();
    try { const token = await user.getIdToken(); await playerRequest("/school", token, { method: "PUT", body: JSON.stringify({ name: schoolName }) }); setState((current) => ({ ...current, message: "School workspace saved." })); await refresh(); } catch (error) { setState((current) => ({ ...current, error: error.message })); }
  }

  async function chooseSchool(event) {
    event.preventDefault();
    try { const token = await user.getIdToken(); const membership = await playerRequest("/school-membership", token, { method: "PUT", body: JSON.stringify({ schoolId: selectedSchoolId }) }); setState((current) => ({ ...current, message: membership.pending ? "Your school request has been sent. You can access its learning programme once the school approves it." : "School membership saved." })); await refresh(); } catch (error) { setState((current) => ({ ...current, error: error.message })); }
  }

  async function manageSchoolMember(membershipId, action) {
    setState((current) => ({ ...current, error: "", message: "" }));
    try {
      const token = await user.getIdToken();
      await playerRequest(`/school-members/${membershipId}`, token, { method: "PATCH", body: JSON.stringify({ action }) });
      await refresh();
      setState({ loading: false, error: "", message: action === "approve" ? "Member approved." : "Member access revoked." });
    } catch (error) { setState((current) => ({ ...current, error: error.message })); }
  }

  async function createSchoolInvite(event) {
    event.preventDefault();
    setState((current) => ({ ...current, error: "", message: "" }));
    try {
      const token = await user.getIdToken();
      const invite = await playerRequest("/school-invites", token, { method: "POST", body: JSON.stringify(schoolInviteForm) });
      const link = `${window.location.origin}/?invite=${encodeURIComponent(invite.token)}`;
      setSchoolInviteLink(link);
      setSchoolInviteForm({ firstName: "", lastName: "", email: "", role: "STUDENT" });
      setState({ loading: false, error: "", message: `Private ${invite.role.toLowerCase()} invitation created for ${invite.email}. It expires ${new Date(invite.expiresAt).toLocaleDateString()}.` });
    } catch (error) { setState((current) => ({ ...current, error: error.message })); }
  }

  if (state.loading) return <p className="role-workspace-loading">Loading your workspace…</p>;
  if (state.error) return <p className="account-error">{state.error}</p>;
  const meta = roleMeta[workspace?.role] || roleMeta.PLAYER;
  const Icon = meta.icon;
  const canAssign = workspace?.role === "SCHOOL";
  const isAdmin = ["ADMIN", "OWNER", "CONTENT_MANAGER", "MODERATOR"].includes(workspace?.role);
  const isSchool = workspace?.role === "SCHOOL";
  const isIndividual = workspace?.role === "PLAYER";
  const showSettings = view !== "assignments";
  const showAssignments = view !== "settings";
  const unlockedResources = new Set(entitlements.map((entitlement) => entitlement.resource));
  const activeOfferKeys = new Set(entitlements.map((entitlement) => entitlement.offerKey).filter(Boolean));
  const hasCataloguePlan = unlockedResources.has(isSchool ? "plan:school:all" : "plan:user:all");
  const visibleOffers = offers.filter((offer) => {
    if (!["MONTHLY", "YEARLY"].includes(offer.interval)) return false;
    if (isSchool) return offer.resource === "plan:school:all" || offer.kind === "GAME";
    if (isIndividual) return offer.resource !== "plan:school:all";
    return false;
  }).sort((left, right) => Number(right.kind === "ACCOUNT") - Number(left.kind === "ACCOUNT") || Number(left.amountMinor) - Number(right.amountMinor));

  return <section className="role-workspace" aria-label={`${meta.label} workspace`}>
    <div className="role-workspace-head"><span><Icon size={16} /></span><div><strong>{meta.label} workspace</strong><small>{meta.copy}</small></div></div>
    {showSettings && geoProof && <p className="role-location-notice">Pricing is based on your detected network location: <strong>{billingCountry}</strong>. Location is locked at checkout.</p>}
    {showSettings && schoolDemo && <section className="role-demo-notice"><strong>Demo access</strong><span>{schoolDemo.school?.name || "Your school"} has administrator-approved demo access to {schoolDemo.title}.{schoolDemo.expiresAt ? ` It ends ${new Date(schoolDemo.expiresAt).toLocaleDateString()}.` : ""}</span></section>}
    {showSettings && visibleOffers.length > 0 && <section className="role-checkout-details" aria-label="Required checkout details"><strong>Checkout details</strong><small>These details are required before we can open secure Pesapal checkout.</small><div className="role-checkout-details-grid"><label className="account-field">Full legal name<input value={checkoutCustomer.fullName} onChange={(event) => setCheckoutCustomer((current) => ({ ...current, fullName: event.target.value }))} placeholder="First and last name" required minLength={2} autoComplete="name" /></label><label className="account-field">Email<input type="email" value={checkoutCustomer.email} onChange={(event) => setCheckoutCustomer((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" required autoComplete="email" /></label><label className="account-field">Phone number<input type="tel" value={checkoutCustomer.phone} onChange={(event) => setCheckoutCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="+250 7xx xxx xxx" required minLength={7} autoComplete="tel" /></label><label className="account-field">Street address<input value={checkoutCustomer.addressLine1} onChange={(event) => setCheckoutCustomer((current) => ({ ...current, addressLine1: event.target.value }))} placeholder="Street and building" required minLength={3} autoComplete="street-address" /></label><label className="account-field">City<input value={checkoutCustomer.city} onChange={(event) => setCheckoutCustomer((current) => ({ ...current, city: event.target.value }))} placeholder="City" required minLength={2} autoComplete="address-level2" /></label><label className="account-field">State / province<input value={checkoutCustomer.state} onChange={(event) => setCheckoutCustomer((current) => ({ ...current, state: event.target.value }))} placeholder="State or province" required minLength={2} autoComplete="address-level1" /></label><label className="account-field">Postal code<input value={checkoutCustomer.postalCode} onChange={(event) => setCheckoutCustomer((current) => ({ ...current, postalCode: event.target.value }))} placeholder="Postal code" required minLength={2} autoComplete="postal-code" /></label></div></section>}
    {showSettings && isAdmin && <button className="button button-dark account-wide" onClick={onOpenAdmin}><Crown size={15} /> Open control room</button>}
    {showSettings && workspace?.role === "SCHOOL" && !workspace.school && <form className="role-assignment-form" onSubmit={saveSchool}><strong>Create your school workspace</strong><small>Students select this school in their settings. Once your school plan is active, you can assign games directly to them.</small><label className="account-field">School name<input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} required minLength={2} /></label><button className="button button-primary account-wide">Create school</button></form>}
    {showSettings && ["TEACHER", "STUDENT"].includes(workspace?.role) && <form className="role-assignment-form" onSubmit={chooseSchool}><strong>{workspace.school ? `School: ${workspace.school.name}` : "Choose your school"}</strong><small>Choose the school you belong to. The school owner must approve your request before its learning programme and assignments become active.</small><label className="account-field">School<select value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)} required><option value="">Choose a school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label><button className="button button-primary account-wide" disabled={!selectedSchoolId}>Request school approval</button></form>}
    {showSettings && isSchool && workspace.school && <form className="role-assignment-form" onSubmit={createSchoolInvite}><strong><Users size={15} /> Invite a teacher or student</strong><small>Create a private enrolment link. The recipient creates their own account and password with this email; joining through this link is automatically approved.</small><div className="account-name-grid"><label className="account-field">First name<input value={schoolInviteForm.firstName} onChange={(event) => setSchoolInviteForm((current) => ({ ...current, firstName: event.target.value }))} required /></label><label className="account-field">Last name<input value={schoolInviteForm.lastName} onChange={(event) => setSchoolInviteForm((current) => ({ ...current, lastName: event.target.value }))} required /></label></div><label className="account-field">Email address<input type="email" value={schoolInviteForm.email} onChange={(event) => setSchoolInviteForm((current) => ({ ...current, email: event.target.value }))} required /></label><label className="account-field">School role<select value={schoolInviteForm.role} onChange={(event) => setSchoolInviteForm((current) => ({ ...current, role: event.target.value }))}><option value="STUDENT">Student</option><option value="TEACHER">Teacher</option></select></label><button className="button button-primary account-wide">Create private invitation</button>{schoolInviteLink && <div className="role-invite-result"><strong>Invitation ready</strong><a href={schoolInviteLink}>{schoolInviteLink}</a><div><button type="button" className="button button-outline" onClick={() => navigator.clipboard?.writeText(schoolInviteLink)}>Copy link</button><a className="button button-outline" href={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(schoolInviteLink)}`} target="_blank" rel="noreferrer">Open QR code</a></div></div>}</form>}
    {showSettings && isSchool && workspace.school && <section className="role-member-management" aria-label="School member management"><strong><Users size={15} /> School members</strong><small>Review people who selected your school. Only approved members can receive school games or use school access.</small>{(workspace.members || []).length ? <div className="role-member-list">{workspace.members.map((member) => <article key={member.id}><div><b>{member.player.displayName || "Unnamed account"}</b><small>{member.role.toLowerCase()} · {member.approvedAt ? "Approved" : `Requested ${new Date(member.createdAt).toLocaleDateString()}`}</small></div><span>{member.approvedAt ? "Active" : "Pending"}</span><div>{!member.approvedAt && <button className="button button-primary" onClick={() => manageSchoolMember(member.id, "approve")}>Approve</button>}<button className="role-member-revoke" onClick={() => manageSchoolMember(member.id, "revoke")}>{member.approvedAt ? "Revoke" : "Decline"}</button></div></article>)}</div> : <p className="account-copy">No teachers or students have requested to join this school yet.</p>}</section>}
    {showAssignments && canAssign && <form className="role-assignment-form" onSubmit={assign}>
      <strong>Assign a game directly to a student</strong>
      <small>{workspace.school ? `${workspace.school.name} · ${workspace.recipients.length} eligible recipient(s)` : "Open Settings to choose your school first."}</small>
      <label className="account-field">Recipient<select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} required><option value="">Choose a recipient</option>{workspace.recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.displayName || "Unnamed account"}</option>)}</select></label>
      <label className="account-field">Learning content<select value={assignmentTarget} onChange={(event) => setAssignmentTarget(event.target.value)} required><option value="">Choose a puzzle game or A-54 card mode</option><optgroup label="Published puzzle games">{games.map((game) => <option key={game.id} value={`game:${game.gameId || game.id}`}>{game.title}</option>)}</optgroup><optgroup label="A-54 card modes">{cardModes.map((mode) => <option key={mode.id} value={`card:${mode.id}`}>A-54 · {mode.title}</option>)}</optgroup></select></label>
      <label className="account-field">Due date <small>(optional)</small><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
      <button className="button button-primary account-wide" disabled={!workspace.recipients.length}><BookOpenCheck size={15} /> Assign game</button>
    </form>}
    {showAssignments && workspace?.assignments?.length > 0 && <div className="role-assignments"><strong>My assigned games</strong>{workspace.assignments.map((assignment) => <article key={assignment.id}>{assignment.game ? <img src={assignment.game.coverImage} alt="" /> : <span className="role-card-assignment">A‑54</span>}<div><b>{assignment.game?.title || assignment.label || accessLabel(assignment.resource)}</b><small>From {assignment.assignedBy.displayName || assignment.assignedBy.role}{assignment.school?.name ? ` · ${assignment.school.name}` : ""}{assignment.dueAt ? ` · due ${new Date(assignment.dueAt).toLocaleDateString()}` : ""}</small></div><ArrowRight size={15} /></article>)}</div>}
    {showAssignments && workspace?.workspace === "STUDENT" && !workspace.assignments?.length && <p className="account-copy">No games have been assigned yet. Your school account can add one directly after its plan is active.</p>}
    {showSettings && visibleOffers.length > 0 && <div className="role-offers"><strong><ShoppingBag size={15} /> {isSchool ? "Choose a school plan or game subscription" : "Choose your access"}</strong><small>{checkout.configured ? `Secure Pesapal checkout (${checkout.environment}). Access is enabled only after Pesapal verifies payment.` : "Payments are being configured. Prices are shown, but checkout is not available yet."}</small><label className="account-field"><span>Billing country</span><select value={billingCountry} onChange={(event) => setBillingCountry(event.target.value)}>{billingCountries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select><small>Africa pricing is applied when your billing country is in Africa. Pesapal receives this billing country with the order.</small></label>{visibleOffers.map((offer) => { const unlocked = unlockedResources.has(offer.resource) && (offer.kind !== "ACCOUNT" || activeOfferKeys.has(offer.key)) || (offer.kind === "GAME" && hasCataloguePlan) || isAdmin; const isSubscription = ["MONTHLY", "YEARLY"].includes(offer.interval); return <article key={offer.key} className={offer.kind === "ACCOUNT" ? "role-offer-plan" : ""}><div><b>{offer.title}</b><small>{offer.description || `${offer.kind === "GAME" ? "Game" : "Account"} access`} · {offer.interval.replace("_", " ")}{offer.seatLimit ? ` · up to ${offer.seatLimit} teachers and students` : ""}</small>{isSubscription && !unlocked && <label className="role-recurring-consent"><input type="checkbox" checked={Boolean(recurringOffers[offer.key])} onChange={(event) => setRecurringOffers((current) => ({ ...current, [offer.key]: event.target.checked }))} /> Allow recurring payments. Pesapal confirms this during checkout; you can cancel through Pesapal.</label>}</div><button className="button button-primary" disabled={unlocked || !checkout.configured || purchasing === offer.key} onClick={() => beginCheckout(offer)}>{unlocked ? "Included in your active plan" : purchasing === offer.key ? "Opening secure checkout…" : `Pay securely · ${priceLabel(offer.amountMinor, offer.currency)}`}</button></article>; })}</div>}
    {showSettings && ["STUDENT", "TEACHER"].includes(workspace?.role) && <p className="account-copy">Your school manages paid access and sends games directly to students. You never need to complete a school checkout or pass assignments through a teacher.</p>}
    {showSettings && <section className="role-account-settings" aria-label="Account and access settings"><strong><CalendarDays size={15} /> Account & access</strong><small>Activate an available plan above, review your verified access, and check renewal dates here.</small>{entitlements.length ? <div className="role-entitlement-list">{entitlements.map((entitlement) => <article key={`${entitlement.resource}-${entitlement.orderId || "manual"}`}><div><b>{accessLabel(entitlement.resource)}</b><small>{expiryLabel(entitlement.expiresAt)}</small></div><span>Active</span></article>)}</div> : <p>No paid access is active on this account yet.</p>}<a className="role-support-link" href="https://igiti.africa/contact"><LifeBuoy size={15} /> Contact Igiti support</a></section>}
    {state.message && <p className="account-message">{state.message}</p>}
  </section>;
}
