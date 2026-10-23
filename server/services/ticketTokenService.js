import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Maximum window (in milliseconds) after ticket creation during which
 * a repeated POST /api/tickets with the exact same requestId and payload
 * may deterministically recover the capability token.
 */
export const IDEMPOTENT_RECOVERY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Derives a deterministic 256-bit (64-hex-char) ticket capability token
 * using HMAC-SHA256 keyed with the dedicated TICKET_TOKEN_SECRET.
 *
 * @param {string} ticketId - UUID of the created ticket
 * @param {string} requestId - Client-generated UUID v4 idempotency key
 * @param {string} [secretOverride] - Optional secret override for unit tests
 * @returns {string} 64-character lowercase hex capability token
 */
export function deriveTicketAccessToken(ticketId, requestId, secretOverride) {
  const secret = secretOverride ?? env.ticketTokenSecret;
  if (!secret || typeof secret !== 'string' || secret.trim().length < 32) {
    throw new Error(
      'TICKET_TOKEN_SECRET must be configured with at least 32 characters of entropy to derive capability tokens.'
    );
  }
  if (!ticketId || !requestId) {
    throw new Error('Both ticketId and requestId are required to derive a ticket access token.');
  }

  return crypto
    .createHmac('sha256', Buffer.from(secret, 'utf8'))
    .update(`${String(ticketId).trim()}:${String(requestId).trim()}`, 'utf8')
    .digest('hex');
}

/**
 * Computes the SHA-256 hex digest of a raw capability token for database storage.
 * Raw capability tokens are never stored in PostgreSQL.
 *
 * @param {string} rawToken - 64-char hex capability token
 * @returns {string} 64-char lowercase hex SHA-256 digest
 */
export function hashAccessToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('A valid string token is required to compute hashAccessToken.');
  }
  return crypto.createHash('sha256').update(rawToken.trim(), 'utf8').digest('hex');
}

/**
 * Performs constant-time verification of a client-presented capability token
 * against the stored SHA-256 hex digest on the ticket row.
 *
 * @param {string} presentedToken - Raw capability token from X-Ticket-Token header
 * @param {string} storedHash - Stored 64-char hex SHA-256 digest from tickets.access_token_hash
 * @returns {boolean} True if and only if the token is valid
 */
export function verifyTicketAccessToken(presentedToken, storedHash) {
  if (
    typeof presentedToken !== 'string' ||
    typeof storedHash !== 'string' ||
    presentedToken.trim().length === 0 ||
    storedHash.trim().length !== 64
  ) {
    return false;
  }

  try {
    const computedHashHex = hashAccessToken(presentedToken.trim());
    const computedBuf = Buffer.from(computedHashHex, 'hex');
    const storedBuf = Buffer.from(storedHash.trim(), 'hex');

    if (computedBuf.length !== 32 || storedBuf.length !== 32) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Verifies that a repeated idempotent ticket creation request matches ALL
 * original request payload fields before allowing capability token recovery.
 *
 * @param {object} existingTicket - Row from tickets table (snake_case or camelCase)
 * @param {object} incomingPayload - Parsed request body
 * @returns {boolean} True if all fields match
 */
export function matchesIdempotentPayload(existingTicket, incomingPayload) {
  if (!existingTicket || !incomingPayload) {
    return false;
  }

  const existingDept = existingTicket.department_id ?? existingTicket.departmentId;
  const existingVisitType = existingTicket.visit_type ?? existingTicket.visitType;
  const existingLang = existingTicket.preferred_lang ?? existingTicket.preferredLang ?? 'en';
  const existingAvoidStairs = Boolean(
    existingTicket.avoid_stairs ?? existingTicket.avoidStairs ?? false
  );

  const incomingDept = incomingPayload.departmentId;
  const incomingVisitType = incomingPayload.visitType;
  const incomingLang = incomingPayload.preferredLang ?? 'en';
  const incomingAvoidStairs = Boolean(incomingPayload.avoidStairs ?? false);

  return (
    existingDept === incomingDept &&
    existingVisitType === incomingVisitType &&
    existingLang === incomingLang &&
    existingAvoidStairs === incomingAvoidStairs
  );
}

/**
 * Checks whether an existing ticket is still within the 10-minute idempotent
 * recovery window.
 *
 * @param {Date|string|number} createdAt - Ticket creation timestamp
 * @param {number} [nowMs] - Current timestamp in ms (defaults to Date.now())
 * @returns {boolean}
 */
export function isWithinRecoveryWindow(createdAt, nowMs = Date.now()) {
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) {
    return false;
  }
  return nowMs - createdMs <= IDEMPOTENT_RECOVERY_WINDOW_MS;
}
