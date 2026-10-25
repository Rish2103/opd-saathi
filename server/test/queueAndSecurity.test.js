import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { Server as SocketIoServer } from 'socket.io';
import { io as createClientSocket } from 'socket.io-client';
import { createApp } from '../app.js';
import { loadEnvConfig } from '../config/env.js';
import { configureSocketIo } from '../sockets/index.js';
import { createQueueService } from '../services/queueService.js';
import { findAccessibleRoute } from '../../shared/navigation/pathfinder.js';

function createTestHarness(options = {}) {
  const queueService = createQueueService({
    forceInMemory: true,
    getHospitalDateIST: () => '2026-10-24',
    ...options.queueOptions
  });

  const app = createApp({
    queueService,
    disableRateLimits: options.disableRateLimits ?? true
  });

  return {
    app,
    queueService,
    sessionMiddleware: app.locals.sessionMiddleware
  };
}

describe('Phase 1 Checkpoint A & E — Ticket Creation, Validation & Idempotent Recovery', () => {
  it('validates registration payload and creates sequential OPD tickets with capability tokens and protected patient summary', async () => {
    const { app } = createTestHarness();

    // Invalid payload -> 400 VALIDATION_ERROR
    const badRes = await request(app)
      .post('/api/tickets')
      .send({ departmentId: 'general-medicine', visitType: 'INVALID_TYPE' });
    expect(badRes.status).toBe(400);
    expect(badRes.body.error.code).toBe('VALIDATION_ERROR');

    // Inactive/unknown department -> 404 DEPARTMENT_NOT_FOUND
    const unknownDeptRes = await request(app).post('/api/tickets').send({
      departmentId: 'unknown-dept',
      patientName: 'Ramesh Kumar',
      phone: '9876543210',
      age: 58,
      gender: 'MALE',
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: false,
      requestId: '11111111-1111-4111-8111-111111111111'
    });
    expect(unknownDeptRes.status).toBe(404);
    expect(unknownDeptRes.body.error.code).toBe('DEPARTMENT_NOT_FOUND');

    // Valid registration with patient details
    const createRes = await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: 'Ramesh Kumar',
      phone: '+91 98765-43210',
      age: 58,
      gender: 'MALE',
      registrationNumber: 'UHID-2025-88412',
      visitType: 'FIRST_VISIT',
      preferredLang: 'hi',
      avoidStairs: true,
      requestId: '22222222-2222-4222-8222-222222222222'
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.idempotentReplay).toBe(false);
    expect(createRes.body.accessToken).toMatch(/^[0-9a-f]{64}$/);
    expect(createRes.body.ticket).toEqual(
      expect.objectContaining({
        publicCode: 'OPD-GEN-001',
        sequenceNo: 1,
        visitType: 'FIRST_VISIT',
        preferredLang: 'hi',
        avoidStairs: true,
        status: 'WAITING',
        queueDate: '2026-10-24'
      })
    );
    expect(createRes.body.ticket.patientSummary).toEqual({
      fullName: 'Ramesh Kumar',
      ageYears: 58,
      gender: 'MALE',
      phoneMasked: '******3210',
      phoneVerified: false,
      registrationNumber: 'UHID-2025-88412'
    });
    expect(createRes.body.ticket.queue.peopleAheadWaiting).toBe(0);
    expect(createRes.body.ticket.route.found).toBe(true);
    expect(createRes.body.ticket.route.steps.some((s) => s.mode === 'stairs')).toBe(false);
  });

  it('recovers the original ticket and capability token on lost-response retry within 10 minutes, and rejects mismatched payloads', async () => {
    const { app } = createTestHarness();
    const requestId = '33333333-3333-4333-8333-333333333333';
    const payload = {
      departmentId: 'paediatrics',
      patientName: 'Aarav Verma',
      phone: '9123456789',
      age: 7,
      gender: 'MALE',
      visitType: 'FOLLOW_UP',
      preferredLang: 'en',
      avoidStairs: true,
      requestId
    };

    const firstRes = await request(app).post('/api/tickets').send(payload);
    expect(firstRes.status).toBe(201);

    // Retry with identical requestId and identical payload -> 200 OK with same ticket & token
    const retryRes = await request(app).post('/api/tickets').send(payload);
    expect(retryRes.status).toBe(200);
    expect(retryRes.body.idempotentReplay).toBe(true);
    expect(retryRes.body.ticket.id).toBe(firstRes.body.ticket.id);
    expect(retryRes.body.ticket.publicCode).toBe('OPD-PED-001');
    expect(retryRes.body.accessToken).toBe(firstRes.body.accessToken);

    // Verify queue counter was NOT incremented on idempotent retry
    const boardRes = await request(app).get('/api/queues/public-board');
    const pedQueue = boardRes.body.queues.find((q) => q.slug === 'paediatrics');
    expect(pedQueue.waitingCount).toBe(1);

    // Retry with same requestId but modified avoidStairs -> 409 IDEMPOTENCY_PAYLOAD_MISMATCH
    const conflictRes = await request(app)
      .post('/api/tickets')
      .send({ ...payload, avoidStairs: false });
    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  it('serializes concurrent retries using the same requestId so only one ticket is created', async () => {
    const { app } = createTestHarness();
    const sharedPayload = {
      departmentId: 'orthopaedics',
      patientName: 'Sunita Devi',
      phone: '9988776655',
      age: 64,
      gender: 'FEMALE',
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: false,
      requestId: '44444444-4444-4444-8444-444444444444'
    };

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post('/api/tickets').send(sharedPayload))
    );

    const statuses = responses.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 200)).toHaveLength(4);

    const uniqueIds = new Set(responses.map((r) => r.body.ticket.id));
    const uniqueCodes = new Set(responses.map((r) => r.body.ticket.publicCode));
    expect(uniqueIds.size).toBe(1);
    expect([...uniqueCodes]).toEqual(['OPD-ORT-001']);
  });

  it('allocates strictly sequential unique token numbers under 10 concurrent registrations from distinct patients', async () => {
    const { app } = createTestHarness();

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, idx) =>
        request(app)
          .post('/api/tickets')
          .send({
            departmentId: 'general-medicine',
            patientName: `Patient Number ${idx + 1}`,
            phone: `98765432${String(idx + 10).slice(-2)}`,
            age: 30 + idx,
            visitType: 'FIRST_VISIT',
            preferredLang: 'en',
            avoidStairs: false,
            requestId: `55555555-5555-4555-8555-${String(idx + 1).padStart(12, '0')}`
          })
      )
    );

    expect(responses.every((r) => r.status === 201)).toBe(true);
    const codes = responses.map((r) => r.body.ticket.publicCode).sort();
    expect(codes).toEqual([
      'OPD-GEN-001',
      'OPD-GEN-002',
      'OPD-GEN-003',
      'OPD-GEN-004',
      'OPD-GEN-005',
      'OPD-GEN-006',
      'OPD-GEN-007',
      'OPD-GEN-008',
      'OPD-GEN-009',
      'OPD-GEN-010'
    ]);
  });

  it('acquires PostgreSQL advisory locks in deterministic order (req -> queue) when running against PG client', async () => {
    const executedQueries = [];
    const pgService = createQueueService({
      getHospitalDateIST: () => '2026-10-24',
      runWithTransaction: async (fn) => {
        const mockClient = {
          query: async (sql, params) => {
            executedQueries.push({ sql: sql.trim(), params });
            if (sql.includes('FROM tickets t') && sql.includes('WHERE t.request_id = $1')) {
              return { rows: [] };
            }
            if (sql.includes('FROM departments')) {
              return {
                rows: [
                  {
                    id: 'dept-uuid-gen',
                    slug: 'general-medicine',
                    name_en: 'General Medicine OPD',
                    name_hi: 'सामान्य चिकित्सा ओपीडी',
                    doctor_name_en: 'Dr. Rajesh Sharma',
                    doctor_name_hi: 'डॉ. राजेश शर्मा',
                    token_prefix: 'GEN',
                    floor_number: 2,
                    room_label: 'Room 204',
                    destination_node_id: 'room_204_med',
                    landmark_en: 'Left corridor from Floor 2 Main Lift',
                    landmark_hi: 'तल 2 की मुख्य लिफ्ट से बाएँ गलियारे में',
                    average_consult_minutes: 8,
                    is_active: true
                  }
                ]
              };
            }
            if (sql.includes('INSERT INTO patients')) {
              return {
                rows: [
                  {
                    id: 'patient-uuid-1',
                    identity_fingerprint: params[0],
                    full_name: params[1],
                    phone_normalized: params[2],
                    age_years: params[3],
                    gender: params[4],
                    hospital_reg_no: params[5]
                  }
                ]
              };
            }
            if (
              sql.includes('WHERE patient_id = $1') &&
              sql.includes("status IN ('WAITING', 'CALLED', 'IN_CONSULTATION')")
            ) {
              return { rows: [] };
            }
            if (sql.includes('INSERT INTO queue_counters')) {
              return { rows: [{ last_sequence: 1 }] };
            }
            if (sql.includes('MAX(queue_sort_order)')) {
              return { rows: [{ max_sort: 0 }] };
            }
            if (sql.includes('INSERT INTO tickets')) {
              return {
                rows: [
                  {
                    id: '99999999-9999-4999-8999-999999999999',
                    public_code: 'OPD-GEN-001',
                    department_id: 'dept-uuid-gen',
                    patient_id: 'patient-uuid-1',
                    queue_date: '2026-10-24',
                    sequence_no: 1,
                    queue_sort_order: 1,
                    visit_type: 'FIRST_VISIT',
                    preferred_lang: 'en',
                    avoid_stairs: false,
                    status: 'WAITING',
                    request_id: '77777777-7777-4777-8777-777777777777',
                    access_token_hash: 'hash',
                    requeued_count: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    called_at: null,
                    consultation_started_at: null,
                    completed_at: null
                  }
                ]
              };
            }
            if (sql.includes('FROM doctor_status')) {
              return { rows: [{ status: 'AVAILABLE', delay_minutes: 0 }] };
            }
            if (sql.includes('COUNT(*)::int AS count')) {
              return { rows: [{ count: 0 }] };
            }
            return { rows: [] };
          }
        };
        return fn(mockClient);
      }
    });

    await pgService.createTicket({
      departmentId: 'general-medicine',
      patientName: 'Ramesh Kumar',
      phone: '9876543210',
      age: 58,
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: false,
      requestId: '77777777-7777-4777-8777-777777777777'
    });

    const lockQueries = executedQueries.filter((q) =>
      q.sql.includes('pg_advisory_xact_lock')
    );
    expect(lockQueries).toHaveLength(2);
    expect(lockQueries[0].sql).toContain("pg_advisory_xact_lock(hashtext('req:' || $1))");
    expect(lockQueries[1].sql).toContain(
      "pg_advisory_xact_lock(hashtext('queue:' || $1 || ':' || $2))"
    );
  });
});

