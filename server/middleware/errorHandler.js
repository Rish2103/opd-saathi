/**
 * Strict JSON 404 handler for any unmatched /api/* route so API consumers
 * never receive the SPA index.html fallback by mistake.
 */
export function apiNotFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'API_NOT_FOUND',
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      requestId: req.correlationId ?? null
    }
  });
}

/**
 * Centralized Express error handler returning structured JSON error payloads
 * without leaking stack traces or database internals in production.
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const code = err.code && typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';
  const isProd = process.env.NODE_ENV === 'production';

  const message =
    statusCode === 500 && isProd
      ? 'An unexpected server error occurred.'
      : err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: req.correlationId ?? null
    }
  });
}
