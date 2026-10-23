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

  const existingFingerprint =
    existingTicket.identity_fingerprint ?? existingTicket.identityFingerprint ?? null;
  const incomingFingerprint = incomingPayload.identityFingerprint ?? null;

  if (existingFingerprint && incomingFingerprint && existingFingerprint !== incomingFingerprint) {
    return false;
  }

  return (
    existingDept === incomingDept &&
    existingVisitType === incomingVisitType &&
    existingLang === incomingLang &&
    existingAvoidStairs === incomingAvoidStairs
  );
}

/**
 * Normalizes a raw Indian mobile phone number into its canonical 10-digit form.
 * Strips spaces, dashes, parentheses, dots, and leading +91 / 0091 / 91 / 0 prefixes.
 * Returns null if the number is not a valid 10-digit Indian mobile number (^[6-9]\d{9}$).
 *
 * @param {string} rawPhone
 * @returns {string | null}
 */
export function normalizePatientPhone(rawPhone) {
  if (typeof rawPhone !== 'string' && typeof rawPhone !== 'number') {
    return null;
  }
  let cleaned = String(rawPhone)
    .trim()
    .replace(/[\s\-().]/g, '');

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0091')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Normalizes a patient's full name for display/storage by trimming and collapsing
 * internal whitespace.
 *
 * @param {string} rawName
 * @returns {string}
 */
export function normalizePatientName(rawName) {
  if (typeof rawName !== 'string') {
    return '';
  }
  return rawName.trim().replace(/\s+/g, ' ');
}

/**
 * Normalizes a patient's full name for deterministic identity comparison
 * (trimmed, collapsed whitespace, lowercase).
 *
 * @param {string} rawName
 * @returns {string}
 */
export function normalizePatientNameForIdentity(rawName) {
  return normalizePatientName(rawName).toLowerCase();
}

/**
 * Derives a keyed HMAC-SHA256 fingerprint for a patient's normalized identity
 * (phone_normalized + lowercase full_name + age_years) using PATIENT_IDENTITY_SECRET.
 *
 * @param {{ phoneNormalized: string, fullName: string, ageYears: number }} identity
 * @param {string} [secretOverride]
 * @returns {string} 64-character lowercase hex HMAC-SHA256 digest
 */
export function derivePatientIdentityFingerprint(
  { phoneNormalized, fullName, ageYears },
  secretOverride
) {
  const secret =
    secretOverride ||
    env.patientIdentitySecret ||
    `${env.ticketTokenSecret}:patient-identity-v1`;

  if (!secret || typeof secret !== 'string' || secret.trim().length < 16) {
    throw new Error('PATIENT_IDENTITY_SECRET must be configured to derive patient fingerprints.');
  }

  const cleanPhone = normalizePatientPhone(phoneNormalized);
  const cleanName = normalizePatientNameForIdentity(fullName);
  const cleanAge = Number.parseInt(String(ageYears), 10);

  if (!cleanPhone || !cleanName || Number.isNaN(cleanAge)) {
    throw new Error('Valid phoneNormalized, fullName, and ageYears are required for fingerprinting.');
  }

  return crypto
    .createHmac('sha256', Buffer.from(secret, 'utf8'))
    .update(`v1:${cleanPhone}:${cleanName}:${cleanAge}`, 'utf8')
    .digest('hex');
}

/**
 * Masks a 10-digit normalized phone number for protected capability display (e.g. ******3210).
 *
 * @param {string} phoneNormalized
 * @returns {string}
 */
export function maskPatientPhone(phoneNormalized) {
  const clean = normalizePatientPhone(phoneNormalized);
  if (!clean) {
    return '**********';
  }
  return `******${clean.slice(-4)}`;
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
