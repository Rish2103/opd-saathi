/**
 * Middleware that extracts and validates the presence/format of X-Ticket-Token
 * on capability-protected ticket endpoints (`GET /api/tickets/:id`).
 */
export function requireTicketToken(req, res, next) {
  const token = req.get('X-Ticket-Token');

  if (!token || typeof token !== 'string' || !/^[0-9a-f]{64}$/i.test(token.trim())) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TICKET_TOKEN',
        message: 'A valid X-Ticket-Token capability header is required to access this ticket resource.',
        requestId: req.correlationId ?? null
      }
    });
  }

  req.ticketAccessToken = token.trim().toLowerCase();
  return next();
}
