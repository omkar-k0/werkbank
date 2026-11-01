# Product Requirements Document (PRD): Werkbank

**Product Name:** Werkbank  
**Version:** 1.0.0  
**Status:** Approved / In Development  
**Design System Reference:** Warm Atelier (`{{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_1}}`)  
**Target Form Factors:** Desktop Web (Shop Owner / Desk) · Mobile Web (Workshop Craftsmen)

---

## 1. Executive Summary & Vision

**Werkbank** is an intelligent, quiet operating system and order router designed specifically for independent artisanal furniture workshops (Tischlerei, Polsterei, Lackiererei, Metallbau). 

Instead of forcing craftsmen to fill out rigid enterprise ERP forms, Werkbank lets shop owners intake freeform customer requests like traditional paper job slips (*"Sofa cushions are completely flat, customer wants firmer foam"*). Werkbank automatically parses the memo, calculates routing confidence across specialized internal workshops, and routes the job—explicitly holding back for human verification whenever confidence falls below shop thresholds.

### Core Philosophy
- **Quiet Craftsmanship:** Apple-like minimalism with an honest, warm workshop character. No decorative clutter, no emojis, no distracting saturated badges.
- **Measured, Not Promised:** AI is never presented as magic. Model confidence is explicitly capped at `"99%+"`, and full explainability (determining tokens, probability distribution) is visible to shop owners.
- **Dusty Hands Ergonomics:** Field staff interfaces (mobile) are designed for sawdust, grease, and gloved/dusty fingers—large 48px touch targets, zero extraneous navigation, auto-refreshing state.

---

## 2. Personas & User Journeys

### Persona A: Anna (Shop Owner / Workshop Lead)
- **Environment:** Desktop workstation in the shop front office / showroom.
- **Needs:** Fast intake, global visibility over active orders, tracking overdue items, auditing model routing decisions, and splitting complex jobs across multiple crafts.
- **Key Pain Point:** Misrouted jobs waste days when pieces sit in the wrong bay before anyone notices.

### Persona B: Jonas (Craftsman / Master Carpenter)
- **Environment:** Mobile phone on a dusty workbench or workbench wall mount.
- **Needs:** Instant glanceability of his specific queue ("To do", "In progress", "Done"), quick one-tap job status updates, and clear warnings for shared tasks.
- **Key Pain Point:** Complex UI with small buttons or dense multi-column tables is unusable with dirty hands.

---

## 3. Product Architecture & Core Features

### 3.1. Natural Language Intake & Intelligent Routing Engine
1. **Freeform Memo Parsing:** Accepts unstructured order text from customer calls, walk-ins, or paper slips.
2. **Multi-Discipline Probability Scoring:** Computes distribution across four primary workshop bays:
   - **Carpentry** (Holzarbeiten, Korpus, Holzverbindungen)
   - **Upholstery** (Polsterung, Schaumstoff, Gurte, Stoffbezüge)
   - **Polish & Paint** (Oberflächen, Lackierung, Schellack, Beize)
   - **Metalwork** (Schlosserarbeiten, Beschläge, Gestelle)
3. **Explainability & Transparency ("Why it went there"):**
   - Displays contributing token associations (e.g. `veneer → Carpentry`, `foam → Upholstery`).
   - Visualizes horizontal probability distribution bars.
   - Flags low-confidence items (<60%) for human triage.
4. **Adaptive Learning Loop:** When the shop owner reassigns an order to another workshop, the action updates the local shop model weights.

### 3.2. Order Management & Triage Board (Desktop)
1. **At-a-Glance Operational Metrics:**
   - Open orders, Overdue count (highlighted in terracotta red), Waiting for review, and Completed this week.
2. **Shop Filter & Segmented Views:** Filter by execution status (`Open / Done / All`) and workshop bay counts.
3. **Structured Order Board:**
   - Clear tabular hierarchy with 1px hairline dividers.
   - Dual status dots: routing confidence (`Auto-routed`, `Check`, `Needs review`) and execution status (`Not started`, `In progress`, `Done`).
   - Left-edge visual alert bar and red timestamps on overdue items.
