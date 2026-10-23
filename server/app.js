import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { checkDbHealth, query } from './db/pool.js';
import { SEED_DEPARTMENTS } from './db/seed.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiNotFoundHandler, errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

/**
 * Creates and configures the Express application instance.
 *
 * @param {object} [options]
 * @param {Function} [options.dbHealthCheck] - Custom health check function for testing
 * @returns {import('express').Express}
 */
export function createApp(options = {}) {
  const app = express();
  const runHealthCheck = options.dbHealthCheck ?? checkDbHealth;

  // Required on Render behind its load balancer for accurate client IP & secure cookies
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  app.use(express.json({ limit: '32kb' }));
  app.use(requestLogger);

  /**
   * GET /api/health
   * Executes a live PostgreSQL query and returns 200 when connected or 503 when degraded.
   * Never exposes secrets or raw connection strings.
   */
  app.get('/api/health', async (_req, res) => {
    const dbResult = await runHealthCheck();
    const isHealthy = dbResult.connected === true;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      service: 'opd-saathi',
      phase: 'phase-0-foundation',
      timestamp: new Date().toISOString(),
      db: {
        connected: isHealthy,
        status: dbResult.status ?? (isHealthy ? 'connected' : 'unavailable'),
        hospitalDateIST: dbResult.hospitalDateIST ?? null,
        tlsMode: dbResult.tlsMode ?? null,
        message: isHealthy ? null : dbResult.message ?? 'Database connectivity unavailable.'
      }
    });
  });

  /**
   * GET /api/departments
   * Returns active hospital departments from PostgreSQL when connected,
   * or canonical seed metadata with source='phase0-seed-preview' during Phase 0 local offline checks.
   */
  app.get('/api/departments', async (_req, res) => {
    try {
      const result = await query(
        `SELECT id, slug, token_prefix, name_en, name_hi, doctor_name_en, doctor_name_hi,
                room_label, floor_number, destination_node_id, landmark_en, landmark_hi,
                average_consult_minutes, is_active
         FROM departments
         WHERE is_active = true
         ORDER BY floor_number ASC, slug ASC;`
      );
      return res.status(200).json({
        source: 'database',
        departments: result.rows
      });
    } catch {
      return res.status(200).json({
        source: 'phase0-seed-preview',
        departments: SEED_DEPARTMENTS.map((dept) => ({
          id: dept.slug,
          ...dept,
          is_active: true
        }))
      });
    }
  });

  // Strict JSON 404 for any unmatched /api/* route
  app.use('/api', apiNotFoundHandler);

  // Serve compiled Vite static assets in single-origin mode if dist/ exists
  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

export const app = createApp();
