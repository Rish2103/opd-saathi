# Database Design & TLS Specification — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Connection & Strict Production TLS (`server/db/pool.js`)

1. **Dashboard Connection URL (`DATABASE_URL`):**
   - Use the exact connection string provided by the Supabase dashboard (**Connect $\rightarrow$ Session Pooler (IPv4)** on port `5432` for Render compatibility).
   - Before passing `connectionString` to `pg.Pool`, `server/db/pool.js` strips any `sslmode`, `sslcert`, `sslkey`, or `sslrootcert` query parameters from the URL so query parameters in `DATABASE_URL` can **never** override the explicit `ssl` configuration object.
2. **Production CA & Hostname Verification (`rejectUnauthorized: true`):**
   - When `NODE_ENV === 'production'` (or `DATABASE_SSL_MODE === 'verify-full'`):
     - A trusted CA certificate **must** be supplied via `DATABASE_CA_CERT` (inline PEM or base64-encoded PEM string) or `DATABASE_CA_CERT_PATH` (path to the downloaded Supabase Root CA `.crt` file).
     - `pg.Pool` is configured with:
       ```js
       ssl: {
         rejectUnauthorized: true,
         ca: resolvedCaPem,
       }
       ```
     - Never silently fall back to `rejectUnauthorized: false`. If the CA certificate is missing in production, `pool.js` marks the database state as `tls_config_missing` and refuses to establish unverified connections.
3. **Hospital Timezone Rule (`Asia/Kolkata`):**
   - All timestamps are stored as `TIMESTAMPTZ` (UTC).
   - Daily queue partitioning (`queue_date`) is always evaluated in Indian Standard Time:
     ```sql
     (NOW() AT TIME ZONE 'Asia/Kolkata')::date
     ```

---

## 2. Schema DDL (`server/db/migrations/001_init.sql`)

### 2.1 `departments`
Stores fictional hospital OPD departments, assigned doctors, rooms, floors, and navigation node links.
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `slug TEXT UNIQUE NOT NULL`
- `token_prefix TEXT UNIQUE NOT NULL` (`'GEN'`, `'PED'`, `'ORT'`, `'EYE'`)
- `name_en TEXT NOT NULL`, `name_hi TEXT NOT NULL`
- `doctor_name_en TEXT NOT NULL`, `doctor_name_hi TEXT NOT NULL`
- `room_label TEXT NOT NULL`
- `floor_number INTEGER NOT NULL CHECK (floor_number BETWEEN 1 AND 3)`
- `destination_node_id TEXT NOT NULL`
- `landmark_en TEXT NOT NULL`, `landmark_hi TEXT NOT NULL`
- `average_consult_minutes INTEGER NOT NULL DEFAULT 10 CHECK (average_consult_minutes > 0)`
- `is_active BOOLEAN NOT NULL DEFAULT true`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### 2.2 `queue_counters`
Tracks atomic daily sequence numbers per department.
- `department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE`
- `queue_date DATE NOT NULL`
- `last_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence >= 0)`
- `PRIMARY KEY (department_id, queue_date)`

### 2.3 `tickets`
Zero-PII patient queue tokens.
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `public_code TEXT NOT NULL` (e.g., `'OPD-GEN-001'`)
- `department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT`
- `queue_date DATE NOT NULL`
- `sequence_no INTEGER NOT NULL CHECK (sequence_no > 0)`
- `queue_sort_order BIGINT NOT NULL CHECK (queue_sort_order > 0)`
- `status TEXT NOT NULL CHECK (status IN ('WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'))`
- `visit_type TEXT NOT NULL DEFAULT 'FIRST_VISIT' CHECK (visit_type IN ('FIRST_VISIT', 'FOLLOW_UP'))`
- `preferred_lang TEXT NOT NULL DEFAULT 'hi' CHECK (preferred_lang IN ('en', 'hi', 'ta'))`
- `avoid_stairs BOOLEAN NOT NULL DEFAULT true`
- `access_token_hash TEXT NOT NULL` (64-char hex SHA-256 digest of HMAC capability token)
- `request_id UUID UNIQUE NOT NULL` (CSPRNG UUID v4 idempotency key)
- `cancel_reason TEXT NULL CHECK (cancel_reason IS NULL OR cancel_reason IN ('PATIENT_LEFT', 'WRONG_DEPARTMENT', 'DUPLICATE', 'OTHER'))`
- `requeued_count INTEGER NOT NULL DEFAULT 0 CHECK (requeued_count >= 0)`
- `last_requeued_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `called_at TIMESTAMPTZ NULL`, `consultation_started_at TIMESTAMPTZ NULL`, `completed_at TIMESTAMPTZ NULL`
- **Unique Constraints & Indexes:**
  - `UNIQUE (department_id, queue_date, sequence_no)`
  - `UNIQUE (queue_date, public_code)`
  - `CREATE UNIQUE INDEX idx_tickets_single_active ON tickets (department_id, queue_date) WHERE status IN ('CALLED', 'IN_CONSULTATION');`
  - `CREATE INDEX idx_tickets_waiting_order ON tickets (department_id, queue_date, queue_sort_order, sequence_no) WHERE status = 'WAITING';`

### 2.4 `doctor_status`
- `department_id UUID PRIMARY KEY REFERENCES departments(id) ON DELETE CASCADE`
- `status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ON_BREAK', 'DELAYED', 'UNAVAILABLE'))`
- `delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0)`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_by_session_id TEXT NULL`

### 2.5 `urgent_flags`
Human-assessed urgent assistance requests (works with or without a ticket).
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `ticket_id UUID NULL REFERENCES tickets(id) ON DELETE SET NULL`
- `department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL`
- `public_code TEXT NULL`
- `location_label TEXT NOT NULL DEFAULT 'Hospital Premises'`
- `request_type TEXT NOT NULL DEFAULT 'URGENT_ASSESSMENT_REQUEST' CHECK (request_type IN ('STAFF_HELP', 'URGENT_ASSESSMENT_REQUEST'))`
- `status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ACKNOWLEDGED', 'RESOLVED'))`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `acknowledged_at TIMESTAMPTZ NULL`, `resolved_at TIMESTAMPTZ NULL`
- `acknowledged_by TEXT NULL`

### 2.6 `audit_events`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `actor_type TEXT NOT NULL CHECK (actor_type IN ('PATIENT', 'STAFF', 'SYSTEM'))`
- `action TEXT NOT NULL`
- `record_id TEXT NULL`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb` (never contains secrets, PINs, or capability tokens)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### 2.7 `staff_sessions`
Backing store for `connect-pg-simple`.
- `sid VARCHAR NOT NULL PRIMARY KEY`
- `sess JSON NOT NULL`
- `expire TIMESTAMP(6) NOT NULL`
- `CREATE INDEX idx_staff_sessions_expire ON staff_sessions (expire);`
