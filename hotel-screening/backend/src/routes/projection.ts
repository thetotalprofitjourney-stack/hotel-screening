import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { projectYears } from '../services/projection.js';
import { computeDebt, valuationAndReturns } from '../services/valuation.js';

const router = Router();

// GET /v1/projects/:id/projection - Cargar proyección guardada
router.get('/v1/projects/:id/projection', async (req, res) => {
  try {
    const [annRows]: any = await pool.query(
      `SELECT anio, rn, operating_revenue, dept_total, dept_profit, und_total, gop, fees, nonop, ebitda, ffe, ebitda_less_ffe,
              gop_margin, ebitda_margin, ebitda_less_ffe_margin
       FROM usali_annual
       WHERE project_id=?
       ORDER BY anio`,
      [req.params.id]
    );

    if (!annRows || annRows.length === 0) {
      return res.status(404).json({ error: 'PROJECTION_NOT_FOUND' });
    }

    res.json({ annuals: annRows });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /v1/projects/:id/debt - Cargar deuda guardada
router.get('/v1/projects/:id/debt', async (req, res) => {
  try {
    const [schedule]: any = await pool.query(
      `SELECT anio, intereses, amortizacion, cuota, saldo_final
       FROM debt_schedule_annual
       WHERE project_id=?
       ORDER BY anio`,
      [req.params.id]
    );

    if (!schedule || schedule.length === 0) {
      return res.status(404).json({ error: 'DEBT_NOT_FOUND' });
    }

    // Obtener loan_amount de financing_terms
    const [[ft]]: any = await pool.query(
      `SELECT precio_compra, capex_inicial, ltv FROM financing_terms WHERE project_id=?`,
      [req.params.id]
    );
    const base = Number(ft?.precio_compra ?? 0) + Number(ft?.capex_inicial ?? 0);
    const loan_amount = Math.max(0, Number(ft?.ltv ?? 0) * base);

    res.json({ loan_amount, schedule });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /v1/projects/:id/valuation-and-returns - Cargar valoración guardada
router.get('/v1/projects/:id/valuation-and-returns', async (req, res) => {
  try {
    const [[valuation]]: any = await pool.query(
      `SELECT valor_salida_bruto, valor_salida_neto FROM valuations WHERE project_id=?`,
      [req.params.id]
    );

    const [[returns]]: any = await pool.query(
      `SELECT irr_unlevered, moic_unlevered, irr_levered, moic_levered FROM returns WHERE project_id=?`,
      [req.params.id]
    );

    if (!valuation || !returns) {
      return res.status(404).json({ error: 'VALUATION_NOT_FOUND' });
    }

    // Obtener equity0 de financing_terms y project_settings
    const [[ft]]: any = await pool.query(
      `SELECT precio_compra, capex_inicial, ltv FROM financing_terms WHERE project_id=?`,
      [req.params.id]
    );
    const [[ps]]: any = await pool.query(
      `SELECT coste_tx_compra_pct FROM project_settings WHERE project_id=?`,
      [req.params.id]
    );

    const base = Number(ft?.precio_compra ?? 0) + Number(ft?.capex_inicial ?? 0);
    const costs_buy = Number(ps?.coste_tx_compra_pct ?? 0) * base;
    const loan0 = Number(ft?.ltv ?? 0) * base;
    const equity0 = base + costs_buy - loan0;

    res.json({
      valuation: {
        valor_salida_bruto: Number(valuation.valor_salida_bruto),
        valor_salida_neto: Number(valuation.valor_salida_neto)
      },
      returns: {
        unlevered: {
          irr: Number(returns.irr_unlevered),
          moic: Number(returns.moic_unlevered)
        },
        levered: {
          irr: Number(returns.irr_levered),
          moic: Number(returns.moic_levered),
          equity0
        }
      }
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

const assumptionsSchema = z.object({
  years: z.number().int().min(1).max(40).optional(),
  anio_base: z.number().int().optional(),
  adr_growth_pct: z.number().min(-0.9).max(2),
  occ_delta_pp: z.number().min(-50).max(50),
  occ_cap: z.number().min(0).max(1),
  cost_inflation_pct: z.number().min(-0.5).max(2).default(0),
  undistributed_inflation_pct: z.number().min(-0.5).max(2).default(0),
  nonop_inflation_pct: z.number().min(-0.5).max(2).default(0),
  fees_indexation_pct: z.number().min(-0.5).max(2).nullable().optional()
});

// 1) Proyección Y2..N (persiste en usali_annual)
router.post('/v1/projects/:id/projection', async (req,res) => {
  const parsed = assumptionsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  try {
    const data = await projectYears(req.params.id, parsed.data);
    res.json({ annuals: data });
  } catch (e:any) {
    res.status(400).json({ error: e.message });
  }
});

// 2) Deuda (persiste en debt_schedule_annual)
router.post('/v1/projects/:id/debt', async (req,res) => {
  try {
    const d = await computeDebt(req.params.id);
    res.json(d);
  } catch (e:any) {
    res.status(400).json({ error: e.message });
  }
});

// 3) Valoración + retornos (persiste en valuations / returns)
router.post('/v1/projects/:id/valuation-and-returns', async (req,res) => {
  try {
    const vr = await valuationAndReturns(req.params.id);
    res.json(vr);
  } catch (e:any) {
    res.status(400).json({ error: e.message });
  }
});

// 4) Guardar ediciones de proyección (años 2..N)
router.put('/v1/projects/:id/projection', async (req, res) => {
  const projectId = req.params.id;

  const yearSchema = z.object({
    anio: z.number().int().min(2),
    rn: z.number(),
    operating_revenue: z.number(),
    dept_total: z.number(),
    und_total: z.number(),
    fees: z.number(),
    nonop: z.number(),
    ffe: z.number()
  });

  const schema = z.object({
    years: z.array(yearSchema).min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  try {
    // Invalidar deuda y valoración si existen
    const [prjRows] = await pool.query(
      `SELECT estado FROM projects WHERE project_id=?`,
      [projectId]
    );
    const prj = (prjRows as any[])[0];
    if (!prj) return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });

    const currentState = prj.estado;
    const statesWithDebt = ['finalized'];

    if (statesWithDebt.includes(currentState)) {
      // Borrar deuda y valoración
      await pool.query(`DELETE FROM debt_schedule_annual WHERE project_id=?`, [projectId]);
      await pool.query(`DELETE FROM valuations WHERE project_id=?`, [projectId]);
      await pool.query(`DELETE FROM returns WHERE project_id=?`, [projectId]);
      console.log(`[INVALIDATE] Project ${projectId}: Projection edited, cleared debt and valuation data`);
    }

    // Actualizar cada año con cálculos
    for (const year of parsed.data.years) {
      // Recalcular campos derivados
      const dept_profit = year.operating_revenue - year.dept_total;
      const gop = dept_profit - year.und_total;
      const ebitda = gop - year.fees - year.nonop;
      const ebitda_less_ffe = ebitda - year.ffe;

      // Calcular márgenes
      const gop_margin = year.operating_revenue > 0 ? gop / year.operating_revenue : 0;
      const ebitda_margin = year.operating_revenue > 0 ? ebitda / year.operating_revenue : 0;
      const ebitda_less_ffe_margin = year.operating_revenue > 0 ? ebitda_less_ffe / year.operating_revenue : 0;

      await pool.query(
        `UPDATE usali_annual
         SET rn=?, operating_revenue=?, dept_total=?, dept_profit=?, und_total=?, gop=?,
             fees=?, nonop=?, ebitda=?, ffe=?, ebitda_less_ffe=?,
             gop_margin=?, ebitda_margin=?, ebitda_less_ffe_margin=?
         WHERE project_id=? AND anio=?`,
        [
          year.rn, year.operating_revenue, year.dept_total, dept_profit, year.und_total, gop,
          year.fees, year.nonop, ebitda, year.ffe, ebitda_less_ffe,
          gop_margin, ebitda_margin, ebitda_less_ffe_margin,
          projectId, year.anio
        ]
      );
    }

    // Mantener estado en projection_2n
    await pool.query(`UPDATE projects SET estado='projection_2n', updated_at=NOW(3) WHERE project_id=?`, [projectId]);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
