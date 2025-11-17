import { Router } from 'express';
import { pool } from '../db.js';
import { z } from 'zod';
import { getBenchmarkRows } from '../services/benchmark.js';
import { getRatios } from '../services/ratios.js';
import { buildCommercialY1, calcUsaliY1Monthly } from '../services/calc.js';
import { resolveTamanoBucket } from '../services/utils.js';

const router = Router();

// GET benchmark (12 meses) según la categoría/mercado del proyecto
router.get('/v1/projects/:id/y1/benchmark', async (req, res) => {
  const projectId = req.params.id;
  const anio_base = Number(req.query.anio_base ?? new Date().getFullYear());

  const [prjRows] = await pool.query(
    `SELECT categoria, ubicacion AS mercado, segmento, habitaciones FROM projects WHERE project_id=?`,
    [projectId]
  );
  const prj = (prjRows as any[])[0];
  if (!prj) return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });

  const meses = await getBenchmarkRows(prj.categoria, prj.mercado, anio_base);
  res.json({ benchmark_id: `${prj.categoria}_${prj.mercado}_${anio_base}`, meses });
});

// Aceptar/guardar Y1 comercial (permite editar occ/adr)
router.post('/v1/projects/:id/y1/benchmark/accept', async (req, res) => {
  const projectId = req.params.id;
  const schema = z.object({
    anio_base: z.number().int().min(1900).max(2100),
    meses: z.array(z.object({
      mes: z.number().int().min(1).max(12),
      occ: z.number().min(0).max(1),
      adr: z.number().min(0)
    })).length(12)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const [prjRows] = await pool.query(
    `SELECT habitaciones FROM projects WHERE project_id=?`,
    [projectId]
  );
  const prj = (prjRows as any[])[0];
  if (!prj) return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });

  const days = Array.from({ length: 12 }, (_, i) => new Date(parsed.data.anio_base, i + 1, 0).getDate());

  await pool.query(`DELETE FROM y1_commercial WHERE project_id=?`, [projectId]);

  const values: any[] = [];
  for (const m of parsed.data.meses) {
    const rn = Math.round(m.occ * prj.habitaciones * days[m.mes-1]);
    const rooms_rev = rn * m.adr;
    values.push(projectId, m.mes, m.occ, m.adr, rn, rooms_rev, 1);
  }

  const placeholders = parsed.data.meses.map(()=>'(?,?,?,?,?,?,?)').join(',');
  await pool.query(
    `INSERT INTO y1_commercial
     (project_id,mes,y1_mes_occ,y1_mes_adr,y1_mes_rn,y1_mes_rooms_rev,locked)
     VALUES ${placeholders}`,
    values
  );

  await pool.query(`UPDATE projects SET estado='y1_validated', updated_at=NOW(3) WHERE project_id=?`, [projectId]);
  res.json({ ok: true });
});

