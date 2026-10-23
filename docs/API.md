# API & Realtime Contract — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Standard Response & Error Envelope

All `/api/*` endpoints return `application/json` and include the `X-Request-Id` header.

- **Error Envelope (`4xx` / `5xx`):**
  ```json
  {
    "error": {
      "code": "INVALID_STATE_TRANSITION",
      "message": "Ticket OPD-GEN-001 cannot transition from WAITING to COMPLETED.",
      "requestId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
  ```

---

## 2. Public & Patient REST Endpoints

### `GET /api/health`
- **Auth:** Public
- **Purpose:** Liveness and real database connectivity check (`SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date`).
- **Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "service": "opd-saathi",
    "db": "connected",
    "hospitalDateIST": "2026-10-23",
    "timestamp": "2026-10-23T18:05:00.000Z"
  }
  ```
- **Response (`503 Service Unavailable`):** Returned when `DATABASE_URL` is unconfigured, TLS CA verification fails (`tls_config_missing`), or PostgreSQL is unreachable.

### `GET /api/departments`
- **Auth:** Public
- **Response (`200 OK`):** Array of active departments joined with `doctor_status`.

### `GET /api/queues/:departmentId/public` & `GET /api/queues/public-board`
- **Auth:** Public
- **Purpose:** Minimised non-PII queue board data (`nowServingCode`, `waitingCount`, `estimatedWaitMinutes`, `etaStatus`, `doctorStatus`, `delayMinutes`, `updatedAt`).

### `POST /api/tickets`
- **Auth:** Public, Rate-limited (`15 requests / 5 minutes / IP`)
- **Request Body (Zod Validated):**
  ```json
  {
    "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "departmentId": "uuid-of-department",
    "visitType": "FIRST_VISIT",
    "preferredLang": "hi",
    "avoidStairs": true
  }
  ```
- **Idempotency & Recovery Rules:**
  1. Acquires `pg_advisory_xact_lock(hashtext('req:' || requestId))`.
  2. If a ticket with `request_id = requestId` already exists:
     - Verifies that **all original payload fields** (`departmentId`, `visitType`, `preferredLang`, `avoidStairs`) match the stored ticket (`409 IDEMPOTENCY_PAYLOAD_MISMATCH` if any field differs).
     - Verifies `NOW() - created_at <= INTERVAL '10 minutes'` and `status === 'WAITING'` (`409 IDEMPOTENCY_WINDOW_EXPIRED` if expired).
     - Recomputes `accessToken` via `TICKET_TOKEN_SECRET` and returns `200 OK` with `{ ticket, accessToken, idempotentReplay: true }`.
  3. Otherwise allocates the next sequence under the department-day lock and returns `201 Created` with `{ ticket, accessToken, idempotentReplay: false }`.

### `GET /api/tickets/:id`
- **Auth:** Requires header `X-Ticket-Token: <64-char-hex-accessToken>` (verified in constant time against `tickets.access_token_hash`).
- **Response (`200 OK`):** Full operational slip, live queue rank, ETA, and route steps.

### `GET /api/slips/:publicCode`
- **Auth:** Public, Rate-limited (`30 requests / 5 minutes / IP`)
- **Purpose:** Fallback & cross-device lookup for *"I Have My Slip"* and manual *"My Turn"* entry (scoped to current IST `queue_date`).
- **Response (`200 OK`):** Operational slip, queue position, ETA, and accessible route steps. **Never** includes `accessToken`, `access_token_hash`, or `request_id`.

### `GET /api/routes`
- **Auth:** Public
- **Query Params:** `?from=<nodeId>&to=<nodeId>&avoidStairs=true|false`
- **Response (`200 OK`):** Ordered step-by-step directions, total distance/seconds, floors traversed, and accessibility status.

### `POST /api/help-requests`
- **Auth:** Public, Rate-limited (`5 requests / 10 minutes / IP`)
- **Purpose:** Pre-registration or in-queue request for human staff assessment.
- **Request Body:** `{ ticketId?: uuid, publicCode?: string, departmentId?: uuid, locationLabel: string, requestType: 'STAFF_HELP' | 'URGENT_ASSESSMENT_REQUEST' }`.

---

## 3. Staff REST Endpoints (Session Protected)

All `/api/staff/*` mutation endpoints require a valid server-side session (`req.session.isStaff === true`) plus JSON `Content-Type` and same-origin `Origin`/`Host` validation.

| Method & Route | Purpose |
| :--- | :--- |
| `GET /api/staff/session` | Returns `{ authenticated: boolean, expiresAt?: string }` |
| `POST /api/staff/session` | Rate-limited (`5 attempts / 15 min / IP`). Validates `{ pin }` against `STAFF_DEMO_PIN_HASH` (`bcryptjs`) and issues `HttpOnly` session cookie |
| `DELETE /api/staff/session` | Destroys PostgreSQL session row and clears cookie |
| `GET /api/staff/queues/:departmentId` | Returns active ticket, ordered waiting list (`ORDER BY queue_sort_order ASC`), and recent completed/no-show/cancelled tickets |
| `POST /api/staff/queues/:departmentId/call-next` | Atomically transitions earliest `WAITING` ticket to `CALLED` (`409 ACTIVE_TICKET_EXISTS` if an active ticket already exists) |
| `POST /api/staff/tickets/:id/start` | Transitions `CALLED` $\rightarrow$ `IN_CONSULTATION` |
| `POST /api/staff/tickets/:id/complete` | Transitions `CALLED` or `IN_CONSULTATION` $\rightarrow$ `COMPLETED` |
| `POST /api/staff/tickets/:id/no-show` | Transitions `CALLED` $\rightarrow$ `NO_SHOW` |
| `POST /api/staff/tickets/:id/cancel` | Transitions `WAITING`, `CALLED`, or `IN_CONSULTATION` $\rightarrow$ `CANCELLED` with `{ cancelReason }` |
| `POST /api/staff/tickets/:id/requeue` | Executes `TAIL_REQUEUE`: transitions `NO_SHOW` or `CANCELLED` $\rightarrow$ `WAITING` with `queue_sort_order = MAX(queue_sort_order) + 1` |
| `PATCH /api/staff/departments/:id/doctor-status` | Updates `{ status, delayMinutes }` |
| `GET /api/staff/urgent-flags` | Lists `NEW` and `ACKNOWLEDGED` urgent flags |
| `POST /api/staff/urgent-flags/:id/acknowledge` | Marks flag `ACKNOWLEDGED` and stops repeat audio alarm |
| `POST /api/staff/urgent-flags/:id/resolve` | Marks flag `RESOLVED` |

---

## 4. Socket.IO Rooms & Authorisation Rules

| Room Name | Join Event | Authorisation Gate | Emitted Events & Payload |
| :--- | :--- | :--- | :--- |
| `queue:<departmentId>` | `subscribe:queue` `{ departmentId }` | Public | `queue.updated`, `doctor.updated` $\rightarrow$ `{ departmentId, updatedAt }` |
| `queue:all` | `subscribe:public-board` | Public | `queue.updated`, `doctor.updated` $\rightarrow$ `{ departmentId, updatedAt }` |
| `ticket:<ticketId>` | `subscribe:ticket` `{ ticketId, accessToken }` | **Capability Verified:** Server hashes `accessToken` and verifies against `tickets.access_token_hash` in constant time before `socket.join()`. Knowing `ticketId` alone is rejected. | `ticket.updated` $\rightarrow$ `{ ticketId, departmentId, status, updatedAt }` |
| `staff:all` & `staff:<departmentId>` | `subscribe:staff` `{ departmentId? }` | **Session Verified:** Checks `socket.request.session?.isStaff === true` from the shared Express session middleware. Unauthenticated sockets receive `unauthorized`. | `queue.updated`, `urgent.created`, `urgent.updated` |
