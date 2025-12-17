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

  // Generar siempre 12 meses (1-12), rellenando con 0 si no hay datos
  const currentYear = new Date().getFullYear();
  const mesesConDias = [];

  for (let mes = 1; mes <= 12; mes++) {
    // Buscar si existe data para este mes
    const data = r.find(row => row.mes === mes);

    mesesConDias.push({
      mes,
      occ: data ? data.occ : 0,
      adr: data ? data.adr : 0,
      dias: new Date(currentYear, mes, 0).getDate() // Días del mes
    });
  }

  return mesesConDias;
}
