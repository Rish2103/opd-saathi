import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { buildDatabasePoolConfig, sanitizeDatabaseUrl } from '../db/pool.js';
import { loadMigrationSql } from '../db/migrate.js';
import { SEED_DEPARTMENTS } from '../db/seed.js';
import {
  deriveTicketAccessToken,
  hashAccessToken,
  isWithinRecoveryWindow,
  matchesIdempotentPayload,
  verifyTicketAccessToken
} from '../services/ticketTokenService.js';
import { redactSensitiveData } from '../middleware/requestLogger.js';

const TEST_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const SAMPLE_CA_PEM = [
  '-----BEGIN CERTIFICATE-----',
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsampleSupabaseRootCA',
  '-----END CERTIFICATE-----'
].join('\n');

describe('Phase 0 Foundation — Health Endpoint & Strict API 404', () => {
  it('returns HTTP 503 with structured JSON when database is unconfigured or unreachable', async () => {
    const testApp = createApp({
      dbHealthCheck: async () => ({
        connected: false,
        status: 'db_unconfigured',
        message: 'DATABASE_URL is not configured.',
        hospitalDateIST: null
      })
    });

    const res = await request(testApp).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'degraded',
        service: 'opd-saathi',
        phase: 'phase-0-foundation',
        db: {
          connected: false,
          status: 'db_unconfigured',
          hospitalDateIST: null,
          tlsMode: null,
          message: 'DATABASE_URL is not configured.'
        }
      })
    );
  });

  it('returns HTTP 200 with IST hospital date when database health query succeeds', async () => {
    const testApp = createApp({
      dbHealthCheck: async () => ({
        connected: true,
        status: 'connected',
        tlsMode: 'verified_tls',
        hospitalDateIST: '2026-10-24'
      })
    });

    const res = await request(testApp).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toEqual({
      connected: true,
      status: 'connected',
      hospitalDateIST: '2026-10-24',
      tlsMode: 'verified_tls',
      message: null
    });
  });

  it('returns strict JSON 404 (API_NOT_FOUND) for unknown /api/* routes instead of HTML', async () => {
    const testApp = createApp({
      dbHealthCheck: async () => ({ connected: false, status: 'db_unconfigured' })
    });

    const res = await request(testApp).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      error: {
        code: 'API_NOT_FOUND',
        message: 'API endpoint not found: GET /api/does-not-exist',
        requestId: expect.any(String)
      }
    });
  });
});

describe('Phase 0 Safeguard A — PostgreSQL Strict TLS & URL Sanitization', () => {
  it('strips sslmode and ssl query parameters from DATABASE_URL so they cannot override pg ssl options', () => {
    const dirtyUrl =
      'postgresql://postgres.ref:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&ssl=false&pgbouncer=true';
    const sanitized = sanitizeDatabaseUrl(dirtyUrl);

    expect(sanitized).not.toContain('sslmode');
    expect(sanitized).not.toContain('ssl=');
    expect(sanitized).toContain('pgbouncer=true');
  });

  it('refuses to build a verify-full pool config when CA certificate is missing', () => {
    const evaluation = buildDatabasePoolConfig({
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgresql://postgres.ref:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
      DATABASE_SSL_MODE: 'verify-full',
      DATABASE_CA_CERT: ''
    });

    expect(evaluation.ok).toBe(false);
    expect(evaluation.reason).toBe('tls_config_missing');
    expect(evaluation.poolConfig).toBeNull();
  });

  it('forbids DATABASE_SSL_MODE=disable when NODE_ENV=production', () => {
    const evaluation = buildDatabasePoolConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost:5432/opd_saathi',
      DATABASE_SSL_MODE: 'disable'
    });

    expect(evaluation.ok).toBe(false);
    expect(evaluation.reason).toBe('tls_disable_forbidden_in_production');
    expect(evaluation.poolConfig).toBeNull();
  });

  it('enforces ssl.rejectUnauthorized = true with explicit CA PEM in verify-full mode', () => {
    const evaluation = buildDatabasePoolConfig({
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgresql://postgres.ref:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=disable',
      DATABASE_SSL_MODE: 'verify-full',
      DATABASE_CA_CERT: SAMPLE_CA_PEM
    });

    expect(evaluation.ok).toBe(true);
    expect(evaluation.reason).toBe('verified_tls');
    expect(evaluation.poolConfig.connectionString).not.toContain('sslmode=disable');
    expect(evaluation.poolConfig.ssl).toEqual({
      rejectUnauthorized: true,
      ca: SAMPLE_CA_PEM
    });
  });
});

