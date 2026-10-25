# PROJECT_BIBLE.md — Canonical Source of Truth & Index

**Project:** OPD Saathi (ओपीडी साथी) — Smart Queue Management & Accessible Navigation for Government Hospitals  
**Event:** CachedInfo HackCache '26  
**Original Baseline Reference:** [`OPD_Saathi_Technical_Plan.md`](file:///d:/HackCached/OPD_Saathi_Technical_Plan.md) (preserved unmodified)  
**Last Updated:** 25 October 2026 (Phase 2.2 Voice-Assisted Registration, Kiosk Mode, Staff Department/Pending-Slip Controls, IST Daily Queue Scoping & Dark Mode Complete)

---

## 1. Purpose of This Document

`PROJECT_BIBLE.md` is the **single canonical index** for approved architectural decisions, shared constants/enums, database & API invariants, design-system tokens, and milestone verification status. Detailed specifications live in their dedicated files under [`docs/`](file:///d:/HackCached/docs) to prevent duplication and drift across the 2–3 member team.

### Documentation Suite Index

| Document | Scope & Authority |
| :--- | :--- |
| [`docs/PRD.md`](file:///d:/HackCached/docs/PRD.md) | Primary persona (Kamla), user stories, P0 vs P1 vs Deferred requirements, clinical safety & non-goals. |
| [`docs/ARCHITECTURE.md`](file:///d:/HackCached/docs/ARCHITECTURE.md) | Single-origin Render + Supabase topology, REST + post-commit Socket.IO flow, shared navigation design. |
| [`docs/TECH_STACK.md`](file:///d:/HackCached/docs/TECH_STACK.md) | Pinned dependencies, npm scripts, Vite/Express single-origin setup, and environment variables. |
| [`docs/FRONTEND.md`](file:///d:/HackCached/docs/FRONTEND.md) | NHS/WCAG/shadcn-inspired Design System, CSS tokens, `Noto Sans Devanagari` rules, native `<dialog>`, and 9 screen specs. |
| [`docs/BACKEND.md`](file:///d:/HackCached/docs/BACKEND.md) | Express middleware order, advisory-locked queue service, `TAIL_REQUEUE` algorithm, ETA formula, and error format. |
| [`docs/DATABASE.md`](file:///d:/HackCached/docs/DATABASE.md) | PostgreSQL DDL for all 7 tables, partial unique indexes, IST date rules, and strict CA-verified TLS config. |
| [`docs/API.md`](file:///d:/HackCached/docs/API.md) | Complete REST API contract, Zod schemas, rate limits, idempotency comparison rules, and Socket.IO contracts. |
| [`docs/MAP_NAVIGATION.md`](file:///d:/HackCached/docs/MAP_NAVIGATION.md) | 3-floor `hospitalGraph.json` schema, 19 canonical node IDs, bidirectional Dijkstra pathfinder, and 10-route matrix. |
| [`docs/PHASE_MAP.md`](file:///d:/HackCached/docs/PHASE_MAP.md) | Deadline-safe timeline, 2–3 member role split, Git branch workflow, and feature drop hierarchy. |
| [`docs/IMPLEMENTATION.md`](file:///d:/HackCached/docs/IMPLEMENTATION.md) | Local setup, database migration/seeding, team handoff guide, and Render + Supabase deployment runbook. |
| [`docs/TEAM_HANDOFF.md`](file:///d:/HackCached/docs/TEAM_HANDOFF.md) | Teammate onboarding, component responsibilities, frozen API/DB contracts, parallel branch assignments, and PR checklist. |
| [`docs/EDGE_CASES.md`](file:///d:/HackCached/docs/EDGE_CASES.md) | Lost-response recovery, concurrent race handling, `TAIL_REQUEUE` stability, stale socket recovery, hardware fallbacks. |
| [`docs/AUTH_SECURITY.md`](file:///d:/HackCached/docs/AUTH_SECURITY.md) | Staff PIN sessions, `trust proxy`, CSRF/Origin checks, `TICKET_TOKEN_SECRET` HMAC lifecycle, TLS, and log redaction. |

---

## 2. Frozen Architectural & Security Decisions

1. **Single-Origin Monolith on Render:** Express serves the compiled React/Vite SPA (`dist/`), REST API (`/api/*`), and Socket.IO (`/socket.io`) on a single origin, eliminating cross-origin cookie and WebSocket CORS failures.
2. **PostgreSQL as the Sole Source of Truth:** All queue state lives in Supabase PostgreSQL. Socket.IO emits post-commit invalidation hints only; clients always fetch state over REST on initial load and after reconnect.
3. **Strict Production Database TLS (`rejectUnauthorized: true`):**
   - Production connections require encrypted transport with strict CA and RFC 6125 hostname verification (`ssl: { rejectUnauthorized: true, ca }`) using the official Supabase Root CA certificate (`DATABASE_CA_CERT` or `DATABASE_CA_CERT_PATH`).
   - Query parameters in `DATABASE_URL` (such as `?sslmode=...`) are stripped before constructing `pg.Pool` so URL parameters can never downgrade the explicit `ssl` object.
   - Never silently fall back to `rejectUnauthorized: false` in production; missing CA configuration reports a `503` blocker (`tls_config_missing`).
4. **Dedicated `TICKET_TOKEN_SECRET` & Bounded Idempotent Recovery:**
   - Ticket capability tokens are derived via `HMAC-SHA256(TICKET_TOKEN_SECRET, "${ticket.id}:${ticket.request_id}")` encoded as 64-char lowercase `hex`.
   - Only `access_token_hash = SHA256(rawAccessToken)` (64-char lowercase `hex`) is stored in PostgreSQL; validation uses `crypto.timingSafeEqual` on decoded byte buffers.
   - Idempotent retry recovery (`POST /api/tickets` with the same UUID v4 `requestId`) serialises via `pg_advisory_xact_lock(hashtext('req:' || requestId))`, verifies that **all original payload fields** (`departmentId`, `visitType`, `preferredLang`, `avoidStairs`, and normalized patient identity fingerprint) match, and only re-issues `accessToken` within a **10-minute window** from `created_at` while `status === 'WAITING'`.
   - Capability tokens and patient PII are **never** placed in QR codes, URLs, public lookup responses (`GET /api/slips/:publicCode`), public boards, Socket.IO broadcasts, or logs. QR codes encode only `/my-turn?code=OPD-GEN-001` and public lookup uses `GET /api/slips/:publicCode`.
5. **Keyed Patient Identity & Same-Day Department Duplicate Prevention (Phase 1.3):**
   - Registration collects minimal non-clinical patient details (`patientName`, 10-digit Indian `phone` normalized and marked `phoneVerified: false`, `age`, optional `gender`, optional `registrationNumber`).
   - Server derives a keyed `identity_fingerprint = HMAC-SHA256(PATIENT_IDENTITY_SECRET, "${normalizedPhone}|${normalizedNameLower}|${ageYears}")` stored in `patients` and linked via `tickets.patient_id`.
   - Partial unique index `idx_tickets_unique_active_patient_dept ON tickets (patient_id, department_id, queue_date) WHERE patient_id IS NOT NULL AND status IN ('WAITING', 'CALLED', 'IN_CONSULTATION')` prevents duplicate active tickets for the same patient in the same department on the same IST hospital date (`409 DUPLICATE_ACTIVE_TICKET` with non-PII `details.existingTicket`, without incrementing `queue_counters` or `waitingCount`).
   - Capability-protected responses (`POST /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/cancel` with `X-Ticket-Token`) include masked `patientSummary` (`phoneMasked: '******3210'`, `phoneVerified: false`).
   - Browser storage (`opd_saved_slips_v1`) persists a multi-slip list with automatic migration from legacy `opd_active_ticket_v1`, allowing patients or family helpers to switch between multiple slips without losing previous tokens.
6. **Department-Day Queue Serialisation Lock:**
   - All queue mutations acquire `pg_advisory_xact_lock(hashtext('queue:' || department_id::text || ':' || queue_date::text))` inside a transaction before reading/locking `queue_counters` or `tickets` rows, backed by the partial unique index `idx_tickets_single_active`.
6. **Explicit `TAIL_REQUEUE` Policy via `queue_sort_order`:**
   - `sequence_no` and `public_code` are immutable ticket identifiers.
   - `queue_sort_order BIGINT NOT NULL` controls `WAITING` queue order. Requeuing a `NO_SHOW` or `CANCELLED` ticket sets `status = 'WAITING'` and `queue_sort_order = MAX(queue_sort_order) + 1` within `(department_id, queue_date)`, preserving existing waiting patients' positions and 3-ahead alerts.
7. **Clinical Safety & Pre-Registration Emergency Access:**
   - Persistent Emergency bar on every screen (`112`/`108`, warning signs, directions to `emergency_casualty`).
   - `POST /api/help-requests` works **with or without** registration/ticket capability and alerts all staff (`staff:all`) for human assessment without auto-reordering the routine queue.
8. **Healthcare Design System:**
   - Tailwind CSS + CSS theme tokens (`#0B2545` deep navy, `#0D6E6E` clinical teal, `#F4F7FA` neutral canvas, `#B91C1C` restrained emergency red), `Noto Sans` + `Noto Sans Devanagari` typography, `lucide-react` icons, native HTML `<dialog>` modals, and $\ge 44 \times 44\text{ CSS px}$ ($\ge 56\text{px}$ primary) touch targets tested at `360px`, `375px`, `768px`, and desktop widths.

---

## 3. Canonical Enums & Shared Constants

| Constant Group | Allowed Values |
| :--- | :--- |
| **Languages (`P0`)** | `'en'`, `'hi'` (`'ta'` reserved in schema for P1) |
| **Ticket `status`** | `'WAITING'`, `'CALLED'`, `'IN_CONSULTATION'`, `'COMPLETED'`, `'NO_SHOW'`, `'CANCELLED'` |
| **Ticket `visit_type`** | `'FIRST_VISIT'`, `'FOLLOW_UP'` |
| **Ticket `cancel_reason`** | `'PATIENT_LEFT'`, `'WRONG_DEPARTMENT'`, `'DUPLICATE'`, `'OTHER'` |
| **Doctor `status`** | `'AVAILABLE'`, `'ON_BREAK'`, `'DELAYED'`, `'UNAVAILABLE'` |
| **Urgent Flag `request_type`** | `'STAFF_HELP'`, `'URGENT_ASSESSMENT_REQUEST'` |
| **Urgent Flag `status`** | `'NEW'`, `'ACKNOWLEDGED'`, `'RESOLVED'` |
| **Navigation Edge `mode`** | `'corridor'`, `'lift'`, `'stairs'`, `'ramp'` |
| **Hospital Timezone** | `'Asia/Kolkata'` (SQL: `(NOW() AT TIME ZONE 'Asia/Kolkata')::date`) |

---

## 4. Requirements Priority & Milestone Status Tracker

Status Legend:
- `Proposed` — Specified in documentation, not yet implemented.
- `Implemented` — Code/configuration written in workspace.
- `Locally Tested` — Verified via local build, automated tests (`npm test`), and local HTTP smoke checks.
- `Production Verified` — Verified against live Supabase PostgreSQL and public Render URL.

| Milestone / Deliverable | Tier | Current Status | Verification Evidence |
| :--- | :---: | :---: | :--- |
| **Stage 1–2: Architecture & Technical Decisions Frozen** | **P0** | `Implemented` | Documented in `PROJECT_BIBLE.md` & `docs/*` |
| **Stage 3: Complete Documentation Suite (13 files)** | **P0** | `Implemented` | `PROJECT_BIBLE.md` + 12 files in `docs/` |
| **Phase 0.1: Git Repo, `.gitignore`, `.env.example`, `README.md`** | **P0** | `Locally Tested` | Git initialized on `main`, initial commit verified |
| **Phase 0.2: React/Vite + Express Single-Origin Skeleton** | **P0** | `Locally Tested` | `npm run build` + single-origin static & API serving |
| **Phase 0.3: Foundational Healthcare Theme Tokens (DS-0)** | **P0** | `Locally Tested` | Navy/Teal/Neutral tokens + `Noto Sans Devanagari` configured |
| **Phase 0.4: SQL Migration (`001_init.sql`) & Seed (`seed.js`)** | **P0** | `Locally Tested` | Schema DDL & idempotent seed script syntax/unit verified |
| **Phase 0.5: `/api/health` & Strict Production TLS Guard** | **P0** | `Locally Tested` | `npm test` (`server/test/health.test.js`) passing |
| **Phase 0.6: Live Supabase DB & Render Public Deployment** | **P0** | `Proposed` | Awaiting user's Supabase `DATABASE_URL`, `DATABASE_CA_CERT`, and Render connection |
| **Phase 1 Checkpoint A: Backend Queue, Ticket Engine, Navigation & Socket.IO** | **P0** | `Locally Tested` | `server/services/queueService.js`, `shared/navigation/pathfinder.js`, `server/sockets/index.js` (`39/39` tests pass) |
| **Phase 1 Checkpoint B: Patient Registration & Digital OPD Slip UI** | **P0** | `Locally Tested` | Bilingual (`EN`/`HI`) + Assisted Mode, 3-step registration with `sessionStorage` idempotent recovery, `SlipView.jsx` with QR, Read Aloud & Print |
| **Phase 1 Checkpoint C: Staff Session Auth & Queue Controls** | **P0** | `Locally Tested` | `StaffView.jsx` PIN login, `Call Next`, `Start`, `Complete`, `No-Show`, `Cancel`, `Requeue to Tail`, Doctor Status & Urgent Flags |
| **Phase 1 Checkpoint D: Live `My Turn`, 3-Floor Navigation & Pre-Reg Emergency** | **P0** | `Locally Tested` | `MyTurnView.jsx` (`GET /api/slips/:publicCode` + $\le 3$ ahead alert), `NavigationView.jsx` (`Avoid Stairs`), `EmergencyModal.jsx` |
| **Phase 1 Checkpoint E: End-to-End Verification & Teammate Handoff** | **P0** | `Locally Tested` | `npm run build` + `npm test` (`42/42` passing across 4 suites) + `docs/TEAM_HANDOFF.md` on branch `feature/phase-1-core-flow` |
| **Phase 1.2: UI Stabilisation & Contrast Verification** | **P0** | `Locally Tested` | WCAG AA contrast fixes, hero/card surface adjustments, verified across desktop & mobile viewports |
| **Phase 1.3: Patient Identity, Duplicate Prevention & Persistent Multi-Slip Management** | **P0** | `Locally Tested` | `002_patient_identity_and_duplicates.sql`, keyed HMAC `identity_fingerprint`, `409 DUPLICATE_ACTIVE_TICKET`, composite rate limiter, `opd_saved_slips_v1` multi-slip switcher (`51` passing tests) |
| **Phase 2+: P1 Stretch (PWA Offline Cache, Tamil, SVG Map, Voice, Multi-Counter)** | **P1** | `Locally Tested` | Trilingual (`EN`/`HI`/`TA`), 3-Floor SVG Map, Voice-Assisted Registration, Kiosk Mode, Staff Dept/Pending Slips, IST Daily Queue Scoping & Warm Espresso Dark Mode (`78` passing tests) |
