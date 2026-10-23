-- ==============================================================================
-- OPD Saathi — Initial Database Schema Migration (001_init.sql)
-- Canonical Reference: PROJECT_BIBLE.md & docs/DATABASE.md
-- Zero patient PII stored. All queue dates use Asia/Kolkata (IST).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  token_prefix TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_hi TEXT NOT NULL,
  doctor_name_en TEXT NOT NULL,
  doctor_name_hi TEXT NOT NULL,
  room_label TEXT NOT NULL,
  floor_number INTEGER NOT NULL CHECK (floor_number BETWEEN 1 AND 3),
  destination_node_id TEXT NOT NULL,
  landmark_en TEXT NOT NULL,
  landmark_hi TEXT NOT NULL,
  average_consult_minutes INTEGER NOT NULL DEFAULT 10 CHECK (average_consult_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Daily Atomic Queue Counters
CREATE TABLE IF NOT EXISTS queue_counters (
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  queue_date DATE NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
  PRIMARY KEY (department_id, queue_date)
);

-- 3. Patient Queue Tickets (Zero PII)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_code TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  queue_date DATE NOT NULL,
  sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
  queue_sort_order BIGINT NOT NULL CHECK (queue_sort_order > 0),
  status TEXT NOT NULL CHECK (
    status IN ('WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
  ),
  visit_type TEXT NOT NULL DEFAULT 'FIRST_VISIT' CHECK (
    visit_type IN ('FIRST_VISIT', 'FOLLOW_UP')
  ),
  preferred_lang TEXT NOT NULL DEFAULT 'hi' CHECK (
    preferred_lang IN ('en', 'hi', 'ta')
  ),
  avoid_stairs BOOLEAN NOT NULL DEFAULT true,
  access_token_hash TEXT NOT NULL,
  request_id UUID UNIQUE NOT NULL,
  cancel_reason TEXT NULL CHECK (
    cancel_reason IS NULL OR cancel_reason IN ('PATIENT_LEFT', 'WRONG_DEPARTMENT', 'DUPLICATE', 'OTHER')
  ),
  requeued_count INTEGER NOT NULL DEFAULT 0 CHECK (requeued_count >= 0),
  last_requeued_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  called_at TIMESTAMPTZ NULL,
  consultation_started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_tickets_dept_date_seq UNIQUE (department_id, queue_date, sequence_no),
  CONSTRAINT uq_tickets_date_public_code UNIQUE (queue_date, public_code)
);

-- Enforce single active patient (CALLED or IN_CONSULTATION) per department per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_single_active
  ON tickets (department_id, queue_date)
  WHERE status IN ('CALLED', 'IN_CONSULTATION');

-- Fast ordering index for WAITING queue and TAIL_REQUEUE
CREATE INDEX IF NOT EXISTS idx_tickets_waiting_order
  ON tickets (department_id, queue_date, queue_sort_order ASC, sequence_no ASC)
  WHERE status = 'WAITING';

-- 4. Doctor Availability & Delay Status
CREATE TABLE IF NOT EXISTS doctor_status (
  department_id UUID PRIMARY KEY REFERENCES departments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (
    status IN ('AVAILABLE', 'ON_BREAK', 'DELAYED', 'UNAVAILABLE')
  ),
  delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_session_id TEXT NULL
);

-- 5. Urgent Assessment / Staff Help Requests (Works with or without a ticket)
CREATE TABLE IF NOT EXISTS urgent_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NULL REFERENCES tickets(id) ON DELETE SET NULL,
  department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL,
  public_code TEXT NULL,
  location_label TEXT NOT NULL DEFAULT 'Hospital Premises',
  request_type TEXT NOT NULL DEFAULT 'URGENT_ASSESSMENT_REQUEST' CHECK (
    request_type IN ('STAFF_HELP', 'URGENT_ASSESSMENT_REQUEST')
  ),
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (
    status IN ('NEW', 'ACKNOWLEDGED', 'RESOLVED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ NULL,
  resolved_at TIMESTAMPTZ NULL,
  acknowledged_by TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_urgent_flags_active
  ON urgent_flags (status, created_at DESC)
  WHERE status IN ('NEW', 'ACKNOWLEDGED');

-- 6. Minimal Non-Secret Audit Events
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('PATIENT', 'STAFF', 'SYSTEM')),
  action TEXT NOT NULL,
  record_id TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Server-Side Staff Sessions (connect-pg-simple compatible)
CREATE TABLE IF NOT EXISTS staff_sessions (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_expire
  ON staff_sessions (expire);
