# OPD Saathi — Comprehensive Project Documentation & Presentation Blueprint (`detailed.md`)

> **Document Purpose:** This document contains every functional, architectural, UI/UX, database, API, accessibility, and workflow detail of the **OPD Saathi** platform. It is structured so you can directly build a complete technical and product presentation (PPT) from it.

---

## 1. Executive Summary & Project Vision

- **Project Name:** **OPD Saathi** (*Outpatient Department Companion*)
- **Tagline:** *Accessible, Multilingual, Real-Time OPD Registration, Queue Tracking, Self-Service Kiosk & Indoor Wayfinding for Public & Government Hospitals.*
- **Core Mission:** Eliminate long physical lines, confusion, language barriers, and missed turns in high-volume government hospital Outpatient Departments (OPDs) through a zero-jargon, voice-assisted, trilingual digital platform that works equally well on a patient's smartphone and on a hospital lobby touchscreen kiosk.

---

## 2. The Problem Statement (Slide 2 Material)

In public and government hospitals across India, millions of walk-in OPD patients face five critical bottlenecks every morning:

1. **Unclear & Crowded Registration Lines:** Patients stand in long queues without knowing which counter or room serves their medical problem or how long the wait is.
2. **Opaque Waiting Times ("When is my turn?"):** Once given a paper slip, patients must crowd around the doctor's door for hours afraid of missing their token call.
3. **Complex Multi-Floor Hospital Navigation:** Patients—especially senior citizens, pregnant women, and wheelchair users—struggle to find rooms across multiple floors or locate step-free ramps and lifts.
4. **Language & Literacy Barriers:** Digital portals are often English-only and text-heavy, excluding patients who read only regional languages or rely on spoken audio instructions.
5. **Unreliable Mobile Networks & Shared Family Phones:** Hospital basements and corridors have spotty 2G/3G networks (causing double-submissions), and a single phone is often used to register multiple family members.

---

## 3. Our Solution: OPD Saathi (Slide 3 Material)

**OPD Saathi** solves all five bottlenecks in a single unified web and kiosk system:

- **3-Step Digital OPD Registration** with **Network-Resilient Idempotency** and **Duplicate Token Prevention**.
- **Real-Time Socket.IO Queue Board & "My Turn" Live Tracker** with exact people-ahead count, estimated wait time (`~X mins`), and spoken audio announcements when called.
- **Dedicated Self-Service Hospital Kiosk Mode (`/kiosk`)** designed for walk-in patients without smartphones, featuring touch numpads, auto-privacy session reset, and instant printable token slips.
- **Step-Free Dijkstra Indoor Hospital Pathfinder** across 3 floors with an interactive zoomable schematic floor map and automatic **"Avoid Stairs" (Lift/Ramp)** routing.
- **Live Data-Driven Patient Help Chatbot** (floating right-middle launcher) that answers *"How much time for my turn?"* and *"Where is my room?"* using the patient's live token data and speaks every answer aloud.
- **100% Trilingual & Voice-Enabled Interface** in **English (`en`)**, **Hindi (`हिन्दी - hi`)**, and **Tamil (`தமிழ் - ta`)** with one-tap **Listen (Text-to-Speech)** buttons across every screen.

---

## 4. Complete Module-by-Module Breakdown (Slides 4–9 Material)

