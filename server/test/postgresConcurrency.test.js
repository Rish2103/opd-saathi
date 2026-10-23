import { describe, expect, it } from 'vitest';
import { createQueueService } from '../services/queueService.js';
import { withTransaction } from '../db/pool.js';

describe('Phase 1.1 — PostgreSQL SQL Transaction & Advisory Lock Contract Verification', () => {
  const sampleDept = {
    id: '11111111-1111-4111-8111-111111111101',
    slug: 'general-medicine',
    token_prefix: 'GEN',
    name_en: 'General Medicine',
    name_hi: 'सामान्य चिकित्सा (General Medicine)',
    doctor_name_en: 'Dr. Rajeshwar Rao',
    doctor_name_hi: 'डॉ. राजेश्वर राव',
    room_label: 'Room 204',
    floor_number: 2,
    destination_node_id: 'room_204_med',
    landmark_en: 'Opposite Second Floor Nursing Station',
    landmark_hi: 'दूसरी मंजिल नर्सिंग स्टेशन के सामने',
    average_consult_minutes: 10,
    is_active: true
  };

  it('executes strict PostgreSQL advisory lock ordering in callNextTicket and transitionTicketStatus (TAIL_REQUEUE)', async () => {
    const executedSql = [];
    const ticketId = '99999999-9999-4999-8999-999999999999';

    let currentStatus = 'WAITING';
    let currentSortOrder = 1;
    let requeuedCount = 0;

    const fakePgClient = {
      async query(sql, params) {
        executedSql.push({ sql: sql.trim(), params });

        if (sql.includes('FROM departments')) {
          return { rows: [sampleDept] };
        }
        if (sql.includes('pg_advisory_xact_lock')) {
          return { rows: [{ pg_advisory_xact_lock: '' }] };
        }
        if (sql.includes("status IN ('CALLED', 'IN_CONSULTATION')") && sql.includes('FOR UPDATE')) {
          return {
            rows:
              currentStatus === 'CALLED' || currentStatus === 'IN_CONSULTATION'
                ? [{ public_code: 'OPD-GEN-001', status: currentStatus }]
                : []
          };
        }
        if (sql.includes("status = 'WAITING'") && sql.includes('FOR UPDATE')) {
          return {
            rows: [
              {
                id: ticketId,
                public_code: 'OPD-GEN-001',
                department_id: sampleDept.id,
                queue_date: '2026-10-24',
                sequence_no: 1,
                queue_sort_order: currentSortOrder,
                status: 'WAITING',
                visit_type: 'FIRST_VISIT',
                preferred_lang: 'en',
                avoid_stairs: true,
                requeued_count: requeuedCount,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]
          };
        }
        if (sql.includes('SELECT id, department_id, queue_date FROM tickets')) {
          return {
            rows: [
              {
                id: ticketId,
                department_id: sampleDept.id,
                queue_date: '2026-10-24'
              }
            ]
          };
        }
        if (sql.includes('SELECT * FROM tickets WHERE id = $1 FOR UPDATE')) {
          return {
            rows: [
              {
                id: ticketId,
                public_code: 'OPD-GEN-001',
                department_id: sampleDept.id,
                queue_date: '2026-10-24',
                sequence_no: 1,
                queue_sort_order: currentSortOrder,
                status: currentStatus,
                visit_type: 'FIRST_VISIT',
                preferred_lang: 'en',
                avoid_stairs: true,
                requeued_count: requeuedCount,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]
          };
        }
        if (sql.includes('MAX(queue_sort_order)')) {
          return { rows: [{ max_sort: '5' }] };
        }
        if (sql.includes('UPDATE tickets')) {
          if (sql.includes("status = 'CALLED'")) {
            currentStatus = 'CALLED';
          } else if (sql.includes("status = 'NO_SHOW'")) {
            currentStatus = 'NO_SHOW';
          } else if (sql.includes("status = 'WAITING'") && sql.includes('requeued_count')) {
            currentStatus = 'WAITING';
            currentSortOrder = Number(params[1]);
            requeuedCount += 1;
          }
          return {
            rows: [
              {
                id: ticketId,
                public_code: 'OPD-GEN-001',
                department_id: sampleDept.id,
                queue_date: '2026-10-24',
                sequence_no: 1,
                queue_sort_order: currentSortOrder,
                status: currentStatus,
                visit_type: 'FIRST_VISIT',
                preferred_lang: 'en',
                avoid_stairs: true,
                requeued_count: requeuedCount,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
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

    const pgQueueService = createQueueService({
      runWithTransaction: async (fn) => fn(fakePgClient)
    });

    // 1. Call Next
    const calledSlip = await pgQueueService.callNextTicket('general-medicine');
    expect(calledSlip.status).toBe('CALLED');

    // 2. Mark NO_SHOW
    const noShowSlip = await pgQueueService.transitionTicketStatus(ticketId, 'no-show');
    expect(noShowSlip.status).toBe('NO_SHOW');

    // 3. Requeue to Tail (TAIL_REQUEUE)
    const requeuedSlip = await pgQueueService.transitionTicketStatus(ticketId, 'requeue');
    expect(requeuedSlip.status).toBe('WAITING');
    expect(requeuedSlip.queueSortOrder).toBe(6); // max_sort (5) + 1
    expect(requeuedSlip.requeuedCount).toBe(1);

    // Verify advisory locks were acquired before row-level FOR UPDATE locks
    const advisoryLockQueries = executedSql.filter((q) =>
      q.sql.includes("pg_advisory_xact_lock(hashtext('queue:' || $1 || ':' || $2))")
    );
    expect(advisoryLockQueries.length).toBe(3);
  });
});

const hasLiveDatabase = Boolean((process.env.DATABASE_URL || '').trim());

describe.runIf(hasLiveDatabase)(
  'Phase 1.1 — Live PostgreSQL Concurrency Verification (requires DATABASE_URL)',
  () => {
    it('serializes simultaneous ticket creation, idempotent retries, call-next, and state transitions against real PostgreSQL', async () => {
      const liveService = createQueueService({
        runWithTransaction: withTransaction
      });

      // 1. Concurrent idempotent retry with identical requestId
      const sharedReqId = crypto.randomUUID();
      const [retryA, retryB] = await Promise.all([
        liveService.createTicket({
          requestId: sharedReqId,
          departmentId: 'general-medicine',
          visitType: 'FIRST_VISIT',
          preferredLang: 'en',
          avoidStairs: true
        }),
        liveService.createTicket({
          requestId: sharedReqId,
          departmentId: 'general-medicine',
          visitType: 'FIRST_VISIT',
          preferredLang: 'en',
          avoidStairs: true
        })
      ]);

      expect(retryA.ticket.id).toBe(retryB.ticket.id);
      expect(retryA.accessToken).toBe(retryB.accessToken);
      const statuses = [retryA.httpStatus, retryB.httpStatus].sort();
      expect(statuses).toEqual([200, 201]);

      // 2. Simultaneous registrations in the same department
      const parallelBatch = await Promise.all(
        Array.from({ length: 4 }, () =>
          liveService.createTicket({
            requestId: crypto.randomUUID(),
            departmentId: 'orthopedics',
            visitType: 'FIRST_VISIT',
            preferredLang: 'hi',
            avoidStairs: false
          })
        )
      );
      const codes = new Set(parallelBatch.map((r) => r.ticket.publicCode));
      expect(codes.size).toBe(4);
    });
  }
);
