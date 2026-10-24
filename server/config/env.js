import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const DEV_FALLBACK_SESSION_SECRET =
  'dev-only-session-secret-not-for-production-use-0123456789abcdef';
const DEV_FALLBACK_TICKET_SECRET =
  'dev-only-ticket-token-secret-separate-from-session-abcdef012345';
const DEV_FALLBACK_PATIENT_IDENTITY_SECRET =
  'dev-only-patient-identity-hmac-secret-separate-9876543210fedcba';
const DEV_FALLBACK_PIN_HASH = bcrypt.hashSync('1234', 8);

const FORBIDDEN_PRODUCTION_PINS = [
  '1234',
  '0000',
  '1111',
  '9999',
  '123456',
  'admin',
  'password'
];

/**
 * Checks whether a bcrypt hash corresponds to a known weak/default PIN
 * that must never be permitted in production.
 */
export function isWeakProductionPinHash(pinHash) {
  if (!pinHash || typeof pinHash !== 'string') {
    return true;
  }
  try {
    return FORBIDDEN_PRODUCTION_PINS.some((weakPin) =>
      bcrypt.compareSync(weakPin, pinHash)
    );
  } catch {
    return true;
  }
}

export function isSafeProductionSecret(secret) {
  return (
    typeof secret === 'string' &&
    secret.length >= 32 &&
    !secret.startsWith('replace-with-') &&
    !secret.startsWith('dev-only-')
  );
}

/**
 * Resolves the CA certificate PEM string from DATABASE_CA_CERT (inline PEM or base64)
 * or DATABASE_CA_CERT_PATH (file path).
 */
export function resolveCaCertificate(envObj = process.env) {
  const rawInline = (envObj.DATABASE_CA_CERT || '').trim();
  if (rawInline) {
    const unescaped = rawInline.replace(/\\n/g, '\n');
    if (unescaped.includes('-----BEGIN CERTIFICATE-----')) {
      return unescaped;
    }
    try {
      const decoded = Buffer.from(rawInline, 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN CERTIFICATE-----')) {
        return decoded;
      }
    } catch {
      // Fall through if base64 decoding fails
    }
    return unescaped;
  }

  const certPath = (envObj.DATABASE_CA_CERT_PATH || '').trim();
  if (certPath) {
    const resolvedPath = path.resolve(process.cwd(), certPath);
    if (fs.existsSync(resolvedPath)) {
      return fs.readFileSync(resolvedPath, 'utf8');
    }
  }

  return null;
}

export function loadEnvConfig(envObj = process.env) {
  const nodeEnv = envObj.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const port = Number.parseInt(envObj.PORT || '3000', 10);
  const databaseUrl = (envObj.DATABASE_URL || '').trim();
  const sslMode = (
    envObj.DATABASE_SSL_MODE || (isProduction ? 'verify-full' : 'verify-full')
  )
    .trim()
    .toLowerCase();

  const caCert = resolveCaCertificate(envObj);

  const rawSessionSecret = (envObj.SESSION_SECRET || '').trim();
  const rawTicketSecret = (envObj.TICKET_TOKEN_SECRET || '').trim();
  const ticketTokenSecretPrevious = (envObj.TICKET_TOKEN_SECRET_PREVIOUS || '').trim();
  const rawPatientIdentitySecret = (envObj.PATIENT_IDENTITY_SECRET || '').trim();
  const rawPinHash = (envObj.STAFF_DEMO_PIN_HASH || '').trim();
  const rawPlainPin = (envObj.STAFF_DEMO_PIN || '').trim();

  const sessionSecret = isProduction
    ? isSafeProductionSecret(rawSessionSecret)
      ? rawSessionSecret
      : ''
    : rawSessionSecret || DEV_FALLBACK_SESSION_SECRET;

  const ticketTokenSecret = isProduction
    ? isSafeProductionSecret(rawTicketSecret) && rawTicketSecret !== rawSessionSecret
      ? rawTicketSecret
      : ''
    : rawTicketSecret || DEV_FALLBACK_TICKET_SECRET;

  const patientIdentitySecret = isProduction
    ? isSafeProductionSecret(rawPatientIdentitySecret)
      ? rawPatientIdentitySecret
      : ticketTokenSecret
        ? `${ticketTokenSecret}:patient-identity-v1`
        : ''
    : rawPatientIdentitySecret || DEV_FALLBACK_PATIENT_IDENTITY_SECRET;

  let staffDemoPinHash = '';
  let staffPinConfigError = null;

  if (isProduction) {
    if (!rawPinHash) {
      staffPinConfigError = 'STAFF_AUTH_UNCONFIGURED';
    } else if (isWeakProductionPinHash(rawPinHash)) {
      staffPinConfigError = 'INSECURE_STAFF_PIN_CONFIG';
    } else {
      staffDemoPinHash = rawPinHash;
    }
  } else {
    staffDemoPinHash =
      rawPinHash ||
      (rawPlainPin ? bcrypt.hashSync(rawPlainPin, 8) : DEV_FALLBACK_PIN_HASH);
  }

  const demoMode = (envObj.DEMO_MODE || 'true').toLowerCase() !== 'false';
  const appOrigin = (envObj.APP_ORIGIN || envObj.PUBLIC_ORIGIN || '').trim() || null;
  const trustProxy =
    (envObj.TRUST_PROXY || '').trim().toLowerCase() === 'true' ||
    (envObj.RENDER || '').trim().toLowerCase() === 'true';

  return {
    nodeEnv,
    isProduction,
    port: Number.isNaN(port) ? 3000 : port,
    databaseUrl,
    sslMode,
    caCert,
    sessionSecret,
    ticketTokenSecret,
    ticketTokenSecretPrevious,
    patientIdentitySecret,
    staffDemoPinHash,
    staffPinConfigError,
    demoMode,
    appOrigin,
    trustProxy
  };
}

export const env = loadEnvConfig(process.env);
