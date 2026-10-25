# OPD Saathi — Hackathon Pitch Deck Outline & 5-Minute Demo Script

**Repository:** `https://github.com/Rish2103/opd-saathi`  
**Active Release Branch:** `feature/phase-2-signature-experience`

---

## Part 1: 6-Slide Pitch Deck Structure

### Slide 1 — The Problem: Public Hospital OPD Bottlenecks
- **Crowded Counter Bottlenecks:** Patients and attendants wait in long physical lines without knowing how many people are ahead or when their turn will arrive.
- **Indoor Wayfinding Confusion:** Multi-floor government hospital blocks are difficult to navigate, especially for elderly patients, wheelchair users, and first-time visitors who cannot climb stairs.
- **Language & Literacy Barriers:** English-only signage and complex digital forms exclude Hindi- and Tamil-speaking patients or low-vision seniors.
- **Unnoticed Waiting-Area Emergencies:** Distressed patients waiting in corridors need an immediate, zero-registration path to alert staff and locate Ground Floor Casualty (Room 101).

### Slide 2 — The Solution: OPD Saathi
- **OPD Saathi** is a trilingual (**English, Hindi, Tamil**), accessibility-first web companion for public hospital Outpatient Departments:
  1. **3-Step OPD Registration & Duplicate Prevention:** Generates a deterministic daily token (`OPD-GEN-001`) with HMAC-protected patient identity and idempotent retry recovery.
  2. **Digital & Printable OPD Slip:** Displays live queue position, room/floor, landmark, QR lookup code, `ta-IN`/`hi-IN`/`en-IN` speech readout, and a print-formatted slip with step-by-step directions.
  3. **Interactive 3-Floor Schematic Hospital Map:** 19-node, 42-edge Dijkstra pathfinder with `Avoid Stairs` (Lift & Ramp only) routing, interactive floor tabs, and voice-guided step-by-step navigation.
  4. **Live Queue Tracking (`My Turn`) & Audio/Visual Alerts:** Real-time Socket.IO updates, $\le 3$ patients ahead banner, and Web Audio chime when called.
  5. **Staff Queue & Triage Desk:** PIN-authenticated queue state transitions (`Call Next`, `Start`, `Complete`, `No-Show`, `Requeue to Tail`), doctor status/delay broadcast, and urgent help-request triage with audible staff alerts.

### Slide 3 — Signature Features (Phase 1 + Phase 2.1)
- **Trilingual Experience (`EN` / `हिन्दी` / `தமிழ்`) + Assisted Mode (`Large Text`):** Instant language switching across every patient and staff screen using `Noto Sans Devanagari` and `Noto Sans Tamil`.
- **Multi-Slip Family Device Support:** Stores multiple active family/attendant OPD slips on a single phone without overwriting capability tokens or privacy-masked patient summaries.
- **Interactive 3-Floor Schematic Map:** Tap any room or facility node to set Start or Destination, view floor-transition badges (Main Lift vs Central Stairs), and step through routes with voice synthesis.
- **Pre-Registration Emergency Help:** Persistent top-bar access to `108` / `112`, 1-tap route to Room 101 Casualty, and `POST /api/help-requests` staff alert with explicit non-diagnostic safety disclaimers.

### Slide 4 — System Architecture & Security
- **Single-Origin Full-Stack Node.js Architecture:**
  - **Frontend:** React 18, Vite 5, Tailwind CSS 3, Lucide Icons, `qrcode.react`, Web Audio API, and Browser `speechSynthesis`.
  - **Backend:** Express 4 REST API + Socket.IO 4 real-time room invalidations (`queue:<deptId>`, `ticket:<id>`, `staff:all`).
  - **Data Store:** PostgreSQL (`pg`) with transaction-scoped `pg_advisory_xact_lock` for gap-free daily token sequences and an isolated in-memory fallback (`forceInMemory: true`) for deterministic unit/integration testing.
- **Privacy & Security by Design:**
  - Public queue boards and QR lookup URLs (`/my-turn?code=OPD-GEN-001`) expose zero personal data.
  - Patient phone numbers are normalized and HMAC-SHA256 hashed for same-day duplicate prevention; only masked phone numbers (`******3210`) are returned to capability-authenticated holders.
  - Staff mutations require `httpOnly` session authentication + CSRF `Origin` validation.

### Slide 5 — Measurable Impact & Verification
- **55 Automated Tests Passing (`npm test`):**
  - 12 health, TLS, and pathfinder unit tests.
  - 28 queue state-machine, duplicate-prevention, multi-slip, and security tests.
  - 12 full-stack UI, trilingual (`EN`/`HI`/`TA`), and Socket.IO end-to-end workflow tests.
  - 3 PostgreSQL configuration safety tests (plus 1 live concurrency suite gated behind `TEST_DATABASE_URL`).
