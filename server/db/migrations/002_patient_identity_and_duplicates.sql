-- ==============================================================================
-- OPD Saathi — Phase 1.3 Migration: Protected Patient Identity & Duplicate Guard
-- Canonical Reference: PROJECT_BIBLE.md, docs/DATABASE.md, docs/AUTH_SECURITY.md
-- Patient PII is isolated in the protected `patients` table and never exposed on
-- public slip lookups, public queue boards, or Socket.IO broadcasts.
-- ==============================================================================

-- 1. Protected Patient Identity Table
-- Mobile numbers are stored normalized (10-digit Indian format) with
-- phone_verified = false unless real OTP verification is configured.
-- identity_fingerprint is a keyed HMAC-SHA256 digest of normalized identity fields.
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_fingerprint TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  age_years INTEGER NOT NULL CHECK (age_years BETWEEN 0 AND 120),
  gender TEXT NOT NULL DEFAULT 'PREFER_NOT_TO_SAY' CHECK (
    gender IN ('FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY')
  ),
  hospital_reg_no TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_phone_normalized
  ON patients (phone_normalized);

-- 2. Link Tickets to Protected Patient Record
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS patient_id UUID NULL REFERENCES patients(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_tickets_patient_date
  ON tickets (patient_id, queue_date)
  WHERE patient_id IS NOT NULL;

-- 3. Enforce Single Active Ticket per (patient_id, department_id, queue_date)
-- Active statuses are WAITING, CALLED, and IN_CONSULTATION.
-- Once a ticket is COMPLETED, CANCELLED, or NO_SHOW, a new ticket may be created.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_unique_active_patient_dept
  ON tickets (patient_id, department_id, queue_date)
  WHERE status IN ('WAITING', 'CALLED', 'IN_CONSULTATION') AND patient_id IS NOT NULL;
