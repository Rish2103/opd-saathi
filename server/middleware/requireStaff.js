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

    // Same-origin verification when Origin header is present
    const originHeader = req.get('origin');
    const hostHeader = req.get('host');
    if (originHeader && hostHeader) {
      try {
        const originUrl = new URL(originHeader);
        if (originUrl.host !== hostHeader) {
          return res.status(403).json({
            error: {
              code: 'CSRF_ORIGIN_MISMATCH',
              message: 'Cross-origin staff mutation requests are forbidden.',
              requestId: req.correlationId ?? null
            }
          });
        }
      } catch {
        return res.status(403).json({
          error: {
            code: 'CSRF_ORIGIN_MISMATCH',
            message: 'Invalid Origin header on staff mutation request.',
            requestId: req.correlationId ?? null
          }
        });
      }
    }
  }

  return next();
}