### Module 1: Live Hospital Home & Multi-Department Public Queue Board
- **Location:** `/` (Home View in [`src/App.jsx`](file:///s:/opd-saathi/opd-saathi/src/App.jsx))
- **What It Shows:**
  - **Hospital Command Banner:** Direct one-tap entry to **Start OPD Registration**, **Track Existing Token**, or **Open Self-Service Kiosk Mode**.
  - **My Saved Slips Bar:** If the device has one or more active OPD tokens stored locally, they are displayed immediately at the top with live status badges (`WAITING`, `CALLED`, `IN_CONSULTATION`, `COMPLETED`).
  - **Real-Time Multi-Department Queue Grid:** Displays every hospital department (`General Medicine - GEN`, `Paediatrics - PED`, `Orthopaedics - ORT`, `Gynaecology - GYN`) with:
    - Token Prefix & Room Number (e.g., `Room 204`, `Floor 1`)
    - **Now Serving Token Code** (e.g., `GEN-004`)
    - **Patients Waiting Count** & **Estimated Wait Minutes** (`~21 mins`)
    - **Instant Empty-Queue Indicator:** Highlights when a department has `0 waiting` so patients know immediate consultation is available.
    - **Voice Readout Button:** Reads the entire department queue card aloud in the selected language.

---

### Module 2: 3-Step Idempotent Patient OPD Registration
- **Location:** Registration View in [`src/App.jsx`](file:///s:/opd-saathi/opd-saathi/src/App.jsx)
- **Step-by-Step Workflow:**
  1. **Step 1 — Select Medical Department:** Large, tactile 3D cards showing localized department name, symptom guidance, consulting doctor name, floor/room landmark, current waiting count, and estimated wait minutes.
  2. **Step 2 — Enter Patient Details:**
     - Patient Full Name (validated, normalized).
     - Age (`0–120` years) & Gender (`Female`, `Male`, `Other`, `Prefer not to say`).
     - 10-Digit Mobile Number (normalized to Indian 10-digit format for SMS-free slip recovery).
     - Optional Hospital UHID / Registration Number.
     - Visit Type (`New Visit` vs. `Follow-up Visit`).
     - **Step-Free Route Preference (`Avoid Stairs — Use Lift / Ramp`):** Pre-enabled by default for accessibility.
  3. **Step 3 — Review & Confirm Token Generation:**
     - Displays a clear summary before submission.
     - **Idempotent Submission (`request_id`):** Generates a client UUID stored in `sessionStorage` so if a patient taps submit twice on a slow hospital network, the server replays the exact same token instead of creating two tokens.
     - **Duplicate Active Registration Guard:** If the same patient (`department_id + queue_date + normalized_phone + normalized_name`) already has an active token today, the backend returns HTTP `409 DUPLICATE_ACTIVE_REGISTRATION` with the existing token details so the user can open their existing slip in one tap.

---

### Module 3: Digital & Printable OPD Token Slip (`SlipView`)
- **Location:** [`src/components/SlipView.jsx`](file:///s:/opd-saathi/opd-saathi/src/components/SlipView.jsx)
- **Key Features:**
  - **Perforated 3D Clinical Ticket Layout:** Shows the bold monospace Token Code (e.g., `GEN-001`), Status Badge, Queue Date (IST), Patient Summary, Consulting Doctor, Floor, Room Number, and Physical Landmark.
  - **Live Queue Snapshot Inside the Slip:** Shows **Now Serving**, **People Ahead of You**, and **Estimated Wait Time (`~X mins`)**.
  - **Embedded Step-by-Step Directions:** Automatically computes and lists the accessible path from `Ground Floor Registration Desk` to the assigned OPD room using [`findAccessibleRoute`](file:///s:/opd-saathi/opd-saathi/shared/navigation/pathfinder.js).
  - **Privacy-Safe QR Code:** Encodes only the public lookup URL (`/?code=GEN-001`)—never exposing the secret cancellation `accessToken` or full phone number.
  - **Multi-Slip Family Switcher (`opd_saved_slips_v1`):** Supports saving and switching between multiple family members' slips on a single smartphone.
  - **Spoken Audio Readout & Print Stylesheet:** Includes a full-slip **Read Slip Aloud** button and `@media print` styling for clean thermal/A4 printing.
  - **Protected Token Cancellation:** Allows cancelling a waiting token only when the device holds the cryptographic `accessToken` issued at registration.

---

### Module 4: "My Turn" Live Queue Tracker & Slip Recovery (`MyTurnView`)
- **Location:** [`src/components/MyTurnView.jsx`](file:///s:/opd-saathi/opd-saathi/src/components/MyTurnView.jsx)
- **Key Features:**
  - **Dual Recovery Lookup:** Patients who lost their slip or switched devices can enter **either** their **Token Code** (e.g., `GEN-001`) **or** their **10-digit Registered Mobile Number** to recover all active tokens for today.
  - **Real-Time Socket.IO Push Updates:** Subscribes to `queue.updated` and `ticket.updated` events over WebSockets (`socket.io-client`) with automatic polling fallback if WebSockets drop.
  - **Visual & Audio Turn Alerts:**
    - When a patient's status transitions to `CALLED` or `IN_CONSULTATION`, the tracker highlights in high-contrast emerald/amber, plays a synthesized clinical attention chime (`Web Audio API`), and speaks the room call announcement aloud.
    - Displays connection health (`Live Connected` vs. `Reconnecting`) and the exact timestamp of the last verified server sync.

---

### Module 5: Interactive 3-Floor Hospital Wayfinding & Dijkstra Pathfinder (`NavigationView`)
- **Location:** [`src/components/NavigationView.jsx`](file:///s:/opd-saathi/opd-saathi/src/components/NavigationView.jsx) & [`shared/navigation/pathfinder.js`](file:///s:/opd-saathi/opd-saathi/shared/navigation/pathfinder.js)
- **Graph Data:** [`shared/navigation/hospitalGraph.json`](file:///s:/opd-saathi/opd-saathi/shared/navigation/hospitalGraph.json)
- **Key Features:**
  - **Deterministic Dijkstra Shortest-Path Engine:** Computes the exact shortest path across **Ground Floor (Floor 0)**, **First Floor (Floor 1)**, and **Second Floor (Floor 2)**—never hallucinating rooms or steps.
  - **Barrier-Free "Avoid Stairs" Mode:** When `avoidStairs = true` (default), the adjacency builder strictly filters out all stair edges (`mode === 'stairs' || accessible === false`) and routes patients exclusively via the **Central Ramp** and **Patient Lifts**.
  - **Interactive Multi-Floor Schematic Map:**
    - Floor switcher tabs (`Ground Floor`, `First Floor`, `Second Floor`) with badges indicating which floors the active route traverses.
    - Zoom In (`+`), Zoom Out (`-`), Reset View, and **Previous Step / Next Step** interactive route inspection controls.
    - Animated directional path lines, highlighted origin (`START`) and destination (`END`) pins, and clickable room nodes.
  - **Landmark-Based Turn-by-Turn Cards:** Each step displays distance in meters, walking time, mode badge (`Walk`, `Lift`, `Ramp`, `Stairs`), localized landmark name, and a **Listen** voice button.

---

### Module 6: Self-Service Touchscreen Patient Kiosk Mode (`/kiosk`)
- **Location:** [`src/components/KioskModeView.jsx`](file:///s:/opd-saathi/opd-saathi/src/components/KioskModeView.jsx) (Route: `/kiosk` or `?mode=kiosk`)
- **Designed Specifically For:** Hospital lobby touchscreen terminals used by walk-in patients who do not own smartphones or are unfamiliar with digital apps.
- **Key Features:**
  1. **Dedicated Full-Screen Welcome Screen:**
     - Prominent native-script language selector (**English**, **हिन्दी**, **தமிழ்**).
     - Extra-large primary action: **Start OPD Registration**.
     - Secondary action: **Check Existing Token / Queue Status** (with touch keypad).
     - Permanently accessible **24x7 Emergency Help** button and **Large Text / Audio** controls.
  2. **Touch-First 3-Step Registration Flow:**
     - Large department cards with live waiting counts and spoken audio buttons.
     - Touch-friendly **Quick Age Chips** (`25`, `35`, `45`, `55`, `65`, `75`) and **On-Screen Touch Numpad** for age and 10-digit mobile number entry.
     - Step-by-step progress bar (`Step 1 of 3`, `Step 2 of 3`, `Step 3 of 3`) with oversized `Back` and `Continue` buttons.
  3. **Instant Kiosk Confirmation & Printable Slip:**
     - Displays the generated Token Number, Room, Floor, Doctor, and step-free directions.
     - Includes **Print OPD Slip**, **Read Slip Aloud**, and **Finish & Reset Kiosk for Next Patient**.
  4. **Automatic Privacy Session Timeout (60s Inactivity + 15s Warning Modal):**
     - Automatically detects inactivity on active kiosk screens, displays a 15-second countdown modal (*"Are you still using the kiosk?"*), and wipes all patient data back to the Welcome screen so the next patient in line never sees the previous patient's personal details.
  5. **Staff-Authenticated Kiosk Exit:**
     - Prevents accidental exit by patients while allowing authorized hospital staff to exit to the normal application using the existing Staff PIN verification (`/api/staff/login`).

---

### Module 7: Live Data-Driven Patient Help Chatbot (`PatientHelpChatbot`)
- **Location:** [`src/components/PatientHelpChatbot.jsx`](file:///s:/opd-saathi/opd-saathi/src/components/PatientHelpChatbot.jsx)
- **Design & Placement:**
  - **Floating Circular Launcher** positioned on the **right-middle** of the screen (`fixed right-3 sm:right-6 top-1/2 -translate-y-1/2`), displaying a live `~Xm` wait badge whenever an active slip is present.
  - Opens an **88%–95% Viewport 2-Column Command-Center Modal** with background scroll locking (`overflow: hidden` + `overscroll-contain`).
- **Deterministic, Non-LLM Intelligence Grounded in Live State:**
  - **"How much time for my turn?":** Reads the patient's active/saved OPD slip (`publicCode`, `status`, `queue.peopleAheadWaiting`, `queue.estimatedWaitMinutes`, `queue.nowServingCode`) and reports their exact wait time, people ahead, and room number, with one-tap buttons to open **My Turn Tracker** or **My OPD Slip**.
  - **"Where is my OPD room & route?":** Computes the live step-free route to the patient's assigned department room using `findAccessibleRoute` and provides a one-tap button to open the **Interactive Floor Map** pre-set to their room.
  - **"Live wait time in all departments":** Reads `boardItems` to report live waiting counts and estimated wait times across every hospital department.
  - **Common Hospital FAQs:** Instant guidance on **How to register**, **Wheelchair / Lift step-free access**, **Recovering a lost slip**, and **24x7 Emergency Casualty help**.
  - **Trilingual Voice Readout (`Auto-Voice On/Off` + per-message `Listen` button):** Speaks answers aloud in English, Hindi, or Tamil.

---

### Module 8: Persistent 24x7 Emergency Casualty Triage Modal (`EmergencyModal`)
- **Location:** [`src/components/EmergencyModal.jsx`](file:///s:/opd-saathi/opd-saathi/src/components/EmergencyModal.jsx)
- **Key Features:**
  - Accessible from **every screen** (Header bar, Kiosk bar, Footer, and Chatbot) *before* or *during* registration.
  - Displays critical red-flag symptoms (severe chest pain, breathing difficulty, unconsciousness, heavy bleeding, infant high fever) instructing patients **not** to wait in the OPD queue.
  - Provides immediate step-free directions to **Ground Floor Emergency Casualty Room 1 (Left Wing near Main Gate)**, one-tap map routing, and emergency helpline numbers (`108` Ambulance / `112` National Emergency).

---

### Module 9: Authenticated Staff Queue & Triage Desk (`StaffView`)
- **Location:** [`src/components/StaffView.jsx`](file:///s:/opd-saathi/opd-saathi/src/components/StaffView.jsx)
- **Key Features:**
  - **Dual-Mode Staff Authentication:** Uses `HttpOnly` signed session cookies (`opd_staff_session`) with an automatic in-memory `Authorization: Bearer <staffToken>` fallback.
  - **Live Department Queue Control:**
    - **Call Next Patient:** Automatically advances the current `IN_CONSULTATION` / `CALLED` patient to `COMPLETED` and calls the next `WAITING` token in FIFO order.
    - **Per-Ticket State Transitions:** `Start Consultation`, `Mark Completed`, `Mark No-Show`, or `Re-queue to Waiting`.
    - **Instant Broadcast:** Every staff action writes an audit record to `queue_events` and broadcasts `queue.updated` and `ticket.updated` over Socket.IO to all connected patient phones, public boards, and kiosks in milliseconds.

---

### Module 10: Trust, Transparency & Error Resilience (`InfoPagesView`)
- **Location:** [`src/components/InfoPagesView.jsx`](file:///s:/opd-saathi/opd-saathi/src/components/InfoPagesView.jsx)
- **Included Pages & Safeguards:**
  - **About OPD Saathi Page (`about`):** Explains the hospital registration architecture, accessibility standards, and system workflow.
  - **5 Interactive Clinical FAQs (`faq`):** Accordion FAQs with voice readout on the Home & FAQ pages.
  - **Privacy Policy (`privacy`) & Terms of Use (`terms`):** Explains minimal data collection, local device slip storage, and automatic kiosk session clearing.
  - **Thank You Confirmation View (`thank-you`) & Custom 404 Page (`not-found`):** Friendly recovery screens.
  - **UI Error Sanitizer (`sanitizeUiErrorMessage`):** Intercepts raw JSON, SQLite, or stack-trace strings and replaces them with calm, actionable patient-friendly messages.

---

## 5. UI/UX & Visual Design System (Slide 10 Material)

- **Design Philosophy:** Structured using **Apple Fluid Interface Design Principles** ([`skillsetdocs/SKILL.md`](file:///s:/opd-saathi/opd-saathi/skillsetdocs/SKILL.md))—prioritizing instant pointer-down feedback (`active:scale-[0.97]`), optical typography hierarchy, spatial consistency, high-contrast legibility, and tactile 3D surface depth.
- **Color Palette (Warm Clinical Alabaster, Espresso & Terracotta-Gold — Zero Blue/Neon):**
  - **Primary Canvas:** Warm Cream / Alabaster (`#FAF6F0`)
  - **Elevated Card Surface:** Crisp Ivory (`#FFFDF9`)
  - **Secondary / Subtle Surface:** Warm Sand (`#F2EAE0`)
  - **Primary Structural Ink & Header Chrome:** Deep Espresso (`#1E1915`)
  - **Primary Interactive Brand Accent:** Warm Terracotta Copper (`#C84B31` / hover `#A83820`)
  - **Secondary Highlight Accent:** Burnished Amber Gold (`#E59838`)
  - **Semantic Clinical Status Colors:**
    - `CALLED / SERVING`: Forest Emerald (`#15803D`)
    - `WAITING`: Warm Amber (`#B45309`)
    - `EMERGENCY`: High-Contrast Crimson (`#B91C1C`)
- **Accessibility Controls Built Into the Header:**
  1. **Page Audio Readout (`Listen to Page`)**
  2. **Native-Script Language Switcher (`EN` | `हिन्दी` | `தமிழ்`)**
  3. **Large Text Mode (`html.large-text`):** Scales root `font-size` to `112.5%` (`18px`) so all `rem`-based spacing and typography expand proportionally without breaking layouts.
  4. **Dark / Warm-Contrast Mode Toggle (`html.dark-theme`)**
  5. **Scroll Progress Bar & Back-to-Top Floating Button**

---

## 6. System Architecture & Technology Stack (Slide 11 Material)

```
+-----------------------------------------------------------------------------------+
|                        CLIENT LAYER (React 18 + Vite + Tailwind)                  |
|                                                                                   |
|  +-----------------+  +-----------------+  +-----------------+  +--------------+  |
|  | Patient Web App |  | Self-Service    |  | Live Data-Driven|  | Staff Queue  |  |
|  | (Home, Register,|  | Kiosk Mode      |  | Patient Help    |  | & Triage     |  |
|  |  Slip, My Turn, |  | (/kiosk, Touch  |  | Chatbot + Voice |  | Desk         |  |
|  |  Floor Map)     |  |  Numpad, Timer) |  | (Right-Middle)  |  | (PIN Auth)   |  |
|  +--------+--------+  +--------+--------+  +--------+--------+  +------+-------+  |
|           |                    |                    |                  |          |
|           +--------------------+--------------------+------------------+          |
|                                          |                                        |
|                     REST API (JSON) + Socket.IO Realtime Events                   |
+------------------------------------------|----------------------------------------+
                                           |
+------------------------------------------v----------------------------------------+
|                     SERVER LAYER (Node.js + Express + Socket.IO)                  |
|                                                                                   |
|  +------------------------+  +-----------------------+  +----------------------+  |
|  | Registration & Queue   |  | Shared Dijkstra       |  | Staff Session &      |  |
|  | Engine (Idempotency,   |  | Accessibility         |  | Access-Token         |  |
|  | Duplicate Guard, FIFO) |  | Pathfinder            |  | Security Middleware  |  |
|  +-----------+------------+  +-----------+-----------+  +----------+-----------+  |
|              |                           |                         |              |
|              v                           v                         v              |
|  +-----------------------------------------------------------------------------+  |
|  |         SQLite Database (better-sqlite3, WAL Mode, ACID Transactions)       |  |
|  |   Tables: departments | tickets | queue_events | idempotency_keys           |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Technology Stack Summary
- **Frontend:** React 18, Vite 5, Tailwind CSS 3, Lucide React Icons, `qrcode.react` (SVG QR generator), `socket.io-client`, Web Speech API (`speechSynthesis`), Web Audio API (`AudioContext`).
- **Backend:** Node.js (ES Modules), Express 4, Socket.IO 4, `better-sqlite3` (synchronous ACID transactions with Write-Ahead Logging `WAL`).
- **Shared Modules:** Isomorphic Dijkstra indoor routing engine ([`shared/navigation/pathfinder.js`](file:///s:/opd-saathi/opd-saathi/shared/navigation/pathfinder.js)) and canonical 3-floor hospital graph ([`shared/navigation/hospitalGraph.json`](file:///s:/opd-saathi/opd-saathi/shared/navigation/hospitalGraph.json)).
- **Testing & Verification:** Vitest, Testing Library, Supertest (23 end-to-end HTTP, Socket.IO, Kiosk, and Accessibility tests).

---

## 7. Database Schema & Backend API Reference (Slide 12 Material)

### SQLite Database Tables ([`server/db/database.js`](file:///s:/opd-saathi/opd-saathi/server/db/database.js))
1. **`departments`**: `id`, `slug`, `token_prefix`, `name_en`, `name_hi`, `name_ta`, `floor_number`, `room_label`, `doctor_name_en/hi/ta`, `landmark_en/hi/ta`, `destination_node_id`, `avg_consult_minutes`.
2. **`tickets`**: `id`, `public_code` (e.g. `GEN-001`), `sequence_number`, `queue_date` (IST `YYYY-MM-DD`), `department_id`, `patient_name`, `normalized_name`, `phone`, `normalized_phone`, `age`, `gender`, `registration_number`, `visit_type`, `preferred_lang`, `avoid_stairs`, `status` (`WAITING`, `CALLED`, `IN_CONSULTATION`, `COMPLETED`, `NO_SHOW`, `CANCELLED`), `access_token`, `created_at`, `updated_at`, `called_at`, `completed_at`.
3. **`queue_events`**: Immutable audit log of every ticket state change (`ticket_id`, `department_id`, `event_type`, `previous_status`, `new_status`, `actor`, `created_at`).
4. **`idempotency_keys`**: Stores `(request_id, queue_date, payload_hash, ticket_id)` to guarantee safe retries without duplicate tickets.

### Key REST & WebSocket Endpoints ([`server/index.js`](file:///s:/opd-saathi/opd-saathi/server/index.js))
| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Server health & active IST queue date check |
| `GET` | `/api/departments` | List all OPD departments with live queue metrics |
| `GET` | `/api/queues/public-board` | Live multi-department waiting room board snapshot |
| `POST` | `/api/registrations` | Idempotent patient registration + duplicate check |
| `GET` | `/api/tickets/by-code/:code` | Public privacy-safe ticket lookup by token code |
| `GET` | `/api/tickets/recover?phone=...` | Recover active today's tickets by 10-digit phone number |
| `POST` | `/api/tickets/:id/cancel` | Patient-initiated cancellation (requires `accessToken`) |
| `GET` | `/api/routes/nodes` | Canonical 3-floor hospital navigation nodes & edges |
| `GET` | `/api/routes/path` | Server-side Dijkstra accessible route computation |
| `POST` | `/api/staff/login` | Staff PIN authentication (sets `HttpOnly` cookie + token) |
| `POST` | `/api/staff/departments/:slug/call-next` | Call next waiting patient in department queue |
| `POST` | `/api/staff/tickets/:id/status` | Update ticket status (`IN_CONSULTATION`, `COMPLETED`, `NO_SHOW`, `WAITING`) |
| `WS` | `queue.updated` / `ticket.updated` | Real-time Socket.IO broadcasts to all clients |

---

## 8. Ready-to-Use 10-Slide PPT Presentation Outline

1. **Slide 1 — Title Slide:** *OPD Saathi: Trilingual Self-Service Kiosk, Live Queue Tracker & Accessible Indoor Navigation for Public Hospitals.*
2. **Slide 2 — The Problem:** *Overcrowded OPD counters, unknown wait times, multi-floor navigation confusion, and language/literacy barriers in government hospitals.*
3. **Slide 3 — Our Solution:** *A unified Patient Web App + Touchscreen Hospital Kiosk (`/kiosk`) + Live Staff Triage Desk powered by real-time WebSockets.*
4. **Slide 4 — Frictionless 3-Step Registration & Kiosk Mode:** *Native-script trilingual selection (`English`, `हिन्दी`, `தமிழ்`), touch numpad, idempotent retry safety, and 60-second privacy auto-reset.*
5. **Slide 5 — Smart Digital OPD Slip & Real-Time "My Turn" Tracker:** *Privacy-safe QR codes, multi-slip family storage, live people-ahead countdown, and spoken audio alerts when called.*
6. **Slide 6 — Step-Free 3-Floor Hospital Wayfinding (Dijkstra Engine):** *Interactive floor map with automatic "Avoid Stairs" wheelchair/lift/ramp routing and landmark-based audio steps.*
7. **Slide 7 — Live Data-Driven Patient Help Chatbot with Voice Readout:** *Right-middle floating launcher opening a 2-column assistant that answers "How much time for my turn?" and "Where is my room?" using live slip data + Text-to-Speech.*
8. **Slide 8 — 24x7 Emergency Casualty Triage & Staff Queue Desk:** *One-tap pre-registration emergency guidance and real-time staff queue management.*
9. **Slide 9 — Inclusive Design & Accessibility Architecture:** *Apple Fluid Design principles, Warm Alabaster & Terracotta-Espresso high-contrast theme, Large Text scaling (`112.5%`), and full screen-reader/voice support.*
10. **Slide 10 — System Architecture & Verification:** *React + Vite + Tailwind + Express + SQLite WAL + Socket.IO, verified by 23 automated end-to-end integration and kiosk tests.*
