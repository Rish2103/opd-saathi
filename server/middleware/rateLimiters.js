import rateLimit from 'express-rate-limit';

function createJsonRateLimiter({ windowMs, max, code, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
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
 * POST /api/tickets — 15 requests per 5 minutes per IP
 */
export const ticketCreationLimiter = createJsonRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 15,
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
