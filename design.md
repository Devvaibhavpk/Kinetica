# Kinetica Control Room — Design System

```yaml
---
name: Kinetica Control Room (Astryx Theme)
colors:
  surface: '#000000'
  surface-dim: '#0a0a0a'
  surface-bright: '#242526'
  surface-container-lowest: '#000000'
  surface-container-low: '#18191a'
  surface-container: '#242526'
  surface-container-high: '#3a3b3c'
  surface-container-highest: '#4e4f50'
  on-surface: '#e4e6eb'
  on-surface-variant: '#b0b3b8'
  outline: '#3e4042'
  outline-variant: '#2d2f31'
  
  primary: '#0866ff'
  on-primary: '#ffffff'
  primary-container: '#23334c'
  on-primary-container: '#e7f3ff'

  secondary: '#333333'
  on-secondary: '#ffffff'
  secondary-container: '#e4e6eb'
  on-secondary-container: '#050505'

  error: '#e41e3f'
  on-error: '#ffffff'
  error-container: '#ffebe9'
  on-error-container: '#b30020'

  # --- state-ramp: the one gimmick every screen reuses ---
  state-calm: '#00a86b'
  state-calm-glow: 'rgba(0,168,107,0.35)'
  state-building: '#f5a623'
  state-building-glow: 'rgba(245,166,35,0.35)'
  state-preempted: '#e41e3f'
  state-preempted-glow: 'rgba(228,30,63,0.45)'

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
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 32px
  telemetry-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  telemetry-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px

fonts:
  primary_stack:
    display_headline: "Albert Sans, sans-serif"
    body: "Inter, system-ui, sans-serif"
    label: "Inter, system-ui, sans-serif"
    telemetry: "JetBrains Mono, monospace"

rounded:
  sm: 0.5rem
  DEFAULT: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
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

The Kinetica Control Room adopts the **Astryx Design System** (by Meta) as its visual foundation, utilizing its native **Dark Mode**. Moving away from the heavy "industrial control" aesthetic, the system embraces a clean, agent-ready environment. The background (`#000000`) acts as a pure black canvas, allowing dark cards (`#242526`) with subtle shadows and borders to lift the content. State changes (Calm, Building, Preempted) are communicated through sharp, deliberate accents rather than overwhelming glowing backgrounds.

## Colors

The Astryx neutral dark palette is the foundation, complemented by Kinetica's three semantic state colors.

- **Calm (Normal):** `state-calm` (#00a86b), a clean emerald green.
- **Building (Queue/Warning):** `state-building` (#f5a623), a sharp warning amber.
- **Preempted (Emergency):** `state-preempted` (#e41e3f), a vivid crimson red.
- **Surfaces:** Pure black wash (`surface` #000000) serves as the backdrop, while structural components sit on dark grey (`surface-container` #242526) with delicate borders (`#3e4042`).
- **Primary:** Astryx Blue (`primary` #0866ff) is used for core interactions.

## Typography

**Albert Sans** carries headers, page titles, and card titles. 
**Inter** is the neutral workhorse for body copy, tags, and labels.
**JetBrains Mono** is reserved exclusively for numbers that were *measured*: telemetry values, timers, logs.

## Layout, Shapes & Depth

- 12-column desktop grid.
- Cards are 12px to 16px radius (`rounded-md` / `rounded-lg`).
- Depth is achieved through `astryx-sm` to `astryx-lg` shadows with 1px `border-outline` borders.
