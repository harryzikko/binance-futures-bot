---
name: Obsidian Algorithmic Terminal
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#d3c5ac'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#9b8f79'
  outline-variant: '#4f4633'
  surface-tint: '#f6be16'
  primary: '#ffd87f'
  on-primary: '#3f2e00'
  primary-container: '#f0b90b'
  on-primary-container: '#644b00'
  inverse-primary: '#775a00'
  secondary: '#acc7ff'
  on-secondary: '#002f67'
  secondary-container: '#0162cb'
  on-secondary-container: '#dae4ff'
  tertiary: '#59f8a9'
  on-tertiary: '#003920'
  tertiary-container: '#32db8f'
  on-tertiary-container: '#005b37'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf99'
  primary-fixed-dim: '#f6be16'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#5a4300'
  secondary-fixed: '#d7e2ff'
  secondary-fixed-dim: '#acc7ff'
  on-secondary-fixed: '#001a40'
  on-secondary-fixed-variant: '#004491'
  tertiary-fixed: '#60feae'
  tertiary-fixed-dim: '#3be194'
  on-tertiary-fixed: '#002111'
  on-tertiary-fixed-variant: '#005231'
  background: '#10131a'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  metric-display:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.03em
  metric-display-mobile:
    fontFamily: JetBrains Mono
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  metric-value:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  metric-table:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Manrope
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

### Personality & Mission
The design system establishes a high-performance, institutional-grade dark interface for automated Binance Futures algorithmic execution. It delivers surgical precision, zero-latency feedback, and structural calm under high-frequency volatility. The interface strips away consumer superficiality in favor of dense data legibility, low cognitive friction, and rapid operational control.

### Target Audience & Emotional Response
Engineered for quantitative traders, crypto asset managers, and advanced futures algorithmic operators. The system instills:
- **Absolute Command:** Structural solidity and instant visual feedback on automated execution.
- **Cognitive Clarity:** High-contrast telemetry separating baseline states from critical market volatility.
- **Institutional Reliability:** Low-latency visual verification eliminating ambiguity in high-leverage positions.

### Design Movement: High-Density Tactical Glassmorphism
The aesthetic merges dark institutional terminal ergonomics with refined modern glass surfaces. Precision borders, obsidian depth layers, and micro-luminance indicators contrast sharply with standard consumer crypto apps, prioritizing tabular data scanability and actionable bot telemetry.

## Colors

### Surface Hierarchy & Depth Mapping
The foundation utilizes a triple-tier obsidian continuum to isolate structural contexts:
- **Canvas Base (`#0B0E14`):** Global terminal substrate for full-bleed monitors.
- **Surface Layer 1 (`#121721`):** Primary structural panels, charts, order books, and bot telemetry matrices.
- **Surface Layer 2 (`#1A202C`):** Modals, flyout inspectors, active tooltips, and elevated control trays.
- **Subtle Surface Highlight (`#222B3D`):** Hover states, active table rows, and secondary input wells.

### Semantic Market & Operational Tokens
- **Terminal Primary (`#F0B90B`):** System-level highlights, active bot states, Binance integration checkpoints, and warning telemetry.
- **Automation / Radar Blue (`#387EE8`):** Algorithmic signals, API streaming conduits, automated bot triggers, and neutral analytics.
- **Long / Profit Bull Green (`#0ECB81`):** Positive PnL, executed buy orders, active long leverage indicators, and healthy system ping (`<30ms`).
- **Short / Drawdown Bear Red (`#F6465D`):** Negative PnL, liquidated states, stop-loss triggers, sell executions, and critical network drops (`>150ms`).
- **Text & Stroke Scale:**
  - `Text-Primary`: `#FFFFFF` (100% white for optimal numerical focus)
  - `Text-Secondary`: `#848E9C` (Standard terminal sub-labeling and inactive status)
  - `Text-Tertiary`: `#474D57` (Disabled inputs, borders, table dividers)
  - `Border-Subtle`: `rgba(255, 255, 255, 0.08)`
  - `Border-Focus`: `rgba(240, 185, 11, 0.4)`

## Typography

### Structural Allocation
- **Display & Section Headers (`Space Grotesk`):** Provides a sharp, engineered aesthetic suited for modular dashboard tiles and algorithmic parameter labels.
- **UI Interface & System Copy (`Manrope`):** Delivers clean readability for functional descriptions, form controls, and contextual menus.
- **Financial & Data Telemetry (`JetBrains Mono`):** Dedicated to all numerical values, including real-time order books, execution pricing, leverage multiples, and tabular PnL. Monospaced tabular figures guarantee alignment across live-updating tables.

### Data Scanning Rules
All active price changes must strictly prohibit dynamic horizontal layout shifts: use proportional tabular alignment flags (`tnum` / tabular lining) for all numerical instances across the application.

## Layout & Spacing

### Terminal Grid Structure
The dashboard uses a high-density, multi-panel fluid grid that adapts dynamically across displays:
- **Ultra-Wide & Desktop (>= 1440px):** 16-column flexible terminal partition. Supports continuous three-column layouts: Bot Fleet Controller (3 cols), Active Charting/Depth Engine (9 cols), and Real-time Orderbook/Log Stream (4 cols).
- **Standard Laptop (1024px - 1439px):** 12-column layout. Tabbed interfaces condense bot fleet analytics and terminal execution logs.
- **Tablet (768px - 1023px):** 8-column split layout. Focus switches between the live position manager and manual safety overrides.
- **Mobile (< 768px):** 4-column single-stack arrangement prioritizing critical bot kill-switches, aggregate PnL, and live open positions.

