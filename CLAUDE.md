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

## Frontend design contract — follow for every new page

The frontend uses a contemporary **Dhaka mobility** visual language. New
pages must feel like part of the same product rather than standalone
templates. The design combines deep forest framing, high-visibility lime
route signals, mango destination markers, subtle street-grid geometry, and
strong editorial typography. It should feel local and transport-aware
without using stock photography, generic SaaS gradients, or decorative map
pins with no product meaning.

The canonical token definitions live in `apps/web/tailwind.config.ts`, global
interaction styles live in `apps/web/app/globals.css`, and the shorter visual
reference lives in `apps/web/DESIGN.md`. Reuse those sources instead of
introducing one-off colors, shadows, radii, or fonts.

### Visual foundation

- Use `forest-900` and `forest-950` for navigation, hero framing, primary
  actions, and important vehicle or route surfaces.
- Use `lime-300` as a signal color for primary hero actions, selected states,
  active routes, availability, and online status. Do not use lime for
  paragraphs or large amounts of body copy.
- Use `mango-400` for destinations, savings, and secondary editorial
  callouts. It should support lime rather than compete with it.
- Build page and card hierarchy with `surface`, `surface-raised`, and
  `surface-muted`; use the `ink-*` scale for text.
- Use `danger-600` with `danger-50` consistently for validation and API
  failures. Never communicate an error or live status with color alone.
- Use only the shared soft shadows (`shadow-card`, `shadow-soft`,
  `shadow-lift`). Avoid hard offset shadows, glassmorphism, neon effects,
  and arbitrary gradients.
- Prefer custom route diagrams, street grids, and truthful UI previews over
  stock photos. Decorative artwork must remain secondary to readable copy.

### Typography

- `font-display` (Teko) is for uppercase page titles, section headlines, and
  large numbers. Keep its line height tight and do not use it for paragraphs.
- `font-sans` (Work Sans) is the default for interface and body copy.
- `font-meter` (Martian Mono) is reserved for short metadata, status labels,
  overlines, and compact system readouts. Use uppercase with wider tracking.
- Use a clear hierarchy: small mono overline, expressive display heading,
  restrained supporting copy. Do not add a second decorative typeface.

### Layout and page composition

- Use a centered `max-w-7xl` shell with `px-5` on mobile and `sm:px-8` from
  the small breakpoint upward.
- Design mobile-first. Every multi-column layout must collapse cleanly to a
  single-column reading order without horizontal scrolling.
- Marketing pages may use dark, expressive route-map framing. Auth and
  dashboard pages should be calmer, highly scannable, and task-focused.
- Use 16–24px card radii and generous spacing. Group related controls inside
  one surface instead of creating many tiny floating cards.
- Every page needs a clear primary action. Secondary actions should be
  visually quieter and must not compete with it.
- Reuse `SiteHeader` and `SiteFooter`; do not create route-specific copies of
  the global navigation or brand mark.

### Shared component patterns

- Primary buttons are rounded-full forest buttons on light surfaces or lime
  buttons on dark surfaces. Use the shared `focus-ring` utility and include a
  directional icon when it improves clarity.
- Inputs use the global `.field` class. Add `.field-error` for invalid input,
  keep field-level errors directly below their field, and reserve a form-level
  banner for server or network errors.
- Use `AuthShell` for future authentication and onboarding pages so the
  responsive split layout and supporting brand story stay consistent.
- Reuse icons from `components/icons.tsx`. Add new icons there using the same
  24px outline style; do not paste slightly different SVGs into individual
  pages and do not use emoji as interface icons.
- Seat capacity always uses `SeatPicker`, including read-only displays.
- Route UI uses lime for the origin/active path and mango for the destination.
- Online or live states must pair a colored indicator with explicit text such
  as “Accepting riders” or “Currently offline.”
- Loading states should preserve the final layout with subtle skeleton blocks.
  Empty states should explain what happened and offer one useful next action.

### Page templates

- **Marketing page:** dark route-map hero, one dominant value proposition,
  primary and secondary role actions, proof or product preview, feature
  explanation, local coverage, then a final CTA.
- **Auth/onboarding page:** `AuthShell`, one short title and description,
  segmented role selection when needed, a single-column form, inline
  validation, and a clear alternative auth link.
- **Passenger operation page:** greeting/context, prominent route search,
  current or nearby pools, then supporting community information.
- **Driver operation page:** availability status near the heading, primary
  vehicle/status surface, one obvious online/offline action, and secondary
  activity data below it.
- **New dashboard feature:** title and current status first, the main task
  second, recent or upcoming activity third. Do not lead with vanity metrics.

### Interaction and accessibility requirements

- All links, buttons, inputs, radio controls, and custom controls need a
  visible keyboard focus state.
- Icon-only buttons require an accessible label. Decorative icons and artwork
  must use `aria-hidden` or an equivalent presentation role.
- Maintain readable contrast and never place small lime or mango text on a
  light background.
- Respect `prefers-reduced-motion`. Motion should explain route progress,
  loading, or state change; avoid continuous decorative animation.
- Use semantic headings in order, real buttons for actions, links for
  navigation, and native form controls wherever possible.
- Loading, empty, success, validation, and server-error states must all be
  designed—not left as raw text or blank space.

### Implementation rules for future frontend work

**MVP honesty is mandatory.** A polished interface must not imply product
capabilities or traction that the repository does not actually have. Never
invent riders, available pools, fares, ETAs, savings percentages, coverage
areas, testimonials, ratings, verification, activity metrics, or live status.
Use only API-backed values or facts explicitly documented in the project.
Future functionality may appear as a clearly labeled concept/preview, disabled
control, roadmap step, or composed empty state. It must never look like live
data. When a feature is partial, state precisely what works today and what is
coming next.

1. Inspect the closest existing page and shared component before adding a new
   pattern.
2. Use Tailwind design tokens; do not add raw hex colors in page components.
   Raw SVG artwork may use palette values when CSS color inheritance is not
   practical.
3. Extract a shared component when the same structure appears twice or will
   clearly be reused by a planned page.
4. Preserve existing API, authentication, validation, and routing behavior
   during visual changes.
5. Add route metadata with a useful title and description. Nested layouts
   return their children and must not add another `<html>` or `<body>`.
6. Verify responsive behavior at narrow mobile, tablet, and desktop widths.
7. Run `npm run build:web` before considering frontend work complete. The
   build must pass compilation, lint/type checking, and static generation.

### Avoid

- Generic white SaaS pages with a timid green accent.
- Purple/blue startup gradients, glass cards, excessive blur, or random glow.
- Stock photography used as a substitute for product storytelling.
- Warm cream surfaces or unrelated colors outside the defined palette.
- Excessive cards, pills, badges, and uppercase labels with no hierarchy.
- Duplicate logos, navigation bars, form styles, icons, or status controls.
- Placeholder pages that only say a feature is coming later. Even before API
  wiring, provide a composed empty state or representative task surface and
  make any non-functional preview honest and clearly identifiable.
- Fabricated social proof, marketplace activity, prices, savings, coverage,
  identities, or operational metrics used merely to make the MVP look mature.
