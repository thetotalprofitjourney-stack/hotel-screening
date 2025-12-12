import { pool } from './src/db.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigration(filename: string) {
  const sql = readFileSync(join(__dirname, '../migrations', filename), 'utf8');
  const statements = sql.split(';').filter(s => s.trim());

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await pool.query(statement);
        console.log(`✓ Ejecutado: ${statement.substring(0, 60)}...`);
      } catch (err: any) {
        console.error(`✗ Error: ${err.message}`);
        throw err;
      }
    }
  }
}

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Uso: npm run migrate <archivo.sql>');
    process.exit(1);
  }

  console.log(`\n🚀 Ejecutando migración: ${migrationFile}\n`);

  try {
    await runMigration(migrationFile);
    console.log('\n✅ Migración completada exitosamente\n');
  } catch (err) {
    console.error('\n❌ Error en migración\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
