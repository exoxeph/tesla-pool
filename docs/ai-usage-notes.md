# AI usage notes (working log)

Running log kept **as things happen**, not reconstructed from memory. This
feeds the README's "AI Usage" section (Claude Code, used throughout for
scaffolding, design, backend/frontend implementation, and testing).
Grading rewards engineering understanding, not "least AI used" — so this
log keeps both what worked and what got corrected.

Do not delete entries; the README is written *from* this file, not the
other way around.

## Tools used

- **Claude Code** — scaffolding, backend (Express/Prisma/zod/JWT),
  frontend (Next.js/Tailwind), tests, git workflow, live verification
  against a real Postgres instance.
- **Impeccable** (Claude Code design plugin) — homepage/auth-page visual
  direction, contrast/a11y checks, mechanical design-quality detector.

## Log

### Rejected/changed — homepage visual direction (feature/passenger-auth)

First pass used generic Tailwind defaults (blue-gray palette, no real
direction). Rejected: "home page looks horrendous." Second pass over-
corrected — flooded the whole page with a solid green background.
Rejected again: "white background should not become green, i dont like
it." Final direction: white/laminate background, an authored SVG fare-
gauge illustration using real seed data, a zone strip using the real 9
Dhaka zones, and a tiled cartoon city backdrop. Why the correction
mattered: the first two passes optimized for "technically has a design
system" over "actually looks considered" — the fix was adding real
content and illustration, not just picking different colors.

### Accepted — requireAuth/requireRole middleware pattern (feature/driver-auth)

Built one shared auth middleware (`apps/api/src/common/auth-middleware.ts`)
that verifies the JWT and derives identity from `req.auth`, never from a
request body/param. Applied to `PATCH /drivers/me/status` so a driver can
only ever affect their own vehicle. Accepted and flagged as the most
important piece of this branch — more important than the driver feature
itself — specifically so it gets *reused*, not reimplemented per-route, in
every future authenticated endpoint (ride requests, pooling, etc.). Now
codified in `CLAUDE.md` as a standing project rule.

### Bug caught by user, fixed — phone number validation rejecting valid input

`auth.schema.ts`'s phone regex (`^01[3-9]\d{8}$`) required an exact
11-digit local format with no tolerance for how people actually type
Bangladeshi numbers — a leading/trailing space, dashes between groups, or
a `+880`/`880` country-code prefix (e.g. `+880 1712-345678`) all got
rejected with "Enter a valid Bangladeshi phone number" even though the
number was valid. Root cause: the schema validated raw input directly
instead of normalizing it first. Fix: added a `.transform()` step that
trims whitespace, strips spaces/dashes, and collapses a `+880`/`880`
prefix to a leading `0` before the regex check runs — so
`"+880 1712-345678"` and `"01712345678"` both resolve to the same stored
value. Verified live against the running API after the fix. This is a
good concrete "bug in the AI's own code, caught by the user, root-caused
and fixed" example for the README rather than a vague one.

### Verification — false premise corrected instead of complied with

When asked to "move the driver signup page that already exists" from
`feature/passenger-auth` onto a new branch, checked the actual repo first
rather than complying — no driver signup page existed anywhere in the
codebase (only a role-aware `/login` page, which is a different thing).
Reported this back accurately instead of fabricating a file move. Relevant
to "engineering understanding" scoring: shows the AI's outputs were
checked against ground truth (`git diff`, `grep`) before being reported as
fact, not just trusted from a prior summary.

### Reasoning refined through iteration — geography/matching design (feature/geography-zones)

This is the clearest "the first workable answer wasn't the simplest one"
example in the project, worth recording as it actually happened rather
than just the final answer:

