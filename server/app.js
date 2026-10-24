import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import connectPgSimple from 'connect-pg-simple';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { z } from 'zod';
import { env, isWeakProductionPinHash } from './config/env.js';
import { checkDbHealth, getPool } from './db/pool.js';
import { apiNotFoundHandler, errorHandler } from './middleware/errorHandler.js';
import {
  helpRequestLimiter,
  slipLookupLimiter,
  staffPinLimiter,
  ticketCreationLimiter
} from './middleware/rateLimiters.js';
import { requestLogger } from './middleware/requestLogger.js';
import { requireStaff } from './middleware/requireStaff.js';
import { requireTicketToken } from './middleware/requireTicketToken.js';
import { createDomainError, defaultQueueService } from './services/queueService.js';
import { normalizePatientPhone } from './services/ticketTokenService.js';
import {
  findAccessibleRoute,
  getAllHospitalNodes
} from '../shared/navigation/pathfinder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const PgSessionStore = connectPgSimple(session);

// Zod validation schemas per docs/API.md
const createTicketSchema = z.object({
  requestId: z.string().uuid('requestId must be a valid UUID v4'),
  departmentId: z.string().min(1, 'departmentId is required').max(64),
  patientName: z
    .string({ required_error: 'Patient full name is required' })
    .trim()
    .min(2, 'Patient full name must be at least 2 characters')
    .max(120, 'Patient full name must not exceed 120 characters'),
  phone: z
    .string({ required_error: 'Mobile number is required' })
    .trim()
    .refine(
      (val) => normalizePatientPhone(val) !== null,
      'Please enter a valid 10-digit Indian mobile number'
    ),
  age: z.coerce
    .number({
      required_error: 'Patient age is required',
      invalid_type_error: 'Patient age must be a valid number'
    })
    .int('Patient age must be a whole number')
    .min(0, 'Patient age must be between 0 and 120')
    .max(120, 'Patient age must be between 0 and 120'),
  gender: z
    .enum(['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
    .optional()
    .default('PREFER_NOT_TO_SAY'),
  registrationNumber: z
    .string()
    .trim()
    .max(64, 'Hospital registration number must not exceed 64 characters')
    .optional()
    .nullable()
    .default(null),
  visitType: z.enum(['FIRST_VISIT', 'FOLLOW_UP']).default('FIRST_VISIT'),
  preferredLang: z.enum(['en', 'hi', 'ta']).default('hi'),
  avoidStairs: z.boolean().default(true)
});

const staffLoginSchema = z.object({
  pin: z.string().min(4, 'PIN must be at least 4 digits').max(16)
});

const cancelTicketSchema = z.object({
  cancelReason: z
    .enum(['PATIENT_LEFT', 'WRONG_DEPARTMENT', 'DUPLICATE', 'OTHER'])
    .default('OTHER')
});

const updateDoctorStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'ON_BREAK', 'DELAYED', 'UNAVAILABLE']),
  delayMinutes: z.number().int().min(0).max(240).default(0)
});

const createHelpRequestSchema = z.object({
  ticketId: z.string().uuid().optional().nullable(),
  publicCode: z.string().max(32).optional().nullable(),
  departmentId: z.string().max(64).optional().nullable(),
  locationLabel: z.string().min(1).max(120).default('Hospital Premises'),
  requestType: z
    .enum(['STAFF_HELP', 'URGENT_ASSESSMENT_REQUEST'])
    .default('URGENT_ASSESSMENT_REQUEST')
});

/**
 * Creates the shared express-session middleware instance.
 */
export function createSessionMiddleware(customEnv = env) {
  const { pool } = getPool();
  const store = pool
    ? new PgSessionStore({
        pool,
        tableName: 'staff_sessions',
        createTableIfMissing: false
      })
    : new session.MemoryStore();

  return session({
    name: 'opd_staff_sid',
    secret: customEnv.sessionSecret || 'dev-fallback-session-secret-opd-saathi-2026',
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      secure: customEnv.isProduction,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    }
  });
}

