# OPD Saathi (ओपीडी साथी)

**Smart Queue Management and Accessible Indoor Navigation for Government Hospitals**  
*Built for CachedInfo HackCache '26*

> **Synthetic Demonstration Notice:** OPD Saathi uses fictional hospital data (**City District Hospital**) and stores **zero patient PII** (no names, phone numbers, government IDs, or diagnoses). It never performs automated medical triage; emergencies are immediately directed to Casualty (`112` / `108`) and human staff assessment.

---

## 1. Current Implementation Status (Phase 2.1 Hackathon Release)

- **`main` (`4646bfb`):** Stable Phase 0 baseline (documentation suite, PostgreSQL schema/seed scripts, Express/Vite single-origin skeleton, strict TLS health check).
- **`feature/phase-1-core-flow` (`df11056`):** Complete Phase 1 working core application + Phase 1.1 security hardening and teammate handoff.
- **`feature/phase-2-signature-experience`:** Complete Phase 2.1 signature experience, interactive wayfinding, trilingual accessibility, and test-isolation safeguards:
  - **Trilingual Accessibility (`EN` / `HI` / `TA`) & Assisted Mode:** Seamless language switching across English, Hindi (`हिंदी`), and Tamil (`தமிழ்`) with `Noto Sans Devanagari` and `Noto Sans Tamil` web fonts, plus one-tap `Large Text` high-contrast assisted mode.
  - **Interactive 3-Floor SVG Hospital Map & Voice Wayfinding:** Schematic 3-floor SVG floorplan (`Floor 1`, `Floor 2`, `Floor 3`) driven by the shared 19-node hospital graph (`shared/navigation/hospitalGraph.json`) and bidirectional Dijkstra pathfinder. Supports clickable rooms, `Start Here` / `Go Here` selection, active route highlighting, `Avoid Stairs` lift/ramp filtering, and step-by-step `SpeechSynthesis` voice directions (`en-IN`, `hi-IN`, `ta-IN`).
  - **Patient Registration & Print-Ready Digital OPD Slip:** 3-step registration with `sessionStorage` idempotent retry recovery (`10`-minute window), multi-slip persistence, QR code (`/my-turn?code=OPD-GEN-001`), SpeechSynthesis Read Aloud, and print-ready layout containing the token, destination landmark, and step-by-step route instructions.
  - **Live Queue Board, `My Turn` Tracker & Audio Chimes:** Public lookup (`GET /api/slips/:publicCode`) with rate limiting, Socket.IO room invalidations (`queue:<deptId>`, `ticket:<id>`), and Web Audio API synthesized chimes (`Sound Alerts On/Off`, `Test Alert`) when $\le 3$ patients remain ahead or when `CALLED`.
  - **Pre-Registration Emergency & Triage Help:** Persistent Emergency bar (`108` / `112`), Room 101 Ground Floor Casualty routing, and `POST /api/help-requests` alerting staff (`staff:all`) for human assessment.
  - **Staff PIN Desk, Urgent Audio Alerts & Recent Activity Log:** Environment-controlled PIN authentication (`STAFF_DEMO_PIN_HASH`), `httpOnly` sessions, CSRF `Origin` checks, `Call Next`, `Start`, `Complete`, `No-Show`, `Cancel`, `Requeue to Tail` (`TAIL_REQUEUE`), Doctor Status/Delay broadcast, urgent help-request audio chimes, and a live recent queue-activity history log.
  - **Verification:** `55 passed | 1 skipped` (`56 total`) automated tests in `npm test` using isolated in-memory stores (`forceInMemory: true` so default tests never mutate `DATABASE_URL`). Live PostgreSQL concurrency tests (`npm run test:db`) are guarded and intentionally skip unless a dedicated `TEST_DATABASE_URL` is configured. Zero Vite production build errors (`npm run build`).

---

## 2. Documentation, Pitch Deck & Source of Truth

