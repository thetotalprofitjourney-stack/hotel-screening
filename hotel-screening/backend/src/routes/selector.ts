import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

/**
 * GET /v1/selector?sort=irr_levered|moic_levered|price_per_key&order=desc|asc&project_type=operador|inversión
 * Devuelve los KPIs del dashboard para los proyectos del usuario (x-user-email).
 * Solo devuelve proyectos finalizados (estado='finalized').
 */
router.get('/v1/selector', async (req, res) => {
  const email = (req as any).userEmail as string;
  const sort = String(req.query.sort ?? 'irr_levered');
  const order = (String(req.query.order ?? 'desc').toLowerCase() === 'asc') ? 'ASC' : 'DESC';
  const projectTypeFilter = req.query.project_type ? String(req.query.project_type) : null;

  const allowed = new Set([
    'irr_levered','moic_levered','price_per_key',
    'y1_ebitda_margin','y1_operating_revenue','total_fees','fees_per_rn','created_at'
  ]);
  const sortCol = allowed.has(sort) ? sort : 'irr_levered';

  // Construir WHERE clause
  let whereClause = 'v.owner_email = ? AND v.estado = ?';
  const params: any[] = [email, 'finalized'];

  if (projectTypeFilter && (projectTypeFilter === 'operador' || projectTypeFilter === 'inversión')) {
    whereClause += ' AND v.project_type = ?';
    params.push(projectTypeFilter);
  }

  const [rows] = await pool.query(
    `SELECT *
       FROM vw_selector_projects v
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${order}, v.nombre ASC`,
    params
  );

  res.json({ sort: sortCol, order, project_type: projectTypeFilter, rows });
});

export default router;