/**
 * Creates and configures the Express application instance.
 *
 * @param {object} [options]
 * @param {Function} [options.dbHealthCheck]
 * @param {object} [options.queueService]
 * @param {Function} [options.sessionMiddleware]
 * @param {string} [options.staffPinHash]
 * @param {boolean} [options.disableRateLimits]
 * @returns {import('express').Express}
 */
export function createApp(options = {}) {
  const app = express();
  const runHealthCheck = options.dbHealthCheck ?? checkDbHealth;
  const queueService = options.queueService ?? defaultQueueService;
  const isProduction = options.isProduction ?? env.isProduction;
  const appOrigin =
    options.appOrigin !== undefined ? options.appOrigin : env.appOrigin;
  const trustProxy =
    options.trustProxy !== undefined ? options.trustProxy : env.trustProxy;
  const runtimeEnv = {
    ...env,
    isProduction,
    appOrigin,
    trustProxy,
    port: options.port ?? env.port
  };
  const sessionMiddleware =
    options.sessionMiddleware ?? createSessionMiddleware(runtimeEnv);
  const staffPinHash =
    options.staffPinHash !== undefined ? options.staffPinHash : env.staffDemoPinHash;
  const skipLimits = Boolean(options.disableRateLimits);

  const maybeLimit = (limiter) =>
    skipLimits ? (_req, _res, next) => next() : limiter;

  if (trustProxy) {
    app.set('trust proxy', 1);
  }
  app.locals.runtimeEnv = runtimeEnv;
  app.locals.sessionMiddleware = sessionMiddleware;
  app.locals.queueService = queueService;

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  app.use(express.json({ limit: '32kb' }));
  app.use(requestLogger);
  app.use(sessionMiddleware);

  // ---------------------------------------------------------------------------
  // 1. Health & Public Metadata Endpoints
  // ---------------------------------------------------------------------------
  app.get('/api/health', async (_req, res) => {
    const dbResult = await runHealthCheck();
    const isHealthy = dbResult.connected === true;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      service: 'opd-saathi',
      phase: 'phase-1-core-flow',
      timestamp: new Date().toISOString(),
      db: {
        connected: isHealthy,
        status: dbResult.status ?? (isHealthy ? 'connected' : 'unavailable'),
        hospitalDateIST: dbResult.hospitalDateIST ?? null,
        tlsMode: dbResult.tlsMode ?? null,
        message: isHealthy
          ? null
          : dbResult.message ?? 'Database connectivity unavailable.'
      }
    });
  });

  app.get('/api/departments', async (_req, res, next) => {
    try {
      const data = await queueService.listDepartments();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/queues/public-board', async (_req, res, next) => {
    try {
      const board = await queueService.getPublicBoard();
      res.status(200).json(board);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/queues/:departmentId/public', async (req, res, next) => {
    try {
      const summary = await queueService.getPublicDepartmentQueue(
        req.params.departmentId
      );
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Patient Ticket Creation, Capability Access & Public Slip Lookup
  // ---------------------------------------------------------------------------
  app.post(
    '/api/tickets',
    maybeLimit(ticketCreationLimiter),
    async (req, res, next) => {
      try {
        const parsed = createTicketSchema.parse(req.body || {});
        const result = await queueService.createTicket(parsed);
        res.status(result.httpStatus).json({
          ticket: result.ticket,
          accessToken: result.accessToken,
          idempotentReplay: result.idempotentReplay
        });
      } catch (err) {
        next(err);
      }
    }
  );

  app.get('/api/tickets/:id', requireTicketToken, async (req, res, next) => {
    try {
      const slip = await queueService.getTicketByCapability(
        req.params.id,
        req.ticketAccessToken
      );
      res.status(200).json({ ticket: slip });
    } catch (err) {
      next(err);
    }
  });

  app.post(
    '/api/tickets/:id/cancel',
    requireTicketToken,
    async (req, res, next) => {
      try {
        // Verify capability token first (throws 404 or 403 on mismatch)
        await queueService.getTicketByCapability(
          req.params.id,
          req.ticketAccessToken
        );
        const parsed = cancelTicketSchema.parse(req.body || {});
        const updated = await queueService.transitionTicketStatus(
          req.params.id,
          'cancel',
          { cancelReason: parsed.cancelReason || 'PATIENT_LEFT' }
        );
        res.status(200).json({ ticket: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * Canonical public slip lookup endpoint (`GET /api/slips/:publicCode`).
   * Rate-limited; returns non-sensitive operational slip, queue position, ETA, and route.
   * Never exposes accessToken, access_token_hash, or requestId.
   */
  app.get(
    '/api/slips/:publicCode',
    maybeLimit(slipLookupLimiter),
    async (req, res, next) => {
      try {
        const rawCode = String(req.params.publicCode || '').trim();
        if (!/^OPD-[A-Z]{3}-\d{3,}$/i.test(rawCode)) {
          return res.status(400).json({
            error: {
              code: 'INVALID_PUBLIC_CODE',
              message:
                'Invalid token code format. Expected format like OPD-GEN-001.',
              requestId: req.correlationId ?? null
            }
          });
        }
        const slip = await queueService.getPublicSlipByCode(rawCode);
        return res.status(200).json({ slip });
      } catch (err) {
        return next(err);
      }
    }
  );

  // ---------------------------------------------------------------------------
  // 3. Hospital Navigation & Pre-Registration Emergency / Staff Help Requests
  // ---------------------------------------------------------------------------
  app.get('/api/routes/nodes', (_req, res) => {
    res.status(200).json({ nodes: getAllHospitalNodes() });
  });

  app.get('/api/routes', (req, res) => {
    const fromNodeId = String(req.query.from || 'registration_desk').trim();
    const toNodeId = String(req.query.to || '').trim();
    const avoidStairs =
      String(req.query.avoidStairs ?? 'true').toLowerCase() !== 'false';

    if (!toNodeId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter "to" (destination node ID) is required.',
          requestId: req.correlationId ?? null
        }
      });
    }

    const route = findAccessibleRoute({ fromNodeId, toNodeId, avoidStairs });
    return res.status(route.found ? 200 : 404).json({ route });
  });

  app.post(
    '/api/help-requests',
    maybeLimit(helpRequestLimiter),
    async (req, res, next) => {
      try {
        const parsed = createHelpRequestSchema.parse(req.body || {});
        const flag = await queueService.createHelpRequest(parsed);
        res.status(201).json({ helpRequest: flag });
      } catch (err) {
        next(err);
      }
    }
  );

  // ---------------------------------------------------------------------------
  // 4. Staff Session Auth & Queue Control Endpoints
  // ---------------------------------------------------------------------------
  app.get('/api/staff/session', (req, res) => {
    const authenticated = Boolean(req.session?.isStaff === true);
    res.status(200).json({
      authenticated,
      loginAt: req.session?.loginAt ?? null
    });
  });

  app.post(
    '/api/staff/session',
    maybeLimit(staffPinLimiter),
    async (req, res, next) => {
      try {
        const { pin } = staffLoginSchema.parse(req.body || {});
        if (!staffPinHash) {
          return res.status(503).json({
            error: {
              code: 'STAFF_AUTH_UNCONFIGURED',
              message: 'STAFF_DEMO_PIN_HASH is not configured on the server.',
              requestId: req.correlationId ?? null
            }
          });
        }

        if (isProduction && isWeakProductionPinHash(staffPinHash)) {
          return res.status(503).json({
            error: {
              code: 'INSECURE_STAFF_PIN_CONFIG',
              message:
                'Production staff authentication refused: STAFF_DEMO_PIN_HASH uses a forbidden weak or default PIN.',
              requestId: req.correlationId ?? null
            }
          });
        }

        const isValid = await bcrypt.compare(pin, staffPinHash);
        if (!isValid) {
          return res.status(401).json({
            error: {
              code: 'INVALID_STAFF_PIN',
              message: 'Incorrect staff PIN. Please try again.',
              requestId: req.correlationId ?? null
            }
          });
        }

        return req.session.regenerate((regenErr) => {
          if (regenErr) {
            return next(regenErr);
          }
          req.session.isStaff = true;
          req.session.loginAt = new Date().toISOString();
          return req.session.save((saveErr) => {
            if (saveErr) {
              return next(saveErr);
            }
            return res.status(200).json({
              authenticated: true,
              loginAt: req.session.loginAt
            });
          });
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  app.delete('/api/staff/session', requireStaff, (req, res, next) => {
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie('opd_staff_sid');
      return res.status(200).json({ authenticated: false });
    });
  });

  app.get(
    '/api/staff/queues/:departmentId',
    requireStaff,
    async (req, res, next) => {
      try {
        const data = await queueService.getStaffDepartmentQueue(
          req.params.departmentId
        );
        res.status(200).json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/staff/queues/:departmentId/call-next',
    requireStaff,
    async (req, res, next) => {
      try {
        const ticket = await queueService.callNextTicket(
          req.params.departmentId
        );
        res.status(200).json({ ticket });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/staff/tickets/:id/start',
    requireStaff,
    async (req, res, next) => {
      try {
        const ticket = await queueService.transitionTicketStatus(
          req.params.id,
          'start'
        );
        res.status(200).json({ ticket });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/staff/tickets/:id/complete',
    requireStaff,
    async (req, res, next) => {
      try {
        const ticket = await queueService.transitionTicketStatus(
          req.params.id,
          'complete'
        );
        res.status(200).json({ ticket });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/staff/tickets/:id/no-show',
    requireStaff,
    async (req, res, next) => {
      try {
        const ticket = await queueService.transitionTicketStatus(
          req.params.id,
          'no-show'
        );
        res.status(200).json({ ticket });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/staff/tickets/:id/cancel',
    requireStaff,
    async (req, res, next) => {
      try {
        const parsed = cancelTicketSchema.parse(req.body || {});
        const ticket = await queueService.transitionTicketStatus(
          req.params.id,
          'cancel',
          parsed
        );
        res.status(200).json({ ticket });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/staff/tickets/:id/requeue',
    requireStaff,
    async (req, res, next) => {
      try {
        const ticket = await queueService.transitionTicketStatus(
          req.params.id,
          'requeue'
        );
        res.status(200).json({ ticket });
      } catch (err) {
        next(err);
      }
    }
  );

  app.patch(
    '/api/staff/departments/:id/doctor-status',
    requireStaff,
    async (req, res, next) => {
      try {
        const parsed = updateDoctorStatusSchema.parse(req.body || {});
        const updated = await queueService.updateDoctorStatus(req.params.id, {
          ...parsed,
          sessionId: req.sessionID
        });
        res.status(200).json({ doctorStatus: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.get('/api/staff/urgent-flags', requireStaff, async (_req, res, next) => {
    try {
      const flags = await queueService.listUrgentFlags();
      res.status(200).json({ urgentFlags: flags });
    } catch (err) {
      next(err);
    }
  });

  app.post(
    '/api/staff/urgent-flags/:id/acknowledge',
    requireStaff,
    async (req, res, next) => {
      try {
        const flag = await queueService.updateUrgentFlagStatus(
          req.params.id,
          'ACKNOWLEDGED',
          req.sessionID
        );
        res.status(200).json({ urgentFlag: flag });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/staff/urgent-flags/:id/resolve',
    requireStaff,
    async (req, res, next) => {
      try {
        const flag = await queueService.updateUrgentFlagStatus(
          req.params.id,
          'RESOLVED',
          req.sessionID
        );
        res.status(200).json({ urgentFlag: flag });
      } catch (err) {
        next(err);
      }
    }
  );

  // Strict JSON 404 for any unmatched /api/* route
  app.use('/api', apiNotFoundHandler);

  // Serve compiled Vite static assets in single-origin mode if dist/ exists
  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

export const app = createApp();
