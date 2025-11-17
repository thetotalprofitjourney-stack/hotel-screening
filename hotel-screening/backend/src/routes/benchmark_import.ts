import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';

const router = Router();

const rowSchema = z.object({
  categoria: z.string().min(2),
  comunidad_autonoma: z.string().min(2),
  provincia: z.string().min(2),
  zona: z.string().min(2),
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
  const placeholders = rows.map(()=> '(?,?,?,?,?,?,?,?,?)').join(',');
  const vals:any[] = [];
  for (const r of rows) {
    // Normalizar para generar ID: Andalucía-Málaga-CostadelSol-3
    const caClean = r.comunidad_autonoma.trim();
    const provClean = r.provincia.trim();
    const zonaClean = r.zona.trim().replace(/\s+/g, '');
    const benchmark_id = `${caClean}-${provClean}-${zonaClean}-${r.mes}`;
    vals.push(benchmark_id, r.categoria, r.comunidad_autonoma, r.provincia, r.zona, r.mes, r.occ, r.adr, r.fuente ?? null);
  }
  await pool.query(
    `INSERT INTO occ_adr_benchmark_catalog
     (benchmark_id, categoria, comunidad_autonoma, provincia, zona, mes, occ, adr, fuente)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE occ=VALUES(occ), adr=VALUES(adr), fuente=VALUES(fuente), last_updated_at=NOW(3)`,
    vals
  );
  res.json({ ok:true, inserted: rows.length });
});

export default router;
