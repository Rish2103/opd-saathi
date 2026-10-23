import rateLimit from 'express-rate-limit';
import {
  derivePatientIdentityFingerprint,
  normalizePatientNameForIdentity,
  normalizePatientPhone
} from '../services/ticketTokenService.js';

function createJsonRateLimiter({ windowMs, max, code, message, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    validate: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code,
          message,
          requestId: req.correlationId ?? null
        }
      });
    }
  });
}

/**
 * Derives a composite rate-limiting key combining client IP and normalized
 * patient identity/phone so repeated abuse for the same patient identity is
 * throttled while allowing multiple patients on a shared hospital network.
 */
export function deriveTicketRateLimitKey(req) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
  const normalizedPhone = normalizePatientPhone(req.body?.phone);
  const normalizedName = normalizePatientNameForIdentity(req.body?.patientName);
  const rawAge = req.body?.age;

  if (
    normalizedPhone &&
    normalizedName &&
    rawAge !== undefined &&
    rawAge !== null &&
    rawAge !== ''
  ) {
    try {
      const fp = derivePatientIdentityFingerprint({
        phoneNormalized: normalizedPhone,
        fullName: normalizedName,
        ageYears: Number(rawAge)
      });
      return `${ip}:id:${fp.slice(0, 24)}`;
    } catch {
      return `${ip}:ph:${normalizedPhone}`;
    }
  }

  if (normalizedPhone) {
    return `${ip}:ph:${normalizedPhone}`;
  }

  return `${ip}:anon`;
}

/**
 * Creates a two-tier composite limiter for POST /api/tickets:
 * 1) Per-IP shared-network safety cap (default 60 / 5m)
 * 2) Per-(IP + patient identity/mobile) cap (default 15 / 5m)
 */
export function createCompositeTicketLimiter({
  windowMs = 5 * 60 * 1000,
  maxPerIdentity = 15,
  maxPerIp = Math.max(maxPerIdentity * 4, 60),
  code = 'RATE_LIMIT_EXCEEDED',
  message = 'Too many registration requests from this device. Please wait a moment or ask the Help Desk.'
} = {}) {
  const ipSafetyLimiter = createJsonRateLimiter({
    windowMs,
    max: maxPerIp,
    code,
    message
  });

  const identityLimiter = createJsonRateLimiter({
    windowMs,
    max: maxPerIdentity,
    code,
    message,
    keyGenerator: deriveTicketRateLimitKey
  });

  return (req, res, next) => {
    ipSafetyLimiter(req, res, (err) => {
      if (err || res.headersSent) return next(err);
      identityLimiter(req, res, next);
    });
  };
}

/**
 * POST /api/tickets — Composite limiter (8 per 5m per IP+identity, 60 per 5m shared IP safety cap)
 */
export const ticketCreationLimiter = createCompositeTicketLimiter({
  windowMs: 5 * 60 * 1000,
  maxPerIdentity: 8,
  maxPerIp: 60,
  code: 'RATE_LIMIT_EXCEEDED',
  message: 'Too many registration requests from this device. Please wait a moment or ask the Help Desk.'
});

/**
 * GET /api/slips/:publicCode — 30 requests per 5 minutes per IP
 */
export const slipLookupLimiter = createJsonRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  code: 'RATE_LIMIT_EXCEEDED',
  message: 'Too many token lookup requests. Please wait a few minutes before trying again.'
});

/**
 * POST /api/help-requests — 5 requests per 10 minutes per IP
 */
export const helpRequestLimiter = createJsonRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  code: 'RATE_LIMIT_EXCEEDED',
  message: 'Urgent assistance request limit reached. Please approach the nearest staff counter or call 108/112 immediately.'
});

/**
 * POST /api/staff/session — 5 attempts per 15 minutes per IP
 */
export const staffPinLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  code: 'PIN_RATE_LIMIT_EXCEEDED',
  message: 'Too many failed staff PIN attempts. Please wait 15 minutes before retrying.'
});

export { createJsonRateLimiter };
