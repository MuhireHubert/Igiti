# Legacy Game Audit — Igiti

**Status:** Initial source-code review  
**Reviewed:** `main:index.html`  
**Source:** https://github.com/MuhireHubert/Igiti/blob/main/index.html  
**Scope:** Read-only review of the legacy game entry point. No production code, Firebase data, or DNS settings changed.

## Executive summary

The legacy application is a single-page HTML/CSS/JavaScript application of approximately 290 KB and 4,221 lines. It includes the puzzle-playing interface, account flows, Firebase integration, school features, user progress, access requests, card-set navigation, and a multi-tab admin dashboard.

The new platform must not replace the legacy entry point until the replacement puzzle engine and the account/data flows have been tested against representative existing content. The safest migration is incremental: first record current behaviour and data shape, then build and test adapters, and only then migrate a feature at a time.

## Feature inventory

| Capability | Evidence in legacy source | Migration decision |
|---|---|---|
| Puzzle play and canvas | `#pz-canvas`, `#ref-canvas`, puzzle progress/completion UI | Preserve; migrate only after parity tests |
| Hints and zoom/pan | Hint controls and zoom state/functions | Preserve; verify mouse, touch and keyboard behaviour |
| Puzzle catalogue and images | Firestore `puzzles` and `puzzleImages` reads | Preserve data and IDs; document image format/size |
| Educational facts | Global facts and puzzle-specific facts | Preserve; separate content from rendering |
| Authentication | Firebase email/password auth and session restoration | Keep Firebase initially unless a deliberate migration plan is approved |
| User profiles and progress | Firestore `users`, progress counters | Preserve progress; define stable user IDs before changing schema |
| School accounts and assignments | School code lookup, school account/admin controls | Preserve; test school-specific permissions and assignment flows |
| Admin operations | Analytics, puzzles, card sets, users, access, notifications and requests | Rebuild as protected admin routes; do not rely on hidden buttons for security |
| Access requests | `accessRequests` collection, approval/denial flows | Preserve status and audit trail; enforce authorization server-side/rules-side |
| Plan/configuration | Firestore `config/plans` and user plan fields | Preserve behaviour, but make plan entitlement checks authoritative |
| Card games | Card-set admin section and navigation | Inspect and test as a separate game module before migration |

## Priority findings

### P0 — Verify and correct administrator authorization before launch

At approximately line 1472, the sign-in flow contains a fallback that treats an account as an administrator if its email is `admin@igiti.africa` **or ends with `@igiti.africa`**, when a Firestore profile is missing. This is a client-side role assignment and must not be used as the source of truth for privileged access.

**Required action:** remove the domain-wide administrator fallback in a controlled security patch. Grant administrator status only through a trusted, explicit allowlist/custom claim or a server-controlled role record. Verify Firestore rules prevent users from creating or changing their own role, plan, school association, or other privileged fields. Test with ordinary users and school users before release.

This source review alone does not establish whether an unauthorised user can currently exploit the issue; the effective risk depends on Firebase Auth configuration and deployed Firestore Security Rules. Treat it as a release-blocking authorization check until verified.

### P0 — Review Firestore rules; client comments are not a security policy

The source contains error messages suggesting broad rules such as allowing writes to puzzles and users whenever `request.auth != null` (around lines 1213, 1356, 2945–2946, and 3654). These are comments/error hints in the client, not proof of the currently deployed rules. If equivalent broad rules are deployed, any signed-in account may be able to alter records beyond its intended permissions.

**Required action:** inspect the actual Firebase project rules and emulator-test them. Enforce least privilege by collection and operation:
- Public/anonymous reads only for content intended to be public.
- Puzzle creation, updates and deletion only for explicit administrators.
- Users can read/update only their own permitted profile fields.
- Role, plan, school assignment, approvals and platform configuration changes are privileged operations.
- Access requests can be submitted by the requester, but only authorized staff can approve or deny them.
- Notifications and analytics should expose only the minimum data needed by each role.

Do not deploy permissive rules copied from inline error messages.

### P1 — Prevent destructive admin actions from becoming routine migration hazards

