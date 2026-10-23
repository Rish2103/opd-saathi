# Product Requirements Document (PRD) — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Problem Statement & Primary Persona

### The Problem
Patients arriving at busy Indian government hospitals face long, confusing queues, unclear token counters, language barriers, and multi-floor corridors where finding the assigned OPD room, lab, or pharmacy after receiving a slip is stressful—especially for elderly patients and people with mobility limitations.

### Primary Persona: Kamla (Age 62)
- Arrives alone at **City District Hospital** (a fictional 3-floor government hospital).
- Prefers reading and listening in **Hindi (`हिन्दी`)**.
- Uses an entry-level Android smartphone (`360px` viewport width) with intermittent mobile data.
- Walks slowly, **avoids stairs**, and benefits from large buttons, high contrast, step-by-step landmark directions, and optional read-aloud support.

### One-Sentence Product Promise
> **OPD Saathi** helps a patient register in a familiar language, receive a clear digital/printable OPD slip, track their live queue turn with timely alerts, and follow accessible step-by-step directions to the right room—while keeping emergency guidance and human staff help one tap away.

---

## 2. Core Product Principles

1. **The Slip-to-Room Journey is the Differentiator:** Seamless transition from registration $\rightarrow$ OPD slip $\rightarrow$ live queue tracking $\rightarrow$ accessible indoor navigation.
2. **Accessibility is Core Functionality (Not Polish):** Large touch targets ($\ge 44\text{px}$ all controls, $\ge 56\text{px}$ primary actions), bilingual English/Hindi support across 100% of states, **Assisted Mode**, read-aloud (`speechSynthesis`), and default **Avoid Stairs** routing.
3. **Zero PII & Synthetic Hospital Data Only:** No patient names, phone numbers, Aadhaar/ABHA IDs, addresses, or clinical diagnoses are collected or stored.
4. **Zero Automated Medical Triage:** The app never diagnoses symptoms or automatically reorders the routine queue. Emergencies are directed immediately to Casualty/`112`/`108` and human staff assessment.
5. **Server-Authoritative Transparency:** PostgreSQL is the sole source of truth. Queue times are explicitly labelled as estimates, and offline/disconnected states clearly display the last-updated timestamp.

---

## 3. Scope Tiers: P0 (Must-Have MVP) vs P1 (Stretch) vs Non-Goals

### P0 — Mandatory MVP Requirements
- **P0-1 (Patient Home):** First-visit language selector (`English`, `हिन्दी`), Assisted Mode toggle, persistent Emergency bar, and 4 large primary actions: **Register**, **My Turn**, **I Have My Slip**, **Find a Department / Help Desk**.
- **P0-2 (Emergency Safety):** Persistent Emergency action on every screen opening a dedicated `<dialog>` with reviewed warning signs, `112` and `108` quick-dial links, step-by-step route to Emergency/Casualty (`room 101`, Floor 1), and a pre-registration **"Request Staff Help"** trigger.
- **P0-3 (Registration Wizard):** One decision per step (`Step n of N` + progress bar): Language $\rightarrow$ Visit Type (`First Visit` / `Follow-Up`) $\rightarrow$ Department card with icon + "Not sure? Go to Help Desk" $\rightarrow$ Mobility preference (`Avoid Stairs` defaulted ON) $\rightarrow$ Review & Confirm. `Back` preserves all selections.
- **P0-4 (Digital OPD Slip):** Displays `public_code` (`OPD-GEN-001`), department, doctor name, room, floor, landmark, people ahead, currently serving token, estimated wait, doctor status, non-PII QR code, Large Text toggle, Read Aloud button, Print stylesheet view, and **Navigate to Room** CTA.
- **P0-5 (My Turn Live Tracker):** Real-time queue rank, now-serving token, doctor availability/delay, `Updated at HH:MM:SS` IST timestamp, connection status badge (`Connected` / `Reconnecting` / `Offline — Stale`), and a one-time **$\le 3$ people ahead** alert banner (+ audio/vibration when supported).
- **P0-6 (I Have My Slip & Find a Department):** Mandatory manual token-code input (`OPD-GEN-001`) with progressive-enhancement QR camera scanning, plus general point-to-point hospital wayfinding between any 2 of the 19 canonical hospital nodes.
- **P0-7 (Accessible 3-Floor Navigation):** Static, version-controlled graph (`shared/navigation/hospitalGraph.json`) with bidirectional Dijkstra pathfinding, **Avoid Stairs** filter excluding staircase edges, and ordered landmark-based text directions in English and Hindi.
- **P0-8 (Staff Dashboard & Urgent Assessment):** Server-verified PIN login (`HttpOnly` PostgreSQL session), department queue management (`Call Next`, `Start Consultation`, `Complete`, `No-Show`, `Cancel`, `TAIL_REQUEUE`), doctor status/delay controls, and a pinned **Urgent Assessment Queue** with audio/visual alert until explicitly acknowledged.
- **P0-9 (Public Queue Board):** High-contrast multi-department display board (`/board`) showing now-serving tokens, waiting counts, ETA, and doctor status with zero PII.
- **P0-10 (Deployment & Handoff):** Single-origin Render deployment connected to Supabase PostgreSQL over CA-verified TLS, public GitHub repository (`opd-saathi`), `README.md`, 7-slide pitch deck, and $\le 5$-minute demo video.

### P1 — Stretch Goals (Implement Only After All P0 Gates Pass)
- **P1-1:** PWA `manifest.webmanifest` and service worker caching static shell, translations, and `hospitalGraph.json` (never `/api/*`).
- **P1-2:** Schematic 2D SVG floor plan highlighting the active route alongside the step-by-step text cards.
- **P1-3:** Tamil (`தமிழ்`) translation dictionary across all screens and landmarks.
- **P1-4:** Feature-detected voice input (`SpeechRecognition`) on lookup inputs with manual keyboard fallback.
- **P1-5 (P2 Bonus):** Render Workflows scheduled anonymised queue summary job.

### Explicit Non-Goals (Deferred / Out of Scope)
- Real hospital HIS/EMR or ABDM/ABHA integration.
- Storing patient names, phone numbers, medical history, or free-text symptom notes.
- AI symptom checkers, clinical triage scoring, or automatic queue priority jumping.
- Live indoor GPS/BLE beacon positioning.
- Real SMS/WhatsApp gateway integration.