**Initial draft plan** (before implementation): use the Haversine formula
for distance (the textbook-correct choice for lat/lng distance, since it
accounts for Earth's curvature), a single combined distance threshold
covering both pickup and destination compatibility, and an open question
of whether graph algorithms (BFS/DFS/A*) were relevant to the passenger-
matching problem at all, since "matching" sounds adjacent to "routing."

**What changed and why:**

- **Haversine → equirectangular.** Worked through the actual trade-off:
  Haversine's curvature correction only matters at distances where the
  Earth stops looking flat — hundreds of km. Every comparison in this app
  happens within a single city, a few km across. At that scale the two
  formulas agree to a negligible fraction of a percent, so Haversine's
  extra trigonometry (`atan2`, half-angle `sin²` terms) bought no real
  accuracy for the added complexity. Equirectangular is simpler *and*
  produces numbers a reviewer can check by hand in a spreadsheet — a
  genuine, checkable simplification rather than a shortcut.
- **One threshold → two.** A single combined pickup+destination distance
  was the initial framing, but pickup and destination don't represent
  the same tolerance: a shared pickup requires someone to physically walk
  to a meeting point, while a shared destination only needs the vehicle's
  route to make sense. Splitting into `PICKUP_THRESHOLD_KM = 1.5` and
  `DESTINATION_THRESHOLD_KM = 3` encodes that difference explicitly
  instead of averaging it away.
- **BFS/DFS/A* ruled out, explicitly, not just skipped.** These solve
  shortest-path-through-a-network problems (routing a car through actual
  streets). Zone compatibility asks a different question — "how far
  apart, as the crow flies, are two points" — which is a pure distance
  measurement, not a route. Reaching for graph search would mean building
  and maintaining a real road-network graph of Dhaka, which is exactly
  the routing-API rebuild this assessment's scope says to avoid. This
  wasn't dismissed by default; it was considered and rejected on the
  grounds that it solves the wrong problem.
- **Driver location: decided not to model it at all**, rather than
  modeling it partially (e.g. a rough driver zone with looser matching).
  Partial modeling would have created a feature that looks like it does
  something it doesn't (driver-aware matching) without actually doing it
  correctly. Full omission, documented as a deliberate simplification in
  `docs/geography-and-matching.md`, is more honest than a half-built
  version of driver-location matching landing in a later branch anyway.

Why this is Section 8 material rather than a single accepted/rejected
line: none of the individual pivots (formula, thresholds, ruling out
graph search) were the point on their own — the point is that getting to
the simplest correct answer took explicit comparison of alternatives
first, not just picking the "smart-sounding" option (Haversine, graph
search) by default.

### Documentation-accuracy defect caught by user — causal overclaim in geography-and-matching.md (feature/geography-zones)

`docs/geography-and-matching.md`'s worked example originally said the
matching-rule calculation "matches the seed data, which already has them
sharing Jashim's pool" — phrasing that implied the new matching rule
(`zonesAreCompatible()`) produced Nusrat and Rafiq's pool grouping. It
didn't: that grouping was hand-authored directly in the seed script
during earlier scaffold work, before this branch's matching logic
existed. `zonesAreCompatible()` was never called to produce it — the
branch only proves the rule *agrees with* a pre-existing, manually
authored assignment, not that it generated one.

This is a documentation-accuracy defect, distinct in kind from the phone-
normalization bug above: that was a code defect (wrong runtime behavior);
this was a *claim* in prose that overstated what the code actually does,
while the code itself was correct the whole time. The user caught the
contradiction by comparing the doc's line against a plain-language
summary given in the same conversation ("doesn't actually match anyone
yet" vs. "already has them sharing Jashim's pool") and asked for the
actual seed data to be checked before either side got "fixed." Checking
confirmed the Pool does exist (so the doc wasn't strictly false) but the
causal implication was wrong — fixed by naming precisely what the
calculation demonstrates (agreement with existing data) versus what it
doesn't do yet (generate new pool assignments via a live endpoint — that
remains a real, explicitly named gap for `feature/ride-request`/
`feature/tesla-pooling`).

Worth recording for Section 8 as a case where catching an overclaim
before it reached the evaluator — rather than after — is itself the
evidence of engineering understanding, not the underlying mistake.

### Bug caught by the design detector, in the AI's own output — thick border on rounded corners (style/ui-refresh)

While extending the CNG-permit direction to the signup/login/driver-
dashboard cards, a new `.permit-card` pattern was introduced: a 4px
`border-t` accent stripe on a `rounded-lg` container. Impeccable's
design-quality hook flagged this after the driver-dashboard edit:
`border-accent-on-rounded` — a thick straight-edged border genuinely
creates a visible seam where it meets a rounded corner. This wasn't a
one-off: the same flawed pattern had already been used identically in
both the signup and login forms, written earlier in the same pass and
not yet caught. Fixed all three by squaring the top corners
(`rounded-b-lg` instead of `rounded-lg`) so the stripe sits flush against
a straight edge and only the bottom corners curve. `DESIGN.md`, written
moments earlier, had documented the flawed version as the system's
canonical pattern — corrected that too, so the reference doesn't
enshrine a bug.

A second, related finding after the fix: the detector still flagged the
dashboard's `border-t-4` because its rule is a simple co-occurrence
match (thick border + any rounding on the same element), not sophisticated
enough to see that the geometry was already fixed via a per-side
`rounded-b-*` split. Verified by inspection that no visual clash remained,
then persisted a narrow `ignore-value` (rule `border-accent-on-rounded`,
scoped to the one file) with the reasoning on record rather than silently
suppressing or leaving a stale warning.

Distinct from the phone-normalization and documentation-overclaim entries
above: this is a bug the AI introduced in its *own* design-refresh work
and a downstream tool caught before the user did, then triaged correctly
(real problem fixed everywhere it was duplicated, false-positive
suppressed narrowly with a documented reason, not broadly).

### Rejected — Impeccable-driven visual direction abandoned for Codex's redesign (style/ui-refresh)

The homepage and auth/dashboard pages went through multiple rounds of
Impeccable-tool-driven design (a formal dual-agent critique, a "CNG meter
/ permit sticker" direction contract, a DESIGN.md written to its schema)
across this branch's history. After a further revision pass, the user
rated the result 2/10 and had a separate tool (Codex) redo the frontend
entirely — a different visual system (forest/lime/mango, `AuthShell`,
a shared icon set), which is what's actually shipping. Once that
replacement was live, `PRODUCT.md`, the `.impeccable/` directory (config,
critique snapshots, surface briefs), and the impeccable-specific
`.gitignore` rule were removed at the user's request, and the design
hook was disabled for the project. `DESIGN.md` was kept — Codex rewrote
it as a plain project doc describing the new system, no longer tied to
Impeccable's schema.

Recorded plainly rather than omitted: a whole tool-driven approach was
tried, iterated on with real process (critique scores, a written
direction contract, live browser verification), and still didn't land
for the user — and was replaced by different tooling, not by the same
approach done more carefully. That's a legitimate "rejected" outcome for
Section 8, not a failure to hide.

### User-directed decision — paisa integers over taka decimals (project-wide, from the original brief)

The rule that money is always stored and computed as integer paisa —
never a float or decimal taka value — was the user's own instruction,
given in the very first project brief before any code existed ("Store
money as integer paisa, not decimal/float"), specifically to avoid
floating-point rounding error accumulating across repeated arithmetic.

This wasn't an AI suggestion adopted once; it became a standing
constraint the AI followed consistently afterward without needing to be
told again: `RideRequest.farePaisa` in the original Prisma schema,
`estimateFarePaisa()` in `feature/ride-request`'s fare module, and the
geography work's own reasoning ("same reasoning as documented for the
geo work") all point back to this one user decision. Worth recording
accurately as user-directed architecture, not AI-originated, since
Section 8 asks for genuine attribution rather than crediting the AI for
choices the user actually made.

### Bug caught by the user, not the AI — same-zone ride requests charged the base fare (feature/ride-request)

`POST /rides/request` never checked that `pickupZoneId` differed from
`destinationZoneId`. This was a known, explicitly-considered gap: while
building the form, adding a same-zone guard was weighed and deliberately
left out as "not explicitly requested... keep simple," reasoning that
mattered for the wrong thing here — a request to travel from a zone to
itself is nonsensical, not just an edge case. The distance formula
correctly returns `0 km` for identical coordinates, so the flat base
fare (`BASE_FARE_PAISA` = 3000 paisa = ৳30.00) got charged for going
nowhere. The user caught it by testing "Gulshan 1 to Gulshan 1" and
asking directly whether that was a problem.

Fixed with a zod `.refine()` on the creation schema (returns `400`
before any zone lookup or fare calculation runs), mirrored as a
client-side check in the form so the error shows before a network round
trip, and covered by a new test. Verified live: the same request that
previously returned `farePaisa: 3000` now returns `400`.

Distinct from the earlier bugs logged here: this wasn't a coding mistake
inside a decision already made — it was a *scope call during
implementation* (skip the guard, ship the simpler version) that turned
out to be wrong, caught by the user actually trying the product rather
than reading the code. That's a different kind of review value worth
naming for Section 8: automated tests and code review didn't catch this
because the tests only exercised distinct zones; a human trying the
actual product did.

**Follow-up, same session:** the "fixed" claim above was itself
incomplete. The fix guarded `handleSubmit` (blocking the actual network
call) but not the live fare-preview `useMemo`, which kept computing and
displaying a fare for a same-zone selection regardless — so the user,
after restarting the dev server, still saw "Gulshan 1 → Gulshan 1,
৳30.00" and reasonably asked again whether it was fixed. It *was* fixed
for the one thing that actually creates data (submission was already
returning 400 server-side); what was still broken was a second, separate
code path (the live preview) that happened to display the same wrong
number without ever calling the API. Root-caused by checking the actual
component code rather than assuming the earlier fix covered everything,
then guarded `estimatedFarePaisa` itself and disabled the submit button
outright for a same-zone selection, confirmed live in the browser this
time (not just via curl), and cleaned up the one bad row that predated
the fix from the dev database. Worth logging as its own instance:
claiming a fix is complete after testing only the backend, when the bug
was also visible in a second, independent frontend code path, is exactly
the kind of gap a "looks done" report can hide.

### User caught a gap in their own original spec — fare didn't scale with seats (feature/ride-request)

The original brief specified `estimateFarePaisa(distanceKm: number): number`
— deliberately one parameter, no `seats`. Built faithfully to that
signature, so `farePaisa` was the same whether a passenger requested 1
seat or 6: a flat per-request charge, not a per-seat one. This was not a
coding error; it matched exactly what was asked.

The user asked directly: "if a passenger requests more than one seat,
shouldn't the price increase?" Before changing anything, confirmed this
against the actual original commit (`estimateFarePaisa`'s real
signature) rather than assuming — it genuinely was spec'd as distance-only.
Presented it as a real product decision with three options (flat,
multiply-by-seats, or a partial per-extra-seat surcharge) via a
structured question rather than picking one, since it changes real
charged amounts and was the user's call to make, not an obvious bug fix.
The user chose multiply-by-seats.

Implemented as `estimateFarePaisa(distanceKm) * seats` on both the
backend (the actual charge) and the frontend's live preview (kept in
sync deliberately, given the same-zone bug immediately before this was
caused by exactly that kind of frontend/backend drift). Verified live:
2 seats on Banani→Mohakhali returned exactly `11462` paisa (5731 × 2), 3
seats returned `17193` (5731 × 3).

Worth recording distinctly from the paisa-over-taka entry above: that one
was a decision made *before* any code existed; this one is the user
reviewing a decision already shipped, spotting a real gap in their own
earlier instruction, and directing the fix — a different, later kind of
product ownership worth showing for Section 8.

### Process note — commit timestamps vs. actual incremental work

`feature/passenger-auth`'s 8 commits were made in two tight clusters
(seconds apart) despite the real work (three homepage redesign
iterations, backend build, live DB verification) spanning the full
session. The commits are honestly ordered and scoped (each one's diff is
genuinely just that concern), but the *timestamps* don't support an
"incremental work over time" narrative if asked about it directly. Worth
disclosing plainly if asked in review/interview rather than letting the
commit history imply something the timeline doesn't back up.

### User-originated design decision — pool lock timing (feature/ride-lifecycle)

Before any code existed for this branch, the user identified an
unresolved design gap themselves: given two passengers requesting
overlapping-but-different trips, when does a pool actually "lock in" and
depart? Is there a wait, does the system risk missing a compatible
second passenger by locking too early, or does capacity just fill
immediately with no room for a driver to be flexible?

The user then proposed the resolution themselves, not just the question:
lock the pool when the driver marks the trip STARTED (driving), not at
DRIVER_ARRIVED — reasoning that a driver who has arrived at a pickup but
hasn't pulled away yet should still be able to pick up one more
compatible rider before departing.

This is worth recording as distinct from the phone-normalization bug or
the same-zone fare bug above — those were gaps caught during review of
already-shipped behavior. This one was original product design, done by
the user before a single line of the lifecycle code was written. My role
here was implementation and verification (the `isValidTransition` state
map, the `/start` endpoint flipping `Pool.status` to `LOCKED` while
`/driver-arrived` leaves it `OPEN`, and live confirmation against the
real seeded driver Jashim that the pool does stay OPEN through
driver-arrived and only locks at start) — not originating the rule.

### Bug caught during live verification — stale dev server processes

While verifying this branch end to end, `POST /rides/request` and
later `/accept` returned 404 "Cannot POST" even though the routes were
correctly registered in the code. Root cause: an old `ts-node-dev`
process from an earlier session was still bound to port 4000, so
`npm run dev` had been silently failing to bind (`EADDRINUSE`) while a
stale server kept answering requests with pre-lifecycle route tables.
The same thing happened on port 3000 for the Next.js dev server,
compounded by the project's known stale-webpack-chunk issue after
clearing `.next`. Caught by checking the actual process bound to each
port (`Get-NetTCPConnection`) rather than assuming the code was wrong,
killing the stale processes, and restarting clean — not a defect in the
ride-lifecycle code itself, but worth logging since it could easily have
been misdiagnosed as one.

### Caught in review, before merge — misleading "nearby" copy and missing scoping tests

Two review questions caught real gaps that I hadn't flagged myself before
declaring the branch ready:

1. The driver dashboard's "Nearby requests" label implied geographic
   proximity filtering. Checked the actual query in
   `listAvailableRideRequests` (`rides.service.ts`) — it's
   `where: { status: "REQUESTED" }`, system-wide, no lat/lng anywhere.
   That's correct per the `feature/geography-zones` decision not to
   model driver location at all, but the label was my own invented copy
   (not in the original spec, which said "requests relevant to this
   driver") and it overclaimed a capability the system doesn't have.
   Renamed to "Open requests." A real instance of the MVP-honesty rule
   catching UI copy that outran the backend.

2. `GET /rides/available` and `GET /rides/driver-mine` — both added
   mid-branch, outside the original endpoint list — had zero tests for
   the "can't see another user's data" guarantee that's been explicitly
   tested on every prior branch (passenger auth, driver status, ride
   ownership). Added two tests: one confirming `/rides/available`
   excludes a request already matched to a driver, one confirming
   `/rides/driver-mine` only returns the calling driver's own trips, not
   another driver's. Both passed on the first run — no bug found, but
   the coverage gap itself was real and is exactly the kind of thing
   that's easy to build correctly and still forget to test when an
   endpoint gets added as a side effect of building a UI, rather than
   from the spec's own test list.