- **Accessibility & Mobile Readiness:** High-contrast clinical palette, 44px+ touch targets, `Avoid Stairs` enabled by default for accessible routing, and responsive layouts down to `360px` viewports.

### Slide 6 — Transparent Limitations & Honest Scope
- **Simulated Hospital Layout:** The 3-floor, 19-node schematic map represents a realistic fictional facility (**City District Hospital**) rather than a CAD survey of a specific government hospital.
- **Self-Entered Mobile Numbers:** Patient phone numbers are normalized (`+91` / `0` prefix stripping) and used for duplicate prevention, but live SMS OTP verification is not enabled in the hackathon build (explicitly badged as `Unverified (self-entered)`).
- **Browser TTS Voice Availability:** Step-by-step voice navigation and slip readout use the browser's `window.speechSynthesis`; if a device lacks an installed `hi-IN` or `ta-IN` OS voice pack, the UI displays an honest fallback notice while keeping all visual instructions active.
- **Database Concurrency Test Separation:** Default `npm test` runs against isolated in-memory stores to protect configured databases; live 20-request PostgreSQL advisory-lock concurrency testing (`npm run test:db`) requires a separate `TEST_DATABASE_URL` branch.

---

## Part 2: 5-Minute Live Demonstration Sequence

| Time | Screen / Action | What to Show & Highlight |
| :--- | :--- | :--- |
| **0:00 – 0:45** | **Navbar, Language Switcher & Pre-Registration Emergency Help** | 1. Open Home screen. Toggle `EN` $\rightarrow$ `हिन्दी` $\rightarrow$ `தமிழ்` and `Large Text: ON` (`Assisted Mode`) to show instant trilingual & senior-friendly typography.<br>2. Click **Emergency Help** in the top bar *before* registering. Show `108`/`112` links, the non-diagnostic disclaimer, and submit a pre-registration help alert from `Main Entrance & Ramp`. |
| **0:45 – 1:45** | **Patient Registration & Duplicate Prevention** | 1. Click **Get OPD Token**. Select **General Medicine (Room 204, Floor 2)**.<br>2. Enter patient details (`Ramesh Kumar`, `9876543210`, Age `62`, `Avoid Stairs` checked) and confirm in Step 3.<br>3. Show the generated **Digital OPD Slip (`OPD-GEN-001`)** with QR code, masked phone (`******3210`), **Read Slip Aloud**, and **Print Slip** preview.<br>4. Register a second slip for another department (**Orthopaedics — Room 302**) and show the **Saved OPD Slips** switcher preserving both slips on the same device. |
| **1:45 – 3:00** | **Interactive 3-Floor Hospital Map & Avoid Stairs Navigation** | 1. From the slip, click **Directions to Room** (`NavigationView`).<br>2. Show the **Interactive 3-Floor Schematic SVG Map** with Floor 1, Floor 2, and Floor 3 tabs.<br>3. Toggle **Avoid Stairs — Use Lift & Ramp Only**: show the route switching between the Central Staircase (`stairs_main_f1`) and the Main Patient Lift (`lift_main_f1`).<br>4. Tap a room node on the SVG map to inspect its landmark and step through directions using **Voice-Guided Step-by-Step Navigation** (`Next Step` / `Read Route Aloud`). |
| **3:00 – 4:00** | **Live Queue Tracking (`My Turn`) & Audio/Visual Alerts** | 1. Open **My Turn** (`/my-turn`). Show live status (`Waiting in Queue`), people ahead count, and the **Queue Sound Alert** toggle + **Test Sound** button.<br>2. Highlight the approaching-turn banner ($\le 3$ ahead). |
| **4:00 – 5:00** | **Staff Queue & Triage Desk** | 1. Open **Staff Desk** (`/staff`) and sign in with the configured Staff PIN.<br>2. Show the **Urgent & Patient Help Requests** panel with the alert submitted earlier; click **Acknowledge** and **Resolve**.<br>3. Click **Call Next Waiting Patient**: show `OPD-GEN-001` transitioning to `CALLED` in real time, triggering the patient chime and green `IT IS YOUR TURN NOW!` banner on `My Turn`.<br>4. Demonstrate **No-Show** $\rightarrow$ **Requeue to Tail** (`TAIL_REQUEUE`) or **Start Consultation** $\rightarrow$ **Complete**, and update **Doctor Availability / Delay Broadcast**. |