The source includes an admin function that batches deletion of all puzzle documents (`adminWipeAllPuzzles`, around line 3574) and a “Wipe all” UI action. Keep this away from ordinary admin workflows, require explicit confirmation and preferably a server-side privileged operation with audit logging and recovery/backup procedures. Confirm image assets and related records are handled consistently.

### P1 — Establish a data contract before changing storage

The app reads and writes these observed Firestore collections/documents:
- `puzzles`
- `puzzleImages`
- `users` (currently keyed by email in several paths)
- `notifications`
- `accessRequests`
- `schools` (referenced by school workflows)
- `config/plans`

This is an initial list from the inspected source, not a claim that it covers every collection used in all flows. Before database migration, inventory every collection, field, document ID pattern, image representation, and read/write path. Email is mutable and should not become the long-term cross-system primary key; map Firebase UIDs to stable platform IDs without losing existing profiles.

### P1 — Keep puzzle mechanics testable and independent of account/admin UI

The puzzle canvas, hint counter, zoom/pan state, completion state and content loading are interwoven with the main script. Move the game engine into a module only after recording its inputs and outputs. Avoid changing piece geometry or scoring while merely restructuring code.

### P2 — Separate concerns into routes/modules

Recommended eventual separation:
- Public catalogue and game instructions
- Puzzle game runtime
- Card-game runtime
- Player profile and progress
- School workspace
- Admin workspace
- Shared authentication/session layer
- API/data-access layer

Use route-level access checks plus server/database authorization. Hiding a tab is a user-interface choice, not a permission boundary.

## Regression checklist before switching any user-facing feature

### Puzzle engine
- [ ] Existing puzzle images load from current records.
- [ ] Each supported piece count/layout can be started.
- [ ] Pieces can be selected, dragged and placed accurately.
- [ ] Snapping works at normal and zoomed scales.
- [ ] Zoom and pan work on desktop and touch screens.
- [ ] Hint action highlights a valid unplaced piece and increments the counter correctly.
- [ ] Progress percentage and piece count remain correct after each placement.
- [ ] Completion is triggered exactly once and shows the correct facts/hints.
- [ ] Restart/new puzzle resets state without corrupting the previous record.
- [ ] Slow network, failed image, empty catalogue and interrupted session have clear recovery states.

### Identity, progress and school flows
- [ ] Sign-up, sign-in, sign-out and session restoration work.
- [ ] Ordinary users cannot gain administrator privileges by email pattern or editing client state.
- [ ] Users cannot read or overwrite another user's profile/progress.
- [ ] School code validation and school assignment work as intended.
- [ ] Access request submission, approval and denial work with correct role checks.
- [ ] Plan entitlements are validated by trusted rules/API, not only UI state.

### Admin and content operations
- [ ] Authorized admin can publish, edit and retire a puzzle.
- [ ] Non-admin users cannot publish, edit, delete or assign content.
- [ ] Destructive operations require strong confirmation and are logged.
- [ ] Notifications, card sets, user management and analytics are checked individually.
- [ ] Existing records and image references remain intact after changes.

### Devices and accessibility
- [ ] Desktop Chrome and a mobile browser are tested.
- [ ] Touch dragging is reliable and does not scroll the page unexpectedly.
- [ ] Buttons have clear focus/disabled/loading states.
- [ ] Errors are understandable and do not expose private data or implementation secrets.

## Safe next implementation sequence

1. Review the deployed Firebase Security Rules and Authentication user/role setup. Do not change production rules without a tested rollback plan.
2. Add a non-production Firebase project or emulator test suite for security-rule validation.
3. Capture representative, non-sensitive sample records and puzzle images; never commit credentials or production user data.
4. Build the puzzle engine regression checklist and test fixture set.
5. Migrate one slice at a time behind the new routes; keep the legacy entry point unchanged until acceptance tests pass.
6. Add an explicit compatibility layer for Firebase data while the new API is staged.
7. Only after tests and backups pass, plan any production data migration and subdomain cutover.

## Limits of this audit

This is a source-code inspection of `index.html` on `main`. It does not inspect deployed Firebase Security Rules, live data, Firebase Console settings, every referenced asset, or the full behaviour of every admin/card-game function. The next security step is to verify the deployed rules and role claims in a safe test environment.