4. **Order Detail & Multi-Workshop Splitting:**
   - Support for split orders where multiple trades collaborate (e.g., Carpentry repairs veneer while Polish & Paint handles surface finishing).
   - Provenance history audit log tracking every automated and human touchpoint.

### 3.3. Workshop Staff Mobile Client (Mobile 390px)
1. **Single-Minded Queue:** Three dedicated tabs: `To do`, `In progress`, `Done`.
2. **Tactile Card Architecture:**
   - Minimum 48px hit areas for primary actions (`Start`, `Mark done`).
   - Immediate indicators for `Urgent`, `Overdue`, and `Shared with [Other Workshop]`.
3. **Auto-Synchronization:** Real-time push updates eliminating the need for manual refresh buttons.

---

## 4. Design System & Interaction Specifications

| Token / Element | Specification | Rationale |
| :--- | :--- | :--- |
| **Page Background** | `#F7F2E8` (Warm Paper) | Calming, reduces eye fatigue, tactile feel of paper order slips |
| **Card Surface** | `#FFFDF8` (Soft Ivory) | Crisp contrast against paper background without stark sterility |
| **Primary Ink** | `#2B221A` (Deep Walnut Bark) | High legibility, softer than harsh `#000000` |
| **Secondary Ink** | `#74675A` (Muted Warm Taupe) | Clear typographic hierarchy for metadata and labels |
| **Hairline Dividers**| `#E4D9C6` (1px solid) | Replaces drop shadows; maintains flat, architectural discipline |
| **Single Accent CTA**| `#7A4A2B` (Walnut) | Strictly exactly ONE filled button per screen to command focus |
| **Status Dots** | Done: `#4D6B35` · Progress: `#9A6A0E` · Review/Overdue: `#A8462A` | 8px discrete dots paired with text; zero bulky pills |
| **Typography** | Headings & Numbers: **Newsreader** (Serif)<br>UI Controls & Body: **Inter** (Sans) | Combines traditional bookbinding elegance with UI utility |
| **Geometry** | 14px radius on cards, 8px layout grid | Consistent tactile roundness without being bubble-like |

---

## 5. Screen Inventory & Existing Implementations

1. **`{{DATA:SCREEN:SCREEN_8}}` — Public Landing Page (Desktop 1440px):**
   - Hero headline, interactive live memo routing demo with probability bars, proof metrics ("Measured, not promised"), and pricing teaser.
2. **`{{DATA:SCREEN:SCREEN_6}}` — Shop Owner Order Board (Desktop 1440px):**
   - Persistent 240px navigation shell, high-level metrics, segmented filters, and 8-row order table with overdue and split-bay handling.
3. **`{{DATA:SCREEN:SCREEN_4}}` — Order Detail View (`#1031 · Sideboard`) (Desktop 1440px):**
   - 60/40 layout: Customer memo, multi-stage progress, reassignment controls, routing explainability bars, and historical event log.
4. **`{{DATA:SCREEN:SCREEN_2}}` — Workshop Staff View (Mobile 390px):**
   - Streamlined mobile interface for Jonas (Carpentry), 48px touch targets, urgent/shared flags, and single-tap workflow advancement.

---

## 6. Success Metrics & Roadmap

### Key Performance Indicators (KPIs)
- **Triage Latency:** Reduce intake-to-bench routing time from ~14 minutes to <15 seconds.
- **Routing Accuracy:** >95% first-pass accuracy on common repair queries; >99% post owner reinforcement.
- **Craftsman Adoption:** 100% daily check-in rate on mobile workbench view without supervisor intervention.

### Future Milestone Scope (v1.1 – v1.2)
- [ ] **Camera / Photo Intake:** Attach quick customer photo snaps of damaged furniture pieces directly to the intake card.
- [ ] **Offline Cache Mode:** Full service-worker offline caching for rural workshop bays with patchy Wi-Fi.
- [ ] **Voice Memo Dictation:** Speech-to-text intake for owners recording notes while holding measuring tape on site.
- [ ] **Materials & Inventory Tracker:** Deducting timber boards, shellac, and upholstery foam directly on task completion.
