# OPD Saathi — Technical Implementation Plan

**Project:** OPD Saathi — Smart Queue Management and Accessible Navigation for Government Hospitals  
**Event:** CachedInfo HackCache '26  
**Team:** 2–3 members, mixed/beginner technical experience  
**Document status:** Implementation baseline for Antigravity review  
**Core objective:** Ship a deployed, reliable prototype that demonstrates one complete patient journey—from accessible registration to OPD slip, live queue updates, and accurate room navigation—with staff-controlled urgent assessment.

---

## 0. Executive decision

Build **a mobile-first web app/PWA-ready application** with a React frontend, a small Node/Express API, Socket.IO for live updates, and PostgreSQL hosted by Supabase. Deploy the frontend and backend together as a single Render Web Service; use Supabase as the managed database, not as a browser-accessible database. This keeps API calls and WebSocket connections on one origin and gives the team one deployable app.

### Recommended stack

| Layer | Decision | Reason |
|---|---|---|
| Frontend | React + Vite + JavaScript | Fast iteration, browser-based demo, works on basic Android phones and laptops |
| Routing/UI | React Router + plain CSS or CSS modules | Keep dependencies and styling complexity low |
| Icons | `lucide-react` | Consistent, labelled interface icons |
| Internationalisation | `i18next` + `react-i18next` or a disciplined translation dictionary | English and Hindi from the start; Tamil only after the core journey is stable |
| API | Node.js + Express | Small, understandable server for validation, staff-only operations and database access |
| Staff session | `express-session` + `connect-pg-simple` + server-side PIN hash | Revocable, expiring session stored server-side; logout destroys the session |
| Live queue | Socket.IO | Cross-device queue notifications, reconnect handling and targeted rooms |
| Database | Supabase-hosted PostgreSQL, accessed by the server only | Persistent shared state and relational constraints; no direct browser writes |
| Validation | `zod` (or equivalent server-side schema validation) | Reject malformed requests before they affect state |
| Staff demo access | Server-verified demo PIN; PostgreSQL-backed `express-session` with an HttpOnly cookie | A frontend-only PIN is not an authorization control |
| Ticket QR | `qrcode.react`; optional QR scanner with manual-entry fallback | Works in the browser without relying on camera support everywhere |
| Testing | Vitest + Supertest; manual multi-device and responsive checks | Tests the queue rules and API without requiring a large test framework setup |
| Deployment | Render Web Service serving the built React app and Express API; Supabase PostgreSQL | One public URL and one origin simplify deployment and the demo |
| Optional bonus | Render Workflows, only after the core product is stable | Keep the bonus track from risking the core submission |

**Architecture rule:** PostgreSQL is the source of truth. Socket.IO broadcasts that committed state changed; it does not store the queue itself. The browser must fetch the latest permitted state on load and after reconnect.

**Do not build:** AI diagnosis, symptom-based automated triage, real hospital integration, real SMS/email delivery, patient medical records, payment flows, or a complete hospital management system.

---

## 1. Problem framing and product scope

### Primary persona

**Kamla, 62**, arrives alone at a fictional three-floor government hospital. She prefers Hindi, uses a basic Android phone, has limited digital confidence, and walks slowly and avoids stairs.

### One-sentence product promise

> OPD Saathi helps a patient register in a familiar language, receive a clear OPD token, understand their queue status, and follow accessible directions from the slip to the correct room.

### Product principles

1. **The slip-to-destination journey is the differentiator.** Queue tracking must work, but avoid turning the app into a generic admin dashboard.
2. **Accessibility is core functionality.** Large controls, language choice, assisted mode, read-aloud, clear text and step-by-step routes must not be deferred as decorative polish.
3. **A working end-to-end path beats feature breadth.** Complete and test one flow before adding optional features.
4. **No real patient data.** The hospital, staff, queue records and all demonstration patients are synthetic.
5. **The system never makes a medical triage decision.** It can tell someone to seek immediate help and alert staff, but only qualified medical staff assess and prioritise urgent cases.
6. **Be transparent.** Label the hospital, queue, estimated wait, SMS simulation and any offline snapshot as simulated or estimated where appropriate.

### In-scope user journeys

- Patient selects a language and registers for a department.
- Patient receives a token slip with token, department, room, floor, doctor, position, estimated wait and QR code.
- Patient checks their own token and the public queue; the status updates across separate phones/laptops.
- Patient enters a slip code or scans the QR where supported and receives directions to the assigned room.
- Staff authenticates to a demo staff view, calls the next patient, starts/completes a consultation, updates doctor availability and acknowledges requests for urgent assessment.
- Public queue board shows current token(s), wait estimate and doctor status without exposing patient details.
- Every screen has an Emergency route/action and a visible reminder that emergencies must not wait for the routine queue.

---

## 2. Requirements and priority tiers

### P0 — mandatory core for a credible submission

- Mobile-first home page with a first-visit language choice and **four large primary actions**: Register, My Turn, I Have My Slip, Find a Department/Help Desk. Emergency is a separate persistent action on every screen.
- Registration wizard: one question per screen, progress indicator, department picture/cards, Back preserving answers, assisted-registration option, and “Not sure?” help-desk route.
- English and Hindi translations for every screen and every user-facing state, including errors, queue status, directions, emergency copy and the public board.
- OPD slip: unique token, department, doctor, room, floor, people ahead, estimated waiting time, QR, large-text mode, read-aloud, print/save.
- My Turn: waiting position, now serving, doctor status, last-updated time, reconnecting/offline indicator, and a **three-people-ahead** alert using a visible banner plus sound or vibration when supported.
- “I Have My Slip”: manual token-code entry is always available; offer QR scanning only when supported and provide a clear fallback.
- Three-floor sample hospital route graph with correct floor transitions, accessible route and an Avoid Stairs option enabled by default for the main persona.
- Staff dashboard: staff-only Call Next / Start Consultation / Complete / Cancel or Requeue actions; doctor status/delay controls; urgent-assessment requests pinned at the top until acknowledged and accompanied by sound while enabled.
- Public queue board and patient screens update across independent devices within about one second under normal connectivity.
- On disconnect, show last known queue values with an explicit timestamp and stale warning; automatically reconnect and re-fetch.
- Emergency action on every screen, routes to the sample Emergency/Casualty location, displays 112 and 108 as requested by the brief, and tells the user to seek staff help immediately. Verify these numbers and local procedures before any real deployment.
- No automatic symptom classifier, medical diagnosis, automatic emergency ranking or queue hold for an emergency.
- Deployed public app, public GitHub repository, README, pitch deck and video within the event's required limits.

