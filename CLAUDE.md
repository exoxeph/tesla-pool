# Project instructions for Claude Code

## Auth pattern — reuse, don't reinvent

`apps/api/src/common/auth-middleware.ts` (`requireAuth`, `requireRole`) is
the one and only auth-checking pattern for this project. It was built in
`feature/driver-auth` for the driver status endpoint and is the most
important piece of infrastructure in that branch — more important than the
driver feature itself.

**Every future authenticated route** — ride requests, pooling, the rest of
the driver flow, anything else — must:

1. Import and use `requireAuth` / `requireRole` from
   `apps/api/src/common/auth-middleware.ts`. Do not write a new
   `jwt.verify(...)` call or a new role check inline in a router.
2. Derive identity (user id, role) only from `req.auth`, which
   `requireAuth` populates from the verified JWT. **Never** accept a
   user/driver/owner id from the request body or query string to decide
   whose resource is being read or written — that is exactly the mistake
   this middleware exists to prevent (see `drivers.service.ts`'s
   `getOwnTesla`/`updateOwnStatus` for the reference pattern: the id
   comes from `req.auth.sub`, full stop).
3. If a new route needs a role that doesn't exist yet, extend the `Role`
   enum in `prisma/schema.prisma` and call `requireRole("THAT_ROLE")` —
   don't build a parallel permission system.

If a task prompt for a new feature doesn't explicitly say "reuse the
existing requireAuth/requireRole middleware," assume it applies anyway.
Reinventing per-route auth checks with subtly different logic each time is
the failure mode this note exists to prevent.

## AI usage notes

This is a technical assessment graded in part on the README's **AI Usage**
section: which tools were used, what for, one accepted suggestion, and one
rejected/changed suggestion with reasoning. Grading rewards engineering
understanding, not "least AI used."

Log notable AI-assisted moments to `docs/ai-usage-notes.md` **as they
happen**, not reconstructed from memory later. This includes:

- A suggestion the user accepted (and why it was good).
- A suggestion the user rejected or asked to be changed (and why).
- Bugs the AI introduced and how they were caught/fixed.
- Bugs the AI caught (e.g. in existing code or in the user's own request).
- Any moment the AI verified a claim before acting on it, or corrected a
  false premise in a request, rather than complying blindly.

When the actual README gets written, its AI Usage section should be
written from this log, not from memory of the whole project.
