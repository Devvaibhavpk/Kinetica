# Kinetica Control Room — Design System

```yaml
---
name: Kinetica Control Room
colors:
  surface: '#0b1326'
  surface-dim: '#060e20'
  surface-bright: '#31394d'
  surface-container-lowest: '#040a1a'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c0c8c6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8a9291'
  outline-variant: '#404847'
  surface-tint: '#9ed0ca'

  primary: '#9ed0ca'
  on-primary: '#003733'
  primary-container: '#82b3ad'
  on-primary-container: '#114641'
  inverse-primary: '#366661'

  secondary: '#ffb783'
  on-secondary: '#4f2500'
  secondary-container: '#d97722'
  on-secondary-container: '#451f00'

  tertiary: '#ffb3b0'
  on-tertiary: '#670211'
  tertiary-container: '#ff8684'
  on-tertiary-container: '#7c141d'

  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'

  primary-fixed: '#baece6'
  primary-fixed-dim: '#9ed0ca'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#1c4e4a'
  secondary-fixed: '#ffdcc5'
  secondary-fixed-dim: '#ffb783'
  on-secondary-fixed: '#301400'
  on-secondary-fixed-variant: '#713700'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b0'
  on-tertiary-fixed: '#410006'
  on-tertiary-fixed-variant: '#881d24'

  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'

  # --- state-ramp: the one gimmick every screen reuses ---
  state-calm: '#9ed0ca'
  state-calm-glow: 'rgba(158,208,202,0.35)'
  state-building: '#ffb783'
  state-building-glow: 'rgba(255,183,131,0.35)'
  state-preempted: '#ff5a4e'
  state-preempted-glow: 'rgba(255,90,78,0.45)'

typography:
  display-lg:
    fontFamily: General Sans
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: General Sans
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: '0'
  headline-lg-mobile:
    fontFamily: General Sans
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  title-md:
    fontFamily: General Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Supreme
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Supreme
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Neue Montreal
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
  telemetry-lg:
    fontFamily: Berkeley Mono
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  telemetry-md:
    fontFamily: Berkeley Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  telemetry-sm:
    fontFamily: Berkeley Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em

fonts:
  primary_stack:
    display_headline: "General Sans, sans-serif"
    body: "Supreme, Switzar, sans-serif"
    label: "Neue Montreal, sans-serif"
    telemetry: "Berkeley Mono, Commit Mono, monospace"
  fallback_stack_free_licensed_only:
    display_headline: "General Sans, sans-serif"
    body: "Switzar, sans-serif"
    label: "Neue Montreal, sans-serif"
    telemetry: "Commit Mono, monospace"

rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px

spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px

motion:
  state-transition: 480ms cubic-bezier(0.2, 0.0, 0, 1.0)
  heap-reorder: 560ms cubic-bezier(0.34, 1.3, 0.64, 1)
  pulse-glow: 1400ms ease-in-out infinite
  micro: 160ms cubic-bezier(0.2, 0, 0, 1)
  numeric-roll: 200ms cubic-bezier(0.2, 0, 0, 1)
---
```

## Brand & Style

The design system embodies a sophisticated, engineering-first aesthetic inspired by modern industrial control interfaces and Pixel-era hardware software. It balances the precision of a technical command center with the approachable, expressive nature of Material 3 Expressive — deliberately *not* the flat, dense enterprise-dashboard look, and not generic Bootstrap-card design either.

The visual narrative is centered on **"state-as-environment."** The UI itself changes temperature based on what the system is doing: calm sage-teal at rest, warming to amber as queues build, snapping to saturated red-orange the instant an emergency override fires. This isn't a decorative accent — it's the primary way an operator (or a Review 5 panel, from across a room) reads system state without parsing a single number.

The style fuses **Pixel/Material You expressive tonal theming** with **industrial-glass instrumentation** — think a control room built by the same team that designs Pixel wallpaper-to-theme color extraction, wrapped around real telemetry. High-legibility data against deep, layered navy-black surfaces; frosted glass separating layers, never a hard line. The emotional register is calm authority, situational awareness, tactile precision — never clutter, never a spreadsheet wearing dark mode.

## Colors

The palette is dynamic and state-driven, not a fixed brand identity — three states are the load-bearing colors, everything else is surface and text.

