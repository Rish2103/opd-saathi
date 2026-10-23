# TEAM_HANDOFF.md — Teammate Onboarding, Frozen Contracts & Parallel Feature Guide

**Project:** OPD Saathi (ओपीडी साथी)  
**Baseline Branch:** `feature/phase-1-core-flow` (Phase 1 Core Application + Phase 1.1 Release Hardening)  
**Protected Integration Branch:** `main` (Phase 0 baseline until live Supabase + Render release gates pass)

---

## 1. What Is Already Complete & Verified

The core end-to-end OPD Saathi application is implemented and locally verified (`42/42` automated tests passing across 4 test suites, zero Vite build errors):

1. **Patient Registration & Digital OPD Slip (`src/components/RegisterView.jsx`, `src/components/SlipView.jsx`):**
   - 3-step guided registration (Department $\rightarrow$ Visit Type + `Avoid Stairs` $\rightarrow$ Confirm).
   - Pending `requestId` saved in `sessionStorage` before network submission so lost-response retries recover the exact same ticket without duplicates (`200 OK` replay within 10 minutes while `WAITING`).
   - Printable Digital OPD Slip with `OPD-<PREFIX>-<SEQ>` token code, live people-ahead count, Now Serving token, rule-based ETA, destination room + landmark, QR code (`/my-turn?code=OPD-GEN-001`), and browser SpeechSynthesis Read Aloud.
2. **Live Queue Board & `My Turn` Tracker (`src/components/HomeView.jsx`, `src/components/MyTurnView.jsx`):**
   - Multi-department live queue summary on the Home screen.
   - Public token lookup (`GET /api/slips/:publicCode`) that works from any phone without exposing `accessToken`, `access_token_hash`, or `requestId`.
   - Automatic Socket.IO room subscriptions (`queue:<deptId>`, `ticket:<id>`) with REST resync on reconnect and a high-contrast alert banner when $\le 3$ patients are ahead or when `status === 'CALLED'`.
3. **3-Floor Accessible Hospital Navigation (`shared/navigation/pathfinder.js`, `src/components/NavigationView.jsx`):**
   - Shared 19-node, 3-floor hospital graph (`shared/navigation/hospitalGraph.json`) and bidirectional Dijkstra pathfinder.
   - `Avoid Stairs` toggle excludes all `mode: 'stairs'` edges and routes exclusively via ramps and the Main Patient Lift (`lift_f1` $\leftrightarrow$ `lift_f2` $\leftrightarrow$ `lift_f3`).
   - Works both online (`GET /api/routes`) and offline in the browser.
4. **Pre-Registration Emergency & Triage Help (`src/components/EmergencyModal.jsx`):**
   - Persistent top Emergency bar on every screen (`108` / `112` one-tap links, Room 101 Ground Floor Casualty directions, and `POST /api/help-requests` that works before registration and alerts staff for human assessment without auto-reordering the medical queue).
5. **Staff PIN Authentication & Queue Control Desk (`src/components/StaffView.jsx`):**
   - Server-side `httpOnly` session cookie (`POST /api/staff/session`) with environment-controlled PIN (`STAFF_DEMO_PIN_HASH`), rate limiting, and CSRF `Origin` enforcement.
   - Atomic `Call Next`, `Start Consultation`, `Complete`, `Mark No-Show`, `Cancel` (with reason), `Requeue to Tail` (`TAIL_REQUEUE`), Doctor Status/Delay broadcast, and Urgent Help Request acknowledgement/resolution.

---

## 2. Folder & Component Responsibilities

| Path | Responsibility | Safe to Edit in Parallel? |
| :--- | :--- | :--- |
| `src/components/HomeView.jsx` | Public landing screen & live multi-department queue cards | Yes (`feature/accessibility-i18n`) |
| `src/components/RegisterView.jsx` | 3-step OPD registration form & `sessionStorage` retry recovery | Coordinate before editing |
| `src/components/SlipView.jsx` | Digital OPD Slip, QR display, Read Aloud, Print layout | Yes (`feature/accessibility-i18n`) |
| `src/components/MyTurnView.jsx` | Public token lookup (`GET /api/slips/:publicCode`) & $\le 3$ ahead alert | Yes (`feature/accessibility-i18n`) |
| `src/components/NavigationView.jsx` | 3-floor route selector, `Avoid Stairs` toggle, step-by-step landmark cards | Yes (`feature/navigation-polish`) |
| `src/components/StaffView.jsx` | Staff PIN login, queue mutation buttons, doctor status, urgent flags | Yes (`feature/staff-dashboard-polish`) |
| `src/components/EmergencyModal.jsx` | Native `<dialog>` emergency warning & pre-registration help request | Coordinate before editing |
| `src/i18n/translations.js` | Bilingual (`en`, `hi`) UI copy dictionary | Yes (additive keys only) |
| `shared/navigation/*` | Canonical 19-node `hospitalGraph.json` & `pathfinder.js` | Do not rename canonical node IDs |
| `server/services/queueService.js` | Transactional queue state machine, advisory locks, `TAIL_REQUEUE`, ETA | **Frozen Core — Do not break contracts** |
| `server/db/migrations/001_init.sql` | PostgreSQL schema DDL for all 7 tables | **Frozen Core — Additive migrations only** |