- **[`docs/PITCH_AND_DEMO.md`](./docs/PITCH_AND_DEMO.md):** **Hackathon Pitch Deck (6-slide outline) & 5-Minute Live Demo Script** — problem framing, signature features, architecture, and transparent disclosure of simulated vs. production scope.
- **[`PROJECT_BIBLE.md`](./PROJECT_BIBLE.md):** Canonical index of approved decisions, shared enums, database invariants, and milestone status.
- **[`docs/TEAM_HANDOFF.md`](./docs/TEAM_HANDOFF.md):** **Start here for teammates** — component ownership, frozen contracts, parallel branches, and PR checklist.
- **[`OPD_Saathi_Technical_Plan.md`](./OPD_Saathi_Technical_Plan.md):** Original baseline technical plan (preserved unmodified).
- **Detailed Specifications (`docs/`):**
  - [`docs/PRD.md`](./docs/PRD.md) — Persona (Kamla, 62), user journeys, P0 vs P1 scope.
  - [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Single-origin Render + Supabase topology & data flow.
  - [`docs/TECH_STACK.md`](./docs/TECH_STACK.md) — Dependencies, scripts, and environment variables.
  - [`docs/FRONTEND.md`](./docs/FRONTEND.md) — Healthcare design system, CSS tokens, `Noto Sans Devanagari` typography, and screen specs.
  - [`docs/BACKEND.md`](./docs/BACKEND.md) — Express pipeline, advisory-locked queue service, `TAIL_REQUEUE`, and ETA formula.
  - [`docs/DATABASE.md`](./docs/DATABASE.md) — PostgreSQL DDL, partial unique indexes, IST date rules, and verified TLS.
  - [`docs/API.md`](./docs/API.md) — REST contracts, Zod schemas, rate limits, and Socket.IO room authorization.
  - [`docs/MAP_NAVIGATION.md`](./docs/MAP_NAVIGATION.md) — 3-floor, 19-node hospital graph, bidirectional Dijkstra, and Avoid Stairs filter.
  - [`docs/PHASE_MAP.md`](./docs/PHASE_MAP.md) — Team roles, branch workflow, and deadline-safe drop hierarchy.
  - [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) — Local bootstrap, GitHub setup, and Render deployment runbook.
  - [`docs/EDGE_CASES.md`](./docs/EDGE_CASES.md) — Concurrency, lost-response recovery, and browser permission fallbacks.
  - [`docs/AUTH_SECURITY.md`](./docs/AUTH_SECURITY.md) — Staff PIN sessions, `TICKET_TOKEN_SECRET` HMAC lifecycle, and log redaction.

---

## 3. Quick Start & Local Setup

### Prerequisites
- **Node.js:** `>=20.0.0` (verified on `v24.20.0`)
- **npm:** `>=10.0.0`
- **Database:** Supabase PostgreSQL project (or local PostgreSQL `>=15`). When `DATABASE_URL` is unset in non-production environments, the server runs using its advisory-locked local development store so frontend and integration work can proceed offline.

### 1. Clone & Install
```powershell
git clone https://github.com/<your-username>/opd-saathi.git
cd opd-saathi
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (**never commit `.env`**):
```powershell
Copy-Item .env.example .env
```

Populate `.env` with:
- `DATABASE_URL`: Copy the exact **Session Pooler (IPv4)** connection string from **Supabase Dashboard $\rightarrow$ Connect $\rightarrow$ Session Pooler**.
- `DATABASE_SSL_MODE`: `verify-full` (or `disable` only if testing against a local non-TLS PostgreSQL instance in development).
- `DATABASE_CA_CERT` or `DATABASE_CA_CERT_PATH`: Download the Supabase Root CA certificate (`.crt`) from **Supabase Dashboard $\rightarrow$ Project Settings $\rightarrow$ Database $\rightarrow$ SSL Configuration** and place it in `./certs/prod-ca-2021.crt` (git-ignored) or paste the PEM string into `DATABASE_CA_CERT`.
- `SESSION_SECRET` & `TICKET_TOKEN_SECRET`: Two distinct 64-character hex secrets:
  ```powershell
  node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('TICKET_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'));"
  ```
- `STAFF_DEMO_PIN_HASH`: Bcrypt hash of your chosen staff desk PIN (production rejects missing hashes and weak defaults like `1234` or `0000`):
  ```powershell
  node -e "require('bcryptjs').hash('<YOUR_STRONG_STAFF_PIN>', 10).then(h => console.log('STAFF_DEMO_PIN_HASH=' + h))"
  ```

### 3. Run Database Migrations & Seed Data (When `DATABASE_URL` Is Configured)
```powershell
npm run db:migrate
npm run db:seed
```

### 4. Start Development Servers
```powershell
npm run dev
```
- **Frontend (Vite):** `http://localhost:5173` (proxies `/api` and `/socket.io` to `:3000`)
- **Backend API & Health:** `http://localhost:3000/api/health`

### 5. Build, Test & Database Concurrency Verification
- **`npm test`** — Runs deterministic unit and application integration tests using isolated in-memory stores (`forceInMemory: true`). It never connects to or mutates your configured `DATABASE_URL`.
- **`npm run test:db`** — Runs PostgreSQL concurrency and transaction tests. Live database mutation requires an explicitly configured, isolated `TEST_DATABASE_URL` (separate from `DATABASE_URL`) so production/demo data is never touched.
- **`npm run build`** — Builds the production client bundle (`dist/`).
```powershell
npm test
npm run test:db
npm run build
npm start
```

---

## 4. Branching & Pull-Request Workflow

See [`docs/TEAM_HANDOFF.md`](./docs/TEAM_HANDOFF.md) for the full team guide.

1. **`main` is the protected integration branch.**
2. **`feature/phase-1-core-flow` is the working Phase 1 baseline.**
3. Teammates should create isolated feature branches (`feature/navigation-polish`, `feature/staff-dashboard-polish`, `feature/accessibility-i18n`) from the baseline, verify `npm test` and `npm run build`, and open a Pull Request before merging.

---

## 5. Render Deployment Summary

A [`render.yaml`](./render.yaml) Blueprint is included at the repository root.
1. Create a **Render Web Service** connected to your GitHub repository (`opd-saathi`).
2. Set **Build Command:** `npm ci && npm run build`
3. Set **Start Command:** `npm start`
4. Set **Health Check Path:** `/api/health`
5. Configure environment variables (`NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL_MODE=verify-full`, `DATABASE_CA_CERT`, `SESSION_SECRET`, `TICKET_TOKEN_SECRET`, `STAFF_DEMO_PIN_HASH`, `DEMO_MODE=true`) in the Render Dashboard.
