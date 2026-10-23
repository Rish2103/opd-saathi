# Edge Cases, Concurrency & Reliability — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Network, Idempotency & Lost-Response Edge Cases

### 1.1 Lost HTTP Response After Database Commit (`POST /api/tickets`)
- **Scenario:** Kamla taps *Confirm Registration* on weak hospital mobile data. PostgreSQL commits `OPD-GEN-008`, but the HTTP response drops before reaching her phone. She taps *Retry*.
- **Handling:**
  - Before the first request is sent, the client generates a CSPRNG UUID v4 `requestId` and stores `{ requestId, payload }` in `sessionStorage` (`opd_pending_registration`).
  - On retry, the client sends the exact same `{ requestId, ...payload }`.
  - The server acquires `pg_advisory_xact_lock(hashtext('req:' || requestId))`, finds the existing row by `request_id`, verifies that **all payload fields** (`departmentId`, `visitType`, `preferredLang`, `avoidStairs`) match and that `NOW() - created_at <= INTERVAL '10 minutes'` while `status === 'WAITING'`, recomputes `accessToken` deterministically via `HMAC-SHA256(TICKET_TOKEN_SECRET, ...)`, and returns `200 OK` with the identical ticket and capability token.
  - Once received, the client saves the slip to `localStorage` and deletes `opd_pending_registration` from `sessionStorage`.

### 1.2 Simultaneous Duplicate Retries (Double-Tap / Proxy Retry)
- **Scenario:** Two identical `POST /api/tickets` requests with the same `requestId` arrive at the Express server within the same millisecond.
- **Handling:** `pg_advisory_xact_lock(hashtext('req:' || requestId))` serialises both transactions before `SELECT * FROM tickets WHERE request_id = $1`. Transaction 1 allocates sequence `#008` and commits; Transaction 2 unblocks, immediately sees `#008`, and returns `#008` without burning sequence `#009` or throwing a `23505` unique constraint error.

### 1.3 Lost Browser Storage / Second Device Lookup
- **Scenario:** A patient prints their slip or opens a relative's phone after the 10-minute recovery window expires.
- **Handling:** The patient enters `OPD-GEN-008` on **"I Have My Slip"** (`/find-slip`) or **"My Turn"**, calling rate-limited `GET /api/slips/OPD-GEN-008`. Because tickets contain zero PII, the patient receives their full live queue status, ETA, and accessible route without needing the capability secret.

---

## 2. Queue Concurrency & State Transition Edge Cases

### 2.1 Two Staff Members Click "Call Next" Simultaneously
- **Scenario:** Two staff tabs for `General Medicine` click *Call Next* at the exact same instant when no patient is currently active.
- **Handling:** Both transactions contend on `pg_advisory_xact_lock(hashtext('queue:' || department_id || ':' || queue_date))`. The winner transitions the lowest `queue_sort_order` ticket to `CALLED` (`200 OK`). The second unblocks, sees an active `CALLED` ticket, rolls back, and receives `409 Conflict` (`ACTIVE_TICKET_EXISTS`), backed by the database partial unique index `idx_tickets_single_active`.

### 2.2 Called Patient Does Not Arrive (`CALLED -> NO_SHOW`)
- **Scenario:** `OPD-GEN-004` is `CALLED`, blocking the active slot, but the patient is at the drinking water station.
- **Handling:** Staff clicks **Mark No-Show** (`POST /api/staff/tickets/:id/no-show`), transitioning `OPD-GEN-004` from `CALLED` $\rightarrow$ `NO_SHOW`, immediately freeing the active slot so `OPD-GEN-005` can be called.

### 2.3 Returning No-Show Patient (`TAIL_REQUEUE` & 3-Ahead Alert Stability)
- **Scenario:** `OPD-GEN-004` returns 20 minutes later while `OPD-GEN-009`, `010`, and `011` are waiting (`011` has already been alerted that $\le 3$ people are ahead).
- **Handling:** Staff clicks **Requeue** (`POST /api/staff/tickets/:id/requeue`). Inside the department-day lock, `OPD-GEN-004` retains `public_code = 'OPD-GEN-004'` and `sequence_no = 4`, but its `queue_sort_order` is set to `MAX(queue_sort_order) + 1` (`12`). Waiting patients `009`, `010`, and `011` are **never pushed backwards** in line.

---

## 3. Realtime, Offline & Browser Permission Fallbacks

| Failure Mode | User-Visible Behaviour & Fallback |
| :--- | :--- |
| **Socket.IO Disconnects / Hospital Wi-Fi Drops** | Header badge switches from `Live` to `Offline — Showing last update from HH:MM:SS`. Retains cached slip in `localStorage` marked clearly as stale. On reconnect, automatically refetches REST snapshot. |
| **3-People-Ahead Threshold Crossing** | Client tracks `lastAlertedTicketId` in `localStorage`. Alert banner + optional audio/vibration fires only once when `status === 'WAITING'` and `peopleAheadWaiting <= 3` is reached (and resets only if `requeued_count` increments). |
| **Doctor Status `UNAVAILABLE`** | Hides numeric countdown and displays `"Doctor temporarily unavailable — please check with the Help Desk"` rather than showing a false minute estimate. |
| **Camera Permission Denied / No Camera** | Manual `public_code` input (`OPD-GEN-001`) is always rendered above/alongside the optional QR scanner so the user is never trapped. |
| **Speech Synthesis / Audio Blocked** | Read-aloud button checks `'speechSynthesis' in window` and available voices; staff urgent alert banner stays pinned visually in high-contrast red even when browser autoplay blocks audio until the staff member clicks *Enable Alert Sound*. |
| **Unreachable Navigation Node** | Returns a clear bilingual message directing the patient to the Ground Floor Registration & Help Desk (`registration_desk`), never fabricating steps. |
