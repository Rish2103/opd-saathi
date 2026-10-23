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
  it('validates registration payload and creates sequential OPD tickets with capability tokens', async () => {
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
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: false,
      requestId: '11111111-1111-4111-8111-111111111111'
    });
    expect(unknownDeptRes.status).toBe(404);
    expect(unknownDeptRes.body.error.code).toBe('DEPARTMENT_NOT_FOUND');

    // Valid registration
    const createRes = await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
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
    expect(createRes.body.ticket.queue.peopleAheadWaiting).toBe(0);
    expect(createRes.body.ticket.route.found).toBe(true);
    expect(createRes.body.ticket.route.steps.some((s) => s.mode === 'stairs')).toBe(false);
  });

  it('recovers the original ticket and capability token on lost-response retry within 10 minutes, and rejects mismatched payloads', async () => {
    const { app } = createTestHarness();
    const requestId = '33333333-3333-4333-8333-333333333333';
    const payload = {
      departmentId: 'paediatrics',
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

  it('allocates strictly sequential unique token numbers under 10 concurrent registrations', async () => {
    const { app } = createTestHarness();

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, idx) =>
        request(app)
          .post('/api/tickets')
          .send({
            departmentId: 'general-medicine',
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
            if (sql.includes('FROM tickets') && sql.includes('WHERE request_id = $1')) {
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

describe('Phase 1 Checkpoint A, C & E — Privacy, Rate Limiting, Capability Auth & Staff Queue State Machine', () => {
  it('enforces public lookup privacy on GET /api/slips/:publicCode and capability check on GET /api/tickets/:id', async () => {
    const { app } = createTestHarness();

    const createRes = await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
      visitType: 'FIRST_VISIT',
      preferredLang: 'en',
      avoidStairs: false,
      requestId: '66666666-6666-4666-8666-666666666666'
    });

    const { ticket, accessToken } = createRes.body;

    // Public lookup works with just the publicCode and never leaks secrets
    const slipRes = await request(app).get(`/api/slips/${ticket.publicCode}`);
    expect(slipRes.status).toBe(200);
    expect(slipRes.body.slip.publicCode).toBe('OPD-GEN-001');
    expect(slipRes.body.slip.accessToken).toBeUndefined();
    expect(slipRes.body.slip.access_token_hash).toBeUndefined();
    expect(slipRes.body.slip.requestId).toBeUndefined();
    expect(slipRes.body.slip.request_id).toBeUndefined();

    // Capability endpoint rejects missing or invalid token
    const missingTokenRes = await request(app).get(`/api/tickets/${ticket.id}`);
    expect(missingTokenRes.status).toBe(401);
    expect(missingTokenRes.body.error.code).toBe('INVALID_TICKET_TOKEN');

    const wrongTokenRes = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set('X-Ticket-Token', 'a'.repeat(64));
    expect(wrongTokenRes.status).toBe(403);
    expect(wrongTokenRes.body.error.code).toBe('INVALID_TICKET_TOKEN');

    // Valid capability token succeeds
    const validTokenRes = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set('X-Ticket-Token', accessToken);
    expect(validTokenRes.status).toBe(200);
    expect(validTokenRes.body.ticket.id).toBe(ticket.id);
  });

  it('enforces rate limiting (429 RATE_LIMITED) on public slip lookup when limit is exceeded', async () => {
    const { app } = createTestHarness({
      disableRateLimits: false
    });

    await request(app).post('/api/tickets').send({
      departmentId: 'general-medicine',
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

    // Create 3 tickets in general-medicine: OPD-GEN-001, OPD-GEN-002, OPD-GEN-003
    const t1 = (
      await request(app).post('/api/tickets').send({
        departmentId: 'general-medicine',
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: false,
        requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      })
    ).body.ticket;

    const t2 = (
      await request(app).post('/api/tickets').send({
        departmentId: 'general-medicine',
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: false,
        requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
      })
    ).body.ticket;

    const t3 = (
      await request(app).post('/api/tickets').send({
        departmentId: 'general-medicine',
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
      staffAgent.post('/api/staff/queues/general-medicine/call-next').send({}),
      staffAgent.post('/api/staff/queues/general-medicine/call-next').send({})
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
      .send({});
    expect(invalidComplete.status).toBe(409);
    expect(invalidComplete.body.error.code).toBe('INVALID_STATE_TRANSITION');

    // Mark t1 (OPD-GEN-001) as NO_SHOW
    const noShowRes = await staffAgent.post(`/api/staff/tickets/${t1.id}/no-show`).send({});
    expect(noShowRes.status).toBe(200);
    expect(noShowRes.body.ticket.status).toBe('NO_SHOW');

    // Now t2 (OPD-GEN-002) has 0 people ahead and t3 (OPD-GEN-003) has 1 person ahead
    const slip2Before = await request(app).get(`/api/slips/${t2.publicCode}`);
    const slip3Before = await request(app).get(`/api/slips/${t3.publicCode}`);
    expect(slip2Before.body.slip.queue.peopleAheadWaiting).toBe(0);
    expect(slip3Before.body.slip.queue.peopleAheadWaiting).toBe(1);

    // Requeue t1 (OPD-GEN-001) using TAIL_REQUEUE -> placed behind t2 and t3!
    const requeueRes = await staffAgent.post(`/api/staff/tickets/${t1.id}/requeue`).send({});
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

  it('allows pre-registration emergency help requests and preserves routine queue order until human triage', async () => {
    const { app } = createTestHarness();

    const t1 = (
      await request(app).post('/api/tickets').send({
        departmentId: 'general-medicine',
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
      staffPinHash: strongHash,
      disableRateLimits: true
    });
    const strongLoginRes = await request(prodStrongApp)
      .post('/api/staff/session')
      .send({ pin: '849207' });
    expect(strongLoginRes.status).toBe(200);
    expect(strongLoginRes.body.authenticated).toBe(true);
  });
});
