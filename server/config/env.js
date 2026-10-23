import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const DEV_FALLBACK_SESSION_SECRET =
  'dev-only-session-secret-not-for-production-use-0123456789abcdef';
const DEV_FALLBACK_TICKET_SECRET =
  'dev-only-ticket-token-secret-separate-from-session-abcdef012345';
const DEV_FALLBACK_PIN_HASH = bcrypt.hashSync('1234', 8);

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
  const rawPinHash = (envObj.STAFF_DEMO_PIN_HASH || '').trim();

  const sessionSecret = rawSessionSecret || (isProduction ? '' : DEV_FALLBACK_SESSION_SECRET);
  const ticketTokenSecret = rawTicketSecret || (isProduction ? '' : DEV_FALLBACK_TICKET_SECRET);
  const staffDemoPinHash = rawPinHash || (isProduction ? '' : DEV_FALLBACK_PIN_HASH);
  const demoMode = (envObj.DEMO_MODE || 'true').toLowerCase() !== 'false';

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
    staffDemoPinHash,
    demoMode
  };
}

export const env = loadEnvConfig(process.env);
