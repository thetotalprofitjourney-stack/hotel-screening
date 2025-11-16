import { Router } from 'express';
import { z } from 'zod';
import { projectYears } from '../services/projection.js';
import { computeDebt, valuationAndReturns } from '../services/valuation.js';

const router = Router();

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

export default router;
