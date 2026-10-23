# OPD Saathi (ओपीडी साथी)

**Smart Queue Management and Accessible Indoor Navigation for Government Hospitals**  
*Built for CachedInfo HackCache '26*

> **Synthetic Demonstration Notice:** OPD Saathi uses fictional hospital data (**City District Hospital**) and stores **zero patient PII** (no names, phone numbers, government IDs, or diagnoses). It never performs automated medical triage; emergencies are immediately directed to Casualty (`112` / `108`) and human staff assessment.

---

## 1. Documentation & Source of Truth

- **[`PROJECT_BIBLE.md`](./PROJECT_BIBLE.md):** Canonical index of approved decisions, shared enums, database invariants, and milestone status.
- **[`OPD_Saathi_Technical_Plan.md`](./OPD_Saathi_Technical_Plan.md):** Original baseline technical plan (preserved for reference).
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

## 2. Quick Start for Teammates

### Prerequisites
- **Node.js:** `>=20.0.0` (tested on `v24.20.0`)
- **npm:** `>=10.0.0`
- **Database:** Supabase PostgreSQL project (or local PostgreSQL `>=15` for local testing)

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
- `STAFF_DEMO_PIN_HASH`: Bcrypt hash of your synthetic demo PIN:
  ```powershell
  node -e "require('bcryptjs').hash('1234', 10).then(h => console.log('STAFF_DEMO_PIN_HASH=' + h))"
  ```

### 3. Run Database Migrations & Seed Data
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

### 5. Build, Test & Production Smoke Check
```powershell
npm test
npm run build
npm start
```

---

## 3. Team Collaboration & Branch Workflow

- **`main` is the protected integration branch.** Always pull latest `main` before creating a feature branch:
  ```powershell
  git checkout main
  git pull origin main
  git checkout -b feat/<your-feature>
  ```
- Run `npm test` and `npm run build` before opening a pull request or merging into `main`.
- Consult [`PROJECT_BIBLE.md`](./PROJECT_BIBLE.md) and [`docs/API.md`](./docs/API.md) before modifying shared contracts.

---

## 4. Render Deployment Summary

1. Create a **Render Web Service** connected to your public GitHub repository (`opd-saathi`, branch `main`).
2. Set **Build Command:** `npm ci && npm run build`
3. Set **Start Command:** `npm start`
4. Set **Health Check Path:** `/api/health`
5. Configure environment variables (`NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL_MODE=verify-full`, `DATABASE_CA_CERT`, `SESSION_SECRET`, `TICKET_TOKEN_SECRET`, `STAFF_DEMO_PIN_HASH`, `DEMO_MODE=true`) in the Render Dashboard.
