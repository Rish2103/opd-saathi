# Implementation, Setup & Deployment Runbook — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Local Setup Instructions (For Teammates)

### Prerequisites
- **Node.js:** `>=20.0.0` (verified on `v24.20.0`) and `npm >=10.0.0`
- **Git:** `>=2.40`
- **Database:** Supabase PostgreSQL project (or local PostgreSQL `>=15` for offline testing)

### Step-by-Step Local Bootstrap
1. **Clone the repository and install dependencies:**
   ```powershell
   git clone https://github.com/<your-org-or-username>/opd-saathi.git
   cd opd-saathi
   npm install
   ```
2. **Create your local `.env` file from the template:**
   ```powershell
   Copy-Item .env.example .env
   ```
3. **Configure `.env` (Never commit `.env` to Git):**
   - Generate two distinct 64-character hex secrets for `SESSION_SECRET` and `TICKET_TOKEN_SECRET`:
     ```powershell
     node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('TICKET_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'));"
     ```
   - Generate a bcrypt hash for your synthetic demo staff PIN (e.g., PIN `1234` for local dev):
     ```powershell
     node -e "require('bcryptjs').hash('1234', 10).then(h => console.log('STAFF_DEMO_PIN_HASH=' + h))"
     ```
   - Copy the **Session Pooler (IPv4)** connection string from **Supabase Dashboard $\rightarrow$ Connect $\rightarrow$ Session Pooler** into `DATABASE_URL`.
   - Download the **Supabase Root CA certificate** (`prod-ca-2021.crt`) from **Supabase Dashboard $\rightarrow$ Project Settings $\rightarrow$ Database $\rightarrow$ SSL Configuration** and either set `DATABASE_CA_CERT_PATH=./certs/prod-ca-2021.crt` (placed in git-ignored `certs/`) or set `DATABASE_CA_CERT` to its PEM string.
4. **Apply database schema migrations and seed fictional hospital data:**
   ```powershell
   npm run db:migrate
   npm run db:seed
   ```
5. **Run the development servers (Express `:3000` + Vite `:5173`):**
   ```powershell
   npm run dev
   ```
6. **Run automated tests and production build verification:**
   ```powershell
   npm test
   npm run build
   npm start
   ```

---

## 2. GitHub Repository Setup & Remote Connection

If the local repository is not yet linked to your remote GitHub repository (`opd-saathi`):

1. Create a new repository named **`opd-saathi`** on GitHub (**Public** for hackathon judging, without initializing a conflicting README/license).
2. Link your local `main` branch and push:
   ```powershell
   git remote add origin https://github.com/<your-username>/opd-saathi.git
   git branch -M main
   git push -u origin main
   ```
3. Or, if using the GitHub CLI (`gh`):
   ```powershell
   gh auth login
   gh repo create opd-saathi --public --source=. --remote=origin --push
   ```

---

## 3. Render + Supabase Production Deployment Runbook

1. **Create Web Service on Render:**
   - Connect your GitHub `opd-saathi` repository to a new **Render Web Service** (Node runtime, branch: `main`).
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
2. **Configure Render Environment Variables:**
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = *(Exact Supabase Session Pooler connection string from Supabase dashboard)*
   - `DATABASE_SSL_MODE` = `verify-full`
   - `DATABASE_CA_CERT` = *(Paste the full PEM contents of the Supabase Root CA certificate, or base64-encoded PEM)*
   - `SESSION_SECRET` = *(64-char random hex string)*
   - `TICKET_TOKEN_SECRET` = *(Separate 64-char random hex string)*
   - `STAFF_DEMO_PIN_HASH` = *(Bcrypt hash of the synthetic demo PIN)*
   - `DEMO_MODE` = `true`
3. **Post-Deploy Verification Checklist:**
   - Open `https://<your-service>.onrender.com/api/health` in an incognito browser and confirm `{ "status": "ok", "db": "connected" }`.
   - Open `https://<your-service>.onrender.com/` on a mobile phone (`360px`) and laptop.
   - Refresh deep links (`/register`, `/my-turn`, `/staff`, `/board`) to confirm the SPA fallback serves `index.html` while `/api/unknown` returns JSON `404`.
