import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { getPool, withTransaction } from '../db/pool.js';
import { SEED_DEPARTMENTS } from '../db/seed.js';
import {
  derivePatientIdentityFingerprint,
  deriveTicketAccessToken,
  hashAccessToken,
  isWithinRecoveryWindow,
  maskPatientPhone,
  matchesIdempotentPayload,
  normalizePatientName,
  normalizePatientPhone,
  verifyTicketAccessToken
} from './ticketTokenService.js';
import { findAccessibleRoute } from '../../shared/navigation/pathfinder.js';

/**
 * Computes the current hospital queue date ('YYYY-MM-DD') in Asia/Kolkata (IST).
 *
 * @param {Date} [now]
 * @returns {string} YYYY-MM-DD in IST
 */
export function getHospitalDateIST(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

/**
 * Helper to create structured HTTP domain errors with optional safe metadata details.
 */
export function createDomainError(statusCode, code, message, details = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (details && typeof details === 'object') {
    err.details = details;
  }
  return err;
}

/**
 * Formats a protected, masked patient summary for capability-authenticated
 * ticket holders or authenticated staff views. Never included in public lookups.
 */
export function formatPatientSummary(patientRow) {
  if (!patientRow || !patientRow.full_name) {
    return null;
  }
  return {
    fullName: patientRow.full_name,
    ageYears: Number(patientRow.age_years),
    gender: patientRow.gender || 'PREFER_NOT_TO_SAY',
    phoneMasked: maskPatientPhone(patientRow.phone_normalized),
    phoneVerified: Boolean(patientRow.phone_verified),
    registrationNumber: patientRow.hospital_reg_no ?? null
  };
}

/**
 * Formats minimal non-PII operational metadata about an existing active ticket
 * when returning 409 DUPLICATE_ACTIVE_TICKET so the client can reopen or track it
 * without leaking accessToken or personal details.
 */
export function formatDuplicateExistingTicketSummary(ticket, department) {
  return {
    id: ticket.id,
    publicCode: ticket.public_code,
    queueDate:
      ticket.queue_date instanceof Date
        ? ticket.queue_date.toISOString().slice(0, 10)
        : String(ticket.queue_date).slice(0, 10),
    sequenceNo: Number(ticket.sequence_no),
    status: ticket.status,
    visitType: ticket.visit_type,
    avoidStairs: Boolean(ticket.avoid_stairs),
    departmentSlug: department.slug,
    departmentNameEn: department.name_en,
    departmentNameHi: department.name_hi,
    roomLabel: department.room_label,
    floorNumber: Number(department.floor_number),
    qrLookupPath: `/my-turn?code=${encodeURIComponent(ticket.public_code)}`,
    department: {
      id: department.id,
      slug: department.slug,
      tokenPrefix: department.token_prefix,
      name_en: department.name_en,
      name_hi: department.name_hi,
      doctor_name_en: department.doctor_name_en,
      doctor_name_hi: department.doctor_name_hi,
      room_label: department.room_label,
      floor_number: Number(department.floor_number)
    }
  };
}

/**
 * Computes waiting count ahead and deterministic ETA per docs/BACKEND.md Section 3.
 */
export function computeQueueMetrics({
  ticket,
  department,
  doctorStatusRow,
  activeTicket,
  peopleAheadWaiting
}) {
  const docStatus = doctorStatusRow?.status || 'AVAILABLE';
  const delayMinutes = Number(doctorStatusRow?.delay_minutes ?? 0);
  const avgConsult = Number(department.average_consult_minutes ?? 10);

  if (docStatus === 'UNAVAILABLE') {
    return {
      peopleAheadWaiting: ticket.status === 'WAITING' ? peopleAheadWaiting : 0,
      nowServingCode: activeTicket?.public_code ?? null,
      estimatedWaitMinutes: null,
      etaStatus: 'UNAVAILABLE_ASK_HELP_DESK',
      doctorStatus: docStatus,
      delayMinutes
    };
  }

  if (ticket.status === 'CALLED' || ticket.status === 'IN_CONSULTATION') {
    return {
      peopleAheadWaiting: 0,
      nowServingCode: activeTicket?.public_code ?? ticket.public_code,
      estimatedWaitMinutes: 0,
      etaStatus: 'NOW_SERVING',
      doctorStatus: docStatus,
      delayMinutes
    };
  }

  if (ticket.status !== 'WAITING') {
    return {
      peopleAheadWaiting: 0,
      nowServingCode: activeTicket?.public_code ?? null,
      estimatedWaitMinutes: null,
      etaStatus: 'INACTIVE',
      doctorStatus: docStatus,
      delayMinutes
    };
  }

  const activeRemainder =
    activeTicket && activeTicket.id !== ticket.id ? avgConsult : 0;
  const estimatedWaitMinutes =
    activeRemainder + peopleAheadWaiting * avgConsult + delayMinutes;

  return {
    peopleAheadWaiting,
    nowServingCode: activeTicket?.public_code ?? null,
    estimatedWaitMinutes,
    etaStatus: docStatus === 'AVAILABLE' ? 'ESTIMATED' : 'DELAYED_ESTIMATE',
    doctorStatus: docStatus,
    delayMinutes
  };
}

/**
 * Formats a public/operational ticket slip without exposing any capability secrets,
 * token hashes, or recovery requestIds.
 */
export function formatOperationalSlip({
  ticket,
  department,
  doctorStatusRow,
  activeTicket,
  peopleAheadWaiting
}) {
  const metrics = computeQueueMetrics({
    ticket,
    department,
    doctorStatusRow,
    activeTicket,
    peopleAheadWaiting
  });

  const route = findAccessibleRoute({
    fromNodeId: 'registration_desk',
    toNodeId: department.destination_node_id,
    avoidStairs: Boolean(ticket.avoid_stairs)
  });

  return {
    id: ticket.id,
    publicCode: ticket.public_code,
    queueDate: ticket.queue_date,
    sequenceNo: Number(ticket.sequence_no),
    queueSortOrder: Number(ticket.queue_sort_order),
    status: ticket.status,
    visitType: ticket.visit_type,
    preferredLang: ticket.preferred_lang,
    avoidStairs: Boolean(ticket.avoid_stairs),
    cancelReason: ticket.cancel_reason ?? null,
    requeuedCount: Number(ticket.requeued_count ?? 0),
    createdAt:
      ticket.created_at instanceof Date
        ? ticket.created_at.toISOString()
        : String(ticket.created_at),
    updatedAt:
      ticket.updated_at instanceof Date
        ? ticket.updated_at.toISOString()
        : String(ticket.updated_at),
    calledAt: ticket.called_at
      ? ticket.called_at instanceof Date
        ? ticket.called_at.toISOString()
        : String(ticket.called_at)
      : null,
    consultationStartedAt: ticket.consultation_started_at
      ? ticket.consultation_started_at instanceof Date
        ? ticket.consultation_started_at.toISOString()
        : String(ticket.consultation_started_at)
      : null,
    completedAt: ticket.completed_at
      ? ticket.completed_at instanceof Date
        ? ticket.completed_at.toISOString()
        : String(ticket.completed_at)
      : null,
    department: {
      id: department.id,
      slug: department.slug,
      tokenPrefix: department.token_prefix,
      name_en: department.name_en,
      name_hi: department.name_hi,
      doctor_name_en: department.doctor_name_en,
      doctor_name_hi: department.doctor_name_hi,
      room_label: department.room_label,
      floor_number: Number(department.floor_number),
      destination_node_id: department.destination_node_id,
      landmark_en: department.landmark_en,
      landmark_hi: department.landmark_hi,
      average_consult_minutes: Number(department.average_consult_minutes)
    },
    queue: metrics,
    qrLookupPath: `/my-turn?code=${encodeURIComponent(ticket.public_code)}`,
    route
  };
}

/**
 * In-process async key mutex to mirror PostgreSQL pg_advisory_xact_lock
 * when running local dev/tests without a live cloud DATABASE_URL.
 */
class AdvisoryLockManager {
  constructor() {
    this.chains = new Map();
  }

  async withKeyLock(key, fn) {
    const prev = this.chains.get(key) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
      release = resolve;
    });
    const nextChain = prev.then(() => current);
    this.chains.set(key, nextChain);

    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.chains.get(key) === nextChain) {
        this.chains.delete(key);
      }
    }
  }
}

/**
 * Creates an isolated in-memory store with deterministic seeded UUIDs for departments
 * so local development and automated tests work out of the box when DATABASE_URL is absent.
 */
