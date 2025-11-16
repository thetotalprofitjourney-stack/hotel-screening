import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

/**
 * GET /v1/selector?sort=irr_levered|y1_yield_on_cost|y1_dscr|y1_noi_cap_rate|price_per_key&order=desc|asc
 * Devuelve los KPIs del dashboard para los proyectos del usuario (x-user-email).
 */
router.get('/v1/selector', async (req, res) => {
  const email = (req as any).userEmail as string;
  const sort = String(req.query.sort ?? 'irr_levered');
  const order = (String(req.query.order ?? 'desc').toLowerCase() === 'asc') ? 'ASC' : 'DESC';

  const allowed = new Set([
    'irr_levered','y1_yield_on_cost','y1_dscr','y1_noi_cap_rate','price_per_key',
    'y1_ebitda_margin','y1_operating_revenue'
  ]);
  const sortCol = allowed.has(sort) ? sort : 'irr_levered';

  const [rows] = await pool.query(
    `SELECT *
       FROM vw_selector_projects v
      WHERE v.owner_email = ?
      ORDER BY ${sortCol} ${order}, v.nombre ASC`,
    [email]
  );

  res.json({ sort: sortCol, order, rows });
});

export default router;
