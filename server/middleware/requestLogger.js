import crypto from 'node:crypto';

const SENSITIVE_KEYS = new Set([
  'pin',
  'password',
  'requestid',
  'request_id',
  'accesstoken',
  'access_token',
  'access_token_hash',
  'x-ticket-token',
  'tickettoken',
  'authorization',
  'cookie',
  'set-cookie',
  'session_secret',
  'ticket_token_secret'
]);

/**
 * Recursively clones and redacts sensitive fields from objects before logging.
 * Never mutates the input object.
 *
 * @param {unknown} input
 * @returns {unknown}
 */
export function redactSensitiveData(input) {
  if (input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item));
  }

  if (typeof input === 'object') {
    const output = {};
    for (const [key, value] of Object.entries(input)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = redactSensitiveData(value);
      }
    }
    return output;
  }

  return input;
}

/**
 * Express middleware that attaches a unique X-Request-Id header to every request
 * and logs structured request metadata with sensitive values redacted.
 */
export function requestLogger(req, res, next) {
  const correlationId = crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Request-Id', correlationId);

  const startedAt = Date.now();

  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    const durationMs = Date.now() - startedAt;
    const logEntry = {
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs
    };
    console.log(JSON.stringify(logEntry));
  });

  next();
}