describe('Phase 1.3 — Patient Identity, Duplicate Prevention, Privacy & Composite Rate Limiting', () => {
  it('rejects missing or malformed patientName, phone, or age with 400 VALIDATION_ERROR', async () => {
    const { app } = createTestHarness();

    // Missing patientName
    const missingName = await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      phone: '9876543210',
      age: 45,
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: '10101010-1010-4010-8010-101010101001'
    });
    expect(missingName.status).toBe(400);
    expect(missingName.body.error.code).toBe('VALIDATION_ERROR');

    // Malformed Indian mobile number (starts with 1, or fewer than 10 digits)
    const badPhone = await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: 'Sita Sharma',
      phone: '1234567890',
      age: 45,
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: '10101010-1010-4010-8010-101010101002'
    });
    expect(badPhone.status).toBe(400);
    expect(badPhone.body.error.code).toBe('VALIDATION_ERROR');

    // Out-of-range age (> 120)
    const badAge = await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: 'Sita Sharma',
      phone: '9876543210',
      age: 150,
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: '10101010-1010-4010-8010-101010101003'
    });
    expect(badAge.status).toBe(400);
    expect(badAge.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('normalizes mobile numbers (spaces, hyphens, +91, 0 prefix) and blocks duplicate active tickets in the same department on the same date without incrementing queue counters', async () => {
    const { app } = createTestHarness();

    // 1. First registration with "+91 98765-43210"
    const firstRes = await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: '  Ramesh   Kumar ',
      phone: '+91 98765-43210',
      age: 58,
      gender: 'MALE',
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: '20202020-2020-4020-8020-202020202001'
    });
    expect(firstRes.status).toBe(201);
    expect(firstRes.body.ticket.publicCode).toBe('OPD-GEN-001');

    // 2. Repeated submission with a NEW requestId, different casing/spacing, and "098765 43210" in the SAME department
    const dupRes = await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: 'ramesh kumar',
      phone: '098765 43210',
      age: 58,
      gender: 'MALE',
      visitType: 'FOLLOW_UP',
      preferredLang: 'hi',
      avoidStairs: true,
      requestId: '20202020-2020-4020-8020-202020202002'
    });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('DUPLICATE_ACTIVE_TICKET');
    expect(dupRes.body.error.details.existingTicket).toEqual(
      expect.objectContaining({
        id: firstRes.body.ticket.id,
        publicCode: 'OPD-GEN-001',
        status: 'WAITING',
        departmentSlug: 'general-medicine',
        roomLabel: 'Room 204',
        queueDate: '2026-10-24',
        qrLookupPath: '/my-turn?code=OPD-GEN-001'
      })
    );
    // Ensure duplicate error response never leaks accessToken or full phone
    expect(dupRes.body.error.details.existingTicket.accessToken).toBeUndefined();
    expect(dupRes.body.error.details.existingTicket.phone).toBeUndefined();
    expect(dupRes.body.error.details.existingTicket.patientName).toBeUndefined();

    // 3. Verify waitingCount was NOT incremented by the duplicate attempt, and next patient gets OPD-GEN-002 (NOT OPD-GEN-003)
    const boardRes = await request(app).get('/api/queues/public-board');
    const genQueue = boardRes.body.queues.find((q) => q.slug === 'general-medicine');
    expect(genQueue.waitingCount).toBe(1);

    const otherPatientRes = await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: 'Meena Kumari',
      phone: '9811122233',
      age: 42,
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: '20202020-2020-4020-8020-202020202003'
    });
    expect(otherPatientRes.status).toBe(201);
    expect(otherPatientRes.body.ticket.publicCode).toBe('OPD-GEN-002');
    expect(otherPatientRes.body.ticket.queue.peopleAheadWaiting).toBe(1);
  });

  it('allows the same patient to register for a DIFFERENT department on the same date, and allows re-registration in the same department after COMPLETED, CANCELLED, or NO_SHOW', async () => {
    const { app } = createTestHarness();
    const staffAgent = request.agent(app);
    await staffAgent.post('/api/staff/session').send({ pin: '1234' });

    const basePatient = {
      patientName: 'Anil Kapoor',
      phone: '9765432109',
      age: 51,
      gender: 'MALE'
    };

    // 1. Register in General Medicine -> 201 OPD-GEN-001
    const gen1 = await request(app).post('/api/tickets').send({
      ...basePatient,
      departmentId: 'general-medicine',
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: '30303030-3030-4030-8030-303030303001'
    });
    expect(gen1.status).toBe(201);
    expect(gen1.body.ticket.publicCode).toBe('OPD-GEN-001');

    // 2. Same patient registers in Ophthalmology (Eye OPD) on the same date -> 201 OPD-EYE-001
    const eye1 = await request(app).post('/api/tickets').send({
      ...basePatient,
      departmentId: 'ophthalmology',
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: '30303030-3030-4030-8030-303030303002'
    });
    expect(eye1.status).toBe(201);
    expect(eye1.body.ticket.publicCode).toBe('OPD-EYE-001');

    // 3. Patient self-cancels OPD-GEN-001 using capability token -> status becomes CANCELLED
    const selfCancelRes = await request(app)
      .post(`/api/tickets/${gen1.body.ticket.id}/cancel`)
      .set('X-Ticket-Token', gen1.body.accessToken)
      .send({});
    expect(selfCancelRes.status).toBe(200);
    expect(selfCancelRes.body.ticket.status).toBe('CANCELLED');

    // 4. After CANCELLED, same patient can register again in General Medicine -> 201 OPD-GEN-002
    const gen2 = await request(app).post('/api/tickets').send({
      ...basePatient,
      departmentId: 'general-medicine',
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: '30303030-3030-4030-8030-303030303003'
    });
    expect(gen2.status).toBe(201);
    expect(gen2.body.ticket.publicCode).toBe('OPD-GEN-002');

    // 5. Staff calls OPD-GEN-002 and marks NO_SHOW -> same patient can register again (OPD-GEN-003)
    await staffAgent
      .post('/api/staff/queues/general-medicine/call-next')
      .set('Origin', 'http://localhost:3000')
      .send({});
    await staffAgent
      .post(`/api/staff/tickets/${gen2.body.ticket.id}/no-show`)
      .set('Origin', 'http://localhost:3000')
      .send({});

    const gen3 = await request(app).post('/api/tickets').send({
      ...basePatient,
      departmentId: 'general-medicine',
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: '30303030-3030-4030-8030-303030303004'
    });
    expect(gen3.status).toBe(201);
    expect(gen3.body.ticket.publicCode).toBe('OPD-GEN-003');

    // 6. Staff cannot requeue old NO_SHOW ticket (gen2) while patient already has active ticket (gen3)
    const blockedRequeue = await staffAgent
      .post(`/api/staff/tickets/${gen2.body.ticket.id}/requeue`)
      .set('Origin', 'http://localhost:3000')
      .send({});
    expect(blockedRequeue.status).toBe(409);
    expect(blockedRequeue.body.error.code).toBe('DUPLICATE_ACTIVE_TICKET');

    // 7. Staff calls, starts, and completes OPD-GEN-003 -> same patient can register again (OPD-GEN-004)
    await staffAgent
      .post('/api/staff/queues/general-medicine/call-next')
      .set('Origin', 'http://localhost:3000')
      .send({});
    await staffAgent
      .post(`/api/staff/tickets/${gen3.body.ticket.id}/start`)
      .set('Origin', 'http://localhost:3000')
      .send({});
    await staffAgent
      .post(`/api/staff/tickets/${gen3.body.ticket.id}/complete`)
      .set('Origin', 'http://localhost:3000')
      .send({});

    const gen4 = await request(app).post('/api/tickets').send({
      ...basePatient,
      departmentId: 'general-medicine',
      visitType: 'FOLLOW_UP',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: '30303030-3030-4030-8030-303030303005'
    });
    expect(gen4.status).toBe(201);
    expect(gen4.body.ticket.publicCode).toBe('OPD-GEN-004');
  });

  it('enforcescomposite IP + patient identity rate limiting on POST /api/tickets while allowing different patients on shared hospital Wi-Fi', async () => {
    const { app } = createTestHarness({
      disableRateLimits: false
    });

    // Same patient identity attempting > 8 ticket creations within 15 minutes is rate-limited (429)
    // even across different departments / cancelled tickets
    for (let i = 0; i < 8; i += 1) {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          departmentId: 'general-medicine',
          patientName: 'Repeated Caller',
          phone: '9888877776',
          age: 35,
          visitType: 'FIRST_VISIT',
          preferredLang: 'en',
          avoidStairs: true,
          requestId: '40404040-4040-4040-8040-404040404001' // idempotent replay still passes through route limiter
        });
      expect([200, 201]).toContain(res.status);
    }

    // 9th request for the same patient identity from the same IP hits the per-patient-identity limit (8 / 15m)
    const ninthSamePatient = await request(app)
      .post('/api/tickets')
      .send({
        departmentId: 'general-medicine',
        patientName: 'Repeated Caller',
        phone: '9888877776',
        age: 35,
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: true,
        requestId: '40404040-4040-4040-8040-404040404001'
      });
    expect(ninthSamePatient.status).toBe(429);
    expect(ninthSamePatient.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

    // Meanwhile, a DIFFERENT patient on the exact same shared hospital Wi-Fi IP CAN still register!
    const differentPatientSameIp = await request(app)
      .post('/api/tickets')
      .send({
        departmentId: 'paediatrics',
        patientName: 'Another Family Patient',
        phone: '9777766665',
        age: 9,
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: true,
        requestId: '40404040-4040-4040-8040-404040404099'
      });
    expect(differentPatientSameIp.status).toBe(201);
    expect(differentPatientSameIp.body.ticket.publicCode).toBe('OPD-PED-001');
  });
});

