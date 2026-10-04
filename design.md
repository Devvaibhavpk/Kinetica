# Kinetica Control Room — Design System

```yaml
---
name: Kinetica Control Room (Haulix Logistics Inspired)
colors:
  surface: '#090B10'
  surface-dim: '#050608'
  surface-bright: '#1D2230'
  surface-container-lowest: '#090B10'
  surface-container-low: '#0D1016'
  surface-container: '#12151E'
  surface-container-high: '#1D2230'
  surface-container-highest: '#262C3D'
  on-surface: '#F8FAFC'
  on-surface-variant: '#94A3B8'
  outline: '#1E293B'
  outline-variant: '#0F172A'
  
  primary: '#3B82F6'
  on-primary: '#ffffff'
  primary-container: 'rgba(59, 130, 246, 0.15)'
  on-primary-container: '#EFF6FF'

  secondary: '#475569'
  on-secondary: '#ffffff'
  secondary-container: '#1E293B'
  on-secondary-container: '#F8FAFC'

  error: '#EF4444'
  on-error: '#ffffff'
  error-container: 'rgba(239, 68, 68, 0.15)'
  on-error-container: '#FEF2F2'

  # --- state-ramp: the one gimmick every screen reuses ---
  state-calm: '#10B981'
  state-calm-glow: 'rgba(16, 185, 129, 0.3)'
  state-building: '#F59E0B'
  state-building-glow: 'rgba(245, 158, 11, 0.3)'
  state-preempted: '#EF4444'
  state-preempted-glow: 'rgba(239, 68, 68, 0.4)'

typography:
  display-lg:
    fontFamily: Albert Sans
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Albert Sans
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: '0'
  title-md:
    fontFamily: Albert Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  telemetry-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 32px
  telemetry-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  telemetry-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px

fonts:
  primary_stack:
    display_headline: "Albert Sans, sans-serif"
    body: "Inter, system-ui, sans-serif"
    label: "Inter, system-ui, sans-serif"
    telemetry: "Inter, monospace"

rounded:
  sm: 8px
  DEFAULT: 12px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
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
  state-transition: 200ms ease-in-out
  heap-reorder: 400ms cubic-bezier(0.34, 1.3, 0.64, 1)
  pulse-glow: 2000ms ease infinite
  micro: 150ms ease-in-out
  numeric-roll: 200ms ease-in-out
---
```

## Brand & Style

The Kinetica Control Room adopts a **Modern Logistics Dashboard (Haulix Inspired)** aesthetic. Moving away from heavy industrial flats, the system embraces a sleek, glassmorphic, deep-blue-tinted dark environment (`#090B10`). Structural components sit on translucent dark grey-blue cards (`rgba(18, 21, 30, 0.7)`) with subtle inner borders and backdrop blurs to lift content. State changes (Calm, Building, Preempted) are communicated through highly vibrant, neon accents with soft surrounding glows.

## Colors

The deep logistics neutral palette is the foundation, complemented by Kinetica's three semantic state colors.

- **Calm (Normal):** `state-calm` (#10B981), a neon emerald green.
- **Building (Queue/Warning):** `state-building` (#F59E0B), a sharp warning amber.
- **Preempted (Emergency):** `state-preempted` (#EF4444), a vivid rose/red.
- **Surfaces:** Deep blue/grey wash (`surface` #090B10) serves as the backdrop, while structural components sit on glassmorphic backgrounds with delicate borders (`#1E293B`).
- **Primary:** Vibrant Blue (`primary` #3B82F6) is used for core interactions.

## Typography

We employ a completely sans-serif typographic stack to ensure maximum legibility without leaning into the clichéd "hacker/AI" monospace aesthetic.
- **Display/Headlines:** `Albert Sans` for sharp, geometric authority.
- **Data/Telemetry & Body:** `Inter` utilizing tabular numeric variants (`tnum`) to align data streams cleanly while maintaining a premium sans-serif look.

## Layout, Shapes & Depth

- 12-column desktop grid.
- Cards are 12px to 16px radius (`rounded-md` / `rounded-lg`).
- Depth is achieved through `astryx-sm` to `astryx-lg` shadows with 1px `border-outline` borders.
