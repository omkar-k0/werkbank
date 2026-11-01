---
name: Warm Atelier
colors:
  surface: '#fff8f5'
  surface-dim: '#e8d7ca'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1e7'
  surface-container: '#fcebde'
  surface-container-high: '#f6e5d8'
  surface-container-highest: '#f1dfd3'
  on-surface: '#221a12'
  on-surface-variant: '#51443d'
  inverse-surface: '#382f26'
  inverse-on-surface: '#ffeee1'
  outline: '#84746b'
  outline-variant: '#d6c3b9'
  surface-tint: '#845233'
  primary: '#5f3316'
  on-primary: '#ffffff'
  primary-container: '#7a4a2b'
  on-primary-container: '#ffbd95'
  inverse-primary: '#fab891'
  secondary: '#695c50'
  on-secondary: '#ffffff'
  secondary-container: '#f1e0cf'
  on-secondary-container: '#6f6255'
  tertiary: '#2a4614'
  on-tertiary: '#ffffff'
  tertiary-container: '#415e29'
  on-tertiary-container: '#b3d695'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbc8'
  primary-fixed-dim: '#fab891'
  on-primary-fixed: '#321300'
  on-primary-fixed-variant: '#683b1e'
  secondary-fixed: '#f1e0cf'
  secondary-fixed-dim: '#d4c4b4'
  on-secondary-fixed: '#231a10'
  on-secondary-fixed-variant: '#504539'
  tertiary-fixed: '#caeeaa'
  tertiary-fixed-dim: '#aed190'
  on-tertiary-fixed: '#0c2000'
  on-tertiary-fixed-variant: '#324e1c'
  background: '#fff8f5'
  on-background: '#221a12'
  surface-variant: '#f1dfd3'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: -0.01em
  display-lg-mobile:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  caption-medium:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.5rem
  space-sm: 1rem
  space-md: 1.5rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system establishes an exacting, calm, and utilitarian interface tailored for physical craft workshops—specializing in carpentry, upholstery, finishing, and metal fabrication. 

### Design Philosophy
The system combines the reductive clarity of high-end industrial design with the tactile warmth of honest materials: untreated paper, aged walnut, and raw brass. It rejects software ornamentation, skeuomorphic wood grain, playful rounded geometries, drop shadows, gradients, and decorative iconography.

### Visual Values
- **Atmospheric Silence:** Expansive, breathing negative space replaces dense enterprise dashboards. Layouts feel intentional, structured, and unhurried.
- **Architectural Rigor:** Form is defined strictly by precise 1-pixel hairlines and mathematical typography scales rather than drop shadows or heavy fills.
- **Material Restraint:** Color is applied like a craftsman’s punch mark: sparingly and purposefully.
- **Voice & Tone:** Quiet, plain, factual, and devoid of marketing hyperbole. Model confidence scores are capped strictly at `99%+`. Sentence case is applied across all headings, navigation items, buttons, and system states.

## Colors

The palette is rooted in unbleached paper stocks, kiln-dried timber, natural stains, and vegetable-tanned leathers. It operates exclusively in light mode to preserve the legibility of a physical workshop ledger.

### Palette Architecture
- **Surface - Canvas (`#F7F2E8`):** Warm unbleached paper background. Used across main viewports and full-bleed structural frames.
- **Surface - Card (`#FFFDF8`):** Clean ivory warm tone. Reserved for cards, sheets, panels, and data surfaces.
- **Border / Hairlines (`#E4D9C6`):** Delicate warm hairline border applied at 1px. Separates hierarchy without drop shadows.
- **Text Primary (`#2B221A`):** Deep espresso brown-black. High legibility, avoiding cold sterile slate or blue-tinted blacks.
- **Text Secondary (`#74675A`):** Muted warm taupe for supporting technical specs, sub-labels, metadata, and timestamps.
- **Primary Accent (`#7A4A2B`):** Rich walnut brown. Strictly reserved for the single primary filled button per screen, key inline text anchors, and active focus states.
- **Workshop Telemetry (Status Indicators):**
  - **Done / Clear (`#4D6B35`):** Olive sage green.
  - **In Progress / Queued (`#9A6A0E`):** Warm amber ochre.
  - **Action Required / Alert (`#A8462A`):** Terracotta rust.

### Color Rules
- Gradients, artificial textures, tints, drop shadow overlays, and colored full-bleed banners are prohibited.
- Statuses must never be displayed as heavy, high-saturation pill badges. They are rendered solely as an 8px solid geometric indicator dot accompanied by secondary taupe label text.

## Typography

The type system balances the literary heritage of an atelier catalog with the structural precision of architectural drawings.

### Type Pairings
- **Newsreader (Editorial Serif):** Used strictly for high-level page titles, hero section headers, and primary numeric workshop metrics (e.g., job IDs, dimensional tallies, queue counts).
- **Inter (Utilitarian Sans-serif):** Used across all operational UI elements, data tables, structural cards, navigation bars, button labels, form fields, and technical instructions.

### Scale Rules
- **Sentence Case:** All copy, including page titles, table headers, buttons, and alerts, must use sentence case. Title case and all-caps treatments are barred.
- **Weights:** Typography relies entirely on normal (`400`) and medium (`500`) weights. Heavy, semibold, or extra-bold weights are prohibited.
- **Numbers:** Tabular figures are enforced for technical measurements, material estimates, and currency lines.