---

## 3. Frozen API, Database & Security Contracts (Do Not Break)

1. **Database Tables & Columns (`server/db/migrations/001_init.sql`):**
   - Do not rename or drop columns on `departments`, `queue_counters`, `tickets`, `doctor_status`, `urgent_flags`, `staff_sessions`, or `queue_events`.
   - Preserve `queue_sort_order BIGINT NOT NULL` and the partial unique index `idx_tickets_single_active`.
2. **REST Endpoint Paths & Response Shapes (`docs/API.md`):**
   - `POST /api/tickets` $\rightarrow$ `{ ticket, accessToken, idempotentReplay }`
   - `GET /api/slips/:publicCode` $\rightarrow$ `{ slip }` (must **never** include `accessToken`, `access_token_hash`, or `requestId`)
   - `GET /api/tickets/:id` (requires `X-Ticket-Token`) $\rightarrow$ `{ ticket }`
   - `GET /api/routes?from=<nodeId>&to=<nodeId>&avoidStairs=true|false` $\rightarrow$ `{ route }`
   - `POST /api/help-requests` $\rightarrow$ `{ helpRequest }`
   - `POST /api/staff/session`, `GET /api/staff/queues/:departmentId`, `POST /api/staff/queues/:departmentId/call-next`, `POST /api/staff/tickets/:id/:action`
3. **Socket.IO Events (`server/sockets/index.js`):**
   - Room names (`queue:<deptId>`, `queue:all`, `ticket:<ticketId>`, `staff:all`) and event names (`queue.updated`, `ticket.updated`, `doctor.status.updated`, `urgent.flagged`, `urgent.updated`) are frozen.
4. **Canonical Navigation Node IDs (`shared/navigation/hospitalGraph.json`):**
   - The 19 node IDs (`main_entrance`, `registration_desk`, `emergency_casualty`, `room_204_med`, `room_302_ort`, `room_208_ped`, `room_305_eye`, `pharmacy_f1`, `lab_f2`, etc.) are referenced by database seed foreign keys and tests—do not rename them.
5. **Security Invariants:**
   - Never hardcode or display the staff PIN in frontend code (`src/`).
   - Never weaken `rejectUnauthorized: true` in `server/config/db.js`.
   - Never commit `.env`, `.crt`/`.pem` files, or real credentials.

---

## 4. Recommended Parallel Tasks for Teammates

Once `feature/phase-1-core-flow` is pushed (or merged to `main` after live verification), teammates can work in parallel on isolated branches with zero merge conflicts:

| Branch Name | Owner Focus | Safe Scope & Deliverables |
| :--- | :--- | :--- |
| `feature/navigation-polish` | **Teammate 1 (Navigation & Map Visuals)** | Add an interactive 3-floor SVG schematic floor map inside `src/components/NavigationView.jsx` highlighting the active path (`route.steps`) and floor transitions (`Floor 1`, `Floor 2`, `Floor 3`). |
| `feature/staff-dashboard-polish` | **Teammate 2 (Staff Desk UX & Audio Bell)** | Add optional desk call-bell chime (`Web Audio API`), keyboard shortcuts for `Call Next`, filterable history tabs, and counter summary badges in `src/components/StaffView.jsx`. |
| `feature/accessibility-i18n` | **Teammate 3 (Accessibility, Print & Localization)** | Add optional Tamil (`ta`) dictionary entries in `src/i18n/translations.js`, enhanced `@media print` thermal-slip styling in `src/index.css`, and audio announcement controls on `MyTurnView.jsx`. |

---

## 5. How to Branch, Commit, Push & Open a Pull Request

```powershell
# 1. Clone the repository and install dependencies
git clone https://github.com/<org-or-user>/opd-saathi.git
cd opd-saathi
npm install

# 2. Create your local .env from the template (NEVER commit .env)
Copy-Item .env.example .env

# 3. Fetch latest branches and create your feature branch from the Phase 1 baseline
git fetch origin
git checkout feature/phase-1-core-flow
git pull origin feature/phase-1-core-flow
git checkout -b feature/<your-branch-name>

# 4. Run development server (Vite + Express)
npm run dev

# 5. Before committing, run all required verification gates
npm test
npm run test:db
npm run build

# 6. Check git status to ensure .env or certs are NOT staged
git status

# 7. Commit and push your branch, then open a Pull Request on GitHub
git add <your-modified-files>
git commit -m "feat(<scope>): <concise summary>"
git push -u origin feature/<your-branch-name>
```

---

## 6. Required Pre-Merge Checklist

Every Pull Request must pass these checks before merging into `main`:
- [ ] `npm test` passes (`100%` of unit, security, and integration tests pass).
- [ ] `npm run test:db` passes (SQL advisory-lock contract + live PostgreSQL concurrency when `DATABASE_URL` is set).
- [ ] `npm run build` succeeds with zero Vite/Rollup errors.
- [ ] `git status --ignored -s` confirms `.env` and certificate files remain untracked.
- [ ] No staff PIN, secret key, or capability token is exposed in `src/`, URLs, QR codes, or public lookup responses.
