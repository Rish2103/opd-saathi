# Authentication & Security Specification — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Security Posture & Threat Model

OPD Saathi is a synthetic hackathon demonstration system designed with **production-minded least-privilege boundaries**:
- **Minimal Non-Clinical Patient Details & Zero Public PII Exposure:** Registration collects only basic administrative details (`patientName`, 10-digit Indian mobile number marked `phoneVerified: false`, `age`, optional `gender`, optional `registrationNumber`). No clinical symptoms, medical history, or diagnoses are collected. Public lookup endpoints (`GET /api/slips/:publicCode`), public boards, and Socket.IO broadcasts never expose patient PII or capability tokens.
- **No Client-Side Trust:** Every staff action, queue state transition, patient self-cancellation, and protected Socket.IO room subscription is enforced on the Express server.

---

## 2. Database Transport Security (Strict Production TLS)

1. **Mandatory CA & Hostname Verification in Production:**
   - In `NODE_ENV === 'production'` (or `DATABASE_SSL_MODE === 'verify-full'`), `server/db/pool.js` requires the official Supabase Root CA certificate (`DATABASE_CA_CERT` or `DATABASE_CA_CERT_PATH`) and configures `pg.Pool` with `ssl: { rejectUnauthorized: true, ca }`.
   - Any `sslmode`, `sslcert`, `sslkey`, or `sslrootcert` query parameters embedded in `DATABASE_URL` are stripped before constructing `pg.Pool` so URL parameters cannot weaken `rejectUnauthorized: true`.
   - If the CA certificate is omitted in production, the server refuses to connect with `rejectUnauthorized: false` and reports `tls_config_missing` (`503`).

---

## 3. Staff Authentication & Session Management

1. **PIN Verification (`POST /api/staff/session`):**
   - Rate-limited to **5 attempts per 15 minutes per IP** (`express-rate-limit`).
   - Validates the submitted PIN against `process.env.STAFF_DEMO_PIN_HASH` using `bcryptjs.compare()`.
2. **Server-Side PostgreSQL Session Store (`connect-pg-simple`):**
   - Sessions are persisted in the `staff_sessions` table in PostgreSQL and signed using `SESSION_SECRET` (minimum 32 bytes, separate from `TICKET_TOKEN_SECRET`).
   - Session ID is regenerated upon login (`req.session.regenerate()`) to prevent session fixation.
   - Cookie attributes:
     - `name: 'opd_staff_sid'`
     - `httpOnly: true` (inaccessible to `document.cookie` / XSS)
     - `secure: process.env.NODE_ENV === 'production'` (with `app.set('trust proxy', 1)` configured for Render's TLS proxy)
     - `sameSite: 'lax'`
     - `maxAge: 8 * 60 * 60 * 1000` (8 hours)
3. **Logout & Revocation (`DELETE /api/staff/session`):**
   - Calls `req.session.destroy()` to delete the session row from `staff_sessions` in PostgreSQL and clears the `opd_staff_sid` cookie.
4. **CSRF & Origin Protection for State-Changing Staff Routes:**
   - All `POST`, `PATCH`, and `DELETE` requests to `/api/staff/*` enforce:
     1. Valid server session (`req.session?.isStaff === true`).
     2. `Content-Type: application/json`.
     3. Same-origin verification comparing the `Origin` (or `Referer`) header host against the request `Host` header when `Origin` is present.

---

## 4. Patient Ticket Capability Tokens & Idempotency Security

1. **Secret Isolation & Constant-Time Verification (`server/services/ticketTokenService.js`):**
   - Uses `TICKET_TOKEN_SECRET` (separate from `SESSION_SECRET`) with optional `TICKET_TOKEN_SECRET_PREVIOUS` for key rotation.
   - Derives `rawAccessToken = HMAC-SHA256(TICKET_TOKEN_SECRET, "${ticket.id}:${ticket.request_id}").toString('hex')` (64 lowercase hex characters).
   - Stores only `access_token_hash = SHA256(rawAccessToken).toString('hex')` in PostgreSQL.
   - Validates `X-Ticket-Token` headers by hashing the presented token with SHA-256 and comparing 32-byte buffers via `crypto.timingSafeEqual()`.
2. **Bounded Idempotent Recovery (`POST /api/tickets`):**
   - `requestId` must be a valid UUID v4 (`crypto.randomUUID()`).
   - Replaying `requestId` recovers `accessToken` **only** if all original payload fields (`departmentId`, `visitType`, `preferredLang`, `avoidStairs`, and normalized patient identity fingerprint) match, `status === 'WAITING'`, and `NOW() - created_at <= INTERVAL '10 minutes'`.
3. **Keyed Patient Identity Fingerprint & Honest Unverified Mobile Policy:**
   - Normalized patient identity (`normalizedPhone`, lowercase `normalizedName`, `age`) is hashed via `HMAC-SHA256(PATIENT_IDENTITY_SECRET, "${normalizedPhone}|${normalizedNameLower}|${age}")` to prevent rainbow-table reversals of Indian 10-digit mobile numbers.
   - Mobile numbers are validated for Indian 10-digit format (`^[6-9][0-9]{9}$`) and masked (`******3210`) in capability-protected responses, with `phoneVerified: false` explicitly surfaced in the API and UI (no fake OTP verification claims).
   - `POST /api/tickets` uses a composite rate limiter (`8 requests / 5 minutes` per `IP + identity_fingerprint` and `60 requests / 5 minutes` per shared-network IP) so shared hospital Wi-Fi or help-desk tablets can assist multiple patients while blocking single-identity spam.
4. **Zero URL / QR / Public / Log Exposure:**
   - `accessToken`, `requestId`, and patient PII are never placed in URLs, QR codes (QR codes encode only `/my-turn?code=OPD-GEN-001`), or public `GET /api/slips/:publicCode` responses.
   - Request and error loggers redact `pin`, `requestId`, `accessToken`, `x-ticket-token`, `authorization`, `cookie`, `patientName`, `fullName`, `phone`, `phoneNormalized`, and `registrationNumber`.

---

## 5. Socket.IO Room Authorisation

- **`staff:all` & `staff:<departmentId>`:** Shares the Express session middleware (`io.engine.use(sessionMiddleware)`). Joining a staff room requires `socket.request.session?.isStaff === true`.
- **`ticket:<ticketId>`:** Requires `{ ticketId, accessToken }` where `SHA256(accessToken)` matches `tickets.access_token_hash` in constant time. Clients without the capability token subscribe to public `queue:<departmentId>` invalidation hints instead.
- **`queue:<departmentId>` & `queue:all`:** Public rooms that broadcast only non-PII invalidation timestamps (`{ departmentId, updatedAt }`).

---

## 6. Production Disclaimer

The shared demo PIN is exclusively for this synthetic hackathon prototype. A real hospital deployment requires individual staff identity accounts, role-based access control (RBAC), hardware/MFA policies, comprehensive audit logging, and institutional security review.
