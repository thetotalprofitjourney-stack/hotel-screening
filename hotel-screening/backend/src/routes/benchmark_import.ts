import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';

const router = Router();

const rowSchema = z.object({
  categoria: z.string().min(2),
  mercado: z.string().min(2),
  anio_base: z.number().int(),
  mes: z.number().int().min(1).max(12),
  occ: z.number().min(0).max(1),
  adr: z.number().min(0),
  fuente: z.string().optional().nullable()
});

router.post('/v1/benchmark/import', async (req,res)=>{
  const schema = z.object({ rows: z.array(rowSchema).min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const rows = parsed.data.rows;
  const placeholders = rows.map(()=> '(?,?,?,?,?,?,?,?)').join(',');
  const vals:any[] = [];
  for (const r of rows) {
    const benchmark_id = `${r.categoria.toUpperCase().replaceAll('_','')}_${r.mercado}_${r.anio_base}`;
    vals.push(benchmark_id, r.categoria, r.mercado, r.anio_base, r.mes, r.occ, r.adr, r.fuente ?? null);
  }
  await pool.query(
    `INSERT INTO occ_adr_benchmark_catalog
     (benchmark_id, categoria, mercado, anio_base, mes, occ, adr, fuente)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE occ=VALUES(occ), adr=VALUES(adr), fuente=VALUES(fuente), last_updated_at=NOW(3)`,
    vals
  );
  res.json({ ok:true, inserted: rows.length });
});

export default router;
