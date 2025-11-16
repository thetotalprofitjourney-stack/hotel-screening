import { pool } from '../db.js';

export async function getRatios(segmento: string, categoria: string, tamano_bucket_id: string) {
  const [rows] = await pool.query(
    `SELECT *
       FROM usali_ratios_matrix
      WHERE segmento=? AND categoria=? AND tamano_bucket_id=?
      ORDER BY last_updated_at DESC
      LIMIT 1`,
    [segmento, categoria, tamano_bucket_id]
  );
  const r = (rows as any[])[0];
  if (!r) throw new Error('RATIOS_NOT_FOUND');
  return r;
}
