import { pool } from '../db.js';

/**
 * Obtiene los datos de benchmark (occ/adr) para los 12 meses basándose en la ubicación geográfica
 * @param categoria - Categoría del hotel (economy, midscale, upscale, etc.)
 * @param comunidad_autonoma - Comunidad Autónoma
 * @param provincia - Provincia
 * @param zona - Zona específica
 * @returns Array de 12 meses con dias (calculados por defecto), occ y adr
 */
export async function getBenchmarkRows(
  categoria: string,
  comunidad_autonoma: string,
  provincia: string,
  zona: string
) {
  const [rows] = await pool.query(
    `SELECT mes, occ, adr
     FROM occ_adr_benchmark_catalog
     WHERE categoria=? AND comunidad_autonoma=? AND provincia=? AND zona=?
     ORDER BY mes`,
    [categoria, comunidad_autonoma, provincia, zona]
  );
  const r = rows as Array<{ mes:number; occ:number; adr:number }>;
  if (r.length !== 12) throw new Error('BENCHMARK_NOT_FOUND_OR_INCOMPLETE');

  // Añadir días por defecto basados en el año actual
  const currentYear = new Date().getFullYear();
  const mesesConDias = r.map(m => ({
    ...m,
    dias: new Date(currentYear, m.mes, 0).getDate() // Días del mes
  }));

  return mesesConDias;
}