### P1 — add only after P0 is stable

- PWA installability and a service worker caching the app shell, floor plan and static directions.
- Read-only offline view of the patient's last known slip, with the last-sync timestamp and a stale-state warning.
- Store a registration attempted offline as **Pending confirmation**; never show a confirmed queue token until the server accepts it.
- Tamil as a third language, with every string and landmark translated (not just the home page).
- Microphone input using browser speech recognition where it is available, with a manual text/form fallback. Never make voice input required.
- Browser notifications or simulated SMS; never claim a real message was sent unless an actual provider is integrated.
- Render Workflows bonus, e.g. a scheduled anonymised queue-usage summary. Do not add this until the core app, tests and submission artefacts are ready.

### Explicit non-goals

- Connecting to a real hospital, ABHA/ABDM, government identity service or hospital EMR.
- Storing patient names, phone numbers, diagnoses, medical history or government identifiers.
- Medical advice, diagnosis, symptom scoring, AI triage or automated priority decisions.
- GPS-based indoor positioning, live building sensors or unverified indoor-map claims.
- Real SMS, WhatsApp, push provider, payments or production-grade hospital security claims.

---

## 3. Screens and behaviour specification

### 3.1 Patient Home

- Language picker shows each language in its own script (English, हिन्दी; தமிழ் only if P1 is completed).
- Four big actions: **Register**, **My Turn**, **I Have My Slip**, **Find a Department / Help Desk**.
- An Emergency action remains visible at the top or bottom of every screen.
- Show sample-hospital status and “Demo data — not connected to a real hospital.”
- Buttons should be at least 56 CSS pixels tall, text readable at 360px viewport width, and not rely on colour alone.

### 3.2 Emergency access and first-screen warning

- Present a short, reviewed list of warning signs that indicate the person should get immediate human help (for example, severe breathing difficulty, loss of consciousness, severe chest pain, major bleeding or suspected stroke). This list is informational, not a diagnostic checklist.
- The action opens a dedicated emergency panel with the route to Emergency/Casualty, 112 and 108, and “Tell hospital staff immediately; do not wait for a token.”
- Do not label a patient “emergency” automatically based on entered symptoms. Do not gate access behind registration. The routine queue must not delay emergency care.
- Patient “Request staff help / urgent assessment” creates a visible request for staff assessment; staff must interpret it. It must not quietly reorder the routine queue.

### 3.3 Registration wizard

- Keep each step to one decision; show `Step n of N` and a progress bar.
- Suggested minimum steps: preferred language (skip if already selected), visit type (first visit/follow-up), department, optional wayfinding preference (avoid stairs), review and confirm.
- Use simple department cards with an icon and plain-language label; include “Not sure? Go to the help desk.”
- The Back action preserves values. Validate required fields on the server, not just in the browser.
- Assisted mode uses larger text and simplified prompts, suitable for a staff member helping a patient. It is not a separate patient identity.
- Microphone entry is optional and feature-detected; never block registration when a browser lacks speech recognition.
- Keep the data minimal: do not ask for name, date of birth, diagnosis or phone number for the demo unless the organisers explicitly require it.
- On successful submission, show a confirmed ticket only after the server transaction succeeds. If the network fails, show retry/pending rather than inventing a token.

### 3.4 OPD slip

Display:

- Large token code and a text label such as “Your token”.
- Department and doctor label.
- Destination room, floor and a landmark.
- People ahead, current token being served, estimated wait and doctor availability.
- “Queue times are estimates; check the latest status” note.
- QR code with a non-PII ticket/deep-link payload. Do not encode medical details or personal contact data.
- Actions: Large Text, Listen/Read Aloud, Print, Save/Download if reliable, and Navigate to Room.
- Printing should use a print stylesheet that excludes navigation buttons and unnecessary page chrome.

### 3.5 My Turn

- Show the patient's ticket status, people ahead, current token, estimated wait, doctor status and last successful update timestamp.
- At three or fewer people ahead, show a persistent banner and trigger sound/vibration only where the browser permits it. A visible banner is the reliable fallback.
- Ask permission before using browser notifications; do not repeatedly prompt for permission.
- When called, switch to a clear “Your turn — go to Room X, Floor Y” state with directions.
- If the doctor is on a break or unavailable, show that plainly and explain whether the estimate is paused or based on a declared delay.
- Use a threshold-crossing rule to avoid repeating the three-ahead alert on every render. Store an `alerted_at` marker per ticket/session or compare the previous count to the new count.

### 3.6 I Have My Slip

- Manual ticket-code entry is mandatory and works even when camera access is denied.
- QR camera scanning is progressively enhanced. Feature-detect it and handle permission denial, camera absence, malformed QR payload and scanning failure without trapping the user.
- QR decoding must never directly execute content. Accept only the application's expected URL/schema and a valid token format.
- Show the destination and route only after confirming the ticket exists. Keep medical/private information out of QR payloads.

### 3.7 Hospital navigation

- Model a fictional **City District Hospital** with three floors and sample destinations: main entrance, registration/help desk, OPD waiting area, medicine/general OPD, paediatrics, laboratory, X-ray, pharmacy, lifts, staircases and Emergency/Casualty.
- Use a static, version-controlled graph in `src/data/hospitalGraph.json`; do not fake GPS or live indoor location.
- Each node has a stable ID, translated display name, floor, type, landmark text, and optional map coordinates. Each edge has destination, estimated walking seconds/metres, accessible flag and mode (`corridor`, `lift`, `stairs`, `ramp`).
- Use Dijkstra (or another small shortest-path algorithm) over the graph. “Avoid stairs” excludes staircase edges before pathfinding; the lift must correctly connect all accessible floors. Default it on for Kamla's scenario.
- Render text directions as ordered steps, e.g. “From Registration, follow the blue OPD sign to the lift; go to Floor 2; turn left at the waiting area; Room 204 is on your right.” Do not rely on colour alone; pair visual landmarks with text.
- If no accessible route exists, clearly say so and direct the patient to ask the help desk. Never invent a route.
- Build a small, legible schematic floor map only if time permits; step-by-step directions and correct graph data are more important than a beautiful but inaccurate map.

### 3.8 Staff dashboard

