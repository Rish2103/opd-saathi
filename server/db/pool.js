import pg from 'pg';
import { env, loadEnvConfig } from '../config/env.js';

const { Pool } = pg;

const SSL_QUERY_PARAMS_TO_STRIP = [
  'sslmode',
  'ssl',
  'sslcert',
  'sslkey',
  'sslrootcert',
  'sslca',
  'uselibpqcompat',
];

/**
 * Strips any SSL-related query parameters from DATABASE_URL so pg-connection-string
 * cannot override our explicit `ssl` object with `rejectUnauthorized: false` or `ssl: false`.
 */
export function sanitizeDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    for (const param of SSL_QUERY_PARAMS_TO_STRIP) {
      parsed.searchParams.delete(param);
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

/**
 * Builds the validated pg Pool configuration.
 * - Never permits `rejectUnauthorized: false` in production or when sslMode is 'verify-full'.
 * - Requires a valid CA certificate when TLS verification is active.
 * - Strips URL sslmode query parameters so they cannot override strict TLS settings.
 */
export function buildDatabasePoolConfig(customEnv = env) {
  const config = customEnv.nodeEnv ? customEnv : loadEnvConfig(customEnv);
  const sanitizedUrl = sanitizeDatabaseUrl(config.databaseUrl);

  if (!sanitizedUrl) {
    return {
      ok: false,
      reason: 'db_unconfigured',
      message: 'DATABASE_URL is not configured.',
      poolConfig: null,
    };
  }

  const requiresVerifiedTls =
    config.isProduction || config.sslMode !== 'disable';

  if (config.isProduction && config.sslMode === 'disable') {
    return {
      ok: false,
      reason: 'tls_disable_forbidden_in_production',
      message:
        'DATABASE_SSL_MODE=disable is forbidden when NODE_ENV=production. Strict CA-verified TLS is required.',
      poolConfig: null,
    };
  }

  if (requiresVerifiedTls) {
    if (
      !config.caCert ||
      !config.caCert.includes('-----BEGIN CERTIFICATE-----')
    ) {
      return {
        ok: false,
        reason: 'tls_config_missing',
        message:
          'Strict TLS verification requires DATABASE_CA_CERT or DATABASE_CA_CERT_PATH with a valid PEM CA certificate.',
        poolConfig: null,
      };
    }

    return {
      ok: true,
      reason: 'verified_tls',
      message: 'Configured with strict CA and hostname verification.',
      poolConfig: {
        connectionString: sanitizedUrl,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 8000,
        ssl: {
          rejectUnauthorized: true,
          ca: config.caCert,
        },
      },
    };
  }

  // Only reached when NODE_ENV !== 'production' AND DATABASE_SSL_MODE === 'disable'
  return {
    ok: true,
    reason: 'local_non_tls',
    message: 'Configured for local non-TLS development database.',
    poolConfig: {
      connectionString: sanitizedUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: false,
    },
  };
}

let activePool = null;
let activePoolStatus = null;

export function getPool() {
  if (activePool) {
    return { pool: activePool, status: activePoolStatus };
  }

  const evaluation = buildDatabasePoolConfig(env);
  activePoolStatus = evaluation;

  if (!evaluation.ok || !evaluation.poolConfig) {
    return { pool: null, status: evaluation };
  }

  activePool = new Pool(evaluation.poolConfig);
  activePool.on('error', (err) => {
    console.error('[DB Pool Background Error]:', err.message);
  });

  return { pool: activePool, status: evaluation };
}

export async function query(text, params = []) {
  const { pool, status } = getPool();
  if (!pool) {
    const err = new Error(status.message);
    err.code = status.reason.toUpperCase();
    err.statusCode = 503;
    throw err;
  }
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  const { pool, status } = getPool();
  if (!pool) {
    const err = new Error(status.message);
    err.code = status.reason.toUpperCase();
    err.statusCode = 503;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Executes a real PostgreSQL query to verify connectivity and return the IST hospital date.
 */
export async function checkDbHealth() {
  const { pool, status } = getPool();
  if (!pool) {
    return {
      connected: false,
      status: status.reason,
      message: status.message,
      hospitalDateIST: null,
    };
  }

  try {
    const result = await pool.query(
      "SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date::text AS hospital_date_ist"
    );
    return {
      connected: true,
      status: 'connected',
      tlsMode: status.reason,
      hospitalDateIST: result.rows[0]?.hospital_date_ist || null,
    };
  } catch (err) {
    return {
      connected: false,
      status: 'connection_failed',
      message: 'Database connectivity check failed.',
      errorCode: err.code || 'DB_ERROR',
      hospitalDateIST: null,
    };
  }
}

export async function closePool() {
  if (activePool) {
    await activePool.end();
    activePool = null;
    activePoolStatus = null;
  }
}
