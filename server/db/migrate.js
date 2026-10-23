import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withTransaction, closePool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadMigrationFiles() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.map((filename) => ({
    filename,
    sql: fs.readFileSync(path.join(migrationsDir, filename), 'utf8')
  }));
}

export function loadMigrationSql() {
  return loadMigrationFiles()
    .map((m) => m.sql)
    .join('\n\n');
}

export async function runMigrations() {
  const migrations = loadMigrationFiles();
  await withTransaction(async (client) => {
    for (const migration of migrations) {
      await client.query(migration.sql);
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runMigrations()
    .then(async () => {
      const files = loadMigrationFiles().map((m) => m.filename).join(', ');
      console.log(`[db:migrate] Successfully applied migrations: ${files}`);
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[db:migrate] Failed to apply migration:', err.message);
      await closePool();
      process.exit(1);
    });
}