- Demo staff enters a PIN. Verify it against a server-side bcrypt hash, apply rate limiting, create an expiring PostgreSQL-backed session with `express-session`/`connect-pg-simple`, and set a signed HttpOnly cookie. Logout must destroy the server-side session. A client-side-only PIN check is insufficient.
- Demo PIN is only for the synthetic hackathon prototype. Document that a real hospital needs proper user accounts, roles, audit trails and deployment/security review.
- Staff can choose a department, view its queue and doctor status, call the next waiting ticket, start consultation, complete, cancel or requeue a ticket, and set doctor status/delay.
- Enforce valid transitions on the server. Prevent two staff actions from calling two active patients for the same department simultaneously.
- Urgent-assessment requests are pinned above routine queue controls. Play a sound until acknowledged while sound is enabled; also show a persistent visual badge because browser audio may be blocked. Acknowledgement must be explicit and recorded.
- The app does not determine urgency. Staff assess and decide what happens next. A real emergency must never be trapped behind “Call Next”.
- Keep staff-only controls absent from the patient UI **and** protected at the API/socket layer.

### 3.9 Public queue board

- Large typography with department, now-serving token, waiting count, broad ETA and doctor status.
- No names, phone numbers, ticket access secrets, personal history or detailed urgent flags.
- Queue changes update in real time and a reconnect triggers a fresh snapshot.
- Must remain readable on a normal laptop display and a mobile browser.

### 3.10 Error and empty states

- Add a React error boundary / friendly fallback page, plus understandable API errors and retry actions.
- Handle no departments, empty queue, ticket not found, expired session, invalid PIN, disconnected socket, denied camera/microphone, unavailable speech voice and unavailable accessible route.
- Never show a blank screen or claim success before the server confirms a state-changing request.

---

## 4. Architecture and data flow

```text
Patient phone / Staff browser / Public queue board
                 | HTTPS REST + Socket.IO
                 v
      Render Web Service (single origin)
      ├── React/Vite static build
      ├── Express API + input validation
      ├── Staff-session and ticket-capability checks
      ├── Queue service and transaction rules
      ├── Socket.IO rooms/events
      └── Navigation data served with the frontend
                 |
                 | parameterised PostgreSQL queries over TLS
                 v
       Supabase-hosted PostgreSQL
       ├── departments
       ├── tickets + queue counters
       ├── doctor_status
       ├── urgent_flags
       └── minimal audit_events
```

### Data-flow rules

1. Browser sends a command to the API; the API authenticates/authorises and validates it.
2. The server performs a PostgreSQL transaction and commits the change.
3. **Only after commit**, the server emits a small Socket.IO invalidation/update event to the relevant room(s).
4. Connected clients re-fetch the permitted current state from the API. Do not broadcast ticket secrets or entire private ticket records into public rooms.
5. On first page load or socket reconnection, fetch the current snapshot; do not assume every socket event was received.
6. Every page shows `Updated at HH:MM:SS` or a relative timestamp. When offline, retain the last known view, mark it stale and do not describe stale queue position as live.

### Socket rooms and payloads

- `queue:<departmentId>` — public, minimised event such as `{ departmentId, version, updatedAt }`.
- `ticket:<ticketId>` — only after the server validates the patient's ticket capability token; send a minimal `ticket.updated` event.
- `staff:<departmentId>` — staff-authenticated sockets only; contains actionable staff events and urgent-assessment requests.
- Example event names: `queue.updated`, `ticket.updated`, `doctor.updated`, `urgent.created`, `urgent.acknowledged`.
- Avoid broadcasting the access token, PIN, session cookie, patient contact data or full database rows.

**Reliability rule:** events are hints that the committed state changed. A client that misses an event recovers via a fresh API read. For the hackathon's single backend instance this is sufficient; multi-instance scaling would later need a shared Socket.IO adapter/message broker.

---

## 5. Database model and invariants

Use PostgreSQL with migrations checked into the repository and a seed script. Store only synthetic demonstration data.

### 5.1 Tables

#### `departments`

- `id` (UUID primary key)
- `slug` (unique, stable identifier)
- `name_en`, `name_hi` (and `name_ta` only if Tamil is implemented)
- `room_label`, `floor_number`
- `average_consult_minutes` (positive integer)
- `is_active`, `created_at`

#### `queue_counters`

- `department_id` + `queue_date` composite primary key
- `last_sequence` integer
- Used inside the registration transaction to allocate unique daily sequences safely under simultaneous requests.

#### `tickets`