export function createLocalMemoryStore() {
  const departmentsById = new Map();
  const departmentsBySlug = new Map();
  const doctorStatusByDeptId = new Map();

  // Deterministic UUIDs for the 4 canonical departments
  const fixedIds = {
    'general-medicine': '11111111-1111-4111-8111-111111111101',
    paediatrics: '11111111-1111-4111-8111-111111111102',
    orthopaedics: '11111111-1111-4111-8111-111111111103',
    ophthalmology: '11111111-1111-4111-8111-111111111104'
  };

  for (const seed of SEED_DEPARTMENTS) {
    const id = fixedIds[seed.slug] || crypto.randomUUID();
    const deptRow = {
      id,
      ...seed,
      is_active: true,
      created_at: new Date().toISOString()
    };
    departmentsById.set(id, deptRow);
    departmentsBySlug.set(seed.slug, deptRow);
    doctorStatusByDeptId.set(id, {
      department_id: id,
      status: 'AVAILABLE',
      delay_minutes: 0,
      updated_at: new Date().toISOString(),
      updated_by_session_id: null
    });
  }

  return {
    lockManager: new AdvisoryLockManager(),
    departmentsById,
    departmentsBySlug,
    doctorStatusByDeptId,
    countersByDeptDate: new Map(), // `${deptId}:${queueDate}` -> integer
    patientsById: new Map(),
    patientsByFingerprint: new Map(),
    ticketsById: new Map(),
    ticketsByRequestId: new Map(),
    urgentFlagsById: new Map(),
    auditEvents: []
  };
}

/**
 * Creates a QueueService instance backed by PostgreSQL (when configured or injected)
 * or the advisory-locked local store in non-production environments.
 */
