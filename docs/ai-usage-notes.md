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

### Process note — commit timestamps vs. actual incremental work

`feature/passenger-auth`'s 8 commits were made in two tight clusters
(seconds apart) despite the real work (three homepage redesign
iterations, backend build, live DB verification) spanning the full
session. The commits are honestly ordered and scoped (each one's diff is
genuinely just that concern), but the *timestamps* don't support an
"incremental work over time" narrative if asked about it directly. Worth
disclosing plainly if asked in review/interview rather than letting the
commit history imply something the timeline doesn't back up.
