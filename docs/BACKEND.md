# Backend Specification — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Express Middleware Pipeline (`server/app.js`)

Requests traverse the Express pipeline in this exact order:
1. **`app.set('trust proxy', 1)`:** Mandatory on Render so `req.secure` is true behind Render's TLS-terminating load balancer and `Secure` session cookies are set properly.
2. **Request ID & Redacted Logger (`server/middleware/requestLogger.js`):**
   - Generates `req.requestId = crypto.randomUUID()` and sets response header `X-Request-Id`.
   - Logs request method, path, status, duration, and `requestId` while **redacting** `pin`, `requestId` (idempotency recovery key), `accessToken`, `x-ticket-token`, `authorization`, and `cookie`.
3. **Security Headers (`helmet`):**
   - Sets CSP and security headers while allowing Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) and same-origin WebSocket connections.
4. **Body Parsing (`express.json({ limit: '32kb' })`):**
   - Rejects oversized payloads immediately.
5. **Session Middleware (`express-session` + `connect-pg-simple`):**
   - Mounted on `/api/staff` routes and shared with the Socket.IO engine (`io.engine.use(sessionMiddleware)`).
6. **API Routes (`/api/*`):**
   - Validated with `zod`, protected by route-specific rate limiters and authorization middlewares (`requireStaff`, `requireTicketToken`).
7. **Strict API 404 Handler (`/api/*`):**
   - Any unmatched `/api/*` request returns `404` JSON `{ error: { code: 'API_NOT_FOUND', message: '...', requestId } }` and never falls back to `index.html`.
8. **Production Static SPA Handler:**
   - Serves `dist/` static assets and falls back to `dist/index.html` for non-API GET routes (`/register`, `/my-turn`, `/staff`, `/board`, etc.).
9. **Central Error Handler (`server/middleware/errorHandler.js`):**
   - Formats Zod validation errors (`400`), auth failures (`401`/`403`), state conflicts (`409`), rate limits (`429`), and unexpected errors (`500`) into a single JSON structure without leaking stack traces or SQL internals in production.

---

## 2. Queue State Machine & Serialisation Rules (`server/services/queueService.js`)

### 2.1 Allowed Status Transitions

| Current Status | Action / Endpoint | Target Status | Preconditions & Side Effects |
| :--- | :--- | :--- | :--- |
| *(None)* | `POST /api/tickets` | `WAITING` | Allocates `sequence_no`, sets `queue_sort_order = sequence_no`. |
| `WAITING` | `POST /api/staff/queues/:deptId/call-next` | `CALLED` | Zero tickets in `(department_id, queue_date)` may be in `CALLED` or `IN_CONSULTATION`. Selects lowest `queue_sort_order ASC, sequence_no ASC`. Sets `called_at = NOW()`. |
| `WAITING` | `POST /api/staff/tickets/:id/cancel` | `CANCELLED` | Requires valid `cancelReason` enum. |
| `CALLED` | `POST /api/staff/tickets/:id/start` | `IN_CONSULTATION` | Sets `consultation_started_at = NOW()`. |
| `CALLED` | `POST /api/staff/tickets/:id/complete` | `COMPLETED` | Direct 1-step completion allowed; sets `completed_at = NOW()`. Frees active slot. |
| `CALLED` | `POST /api/staff/tickets/:id/no-show` | `NO_SHOW` | Frees active slot immediately so next waiting patient can be called. |
| `CALLED` | `POST /api/staff/tickets/:id/cancel` | `CANCELLED` | Requires valid `cancelReason`; frees active slot. |
| `IN_CONSULTATION` | `POST /api/staff/tickets/:id/complete` | `COMPLETED` | Sets `completed_at = NOW()`; frees active slot. |
| `IN_CONSULTATION` | `POST /api/staff/tickets/:id/cancel` | `CANCELLED` | Requires valid `cancelReason`; frees active slot. |
| `NO_SHOW` \| `CANCELLED` | `POST /api/staff/tickets/:id/requeue` | `WAITING` | **`TAIL_REQUEUE`:** Keeps `sequence_no` and `public_code`; sets `queue_sort_order = MAX(queue_sort_order) + 1`, increments `requeued_count`, clears `cancel_reason`. |

Any transition not listed above is rejected with `409 Conflict` (`INVALID_STATE_TRANSITION`).

### 2.2 Global Lock Order (Deadlock Prevention)
All transactional queue mutations acquire locks in this exact sequence:
1. *(Ticket Creation only)* `SELECT pg_advisory_xact_lock(hashtext('req:' || $requestId))`
2. *(Ticket ID mutations only)* Non-locking lookup of immutable `(department_id, queue_date)` by `ticket.id`.
3. **Department-Day Queue Lock:** `SELECT pg_advisory_xact_lock(hashtext('queue:' || department_id::text || ':' || queue_date::text))`
4. **Row Lock:** `SELECT ... FROM tickets / queue_counters ... FOR UPDATE`

---

## 3. Waiting Position & Deterministic ETA Formula

- **Daily IST Queue Scoping (`resolveHospitalDateIST()`):** All public board counts (`getPublicBoard`), staff department queues (`getStaffQueueView`), staff cross-department pending slips (`getStaffAllPendingTickets`), and individual ticket position/ETA calculations (`buildTicketView`) strictly filter by today's IST hospital date (`queue_date = resolveHospitalDateIST()`), ensuring waiting counts on the board and `peopleAheadWaiting` on patient slips always match.
- **People Ahead (`peopleAheadWaiting`):**
  - If `ticket.status === 'WAITING'`:
    ```sql
    SELECT COUNT(*)::int AS people_ahead
    FROM tickets
    WHERE department_id = $1
      AND queue_date = $2
      AND status = 'WAITING'
      AND queue_sort_order < $3;
    ```
  - If `ticket.status IN ('CALLED', 'IN_CONSULTATION')`: `peopleAheadWaiting = 0`.
- **Estimated Wait (`estimatedWaitMinutes`):**
  - If `doctor_status.status === 'UNAVAILABLE'`:
    - Return `estimatedWaitMinutes = null` and `etaStatus = 'UNAVAILABLE_ASK_HELP_DESK'`.
  - Otherwise:
    $$\text{activeRemainder} = \begin{cases} \text{dept.average\_consult\_minutes} & \text{if an active ticket exists for dept/date and is not this ticket} \\ 0 & \text{otherwise} \end{cases}$$
    $$\text{estimatedWaitMinutes} = \text{activeRemainder} + (\text{peopleAheadWaiting} \times \text{dept.average\_consult\_minutes}) + \text{doctor\_status.delay\_minutes}$$
    - Return `etaStatus = doctor_status.status === 'AVAILABLE' ? 'ESTIMATED' : 'DELAYED_ESTIMATE'`.