// Calcular USALI Y1 (lee y1_commercial y aplica ratios por tamaño)
router.post('/v1/projects/:id/y1/calc', async (req, res) => {
  const projectId = req.params.id;

  // Defaults de ffe/nonop/fees leídos desde tablas del proyecto
  const [[prj]]: any = await pool.query(
    `SELECT p.segmento, p.categoria, p.habitaciones, ps.ffe,
            oc.operacion_tipo, oc.fee_base_anual, oc.fee_pct_gop, oc.fee_incentive_pct, oc.fee_hurdle_gop_margin,
            no.nonop_taxes_anual, no.nonop_insurance_anual, no.nonop_rent_anual, no.nonop_other_anual
       FROM projects p
       JOIN project_settings ps ON ps.project_id=p.project_id
       JOIN operator_contracts oc ON oc.project_id=p.project_id
       JOIN nonoperating_assumptions no ON no.project_id=p.project_id
      WHERE p.project_id=?`,
    [projectId]
  );
  if (!prj) return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });

  const [y1Rows] = await pool.query(
    `SELECT mes, y1_mes_occ AS occ, y1_mes_adr AS adr, y1_mes_rn AS rn, y1_mes_rooms_rev AS rooms_rev
       FROM y1_commercial
      WHERE project_id=?
      ORDER BY mes`,
    [projectId]
  );
  const comm = y1Rows as any[];
  if (comm.length !== 12) return res.status(400).json({ error: 'Y1_COMMERCIAL_NOT_READY' });

  const tamano_bucket_id = resolveTamanoBucket(prj.habitaciones);
  const ratios = await getRatios(prj.segmento, prj.categoria, tamano_bucket_id);

  const fees = prj.operacion_tipo === 'operador'
    ? {
        base_anual: prj.fee_base_anual ?? 0,
        pct_gop: prj.fee_pct_gop ?? 0,
        incentive_pct: prj.fee_incentive_pct ?? 0,
        hurdle_gop_margin: prj.fee_hurdle_gop_margin ?? 0
      }
    : null;

  const nonop = {
    taxes: prj.nonop_taxes_anual ?? 0,
    insurance: prj.nonop_insurance_anual ?? 0,
    rent: prj.nonop_rent_anual ?? 0,
    other: prj.nonop_other_anual ?? 0
  };

  const { monthly, y1_anual } = calcUsaliY1Monthly(comm, ratios, fees, nonop, Number(prj.ffe));

  // Persistimos resultados Y1 (opcional; aquí sí lo guardamos)
  await pool.query(`DELETE FROM usali_y1_monthly WHERE project_id=?`, [projectId]);
  const placeholders = monthly.map(()=>'(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
  const vals: any[] = [];
  monthly.forEach(m => {
    vals.push(
      projectId, m.mes,
      m.rooms, m.fb, m.other_operated, m.misc_income, m.total_rev,
      m.dept_rooms, m.dept_fb, m.dept_other, m.dept_total, m.dept_profit,
      m.und_ag, m.und_it, m.und_sm, m.und_pom, m.und_eww, m.und_total,
      m.gop, m.fees_base, m.fees_variable, m.fees_incentive, m.fees_total,
      m.income_before_nonop, m.nonop_total, m.ebitda, m.ffe_amount, m.ebitda_less_ffe
    );
  });
  await pool.query(
    `INSERT INTO usali_y1_monthly
     (project_id,mes,rooms,fb,other_operated,misc_income,total_rev,
      dept_rooms,dept_fb,dept_other,dept_total,dept_profit,
      und_ag,und_it,und_sm,und_pom,und_eww,und_total,
      gop,fees_base,fees_variable,fees_incentive,fees_total,
      income_before_nonop,nonop_total,ebitda,ffe_amount,ebitda_less_ffe)
     VALUES ${placeholders}`,
    vals
  );

  // Calcular RN total de Y1 desde y1_commercial
  const y1_rn_total = comm.reduce((sum: number, m: any) => sum + Number(m.rn || 0), 0);
  const y1_dept_profit_total = monthly.reduce((sum, m) => sum + (m.dept_profit || 0), 0);

  await pool.query(
    `REPLACE INTO usali_annual
     (project_id, anio, rn, operating_revenue, dept_profit, gop, fees, nonop, ebitda, ffe, ebitda_less_ffe, gop_margin, ebitda_margin, ebitda_less_ffe_margin)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      projectId, 1, y1_rn_total,
      y1_anual.operating_revenue, y1_dept_profit_total, y1_anual.gop, y1_anual.fees, y1_anual.nonop, y1_anual.ebitda,
      y1_anual.ffe, y1_anual.ebitda_less_ffe, y1_anual.gop_margin, y1_anual.ebitda_margin, y1_anual.ebitda_less_ffe_margin
    ]
  );

  res.json({
    ratios_origen: {
      segmento: prj.segmento,
      categoria: prj.categoria,
      tamano_bucket_id
    },
    y1_mensual: monthly,
    y1_anual
  });
});

// Guardar USALI Y1 editado manualmente
router.put('/v1/projects/:id/y1/usali', async (req, res) => {
  const projectId = req.params.id;

  const schema = z.object({
    monthly: z.array(z.object({
      mes: z.number().int().min(1).max(12),
      rooms: z.number(),
      fb: z.number(),
      other_operated: z.number(),
      misc_income: z.number(),
      total_rev: z.number(),
      dept_rooms: z.number(),
      dept_fb: z.number(),
      dept_other: z.number(),
      dept_total: z.number(),
      dept_profit: z.number(),
      und_ag: z.number(),
      und_it: z.number(),
      und_sm: z.number(),
      und_pom: z.number(),
      und_eww: z.number(),
      und_total: z.number(),
      gop: z.number(),
      fees_base: z.number(),
      fees_variable: z.number(),
      fees_incentive: z.number(),
      fees_total: z.number(),
      income_before_nonop: z.number(),
      nonop_total: z.number(),
      ebitda: z.number(),
      ffe_amount: z.number(),
      ebitda_less_ffe: z.number()
    })).length(12)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const monthly = parsed.data.monthly;

  // Eliminar datos anteriores
  await pool.query(`DELETE FROM usali_y1_monthly WHERE project_id=?`, [projectId]);

  // Insertar datos editados
  const placeholders = monthly.map(()=>'(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
  const vals: any[] = [];
  monthly.forEach(m => {
    vals.push(
      projectId, m.mes,
      m.rooms, m.fb, m.other_operated, m.misc_income, m.total_rev,
      m.dept_rooms, m.dept_fb, m.dept_other, m.dept_total, m.dept_profit,
      m.und_ag, m.und_it, m.und_sm, m.und_pom, m.und_eww, m.und_total,
      m.gop, m.fees_base, m.fees_variable, m.fees_incentive, m.fees_total,
      m.income_before_nonop, m.nonop_total, m.ebitda, m.ffe_amount, m.ebitda_less_ffe
    );
  });

  await pool.query(
    `INSERT INTO usali_y1_monthly
     (project_id,mes,rooms,fb,other_operated,misc_income,total_rev,
      dept_rooms,dept_fb,dept_other,dept_total,dept_profit,
      und_ag,und_it,und_sm,und_pom,und_eww,und_total,
      gop,fees_base,fees_variable,fees_incentive,fees_total,
      income_before_nonop,nonop_total,ebitda,ffe_amount,ebitda_less_ffe)
     VALUES ${placeholders}`,
    vals
  );

  // Calcular y guardar totales anuales
  const sum = (field: string) => monthly.reduce((acc: number, m: any) => acc + Number(m[field] || 0), 0);

  // Obtener RN total desde y1_commercial
  const [rnRows] = await pool.query(
    `SELECT SUM(y1_mes_rn) as total_rn FROM y1_commercial WHERE project_id=?`,
    [projectId]
  );
  const y1_rn_total = Number((rnRows as any[])[0]?.total_rn || 0);

  const y1_anual = {
    operating_revenue: sum('total_rev'),
    dept_profit: sum('dept_profit'),
    gop: sum('gop'),
    fees: sum('fees_total'),
    nonop: sum('nonop_total'),
    ebitda: sum('ebitda'),
    ffe: sum('ffe_amount'),
    ebitda_less_ffe: sum('ebitda_less_ffe'),
    gop_margin: sum('gop') / Math.max(1, sum('total_rev')),
    ebitda_margin: sum('ebitda') / Math.max(1, sum('total_rev')),
    ebitda_less_ffe_margin: sum('ebitda_less_ffe') / Math.max(1, sum('total_rev'))
  };

  await pool.query(
    `REPLACE INTO usali_annual
     (project_id, anio, rn, operating_revenue, dept_profit, gop, fees, nonop, ebitda, ffe, ebitda_less_ffe, gop_margin, ebitda_margin, ebitda_less_ffe_margin)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      projectId, 1, y1_rn_total,
      y1_anual.operating_revenue, y1_anual.dept_profit, y1_anual.gop, y1_anual.fees, y1_anual.nonop, y1_anual.ebitda,
      y1_anual.ffe, y1_anual.ebitda_less_ffe, y1_anual.gop_margin, y1_anual.ebitda_margin, y1_anual.ebitda_less_ffe_margin
    ]
  );

  res.json({ ok: true, y1_anual });
});

export default router;