describe('Phase 1 Checkpoint A, C & E — Privacy, Rate Limiting, Capability Auth & Staff Queue State Machine', () => {
  it('enforces public lookup privacy on GET /api/slips/:publicCode (no patient PII) and returns masked patientSummary on capability-authenticated GET /api/tickets/:id', async () => {
    const { app } = createTestHarness();

    const createRes = await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: 'Kavita Krishnan',
      phone: '9876501234',
      age: 39,
      gender: 'FEMALE',
      registrationNumber: 'UHID-99100',
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: false,
      requestId: '66666666-6666-4666-8666-666666666666'
    });

    const { ticket, accessToken } = createRes.body;

    // Public lookup works with just the publicCode and NEVER leaks patient PII or capability tokens
    const slipRes = await request(app).get(`/api/slips/${ticket.publicCode}`);
    expect(slipRes.status).toBe(200);
    expect(slipRes.body.slip.publicCode).toBe('OPD-GEN-001');
    expect(slipRes.body.slip.accessToken).toBeUndefined();
    expect(slipRes.body.slip.access_token_hash).toBeUndefined();
    expect(slipRes.body.slip.requestId).toBeUndefined();
    expect(slipRes.body.slip.request_id).toBeUndefined();
    expect(slipRes.body.slip.patientSummary).toBeUndefined();
    expect(slipRes.body.slip.patientName).toBeUndefined();
    expect(slipRes.body.slip.phone).toBeUndefined();
    expect(JSON.stringify(slipRes.body)).not.toContain('Kavita Krishnan');
    expect(JSON.stringify(slipRes.body)).not.toContain('9876501234');
    expect(JSON.stringify(slipRes.body)).not.toContain('1234');

    // Public board also never leaks patient PII
    const boardRes = await request(app).get('/api/queues/public-board');
    expect(JSON.stringify(boardRes.body)).not.toContain('Kavita Krishnan');
    expect(JSON.stringify(boardRes.body)).not.toContain('9876501234');

    // Capability endpoint rejects missing or invalid token
    const missingTokenRes = await request(app).get(`/api/tickets/${ticket.id}`);
    expect(missingTokenRes.status).toBe(401);
    expect(missingTokenRes.body.error.code).toBe('INVALID_TICKET_TOKEN');

    const wrongTokenRes = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set('X-Ticket-Token', 'a'.repeat(64));
    expect(wrongTokenRes.status).toBe(403);
    expect(wrongTokenRes.body.error.code).toBe('INVALID_TICKET_TOKEN');

    // Valid capability token succeeds and includes protected patientSummary with masked phone
    const validTokenRes = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set('X-Ticket-Token', accessToken);
    expect(validTokenRes.status).toBe(200);
    expect(validTokenRes.body.ticket.id).toBe(ticket.id);
    expect(validTokenRes.body.ticket.patientSummary).toEqual({
      fullName: 'Kavita Krishnan',
      ageYears: 39,
      gender: 'FEMALE',
      phoneMasked: '******1234',
      phoneVerified: false,
      registrationNumber: 'UHID-99100'
    });
  });

  it('enforces rate limiting (429 RATE_LIMITED) on public slip lookup when limit is exceeded', async () => {
    const { app } = createTestHarness({
      disableRateLimits: false
    });

    await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: 'Rate Limit Test Patient',
      phone: '9876543219',
      age: 40,
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: false,
      requestId: '88888888-8888-4888-8888-888888888888'
    });

    // Public lookup limit is 30 per 5 minutes per IP
    const responses = [];
    for (let i = 0; i < 31; i += 1) {
      responses.push(await request(app).get('/api/slips/OPD-GEN-001'));
    }

    expect(responses[0].status).toBe(200);
    expect(responses[29].status).toBe(200);
    expect(responses[30].status).toBe(429);
    expect(responses[30].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('rejects unauthenticated staff mutations (401), enforces CSRF Origin check (403), and serializes concurrent Call Next & TAIL_REQUEUE', async () => {
    const { app } = createTestHarness();

    // Create 3 tickets in general-medicine from 3 distinct patients: OPD-GEN-001, OPD-GEN-002, OPD-GEN-003
    const t1 = (
      await request(app).post('/api/tickets').send({
        departmentId: 'general-medicine',
        patientName: 'Patient Alpha',
        phone: '9876543001',
        age: 31,
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: false,
        requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      })
    ).body.ticket;

    const t2 = (
      await request(app).post('/api/tickets').send({
        departmentId: 'general-medicine',
        patientName: 'Patient Beta',
        phone: '9876543002',
        age: 32,
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: false,
        requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
      })
    ).body.ticket;

    const t3 = (
      await request(app).post('/api/tickets').send({
        departmentId: 'general-medicine',
        patientName: 'Patient Gamma',
        phone: '9876543003',
        age: 33,
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: false,
        requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
      })
    ).body.ticket;

    // Unauthenticated staff call-next -> 401
    const unauthRes = await request(app)
      .post('/api/staff/queues/general-medicine/call-next')
      .send({});
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.error.code).toBe('STAFF_AUTH_REQUIRED');

    // Authenticate staff agent using supertest agent
    const staffAgent = request.agent(app);
    const badPinRes = await staffAgent.post('/api/staff/session').send({ pin: '0000' });
    expect(badPinRes.status).toBe(401);
    expect(badPinRes.body.error.code).toBe('INVALID_STAFF_PIN');

    const loginRes = await staffAgent.post('/api/staff/session').send({ pin: '1234' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.authenticated).toBe(true);

    // Cross-origin mutation attempt -> 403 CSRF_ORIGIN_MISMATCH
    const csrfRes = await staffAgent
      .post('/api/staff/queues/general-medicine/call-next')
      .set('Origin', 'https://evil.example.com')
      .send({});
    expect(csrfRes.status).toBe(403);
    expect(csrfRes.body.error.code).toBe('CSRF_ORIGIN_MISMATCH');

    // Concurrent Call Next -> exactly one 200 OK (OPD-GEN-001) and one 409 ACTIVE_TICKET_EXISTS
    const [callA, callB] = await Promise.all([
      staffAgent
        .post('/api/staff/queues/general-medicine/call-next')
        .set('Origin', 'http://localhost:3000')
        .send({}),
      staffAgent
        .post('/api/staff/queues/general-medicine/call-next')
        .set('Origin', 'http://localhost:3000')
        .send({})
    ]);

    const callStatuses = [callA.status, callB.status].sort();
    expect(callStatuses).toEqual([200, 409]);
    const winner = callA.status === 200 ? callA : callB;
    const loser = callA.status === 409 ? callA : callB;
    expect(winner.body.ticket.publicCode).toBe('OPD-GEN-001');
    expect(winner.body.ticket.status).toBe('CALLED');
    expect(loser.body.error.code).toBe('ACTIVE_TICKET_EXISTS');

    // Invalid state transition: trying to Complete a CALLED ticket directly without starting consultation -> 409
    const invalidComplete = await staffAgent
      .post(`/api/staff/tickets/${t1.id}/complete`)
      .set('Origin', 'http://localhost:3000')
      .send({});
    expect(invalidComplete.status).toBe(409);
    expect(invalidComplete.body.error.code).toBe('INVALID_STATE_TRANSITION');

    // Mark t1 (OPD-GEN-001) as NO_SHOW
    const noShowRes = await staffAgent
      .post(`/api/staff/tickets/${t1.id}/no-show`)
      .set('Origin', 'http://localhost:3000')
      .send({});
    expect(noShowRes.status).toBe(200);
    expect(noShowRes.body.ticket.status).toBe('NO_SHOW');

    // Now t2 (OPD-GEN-002) has 0 people ahead and t3 (OPD-GEN-003) has 1 person ahead
    const slip2Before = await request(app).get(`/api/slips/${t2.publicCode}`);
    const slip3Before = await request(app).get(`/api/slips/${t3.publicCode}`);
    expect(slip2Before.body.slip.queue.peopleAheadWaiting).toBe(0);
    expect(slip3Before.body.slip.queue.peopleAheadWaiting).toBe(1);

    // Requeue t1 (OPD-GEN-001) using TAIL_REQUEUE -> placed behind t2 and t3!
    const requeueRes = await staffAgent
      .post(`/api/staff/tickets/${t1.id}/requeue`)
      .set('Origin', 'http://localhost:3000')
      .send({});
    expect(requeueRes.status).toBe(200);
    expect(requeueRes.body.ticket.status).toBe('WAITING');
    expect(requeueRes.body.ticket.requeuedCount).toBe(1);
    expect(requeueRes.body.ticket.queue.peopleAheadWaiting).toBe(2);

    // Verify t2 and t3 were NOT pushed back by t1's requeue
    const slip2After = await request(app).get(`/api/slips/${t2.publicCode}`);
    const slip3After = await request(app).get(`/api/slips/${t3.publicCode}`);
    expect(slip2After.body.slip.queue.peopleAheadWaiting).toBe(0);
    expect(slip3After.body.slip.queue.peopleAheadWaiting).toBe(1);
  });

  it('enforces strict full-origin CSRF validation across all 6 scenarios (dev proxy, prod same-origin, missing Origin, malformed Origin, spoofed X-Forwarded-Host, untrusted cross-origin)', async () => {
    // 1. Development environment: allows Vite dev origin (http://localhost:5173) when proxied to Host: localhost:3000
    const { app: devApp } = createTestHarness();
    const devAgent = request.agent(devApp);
    await devAgent.post('/api/staff/session').send({ pin: '1234' });

    // Scenario 1: Valid local development request (Origin: http://localhost:5173, Host: localhost:3000) -> 200
    const validDevRes = await devAgent
      .patch('/api/staff/departments/general-medicine/doctor-status')
      .set('Host', 'localhost:3000')
      .set('Origin', 'http://localhost:5173')
      .send({ status: 'AVAILABLE', delayMinutes: 0 });
    expect(validDevRes.status).toBe(200);

    // Scenario 3: Missing Origin header on state-changing staff request -> 403 CSRF_ORIGIN_MISMATCH
    const missingOriginRes = await devAgent
      .patch('/api/staff/departments/general-medicine/doctor-status')
      .send({ status: 'AVAILABLE', delayMinutes: 0 });
    expect(missingOriginRes.status).toBe(403);
    expect(missingOriginRes.body.error.code).toBe('CSRF_ORIGIN_MISMATCH');

    // Scenario 4: Malformed Origin header & 'null' Origin -> 403 CSRF_ORIGIN_MISMATCH
    const malformedOriginRes = await devAgent
      .patch('/api/staff/departments/general-medicine/doctor-status')
      .set('Origin', 'not-a-valid-origin-url')
      .send({ status: 'AVAILABLE', delayMinutes: 0 });
    expect(malformedOriginRes.status).toBe(403);
    expect(malformedOriginRes.body.error.code).toBe('CSRF_ORIGIN_MISMATCH');

    const nullOriginRes = await devAgent
      .patch('/api/staff/departments/general-medicine/doctor-status')
      .set('Origin', 'null')
      .send({ status: 'AVAILABLE', delayMinutes: 0 });
    expect(nullOriginRes.status).toBe(403);
    expect(nullOriginRes.body.error.code).toBe('CSRF_ORIGIN_MISMATCH');

    // Scenario 5: Spoofed X-Forwarded-Host header when trustProxy is disabled -> 403 CSRF_ORIGIN_MISMATCH
    const spoofedForwardedHostRes = await devAgent
      .patch('/api/staff/departments/general-medicine/doctor-status')
      .set('Origin', 'https://evil.example.com')
      .set('X-Forwarded-Host', 'evil.example.com')
      .set('X-Forwarded-Proto', 'https')
      .send({ status: 'AVAILABLE', delayMinutes: 0 });
    expect(spoofedForwardedHostRes.status).toBe(403);
    expect(spoofedForwardedHostRes.body.error.code).toBe('CSRF_ORIGIN_MISMATCH');

    // 2. Production environment with canonical APP_ORIGIN configured
    const strongPinHash = bcrypt.hashSync('849207', 8);
    const prodQueueService = createQueueService({
      forceInMemory: true,
      getHospitalDateIST: () => '2026-10-24'
    });
    const prodApp = createApp({
      queueService: prodQueueService,
      isProduction: true,
      appOrigin: 'https://opd-saathi.onrender.com',
      trustProxy: true,
      staffPinHash: strongPinHash,
      disableRateLimits: true,
      // Use non-secure cookie in HTTP test harness while testing production origin enforcement
      sessionMiddleware: createTestHarness().sessionMiddleware
    });

    const prodAgent = request.agent(prodApp);
    const prodLogin = await prodAgent
      .post('/api/staff/session')
      .send({ pin: '849207' });
    expect(prodLogin.status).toBe(200);

    // Scenario 2: Valid deployed same-origin request in production -> 200
    const validProdRes = await prodAgent
      .patch('/api/staff/departments/general-medicine/doctor-status')
      .set('Origin', 'https://opd-saathi.onrender.com')
      .send({ status: 'DELAYED', delayMinutes: 15 });
    expect(validProdRes.status).toBe(200);

    // Scenario 6a: Untrusted cross-origin request in production -> 403
    const crossOriginProdRes = await prodAgent
      .patch('/api/staff/departments/general-medicine/doctor-status')
      .set('Origin', 'https://evil.example.com')
      .send({ status: 'AVAILABLE', delayMinutes: 0 });
    expect(crossOriginProdRes.status).toBe(403);
    expect(crossOriginProdRes.body.error.code).toBe('CSRF_ORIGIN_MISMATCH');

    // Scenario 6b: Development origin (http://localhost:5173) is strictly rejected in production -> 403
    const devOriginInProdRes = await prodAgent
      .patch('/api/staff/departments/general-medicine/doctor-status')
      .set('Origin', 'http://localhost:5173')
      .send({ status: 'AVAILABLE', delayMinutes: 0 });
    expect(devOriginInProdRes.status).toBe(403);
    expect(devOriginInProdRes.body.error.code).toBe('CSRF_ORIGIN_MISMATCH');
  });

  it('allows pre-registration emergency help requests and preserves routine queue order until human triage', async () => {
    const { app } = createTestHarness();

    const t1 = (
      await request(app).post('/api/tickets').send({
        departmentId: 'general-medicine',
        patientName: 'Routine Patient',
        phone: '9876543111',
        age: 50,
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: false,
        requestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
      })
    ).body.ticket;

    // Submit emergency help request WITHOUT a ticketId (pre-registration)
    const helpRes = await request(app).post('/api/help-requests').send({
      locationLabel: 'Main Entrance & Ramp',
      requestType: 'URGENT_ASSESSMENT_REQUEST'
    });

    expect(helpRes.status).toBe(201);
    expect(helpRes.body.helpRequest.status).toBe('NEW');
    expect(helpRes.body.helpRequest.location_label).toBe('Main Entrance & Ramp');

    // Routine queue order is untouched
    const slipRes = await request(app).get(`/api/slips/${t1.publicCode}`);
    expect(slipRes.body.slip.queue.peopleAheadWaiting).toBe(0);
    expect(slipRes.body.slip.status).toBe('WAITING');
  });

  it('verifies Socket.IO room authorization for subscribe:ticket and subscribe:staff', async () => {
    const { app, queueService, sessionMiddleware } = createTestHarness();
    const httpServer = http.createServer(app);
    const io = new SocketIoServer(httpServer, {
      cors: { origin: true, credentials: true }
    });
    configureSocketIo(io, { queueService, sessionMiddleware });

    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const port = httpServer.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const createRes = await request(baseUrl).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: 'Socket Patient',
      phone: '9876543222',
      age: 29,
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: false,
      requestId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
    });
    const { ticket, accessToken } = createRes.body;

    const clientSocket = createClientSocket(baseUrl, {
      transports: ['websocket'],
      forceNew: true
    });

    await new Promise((resolve) => clientSocket.on('connect', resolve));

    // Invalid capability token -> rejected
    const badTicketSub = await new Promise((resolve) => {
      clientSocket.emit(
        'subscribe:ticket',
        { ticketId: ticket.id, accessToken: '0'.repeat(64) },
        resolve
      );
    });
    expect(badTicketSub.ok).toBe(false);
    expect(badTicketSub.error).toBe('INVALID_TICKET_TOKEN');

    // Valid capability token -> joined room
    const goodTicketSub = await new Promise((resolve) => {
      clientSocket.emit('subscribe:ticket', { ticketId: ticket.id, accessToken }, resolve);
    });
    expect(goodTicketSub.ok).toBe(true);
    expect(goodTicketSub.room).toBe(`ticket:${ticket.id}`);

    // Unauthenticated socket cannot join staff:all
    const badStaffSub = await new Promise((resolve) => {
      clientSocket.emit('subscribe:staff', {}, resolve);
    });
    expect(badStaffSub.ok).toBe(false);
    expect(badStaffSub.error).toBe('STAFF_AUTH_REQUIRED');

    clientSocket.disconnect();
    await new Promise((resolve) => io.close(resolve));
  });
});