- `id` UUID primary key
- `public_code` unique and non-PII (e.g. `OPD-GEN-042`; rotate/reset with the demo date)
- `department_id` foreign key
- `queue_date`, `sequence_no`
- `status`: `WAITING`, `CALLED`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`, `NO_SHOW`
- `access_token_hash` for the patient's ticket capability; return the raw random token only at creation and never store it in plaintext
- `request_id`/idempotency key (unique per creation request) so a network retry cannot generate duplicate registrations
- `created_at`, `updated_at`, optional `called_at`, `consultation_started_at`, `completed_at`
- No name, phone, diagnosis, government ID or medical record.

#### `doctor_status`

- `department_id` primary/foreign key
- `status`: `AVAILABLE`, `ON_BREAK`, `DELAYED`, `UNAVAILABLE`
- `delay_minutes` or `break_until` as appropriate
- `updated_at`, optional `updated_by_staff_session_id`

#### `urgent_flags`

- `id` UUID primary key
- optional `ticket_id` foreign key
- `request_type`: `STAFF_HELP` / `URGENT_ASSESSMENT_REQUEST`
- `status`: `NEW`, `ACKNOWLEDGED`, `RESOLVED`
- `created_at`, `acknowledged_at`, `resolved_at`, `acknowledged_by`
- A human-created flag is a request for assessment, **not an app-made clinical determination**.

#### `audit_events` (small, no secrets)

- `id`, `actor_type`, action, relevant record ID, timestamp, minimal structured metadata
- Do not record PINs, session tokens, ticket capability tokens or unnecessary patient details.

The hospital graph can remain static JSON; do not create a complex map editor/database for this prototype.

### 5.2 Queue and state invariants

- A registration has exactly one department, one queue date and one unique sequence number.
- Token sequence allocation is atomic. Recommended approach: in a transaction, upsert/increment `queue_counters` with `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING last_sequence` (or lock the relevant counter row) and then insert the ticket.
- The database prevents more than one `CALLED`/`IN_CONSULTATION` active ticket in a department's queue at a time, using a partial unique index on `(department_id, queue_date)` for those active states.
- The server validates every status transition. Suggested transitions: `WAITING → CALLED → IN_CONSULTATION → COMPLETED`; staff may `WAITING → CANCELLED`, `WAITING → NO_SHOW`, or requeue a no-show/cancelled ticket by an explicit staff action. Do not let the browser write `status` directly.
- `Call Next` selects the lowest-sequence `WAITING` ticket in a transaction, only if there is no active ticket. If an active ticket exists, tell staff to finish/resolve that encounter first.
- Queue rank counts still-waiting tickets in the same department/date with smaller sequence numbers. Active “now serving” is displayed separately. Define this once in the shared queue service and test it; do not reimplement subtly different formulas in several components.
- Urgent flags do not change `sequence_no` and do not automatically rewrite ticket status. Only a staff action after human assessment can alter how a case is handled.
- Database writes happen before socket events are emitted. Failed transactions emit no success event.
- All timestamps are stored as UTC timestamps; the UI displays local time in `Asia/Kolkata` for the event/demo.

### 5.3 Waiting-time estimate

Keep the formula transparent and deterministic. A suitable prototype estimate is:

`estimatedWaitMinutes = estimatedActiveRemainder + (peopleAheadWaiting × department.averageConsultMinutes) + declaredDelayMinutes`

- `estimatedActiveRemainder` may use one average consultation duration when a patient is already being served; say “approximate” rather than presenting false precision.
- If the doctor is `ON_BREAK`, include a declared remaining break duration if staff has supplied one. If it is `UNAVAILABLE` with no reliable return time, show “Delay — ask the help desk” rather than inventing an ETA.
- Recompute from current server state, not from a browser timer that drifts.
- Display a disclaimer: estimates can change with consultation length and staff availability.

---

## 6. API contract (minimum surface area)

All request bodies require schema validation. Use parameterised SQL, consistent HTTP errors and a request ID for debugging.

| Method / route | Access | Purpose |
|---|---|---|
| `GET /api/health` | Public | Deployment liveness check; no secrets in response |
| `GET /api/departments` | Public | Active department cards and room metadata |
| `GET /api/queues/:departmentId/public` | Public | Minimised queue board, now serving, count, ETA and doctor status |
| `POST /api/tickets` | Public, rate-limited | Create ticket idempotently; return public slip fields and one-time capability secret |
| `GET /api/tickets/:id` | Ticket capability required | Read only the caller's ticket and public destination details |
| `GET /api/tickets/:id/route` | Ticket capability or validated public ticket code | Retrieve route instructions; no PII |
| `POST /api/tickets/:id/help-request` | Ticket capability required | Create request for human staff assessment/help; does not auto-triage or reorder |
| `POST /api/staff/session` | Public, rate-limited | Verify demo PIN against its server-side hash and create a PostgreSQL-backed expiring session |
| `DELETE /api/staff/session` | Staff session | Destroy server session and clear cookie |
| `GET /api/staff/queues/:departmentId` | Staff session | Full routine queue for staff controls |
| `POST /api/staff/queues/:departmentId/call-next` | Staff session | Atomically call next ticket if no active ticket exists |
| `POST /api/staff/tickets/:id/start` | Staff session | Start the consultation for a called ticket |
| `POST /api/staff/tickets/:id/complete` | Staff session | Complete an active consultation |
| `POST /api/staff/tickets/:id/cancel` | Staff session | Cancel a ticket with reason code (no free-text PHI) |
| `POST /api/staff/tickets/:id/requeue` | Staff session | Explicitly return an eligible ticket to the waiting queue |
| `PATCH /api/staff/departments/:id/doctor-status` | Staff session | Update availability and declared delay |
| `GET /api/staff/urgent-flags` | Staff session | Retrieve new/acknowledged assessment flags |
| `POST /api/staff/urgent-flags/:id/acknowledge` | Staff session | Acknowledge request, persist actor/time and stop repeated alert sound |
| `POST /api/staff/urgent-flags/:id/resolve` | Staff session | Resolve after staff action |

**Do not create an endpoint that lets arbitrary clients set a patient to `EMERGENCY` or directly modify queue rank.**

### API and browser security rules

- Use `helmet`, conservative rate limits for ticket creation and PIN attempts, input validation, SQL parameters and request-size limits.
- Staff actions and staff Socket.IO rooms require a valid server-issued session. Hiding a button is not security.
- Store staff sessions server-side in PostgreSQL (for example via `connect-pg-simple`) so logout/revocation actually invalidates them. Set the cookie `HttpOnly`, `Secure` in production, `SameSite=Lax` or stricter where workable, with a short expiry. Check Origin/CSRF protections for state-changing cookie-authenticated routes.
- Keep database URL, PIN/hash, signing secret and other secrets in hosting environment variables. Commit only `.env.example` with placeholder values.
- Use same-origin hosting where possible. Do not ship a PostgreSQL password or privileged database key to Vite/browser code.
- Restrict public ticket reads to the ticket's capability token. Store only a hash of that token. Treat a QR deep link capability as a bearer secret: no personal data in it, never log it, and minimise exposure in browser history/referrer where practical.
- Public board events contain only public aggregate/token data. Patient-specific events go only to a validated ticket room.
- If demo data is seeded on startup, make it idempotent and never reset a live queue unexpectedly on every server restart.

---

## 7. Real-time, connection-loss and offline design

### Live update sequence

1. Browser loads current state via REST.
2. Browser establishes a Socket.IO connection.
3. Client subscribes only to its authorised room(s).
4. Staff or patient submits a state-changing API request.
5. Server validates and commits the transaction.
6. Server emits a small update event; clients re-fetch current allowed state.
7. A reconnect event triggers a full REST refetch to recover missed notifications.

### Connection handling

- Add states: `Connected`, `Reconnecting`, and `Offline — showing last update at …`.
- Keep a read-only cached snapshot of the patient's most recent slip and public queue status, with a last-updated timestamp.
- Do not label a stale snapshot as live. Do not allow staff queue mutations without server connectivity.
- If a registration request fails or times out, retry using the same idempotency key. Do not create a second token accidentally.
- If offline registration is implemented (P1), display `Pending confirmation`; the server must allocate the real sequence only when it receives and validates the request.
- Cache only the app shell, hospital graph and static translations in the service worker. Do not cache staff APIs or server responses containing credentials. Avoid broad service-worker caching of `/api/*`.

---

## 8. Accessibility, localisation and content rules

### Accessibility baseline

- Design and test at 360px width and at large browser text settings; no horizontal overflow or clipped Hindi labels.
- Controls are preferably at least 56px high, with generous spacing and visible focus rings.
- Use semantic landmarks, headings in order, explicit form labels, useful error descriptions and keyboard navigation.
- Maintain readable contrast, don't convey states by colour alone, and respect `prefers-reduced-motion`.
- Keep language switching available after the initial selection; back navigation must preserve answers.
- Use icon + text labels; icons alone are insufficient for key actions.
- Read-aloud uses the browser speech synthesis API only when a voice is available. Do not make audio the only way to receive an important alert.
- For staff alert sound, provide an “Enable alert sound” action after a user gesture; continue to show visible urgent flags if audio is blocked.

### Translation implementation

- Store all user-visible strings in translation files (`src/i18n/en.json`, `hi.json`, and `ta.json` only if P1 is completed). No important literal English strings scattered inside components.
- Translate error/empty/loading states, token slip, room names, floor names, route steps, emergency panel, board, form validation and staff alerts.
- Keep conventional sign labels such as OPD, Casualty and X-ray with a familiar-language explanation where appropriate.
- The language picker labels languages in their own scripts (English, हिन्दी, தமிழ்).
- Test the longest translated text at 360px and on the public board.

---

## 9. Suggested repository structure

Keep one repository and one Node package to reduce setup/deployment overhead. Exact names can change if Antigravity has a strong reason, but responsibilities should remain separated.

```text
opd-saathi/
├── README.md
├── TECHNICAL_PLAN.md
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── vite.config.js
├── index.html
├── public/
│   ├── icons/
│   └── manifest.webmanifest
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── routes/
│   ├── components/
│   │   ├── EmergencyAction.jsx
│   │   ├── LanguagePicker.jsx
│   │   ├── StatusBanner.jsx
│   │   └── ErrorFallback.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── RegistrationPage.jsx
│   │   ├── TicketSlipPage.jsx
│   │   ├── MyTurnPage.jsx
│   │   ├── FindMySlipPage.jsx
│   │   ├── NavigationPage.jsx
│   │   ├── StaffLoginPage.jsx
│   │   ├── StaffDashboardPage.jsx
│   │   └── PublicBoardPage.jsx
│   ├── api/                  # fetch wrappers and API response handling
│   ├── hooks/                # queue subscription, connectivity, speech
│   ├── i18n/                 # English/Hindi (Tamil optional)
│   ├── data/hospitalGraph.json
│   ├── services/              # client-side formatting and queue presentation
│   ├── styles/
│   └── test/
├── server/
│   ├── index.js
│   ├── app.js
│   ├── config/env.js
│   ├── middleware/
│   │   ├── requireStaff.js
│   │   ├── requireTicketAccess.js
│   │   ├── rateLimit.js
│   │   └── errorHandler.js
│   ├── routes/
│   ├── services/
│   │   ├── queueService.js
│   │   ├── ticketService.js
│   │   ├── navigationService.js
│   │   └── urgentFlagService.js
│   ├── sockets/
│   ├── db/
│   │   ├── pool.js
│   │   ├── migrations/
│   │   └── seed.js
│   └── test/
└── docs/
    ├── architecture.md
    ├── demo-script.md
    └── test-evidence.md
```

Do not build every folder as a placeholder before the first screen works. Create only the needed files as each phase starts. Keep queue/business rules out of React components and Express route handlers; put them in small service functions so they can be tested.

### Suggested package scripts

- `npm run dev` — frontend + API in development (use `concurrently` and a Vite proxy).
- `npm run build` — build the React client.
- `npm start` — start Express, serve `dist/`, expose `/api/*` and Socket.IO.
- `npm test` — run unit and API tests.
- `npm run db:migrate` — apply checked-in schema migrations.
- `npm run db:seed` — seed fictional departments, routes and sample queue entries safely.

In production, configure Express to serve the built frontend and an SPA fallback for frontend routes, while **not** falling back `/api/*` errors to `index.html`. Set up `vite.config.js` proxy for `/api` and `/socket.io` in development. Confirm that refreshing `/staff` or `/board` works after deployment.

---

## 10. Team responsibilities and integration process

### Three-member team

**Member A — Patient UI and accessibility**
- Owns Home, registration wizard, token slip, My Turn, slip lookup, Hindi/English interface and responsive layout.
- Uses API contracts agreed with Member B; does not write mock business logic that diverges from the server.

**Member B — Backend, database and real-time queue (integration owner)**
- Owns schema/migrations, ticket sequence transactions, state transitions, staff session, API, Socket.IO and deployment environment.
- Maintains the only integration branch; reviews all merges and keeps a known-good build deployable.

**Member C — Navigation, staff/board UI, QA and submission**
- Owns graph/routes, route tests, public board and/or staff dashboard UI, accessibility manual checks, README, deck and demo script.
- Coordinates test execution and maintains the bug list. If the staff UI is larger than expected, prioritise correctness before map animation or styling.

### Two-member team

- **Member A:** patient screens + visual/accessibility system.
- **Member B:** API/database/realtime + basic staff dashboard.
- Split navigation graph, QA and submission documentation between both; use the same frozen API schema.

### Integration rules

- Create the repository and deploy a plain placeholder as early as possible.
- Use short-lived feature branches and small commits; one integration owner merges tested work.
- Agree on API payloads, enum values, route node IDs and translation keys before parallel implementation.
- Build against one shared API contract. Do not let each teammate create a separate set of mock state variables.
- After every integration, run build + smoke tests. Keep a tag/branch for the last stable demo.
- Keep a short bug queue: `Blocker`, `Important`, `Polish`. Stop adding features if a blocker remains.

---

## 11. Phase-wise delivery plan and gates

The order below prioritises a working public demo early. Hour ranges are targets, not permission to let a phase overrun. Use the compressed schedule in section 12 if the actual submission deadline is earlier.

### Phase 0 — Establish repository and deployable skeleton (H0–H2)

**Tasks**
- Create public GitHub repo, root package, React/Vite app and Express health endpoint.
- Configure Vite proxy for API/socket in dev.
- Create Supabase Postgres database and connect server using environment variables.
- Deploy a placeholder to Render and prove that `/api/health` and the frontend work publicly.
- Create `.env.example`, `.gitignore`, README skeleton and one initial seed/migration.

**Gate:** Public URL loads on phone and laptop; health endpoint works; no secret is committed.

### Phase 1 — Patient shell and registration UI (H2–H6)

**Tasks**
- Implement home with four large actions, persistent Emergency action and language picker.
- Build one-question-per-screen registration with progress, department cards, Back-preserved state and help-desk path.
- Wire first English/Hindi translations and core accessibility styles.
- Use clearly marked temporary sample data only until the API exists.

**Gate:** A first-time user can navigate the whole registration UI at 360px width; no dead-end buttons.

### Phase 2 — Database, ticket creation and slip (H4–H10, partly parallel)

**Tasks**
- Add departments, counters, tickets, status constraints and seeds.
- Implement server-side registration validation, idempotency and atomic sequence allocation.
- Implement ticket capability, ticket fetch, slip and public queue API.
- Build token slip fields, QR, print CSS, large text and read-aloud.

**Gate:** Repeated/retried registration does not duplicate a token; concurrent registrations do not receive the same department/day sequence; confirmed slip matches the database.

### Phase 3 — Queue service, staff actions and real-time sync (H8–H16)

**Tasks**
- Implement valid status transitions and one-active-ticket invariant.
- Implement staff PIN session and staff-only APIs/Socket.IO rooms.
- Build basic staff dashboard and public board.
- Emit events only after database commit; clients re-fetch after events/reconnect.
- Show last-update time and stale/offline banner.

**Gate:** With three independent clients (patient, staff, board), Call Next/Complete updates the correct screens without refresh within about one second on a healthy connection; a non-staff client cannot call next.

### Phase 4 — Navigation and emergency handling (H12–H19, partly parallel)

**Tasks**
- Build three-floor graph, lift links, stair edges and translated landmark/direction labels.
- Implement shortest path and Avoid Stairs filter.
- Add route from ticket slip to room and slip-code/QR lookup.
- Add Emergency panel on every route, 112/108 display, emergency location and first-screen safety information.
- Implement staff urgent-assessment queue, persistent banner and acknowledge sound/visual behaviour.

**Gate:** No path crosses an invalid floor transition; Avoid Stairs yields a route without staircase edges or states that no accessible route is known. Emergency is reachable without registration and no app logic silently holds a case.

### Phase 5 — Alerts, graceful failure and optional PWA (H16–H25)

**Tasks**
- Implement one-time threshold-crossing alert at three people ahead.
- Feature-detect sound, vibration, browser notifications, camera and speech APIs; ensure fallbacks exist.
- Add PWA only after normal deployed functionality passes; cache static assets and directions, not staff APIs.
- Add stale slip view and pending-confirmation status for offline registration only if time allows.

**Gate:** Browser API unsupported/permission denied does not block core task; offline state is clearly marked and never mistaken for current server data.

### Phase 6 — Test, fix and stabilise (H24–H34)

**Tasks**
- Run unit/API tests and the manual checklist in section 13.
- Test on actual phone and desktop, different tabs/devices, lost connection/reconnect and direct-route refresh.
- Fix blockers and important defects. Do not introduce new core features during this window.
- Capture screenshots and evidence as tests pass.

**Gate:** All P0 acceptance tests pass, deployment works in a private browser window, and every teammate can explain the queue and emergency design.

### Phase 7 — Submission artefacts and freeze (H34–H48)

**Tasks**
- Freeze functionality; only blocker fixes after the freeze.
- Complete README, public repository, live URL, demo video ≤5 minutes and shareable pitch deck.
- Record the core story with realistic seeded demo records and visible cross-device update.
- Check links in a private/incognito browser and make the final submission with a buffer.

**Gate:** Public repo, live app, video and deck all open without special sign-in; submission is completed before the organiser's real deadline.

---

## 12. Critical deadline note and compressed fallback

The published event page describes a 48-hour event from **23 October 2026, 9:30 PM to 25 October 2026, 9:30 PM**. The published “Your working demo in 48 hours” guide says submissions close at **midnight IST at the end of Saturday, 24 October**. These statements conflict. Check the event dashboard/organisers immediately; do not assume the later time is accepted.

If the earlier deadline is enforced, use this priority plan from the start of work:

1. **H0–H2:** repo + deployable React/API skeleton + DB connectivity.
2. **H2–H6:** patient registration, confirmed token/slip, English/Hindi and seeded sample data.
3. **H6–H10:** queue service, staff actions and public board.
4. **H10–H14:** cross-device realtime, 3-ahead alert, navigation graph and Emergency action.
5. **H14–H18:** secure staff-only routes, urgent flags, accessible responsive refinements.
6. **H18–H21:** regression tests, live deployment, broken-link and data-permission checks.
7. **H21–H24:** README, video, deck and submission.
8. **Keep at least the final 3–4 hours protected** for demo recording, uploads, permissions and submission problems. If the time available is less than 24 hours, skip P1 features and prioritise this checklist in order: token creation → queue updates → accurate route → emergency handling → submission artefacts.

Do not add Tamil, offline registration, fancy maps or Render Workflow bonus work until P0 passes. A simplified but connected end-to-end product is the goal.

---

## 13. Test strategy and acceptance criteria

Automate pure queue/pathfinding rules and key API invariants; test browser behaviour manually across devices. The tests below are acceptance criteria, not optional aspirations.

### 13.1 Unit tests

**Queue logic**
- Queue rank is limited to the ticket's department and queue date.
- Completed/cancelled tickets are not counted as waiting ahead.
- `Call Next` selects the lowest waiting sequence.
- A second active ticket cannot be created for the same department/date.
- ETA responds to number ahead, consultation duration and declared delay; an unavailable doctor without a reliable return time does not display a fabricated exact ETA.
- A threshold alert fires when crossing to ≤3 people ahead, not on every render.
- A failed transaction never returns a confirmed ticket.

**Navigation**
- Each intended floor has a valid lift connection.
- Routes never refer to missing node IDs.
- Avoid Stairs excludes all staircase edges.
- Unknown destination returns a helpful failure state rather than a fabricated route.
- Direction labels exist for every supported language or fall back deliberately, never silently mix languages across critical safety copy.

**State transitions**
- Invalid transitions are rejected by the server.
- Urgent flag creation does not alter queue sequence/status.
- Only staff can acknowledge an urgent flag or call the next ticket.

### 13.2 API/integration tests

- Public registration creates a unique token and stores no PII.
- Sending the same `request_id` twice returns the same ticket result rather than creating duplicates.
- Two concurrent registration requests get distinct sequences.
- Ticket A's capability cannot fetch Ticket B.
- Unauthenticated/non-staff calls to staff routes receive `401/403`.
- Invalid PIN, repeated PIN failures, expired staff session and logout behave correctly.
- SQL-injection-shaped inputs are rejected/treated as data.
- `Call Next`, Start, Complete, Cancel and Requeue persist legal state transitions.
- Server commits before clients are told an action succeeded.
- Public queue response/events contain no ticket capability, patient name, phone or private fields.

### 13.3 Multi-client real-time test

Open three distinct clients (separate browser profiles/devices recommended):

1. Patient ticket page.
2. Staff dashboard.
3. Public queue board.

Create a new ticket or call the next token. Verify the right patient and board update without manual refresh. Disconnect the patient client, perform another update, reconnect and verify it re-fetches the current position and displays the correct timestamp. Healthy-connectivity target: update visible within approximately one second.

### 13.4 Navigation route test matrix

Test at least these 10 origin/destination pairs, with Avoid Stairs both on and off when relevant:

1. Main Entrance → Registration.
2. Registration → General OPD waiting area.
3. Registration → Room 204 on Floor 2.
4. Main Entrance → Pharmacy.
5. Floor 1 waiting area → Laboratory on Floor 2.
6. Laboratory → X-ray.
7. OPD Room 204 → Pharmacy on another floor.
8. Main Entrance → Emergency/Casualty.
9. Floor 3 clinic → Registration/help desk.
10. Any node → an intentionally disconnected/unknown node (expected graceful failure).

For each test, inspect the full node sequence and directions, check floor transitions and confirm Avoid Stairs uses the lift/ramp where the sample graph allows it.

### 13.5 Accessibility and browser checks

- Screen width 360px, common desktop width and 200% zoom/text size; no sideways scrolling, clipped text or overlapping buttons.
- Keyboard-only navigation, visible focus, semantic labels and logical reading order.
- English and Hindi across every screen, including error states and room names.
- Camera denied/unavailable → manual ticket entry remains usable.
- Speech voice unavailable → read-aloud is hidden or gracefully unavailable; text remains complete.
- Sound permission/autoplay blocked → urgent flag still visible and not lost.
- Screen refresh at `/staff`, `/ticket/...` and `/board` returns the React app rather than a server 404.
- Error in a route does not blank the entire application.

### 13.6 Manual demo checklist

- Register a Hindi-language patient in assisted mode.
- Show a ticket and QR code, then use “I Have My Slip” and follow the Avoid Stairs route to the correct room.
- On staff screen, call the next patient and visibly update the patient's My Turn screen and public board.
- Trigger the three-ahead alert from seeded queue state.
- Raise a staff-assessment/urgent flag, show it pinned at the top, and acknowledge it to stop the sound.
- Demonstrate the emergency path from a patient screen without registering or joining the routine queue.
- Turn off network once; show last-known timestamp; reconnect and verify a fresh queue snapshot.
- Be explicit that SMS is simulated and that hospital/patient records are synthetic.

---

## 14. Deployment and environment

### Render + Supabase setup

1. Create the Supabase PostgreSQL project and copy its connection string using the appropriate SSL-enabled/pooler settings from the Supabase dashboard.
2. Apply migrations and seed the fictional hospital/department/map data.
3. Create a Render Web Service connected to the public GitHub repo.
4. Configure build command `npm ci && npm run build` and start command `npm start` (adjust only if the chosen package scripts differ).
5. Configure environment variables on Render:
   - `NODE_ENV=production`
   - `PORT` (provided by Render; server must read `process.env.PORT`)
   - `DATABASE_URL` (never exposed to the client)
   - `STAFF_DEMO_PIN_HASH` (bcrypt hash generated for a synthetic demo PIN)
   - `SESSION_SECRET` (long random secret)
   - `DEMO_MODE=true` for synthetic demo safeguards, if used
   - any allowed origin only if hosting requires cross-origin traffic; prefer same-origin to avoid CORS
6. Verify the frontend calls a relative `/api` path and Socket.IO connects to the current host—not `localhost`.
7. Confirm health, migration success, logs and WebSocket connection from a browser on a second device.
8. Keep a private copy of credentials. `.env.example` contains names and placeholder values only.
9. If database access or networking fails, provide a clean error state and logs with request ID but never log secrets.
10. Open the public live link from an incognito/private browser and a phone before submitting.

### Demo PIN and production disclaimer

The PIN is a convenience for this synthetic prototype only. Compare against a server-side hash, use a short-lived server-backed session cookie, rate-limit login attempts and do not commit the PIN/hash or session signing secret. The README may provide a dedicated demo-only credential to judges if necessary, but it must be clearly labelled as non-production and must never be reused for a real hospital. A real deployment requires institution-managed identities, roles, audit policy, security review and operational ownership.

---

## 15. README, pitch, and demo deliverables

### README.md must contain

- Problem statement in two concise lines and target persona.
- What each screen does, one line per screen.
- Stack and architecture (what talks to what and where data is stored).
- Queue rank and estimated-wait calculation in plain language.
- How routes are computed and how Avoid Stairs works.
- Emergency handling and the reason the app never decides who is medically urgent.
- Accessibility design choices: assisted mode, large controls, translations and read-aloud.
- Setup/run instructions, migration/seed instructions, environment variable names, tests and deployment instructions.
- Live demo link, public repository, video link and pitch deck link.
- What is real, what is simulated, current limitations and what would be needed for real hospital adoption.
- Team member roles.

### Pitch deck — seven-slide structure

1. Title, team and one-line value proposition.
2. Patient problem/persona and the point of confusion after the OPD slip.
3. Solution overview with actual product screenshot.
4. End-to-end journey: register → ticket → live queue → accessible route.
5. Architecture/technical execution: Express + Socket.IO + PostgreSQL + route graph.
6. Safety, accessibility and impact; state clearly that emergencies are staff-assessed and records are simulated.
7. Live URL, repository, next steps and team.

Avoid unsupported impact statistics. Use observations from actual user testing only if the team has collected them; otherwise present intended benefits as hypotheses, not measured outcomes.

### Demo video — target 3–4 minutes, never over 5

- **0:00–0:20:** State the problem and introduce Kamla; say what OPD Saathi makes easier.
- **0:20–1:15:** Register in Hindi/assisted mode and show the generated OPD slip.
- **1:15–2:00:** Show live queue updates on patient/staff/public board and the three-ahead alert.
- **2:00–2:45:** Scan/enter the slip and follow the Avoid Stairs route to the right floor/room.
- **2:45–3:15:** Show Emergency and the staff urgent-assessment flow; explain no automatic medical triage occurs.
- **3:15–3:45:** Explain stack, data privacy and what is simulated; end with the deployed URL.

Start with the app working in the first 20 seconds. Use seeded data and preload the correct screens, but do not edit the recording to imply an unimplemented feature works. Confirm the video is viewable by anyone with the link and is not accidentally private.

---

## 16. Risks and mitigations

| Risk | Why it matters | Mitigation / fallback |
|---|---|---|
| Published event deadline conflict | Could leave too little time for submission | Confirm dashboard deadline immediately; use compressed schedule; submit early |
| Over-scoping | Too many partial features hurt technical execution | P0/P1 split; no P1 until P0 acceptance passes |
| Duplicate tokens under concurrent requests | Breaks the core queue demo | PostgreSQL transaction + atomic counter + idempotency key + concurrency test |
| Frontend-only staff PIN | Anyone can fake a staff screen/action | Verify session and role on server for every mutation/socket room |
| Events lost on disconnect | Patient sees stale queue | Initial fetch, timestamp, reconnect/refetch and stale banner |
| Socket event before database commit | UI shows state that was rolled back | Emit only after successful commit |
| Emergency flow implies automated triage | Safety and judging failure | Staff-assessed flags, persistent Emergency access, no automatic priority changes |
| Incorrect accessible route | The core navigation promise fails | Explicit graph/edge data, lift connections and 10-pair route test matrix |
| Camera/audio unsupported | Some demo phones/browser permissions block APIs | Manual ticket code, visual alert and text directions are always available |
| Poor connectivity | Hospital networks can be weak | Cached static directions and last-known slip; clearly mark stale data |
| Language gaps | Untranslated labels undermine inclusion | Central translation files and per-screen language QA |
| Deployment behaves differently from local | Judges cannot try the app | Deploy on day one, use relative API path, test incognito/mobile and refresh deep links |
| Secrets leak into public GitHub | Could allow unauthorised DB access | `.env` ignored, environment secrets only, review `git status` before push |
| AI edits break working code | Last-minute regression | Small scoped prompts, inspect diff, run tests, keep stable tag/branch, revert rather than patch blindly |

---

## 17. Build discipline for Antigravity

Use this document as the source of truth. Antigravity may propose changes, but must explain the reason and impact before changing core architecture or safety requirements.

### Mandatory operating rules

- First inspect the repository and report its current state; do not assume a blank workspace.
- Produce an implementation sequence and file plan before large code generation, then implement in milestones.
- Build the smallest end-to-end flow first; test after each milestone.
- Do not add unrequested products/frameworks or replace the chosen stack without explaining a concrete blocker.
- Never use a frontend-only mock for a feature described as persistent/cross-device. Label any remaining mock clearly.
- Keep the database as the source of truth; do not maintain independent unsynchronised queue arrays in multiple screens.
- For a defect, identify the reproducible steps, expected vs actual result, likely root cause and smallest relevant fix. Avoid unrelated rewrites.
- Never report a test or feature as passing without actually running/checking it. Distinguish “implemented”, “manually tested”, “automated test passed”, “partly done” and “not done”.
- After each phase, return: files changed, implementation notes, commands run, tests and outcomes, remaining defects, and next phase.
- Keep `README.md`, `.env.example`, migrations, seeds and tests current as implementation changes.
- Before final delivery, compare the actual product against every P0 item in section 2 and create a gap report: `Done / Partly done / Missing`, with evidence for each item.

### Required checkpoints

1. **Checkpoint A — architecture and repository audit:** proposed stack, directory plan, environment assumptions, risk/deadline confirmation.
2. **Checkpoint B — first deployed vertical slice:** registration → database token → slip works on the public link.
3. **Checkpoint C — queue integrity:** staff transitions, queue invariant tests, public board.
4. **Checkpoint D — realtime and navigation:** cross-device updates, reconnection and tested accessible routes.
5. **Checkpoint E — safety and accessibility:** emergency action, human-assessed urgent requests, translated flows, keyboard/mobile checks.
6. **Checkpoint F — release audit:** security/environment review, all tests, public links, README, video, deck and P0 gap report.

---

## 18. Definition of done

The submission is ready only when all of the following are true:

- [ ] A judge can open the app without an account and complete the primary patient journey.
- [ ] Hindi/English registration and the key screens work without leaving critical strings untranslated.
- [ ] Registration creates a unique, persistent token; retries do not create duplicate tokens.
- [ ] Ticket slip shows token, department, doctor/room/floor, queue position, ETA and QR; print/large-text/read-aloud work or degrade gracefully.
- [ ] Staff actions are authorised by the server and obey valid queue transitions.
- [ ] Patient, staff and public-board views update across independent clients; reconnect recovers the current state.
- [ ] Ticket-specific data is not exposed to another ticket; public responses contain no secrets or PII.
- [ ] Slip-to-room directions are graph-based, correct and tested; Avoid Stairs does not traverse a stair edge.
- [ ] Emergency access is always available, and no automatic triage/reordering occurs.
- [ ] Urgent-assessment requests are visible to staff until acknowledged and cannot silently disappear.
- [ ] Mobile layout works at 360px; camera, audio, notification and network failures have usable fallbacks.
- [ ] API/database credentials are not in GitHub; production build and direct-route refresh work.
- [ ] Public GitHub repository, live URL, shareable deck, and demo video (≤5 minutes) open from a private browser.
- [ ] Each teammate can explain the queue calculation, real-time flow, navigation logic, emergency limitation and simulated data.
- [ ] No known P0 defect remains; any P1 feature not implemented is explicitly listed as a limitation.

---

## 19. Source references

These are the primary event resources this plan was written against. Re-check the dashboard for final submission instructions and deadline.

- [Official PS — Smart Queue Management and Accessible Navigation for Government Hospitals](https://cachedinfo.in/hackcache/problems/hospital-queue-navigation)
- [HackCache '26 event page](https://cachedinfo.in/hackcache)
- [Your working demo in 48 hours — submission and judging guide](https://cachedinfo.in/hackcache/guides/your-working-demo-in-48-hours)