export function createQueueService(options = {}) {
  const tokenSecret = options.tokenSecret ?? env.ticketTokenSecret;
  const localStore = options.localStore ?? createLocalMemoryStore();
  let ioEmitter = options.ioEmitter ?? null;

  function setIoEmitter(emitter) {
    ioEmitter = emitter;
  }

  function emitPostCommit(callback) {
    if (!ioEmitter) {
      return;
    }
    try {
      callback(ioEmitter);
    } catch {
      // Socket emission errors must never break committed HTTP responses
    }
  }

  function usePostgres() {
    if (options.forceInMemory === true) return false;
    if (options.runWithTransaction) {
      return true;
    }
    const { pool } = getPool();
    return Boolean(pool);
  }

  const runTx = options.runWithTransaction ?? withTransaction;

  /**
   * Resolves a department by UUID or slug from local store.
   */
  function resolveLocalDepartment(idOrSlug) {
    if (!idOrSlug) return null;
    return (
      localStore.departmentsById.get(idOrSlug) ||
      localStore.departmentsBySlug.get(idOrSlug) ||
      null
    );
  }

  /**
   * Lists all active departments joined with doctor_status and live waiting count.
   */
  async function listDepartments() {
    const queueDate = getHospitalDateIST();

    if (usePostgres()) {
      return runTx(async (client) => {
        const res = await client.query(
          `SELECT
             d.id, d.slug, d.token_prefix, d.name_en, d.name_hi,
             d.doctor_name_en, d.doctor_name_hi, d.room_label, d.floor_number,
             d.destination_node_id, d.landmark_en, d.landmark_hi,
             d.average_consult_minutes, d.is_active,
             COALESCE(ds.status, 'AVAILABLE') AS doctor_status,
             COALESCE(ds.delay_minutes, 0) AS delay_minutes,
             (
               SELECT COUNT(*)::int FROM tickets t
               WHERE t.department_id = d.id AND t.queue_date = $1 AND t.status = 'WAITING'
             ) AS waiting_count,
             (
               SELECT t.public_code FROM tickets t
               WHERE t.department_id = d.id AND t.queue_date = $1 AND t.status IN ('CALLED', 'IN_CONSULTATION')
               LIMIT 1
             ) AS now_serving_code
           FROM departments d
           LEFT JOIN doctor_status ds ON ds.department_id = d.id
           WHERE d.is_active = true
           ORDER BY d.floor_number ASC, d.slug ASC`,
          [queueDate]
        );
        return { source: 'database', departments: res.rows };
      });
    }

    const departments = [];
    for (const dept of localStore.departmentsById.values()) {
      if (!dept.is_active) continue;
      const ds = localStore.doctorStatusByDeptId.get(dept.id);
      const deptTickets = Array.from(localStore.ticketsById.values()).filter(
        (t) => t.department_id === dept.id && t.queue_date === queueDate
      );
      const waitingCount = deptTickets.filter((t) => t.status === 'WAITING').length;
      const active = deptTickets.find(
        (t) => t.status === 'CALLED' || t.status === 'IN_CONSULTATION'
      );

      departments.push({
        ...dept,
        doctor_status: ds?.status ?? 'AVAILABLE',
        delay_minutes: ds?.delay_minutes ?? 0,
        waiting_count: waitingCount,
        now_serving_code: active?.public_code ?? null
      });
    }

    return { source: 'local-store', departments };
  }

  /**
   * Creates a new queue ticket, recovers an idempotent retry, or blocks duplicate active registrations.
   */
  async function createTicket(payload, nowMs = Date.now()) {
    const {
      requestId,
      departmentId,
      visitType = 'FIRST_VISIT',
      preferredLang = 'hi',
      avoidStairs = true,
      patientName,
      phone,
      age,
      gender = 'PREFER_NOT_TO_SAY',
      registrationNumber = null
    } = payload;

    const fullName = normalizePatientName(patientName);
    const phoneNormalized = normalizePatientPhone(phone);
    const ageYears =
      age !== undefined && age !== null && age !== ''
        ? Number.parseInt(String(age), 10)
        : Number.NaN;
    const normalizedGender = [
      'FEMALE',
      'MALE',
      'OTHER',
      'PREFER_NOT_TO_SAY'
    ].includes(gender)
      ? gender
      : 'PREFER_NOT_TO_SAY';
    const cleanRegNo =
      typeof registrationNumber === 'string' && registrationNumber.trim().length > 0
        ? registrationNumber.trim().slice(0, 64)
        : null;

    if (
      !fullName ||
      fullName.length < 2 ||
      !phoneNormalized ||
      !Number.isInteger(ageYears) ||
      ageYears < 0 ||
      ageYears > 120
    ) {
      throw createDomainError(
        400,
        'VALIDATION_ERROR',
        'Valid patient full name, 10-digit mobile number, and age (0–120 years) are required.'
      );
    }

    const identityFingerprint = derivePatientIdentityFingerprint({
      phoneNormalized,
      fullName,
      ageYears
    });

    const queueDate = getHospitalDateIST(new Date(nowMs));

    let committedResult = null;

    if (usePostgres()) {
      committedResult = await runTx(async (client) => {
        // Step 1: Global Lock Order — Lock requestId first to serialise concurrent retries
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext('req:' || $1))",
          [requestId]
        );

        const existingRes = await client.query(
          `SELECT t.*,
                  p.identity_fingerprint, p.full_name, p.phone_normalized,
                  p.phone_verified, p.age_years, p.gender, p.hospital_reg_no
           FROM tickets t
           LEFT JOIN patients p ON p.id = t.patient_id
           WHERE t.request_id = $1
           LIMIT 1`,
          [requestId]
        );

        if (existingRes.rows.length > 0) {
          const existingTicket = existingRes.rows[0];
          const deptRes = await client.query(
            'SELECT * FROM departments WHERE id = $1 LIMIT 1',
            [existingTicket.department_id]
          );
          const dept = deptRes.rows[0];

          const normalizedIncoming = {
            departmentId: dept && departmentId === dept.slug ? dept.id : departmentId,
            visitType,
            preferredLang,
            avoidStairs,
            identityFingerprint
          };

          if (!matchesIdempotentPayload(existingTicket, normalizedIncoming)) {
            throw createDomainError(
              409,
              'IDEMPOTENCY_PAYLOAD_MISMATCH',
              'This requestId was already used with different registration parameters.'
            );
          }

          if (
            existingTicket.status !== 'WAITING' ||
            !isWithinRecoveryWindow(existingTicket.created_at, nowMs)
          ) {
            throw createDomainError(
              409,
              'IDEMPOTENCY_WINDOW_EXPIRED',
              'The 10-minute idempotent recovery window for this ticket has expired. Please look up your slip using your token code.'
            );
          }

          const dsRes = await client.query(
            'SELECT * FROM doctor_status WHERE department_id = $1',
            [dept.id]
          );
          const activeRes = await client.query(
            `SELECT * FROM tickets
             WHERE department_id = $1 AND queue_date = $2 AND status IN ('CALLED', 'IN_CONSULTATION')
             LIMIT 1`,
            [dept.id, existingTicket.queue_date]
          );
          const aheadRes = await client.query(
            `SELECT COUNT(*)::int AS count FROM tickets
             WHERE department_id = $1 AND queue_date = $2 AND status = 'WAITING' AND queue_sort_order < $3`,
            [dept.id, existingTicket.queue_date, existingTicket.queue_sort_order]
          );

          const recoveredToken = deriveTicketAccessToken(
            existingTicket.id,
            requestId,
            tokenSecret
          );

          const baseSlip = formatOperationalSlip({
            ticket: existingTicket,
            department: dept,
            doctorStatusRow: dsRes.rows[0],
            activeTicket: activeRes.rows[0] || null,
            peopleAheadWaiting: aheadRes.rows[0]?.count ?? 0
          });

          return {
            httpStatus: 200,
            idempotentReplay: true,
            accessToken: recoveredToken,
            ticket: {
              ...baseSlip,
              patientSummary: formatPatientSummary(existingTicket)
            }
          };
        }

        // Verify department exists and is active (accept UUID or slug)
        const deptRes = await client.query(
          'SELECT * FROM departments WHERE (id::text = $1 OR slug = $1) AND is_active = true LIMIT 1',
          [String(departmentId)]
        );
        if (deptRes.rows.length === 0) {
          throw createDomainError(
            404,
            'DEPARTMENT_NOT_FOUND',
            'Selected OPD department does not exist or is currently inactive.'
          );
        }
        const dept = deptRes.rows[0];

        // Step 2: Global Lock Order — Lock (department_id, queue_date)
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext('queue:' || $1 || ':' || $2))",
          [dept.id, queueDate]
        );

        // Step 3: Upsert protected patient identity record
        const patientRes = await client.query(
          `INSERT INTO patients (
             identity_fingerprint, full_name, phone_normalized, phone_verified,
             age_years, gender, hospital_reg_no, updated_at
           )
           VALUES ($1, $2, $3, false, $4, $5, $6, NOW())
           ON CONFLICT (identity_fingerprint)
           DO UPDATE SET
             gender = EXCLUDED.gender,
             hospital_reg_no = COALESCE(EXCLUDED.hospital_reg_no, patients.hospital_reg_no),
             updated_at = NOW()
           RETURNING *`,
          [
            identityFingerprint,
            fullName,
            phoneNormalized,
            ageYears,
            normalizedGender,
            cleanRegNo
          ]
        );
        const patientRow = patientRes.rows[0];

        // Step 4: Check for existing active ticket for (patient_id, department_id, queue_date)
        // BEFORE allocating a sequence counter
        const activeDupRes = await client.query(
          `SELECT * FROM tickets
           WHERE patient_id = $1
             AND department_id = $2
             AND queue_date = $3
             AND status IN ('WAITING', 'CALLED', 'IN_CONSULTATION')
           LIMIT 1
           FOR UPDATE`,
          [patientRow.id, dept.id, queueDate]
        );

        if (activeDupRes.rows.length > 0) {
          const existingActive = activeDupRes.rows[0];
          throw createDomainError(
            409,
            'DUPLICATE_ACTIVE_TICKET',
            `An active OPD token (${existingActive.public_code}) already exists for this patient in ${dept.name_en} today.`,
            {
              existingTicket: formatDuplicateExistingTicketSummary(existingActive, dept)
            }
          );
        }

        // Step 5: Allocate atomic daily sequence number only after duplicate guard passes
        const seqRes = await client.query(
          `INSERT INTO queue_counters (department_id, queue_date, last_sequence)
           VALUES ($1, $2, 1)
           ON CONFLICT (department_id, queue_date)
           DO UPDATE SET last_sequence = queue_counters.last_sequence + 1
           RETURNING last_sequence`,
          [dept.id, queueDate]
        );
        const sequenceNo = Number(seqRes.rows[0].last_sequence);

        const maxSortRes = await client.query(
          `SELECT COALESCE(MAX(queue_sort_order), 0)::bigint AS max_sort
           FROM tickets WHERE department_id = $1 AND queue_date = $2`,
          [dept.id, queueDate]
        );
        const maxSort = Number(maxSortRes.rows[0]?.max_sort ?? 0);
        const queueSortOrder = Math.max(sequenceNo, maxSort + 1);

        const ticketId = crypto.randomUUID();
        const publicCode = `OPD-${dept.token_prefix}-${String(sequenceNo).padStart(3, '0')}`;
        const accessToken = deriveTicketAccessToken(ticketId, requestId, tokenSecret);
        const accessTokenHash = hashAccessToken(accessToken);

        const insertRes = await client.query(
          `INSERT INTO tickets (
             id, public_code, department_id, patient_id, queue_date, sequence_no, queue_sort_order,
             status, visit_type, preferred_lang, avoid_stairs, access_token_hash, request_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'WAITING', $8, $9, $10, $11, $12)
           RETURNING *`,
          [
            ticketId,
            publicCode,
            dept.id,
            patientRow.id,
            queueDate,
            sequenceNo,
            queueSortOrder,
            visitType,
            preferredLang,
            Boolean(avoidStairs),
            accessTokenHash,
            requestId
          ]
        );
        const createdTicket = insertRes.rows[0];

        const dsRes = await client.query(
          'SELECT * FROM doctor_status WHERE department_id = $1',
          [dept.id]
        );
        const activeRes = await client.query(
          `SELECT * FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status IN ('CALLED', 'IN_CONSULTATION')
           LIMIT 1`,
          [dept.id, queueDate]
        );
        const aheadRes = await client.query(
          `SELECT COUNT(*)::int AS count FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status = 'WAITING' AND queue_sort_order < $3`,
          [dept.id, queueDate, createdTicket.queue_sort_order]
        );

        const baseSlip = formatOperationalSlip({
          ticket: createdTicket,
          department: dept,
          doctorStatusRow: dsRes.rows[0],
          activeTicket: activeRes.rows[0] || null,
          peopleAheadWaiting: aheadRes.rows[0]?.count ?? 0
        });

        return {
          httpStatus: 201,
          idempotentReplay: false,
          accessToken,
          ticket: {
            ...baseSlip,
            patientSummary: formatPatientSummary(patientRow)
          }
        };
      });
    } else {
      // Local advisory-locked execution path
      committedResult = await localStore.lockManager.withKeyLock(
        `req:${requestId}`,
        async () => {
          const existingTicket = localStore.ticketsByRequestId.get(requestId);
          if (existingTicket) {
            const dept = localStore.departmentsById.get(existingTicket.department_id);
            const normalizedIncoming = {
              departmentId:
                dept && departmentId === dept.slug ? dept.id : departmentId,
              visitType,
              preferredLang,
              avoidStairs,
              identityFingerprint
            };

            if (!matchesIdempotentPayload(existingTicket, normalizedIncoming)) {
              throw createDomainError(
                409,
                'IDEMPOTENCY_PAYLOAD_MISMATCH',
                'This requestId was already used with different registration parameters.'
              );
            }

            if (
              existingTicket.status !== 'WAITING' ||
              !isWithinRecoveryWindow(existingTicket.created_at, nowMs)
            ) {
              throw createDomainError(
                409,
                'IDEMPOTENCY_WINDOW_EXPIRED',
                'The 10-minute idempotent recovery window for this ticket has expired. Please look up your slip using your token code.'
              );
            }

            const recoveredToken = deriveTicketAccessToken(
              existingTicket.id,
              requestId,
              tokenSecret
            );

            const patientRow = existingTicket.patient_id
              ? localStore.patientsById.get(existingTicket.patient_id)
              : null;

            return {
              httpStatus: 200,
              idempotentReplay: true,
              accessToken: recoveredToken,
              ticket: {
                ...buildLocalSlipSnapshot(existingTicket, dept),
                patientSummary: formatPatientSummary(patientRow)
              }
            };
          }

          const dept = resolveLocalDepartment(departmentId);
          if (!dept || !dept.is_active) {
            throw createDomainError(
              404,
              'DEPARTMENT_NOT_FOUND',
              'Selected OPD department does not exist or is currently inactive.'
            );
          }

          return localStore.lockManager.withKeyLock(
            `queue:${dept.id}:${queueDate}`,
            async () => {
              const createdIso = new Date(nowMs).toISOString();

              // Upsert patient in localStore
              let patientRow = localStore.patientsByFingerprint.get(identityFingerprint);
              if (!patientRow) {
                patientRow = {
                  id: crypto.randomUUID(),
                  identity_fingerprint: identityFingerprint,
                  full_name: fullName,
                  phone_normalized: phoneNormalized,
                  phone_verified: false,
                  age_years: ageYears,
                  gender: normalizedGender,
                  hospital_reg_no: cleanRegNo,
                  created_at: createdIso,
                  updated_at: createdIso
                };
                localStore.patientsById.set(patientRow.id, patientRow);
                localStore.patientsByFingerprint.set(identityFingerprint, patientRow);
              } else {
                patientRow.gender = normalizedGender;
                if (cleanRegNo) {
                  patientRow.hospital_reg_no = cleanRegNo;
                }
                patientRow.updated_at = createdIso;
              }

              // Check for existing active ticket for (patient_id, department_id, queue_date)
              const existingActiveForPatient = Array.from(
                localStore.ticketsById.values()
              ).find(
                (t) =>
                  t.patient_id === patientRow.id &&
                  t.department_id === dept.id &&
                  t.queue_date === queueDate &&
                  ['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(t.status)
              );

              if (existingActiveForPatient) {
                throw createDomainError(
                  409,
                  'DUPLICATE_ACTIVE_TICKET',
                  `An active OPD token (${existingActiveForPatient.public_code}) already exists for this patient in ${dept.name_en} today.`,
                  {
                    existingTicket: formatDuplicateExistingTicketSummary(
                      existingActiveForPatient,
                      dept
                    )
                  }
                );
              }

              const counterKey = `${dept.id}:${queueDate}`;
              const sequenceNo = (localStore.countersByDeptDate.get(counterKey) || 0) + 1;
              localStore.countersByDeptDate.set(counterKey, sequenceNo);

              let maxSort = 0;
              for (const t of localStore.ticketsById.values()) {
                if (t.department_id === dept.id && t.queue_date === queueDate) {
                  if (t.queue_sort_order > maxSort) {
                    maxSort = t.queue_sort_order;
                  }
                }
              }
              const queueSortOrder = Math.max(sequenceNo, maxSort + 1);

              const ticketId = crypto.randomUUID();
              const publicCode = `OPD-${dept.token_prefix}-${String(sequenceNo).padStart(3, '0')}`;
              const accessToken = deriveTicketAccessToken(ticketId, requestId, tokenSecret);
              const accessTokenHash = hashAccessToken(accessToken);

              const newTicket = {
                id: ticketId,
                public_code: publicCode,
                department_id: dept.id,
                patient_id: patientRow.id,
                identity_fingerprint: identityFingerprint,
                queue_date: queueDate,
                sequence_no: sequenceNo,
                queue_sort_order: queueSortOrder,
                status: 'WAITING',
                visit_type: visitType,
                preferred_lang: preferredLang,
                avoid_stairs: Boolean(avoidStairs),
                access_token_hash: accessTokenHash,
                request_id: requestId,
                cancel_reason: null,
                requeued_count: 0,
                last_requeued_at: null,
                created_at: createdIso,
                updated_at: createdIso,
                called_at: null,
                consultation_started_at: null,
                completed_at: null
              };

              localStore.ticketsById.set(ticketId, newTicket);
              localStore.ticketsByRequestId.set(requestId, newTicket);

              return {
                httpStatus: 201,
                idempotentReplay: false,
                accessToken,
                ticket: {
                  ...buildLocalSlipSnapshot(newTicket, dept),
                  patientSummary: formatPatientSummary(patientRow)
                }
              };
            }
          );
        }
      );
    }

    // Emit realtime invalidation only after commit and only for newly created tickets
    if (!committedResult.idempotentReplay) {
      const deptId = committedResult.ticket.department.id;
      const updatedAt = committedResult.ticket.updatedAt;
      emitPostCommit((io) => {
        io.to(`queue:${deptId}`).emit('queue.updated', {
          departmentId: deptId,
          eventType: 'TICKET_CREATED',
          updatedAt
        });
        io.to('queue:all').emit('queue.updated', {
          departmentId: deptId,
          eventType: 'TICKET_CREATED',
          updatedAt
        });
        io.to('staff:all').emit('queue.updated', {
          departmentId: deptId,
          eventType: 'TICKET_CREATED',
          updatedAt
        });
      });
    }

    return committedResult;
  }

  function buildLocalSlipSnapshot(ticket, dept) {
    const ds = localStore.doctorStatusByDeptId.get(dept.id);
    const deptTickets = Array.from(localStore.ticketsById.values()).filter(
      (t) => t.department_id === dept.id && t.queue_date === ticket.queue_date
    );
    const activeTicket =
      deptTickets.find(
        (t) => t.status === 'CALLED' || t.status === 'IN_CONSULTATION'
      ) || null;
    const peopleAheadWaiting = deptTickets.filter(
      (t) => t.status === 'WAITING' && t.queue_sort_order < ticket.queue_sort_order
    ).length;

    return formatOperationalSlip({
      ticket,
      department: dept,
      doctorStatusRow: ds,
      activeTicket,
      peopleAheadWaiting
    });
  }

  /**
   * Verifies whether a presented capability token matches a ticket's stored hash
   * (used by both HTTP GET /api/tickets/:id and Socket.IO subscribe:ticket).
   */
  async function verifyTicketCapability(ticketId, presentedToken) {
    if (!ticketId || !presentedToken) {
      return false;
    }

    if (usePostgres()) {
      return runTx(async (client) => {
        const res = await client.query(
          'SELECT access_token_hash FROM tickets WHERE id::text = $1 LIMIT 1',
          [String(ticketId)]
        );
        if (res.rows.length === 0) return false;
        return verifyTicketAccessToken(presentedToken, res.rows[0].access_token_hash);
      });
    }

    const ticket = localStore.ticketsById.get(ticketId);
    if (!ticket) return false;
    return verifyTicketAccessToken(presentedToken, ticket.access_token_hash);
  }

  /**
   * Capability-protected ticket retrieval (`GET /api/tickets/:id`).
   */
  async function getTicketByCapability(ticketId, presentedToken) {
    if (usePostgres()) {
      return runTx(async (client) => {
        const res = await client.query(
          'SELECT * FROM tickets WHERE id::text = $1 LIMIT 1',
          [String(ticketId)]
        );
        if (res.rows.length === 0) {
          throw createDomainError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
        }
        const ticket = res.rows[0];
        if (!verifyTicketAccessToken(presentedToken, ticket.access_token_hash)) {
          throw createDomainError(
            403,
            'INVALID_TICKET_TOKEN',
            'The provided X-Ticket-Token does not match this ticket.'
          );
        }

        const deptRes = await client.query(
          'SELECT * FROM departments WHERE id = $1 LIMIT 1',
          [ticket.department_id]
        );
        const dept = deptRes.rows[0];
        const dsRes = await client.query(
          'SELECT * FROM doctor_status WHERE department_id = $1',
          [dept.id]
        );
        const activeRes = await client.query(
          `SELECT * FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status IN ('CALLED', 'IN_CONSULTATION')
           LIMIT 1`,
          [dept.id, ticket.queue_date]
        );
        const aheadRes = await client.query(
          `SELECT COUNT(*)::int AS count FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status = 'WAITING' AND queue_sort_order < $3`,
          [dept.id, ticket.queue_date, ticket.queue_sort_order]
        );

        let patientRow = null;
        if (ticket.patient_id) {
          const patientRes = await client.query(
            'SELECT * FROM patients WHERE id = $1 LIMIT 1',
            [ticket.patient_id]
          );
          patientRow = patientRes.rows[0] || null;
        }

        const baseSlip = formatOperationalSlip({
          ticket,
          department: dept,
          doctorStatusRow: dsRes.rows[0],
          activeTicket: activeRes.rows[0] || null,
          peopleAheadWaiting: aheadRes.rows[0]?.count ?? 0
        });

        return {
          ...baseSlip,
          patientSummary: formatPatientSummary(patientRow)
        };
      });
    }

    const ticket = localStore.ticketsById.get(ticketId);
    if (!ticket) {
      throw createDomainError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
    }
    if (!verifyTicketAccessToken(presentedToken, ticket.access_token_hash)) {
      throw createDomainError(
        403,
        'INVALID_TICKET_TOKEN',
        'The provided X-Ticket-Token does not match this ticket.'
      );
    }

    const dept = localStore.departmentsById.get(ticket.department_id);
    const patientRow = ticket.patient_id
      ? localStore.patientsById.get(ticket.patient_id)
      : null;

    return {
      ...buildLocalSlipSnapshot(ticket, dept),
      patientSummary: formatPatientSummary(patientRow)
    };
  }

  /**
   * Canonical public slip lookup (`GET /api/slips/:publicCode`).
   * Never returns capability tokens, hashes, or requestIds.
   */
  async function getPublicSlipByCode(rawPublicCode) {
    const normalizedCode = String(rawPublicCode || '')
      .trim()
      .toUpperCase();
    const queueDate = getHospitalDateIST();

    if (usePostgres()) {
      return runTx(async (client) => {
        const res = await client.query(
          'SELECT * FROM tickets WHERE UPPER(public_code) = $1 AND queue_date = $2 LIMIT 1',
          [normalizedCode, queueDate]
        );
        if (res.rows.length === 0) {
          throw createDomainError(
            404,
            'SLIP_NOT_FOUND',
            `No active OPD slip found for code ${normalizedCode} today (${queueDate}).`
          );
        }
        const ticket = res.rows[0];
        const deptRes = await client.query(
          'SELECT * FROM departments WHERE id = $1 LIMIT 1',
          [ticket.department_id]
        );
        const dept = deptRes.rows[0];
        const dsRes = await client.query(
          'SELECT * FROM doctor_status WHERE department_id = $1',
          [dept.id]
        );
        const activeRes = await client.query(
          `SELECT * FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status IN ('CALLED', 'IN_CONSULTATION')
           LIMIT 1`,
          [dept.id, ticket.queue_date]
        );
        const aheadRes = await client.query(
          `SELECT COUNT(*)::int AS count FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status = 'WAITING' AND queue_sort_order < $3`,
          [dept.id, ticket.queue_date, ticket.queue_sort_order]
        );

        return formatOperationalSlip({
          ticket,
          department: dept,
          doctorStatusRow: dsRes.rows[0],
          activeTicket: activeRes.rows[0] || null,
          peopleAheadWaiting: aheadRes.rows[0]?.count ?? 0
        });
      });
    }

    const matchingTicket = Array.from(localStore.ticketsById.values()).find(
      (t) => t.public_code.toUpperCase() === normalizedCode && t.queue_date === queueDate
    );
    if (!matchingTicket) {
      throw createDomainError(
        404,
        'SLIP_NOT_FOUND',
        `No active OPD slip found for code ${normalizedCode} today (${queueDate}).`
      );
    }

    const dept = localStore.departmentsById.get(matchingTicket.department_id);
    return buildLocalSlipSnapshot(matchingTicket, dept);
  }

  /**
   * Public department queue summary (`GET /api/queues/:departmentId/public`).
   */
  async function getPublicDepartmentQueue(departmentIdOrSlug) {
    const queueDate = getHospitalDateIST();

    if (usePostgres()) {
      return runTx(async (client) => {
        const deptRes = await client.query(
          'SELECT * FROM departments WHERE (id::text = $1 OR slug = $1) AND is_active = true LIMIT 1',
          [String(departmentIdOrSlug)]
        );
        if (deptRes.rows.length === 0) {
          throw createDomainError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
        }
        const dept = deptRes.rows[0];
        const dsRes = await client.query(
          'SELECT * FROM doctor_status WHERE department_id = $1',
          [dept.id]
        );
        const activeRes = await client.query(
          `SELECT public_code, status FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status IN ('CALLED', 'IN_CONSULTATION')
           LIMIT 1`,
          [dept.id, queueDate]
        );
        const waitingRes = await client.query(
          `SELECT COUNT(*)::int AS count FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status = 'WAITING'`,
          [dept.id, queueDate]
        );

        const ds = dsRes.rows[0] || { status: 'AVAILABLE', delay_minutes: 0 };
        const waitingCount = waitingRes.rows[0]?.count ?? 0;
        const activeRow = activeRes.rows[0] || null;
        const avgConsult = Number(dept.average_consult_minutes ?? 10);

        return {
          departmentId: dept.id,
          slug: dept.slug,
          tokenPrefix: dept.token_prefix,
          name_en: dept.name_en,
          name_hi: dept.name_hi,
          room_label: dept.room_label,
          floor_number: Number(dept.floor_number),
          queueDate,
          nowServingCode: activeRow?.public_code ?? null,
          nowServingStatus: activeRow?.status ?? null,
          waitingCount,
          estimatedWaitMinutes:
            ds.status === 'UNAVAILABLE'
              ? null
              : (activeRow ? avgConsult : 0) +
                waitingCount * avgConsult +
                Number(ds.delay_minutes ?? 0),
          etaStatus:
            ds.status === 'UNAVAILABLE'
              ? 'UNAVAILABLE_ASK_HELP_DESK'
              : ds.status === 'AVAILABLE'
                ? 'ESTIMATED'
                : 'DELAYED_ESTIMATE',
          doctorStatus: ds.status,
          delayMinutes: Number(ds.delay_minutes ?? 0),
          updatedAt: new Date().toISOString()
        };
      });
    }

    const dept = resolveLocalDepartment(departmentIdOrSlug);
    if (!dept) {
      throw createDomainError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
    }
    const ds = localStore.doctorStatusByDeptId.get(dept.id) || {
      status: 'AVAILABLE',
      delay_minutes: 0
    };
    const deptTickets = Array.from(localStore.ticketsById.values()).filter(
      (t) => t.department_id === dept.id && t.queue_date === queueDate
    );
    const activeTicket =
      deptTickets.find(
        (t) => t.status === 'CALLED' || t.status === 'IN_CONSULTATION'
      ) || null;
    const waitingCount = deptTickets.filter((t) => t.status === 'WAITING').length;
    const avgConsult = Number(dept.average_consult_minutes ?? 10);

    return {
      departmentId: dept.id,
      slug: dept.slug,
      tokenPrefix: dept.token_prefix,
      name_en: dept.name_en,
      name_hi: dept.name_hi,
      room_label: dept.room_label,
      floor_number: Number(dept.floor_number),
      queueDate,
      nowServingCode: activeTicket?.public_code ?? null,
      nowServingStatus: activeTicket?.status ?? null,
      waitingCount,
      estimatedWaitMinutes:
        ds.status === 'UNAVAILABLE'
          ? null
          : (activeTicket ? avgConsult : 0) +
            waitingCount * avgConsult +
            Number(ds.delay_minutes ?? 0),
      etaStatus:
        ds.status === 'UNAVAILABLE'
          ? 'UNAVAILABLE_ASK_HELP_DESK'
          : ds.status === 'AVAILABLE'
            ? 'ESTIMATED'
            : 'DELAYED_ESTIMATE',
      doctorStatus: ds.status,
      delayMinutes: Number(ds.delay_minutes ?? 0),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Public multi-department queue board (`GET /api/queues/public-board`).
   */
  async function getPublicBoard() {
    const { departments } = await listDepartments();
    const queues = [];
    for (const dept of departments) {
      queues.push(await getPublicDepartmentQueue(dept.id));
    }
    return {
      queueDate: getHospitalDateIST(),
      updatedAt: new Date().toISOString(),
      queues
    };
  }

  /**
   * Staff view of a department's queue (`GET /api/staff/queues/:departmentId`).
   */
  async function getStaffDepartmentQueue(departmentIdOrSlug) {
    const queueDate = getHospitalDateIST();

    if (usePostgres()) {
      return runTx(async (client) => {
        const deptRes = await client.query(
          'SELECT * FROM departments WHERE (id::text = $1 OR slug = $1) AND is_active = true LIMIT 1',
          [String(departmentIdOrSlug)]
        );
        if (deptRes.rows.length === 0) {
          throw createDomainError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
        }
        const dept = deptRes.rows[0];
        const dsRes = await client.query(
          'SELECT * FROM doctor_status WHERE department_id = $1',
          [dept.id]
        );
        const ticketsRes = await client.query(
          `SELECT id, public_code, department_id, queue_date, sequence_no, queue_sort_order,
                  status, visit_type, preferred_lang, avoid_stairs, cancel_reason,
                  requeued_count, last_requeued_at, created_at, updated_at,
                  called_at, consultation_started_at, completed_at
           FROM tickets
           WHERE department_id = $1 AND queue_date = $2
           ORDER BY queue_sort_order ASC, sequence_no ASC`,
          [dept.id, queueDate]
        );

        const allTickets = ticketsRes.rows;
        const activeTicket =
          allTickets.find(
            (t) => t.status === 'CALLED' || t.status === 'IN_CONSULTATION'
          ) || null;
        const waitingTickets = allTickets.filter((t) => t.status === 'WAITING');
        const historyTickets = allTickets
          .filter((t) =>
            ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(t.status)
          )
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );

        return {
          department: dept,
          doctorStatus: dsRes.rows[0] || { status: 'AVAILABLE', delay_minutes: 0 },
          queueDate,
          activeTicket,
          waitingTickets,
          historyTickets
        };
      });
    }

    const dept = resolveLocalDepartment(departmentIdOrSlug);
    if (!dept) {
      throw createDomainError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
    }
    const ds = localStore.doctorStatusByDeptId.get(dept.id) || {
      status: 'AVAILABLE',
      delay_minutes: 0
    };
    const allTickets = Array.from(localStore.ticketsById.values())
      .filter((t) => t.department_id === dept.id && t.queue_date === queueDate)
      .map(
        ({
          access_token_hash,
          request_id,
          patient_id,
          identity_fingerprint,
          ...safeTicket
        }) => safeTicket
      )
      .sort(
        (a, b) =>
          a.queue_sort_order - b.queue_sort_order || a.sequence_no - b.sequence_no
      );

    const activeTicket =
      allTickets.find(
        (t) => t.status === 'CALLED' || t.status === 'IN_CONSULTATION'
      ) || null;
    const waitingTickets = allTickets.filter((t) => t.status === 'WAITING');
    const historyTickets = allTickets
      .filter((t) => ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(t.status))
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

    return {
      department: dept,
      doctorStatus: ds,
      queueDate,
      activeTicket,
      waitingTickets,
      historyTickets
    };
  }

  /**
   * Atomically calls the next WAITING patient in a department (`POST /api/staff/queues/:departmentId/call-next`).
   * Serialised under the department-and-date advisory lock.
   */
  async function callNextTicket(departmentIdOrSlug) {
    const queueDate = getHospitalDateIST();
    let updatedSlip = null;

    if (usePostgres()) {
      updatedSlip = await runTx(async (client) => {
        const deptRes = await client.query(
          'SELECT * FROM departments WHERE (id::text = $1 OR slug = $1) AND is_active = true LIMIT 1',
          [String(departmentIdOrSlug)]
        );
        if (deptRes.rows.length === 0) {
          throw createDomainError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
        }
        const dept = deptRes.rows[0];

        // Acquire department-and-date advisory lock
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext('queue:' || $1 || ':' || $2))",
          [dept.id, queueDate]
        );

        const activeCheck = await client.query(
          `SELECT public_code, status FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status IN ('CALLED', 'IN_CONSULTATION')
           FOR UPDATE`,
          [dept.id, queueDate]
        );
        if (activeCheck.rows.length > 0) {
          const active = activeCheck.rows[0];
          throw createDomainError(
            409,
            'ACTIVE_TICKET_EXISTS',
            `Ticket ${active.public_code} is already ${active.status}. Complete, mark No-Show, or cancel it before calling the next patient.`
          );
        }

        const nextWaitingRes = await client.query(
          `SELECT * FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status = 'WAITING'
           ORDER BY queue_sort_order ASC, sequence_no ASC
           LIMIT 1
           FOR UPDATE`,
          [dept.id, queueDate]
        );
        if (nextWaitingRes.rows.length === 0) {
          throw createDomainError(
            409,
            'QUEUE_EMPTY',
            'No waiting patients in this department queue right now.'
          );
        }

        const target = nextWaitingRes.rows[0];
        const updateRes = await client.query(
          `UPDATE tickets
           SET status = 'CALLED', called_at = NOW(), updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [target.id]
        );
        const updatedTicket = updateRes.rows[0];
        const dsRes = await client.query(
          'SELECT * FROM doctor_status WHERE department_id = $1',
          [dept.id]
        );

        return formatOperationalSlip({
          ticket: updatedTicket,
          department: dept,
          doctorStatusRow: dsRes.rows[0],
          activeTicket: updatedTicket,
          peopleAheadWaiting: 0
        });
      });
    } else {
      const dept = resolveLocalDepartment(departmentIdOrSlug);
      if (!dept) {
        throw createDomainError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
      }

      updatedSlip = await localStore.lockManager.withKeyLock(
        `queue:${dept.id}:${queueDate}`,
        async () => {
          const deptTickets = Array.from(localStore.ticketsById.values()).filter(
            (t) => t.department_id === dept.id && t.queue_date === queueDate
          );

          const existingActive = deptTickets.find(
            (t) => t.status === 'CALLED' || t.status === 'IN_CONSULTATION'
          );
          if (existingActive) {
            throw createDomainError(
              409,
              'ACTIVE_TICKET_EXISTS',
              `Ticket ${existingActive.public_code} is already ${existingActive.status}. Complete, mark No-Show, or cancel it before calling the next patient.`
            );
          }

          const waiting = deptTickets
            .filter((t) => t.status === 'WAITING')
            .sort(
              (a, b) =>
                a.queue_sort_order - b.queue_sort_order ||
                a.sequence_no - b.sequence_no
            );

          if (waiting.length === 0) {
            throw createDomainError(
              409,
              'QUEUE_EMPTY',
              'No waiting patients in this department queue right now.'
            );
          }

          const target = waiting[0];
          const nowIso = new Date().toISOString();
          target.status = 'CALLED';
          target.called_at = nowIso;
          target.updated_at = nowIso;

          return buildLocalSlipSnapshot(target, dept);
        }
      );
    }

    const deptId = updatedSlip.department.id;
    const updatedAt = updatedSlip.updatedAt;
    emitPostCommit((io) => {
      io.to(`queue:${deptId}`).emit('queue.updated', {
        departmentId: deptId,
        ticketId: updatedSlip.id,
        eventType: 'CALL_NEXT',
        updatedAt
      });
      io.to('queue:all').emit('queue.updated', {
        departmentId: deptId,
        eventType: 'CALL_NEXT',
        updatedAt
      });
      io.to(`ticket:${updatedSlip.id}`).emit('ticket.updated', {
        ticketId: updatedSlip.id,
        departmentId: deptId,
        status: updatedSlip.status,
        updatedAt
      });
      io.to('staff:all').emit('queue.updated', {
        departmentId: deptId,
        ticketId: updatedSlip.id,
        eventType: 'CALL_NEXT',
        updatedAt
      });
    });

    return updatedSlip;
  }

  /**
   * Executes a canonical ticket state transition (`start`, `complete`, `no-show`, `cancel`, `requeue`).
   * Serialised under the department-and-date advisory lock.
   */
  async function transitionTicketStatus(ticketId, action, options = {}) {
    let updatedSlip = null;

    if (usePostgres()) {
      updatedSlip = await runTx(async (client) => {
        // Step 1: Non-locking lookup of immutable (department_id, queue_date)
        const lookupRes = await client.query(
          'SELECT id, department_id, queue_date FROM tickets WHERE id::text = $1 LIMIT 1',
          [String(ticketId)]
        );
        if (lookupRes.rows.length === 0) {
          throw createDomainError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
        }
        const { department_id: deptId, queue_date: queueDate } = lookupRes.rows[0];

        // Step 2: Acquire department-and-date advisory lock
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext('queue:' || $1 || ':' || $2))",
          [deptId, queueDate]
        );

        // Step 3: Lock ticket row FOR UPDATE
        const lockedRes = await client.query(
          'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
          [lookupRes.rows[0].id]
        );
        const ticket = lockedRes.rows[0];

        const deptRes = await client.query(
          'SELECT * FROM departments WHERE id = $1 LIMIT 1',
          [deptId]
        );
        const dept = deptRes.rows[0];

        let updateSql = '';
        let updateParams = [];

        if (action === 'start') {
          if (ticket.status !== 'CALLED') {
            throw createDomainError(
              409,
              'INVALID_STATE_TRANSITION',
              `Ticket ${ticket.public_code} is currently ${ticket.status} and cannot start consultation (must be CALLED).`
            );
          }
          updateSql = `UPDATE tickets SET status = 'IN_CONSULTATION', consultation_started_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`;
          updateParams = [ticket.id];
        } else if (action === 'complete') {
          if (ticket.status !== 'IN_CONSULTATION') {
            throw createDomainError(
              409,
              'INVALID_STATE_TRANSITION',
              `Ticket ${ticket.public_code} is currently ${ticket.status} and cannot be marked COMPLETED (must be IN_CONSULTATION).`
            );
          }
          updateSql = `UPDATE tickets SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`;
          updateParams = [ticket.id];
        } else if (action === 'no-show') {
          if (ticket.status !== 'CALLED') {
            throw createDomainError(
              409,
              'INVALID_STATE_TRANSITION',
              `Ticket ${ticket.public_code} is currently ${ticket.status} and cannot be marked NO_SHOW (must be CALLED).`
            );
          }
          updateSql = `UPDATE tickets SET status = 'NO_SHOW', updated_at = NOW() WHERE id = $1 RETURNING *`;
          updateParams = [ticket.id];
        } else if (action === 'cancel') {
          if (!['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(ticket.status)) {
            throw createDomainError(
              409,
              'INVALID_STATE_TRANSITION',
              `Ticket ${ticket.public_code} is already ${ticket.status} and cannot be cancelled.`
            );
          }
          const cancelReason = options.cancelReason || 'OTHER';
          updateSql = `UPDATE tickets SET status = 'CANCELLED', cancel_reason = $2, updated_at = NOW() WHERE id = $1 RETURNING *`;
          updateParams = [ticket.id, cancelReason];
        } else if (action === 'requeue') {
          if (!['NO_SHOW', 'CANCELLED'].includes(ticket.status)) {
            throw createDomainError(
              409,
              'INVALID_STATE_TRANSITION',
              `Ticket ${ticket.public_code} is currently ${ticket.status} and cannot be requeued (only NO_SHOW or CANCELLED tickets can be requeued).`
            );
          }
          if (ticket.patient_id) {
            const activeForPatient = await client.query(
              `SELECT * FROM tickets
               WHERE patient_id = $1 AND department_id = $2 AND queue_date = $3
                 AND status IN ('WAITING', 'CALLED', 'IN_CONSULTATION')
                 AND id <> $4
               LIMIT 1`,
              [ticket.patient_id, deptId, queueDate, ticket.id]
            );
            if (activeForPatient.rows.length > 0) {
              throw createDomainError(
                409,
                'DUPLICATE_ACTIVE_TICKET',
                `Patient already has another active ticket (${activeForPatient.rows[0].public_code}) in this department today.`
              );
            }
          }
          // TAIL_REQUEUE: Set queue_sort_order = MAX(queue_sort_order) + 1
          const maxSortRes = await client.query(
            `SELECT COALESCE(MAX(queue_sort_order), 0)::bigint AS max_sort
             FROM tickets WHERE department_id = $1 AND queue_date = $2`,
            [deptId, queueDate]
          );
          const newSortOrder = Number(maxSortRes.rows[0]?.max_sort ?? 0) + 1;

          updateSql = `UPDATE tickets
                       SET status = 'WAITING',
                           queue_sort_order = $2,
                           requeued_count = requeued_count + 1,
                           last_requeued_at = NOW(),
                           cancel_reason = NULL,
                           updated_at = NOW()
                       WHERE id = $1
                       RETURNING *`;
          updateParams = [ticket.id, newSortOrder];
        } else {
          throw createDomainError(400, 'UNKNOWN_ACTION', `Unsupported ticket action: ${action}`);
        }

        const updatedRes = await client.query(updateSql, updateParams);
        const updatedTicket = updatedRes.rows[0];

        const dsRes = await client.query(
          'SELECT * FROM doctor_status WHERE department_id = $1',
          [deptId]
        );
        const activeRes = await client.query(
          `SELECT * FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status IN ('CALLED', 'IN_CONSULTATION')
           LIMIT 1`,
          [deptId, queueDate]
        );
        const aheadRes = await client.query(
          `SELECT COUNT(*)::int AS count FROM tickets
           WHERE department_id = $1 AND queue_date = $2 AND status = 'WAITING' AND queue_sort_order < $3`,
          [deptId, queueDate, updatedTicket.queue_sort_order]
        );

        return formatOperationalSlip({
          ticket: updatedTicket,
          department: dept,
          doctorStatusRow: dsRes.rows[0],
          activeTicket: activeRes.rows[0] || null,
          peopleAheadWaiting: aheadRes.rows[0]?.count ?? 0
        });
      });
    } else {
      const targetTicket = localStore.ticketsById.get(ticketId);
      if (!targetTicket) {
        throw createDomainError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
      }
      const dept = localStore.departmentsById.get(targetTicket.department_id);
      const queueDate = targetTicket.queue_date;

      updatedSlip = await localStore.lockManager.withKeyLock(
        `queue:${dept.id}:${queueDate}`,
        async () => {
          const ticket = localStore.ticketsById.get(ticketId);
          const nowIso = new Date().toISOString();

          if (action === 'start') {
            if (ticket.status !== 'CALLED') {
              throw createDomainError(
                409,
                'INVALID_STATE_TRANSITION',
                `Ticket ${ticket.public_code} is currently ${ticket.status} and cannot start consultation (must be CALLED).`
              );
            }
            ticket.status = 'IN_CONSULTATION';
            ticket.consultation_started_at = nowIso;
            ticket.updated_at = nowIso;
          } else if (action === 'complete') {
            if (ticket.status !== 'IN_CONSULTATION') {
              throw createDomainError(
                409,
                'INVALID_STATE_TRANSITION',
                `Ticket ${ticket.public_code} is currently ${ticket.status} and cannot be marked COMPLETED (must be IN_CONSULTATION).`
              );
            }
            ticket.status = 'COMPLETED';
            ticket.completed_at = nowIso;
            ticket.updated_at = nowIso;
          } else if (action === 'no-show') {
            if (ticket.status !== 'CALLED') {
              throw createDomainError(
                409,
                'INVALID_STATE_TRANSITION',
                `Ticket ${ticket.public_code} is currently ${ticket.status} and cannot be marked NO_SHOW (must be CALLED).`
              );
            }
            ticket.status = 'NO_SHOW';
            ticket.updated_at = nowIso;
          } else if (action === 'cancel') {
            if (!['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(ticket.status)) {
              throw createDomainError(
                409,
                'INVALID_STATE_TRANSITION',
                `Ticket ${ticket.public_code} is already ${ticket.status} and cannot be cancelled.`
              );
            }
            ticket.status = 'CANCELLED';
            ticket.cancel_reason = options.cancelReason || 'OTHER';
            ticket.updated_at = nowIso;
          } else if (action === 'requeue') {
            if (!['NO_SHOW', 'CANCELLED'].includes(ticket.status)) {
              throw createDomainError(
                409,
                'INVALID_STATE_TRANSITION',
                `Ticket ${ticket.public_code} is currently ${ticket.status} and cannot be requeued (only NO_SHOW or CANCELLED tickets can be requeued).`
              );
            }
            if (ticket.patient_id) {
              const otherActive = Array.from(localStore.ticketsById.values()).find(
                (t) =>
                  t.patient_id === ticket.patient_id &&
                  t.department_id === dept.id &&
                  t.queue_date === queueDate &&
                  ['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(t.status) &&
                  t.id !== ticket.id
              );
              if (otherActive) {
                throw createDomainError(
                  409,
                  'DUPLICATE_ACTIVE_TICKET',
                  `Patient already has another active ticket (${otherActive.public_code}) in this department today.`
                );
              }
            }
            let maxSort = 0;
            for (const t of localStore.ticketsById.values()) {
              if (t.department_id === dept.id && t.queue_date === queueDate) {
                if (t.queue_sort_order > maxSort) {
                  maxSort = t.queue_sort_order;
                }
              }
            }
            ticket.status = 'WAITING';
            ticket.queue_sort_order = maxSort + 1;
            ticket.requeued_count = (ticket.requeued_count || 0) + 1;
            ticket.last_requeued_at = nowIso;
            ticket.cancel_reason = null;
            ticket.updated_at = nowIso;
          } else {
            throw createDomainError(400, 'UNKNOWN_ACTION', `Unsupported ticket action: ${action}`);
          }

          return buildLocalSlipSnapshot(ticket, dept);
        }
      );
    }

    const deptId = updatedSlip.department.id;
    const updatedAt = updatedSlip.updatedAt;
    emitPostCommit((io) => {
      io.to(`queue:${deptId}`).emit('queue.updated', {
        departmentId: deptId,
        ticketId: updatedSlip.id,
        eventType: `TICKET_${action.toUpperCase()}`,
        updatedAt
      });
      io.to('queue:all').emit('queue.updated', {
        departmentId: deptId,
        eventType: `TICKET_${action.toUpperCase()}`,
        updatedAt
      });
      io.to(`ticket:${updatedSlip.id}`).emit('ticket.updated', {
        ticketId: updatedSlip.id,
        departmentId: deptId,
        status: updatedSlip.status,
        updatedAt
      });
      io.to('staff:all').emit('queue.updated', {
        departmentId: deptId,
        ticketId: updatedSlip.id,
        eventType: `TICKET_${action.toUpperCase()}`,
        updatedAt
      });
    });

    return updatedSlip;
  }

  /**
   * Updates a department's doctor availability and delay status (`PATCH /api/staff/departments/:id/doctor-status`).
   */
  async function updateDoctorStatus(departmentIdOrSlug, { status, delayMinutes = 0, sessionId = null }) {
    let resultRow = null;

    if (usePostgres()) {
      resultRow = await runTx(async (client) => {
        const deptRes = await client.query(
          'SELECT * FROM departments WHERE (id::text = $1 OR slug = $1) AND is_active = true LIMIT 1',
          [String(departmentIdOrSlug)]
        );
        if (deptRes.rows.length === 0) {
          throw createDomainError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
        }
        const dept = deptRes.rows[0];
        const upRes = await client.query(
          `INSERT INTO doctor_status (department_id, status, delay_minutes, updated_at, updated_by_session_id)
           VALUES ($1, $2, $3, NOW(), $4)
           ON CONFLICT (department_id)
           DO UPDATE SET status = EXCLUDED.status,
                         delay_minutes = EXCLUDED.delay_minutes,
                         updated_at = NOW(),
                         updated_by_session_id = EXCLUDED.updated_by_session_id
           RETURNING *`,
          [dept.id, status, Number(delayMinutes), sessionId]
        );
        return {
          departmentId: dept.id,
          status: upRes.rows[0].status,
          delayMinutes: Number(upRes.rows[0].delay_minutes),
          updatedAt: upRes.rows[0].updated_at.toISOString()
        };
      });
    } else {
      const dept = resolveLocalDepartment(departmentIdOrSlug);
      if (!dept) {
        throw createDomainError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
      }
      const updatedAt = new Date().toISOString();
      const row = {
        department_id: dept.id,
        status,
        delay_minutes: Number(delayMinutes),
        updated_at: updatedAt,
        updated_by_session_id: sessionId
      };
      localStore.doctorStatusByDeptId.set(dept.id, row);
      resultRow = {
        departmentId: dept.id,
        status: row.status,
        delayMinutes: row.delay_minutes,
        updatedAt
      };
    }

    emitPostCommit((io) => {
      io.to(`queue:${resultRow.departmentId}`).emit('doctor.updated', resultRow);
      io.to('queue:all').emit('doctor.updated', resultRow);
      io.to('staff:all').emit('doctor.updated', resultRow);
    });

    return resultRow;
  }

  /**
   * Creates a human-assessed urgent/staff help request (`POST /api/help-requests`).
   * Works before registration (without a ticket) and never auto-jumps the queue.
   */
  async function createHelpRequest({
    ticketId = null,
    publicCode = null,
    departmentId = null,
    locationLabel = 'Hospital Premises',
    requestType = 'URGENT_ASSESSMENT_REQUEST'
  }) {
    let createdFlag = null;

    if (usePostgres()) {
      createdFlag = await runTx(async (client) => {
        let resolvedDeptId = null;
        if (departmentId) {
          const dRes = await client.query(
            'SELECT id FROM departments WHERE id::text = $1 OR slug = $1 LIMIT 1',
            [String(departmentId)]
          );
          resolvedDeptId = dRes.rows[0]?.id ?? null;
        }

        const res = await client.query(
          `INSERT INTO urgent_flags (ticket_id, department_id, public_code, location_label, request_type, status)
           VALUES ($1, $2, $3, $4, $5, 'NEW')
           RETURNING *`,
          [
            ticketId || null,
            resolvedDeptId,
            publicCode ? String(publicCode).trim().toUpperCase() : null,
            String(locationLabel || 'Hospital Premises').trim(),
            requestType
          ]
        );
        return res.rows[0];
      });
    } else {
      const dept = departmentId ? resolveLocalDepartment(departmentId) : null;
      const nowIso = new Date().toISOString();
      createdFlag = {
        id: crypto.randomUUID(),
        ticket_id: ticketId || null,
        department_id: dept?.id || null,
        public_code: publicCode ? String(publicCode).trim().toUpperCase() : null,
        location_label: String(locationLabel || 'Hospital Premises').trim(),
        request_type: requestType,
        status: 'NEW',
        created_at: nowIso,
        acknowledged_at: null,
        resolved_at: null,
        acknowledged_by: null
      };
      localStore.urgentFlagsById.set(createdFlag.id, createdFlag);
    }

    emitPostCommit((io) => {
      io.to('staff:all').emit('urgent.created', {
        id: createdFlag.id,
        requestType: createdFlag.request_type,
        locationLabel: createdFlag.location_label,
        publicCode: createdFlag.public_code,
        createdAt: createdFlag.created_at
      });
    });

    return {
      ...createdFlag,
      triageDisclaimer:
        'Staff have been notified for human assessment. If this is a life-threatening emergency, proceed immediately to Room 101 (Ground Floor Casualty) or call 108 / 112.'
    };
  }

  async function listUrgentFlags() {
    if (usePostgres()) {
      return runTx(async (client) => {
        const res = await client.query(
          `SELECT * FROM urgent_flags
           WHERE status IN ('NEW', 'ACKNOWLEDGED')
           ORDER BY created_at DESC`
        );
        return res.rows;
      });
    }

    return Array.from(localStore.urgentFlagsById.values())
      .filter((f) => f.status === 'NEW' || f.status === 'ACKNOWLEDGED')
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  async function updateUrgentFlagStatus(flagId, targetStatus, staffActor = 'staff-session') {
    let updatedFlag = null;

    if (usePostgres()) {
      updatedFlag = await runTx(async (client) => {
        const col = targetStatus === 'ACKNOWLEDGED' ? 'acknowledged_at' : 'resolved_at';
        const res = await client.query(
          `UPDATE urgent_flags
           SET status = $2, ${col} = NOW(), acknowledged_by = COALESCE(acknowledged_by, $3)
           WHERE id::text = $1
           RETURNING *`,
          [String(flagId), targetStatus, staffActor]
        );
        if (res.rows.length === 0) {
          throw createDomainError(404, 'URGENT_FLAG_NOT_FOUND', 'Urgent flag not found.');
        }
        return res.rows[0];
      });
    } else {
      const flag = localStore.urgentFlagsById.get(flagId);
      if (!flag) {
        throw createDomainError(404, 'URGENT_FLAG_NOT_FOUND', 'Urgent flag not found.');
      }
      const nowIso = new Date().toISOString();
      flag.status = targetStatus;
      if (targetStatus === 'ACKNOWLEDGED') {
        flag.acknowledged_at = nowIso;
        flag.acknowledged_by = staffActor;
      } else if (targetStatus === 'RESOLVED') {
        flag.resolved_at = nowIso;
      }
      updatedFlag = { ...flag };
    }

    emitPostCommit((io) => {
      io.to('staff:all').emit('urgent.updated', {
        id: updatedFlag.id,
        status: updatedFlag.status
      });
    });

    return updatedFlag;
  }

  return {
    isInMemory: () => !usePostgres(),
    getStorageBackend: () => (usePostgres() ? 'postgres' : 'memory'),
    setIoEmitter,
    listDepartments,
    createTicket,
    verifyTicketCapability,
    getTicketByCapability,
    getPublicSlipByCode,
    getPublicDepartmentQueue,
    getPublicBoard,
    getStaffDepartmentQueue,
    callNextTicket,
    transitionTicketStatus,
    updateDoctorStatus,
    createHelpRequest,
    listUrgentFlags,
    updateUrgentFlagStatus
  };
}

export const defaultQueueService = createQueueService();