describe('Phase 1 Checkpoint A & E — 10-Route Hospital Navigation Matrix (Multi-Floor & Avoid Stairs)', () => {
  const routeMatrix = [
    ['main_entrance', 'registration_desk', false],
    ['registration_desk', 'room_204_med', false],
    ['registration_desk', 'room_302_ort', false],
    ['registration_desk', 'room_208_ped', false],
    ['registration_desk', 'room_208_ped', true],
    ['registration_desk', 'room_305_eye', false],
    ['registration_desk', 'room_305_eye', true],
    ['room_305_eye', 'pharmacy_f1', true],
    ['room_208_ped', 'lab_f2', true],
    ['main_entrance', 'emergency_casualty', true]
  ];

  it.each(routeMatrix)(
    'computes valid route from %s to %s (avoidStairs=%s)',
    (fromNodeId, toNodeId, avoidStairs) => {
      const route = findAccessibleRoute({ fromNodeId, toNodeId, avoidStairs });

      expect(route.found).toBe(true);
      expect(route.steps.length).toBeGreaterThanOrEqual(1);
      expect(route.fromNode.id).toBe(fromNodeId);
      expect(route.toNode.id).toBe(toNodeId);

      if (avoidStairs) {
        expect(route.steps.some((step) => step.mode === 'stairs')).toBe(false);
      }
    }
  );
});