### Panel Spacing Discipline
Terminal panels use tightly calibrated gaps (`0.75rem` / `1rem`) to maximize screen efficiency without visual collisions. Internal card padding enforces an 8px base grid, maintaining compact heights for maximum row density.

## Elevation & Depth

### Tonal Stratification & Optical Borders
This design system avoids heavy shadows, which degrade contrast in dark algorithmic environments. Instead, it relies on tonal separation and razor-sharp border outlines:

- **Level 0 (Terminal Canvas):** Solid `#0B0E14` without elevation or translucency.
- **Level 1 (Docked Modules & Panels):** Solid `#121721` with a `1px` crisp border of `rgba(255, 255, 255, 0.07)`.
- **Level 2 (Glassmorphic Floating Trays & Overlays):** Background of `rgba(26, 32, 44, 0.75)`, processed with `backdrop-filter: blur(12px)` and a directional top border of `rgba(255, 255, 255, 0.12)`.
- **Level 3 (Emergency Modals & Critical Overrides):** Elevated surface `#1A202C`, bounded by a `1px` perimeter of `rgba(240, 185, 11, 0.35)` and an ambient containment shadow of `0 16px 36px -8px rgba(0, 0, 0, 0.75)`.

### Operational Glow & Active Lighting
Luminescent cues represent active execution states:
- Active bot nodes project an inner aura: `inset 0 0 12px rgba(56, 126, 232, 0.15)`.
- Stop-loss trigger zones feature a faint boundary glow: `0 0 8px rgba(246, 70, 93, 0.25)`.
- Take-profit targets apply subtle green illumination: `0 0 8px rgba(14, 203, 129, 0.25)`.

## Shapes

### Form Geometry & Architectural Edge
A low roundedness level (`1`) sets a sharp, technical baseline across all interface elements. This maintains an analytical, instrument-grade appearance and preserves canvas area for data tables:
- **Base Components (Inputs, Chips, Table Rows):** Standard radius of `0.25rem` (4px).
- **Cards & Data Modules:** Structural radius of `0.5rem` (8px).
- **Modals & Flyout Inspectors:** Radius of `0.75rem` (12px).
- **Leverage Tags & Status Indicators:** Chamfered micro-radii of `2px` to emphasize computational speed and precision.

## Components

### Buttons & Operational Triggers
- **Primary Execution (Action):** Background `#F0B90B`, text `#0B0E14`, font weight 700. Pressed state compresses by 1px with a high-contrast brightness shift (`filter: brightness(0.9)`).
- **Terminal Long / Buy:** Solid `#0ECB81` with pure `#0B0E14` typography. Hover initiates a `rgba(14, 203, 129, 0.2)` drop-glow.
- **Terminal Short / Sell:** Solid `#F6465D` with pure `#FFFFFF` typography.
- **Secondary Ghost / Technical:** Background `transparent`, border `1px solid rgba(255, 255, 255, 0.12)`, text `#FFFFFF`. Hover shifts background to `rgba(255, 255, 255, 0.05)`.
- **Emergency Kill-Switch (All Positions):** Striped obsidian and crimson border styling; requires a sustained 1.5-second press-and-hold interaction to trigger.

### Chips, Leverage Badges & Telemetry Tags
- **Leverage Multipliers (e.g., `20x`, `50x`, `125x`):** Background `#1A202C`, text `#F0B90B`, font family `JetBrains Mono`, uppercase, micro-border `1px solid rgba(240, 185, 11, 0.3)`. High leverage (`>=50x`) adopts a flashing red outline `rgba(246, 70, 93, 0.6)`.
- **Bot Strategy Tags (e.g., `GRID-NEUTRAL`, `MARTINGALE-PRO`):** Background `rgba(56, 126, 232, 0.12)`, text `#387EE8`, tracking `0.05em`.

### Latency & Connection Stream Monitors
- Visual ping indicators positioned in the primary system bar.
- Uses a monospaced millisecond readout alongside a pulsing 6px status bead:
  - `<30ms`: Green `#0ECB81`
  - `30ms - 99ms`: Binance Yellow `#F0B90B`
  - `>100ms`: Crimson Red `#F6465D` (triggers a warning chime and system banner)

### Toggle Bot Switches
- Width `36px`, height `20px`. Track background uses `#1A202C` with an inset micro-shadow.
- Thumb is a 14px circle with 2px padding.
- Active state transitions the track to `#387EE8` with an illuminated thumb (`#FFFFFF`), confirming live algorithmic automation.

### Input Fields & Parameter Steppers
- Background `#0B0E14`, border `1px solid rgba(255, 255, 255, 0.1)`.
- Numeric text rendered in `JetBrains Mono` (`#FFFFFF`).
- Integrated step increments (`+`, `-`) built into the right container wall with quick-fill percentage chips (`25%`, `50%`, `75%`, `100%`). Focus applies a `1px solid #F0B90B` ring without spatial displacement.

### Glassmorphic Trading Cards & Data Grids
- Constructed with obsidian glass substrates, sub-pixel white top-borders, and `rgba(255, 255, 255, 0.03)` alternate row striping.
- Positive and negative price movements animate using single-cycle background flashes (green: `rgba(14, 203, 129, 0.15)`, red: `rgba(246, 70, 93, 0.15)`), fading back to baseline over 300ms.