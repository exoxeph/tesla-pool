---
name: Dhaka Tesla Pool
description: A utilitarian ride-pooling MVP for Dhaka commuters, styled as a CNG auto-rickshaw's meter and windscreen permit stickers.
colors:
  cng-green: "#0F8A3C"
  cng-green-interactive: "#0B6B2E"
  dash-charcoal: "#14181A"
  dash-charcoal-muted: "#4A5551"
  laminate-white: "#FFFFFF"
  sticker-card-white: "#F4F6F5"
  meter-amber: "#FFB100"
  hairline-border: "#DCE3E0"
  alert-red: "#B3261E"
  alert-red-tint: "#FDECEA"
typography:
  display:
    fontFamily: "Teko, system-ui, sans-serif"
    fontWeight: 500
    letterSpacing: "0.025em"
  body:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontWeight: 400
  label:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "10px"
    letterSpacing: "0.05em"
rounded:
  md: "6px"
  lg: "10px"
components:
  button-primary:
    backgroundColor: "{colors.sticker-card-white}"
    textColor: "{colors.dash-charcoal}"
    typography: "{typography.display}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.sticker-card-white}"
    textColor: "{colors.dash-charcoal}"
    typography: "{typography.display}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
---

# Design System: Dhaka Tesla Pool

## Overview

**Creative North Star: "The Windscreen Permit Sticker"**

Dhaka Tesla Pool reads as the actual laminated fare card and permit
sticker taped inside a shared Dhaka vehicle, not a scroll-past SaaS
landing page. The world is a CNG auto-rickshaw's instrument panel:
vivid body-panel green as a committed field color, charcoal dash
plastic for structural ink, amber reserved strictly for meter-style
numerals, and cool laminate-white for sticker-card surfaces — never the
warm cream/ivory that AI-generated design defaults toward. Cards sit a
hair off-axis with one clipped corner, like a real peeling sticker.

This is a brief-confirmed rejection of decoration: the product's own
brand commitment states "clean and functional over flashy," and the
world is chosen specifically because a generic ride-app template (map
pin, gradient hero, smiling-driver stock photo) was the thing to avoid.
The motif's expressive form (full sticker rotation, clip-path) belongs
to Persuade-mode surfaces (the homepage); Operate-mode surfaces (forms,
the driver dashboard) carry the same world in restrained, precise
details — a permit-stripe top accent, a dash-grid texture, a segmented
seat-count control — rather than full stylization, per this system's own
mode discipline (see **The Restraint-by-Mode Rule** below).

**Key Characteristics:**
- One committed color (green) carries 30–60% of any Persuade surface at page scale, never as a scattered accent
- Condensed stamped-signage display type (Teko) paired with a plain, legible body face (Work Sans)
- A dedicated meter/label face (Martian Mono) reserved for numerals and short system-status labels only
- Sticker-card clip-path + slight rotation as the signature interactive-element silhouette
- No gradients, no glassmorphism, no default Inter/Geist typography, no purple

## Colors

