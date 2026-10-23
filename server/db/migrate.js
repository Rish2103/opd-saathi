import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withTransaction, closePool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadMigrationSql() {
  const migrationFile = path.join(__dirname, 'migrations', '001_init.sql');
  return fs.readFileSync(migrationFile, 'utf8');
}

export async function runMigrations() {
  const sql = loadMigrationSql();
  await withTransaction(async (client) => {
    await client.query(sql);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runMigrations()
    .then(async () => {
      console.log('[db:migrate] Successfully applied 001_init.sql');
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[db:migrate] Failed to apply migration:', err.message);
      await closePool();
      process.exit(1);
    });
}
