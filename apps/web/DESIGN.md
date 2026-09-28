# Dhaka Tesla Pool — UI system

## Direction

The interface is a contemporary Dhaka mobility product: deep forest framing,
high-visibility lime route signals, mango waypoints, map geometry, and concise
editorial typography. It should feel local and transport-aware without relying
on stock photography or generic map-pin-app conventions.

## MVP honesty

The UI must represent the product that exists now. Do not fabricate live
rides, riders, fares, ETAs, savings, coverage, testimonials, verification, or
activity. API-backed data may be displayed as real. Planned behavior must be
shown as a labeled preview, disabled next step, roadmap, or useful empty state.
Visual polish must never be mistaken for fake product maturity.

## Palette

- `forest-900` / `forest-950`: hero, navigation, primary action, vehicle card
- `lime-300`: route line, online state, primary hero action
- `mango-400`: destination, savings, secondary editorial callout
- `surface`, `surface-raised`, `surface-muted`: page and card hierarchy
- `ink-950` through `ink-500`: copy hierarchy
- `danger-600` / `danger-50`: form and API errors

Lime is a signal color. Use it for actionable or live states, not long-form
copy. Mango marks arrival, savings, or a supporting callout.

## Type

- Teko: uppercase display headlines and large numerals
- Work Sans: interface and body copy
- Martian Mono: compact status, metadata, and overline labels

## Components

- Primary actions are full-radius forest or lime buttons.
- Cards use 16–24px radii, a quiet one-pixel border, and soft green-tinted
  elevation.
- Form inputs use the global `.field` style and a lime focus halo.
- Route surfaces use origin dots in lime and destination dots in mango.
- Live/online state always combines color with visible status text.
- Seat capacity always uses the six-segment `SeatPicker`.

## Layout

The shared shell uses a 1280px maximum width and 20px mobile / 32px desktop
gutters. Marketing surfaces can be expressive and dark. Auth and dashboard
surfaces prioritize scanability, strong grouping, and restrained motion.

## Accessibility

- Every interactive element keeps a visible focus ring.
- Status and validation messages use text in addition to color.
- Motion is disabled under `prefers-reduced-motion`.
- Decorative map artwork and icons are hidden from assistive technology.
