# Technology Stack & Configuration — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Approved Stack Matrix

| Layer | Package / Tool | Version Target | Justification |
| :--- | :--- | :---: | :--- |
| **Runtime** | Node.js (ESM) | `>=20.0.0` (`v24.20.0` local) | Native `crypto`, `fetch`, `--env-file` support, and fast startup on Render. |
| **Frontend Framework** | `react`, `react-dom`, `react-router-dom` | `^18.3.1`, `^6.28.0` | Stable, predictable SPA routing and component lifecycle. |
| **Build Tool** | `vite`, `@vitejs/plugin-react` | `^5.4.0` | Instant HMR, built-in `/api` and `/socket.io` dev proxy, clean `dist/` bundle. |
| **Styling & Design System** | `tailwindcss`, `postcss`, `autoprefixer`, `clsx`, `tailwind-merge` | `^3.4.14` | Single cohesive styling system with CSS custom property tokens and `shadcn/ui`-style composable primitives. |
| **Icons** | `lucide-react` | `^0.454.0` | Crisp, consistent healthcare & wayfinding icons paired with bilingual text labels. |
| **Typography** | `Noto Sans` & `Noto Sans Devanagari` | Google Fonts + system fallback | Unclipped Devanagari matras and matching Latin metrics across Android & desktop. |
| **QR Code Generation** | `qrcode.react` | `^4.1.0` | Zero-dependency SVG QR rendering for the OPD slip. |
| **Backend Server** | `express`, `helmet`, `compression`, `cookie-parser` | `^4.21.1`, `^8.0.0` | Battle-tested HTTP routing, security headers, and `trust proxy` support. |
| **Validation** | `zod` | `^3.23.8` | Strict server-side request schema validation before any database call. |
| **Database Driver** | `pg` | `^8.13.1` | Parameterised SQL queries, transactions, advisory locks, and explicit `ssl: { rejectUnauthorized: true, ca }` support. |
| **Authentication & Sessions** | `express-session`, `connect-pg-simple`, `bcryptjs` | `^1.18.1`, `^10.0.0`, `^2.4.3` | PostgreSQL-backed `HttpOnly` staff sessions and pure-JS bcrypt PIN verification (zero C++ node-gyp build issues on Windows/Linux). |
| **Rate Limiting** | `express-rate-limit` | `^7.4.1` | Protects PIN login, ticket creation, public slip lookup, and help requests. |
| **Realtime Sync** | `socket.io`, `socket.io-client` | `^4.8.1` | Room-scoped invalidation broadcasts with automatic reconnection. |
| **Testing & Dev Orchestration** | `vitest`, `supertest`, `concurrently`, `dotenv` | `^2.1.4`, `^7.0.0`, `^9.1.0` | Fast unit and HTTP integration testing in a single repository. |

---

## 2. NPM Scripts (`package.json`)

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `concurrently -n server,client -c cyan,green "npm run dev:server" "npm run dev:client"` | Runs Express (`:3000`) and Vite (`:5173` with proxy) together for local development. |
| `npm run dev:server` | `node --watch server/index.js` | Starts Express + Socket.IO server with auto-reload. |
| `npm run dev:client` | `vite` | Starts Vite dev server on `http://localhost:5173`. |
| `npm run build` | `vite build` | Compiles production frontend bundle into `dist/`. |
| `npm start` | `node server/index.js` | Starts single-origin production server serving `dist/` + `/api/*` + `/socket.io`. |
| `npm test` | `vitest run` | Runs all automated unit and API integration tests once. |
| `npm run test:watch` | `vitest` | Runs Vitest in interactive watch mode. |
| `npm run db:migrate` | `node server/db/migrate.js` | Applies `server/db/migrations/001_init.sql` inside a PostgreSQL transaction. |
| `npm run db:seed` | `node server/db/seed.js` | Idempotently seeds fictional City District Hospital departments and doctor statuses. |

---

## 3. Environment Variables Contract (`.env.example`)

Never commit `.env` or real credentials. Configure these locally in `.env` and in the Render Environment dashboard:

| Variable | Required | Example / Default | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `development` / `production` | Controls strict production TLS, `Secure` cookies, and static SPA serving. |
| `PORT` | No | `3000` | HTTP port bound by Express (`process.env.PORT` injected automatically on Render). |
| `DATABASE_URL` | Yes (for DB) | `postgresql://postgres.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:5432/postgres` | Exact connection string copied from the Supabase Dashboard (Session Pooler IPv4 recommended for Render). |
| `DATABASE_SSL_MODE` | No | `verify-full` (`disable` only for local non-TLS Postgres) | Enforces TLS encryption and CA verification. |
| `DATABASE_CA_CERT` | Yes (Prod) | `-----BEGIN CERTIFICATE-----\n...` (or base64 PEM) | Supabase Root CA certificate PEM contents for `rejectUnauthorized: true`. |
| `DATABASE_CA_CERT_PATH` | Optional | `./certs/prod-ca-2021.crt` | File path alternative to `DATABASE_CA_CERT` for local development. |
| `SESSION_SECRET` | Yes | 64-char random hex string | Signs staff `express-session` `HttpOnly` cookies (must differ from `TICKET_TOKEN_SECRET`). |
| `TICKET_TOKEN_SECRET` | Yes | 64-char random hex string | Dedicated HMAC-SHA256 key for deriving patient ticket capability tokens. |
| `TICKET_TOKEN_SECRET_PREVIOUS` | No | *(empty)* | Optional previous HMAC secret to allow zero-downtime key rotation. |
| `STAFF_DEMO_PIN_HASH` | Yes | `$2a$10$...` (bcrypt hash) | Bcrypt hash of the synthetic staff demo PIN (never store raw PIN in production env). |
| `DEMO_MODE` | No | `true` | Displays explicit synthetic-hospital banners across the UI. |
