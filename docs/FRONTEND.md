# Frontend & Design System Specification — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Design System & Accessibility Foundations (NHS / WCAG AA Inspired)

1. **Color Tokens (`src/styles/index.css` & `tailwind.config.js`):**
   - `--bg-canvas` (`#F4F7FA`): Low-glare soft slate canvas.
   - `--bg-surface` (`#FFFFFF`): High-contrast card surface.
   - `--brand-primary` (`#0B2545`): Authoritative public-health deep navy.
   - `--brand-teal` (`#0D6E6E`): Clinical teal accent.
   - `--status-serving` (`#15803D`): Active/Now Serving green.
   - `--status-next` (`#B45309`): Upcoming/Warning amber.
   - `--status-emergency` (`#B91C1C`): Restrained clinical emergency red (used exclusively for Emergency & Urgent Help).
   - `--focus-ring` (`#FFBF47`): NHS-inspired 3px high-visibility keyboard focus ring with dark outer shadow.
   - **Warm Espresso Dark Mode (`[data-theme="dark"]`):** High-contrast dark palette (`--bg-canvas: #16120f`, `--bg-surface: #211b17`, `--bg-subtle: #2d251f`, `--text-primary: #faf6f0`, `--brand-primary-text: #faf6f0`) with full overrides for Tailwind opacity utilities (`bg-subtle/*`, `bg-surface/*`) and semantic status surfaces (`emerald`, `amber`, `red`).
2. **Bilingual Typography (`English` + `हिन्दी`):**
   - Primary UI font: `'Noto Sans', 'Noto Sans Devanagari', system-ui, sans-serif`.
   - Token / Room / Queue numbers: `'JetBrains Mono', monospace` with `tabular-nums`.
   - When `lang="hi"` is active, `line-height: 1.65` and `letter-spacing: 0` prevent clipping of Devanagari upper/lower matras at `360px` width.
3. **Assisted Mode (`data-assisted="true"`):**
   - Scales base root font size by `1.15x`, increases minimum touch targets to `56px`, and strengthens card border contrast (`#0F172A`).
4. **Native HTML `<dialog>` Emergency Modal:**
   - Accessible from the persistent top bar on every screen (including before registration).
   - Uses `.showModal()` for native focus trapping and `Escape` dismissal, displaying warning signs, `108` / `112` links, step-by-step directions to `emergency_casualty`, and a **"Request Staff Help"** trigger (`POST /api/help-requests`) with a clear disclaimer that digital alerts do not replace physical clinical triage.

---

## 2. Core Application Views & Data Flows

| Screen / View | Route / Tab | REST & Realtime Contract |
| :--- | :--- | :--- |
| **1. Patient Home & Registration Wizard** | `/` or `/register` | Step-by-step wizard: Language (`en`/`hi`) $\rightarrow$ Department (`GET /api/departments`) $\rightarrow$ Visit Type (`FIRST_VISIT`/`FOLLOW_UP`) & Mobility (`avoidStairs`, default `true`) $\rightarrow$ Review & Submit (`POST /api/tickets` with `sessionStorage` `requestId` persistence for lost-response retry). |
| **2. Digital OPD Slip** | `/slip` | Renders `public_code` (`OPD-GEN-001`), department, doctor, room, floor, landmark, live status, people ahead, estimated wait (labelled clearly as an estimate), non-secret QR code (`/my-turn?code=OPD-GEN-001`), Large Text toggle, Read Aloud (`window.speechSynthesis`), Print (`window.print()`), and accessible route directions. Uses `GET /api/tickets/:id` (`X-Ticket-Token`) when capability token is present in `localStorage`, or falls back to `GET /api/slips/:publicCode`. |
| **3. My Turn & Slip Lookup** | `/my-turn` | Cross-device public token lookup (`GET /api/slips/:publicCode`). Shows Now Serving token, patient status, people ahead, estimated wait, connection status (`Live` / `Reconnecting` / `Offline — Stale`), and fires a one-time **$\le 3$ people ahead** alert banner with threshold deduplication in `localStorage`. Subscribes to `queue:<departmentId>` Socket.IO invalidation events. |
| **4. Staff Queue Controls** | `/staff` | PIN login (`POST /api/staff/session`), department queue selector (`GET /api/staff/queues/:departmentId`), `Call Next`, `Start Consultation`, `Complete`, `Mark No-Show`, `Cancel`, and `Requeue` (`TAIL_REQUEUE`), plus doctor status selector and pinned Urgent Assessment requests (`GET /api/staff/urgent-flags`, `acknowledge`, `resolve`). |
| **5. Public Queue Board** | `/board` | Multi-department waiting room display (`GET /api/queues/public-board`) subscribed to `queue:all`. |
