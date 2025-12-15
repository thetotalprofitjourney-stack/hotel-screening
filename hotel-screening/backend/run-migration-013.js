// Script temporal para ejecutar la migración 013
import { pool } from './dist/db.js';
import { readFileSync } from 'fs';

async function runMigration() {
  try {
    const sql = readFileSync('./migrations/013_add_horizonte_anio_base_to_projection_assumptions.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());

    console.log('🚀 Ejecutando migración 013...\n');

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
        console.log(`✓ Ejecutado: ${statement.substring(0, 80).replace(/\n/g, ' ')}...`);
      }
    }

    console.log('\n✅ Migración 013 completada exitosamente\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

runMigration();
