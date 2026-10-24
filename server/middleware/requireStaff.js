import { env } from '../config/env.js';

/**
 * Validates that a state-changing staff request originates from a trusted same-origin
 * or explicitly permitted local development origin.
 *
 * Security guarantees:
 * 1. Rejects missing, 'null', or malformed Origin headers on state-changing requests.
 * 2. Compares complete origins (scheme + hostname + port), never hostnames alone.
 * 3. Never trusts client-supplied X-Forwarded-Host unless trustProxy is explicitly enabled
 *    and no canonical APP_ORIGIN overrides it.
 * 4. Applies the local development loopback allowlist strictly when isProduction === false.
 */
export function isTrustedStaffOrigin(req, runtimeEnv = env) {
  const originHeader = req.get('origin');
  if (!originHeader || originHeader === 'null') {
    return false;
  }

  let parsedOrigin;
  try {
    parsedOrigin = new URL(originHeader);
  } catch {
    return false;
  }

  if (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') {
    return false;
  }

  const requestOrigin = parsedOrigin.origin;
  const allowedOrigins = new Set();

  // 1. Canonical configured application origin (highest priority in production)
  if (runtimeEnv.appOrigin) {
    try {
      allowedOrigins.add(new URL(runtimeEnv.appOrigin).origin);
    } catch {
      // Ignore malformed configured origin
    }
  } else if (runtimeEnv.trustProxy) {
    // 2. Trusted reverse-proxy derived origin ONLY when trustProxy is explicitly enabled
    const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
    const forwardedProto =
      req.get('x-forwarded-proto')?.split(',')[0]?.trim() || req.protocol;
    const effectiveHost = forwardedHost || req.get('host');
    if (
      effectiveHost &&
      (forwardedProto === 'http' || forwardedProto === 'https')
    ) {
      try {
        allowedOrigins.add(new URL(`${forwardedProto}://${effectiveHost}`).origin);
      } catch {
        // Ignore malformed host header
      }
    }
  } else {
    // 3. Direct host header when not behind a trusted proxy and no canonical APP_ORIGIN is set
    const directHost = req.get('host');
    const directProto = req.protocol === 'https' ? 'https' : 'http';
    if (directHost) {
      try {
        allowedOrigins.add(new URL(`${directProto}://${directHost}`).origin);
      } catch {
        // Ignore malformed host header
      }
    }
  }

  // 4. Explicit, narrowly scoped development-origin policy (never active in production)
  if (!runtimeEnv.isProduction) {
    const port = runtimeEnv.port || 3000;
    allowedOrigins.add('http://localhost:5173');
    allowedOrigins.add('http://127.0.0.1:5173');
    allowedOrigins.add('http://localhost:4173');
    allowedOrigins.add('http://127.0.0.1:4173');
    allowedOrigins.add(`http://localhost:${port}`);
    allowedOrigins.add(`http://127.0.0.1:${port}`);
    const directHost = req.get('host');
    if (
      directHost &&
      (directHost.startsWith('127.0.0.1:') || directHost.startsWith('localhost:'))
    ) {
      try {
        allowedOrigins.add(new URL(`http://${directHost}`).origin);
      } catch {
        // Ignore malformed host
      }
    }
  }

  return allowedOrigins.has(requestOrigin);
}

/**
 * Enforces server-side staff session authentication and same-origin CSRF checks
 * for all protected /api/staff/* endpoints.
 */
export function requireStaff(req, res, next) {
  if (!req.session || req.session.isStaff !== true) {
    return res.status(401).json({
      error: {
        code: 'STAFF_AUTH_REQUIRED',
        message: 'Active staff session required. Please log in with the staff PIN.',
        requestId: req.correlationId ?? null
      }
    });
  }

  const method = req.method.toUpperCase();
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    // For body-carrying mutations, require application/json when body is present or expected
    if (method !== 'DELETE') {
      const contentType = req.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        return res.status(415).json({
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Staff mutation requests must use Content-Type: application/json.',
            requestId: req.correlationId ?? null
          }
        });
      }
    }

    const runtimeEnv = req.app?.locals?.runtimeEnv || env;
    if (!isTrustedStaffOrigin(req, runtimeEnv)) {
      return res.status(403).json({
        error: {
          code: 'CSRF_ORIGIN_MISMATCH',
          message: 'Cross-origin or untrusted staff mutation requests are forbidden.',
          requestId: req.correlationId ?? null
        }
      });
    }
  }

  return next();
}
