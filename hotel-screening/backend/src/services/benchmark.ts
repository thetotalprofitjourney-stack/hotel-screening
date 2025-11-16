import { pool } from '../db.js';

export async function getBenchmarkRows(categoria: string, mercado: string, anio_base: number) {
  const [rows] = await pool.query(
    `SELECT mes, occ, adr
     FROM occ_adr_benchmark_catalog
     WHERE categoria=? AND mercado=? AND anio_base=?
     ORDER BY mes`,
    [categoria, mercado, anio_base]
  );
  const r = rows as Array<{ mes:number; occ:number; adr:number }>;
  if (r.length !== 12) throw new Error('BENCHMARK_NOT_FOUND_OR_INCOMPLETE');
  return r;
}