- **Calm (Normal):** `state-calm` (#9ed0ca), a low-fatigue sage-teal — the resting color of any lane, node, or chip operating within normal parameters.
- **Building (Queue/Warning):** `state-building` (#ffb783), a warm amber-coral — queue accumulation, an extended green phase, anything trending toward attention.
- **Preempted (Emergency):** `state-preempted` (#ff5a4e), saturated red-orange — an active override, a lane forced to heap-root, a corridor mid-preclear. Always paired with `state-preempted-glow` as a soft outer bloom, never a flat fill alone.
- **Surfaces:** deep navy-black (`surface` #0b1326) is the floor. Elevation moves through tonal steps (`surface-container-lowest` → `surface-container-highest`), never through drop shadows or pure black.
- **Secondary/tertiary tokens** (`secondary`, `tertiary`, `error`) exist for non-state UI — form validation, destructive actions, informational accents — and must never be substituted for the three state colors above. If something is showing system state, it uses the state-ramp; if it's showing UI chrome, it uses secondary/tertiary/error.

Every screen — lane bars, heap tree nodes, graph nodes, event-ticker pills, KPI tile accents — draws from this same three-color ramp. Learn it once on the Overview page, read every subsequent screen fluently.

## Typography

The hierarchy distinguishes narrative guidance from measured fact — this distinction matters more here than in most dashboards, because a viva panel needs to instantly tell "the system is explaining itself" from "the system is reporting a real number." The stack below deliberately avoids the reflexive AI-dashboard defaults (a generic geometric sans for headers, Inter for body, JetBrains Mono for anything technical) — that combination has become a tell of templated, vibe-coded output specifically because every tool reaches for it by default.

**General Sans** carries headers, page titles, and card titles. Denser, slightly condensed proportions with real character in the terminals — gives headlines a manufactured, product-label feel rather than a startup-pitch-deck feel. Confident, industrial, not generic-geometric.

**Supreme** (fallback: **Switzar**) is the neutral workhorse for body copy, descriptions, and explanatory text. Still built for legibility at small sizes, but the letterforms carry enough warmth that paragraphs read as considered rather than filler.

**Neue Montreal**, small-caps tracked, marks section headers and field labels — genuine instrument-panel presence, the register of a nameplate printed on real hardware rather than a web-safe label font.

**Berkeley Mono** (fallback: **Commit Mono**) is reserved exclusively for numbers that were *measured*, not decorative: λ arrival-rate estimates, queue lengths, wait times, p-values, timestamps, benchmark timings. This is the deliberate fix for the "AI vibe-coded" problem: JetBrains Mono has become the reflexive default for anything wanting to look technical, which paradoxically makes it feel lifeless and templated. Berkeley Mono keeps every functional property this system needs — tabular figures so numbers don't jump on update, high legibility at small sizes for dense telemetry — while having genuinely distinctive letterforms (its slashed zero and character-width ratios in particular) that read as *designed*, not *defaulted to*. If a value came out of `results/*.json` or a live schema object, it renders in mono; this is a hard rule, not a preference, and it's what lets an operator's eye separate "the system computed this" from "this is a label."

## Layout & Spacing

Fluid grid philosophy with expanded outer margins, evoking Material 3 Expressive's "floating container" feel rather than edge-to-edge density.

- **Desktop:** 12-column grid, 24px gutters, 48px outer margins — the main control surface should feel like it's floating slightly off the viewport edge, not fused to it.
- **Tablet:** 8-column grid, 16px gutters.
- **Mobile:** 4-column grid, 16px gutters, 16px margins.

Spacing is generous by default. This system monitors exactly four modules and a handful of intersections — resist the instinct to fill space with more tiles; use whitespace to group related telemetry and let each module breathe. Density is the enemy of a Review 5 panel reading this from across a room.

## Elevation & Depth

No traditional drop shadows anywhere in this system. Depth comes from tonal layering and glass, matching the "state-as-environment" idea that surfaces are physical instrument panels, not paper cutouts.

1. **Level 0 (Floor):** `surface-container-lowest` — the deep navy-black base the whole app sits on.
2. **Level 1 (Modules):** `surface-container` / `surface-container-high` tonal steps, with a subtle 1px inner border at ~`#FFFFFF12`. Default card/module resting state.
3. **Level 2 (Active Overlays):** frosted glass — 20px background blur, ~60% surface opacity — used for modals, the calibration overlay toggle, and any panel that needs to sit *above* live telemetry without fully hiding it.
4. **Glow, not shadow:** active or emergency states emit a soft colored outer bloom matching their state token (`state-calm-glow`, `state-building-glow`, `state-preempted-glow`) instead of a shadow. A preempted lane doesn't cast a shadow — it radiates.

## Shapes

Large, confident radii throughout, deliberately contrasting the "hardness" of the underlying engineering data — this tension (soft container, sharp numbers) is the core visual joke of the whole system.

- **Primary containers/cards:** 24–32px corner radius (`rounded.lg` / `rounded.xl`).
- **Buttons, chips, tags, nav-rail selection pills:** fully pill-shaped (`rounded.full`), no exceptions.
- **Icons:** Material Symbols Rounded, filled weight — never outlined, never sharp-cornered glyphs. Includes the heap/tree and graph-node iconography used in the Preemption views.
- **Never a sharp corner** anywhere a human eye lands directly — reserve any genuinely square edge (a data-table cell divider, a code block) for places that are explicitly "raw data," keeping the soft/sharp contrast intentional rather than inconsistent.

## Motion

Motion is a first-class citizen, not a polish pass — the entire system is fundamentally about state changing over time, and static screenshots hide the thing that makes Kinetica's design distinctive (the green-wave corridor effect, a heap re-ordering live).

- **State transitions** (a lane moving calm → building → preempted): ~480ms, `cubic-bezier(0.2, 0, 0, 1)` — color and shape morph smoothly, never a hard color-swap cut.
- **Heap re-ordering:** ~560ms with a slight overshoot spring (`cubic-bezier(0.34, 1.3, 0.64, 1)`) — nodes visibly swap position with a little bounce, so a re-sort reads as *this lane just won priority*, not a silent redraw.
- **Pulse/glow (preempted state):** a slow 1.4s ease-in-out infinite pulse on the glow radius — draws the eye without being frantic.
- **Numeric roll:** ~200ms roll/counter transition on updating telemetry values, so rapid updates read as live measurement rather than flicker.
- **Micro-interactions** (hover, focus, chip taps): 160ms, snappy, no bounce.

## Components

### Buttons
Pill-shaped, high-contrast against their state. Default/calm buttons use a sage `primary` fill with dark `on-primary` text; an emergency-context action (e.g., "force preempt") uses `state-preempted` as its fill. Hover state adds a subtle inner glow — simulating hardware backlighting rather than a flat brightness bump.

### Chips & Tags
Strictly pill-shaped. 1px stroke in the relevant state color, low-opacity fill of the same hue (~12–16% opacity) beneath it. Primary vehicle for showing `PhaseReason` (scheduled/extended/preempted) and `VehicleClass` (standard/two-wheeler/ambulance/police/school_van) throughout the app — every instance of these two enums renders as this exact chip style, everywhere.

### Input Fields
24px rounded, deep tonal fill (`surface-container-high`), no visible border until focus — on focus, a `primary` sage ring appears. Field labels always render in Neue Montreal, small-caps tracked — a technical form-entry feel for scenario parameters, not a marketing signup form.

### Cards / Modules
24px radius, 1px `#FFFFFF12` border, `surface-container` background. Card titles: General Sans Medium. Any unit-of-measure label inside a card (m, veh/hr, s, %) renders uppercase in Neue Montreal directly beside its Berkeley Mono value — never inline with body text.

### Telemetry Readouts
The signature component. Large Berkeley Mono value (`telemetry-lg`), small Neue Montreal label above or beside it. Values that update in real time (queue length, λ estimate, active preemption count) must not visually "jump" — use tabular-figure mono spacing and the ~200ms numeric-roll transition, so rapid updates read as live measurement, not flicker.

### Status Indicators
Small circular "LED" pips using the state-ramp colors, rendered with a soft CSS blur behind the dot to create a radiance rather than a flat filled circle — the "on" glow should look like it's actually lit, not just colored.

### Graph & Heap Visualizations
Two bespoke components unique to this system, following the same rules as everything else — filled rounded nodes (never sharp boxes), edges as soft curved connectors (never hard right-angle lines), state-ramp coloring, spring-eased reordering motion. These are the two screens (Intersection Detail's heap tree, Green Wave Corridor's graph traversal) doing the most work to make the underlying data structures *visible* — treat them as premium, not utility, components.
