# Phase Map, Team Allocation & Git Workflow — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Deadline Strategy & Critical Path

Because published event materials conflict between **Saturday, 24 Oct 2026 at 23:59 IST** and **Sunday, 25 Oct 2026 at 21:30 IST**, the team schedules **all P0 MVP work to reach code freeze by Saturday 18:30 IST**, leaving a protected 4-hour window for demo recording, pitch deck completion, and early submission before Saturday midnight. If organisers confirm the Sunday 21:30 IST deadline, Sunday is used strictly for low-risk verification and optional P1 enhancements on a separate branch.

---

## 2. Phase-by-Phase Execution Roadmap

| Phase | Target Window (IST) | Core Deliverables | Verification Gate |
| :--- | :--- | :--- | :--- |
| **Phase 0: Skeleton, Docs, Theme Tokens & DB Health** *(Current Scope)* | Fri 23:00 – Sat 01:00 (2h) | `PROJECT_BIBLE.md` + 12 `docs/*.md`, Git repo on `main`, Vite + Express single-origin skeleton, DS-0 healthcare CSS tokens & `Noto Sans Devanagari`, `001_init.sql` + `seed.js`, `/api/health` with strict production TLS guard, Phase 0 tests. | `npm run build` and `npm test` pass; `/api/health` returns `200` when DB connected and `503` when unavailable; unknown `/api/*` returns JSON `404`. |
| **Phase 1: Core API, UI Primitives (DS-1) & Registration** | Sat 01:00 – Sat 04:30 (3.5h) | Time-boxed 45-min DS-1 primitives (`Button`, `Card`, `Badge`, `Alert`, `Input`, native `<dialog>`), `LanguageContext` (`en`/`hi`), `POST /api/tickets` (advisory lock + HMAC token), Home screen, Emergency `<dialog>`, and 4-step Registration Wizard. | Concurrent ticket creation, idempotent retry, and 360px registration wizard tests pass. |
| **Phase 2: OPD Slip, My Turn & Real-Time Sync** | Sat 04:30 – Sat 08:30 (4h) | OPD Slip (`qrcode.react`, `@media print`, Large Text, Read Aloud), `GET /api/tickets/:id` & `GET /api/slips/:publicCode`, Socket.IO room subscriptions, My Turn live tracker with $\le 3$-ahead threshold alert and stale-state indicator. | Patient slip and My Turn update within ~1s when queue state changes; 3-ahead alert fires once on threshold crossing. |
| **Rest / Staggered Rotation** | Sat 08:30 – Sat 12:00 (3.5h) | Push stable tag `v0.2-patient-mvp` to `main` before rest block. | `main` branch green and deployable. |
| **Phase 3: Staff Dashboard, Public Board & Urgent Flags** | Sat 12:00 – Sat 15:30 (3.5h) | Staff PIN login (`express-session` + `connect-pg-simple`), Staff Dashboard (`call-next`, `start`, `complete`, `no-show`, `cancel`, `TAIL_REQUEUE`, `doctor-status`), pinned Urgent Assessment Queue (`POST /api/help-requests` + Acknowledge/Resolve), and Public Queue Board (`/board`). | Two concurrent `Call Next` calls result in one `200` and one `409`; `TAIL_REQUEUE` preserves waiting patients' positions; non-staff calls receive `401/403`. |
| **Phase 4: 3-Floor Navigation, QA & Code Freeze** | Sat 15:30 – Sat 18:30 (3h) | Shared 19-node `hospitalGraph.json` + bidirectional Dijkstra pathfinder, *"I Have My Slip"* and *"Find a Department / Help Desk"* screens, 10-route verification matrix, 360px/375px/768px/desktop check, production Render verification. | **Code Freeze (`v1.0-mvp`).** All P0 acceptance tests and 10 navigation routes pass. |
| **Phase 5: Submission Artefacts** | Sat 18:30 – Sat 22:30 (4h) | Final `README.md`, 7-slide pitch deck, 3–4 min demo video showing cross-device updates, incognito link audit, and submission. | Public repo, live Render URL, deck, and video verified in an incognito browser. |

---

## 3. Team Work Allocation (2–3 Members)

| Role | Primary Ownership | Feature Branches Owned |
| :--- | :--- | :--- |
| **Member 1 (Lead / Backend, DB & Integration Owner)** | Phase 0 skeleton, Supabase migrations/seeds, `queueService.js`, `ticketTokenService.js`, Staff session auth, Socket.IO server, Render deployment, and merging PRs to `main`. | `main` (integration), `feat/backend-queue-api`, `feat/realtime-sockets` |
| **Member 2 (Patient UI, Design System & i18n)** | DS-1 UI primitives (`src/components/ui/`), `en.json`/`hi.json` translations, Home page, Registration Wizard, OPD Slip (QR, Print, Read Aloud), and My Turn page. | `feat/ui-primitives-i18n`, `feat/patient-registration-slip`, `feat/my-turn-tracker` |
| **Member 3 (Navigation, Staff/Public UI & QA)** *(or split between M1 & M2 in a 2-person team)* | `shared/navigation/` graph & 10-route tests, *"I Have My Slip"* & *"Find a Department"*, Staff Dashboard UI, Public Queue Board (`/board`), Emergency `<dialog>`, and Demo Video/Deck. | `feat/hospital-navigation`, `feat/staff-and-public-board`, `docs/submission-artefacts` |

---

## 4. Git Branching & Collaboration Rules

1. **`main` is Always Deployable:** Never force-push or commit broken code directly to `main`. Render auto-deploys from `main`.
2. **Feature Branch Workflow:**
   ```powershell
   git checkout main
   git pull origin main
   git checkout -b feat/<short-task-name>
   # Make changes, then verify before pushing:
   npm test
   npm run build
   git push -u origin feat/<short-task-name>
   ```
3. **File Ownership Boundaries:**
   - Do not modify `server/db/migrations/001_init.sql` or `PROJECT_BIBLE.md` on a feature branch without coordinating with the Integration Owner (Member 1).
   - Frontend teammates consume the exact JSON contracts documented in [`docs/API.md`](file:///d:/HackCached/docs/API.md) rather than inventing divergent mock state shapes.

---

## 5. Deadline-Safe Feature Drop Hierarchy

If any milestone slips by more than 45 minutes:
1. **Drop Immediately (Zero Impact on P0 Score):** Render Workflows bonus, Tamil (`ta`) translation, microphone speech input, offline pending-registration queue, Service Worker caching, and schematic 2D SVG map.
2. **Simplify if Needed:** Keep manual token input (`OPD-GEN-001`) + clickable sample tokens on *"I Have My Slip"* rather than debugging mobile camera permissions for QR scanning.
3. **Never Compromise:** English + Hindi UI, atomic ticket creation, OPD slip, live queue updates, 3-floor Avoid-Stairs text navigation, pre-registration Emergency & human-assessed urgent flags, server-side staff auth, and public Render deployment.