describe('Phase 0 Safeguard B — Ticket Capability Tokens, Constant-Time Verification & Log Redaction', () => {
  it('derives deterministic 64-character hex capability tokens and verifies them in constant time', () => {
    const ticketId = '550e8400-e29b-41d4-a716-446655440000';
    const requestId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    const rawToken = deriveTicketAccessToken(ticketId, requestId, TEST_SECRET);
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);

    const storedHash = hashAccessToken(rawToken);
    expect(storedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(storedHash).not.toBe(rawToken);

    expect(verifyTicketAccessToken(rawToken, storedHash)).toBe(true);
    expect(verifyTicketAccessToken(`${rawToken.slice(0, 63)}0`, storedHash)).toBe(false);
    expect(verifyTicketAccessToken('', storedHash)).toBe(false);
  });

  it('requires all original payload fields (departmentId, visitType, preferredLang, avoidStairs) to match on idempotent recovery', () => {
    const existingRow = {
      department_id: 'general-medicine',
      visit_type: 'FIRST_VISIT',
      preferred_lang: 'hi',
      avoid_stairs: true,
      created_at: new Date().toISOString()
    };

    expect(
      matchesIdempotentPayload(existingRow, {
        departmentId: 'general-medicine',
        visitType: 'FIRST_VISIT',
        preferredLang: 'hi',
        avoidStairs: true
      })
    ).toBe(true);

    // Changing preferredLang or avoidStairs must reject recovery
    expect(
      matchesIdempotentPayload(existingRow, {
        departmentId: 'general-medicine',
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: true
      })
    ).toBe(false);

    expect(
      matchesIdempotentPayload(existingRow, {
        departmentId: 'general-medicine',
        visitType: 'FIRST_VISIT',
        preferredLang: 'hi',
        avoidStairs: false
      })
    ).toBe(false);

    const nowMs = Date.now();
    expect(isWithinRecoveryWindow(nowMs - 5 * 60 * 1000, nowMs)).toBe(true);
    expect(isWithinRecoveryWindow(nowMs - 11 * 60 * 1000, nowMs)).toBe(false);
  });

  it('redacts sensitive credentials, PINs, capability tokens, and idempotency keys from logs', () => {
    const rawLog = {
      departmentId: 'general-medicine',
      requestId: 'secret-uuid',
      accessToken: 'raw-capability-secret',
      headers: {
        'x-ticket-token': 'header-secret',
        cookie: 'opd_staff_sid=123'
      },
      body: {
        pin: '9999'
      }
    };

    const redacted = redactSensitiveData(rawLog);
    expect(redacted.departmentId).toBe('general-medicine');
    expect(redacted.requestId).toBe('[REDACTED]');
    expect(redacted.accessToken).toBe('[REDACTED]');
    expect(redacted.headers['x-ticket-token']).toBe('[REDACTED]');
    expect(redacted.headers.cookie).toBe('[REDACTED]');
    expect(redacted.body.pin).toBe('[REDACTED]');
  });
});

describe('Phase 0 Database Schema & Canonical Seed Data', () => {
  it('defines all 7 tables, queue_sort_order for TAIL_REQUEUE, and single-active partial index in 001_init.sql', () => {
    const sql = loadMigrationSql();

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS departments');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS queue_counters');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS tickets');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS doctor_status');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS urgent_flags');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS audit_events');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS staff_sessions');
    expect(sql).toContain('queue_sort_order BIGINT NOT NULL');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_single_active');
  });

  it('contains canonical clinical OPD departments with bilingual names and destination nodes', () => {
    expect(SEED_DEPARTMENTS).toHaveLength(4);
    expect(SEED_DEPARTMENTS.map((d) => d.token_prefix)).toEqual(['GEN', 'PED', 'ORT', 'EYE']);
  });
});