describe('Phase 1.1 — Staff PIN Hardening & Zero Frontend Secret Exposure', () => {
  function collectSourceFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectSourceFiles(fullPath));
      } else if (/\.(js|jsx|ts|tsx|css|html)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('never exposes a staff PIN or demo PIN value anywhere in frontend source (src/)', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const files = collectSourceFiles(srcDir);
    expect(files.length).toBeGreaterThan(0);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toMatch(/PIN:\s*1234/i);
      expect(content).not.toMatch(/पिन:\s*1234/i);
      expect(content).not.toContain('STAFF_DEMO_PIN_HASH');
      expect(content).not.toContain('TICKET_TOKEN_SECRET');
      expect(content).not.toContain('SESSION_SECRET');
    }
  });

  it('enforces environment-controlled staff PIN and rejects weak/default PINs in production', async () => {
    // 1. Production with missing STAFF_DEMO_PIN_HASH -> fails closed
    const prodMissingEnv = loadEnvConfig({
      NODE_ENV: 'production',
      SESSION_SECRET: 'a'.repeat(64),
      TICKET_TOKEN_SECRET: 'b'.repeat(64)
    });
    expect(prodMissingEnv.staffDemoPinHash).toBe('');
    expect(prodMissingEnv.staffPinConfigError).toBe('STAFF_AUTH_UNCONFIGURED');

    // 2. Production with weak default PIN ('1234') -> fails closed
    const weakHash = bcrypt.hashSync('1234', 8);
    const prodWeakEnv = loadEnvConfig({
      NODE_ENV: 'production',
      SESSION_SECRET: 'a'.repeat(64),
      TICKET_TOKEN_SECRET: 'b'.repeat(64),
      STAFF_DEMO_PIN_HASH: weakHash
    });
    expect(prodWeakEnv.staffDemoPinHash).toBe('');
    expect(prodWeakEnv.staffPinConfigError).toBe('INSECURE_STAFF_PIN_CONFIG');

    const prodWeakApp = createApp({
      isProduction: true,
      forceInMemory: true,
      staffPinHash: weakHash,
      disableRateLimits: true
    });
    const weakLoginRes = await request(prodWeakApp)
      .post('/api/staff/session')
      .send({ pin: '1234' });
    expect(weakLoginRes.status).toBe(503);
    expect(weakLoginRes.body.error.code).toBe('INSECURE_STAFF_PIN_CONFIG');

    // 3. Production with strong custom PIN hash -> succeeds
    const strongHash = bcrypt.hashSync('849207', 8);
    const prodStrongApp = createApp({
      isProduction: true,
      forceInMemory: true,
      staffPinHash: strongHash,
      disableRateLimits: true
    });
    const strongLoginRes = await request(prodStrongApp)
      .post('/api/staff/session')
      .send({ pin: '849207' });
    expect(strongLoginRes.status).toBe(200);
    expect(strongLoginRes.body.authenticated).toBe(true);
  });

  it('keeps forceInMemory test harnesses isolated from PostgreSQL and from each other while preserving production PostgreSQL backend selection', async () => {
    let txCalled = false;
    const memoryService = createQueueService({
      forceInMemory: true,
      getHospitalDateIST: () => '2026-10-24',
      runWithTransaction: async () => {
        txCalled = true;
        throw new Error('Should never execute transaction runner when forceInMemory is true');
      }
    });

    expect(memoryService.isInMemory()).toBe(true);
    expect(memoryService.getStorageBackend()).toBe('memory');
    const deptList = await memoryService.listDepartments();
    expect(deptList.source).toBe('local-store');
    expect(txCalled).toBe(false);

    const harnessA = createTestHarness();
    const harnessB = createTestHarness();

    const resA = await request(harnessA.app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: 'Isolated Patient',
      phone: '9876543210',
      age: 45,
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
    });
    expect(resA.status).toBe(201);
    expect(resA.body.ticket.publicCode).toBe('OPD-GEN-001');

    const boardB = await request(harnessB.app).get('/api/queues/public-board');
    expect(boardB.body.queues.every((q) => q.waitingCount === 0)).toBe(true);

    const resB = await request(harnessB.app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      patientName: 'Isolated Patient',
      phone: '9876543210',
      age: 45,
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'
    });
    expect(resB.status).toBe(201);
    expect(resB.body.ticket.publicCode).toBe('OPD-GEN-001');

    const pgBackedService = createQueueService({
      runWithTransaction: async (fn) => fn({ query: async () => ({ rows: [] }) })
    });
    expect(pgBackedService.isInMemory()).toBe(false);
    expect(pgBackedService.getStorageBackend()).toBe('postgres');
  });

  it('allows authenticated staff to add a new OPD department and modify an existing department', async () => {
    const { app } = createTestHarness();
    const agent = request.agent(app);

    const unauthAdd = await request(app).post('/api/staff/departments').send({
      name_en: 'Cardiology',
      token_prefix: 'CRD',
      doctor_name_en: 'Dr. Meera Nair',
      room_label: 'Room 210',
      floor_number: 2,
      destination_node_id: 'room_204_med'
    });
    expect(unauthAdd.status).toBe(401);

    const loginRes = await agent.post('/api/staff/session').send({ pin: '1234' });
    expect(loginRes.status).toBe(200);

    const addRes = await agent
      .post('/api/staff/departments')
      .set('Origin', 'http://localhost:3000')
      .send({
        name_en: 'Cardiology',
        name_hi: 'हृदय रोग विभाग',
        token_prefix: 'CRD',
        doctor_name_en: 'Dr. Meera Nair',
        room_label: 'Room 210',
        floor_number: 2,
        destination_node_id: 'room_204_med',
        landmark_en: 'Opposite Floor 2 Main Lift',
        average_consult_minutes: 15
      });
    expect(addRes.status).toBe(201);
    expect(addRes.body.department).toEqual(
      expect.objectContaining({
        slug: 'cardiology',
        token_prefix: 'CRD',
        name_en: 'Cardiology',
        doctor_name_en: 'Dr. Meera Nair',
        room_label: 'Room 210',
        floor_number: 2,
        average_consult_minutes: 15
      })
    );

    const dupRes = await agent
      .post('/api/staff/departments')
      .set('Origin', 'http://localhost:3000')
      .send({
        name_en: 'Cardiac Care',
        token_prefix: 'CRD',
        doctor_name_en: 'Dr. Someone',
        room_label: 'Room 211',
        floor_number: 2,
        destination_node_id: 'room_204_med'
      });
    expect(dupRes.status).toBe(409);

    const patchRes = await agent
      .patch('/api/staff/departments/cardiology')
      .set('Origin', 'http://localhost:3000')
      .send({
        doctor_name_en: 'Dr. Meera Nair (Senior Consultant)',
        room_label: 'Room 210-B',
        average_consult_minutes: 12
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.department.doctor_name_en).toBe(
      'Dr. Meera Nair (Senior Consultant)'
    );
    expect(patchRes.body.department.room_label).toBe('Room 210-B');
    expect(patchRes.body.department.average_consult_minutes).toBe(12);

    const ticketRes = await request(app).post('/api/tickets').send({
      departmentId: 'cardiology',
      patientName: 'Suresh Menon',
      phone: '9887766554',
      age: 61,
      gender: 'MALE',
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: true,
      requestId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'
    });
    expect(ticketRes.status).toBe(201);
    expect(ticketRes.body.ticket.publicCode).toBe('OPD-CRD-001');

    const slipRes = await request(app).get('/api/slips/OPD-CRD-001');
    expect(slipRes.status).toBe(200);
    expect(slipRes.body.slip.department.name_en).toBe('Cardiology');
  });

  it('syncs browser-saved pending slips across departments, lists all pending tickets, and allows direct call and resolve actions', async () => {
    const { app } = createTestHarness();
    const agent = request.agent(app);

    const loginRes = await agent.post('/api/staff/session').send({ pin: '1234' });
    expect(loginRes.status).toBe(200);

    // Sync 3 browser-saved pending slips across Paediatrics and a custom Test department
    const syncRes = await agent
      .post('/api/staff/tickets/sync-saved')
      .set('Origin', 'http://localhost:3000')
      .send({
        savedSlips: [
          {
            ticketId: 'saved-ticket-1',
            publicCode: 'OPD-TEST-001',
            status: 'WAITING',
            departmentNameEn: 'Test',
            roomLabel: '111',
            patientSummary: { name: 'Ramesh', age: 23, gender: 'MALE' },
            ticket: {
              id: 'saved-ticket-1',
              publicCode: 'OPD-TEST-001',
              status: 'WAITING',
              tokenNumber: 1,
              department: {
                slug: 'test',
                token_prefix: 'TEST',
                name_en: 'Test',
                room_label: '111',
                floor_number: 2,
                destination_node_id: 'room_204_med'
              },
              patientSummary: { name: 'Ramesh', age: 23, gender: 'MALE' }
            }
          },
          {
            ticketId: 'saved-ticket-2',
            publicCode: 'OPD-PED-001',
            status: 'WAITING',
            departmentNameEn: 'Paediatrics',
            roomLabel: 'Room 208',
            patientSummary: { name: 'Ramesh', age: 23, gender: 'MALE' },
            ticket: {
              id: 'saved-ticket-2',
              publicCode: 'OPD-PED-001',
              status: 'WAITING',
              tokenNumber: 1,
              department: {
                slug: 'paediatrics',
                token_prefix: 'PED',
                name_en: 'Paediatrics',
                room_label: 'Room 208',
                floor_number: 2,
                destination_node_id: 'room_208_ped'
              },
              patientSummary: { name: 'Ramesh', age: 23, gender: 'MALE' }
            }
          },
          {
            ticketId: 'saved-ticket-3',
            publicCode: 'OPD-PED-002',
            status: 'WAITING',
            departmentNameEn: 'Paediatrics',
            roomLabel: 'Room 208',
            patientSummary: { name: 'Rakesh', age: 23, gender: 'MALE' },
            ticket: {
              id: 'saved-ticket-3',
              publicCode: 'OPD-PED-002',
              status: 'WAITING',
              tokenNumber: 2,
              department: {
                slug: 'paediatrics',
                token_prefix: 'PED',
                name_en: 'Paediatrics',
                room_label: 'Room 208',
                floor_number: 2,
                destination_node_id: 'room_208_ped'
              },
              patientSummary: { name: 'Rakesh', age: 23, gender: 'MALE' }
            }
          }
        ]
      });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.restoredCount).toBe(3);

    // Fetch ALL departments queue view
    const allQueueRes = await agent.get('/api/staff/queues/ALL');
    expect(allQueueRes.status).toBe(200);
    expect(allQueueRes.body.allPendingTickets).toHaveLength(3);
    expect(
      allQueueRes.body.allPendingTickets.map((t) => t.public_code)
    ).toEqual(expect.arrayContaining(['OPD-TEST-001', 'OPD-PED-001', 'OPD-PED-002']));
    expect(allQueueRes.body.departmentCounts.paediatrics.totalPending).toBe(2);
    expect(allQueueRes.body.departmentCounts.test.totalPending).toBe(1);

    // Directly resolve OPD-PED-002 from WAITING status
    const resolveRes = await agent
      .post('/api/staff/tickets/saved-ticket-3/resolve')
      .set('Origin', 'http://localhost:3000')
      .send({});
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.ticket.status).toBe('COMPLETED');

    // Directly call OPD-PED-001 from WAITING status
    const callRes = await agent
      .post('/api/staff/tickets/saved-ticket-2/call')
      .set('Origin', 'http://localhost:3000')
      .send({});
    expect(callRes.status).toBe(200);
    expect(callRes.body.ticket.status).toBe('CALLED');

    // Resolve OPD-PED-001 from CALLED status
    const resolveCalledRes = await agent
      .post('/api/staff/tickets/saved-ticket-2/resolve')
      .set('Origin', 'http://localhost:3000')
      .send({});
    expect(resolveCalledRes.status).toBe(200);
    expect(resolveCalledRes.body.ticket.status).toBe('COMPLETED');
  });
});