## Layout & Spacing

Layouts prioritize clarity and spacious breathing room, adhering to an 8px modular baseline. Content conforms to a fixed-width container to preserve line lengths and avoid sprawling interfaces across high-resolution workshop monitors.

### Grid & Canvas Structure
- **Max Container Width:** 1120px, horizontally centered.
- **Columns:** 12-column layout on desktop; 6-column on tablet; 4-column on mobile.
- **Gutters:** 24px desktop (`gutter`), 16px mobile (`gutter-mobile`).
- **Margins:** 32px desktop outer padding (`margin`), 20px on mobile viewports (`margin-mobile`).

### Internal Component Spacing
- Cards and content modules use generous internal padding: 24px (`space-md`) on compact card surfaces and 32px (`space-lg`) on primary routing panels.
- Micro-gaps between label-value pairs and icon-text combinations use 8px (`space-xs`).
- Structural stack gaps between discrete content modules use 48px (`space-xl`).

## Elevation & Depth

This system excludes traditional drop shadows, blurs, and skeuomorphic relief. Depth is expressed structurally through boundary contrast and tonal layering.

### Surface Tiers
1. **Base Layer:** The viewport canvas rendered in `#F7F2E8` (warm paper).
2. **Elevated Content Layer:** Cards, drawers, and panels rendered in `#FFFDF8` (clean ivory), bound by a crisp 1px hairline border in `#E4D9C6`.
3. **Flyouts & Dialogs:** Modals and contextual popovers sit directly on ivory `#FFFDF8` with an active 1px `#E4D9C6` perimeter border. A semi-transparent `#2B221A` backdrop overlay set to 12% opacity provides focus isolation without heavy atmospheric blur.

### Hairline Architecture
All spatial hierarchy is created by clean, un-antialiased 1px hairlines. Box shadows (`box-shadow: none`) are globally avoided to maintain the flat, archival look of technical drafting paper.

## Shapes

The geometric framework is tailored, human, and balanced—neither aggressively sharp nor cartoonishly bubbly.

### Corner Radii
- **Containers & Cards:** 14px border radius. This specific curvature mimics heavy paper stock trimmed on a guillotine cutter, balancing precision with warmth.
- **Interactive Elements (Buttons, Inputs):** 8px border radius. Provides structural affordance without turning into capsules or pills.
- **Indicators & Dots:** 50% border radius (strictly for 8px status indicators).
- **Prohibited:** Full pill shapes (`9999px`) on buttons, cards, or tags are strictly forbidden.

## Components

Components reflect surgical restraint and honest utility. Every interaction state must be understated and tactile.

### Buttons
- **The Single Primary Button:** Exactly one filled walnut button is permitted per visible screen viewport.
  - Background: `#7A4A2B` (walnut brown).
  - Label: `#FFFDF8` (ivory), 15px Inter Medium, sentence case.
  - Padding: 10px 20px, 8px radius.
  - Hover: Opacity 0.92, micro-shift none.
- **Secondary Actions:** 
  - Background: Transparent.
  - Border: 1px hairline in `#E4D9C6`.
  - Label: `#2B221A`, 15px Inter Medium.
  - Hover: Background `#F7F2E8`.
- **Tertiary / Utility Actions:** Plain text links in `#2B221A` with a subtle `#E4D9C6` underline that transitions to `#7A4A2B` on hover.

### Status Indicators
Status is never wrapped inside colorful pill backgrounds. Statuses consist solely of:
- An 8px solid circular dot (`#4D6B35` for completed, `#9A6A0E` for in-progress/queued, `#A8462A` for review/overdue).
- Followed by a 13px Inter label in `#74675A` (e.g., "in progress", "needs joinery review").

### Cards & Panels
- Background: `#FFFDF8`.
- Border: 1px solid `#E4D9C6`.
- Radius: 14px.
- Padding: 24px or 32px.
- Drop shadows are strictly disabled.

### Input Fields
- Background: `#FFFDF8`.
- Border: 1px solid `#E4D9C6`.
- Text: 15px Inter in `#2B221A`.
- Placeholder: `#74675A`.
- Focus State: 1px solid `#7A4A2B` with zero outer glow rings.
- Radius: 8px.
- Internal Padding: 12px 16px.

### Checkboxes & Radios
- Size: 18px × 18px.
- Border: 1px solid `#E4D9C6`.
- Selected State: Solid `#7A4A2B` fill with a crisp 1.5px checkmark in `#FFFDF8`.
- Checkbox Radius: 4px. Radio Radius: 50%.

### Lists & Key-Value Pairs
- Separated by horizontal 1px hairlines (`#E4D9C6`).
- Keys are rendered in 13px Inter Regular (`#74675A`); values in 15px Inter Regular or Tabular (`#2B221A`).
- Rows feature generous vertical padding (16px to 20px).

### Iconography
- Rendered strictly at a 1.5px stroke weight.
- Unfilled line drawings only, colored in `#2B221A` or `#74675A`.
- Used with surgical restraint: icons must never serve as decorative backdrops.

### AI Routing Metamark
- Confidence outputs are rendered in 13px Inter Tabular Numbers and taupe copy: e.g., "routed to joinery · 98% confidence".
- Max display confidence is strictly capped at `99%+`.