The palette is a **Committed** strategy (per Impeccable's color-strategy taxonomy): one saturated hue does real work at page scale, not a neutral base with a timid accent.

### Primary
- **CNG Green — Field** (`#0F8A3C`): large-scale fields and oversized display text only (the homepage header/hero band, `text-6xl` headlines on a green ground). Never used for small text on light backgrounds — the pairing fails contrast at that scale.
- **CNG Green — Interactive** (`#0B6B2E`): every interactive surface carrying small or white text (button fills, the homepage's primary CTA border, the driver dashboard's "online" state accent, focus rings site-wide).

### Neutral
- **Dash Charcoal** (`#14181A`): primary text color, the footer band, and the "offline"/secondary-action ink color.
- **Dash Charcoal Muted** (`#4A5551`): secondary/helper text (form hints, captions).
- **Laminate White** (`#FFFFFF`): the page background and default surface.
- **Sticker-Card White** (`#F4F6F5`): every card, form container, and sticker surface — deliberately cool, never the warm cream/ivory an unguided AI pass defaults to.
- **Hairline Border** (`#DCE3E0`): all default borders and the dash-grid texture's dot color.

### Accent
- **Meter Amber** (`#FFB100`): reserved exclusively for meter-style numerals and instrument accents. Never a text color on a light background (fails contrast at 1.82:1) and never a general-purpose highlight.

### Semantic
- **Alert Red** (`#B3261E`) on **Alert Red Tint** (`#FDECEA`): the only error-state pairing in the system, used identically across every form and the driver dashboard.

### Named Rules
**The Green-500-Is-Not-a-Border Rule.** `cng-green` (`#0F8A3C`) is documented for large fields and display text, but this system also uses it as the *border* color on every primary CTA and role-toggle button — a deliberate carve-out: border strokes read at low enough area to not need the small-text contrast floor, even though the token comment doesn't spell this out. If this pairing is ever revisited, either update the token comment to state the carve-out explicitly or move interactive borders to `cng-green-interactive`.

**The No-Warm-Cream Rule.** Laminate/sticker-card surfaces are always a cool near-white (`#F4F6F5`), never a warm cream or ivory — a deliberate rejection of the AI-generated-design default for "friendly, approachable" surfaces.

## Typography

**Display Font:** Teko (condensed, tall, stamped-signage character), with `system-ui, sans-serif` fallback.
**Body Font:** Work Sans, with `system-ui, sans-serif` fallback.
**Label/Mono Font:** Martian Mono, with `ui-monospace, monospace` fallback.

**Character:** Teko is the one expressive choice in the system — condensed caps that read like stamped permit signage rather than a marketing hero face. Work Sans is deliberately plain and gets out of the way for actual reading. Martian Mono is used sparingly enough that it reads as an instrument readout, not a "techy" affectation.

### Hierarchy
- **Display** (500–700 weight, `text-4xl`–`text-6xl` / 2.25rem–3.75rem, uppercase, `tracking-wide`): page/section headlines and the wordmark. Always uppercase; Teko's lowercase forms are not part of this system's vocabulary.
- **Body** (400 weight, `text-base`–`text-lg` / 1rem–1.125rem): all reading copy, form labels, helper text.
- **Label** (400–500 weight, 10px, `tracking-wider`, uppercase): meter/numeral captions, system-status notes (e.g. the driver dashboard's "placeholder" disclaimer), footer copy.

### Named Rules
**The One Expressive Face Rule.** Only Teko carries personality. Work Sans and Martian Mono are both restrained by design — if a surface needs more visual energy, it comes from color, texture, or the sticker-card silhouette, never from switching body/label typefaces.

## Layout

Single-column, `max-w-md` (forms) to `max-w-5xl` (homepage) centered containers with generous vertical rhythm (`py-14`–`py-20` page padding, `gap-5`–`gap-8` between major blocks). Responsive behavior is mobile-first Tailwind defaults (stacking below `sm:`); the homepage's two-column hero (`sm:grid-cols-[1.1fr_0.9fr]`) collapses to a single stacked column on mobile. No custom breakpoints or spacing scale beyond Tailwind's defaults — this system has not needed one yet.

## Elevation & Depth

Mostly flat. The system uses two shadow weights only, both soft and low-contrast (`shadow-sm`, `shadow-md`, Tailwind defaults) — never a hard offset "neobrutalist" block shadow, since this world was never chosen as that costume. Depth is conveyed more by the sticker-card clip-path silhouette (it reads as a physical object stuck to a surface) than by cast shadow.

### Named Rules
**The Soft-Shadow-Only Rule.** Any shadow in this system uses a soft blur with offset (Tailwind's default `shadow-sm`/`shadow-md`). A hard `box-shadow: 4px 4px 0` block shadow is a different world's costume and does not belong here.

## Shapes

Two coexisting form languages, chosen deliberately by mode:
- **Sticker-card** (`clip-path: polygon(0 0, 100% 0, 100% 100%, 14px 100%, 0 calc(100% - 14px))` plus a 1–2° rotation): every button, CTA, and the homepage's meter-readout card. One clipped corner reads as a peeling physical sticker.
- **Permit-card** (square top corners, `rounded-b-lg` on the bottom only, a 4px `border-t` accent stripe, and the `dash-grid` dot texture): form containers and the driver dashboard's vehicle card. Top corners stay square specifically so the straight-edged stripe sits flush against them — a thick top border on a fully rounded card creates a visible seam where the straight edge meets the curve. Operate-mode surfaces get the world's *details* (texture, stripe, meter-font labels), not its full expressive silhouette.

### Named Rules
**The Restraint-by-Mode Rule.** Persuade-mode surfaces (the homepage) get the sticker-card motif's full expression — rotation, clip-path, playful placement. Operate-mode surfaces (signup, login, the driver dashboard) get the same world through precise details only (a stripe, a texture, a meter-font label) on an otherwise plain rectangular container. Wrapping an entire data-entry form in a rotated clipped sticker would trade scanability for expression — the wrong trade for a task surface.

## Components

### Buttons
- **Shape:** sticker-card clip-path + 1–2° rotation, straightening to 0° on hover (`transition-transform`).
- **Primary:** `sticker-card-white` background, 4px `cng-green` border, `dash-charcoal` text, Teko uppercase label — used for the single primary action per surface (Continue as Passenger, Create account, Log in, Go online).
- **Secondary:** identical shape, `dash-charcoal` border instead of green — used for the alternate/secondary path (Continue as Driver, Go offline).
- **Hover / Focus:** rotation resets to 0° on hover; a 2px `cng-green-interactive` focus ring with 2px offset on keyboard focus, site-wide.

### Cards / Containers
- **Sticker-card variant:** clip-path silhouette, `sticker-card-white` background, soft shadow, slight rotation. Used for the homepage's meter-readout card only.
- **Permit-card variant:** square top corners, `rounded-b-lg` on the bottom only, 4px `border-t-cng-green` accent stripe, `dash-grid` dot texture background, `sticker-card-white` fill. Used for every form container and the driver dashboard's vehicle card. On the driver dashboard specifically, the stripe color swaps to `cng-green-interactive` when the vehicle is online and `dash-charcoal` when offline — the one place in the system where a container's own accent color carries live state.
- **Internal Padding:** `p-6` (24px) on all card variants.

### Inputs / Fields
- **Style:** `rounded-md`, 1px `hairline-border` stroke, `laminate-white` fill.
- **Focus:** border unchanged, 2px `cng-green-interactive` ring appears.
- **Error:** border switches to `alert-red`; an inline `text-xs alert-red` message appears directly under the field (never only a top-of-form banner) — field-format problems (a name, a malformed phone number, a short password) are always shown here, resolved client-side before any network call.
- **Form-level banner:** reserved for server/network-verified failures only (wrong password, duplicate phone, connection failure) — the same `alert-red` / `alert-red-tint` pairing, but positioned at the top of the form since it isn't tied to one field.

### Seat Picker (signature component)
A row of six numbered segments (1–6), each a small square button; the selected/current value is filled `cng-green-interactive` with white text, unselected segments are outlined `hairline-border`. Used both as an input (driver signup's capacity field) and read-only (the driver dashboard's vehicle card) — this is the system's literal implementation of its own named discipline: seat occupancy is always a segmented, counted strip, never a soft progress bar or a bare number.

### Navigation
The header is a single-row wordmark (a small `sticker-card` "DT" mark plus the Teko display name) on a plain `laminate-white` ground with a 4px `cng-green` bottom border. No dropdown or multi-item nav exists yet — the product has too few surfaces to need one.

## Do's and Don'ts

### Do:
- **Do** use Teko only for headlines/labels/CTAs, always uppercase, never for body copy.
- **Do** reserve `meter-amber` for numerals/instrument accents — never as body or button text color.
- **Do** give Operate-mode surfaces (forms, dashboard) the world's details (stripe, texture, meter-font labels) rather than its full sticker-card silhouette.
- **Do** resolve field-format errors inline, under the field, before any network call — the top-of-form banner is for server-verified failures only.
- **Do** use the segmented Seat Picker anywhere a seat count is shown or entered, not a bare number or plain text.

### Don't:
- **Don't** use warm cream/ivory for any surface — laminate/sticker surfaces are always cool near-white.
- **Don't** add a hard offset "neobrutalist" block shadow; this world's depth is soft-shadow-only.
- **Don't** wrap an entire form or dashboard card in the full sticker-card rotation/clip-path — that silhouette belongs to Persuade-mode surfaces and buttons only.
- **Don't** add a kicker/eyebrow label above a heading; the heading carries its own weight.
- **Don't** introduce a second expressive typeface — Work Sans and Martian Mono stay restrained so Teko remains the system's one voice.
